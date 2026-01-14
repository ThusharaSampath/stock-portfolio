import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Wallet, PieChart, TrendingUp, Settings, ArrowRightLeft, Menu, X } from 'lucide-react';
import { clsx } from 'clsx';

const NAV_ITEMS = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Holdings', href: '/holdings', icon: Wallet },
    { name: 'Transactions', href: '/transactions', icon: ArrowRightLeft },
];

export function Sidebar() {
    const pathname = usePathname();
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                className="md:hidden fixed top-6 right-6 z-50 p-2 bg-slate-800/80 backdrop-blur text-white rounded-lg border border-slate-700 shadow-lg"
                onClick={() => setIsMobileOpen(!isMobileOpen)}
            >
                {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Sidebar Backdrop (Mobile) */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <aside className={clsx(
                "fixed left-0 top-0 h-screen w-64 bg-slate-950/90 backdrop-blur-xl border-r border-slate-800/50 flex flex-col z-40 transition-transform duration-300 ease-in-out",
                isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
            )}>
                <div className="p-8">
                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/20">
                            <TrendingUp size={18} className="text-white" />
                        </div>
                        <span className="font-bold text-lg tracking-tight text-white">Portfolio</span>
                    </div>

                    <nav className="space-y-2">
                        {NAV_ITEMS.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsMobileOpen(false)}
                                    className={clsx(
                                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                                        isActive
                                            ? "bg-blue-600/10 text-blue-400 font-medium shadow-[0_0_20px_rgba(37,99,235,0.1)] border border-blue-600/20"
                                            : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/50"
                                    )}
                                >
                                    <item.icon size={20} className={clsx("transition-colors", isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300")} />
                                    <span>{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="mt-auto p-8 border-t border-slate-800/50">
                    <button className="flex items-center gap-3 text-slate-500 hover:text-slate-300 transition-colors w-full px-4 py-3 rounded-xl hover:bg-slate-900/50">
                        <Settings size={20} />
                        <span>Settings</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
