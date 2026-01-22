package main

import (
	"context"

	"log"
	"net/http"
	"os"

	"cloud.google.com/go/firestore"
	firebase "firebase.google.com/go"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"google.golang.org/api/iterator"
	"google.golang.org/api/option"
	"path/filepath"
	"sort"
	"time"
)

var client *firestore.Client

func initFirebase() {
	ctx := context.Background()

	// Load .env if present (for local)
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: No .env file found or error loading it.")
	}

    projectID := os.Getenv("NEXT_PUBLIC_FIREBASE_PROJECT_ID")
    if projectID == "" {
        // Fallback to standard env var
        projectID = os.Getenv("FIREBASE_PROJECT_ID")
    }

	if projectID == "" {
		log.Fatal("Error: Environment variable NEXT_PUBLIC_FIREBASE_PROJECT_ID or FIREBASE_PROJECT_ID must be set.")
	}
    
    log.Printf("Initializing Firebase with Project ID: %s", projectID)

	// Construct config
	var opts []option.ClientOption
    // If we have json content in env var (e.g. FIREBASE_SERVICE_ACCOUNT_JSON)
    if jsonCreds := os.Getenv("FIREBASE_SERVICE_ACCOUNT_JSON"); jsonCreds != "" {
        opts = append(opts, option.WithCredentialsJSON([]byte(jsonCreds)))
    } else if credsFile := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS"); credsFile != "" {
        // If we have a file path in GOOGLE_APPLICATION_CREDENTIALS
        opts = append(opts, option.WithCredentialsFile(credsFile))
    }

	conf := &firebase.Config{ProjectID: projectID}
	app, err := firebase.NewApp(ctx, conf, opts...)
	if err != nil {
		log.Fatalf("error initializing app: %v\n", err)
	}

	client, err = app.Firestore(ctx)
	if err != nil {
		log.Fatalf("error initializing firestore: %v\n", err)
	}
}

func debugListFiles() {
	log.Println("DEBUG: Listing all files in current directory and subdirectories:") // turbo-log
	err := filepath.Walk(".", func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		log.Println(path)
		return nil
	})
	if err != nil {
		log.Println("Error walking the path:", err)
	}
}

func main() {
	debugListFiles()
	initFirebase()
	defer client.Close()

	r := gin.Default()

    // CORS Middleware
    r.Use(func(c *gin.Context) {
        c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
        c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
        c.Writer.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
        if c.Request.Method == "OPTIONS" {
            c.AbortWithStatus(204)
            return
        }
        c.Next()
    })

	r.GET("/portfolio/summary", func(c *gin.Context) {
		uid := c.Query("uid")
		if uid == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing uid parameter"})
			return
		}

		ctx := context.Background()

		// 1. Fetch Transactions
		// users/{uid}/transactions
		iter := client.Collection("users").Doc(uid).Collection("transactions").Documents(ctx)
		var transactions []Transaction
		for {
			doc, err := iter.Next()
			if err == iterator.Done {
				break
			}
			if err != nil {
				log.Printf("Error fetching transactions: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch transactions"})
				return
			}

			var tx Transaction
			if err := doc.DataTo(&tx); err != nil {
                // If mapping fails, try manual map or logging
                log.Printf("Error mapping tx: %v", err)
				continue
			}
            // Ensure ID is set if not in data
            if tx.ID == "" {
                tx.ID = doc.Ref.ID
            }
			transactions = append(transactions, tx)
		}

		// 2. Fetch Market Data
		// market_data/latest
		dsnap, err := client.Collection("market_data").Doc("latest").Get(ctx)
		marketPrices := make(map[string]float64)
		if err == nil {
			data := dsnap.Data()
            for k, v := range data {
                if k == "updatedAt" {
                    continue
                }
                // Handle numbers. Firestore might return int64 or float64
                switch val := v.(type) {
                case float64:
                    marketPrices[k] = val
                case int64:
                    marketPrices[k] = float64(val)
                case int:
                    marketPrices[k] = float64(val)
                }
            }
		}

		// 3. Fetch Settings (Optional)
        // users/{uid}/settings/general -> baseBankTransfer
        // Or users/{uid} settings map?
        // Following original TS logic which tried settings/general
        var baseNetInvested *float64
        settingsSnap, err := client.Collection("users").Doc(uid).Collection("settings").Doc("general").Get(ctx)
        if err == nil {
            if val, err := settingsSnap.DataAt("baseBankTransfer"); err == nil {
                // Assert params
                 switch v := val.(type) {
                case float64:
                    baseNetInvested = &v
                case int64:
                     f := float64(v)
                     baseNetInvested = &f
                }
            }
        }

		summary := CalculatePortfolioState(transactions, marketPrices, baseNetInvested)

		c.JSON(http.StatusOK, summary)
	})

    r.GET("/market/symbols", func(c *gin.Context) {
        ctx := context.Background()
        dsnap, err := client.Collection("market_data").Doc("latest").Get(ctx)
        
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch market data"})
            return
        }

        var symbols []string
        data := dsnap.Data()
        for k := range data {
            if k == "updatedAt" {
                continue
            }
            symbols = append(symbols, k)
        }
        
        sort.Strings(symbols)
        
        c.JSON(http.StatusOK, symbols)
    })

    r.GET("/portfolio/transactions", func(c *gin.Context) {
        uid := c.Query("uid")
        if uid == "" {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Missing uid parameter"})
            return
        }

        ctx := context.Background()
        iter := client.Collection("users").Doc(uid).Collection("transactions").Documents(ctx)
        var transactions []Transaction
        
        for {
            doc, err := iter.Next()
            if err == iterator.Done {
                break
            }
            if err != nil {
                log.Printf("Error fetching transactions: %v", err)
                c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch transactions"})
                return
            }

            var tx Transaction
            if err := doc.DataTo(&tx); err != nil {
                log.Printf("Error mapping tx: %v", err)
                continue
            }
            if tx.ID == "" {
                tx.ID = doc.Ref.ID
            }
            transactions = append(transactions, tx)
        }

        // Sort by Date Descending
        sort.Slice(transactions, func(i, j int) bool {
            return transactions[i].Date > transactions[j].Date
        })

        c.JSON(http.StatusOK, transactions)
    })

    // Update Market Data (Called by Task)
    r.POST("/market/update", func(c *gin.Context) {
        var marketData map[string]interface{}
        if err := c.BindJSON(&marketData); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
            return
        }
        
        // Ensure updatedAt is set
        marketData["updatedAt"] = time.Now().Format(time.RFC3339)

        ctx := context.Background()
        _, err := client.Collection("market_data").Doc("latest").Set(ctx, marketData)
        if err != nil {
            log.Printf("Error updating market data: %v", err)
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update market data"})
            return
        }

        c.JSON(http.StatusOK, gin.H{"status": "Market data updated"})
    })

    // Trigger Snapshot (Called by Task)
    r.POST("/portfolio/snapshot", func(c *gin.Context) {
        uid := c.Query("uid")
        if uid == "" {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Missing uid parameter"})
            return
        }

        ctx := context.Background()

        // 1. Fetch Transactions
        iter := client.Collection("users").Doc(uid).Collection("transactions").Documents(ctx)
        var transactions []Transaction
        for {
            doc, err := iter.Next()
            if err == iterator.Done {
                break
            }
            if err != nil {
                log.Printf("Error fetching transactions: %v", err)
                c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch transactions"})
                return
            }

            var tx Transaction
            if err := doc.DataTo(&tx); err != nil {
                continue
            }
            if tx.ID == "" {
                tx.ID = doc.Ref.ID
            }
            transactions = append(transactions, tx)
        }

        // 2. Fetch Market Data
        dsnap, err := client.Collection("market_data").Doc("latest").Get(ctx)
        marketPrices := make(map[string]float64)
        if err == nil {
            data := dsnap.Data()
            for k, v := range data {
                if k == "updatedAt" {
                    continue
                }
                switch val := v.(type) {
                case float64:
                    marketPrices[k] = val
                case int64:
                    marketPrices[k] = float64(val)
                case int:
                    marketPrices[k] = float64(val)
                }
            }
        }

        // 3. Fetch Settings
        var baseNetInvested *float64
        settingsSnap, err := client.Collection("users").Doc(uid).Collection("settings").Doc("general").Get(ctx)
        if err == nil {
            if val, err := settingsSnap.DataAt("baseBankTransfer"); err == nil {
                 switch v := val.(type) {
                case float64:
                    baseNetInvested = &v
                case int64:
                     f := float64(v)
                     baseNetInvested = &f
                }
            }
        }

        // 4. Calculate State
        summary := CalculatePortfolioState(transactions, marketPrices, baseNetInvested)

        // 5. Save Snapshot
        snapshot := map[string]interface{}{
            "date":              time.Now().Format(time.RFC3339),
            "netWorth":          summary.NetWorth,
            "netInvested":       summary.NetInvested,
            "cashOnHand":        summary.CashOnHand,
            "totalGain":         summary.TotalLifecycleGain,
            "holdingsCount":     len(summary.Holdings),
        }

        _, _, err = client.Collection("users").Doc(uid).Collection("history").Add(ctx, snapshot)
        if err != nil {
            log.Printf("Error saving snapshot: %v", err)
             c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save snapshot"})
             return
        }

        c.JSON(http.StatusOK, gin.H{"status": "Snapshot saved", "data": snapshot})
    })

    // Get History for Graphs
    r.GET("/portfolio/history", func(c *gin.Context) {
        uid := c.Query("uid")
        if uid == "" {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Missing uid parameter"})
            return
        }

        ctx := context.Background()
        iter := client.Collection("users").Doc(uid).Collection("history").Documents(ctx)
        var history []map[string]interface{}
        for {
            doc, err := iter.Next()
            if err == iterator.Done {
                break
            }
            if err != nil {
                c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch history"})
                return
            }
            history = append(history, doc.Data())
        }

        // Sort by Date
        sort.Slice(history, func(i, j int) bool {
             d1, _ := time.Parse(time.RFC3339, history[i]["date"].(string))
             d2, _ := time.Parse(time.RFC3339, history[j]["date"].(string))
             return d1.Before(d2)
        })

        c.JSON(http.StatusOK, history)
    })

    // Admin: Seed History (Dummy Data)
    r.POST("/admin/seed-history", func(c *gin.Context) {
        uid := c.Query("uid")
        if uid == "" {
           uid = "demo-user"
        }
        
        ctx := context.Background()
        // clear existing (optional, but good for reset)
        // skipping delete for simplicity, just appending

        now := time.Now()
        baseValue := 100000.0
        baseInvested := 100000.0

        for i := 30; i >= 0; i-- {
             date := now.AddDate(0, 0, -i)
             
             // Simulate small daily random fluctuation
             // In real app, use math/rand
             fluctuation := float64(i%5) * 500
             if i%2 == 0 {
                 fluctuation = -fluctuation 
             }
             
             snapshot := map[string]interface{}{
                "date":              date.Format(time.RFC3339),
                "netWorth":          baseValue + (float64(30-i)*1000) + fluctuation, // Generally going up
                "netInvested":       baseInvested + (float64(30-i)*500), // Slowly investing more
                "cashOnHand":        5000.0,
                "totalGain":         (baseValue + (float64(30-i)*1000) + fluctuation) - (baseInvested + (float64(30-i)*500)), 
                "holdingsCount":     5,
            }
            
            _, _, err := client.Collection("users").Doc(uid).Collection("history").Add(ctx, snapshot)
            if err != nil {
                log.Println("Error seeding:", err)
            }
        }
        
        c.JSON(http.StatusOK, gin.H{"status": "Seeded 30 days of history"})
    })

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	r.Run(":" + port)
}
