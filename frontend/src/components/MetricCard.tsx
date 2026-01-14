import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { clsx } from 'clsx';

interface MetricCardProps {
    label: string;
    value: string;
    subValue?: string;
    trend?: 'up' | 'down' | 'neutral';
}

export function MetricCard({ label, value, subValue, trend }: MetricCardProps) {
    return (
        <div className="relative overflow-hidden group">
            {/* Glass Effect Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-xl transition-all duration-300 group-hover:shadow-blue-900/20 group-hover:border-blue-500/30"></div>

            {/* Content */}
            <div className="relative p-6 flex flex-col justify-between h-full z-10">
                <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
                    {trend && (
                        <div className={clsx(
                            "flex items-center justify-center w-8 h-8 rounded-full",
                            trend === 'up' && "bg-emerald-500/10 text-emerald-400",
                            trend === 'down' && "bg-rose-500/10 text-rose-400",
                            trend === 'neutral' && "bg-slate-700/30 text-slate-400"
                        )}>
                            {trend === 'up' && <ArrowUpRight size={16} />}
                            {trend === 'down' && <ArrowDownRight size={16} />}
                            {trend === 'neutral' && <Minus size={16} />}
                        </div>
                    )}
                </div>

                <div>
                    <div className="text-2xl font-bold text-slate-100 font-mono tracking-tight">{value}</div>
                    {subValue && (
                        <div className={clsx(
                            "text-xs mt-1 font-medium",
                            trend === 'up' ? "text-emerald-400" :
                                trend === 'down' ? "text-rose-400" :
                                    "text-slate-500"
                        )}>
                            {subValue}
                        </div>
                    )}
                </div>
            </div>

            {/* Decorative Glow */}
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl group-hover:bg-blue-600/20 transition-all duration-500"></div>
        </div>
    );
}
