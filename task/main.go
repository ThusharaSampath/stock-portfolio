package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"cloud.google.com/go/firestore"
	firebase "firebase.google.com/go"
	"github.com/joho/godotenv"
	"google.golang.org/api/option"
)

var client *firestore.Client

func initFirebase() {
	ctx := context.Background()
	_ = godotenv.Load()

	var opts []option.ClientOption
	if jsonCreds := os.Getenv("FIREBASE_SERVICE_ACCOUNT_JSON"); jsonCreds != "" {
		opts = append(opts, option.WithCredentialsJSON([]byte(jsonCreds)))
	}

	conf := &firebase.Config{ProjectID: os.Getenv("NEXT_PUBLIC_FIREBASE_PROJECT_ID")}
	app, err := firebase.NewApp(ctx, conf, opts...)
	if err != nil {
		log.Fatalf("error initializing app: %v\n", err)
	}

	client, err = app.Firestore(ctx)
	if err != nil {
		log.Fatalf("error initializing firestore: %v\n", err)
	}
}

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
	initFirebase()
	defer client.Close()

	log.Println("Starting CSE Scraper Task...")

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

	log.Printf("Received %d items. Updating Firestore...", len(data.ReqTradeSummery))

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

	marketData["updatedAt"] = time.Now().Format(time.RFC3339)

	ctx := context.Background()
	_, err = client.Collection("market_data").Doc("latest").Set(ctx, marketData)
	if err != nil {
		log.Fatalf("Error writing to Firestore: %v", err)
	}

	log.Println("Successfully updated market_data/latest.")
}
