"use client";

import { useEffect, useState } from 'react';
import { PortfolioSummary } from '@/lib/types';
import { MetricCard } from '@/components/MetricCard';
import { HoldingsTable } from '@/components/HoldingsTable';
import { AllocationChart } from '@/components/AllocationChart';
import { TransactionForm } from '@/components/TransactionForm';
import { SyncButton } from '@/components/SyncButton';

// Demo User ID for this proof of concept
const DATA_USER_ID = 'demo-user';

export default function DashboardPage() {
    const [data, setData] = useState<PortfolioSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/portfolio/summary?uid=${DATA_USER_ID}`);
            if (!res.ok) throw new Error('Failed to fetch data');
            const json = await res.json();
            setData(json);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">
                Loading Portfolio...
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-red-400">
                Error: {error || 'No data'}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-8 pb-32">
            <header className="max-w-7xl mx-auto mb-12 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Portfolio Tracker</h1>
                    <p className="text-slate-400 mt-2">Headless Investment Dashboard</p>
                </div>
                <SyncButton />
            </header>

            <main className="max-w-7xl mx-auto space-y-8">
                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <MetricCard
                        label="Net Worth"
                        value={`LKR ${data.netWorth.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                        trend="neutral"
                    />
                    <MetricCard
                        label="Net Invested"
                        value={`LKR ${data.netInvested.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                        subValue="Capital Injected"
                    />
                    <MetricCard
                        label="Cash on Hand"
                        value={`LKR ${data.cashOnHand.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                        subValue="Buying Power"
                    />
                    <MetricCard
                        label="Total Gain"
                        value={`LKR ${data.totalLifecycleGain.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                        trend={data.totalLifecycleGain >= 0 ? 'up' : 'down'}
                        subValue={data.netInvested > 0 ? `${((data.totalLifecycleGain / data.netInvested) * 100).toFixed(2)}% Return` : undefined}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Allocation Chart */}
                    <div className="lg:col-span-1">
                        <AllocationChart data={data.assetAllocation} />
                    </div>

                    {/* Holdings Table */}
                    <div className="lg:col-span-2">
                        <div className="bg-slate-800 rounded-xl border border-slate-700 h-full p-6">
                            <h3 className="text-slate-400 text-sm uppercase tracking-wider font-semibold mb-4">Holdings</h3>
                            <HoldingsTable holdings={data.holdings} />
                        </div>
                    </div>
                </div>
            </main>

            <TransactionForm uid={DATA_USER_ID} onSuccess={fetchData} />
        </div>
    );
}
