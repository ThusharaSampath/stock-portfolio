"use client";

import { useEffect, useState } from 'react';
import { MetricCard } from '@/components/MetricCard';
import { AllocationChart } from '@/components/AllocationChart';
import { HistoryChart } from '@/components/HistoryChart';
import { Sidebar } from '@/components/Sidebar';
import { TransactionForm } from '@/components/TransactionForm';
import { PortfolioSummary } from '@/lib/types';

// Demo User ID
const DATA_USER_ID = 'demo-user';

export default function Dashboard() {
    const [data, setData] = useState<PortfolioSummary | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            setLoading(true);
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

            const [summaryRes, historyRes] = await Promise.all([
                fetch(`${backendUrl}/portfolio/summary?uid=${DATA_USER_ID}`),
                fetch(`${backendUrl}/portfolio/history?uid=${DATA_USER_ID}`)
            ]);

            if (summaryRes.ok) {
                const json = await summaryRes.json();
                setData(json);
            }

            if (historyRes.ok) {
                const json = await historyRes.json();
                setHistory(json);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Calculate Gain Percentage
    const gainPct = data && data.netInvested > 0
        ? ((data.totalLifecycleGain / data.netInvested) * 100).toFixed(2) + '%'
        : '0.00%';

    return (
        <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30">
            <Sidebar />

            <main className="flex-1 p-4 md:p-8 pb-32 md:ml-64">
                <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent mb-2">
                            Dashboard
                        </h1>
                        <p className="text-slate-400">Overview of your investment performance</p>
                    </div>
                    <div className="text-right">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Net Worth</div>
                        <div className="text-3xl font-mono font-bold text-white">
                            {data ? `LKR ${data.netWorth.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '...'}
                        </div>
                    </div>
                </header>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <MetricCard
                        label="Net Worth"
                        value={data ? `LKR ${data.netWorth.toLocaleString()}` : '-'}
                        trend="up"
                    />
                    <MetricCard
                        label="Net Invested"
                        value={data ? `LKR ${data.netInvested.toLocaleString()}` : '-'}
                        subValue="Capital Injected"
                    />
                    <MetricCard
                        label="Cash on Hand"
                        value={data ? `LKR ${data.cashOnHand.toLocaleString()}` : '-'}
                        subValue="Buying Power"
                    />
                    <MetricCard
                        label="Total Gain"
                        value={data ? `LKR ${data.totalLifecycleGain.toLocaleString()}` : '-'}
                        subValue={`${gainPct} Return`}
                        trend={data && data.totalLifecycleGain >= 0 ? 'up' : 'down'}
                    />
                </div>

                {/* Charts Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Chart (History) - Spans 2 cols */}
                    <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl min-h-[400px]">
                        {loading ? (
                            <div className="animate-pulse h-full bg-slate-800/50 rounded-xl"></div>
                        ) : (
                            <HistoryChart data={history} />
                        )}
                    </div>

                    {/* Side Chart (Allocation) - Spans 1 col */}
                    <div className="lg:col-span-1 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl min-h-[400px] flex flex-col">
                        <h3 className="text-slate-400 text-sm uppercase tracking-wider font-semibold mb-4">Asset Allocation</h3>
                        <div className="flex-1 relative">
                            {loading || !data ? (
                                <div className="animate-pulse h-full bg-slate-800/50 rounded-xl"></div>
                            ) : (
                                <AllocationChart data={data.assetAllocation} />
                            )}
                        </div>
                        {data && (
                            <div className="mt-6 text-center">
                                <div className="text-sm font-medium text-slate-300">Portfolio Health</div>
                                <div className="text-xs text-slate-500 mt-1">
                                    Your portfolio is diversified across {data.assetAllocation.length} assets.
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <TransactionForm uid={DATA_USER_ID} onSuccess={fetchData} buyingPower={data?.cashOnHand} />
        </div>
    );
}
