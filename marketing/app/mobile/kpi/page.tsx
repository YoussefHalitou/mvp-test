'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/components/ui/toast';
import { BarChart3, Users, FolderKanban, TrendingUp, TrendingDown, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { de } from 'date-fns/locale';

export default function MobileKPIPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalProjects: 0, activeProjects: 0, completedProjects: 0,
        totalEmployees: 0, totalVehicles: 0,
        plansThisMonth: 0, hoursThisMonth: 0,
    });

    useEffect(() => {
        (async () => {
            setLoading(true);
            const now = new Date();
            const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
            const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

            const [projRes, empRes, vehRes, plansRes, tpRes] = await Promise.all([
                supabase.from('t_projects').select('project_id, status', { count: 'exact' }),
                supabase.from('t_employees').select('employee_id', { count: 'exact' }).eq('is_active', true),
                supabase.from('t_vehicles').select('vehicle_id', { count: 'exact' }).eq('is_deleted', false),
                supabase.from('t_morningplan').select('plan_id', { count: 'exact' }).gte('plan_date', monthStart).lte('plan_date', monthEnd),
                supabase.from('t_time_pairs').select('lis_von, lis_bis, pause_min').gte('datum', monthStart).lte('datum', monthEnd),
            ]);

            const projects = projRes.data || [];
            const timePairs = tpRes.data || [];
            let totalHours = 0;
            timePairs.forEach((tp: any) => {
                if (tp.lis_von && tp.lis_bis) {
                    const [vh, vm] = tp.lis_von.split(':').map(Number);
                    const [bh, bm] = tp.lis_bis.split(':').map(Number);
                    const m = (bh * 60 + bm) - (vh * 60 + vm) - (tp.pause_min || 0);
                    if (m > 0) totalHours += m / 60;
                }
            });

            setStats({
                totalProjects: projects.length,
                activeProjects: projects.filter(p => p.status !== 'Abgeschlossen' && p.status !== 'Storniert').length,
                completedProjects: projects.filter(p => p.status === 'Abgeschlossen').length,
                totalEmployees: empRes.count || 0,
                totalVehicles: vehRes.count || 0,
                plansThisMonth: plansRes.count || 0,
                hoursThisMonth: Math.round(totalHours * 10) / 10,
            });
            setLoading(false);
        })();
    }, []);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-800">{format(new Date(), 'MMMM yyyy', { locale: de })}</h2>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3">
                <KPICard icon={<FolderKanban className="w-5 h-5 text-blue-600" />} label="Projekte gesamt" value={stats.totalProjects} bg="bg-blue-50" />
                <KPICard icon={<TrendingUp className="w-5 h-5 text-green-600" />} label="Aktive Projekte" value={stats.activeProjects} bg="bg-green-50" />
                <KPICard icon={<TrendingDown className="w-5 h-5 text-purple-600" />} label="Abgeschlossen" value={stats.completedProjects} bg="bg-purple-50" />
                <KPICard icon={<Users className="w-5 h-5 text-orange-600" />} label="Mitarbeiter" value={stats.totalEmployees} bg="bg-orange-50" />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <KPICard icon={<BarChart3 className="w-5 h-5 text-indigo-600" />} label="Einsätze (Monat)" value={stats.plansThisMonth} bg="bg-indigo-50" />
                <KPICard icon={<Clock className="w-5 h-5 text-teal-600" />} label="Stunden (Monat)" value={`${stats.hoursThisMonth}h`} bg="bg-teal-50" />
            </div>

            {/* Summary section */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <h3 className="text-sm font-bold text-slate-700 mb-3">Übersicht</h3>
                <div className="space-y-3">
                    <SummaryRow label="Fahrzeuge" value={String(stats.totalVehicles)} />
                    <SummaryRow label="Ø Einsätze / Tag"
                        value={stats.plansThisMonth > 0 ? (stats.plansThisMonth / new Date().getDate()).toFixed(1) : '0'} />
                    <SummaryRow label="Ø Stunden / Einsatz"
                        value={stats.plansThisMonth > 0 ? (stats.hoursThisMonth / stats.plansThisMonth).toFixed(1) : '—'} />
                </div>
            </div>
        </div>
    );
}

function KPICard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: string | number; bg: string }) {
    return (
        <div className={cn('rounded-xl border border-slate-200 shadow-sm p-4', bg)}>
            <div className="flex items-center gap-2 mb-2">{icon}</div>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
        </div>
    );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
            <span className="text-xs text-slate-500">{label}</span>
            <span className="text-sm font-semibold text-slate-700">{value}</span>
        </div>
    );
}
