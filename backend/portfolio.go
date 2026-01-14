package main

import (
	"math"
)

type StockState struct {
	Qty      float64
	Cashflow float64
}

func CalculatePortfolioState(transactions []Transaction, marketPrices map[string]float64, baseNetInvestedOverride *float64) PortfolioSummary {
	var cashOnHand float64
	var netInvested float64

	stockMap := make(map[string]*StockState)

	for _, tx := range transactions {
		// 1. Cash on Hand
		cashOnHand += tx.NetAmount

		// 2. Net Invested
		if tx.Type == DEPOSIT {
			netInvested += tx.NetAmount
		} else if tx.Type == WITHDRAW {
			netInvested += tx.NetAmount // Assuming netAmount is negative for withdraw
		}

		// 3. Holdings Logic
		if tx.Symbol != "" {
			if _, exists := stockMap[tx.Symbol]; !exists {
				stockMap[tx.Symbol] = &StockState{Qty: 0, Cashflow: 0}
			}
			stock := stockMap[tx.Symbol]

			if tx.Type == BUY {
				stock.Qty += tx.Qty
			} else if tx.Type == SELL {
				stock.Qty += tx.Qty // Qty is negative for sells per logic? Or positive?
				// JS logic: "If SELL, subtract qty... If tx.qty is -100, adding -100 subtracts."
				// We need to ensure we follow the storage convention.
				// Assuming stored types follow same convention as JS app: Qty is -100 for sell.
			}

			stock.Cashflow += tx.NetAmount
		}
	}

	if baseNetInvestedOverride != nil {
		netInvested = *baseNetInvestedOverride
	}

	var holdings []Holding
	var totalHoldingsValue float64
	var totalLifecycleGain float64

	for symbol, state := range stockMap {
		price := 0.0
		if p, ok := marketPrices[symbol]; ok {
			price = p
		}

		currentMarketValue := state.Qty * price
		lifecycleGain := currentMarketValue + state.Cashflow

		// floating point tolerance
		if math.Abs(state.Qty) > 0.000001 {
			holdings = append(holdings, Holding{
				Symbol:        symbol,
				Qty:           state.Qty,
				CurrentPrice:  price,
				MarketValue:   currentMarketValue,
				LifecycleGain: lifecycleGain,
			})
		}

		totalHoldingsValue += currentMarketValue
		totalLifecycleGain += lifecycleGain
	}

	// Calculate Allocation
	var assetAllocation []Asset
	for i := range holdings {
		allocation := 0.0
		if totalHoldingsValue > 0 {
			allocation = (holdings[i].MarketValue / totalHoldingsValue) * 100
		}
		holdings[i].Allocation = allocation
		assetAllocation = append(assetAllocation, Asset{Name: holdings[i].Symbol, Value: holdings[i].MarketValue})
	}

	netWorth := cashOnHand + totalHoldingsValue

	return PortfolioSummary{
		NetWorth:           netWorth,
		NetInvested:        netInvested,
		CashOnHand:         cashOnHand,
		TotalLifecycleGain: netWorth - netInvested, // Standard definition
		Holdings:           holdings,
		AssetAllocation:    assetAllocation,
	}
}
