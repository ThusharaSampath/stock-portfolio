"use client";

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { TransactionForm } from '@/components/TransactionForm';
import { TransactionsTable } from '@/components/TransactionsTable';
import { Transaction } from '@/lib/types';

// Demo User ID
const DATA_USER_ID = 'demo-user';

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            setLoading(true);
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
            const res = await fetch(`${backendUrl}/portfolio/transactions?uid=${DATA_USER_ID}`);
            if (res.ok) {
                const json = await res.json();
                setTransactions(json);
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

    return (
        <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30">
            <Sidebar />

            <main className="flex-1 p-4 md:p-8 pb-32 md:ml-64">
                <header className="mb-12">
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
                        Transactions
                    </h1>
                    <p className="text-slate-400 mt-2">History of your investment activities</p>
                </header>

                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
                    {loading ? (
                        <div className="text-center py-20 text-slate-500 animate-pulse">Loading transactions...</div>
                    ) : (
                        <TransactionsTable transactions={transactions} />
                    )}
                </div>
            </main>

            <TransactionForm uid={DATA_USER_ID} onSuccess={fetchData} />
        </div>
    );
}
