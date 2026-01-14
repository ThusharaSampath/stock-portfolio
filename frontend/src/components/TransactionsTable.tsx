"use client";

import { Transaction } from '@/lib/types';
import { clsx } from 'clsx';
import { ArrowUpRight, ArrowDownRight, RefreshCw, Wallet, PiggyBank } from 'lucide-react';

interface TransactionsTableProps {
    transactions: Transaction[];
}

export function TransactionsTable({ transactions }: TransactionsTableProps) {
    if (transactions.length === 0) {
        return (
            <div className="text-center py-12 text-slate-500">
                No transactions found.
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="text-xs text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4">Symbol</th>
                        <th className="px-6 py-4 text-right">Qty</th>
                        <th className="px-6 py-4 text-right">Price</th>
                        <th className="px-6 py-4 text-right">Net Amount</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                    {transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-white/5 transition-colors group">
                            <td className="px-6 py-4 text-slate-300 font-medium whitespace-nowrap">
                                {new Date(tx.date).toLocaleDateString(undefined, {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                })}
                            </td>
                            <td className="px-6 py-4">
                                <span className={clsx(
                                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold w-fit",
                                    tx.type === 'BUY' && "bg-blue-500/10 text-blue-400 border border-blue-500/20",
                                    tx.type === 'SELL' && "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                                    (tx.type === 'DEPOSIT' || tx.type === 'WITHDRAW') && "bg-purple-500/10 text-purple-400 border border-purple-500/20",
                                    tx.type === 'DIVIDEND' && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                )}>
                                    {tx.type === 'BUY' && <ArrowDownRight size={12} />}
                                    {tx.type === 'SELL' && <ArrowUpRight size={12} />}
                                    {tx.type === 'DEPOSIT' && <Wallet size={12} />}
                                    {tx.type === 'WITHDRAW' && <Wallet size={12} />}
                                    {tx.type === 'DIVIDEND' && <PiggyBank size={12} />}
                                    {tx.type}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-slate-300 font-mono">
                                {tx.symbol || '-'}
                            </td>
                            <td className="px-6 py-4 text-right text-slate-300 font-mono">
                                {tx.qty !== 0 ? Math.abs(tx.qty) : '-'}
                            </td>
                            <td className="px-6 py-4 text-right text-slate-300 font-mono">
                                {tx.price > 0 ? tx.price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                            </td>
                            <td className={clsx(
                                "px-6 py-4 text-right font-mono font-bold",
                                tx.netAmount > 0 ? "text-emerald-400" : "text-slate-200"
                            )}>
                                {tx.netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
