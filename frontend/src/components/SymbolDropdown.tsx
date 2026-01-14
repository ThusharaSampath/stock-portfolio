"use client";

import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { Search } from 'lucide-react';

interface SymbolDropdownProps {
    value: string;
    onChange: (value: string) => void;
}

export function SymbolDropdown({ value, onChange }: SymbolDropdownProps) {
    const [symbols, setSymbols] = useState<string[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchSymbols = async () => {
            setLoading(true);
            try {
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
                const res = await fetch(`${backendUrl}/market/symbols`);
                if (res.ok) {
                    const data = await res.json();
                    setSymbols(data);
                }
            } catch (error) {
                console.error("Error fetching symbols:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSymbols();
    }, []);

    const filteredSymbols = symbols.filter(s => s.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="relative">
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Symbol</label>
            <div
                className={clsx(
                    "w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100 focus-within:ring-2 focus-within:ring-blue-500 outline-none cursor-pointer flex items-center justify-between",
                    !value && "text-slate-500"
                )}
                onClick={() => setIsOpen(!isOpen)}
            >
                {value || "Select Stock"}
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-2 border-b border-slate-800 sticky top-0 bg-slate-900">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Search..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-600"
                            />
                        </div>
                    </div>

                    <div className="overflow-y-auto flex-1">
                        {loading ? (
                            <div className="p-4 text-center text-xs text-slate-500">Loading...</div>
                        ) : filteredSymbols.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-500">No matches found</div>
                        ) : (
                            filteredSymbols.map(sym => (
                                <div
                                    key={sym}
                                    className={clsx(
                                        "px-4 py-2 text-sm cursor-pointer hover:bg-slate-800 transition-colors",
                                        value === sym ? "text-blue-400 bg-blue-900/20" : "text-slate-300"
                                    )}
                                    onClick={() => {
                                        onChange(sym);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                >
                                    {sym}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
            {isOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            )}
        </div>
    );
}
