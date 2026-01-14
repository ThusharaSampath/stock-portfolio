"use client";

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { TransactionType } from '@/lib/types';
import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { SymbolDropdown } from './SymbolDropdown';

interface TransactionFormProps {
    uid: string; // User ID to add transaction for
    onSuccess: () => void;
}

export function TransactionForm({ uid, onSuccess }: TransactionFormProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [type, setType] = useState<TransactionType>('BUY');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [symbol, setSymbol] = useState('');
    const [qty, setQty] = useState<number>(0);
    const [price, setPrice] = useState<number>(0);
    const [fee, setFee] = useState<number>(0);
    const [notes, setNotes] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Calculate netAmount
            // BUY: -(price * qty + fee)
            // SELL: (price * qty - fee) [Note: user spec said sell qty is negative in schema? No, "negative for sells" in qty field example "qty: 1000 (negative for sells)". 
            // But in form, user usually enters positive qty. We should convert logic here to match spec.

            // Wait, spec: "qty: 1000 (negative for sells)". 
            // netAmount: Calculated cash flow impact.

            let finalQty = qty;
            let netAmount = 0;

            if (type === 'BUY') {
                finalQty = Math.abs(qty); // Ensure positive
                netAmount = -((finalQty * price) + fee);
            } else if (type === 'SELL') {
                finalQty = -Math.abs(qty); // Ensure negative per spec
                netAmount = (Math.abs(qty) * price) - fee;
            } else if (type === 'DEPOSIT') {
                netAmount = price; // Often users assume 'Amount' field. We can use price as 'Amount' or add new field. Let's use 'price' as 'Amount' for simplified form.
                finalQty = 0;
            } else if (type === 'WITHDRAW') {
                netAmount = -Math.abs(price);
                finalQty = 0;
            } else if (type === 'DIVIDEND') {
                netAmount = price;
                finalQty = 0;
            }

            const txData = {
                date: new Date(date).toISOString(),
                type,
                symbol: (type === 'BUY' || type === 'SELL' || type === 'DIVIDEND') ? symbol.toUpperCase() : null,
                qty: finalQty,
                price: type === 'DEPOSIT' || type === 'WITHDRAW' ? 0 : price, // Logic checks
                fee,
                netAmount,
                notes
            };

            // If DEPOSIT/WITHDRAW, we used price as amount for netAmount calc, but strictly 'price' field in schema might need to be 0 or amount?
            // Schema: "price": 150.00. 
            // It's cleaner to put the amount in 'netAmount' and maybe price as 1.0 or 0? 
            // Let's just trust 'netAmount' is the truth.

            await addDoc(collection(db, 'users', uid, 'transactions'), txData);

            // Reset and close
            setIsOpen(false);
            onSuccess();
            // Reset form defaults
            setSymbol('');
            setQty(0);
            setPrice(0);
            setFee(0);
            setNotes('');

        } catch (err: any) {
            console.error("Error adding transaction:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    console.log("TransactionForm rendered");
    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-8 right-8 bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-full shadow-lg transition-all z-[100] border-2 border-white/20"
                aria-label="Add Transaction"
            >
                + Add Transaction
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden">
                        <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900">
                            <h2 className="text-xl font-bold text-slate-100">New Transaction</h2>
                            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {error && <div className="p-3 bg-red-900/50 text-red-200 text-sm rounded">{error}</div>}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Type</label>
                                    <select
                                        value={type}
                                        onChange={(e) => setType(e.target.value as TransactionType)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="BUY">Buy</option>
                                        <option value="SELL">Sell</option>
                                        <option value="DEPOSIT">Deposit</option>
                                        <option value="WITHDRAW">Withdraw</option>
                                        <option value="DIVIDEND">Dividend</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Date</label>
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            {(type === 'BUY' || type === 'SELL' || type === 'DIVIDEND') && (
                                <div>
                                    <SymbolDropdown value={symbol} onChange={setSymbol} />
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-4">
                                {(type === 'BUY' || type === 'SELL') && (
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Qty</label>
                                        <input
                                            type="number"
                                            value={qty}
                                            onChange={(e) => setQty(parseFloat(e.target.value))}
                                            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                            required
                                        />
                                    </div>
                                )}
                                <div className={clsx((type === 'DEPOSIT' || type === 'WITHDRAW') ? 'col-span-3' : '')}>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                                        {type === 'DEPOSIT' || type === 'WITHDRAW' ? 'Amount (LKR)' : 'Price (LKR)'}
                                    </label>
                                    <input
                                        type="number"
                                        value={price}
                                        onChange={(e) => setPrice(parseFloat(e.target.value))}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                        required
                                    />
                                </div>
                                {type !== 'DEPOSIT' && type !== 'WITHDRAW' && (
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Fee</label>
                                        <input
                                            type="number"
                                            value={fee}
                                            onChange={(e) => setFee(parseFloat(e.target.value))}
                                            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Notes</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none h-20"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : 'Save Transaction'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
