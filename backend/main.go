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
    "sort"
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

func main() {
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

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	r.Run(":" + port)
}
