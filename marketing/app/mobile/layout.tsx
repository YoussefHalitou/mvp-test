'use client';

import { MobileNav } from '@/components/mobile/MobileNav';
import { ToastProvider } from '@/components/ui/toast';

export default function MobileLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ToastProvider>
            <div className="flex flex-col min-h-[100dvh] bg-slate-50">
                <MobileNav />
                {/* Main content — max-width centers on tablets, safe-area bottom for home bar + tab bar */}
                <main className="flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
                    <div className="mx-auto max-w-2xl">
                        {children}
                    </div>
                </main>
            </div>
        </ToastProvider>
    );
}
