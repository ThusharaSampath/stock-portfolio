export type TransactionType = 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAW' | 'DIVIDEND';

export interface Transaction {
    id: string;
    date: string; // ISO Timestamp
    type: TransactionType;
    symbol?: string; // Nullable for deposits/withdrawals
    qty: number; // Negative for sells is not strictly required if type defines it, but netAmount handles flow.
    // User spec: "qty: 1000 (negative for sells)". We will follow spec.
    price: number;
    fee: number;
    netAmount: number; // Calculated cash flow impact
    notes?: string;
}

export interface MarketData {
    [symbol: string]: number | string; // Allow string for 'updatedAt'
}

export interface Holding {
    symbol: string;
    qty: number;
    avgCost: number; // Average cost per share
    currentPrice: number;
    marketValue: number;
    totalCost: number; // Total cost basis for current shares
    realizedGain: number; // Cashflow from previous sells
    unrealizedGain: number;
    lifecycleGain: number; // (CurrentQty * CurrentPrice) + Sum(AllCashflows)
    allocation: number; // Percentage of portfolio
}

export interface PortfolioSummary {
    netWorth: number;
    netInvested: number;
    cashOnHand: number;
    totalLifecycleGain: number;
    holdings: Holding[];
    assetAllocation: { name: string; value: number }[];
}
