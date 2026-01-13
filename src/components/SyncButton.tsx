"use client";

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';

export function SyncButton() {
    const [loading, setLoading] = useState(false);

    const handleSync = async () => {
        if (loading) return;
        setLoading(true);
        try {
            const res = await fetch('/api/admin/update-prices', { method: 'POST' });
            if (!res.ok) throw new Error('Sync failed');
            alert('Market data updated successfully!');
            window.location.reload(); // Simple reload to refresh calculations
        } catch (e) {
            console.error(e);
            alert('Failed to update market data.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleSync}
            disabled={loading}
            className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700",
                loading && "opacity-50 cursor-not-allowed"
            )}
        >
            <RefreshCw size={16} className={clsx(loading && "animate-spin")} />
            {loading ? 'Syncing...' : 'Sync Prices'}
        </button>
    );
}
