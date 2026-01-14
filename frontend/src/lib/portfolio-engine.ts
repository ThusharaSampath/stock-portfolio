import { Transaction, MarketData, PortfolioSummary, Holding } from './types';

export function calculatePortfolioState(
    transactions: Transaction[],
    marketPrices: MarketData,
    baseNetInvestedOverride?: number
): PortfolioSummary {
    let cashOnHand = 0;
    let netInvested = 0;

    // Track per-stock data
    const stockMap: Record<string, { qty: number; cashflow: number }> = {};

    transactions.forEach((tx) => {
        // 1. Cash on Hand (Buying Power)
        // Sum of netAmount from all transactions.
        cashOnHand += tx.netAmount;

        // 2. Net Invested Capital
        // Sum(Deposits) - Sum(Withdrawals)
        if (tx.type === 'DEPOSIT') {
            netInvested += tx.netAmount; // netAmount is positive for deposits
        } else if (tx.type === 'WITHDRAW') {
            netInvested += tx.netAmount; // netAmount is negative for withdrawals (logic says Sum(W), but netAmount captures sign. 
            // User says: Sum(Deposits) - Sum(Withdrawals). 
            // If Deposit=1000 (netAmount=1000), Withdraw=200 (netAmount=-200). 
            // NetInvested = 1000 + (-200) = 800? 
            // Or 1000 - 200 = 800. 
            // Assuming netAmount for Withdraw is negative, simple addition works.
            // Wait, let's verify spec. 
            // A. "netAmount: -150000" for Buy. So Withdraw should be negative netAmount. 
            // B. "Net Invested Capital: Sum(Deposits) - Sum(Withdrawals)." 
            // If I use algebraic sum of netAmount for D and W, it works.
        }

        // 3. Holdings Logic
        if (tx.symbol) {
            if (!stockMap[tx.symbol]) {
                stockMap[tx.symbol] = { qty: 0, cashflow: 0 };
            }

            const stock = stockMap[tx.symbol];

            // Update Qty
            if (tx.type === 'BUY') {
                stock.qty += tx.qty;
            } else if (tx.type === 'SELL') {
                stock.qty += tx.qty; // User said "negative for sells" in spec, so we add the negative number.
                // Spec: "qty: 1000 (negative for sells)". 
                // Logic: "If SELL, subtract qty...". 
                // If tx.qty is -100, adding -100 subtracts. correct.
            }

            // Update Cashflow Bucket
            // "Sum(AllCashflowsForStock)"
            stock.cashflow += tx.netAmount;
        }
    });

    // Apply Override if provided
    if (baseNetInvestedOverride !== undefined) {
        netInvested = baseNetInvestedOverride;
    }

    // Generate Holdings List and Calculate Totals
    const holdings: Holding[] = [];
    let totalHoldingsValue = 0;
    let totalLifecycleGain = 0; // Sum of all lifecycle gains? Or just (NetWorth - NetInvested)?
    // User says "Total Gain" metric card. Usually Net Worth - Net Invested.
    // But let's calculate per-holding too.

    Object.entries(stockMap).forEach(([symbol, data]) => {
        // Only show active holdings? Or closed ones too?
        // "Holdings Table" usually implies active. 
        // But "Timeline Gain" implies tracking sold stocks.
        // If qty is 0, it's a closed trade. Maybe detailed view?
        // For Dashboard Holdings Table, usually show Qty != 0.

        // However, for "Net Worth" calculation, we need current value.
        // Closed trades (qty=0) have 0 current value.

        const priceRaw = marketPrices[symbol];
        const currentPrice = typeof priceRaw === 'number' ? priceRaw : 0;

        // Lifecycle Gain Formula: (CurrentQty * CurrentMarketPrice) + Sum(AllCashflowsForStock).
        const currentMarketValue = data.qty * currentPrice;
        const lifecycleGain = currentMarketValue + data.cashflow;

        // If Qty is near 0 (floating point safety), treat as 0.
        if (Math.abs(data.qty) > 0.000001) {
            holdings.push({
                symbol,
                qty: data.qty,
                currentPrice,
                marketValue: currentMarketValue,
                // Optional fields
                avgCost: 0, // Not strictly calculated in this simplified logic, but could be inferred if needed.
                totalCost: 0,
                realizedGain: 0,
                unrealizedGain: 0,
                lifecycleGain,
                allocation: 0 // Will calc later
            });
        }

        // Add to totals
        totalHoldingsValue += currentMarketValue;
        // Total Gain logic:
        // Some might prefer sum of lifecycle gains of ACTIVE holdings?
        // Or sum of ALL stock cashflows + current value?
        // The latter = Total Portfolio Lifecycle Gain.
        totalLifecycleGain += lifecycleGain; // Includes closed trades profit!
    });

    // Calculate Asset Allocation
    holdings.forEach(h => {
        h.allocation = totalHoldingsValue > 0 ? (h.marketValue / totalHoldingsValue) * 100 : 0;
    });

    // Net Worth
    const netWorth = cashOnHand + totalHoldingsValue;

    return {
        netWorth,
        netInvested,
        cashOnHand,
        totalLifecycleGain: netWorth - netInvested, // This is the standard "Total Gain" definition.
        // Note: totalLifecycleGain strictly from stocks sum might differ from (NetWorth - NetInvested) if there are non-stock fees or interest?
        // But in this closed system, Cash + StockValue = NetWorth.
        // NetInvested is external input.
        // (NetWorth - NetInvested) should equal Sum(All Profit).
        holdings,
        assetAllocation: holdings.map(h => ({ name: h.symbol, value: h.marketValue }))
    };
}
