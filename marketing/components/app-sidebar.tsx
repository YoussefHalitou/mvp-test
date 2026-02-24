'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
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
    BarChart3,
    LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';

// We will use actual user state instead of a hardcoded COMPANY object, but keep fallback initials
const getInitials = (nameOrEmail: string) => {
    if (!nameOrEmail) return 'U';
    return nameOrEmail.substring(0, 2).toUpperCase();
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

    const [userEmail, setUserEmail] = useState<string>('Laden...');
    const [userName, setUserName] = useState<string>('Benutzer');

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserEmail(user.email || 'Keine E-Mail');
                // Derive name from metadata, or use the part before @ in email
                const metaName = user.user_metadata?.full_name || user.user_metadata?.name;
                if (metaName) {
                    setUserName(metaName);
                } else if (user.email) {
                    setUserName(user.email.split('@')[0]);
                }
            } else {
                setUserEmail('Nicht angemeldet');
                setUserName('Gast');
            }
        };
        fetchUser();
    }, []);

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            // Clear the middleware cookie
            document.cookie = 'has_session=; path=/; max-age=0';
            // Force a hard redirect to clear Next.js client-side router cache
            window.location.assign('/login');
        } catch (error) {
            console.error('Error logging out:', error);
            document.cookie = 'has_session=; path=/; max-age=0';
            window.location.assign('/login');
        }
    };

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

            {/* User Profile & Account Management */}
            <div className="border-t border-white/10 p-3">
                <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 ring-2 ring-white/10 shadow-lg shadow-blue-500/20">
                        <span className="text-white text-xs font-bold tracking-tight">{getInitials(userName)}</span>
                    </div>
                    {!collapsed && (
                        <div className="flex-1 min-w-0 flex items-center justify-between">
                            <div className="flex flex-col overflow-hidden pr-2">
                                <p className="text-sm font-semibold text-white truncate">{userName}</p>
                                <p className="text-xs text-slate-400 truncate">{userEmail}</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                                title="Abmelden"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    {collapsed && (
                        // Hidden absolute button so blind-clicks on collapsed avatar might still log out, but better to keep it clean. 
                        // Usually you don't want accidental logouts in collapsed mode.
                        null
                    )}
                </div>
            </div>
        </aside>
    );
}
