'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
    LayoutDashboard,
    Calendar,
    Clock,
    Calculator,
    FolderKanban,
    ChevronLeft,
    ChevronRight,
    Settings,
    Users,
    Truck,
    Package,
    BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

const COMPANY = {
    initials: 'LiS',
    user: 'Demo User',
    role: 'Planer',
};

const MENU_ITEMS = [
    { href: '/planning', label: 'Einsatzplanung', icon: Calendar },
    { href: '/tracking', label: 'Rückerfassung', icon: Clock },
    { href: '/calculation', label: 'Nachkalkulation', icon: Calculator },
    { href: '/projects', label: 'Projekte', icon: FolderKanban },
    { href: '/resources', label: 'Ressourcen', icon: Users },
    { href: '/kpi', label: 'KPI & Statistik', icon: BarChart3 },
];

export function AppSidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const pathname = usePathname();

    return (
        <aside
            className={cn(
                'relative flex flex-col border-r border-slate-200 bg-slate-900 text-slate-300 transition-all duration-300',
                collapsed ? 'w-[72px]' : 'w-64'
            )}
        >
            {/* Brand */}
            <div className="flex h-16 items-center px-4 border-b border-white/10">
                {!collapsed ? (
                    <Link href="/apps/planning" className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                            <span className="text-white font-bold text-sm">LiS</span>
                        </div>
                        <span className="text-white font-display font-semibold text-lg tracking-tight">
                            Land in Sicht
                        </span>
                    </Link>
                ) : (
                    <div className="mx-auto w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">LiS</span>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                {MENU_ITEMS.map((item) => {
                    const isActive = pathname?.startsWith(item.href);
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 group',
                                isActive
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'hover:bg-slate-800 hover:text-white',
                                collapsed && 'justify-center'
                            )}
                            title={collapsed ? item.label : undefined}
                        >
                            <Icon
                                className={cn(
                                    'w-5 h-5 shrink-0 transition-colors',
                                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                                )}
                            />
                            {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Collapse Toggle */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="mx-3 mb-2 flex items-center justify-center rounded-lg py-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
                {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>

            {/* User Profile */}
            <div className="border-t border-white/10 p-3">
                <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 ring-2 ring-white/10 shadow-lg shadow-blue-500/20">
                        <span className="text-white text-xs font-bold tracking-tight">{COMPANY.initials}</span>
                    </div>
                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-white truncate">{COMPANY.user}</p>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-md border border-amber-400/20">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400" />
                                    </span>
                                    Demo
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 truncate">{COMPANY.role}</p>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}
