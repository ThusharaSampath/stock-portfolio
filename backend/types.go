package main

// TransactionType enum
type TransactionType string

const (
	BUY      TransactionType = "BUY"
	SELL     TransactionType = "SELL"
	DEPOSIT  TransactionType = "DEPOSIT"
	WITHDRAW TransactionType = "WITHDRAW"
	DIVIDEND TransactionType = "DIVIDEND"
)

// Transaction represents a single user transaction
type Transaction struct {
	ID        string          `json:"id" firestore:"id"`
	Date      string          `json:"date" firestore:"date"`
	Type      TransactionType `json:"type" firestore:"type"`
	Symbol    string          `json:"symbol,omitempty" firestore:"symbol,omitempty"`
	Qty       float64         `json:"qty" firestore:"qty"`
	Price     float64         `json:"price" firestore:"price"`
	Fee       float64         `json:"fee" firestore:"fee"`
	NetAmount float64         `json:"netAmount" firestore:"netAmount"`
	Notes     string          `json:"notes,omitempty" firestore:"notes,omitempty"`
}

// MarketData represents the latest price map
type MarketData map[string]interface{} // Using interface{} to handle string/float mix if needed, or strictly defined

// Holding represents a calculated stock holding
type Holding struct {
	Symbol         string  `json:"symbol"`
	Qty            float64 `json:"qty"`
	CurrentPrice   float64 `json:"currentPrice"`
	MarketValue    float64 `json:"marketValue"`
	LifecycleGain  float64 `json:"lifecycleGain"`
	Allocation     float64 `json:"allocation"`
}

// PortfolioSummary represents the final dashboard state
type PortfolioSummary struct {
	NetWorth           float64   `json:"netWorth"`
	NetInvested        float64   `json:"netInvested"`
	CashOnHand         float64   `json:"cashOnHand"`
	TotalLifecycleGain float64   `json:"totalLifecycleGain"`
	Holdings           []Holding `json:"holdings"`
	AssetAllocation    []Asset   `json:"assetAllocation"`
}

type Asset struct {
	Name  string  `json:"name"`
	Value float64 `json:"value"`
}
