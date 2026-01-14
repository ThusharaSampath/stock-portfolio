"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { clsx } from 'clsx';

interface HistoryData {
    date: string;
    netInvested: number;
    totalGain: number;
    netWorth: number;
}

interface HistoryChartProps {
    data: HistoryData[];
}

export function HistoryChart({ data }: HistoryChartProps) {
    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 bg-slate-800 rounded-xl border border-slate-700 text-slate-500">
                No history data
            </div>
        );
    }

    // Format dates for display
    const chartData = data.map(d => ({
        ...d,
        displayDate: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }));

    return (
        <div className="w-full h-full min-h-[300px]">
            <div className="mb-4">
                <h3 className="text-slate-400 text-sm uppercase tracking-wider font-semibold">Performance History</h3>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorGain" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis
                            dataKey="displayDate"
                            stroke="#64748b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#64748b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#f8fafc', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ color: '#f8fafc' }}
                            formatter={(value: any) => value?.toLocaleString()}
                        />
                        <Area
                            type="monotone"
                            dataKey="netInvested"
                            name="Net Invested"
                            stroke="#3b82f6"
                            fillOpacity={1}
                            fill="url(#colorInvested)"
                            strokeWidth={2}
                        />
                        <Area
                            type="monotone"
                            dataKey="netWorth"
                            name="Net Worth"
                            stroke="#10b981"
                            fillOpacity={1}
                            fill="url(#colorGain)"
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
