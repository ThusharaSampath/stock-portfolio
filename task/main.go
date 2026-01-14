package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
    "os"
    "github.com/joho/godotenv"
)

type CSETradeSummary struct {
	ReqTradeSummery []struct {
		Symbol           string  `json:"symbol"`
		Price            float64 `json:"price"`
		ClosingPrice     float64 `json:"closingPrice"`
		Name             string  `json:"name"`
		PercentageChange float64 `json:"percentageChange"`
	} `json:"reqTradeSummery"`
}

func main() {
    _ = godotenv.Load()
	log.Println("Starting CSE Scraper Task...")
    
    // 1. Scrape Data
	url := "https://www.cse.lk/api/tradeSummary"
	payload := map[string]interface{}{
		"headers": map[string]interface{}{
			"normalizedNames": map[string]interface{}{},
			"lazyUpdate":      nil,
		},
	}
	jsonPayload, _ := json.Marshal(payload)

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonPayload))
	if err != nil {
		log.Fatalf("Error creating request: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Go/Task)")
	req.Header.Set("Origin", "https://www.cse.lk")
	req.Header.Set("Referer", "https://www.cse.lk/")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Fatalf("Error fetching CSE data: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Fatalf("CSE API Error: %d", resp.StatusCode)
	}

	body, _ := io.ReadAll(resp.Body)
	var data CSETradeSummary
	if err := json.Unmarshal(body, &data); err != nil {
		log.Fatalf("Error decoding JSON: %v", err)
	}

	if len(data.ReqTradeSummery) == 0 {
		log.Println("No data found in CSE response.")
		return
	}

	log.Printf("Received %d items. Preparing to send to backend...", len(data.ReqTradeSummery))

    // 2. Prepare Market Data for Backend
	marketData := make(map[string]interface{})
	for _, stock := range data.ReqTradeSummery {
		finalPrice := stock.Price
		if finalPrice <= 0 && stock.ClosingPrice > 0 {
			finalPrice = stock.ClosingPrice
		}
		if stock.Symbol != "" {
			marketData[stock.Symbol] = finalPrice
		}
	}
    
    backendURL := os.Getenv("NEXT_PUBLIC_BACKEND_URL")
    if backendURL == "" {
        backendURL = "http://localhost:8080"
    }

    // 3. Call Backend: Update Market Data
    log.Println("Calling POST /market/update...")
    jsonMarket, _ := json.Marshal(marketData)
    postResp, err := http.Post(fmt.Sprintf("%s/market/update", backendURL), "application/json", bytes.NewBuffer(jsonMarket))
    if err != nil {
        log.Fatalf("Error updating backend market data: %v", err)
    }
    defer postResp.Body.Close()
    if postResp.StatusCode != http.StatusOK {
         body, _ := io.ReadAll(postResp.Body)
         log.Fatalf("Backend Market Update Failed: %s", string(body))
    }
    log.Println("Market data updated successfully.")

    // 4. Call Backend: Trigger Snapshot
    // Ideally loop through users, but hardcoded for demo
    uid := "demo-user"
    log.Printf("Calling POST /portfolio/snapshot for %s...", uid)
    
    snapResp, err := http.Post(fmt.Sprintf("%s/portfolio/snapshot?uid=%s", backendURL, uid), "application/json", nil)
    if err != nil {
        log.Fatalf("Error triggering snapshot: %v", err)
    }
    defer snapResp.Body.Close()
    
    if snapResp.StatusCode != http.StatusOK {
         body, _ := io.ReadAll(snapResp.Body)
         log.Fatalf("Snapshot Trigger Failed: %s", string(body))
    }
    
    log.Println("Portfolio snapshot saved successfully.")
    log.Println("Task completed.")
}
