"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { clsx } from 'clsx';

interface AllocationChartProps {
    data: { name: string; value: number }[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

export function AllocationChart({ data }: AllocationChartProps) {
    // Filter out zero or negative values for the chart (Recharts Pie warns/doesn't render well with 0)
    const chartData = data.filter(d => d.value > 0);

    if (chartData.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 bg-slate-800 rounded-xl border border-slate-700 text-slate-500">
                No data to display
            </div>
        );
    }

    return (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm h-[400px]">
            <h3 className="text-slate-400 text-sm uppercase tracking-wider font-semibold mb-4">Asset Allocation</h3>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f1f5f9' }}
                            itemStyle={{ color: '#f1f5f9' }}
                            formatter={(value: any) => value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        />
                        <Legend iconType="circle" />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
