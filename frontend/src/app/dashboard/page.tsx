"use client";

import { useEffect, useState } from 'react';
import { PortfolioSummary } from '@/lib/types';
import { MetricCard } from '@/components/MetricCard';
import { AllocationChart } from '@/components/AllocationChart';
import { TransactionForm } from '@/components/TransactionForm';
import { Sidebar } from '@/components/Sidebar';

// Demo User ID for this proof of concept
const DATA_USER_ID = 'demo-user';

export default function DashboardPage() {
    const [data, setData] = useState<PortfolioSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
            const res = await fetch(`${backendUrl}/portfolio/summary?uid=${DATA_USER_ID}`);
            if (!res.ok) throw new Error('Failed to fetch data from backend');
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
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-blue-600/30 border-t-blue-500 animate-spin" />
                    <p className="tracking-widest uppercase text-xs font-semibold">Loading Dashboard</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-red-400">
                Error: {error || 'No data'}
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30">
            <Sidebar />

            <main className="flex-1 p-4 md:p-8 pb-32 md:ml-64">
                <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent mb-2">
                            Dashboard
                        </h1>
                        <p className="text-slate-400 font-light">Overview of your investment performance</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Net Worth</p>
                        <p className="text-2xl font-mono text-blue-400">LKR {data.netWorth.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
                    <div className="lg:col-span-2 bg-slate-900/50 p-8 rounded-2xl border border-slate-800 backdrop-blur-sm shadow-xl flex flex-col justify-center items-center min-h-[400px]">
                        <h3 className="w-full text-left text-xs font-bold text-slate-500 uppercase tracking-widest mb-8">Asset Allocation</h3>
                        <div className="w-full h-full flex justify-center">
                            <AllocationChart data={data.assetAllocation} />
                        </div>
                    </div>

                    {/* Activity Feed Placeholder or Mini List? For now, empty or secondary stats */}
                    <div className="bg-gradient-to-b from-blue-900/20 to-slate-900/20 p-8 rounded-2xl border border-blue-900/30 backdrop-blur-sm flex flex-col justify-center text-center">
                        <h3 className="text-blue-200 font-bold text-lg mb-2">Portfolio Health</h3>
                        <p className="text-slate-400 text-sm">Your portfolio is diversified across {data.assetAllocation.length} assets.</p>
                    </div>
                </div>
            </main>

            <TransactionForm uid={DATA_USER_ID} onSuccess={fetchData} buyingPower={data.cashOnHand} />
        </div>
    );
}
