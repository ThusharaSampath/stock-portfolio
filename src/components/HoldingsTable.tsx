import { Holding } from '@/lib/types';
import { clsx } from 'clsx';

interface HoldingsTableProps {
    holdings: Holding[];
}

export function HoldingsTable({ holdings }: HoldingsTableProps) {
    return (
        <div className="overflow-x-auto bg-slate-800 rounded-xl border border-slate-700">
            <table className="w-full text-left text-sm text-slate-400">
                <thead className="bg-slate-900/50 uppercase tracking-wider font-semibold text-xs border-b border-slate-700">
                    <tr>
                        <th className="px-6 py-4">Symbol</th>
                        <th className="px-6 py-4 text-right">Qty</th>
                        <th className="px-6 py-4 text-right">Price</th>
                        <th className="px-6 py-4 text-right">Value</th>
                        <th className="px-6 py-4 text-right">Lifecycle Gain</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                    {holdings.map((holding) => (
                        <tr key={holding.symbol} className="hover:bg-slate-700/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-slate-100">{holding.symbol}</td>
                            <td className="px-6 py-4 text-right">{holding.qty.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right">{holding.currentPrice.toFixed(2)}</td>
                            <td className="px-6 py-4 text-right font-medium text-slate-200">
                                {holding.marketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className={clsx(
                                "px-6 py-4 text-right font-medium",
                                holding.lifecycleGain >= 0 ? "text-green-400" : "text-red-400"
                            )}>
                                {holding.lifecycleGain.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                        </tr>
                    ))}
                    {holdings.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                No active holdings found.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
