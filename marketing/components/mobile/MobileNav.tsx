'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Calendar, Clock, Calculator, FolderKanban, FolderOpen,
    Users, BarChart3, Menu, X, LogOut, CalendarDays, ClipboardCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_ITEMS = [
    { href: '/mobile/planning', label: 'Einsatzplanung', icon: Calendar },
    { href: '/mobile/tracking', label: 'Rückerfassung', icon: Clock },
    { href: '/mobile/calculation', label: 'Nachkalkulation', icon: Calculator },
    { href: '/mobile/approvals', label: 'Freigaben', icon: ClipboardCheck },
    { href: '/mobile/projects', label: 'Projekte', icon: FolderKanban },
    { href: '/mobile/leave-planner', label: 'Urlaubs-/Terminplaner', icon: CalendarDays },
    { href: '/mobile/files', label: 'Dateien', icon: FolderOpen },
    { href: '/mobile/resources', label: 'Ressourcen', icon: Users },
    { href: '/mobile/kpi', label: 'KPI & Statistik', icon: BarChart3 },
];

const BOTTOM_TABS = [
    { href: '/mobile/planning', label: 'Planung', icon: Calendar },
    { href: '/mobile/tracking', label: 'Zeiten', icon: Clock },
    { href: '/mobile/projects', label: 'Projekte', icon: FolderKanban },
    { href: '/mobile/resources', label: 'Ressourcen', icon: Users },
];

export function MobileNav() {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const pathname = usePathname();
    const [userName, setUserName] = useState('Benutzer');
    const [userEmail, setUserEmail] = useState('');

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserEmail(user.email || '');
                const metaName = user.user_metadata?.full_name ||
                    (user.user_metadata?.first_name && user.user_metadata?.last_name
                        ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
                        : null) ||
                    user.user_metadata?.name;
                setUserName(metaName || user.email?.split('@')[0] || 'Benutzer');
            }
        };
        fetchUser();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        document.cookie = 'has_session=; path=/; max-age=0';
        window.location.assign('/login');
    };

    const currentPage = NAV_ITEMS.find(item => pathname?.startsWith(item.href))?.label || 'Mobile';

    return (
        <>
            {/* Top Bar — safe-area-inset-top for notch devices */}
            <header className="sticky top-0 z-40 bg-slate-900 shadow-lg"
                style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
                <div className="flex items-center justify-between px-4 sm:px-6 py-3">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setDrawerOpen(true)}
                            className="p-2 -ml-1 rounded-lg text-white hover:bg-slate-800 transition-colors active:bg-slate-700 touch-manipulation"
                            aria-label="Menü öffnen"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-blue-600 flex items-center justify-center">
                                <span className="text-white font-bold text-xs">LiS</span>
                            </div>
                            <span className="text-white font-semibold text-sm sm:text-base truncate max-w-[200px] sm:max-w-[300px]">
                                {currentPage}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Slide-out Drawer */}
            <AnimatePresence>
                {drawerOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 z-50 bg-black/50"
                            onClick={() => setDrawerOpen(false)}
                        />
                        {/* Drawer — wider on tablets, safe-area-top padding */}
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="fixed inset-y-0 left-0 z-50 w-[80vw] max-w-xs sm:max-w-sm bg-slate-900 shadow-2xl flex flex-col"
                            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
                        >
                            {/* Drawer Header */}
                            <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-white/10">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-blue-600 flex items-center justify-center">
                                        <span className="text-white font-bold text-sm">LiS</span>
                                    </div>
                                    <span className="text-white font-semibold text-lg">Land in Sicht</span>
                                </div>
                                <button
                                    onClick={() => setDrawerOpen(false)}
                                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 touch-manipulation"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Nav Links — min touch target 48px */}
                            <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
                                {NAV_ITEMS.map(item => {
                                    const isActive = pathname?.startsWith(item.href);
                                    const Icon = item.icon;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setDrawerOpen(false)}
                                            className={cn(
                                                'flex items-center gap-3 rounded-xl px-4 py-3.5 transition-all touch-manipulation',
                                                'min-h-[48px]',
                                                isActive
                                                    ? 'bg-blue-600 text-white'
                                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white active:bg-slate-700'
                                            )}
                                        >
                                            <Icon className="w-5 h-5 shrink-0" />
                                            <span className="text-sm sm:text-base font-medium">{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </nav>

                            {/* User + Logout */}
                            <div className="border-t border-white/10 p-4 sm:p-5"
                                style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center ring-2 ring-white/10">
                                        <span className="text-white text-sm font-bold">
                                            {userName.substring(0, 2).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-white truncate">{userName}</p>
                                        <p className="text-xs text-slate-400 truncate">{userEmail}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-slate-800 text-slate-300 hover:text-red-400 hover:bg-slate-800/80 active:bg-slate-700 transition-colors text-sm font-medium min-h-[48px] touch-manipulation"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Abmelden
                                </button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Bottom Tab Bar — safe-area-inset-bottom for home bar */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
                <div className="mx-auto max-w-2xl flex items-center justify-around py-1.5"
                    style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom, 0.375rem))' }}>
                    {BOTTOM_TABS.map(tab => {
                        const isActive = pathname?.startsWith(tab.href);
                        const Icon = tab.icon;
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={cn(
                                    'flex flex-col items-center gap-0.5 px-4 sm:px-6 py-2 rounded-xl transition-colors min-w-[64px] min-h-[48px] justify-center touch-manipulation',
                                    isActive ? 'text-blue-600' : 'text-slate-400 active:text-slate-600'
                                )}
                            >
                                <Icon className={cn('w-5 h-5 sm:w-6 sm:h-6', isActive && 'stroke-[2.5px]')} />
                                <span className={cn('text-[10px] sm:text-xs font-medium', isActive && 'font-semibold')}>
                                    {tab.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </>
    );
}
