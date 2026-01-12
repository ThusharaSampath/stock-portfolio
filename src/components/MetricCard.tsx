import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface MetricCardProps {
    label: string;
    value: string | number;
    subValue?: string | number;
    trend?: 'up' | 'down' | 'neutral';
    className?: string;
}

export function MetricCard({ label, value, subValue, trend, className }: MetricCardProps) {
    const trendColor =
        trend === 'up' ? 'text-green-400' :
            trend === 'down' ? 'text-red-400' :
                'text-slate-400';

    return (
        <div className={twMerge("bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm", className)}>
            <h3 className="text-slate-400 text-sm uppercase tracking-wider font-semibold">{label}</h3>
            <div className="mt-2 text-3xl font-bold text-slate-100 tracking-tight">
                {value}
            </div>
            {subValue && (
                <div className={twMerge("mt-1 text-sm font-medium", trendColor)}>
                    {subValue}
                </div>
            )}
        </div>
    );
}
