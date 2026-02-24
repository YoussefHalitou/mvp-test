'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { format, startOfMonth, endOfMonth, isSameDay, subMonths, differenceInDays, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { Users, Truck, FolderKanban, Clock, TrendingUp, AlertCircle, CheckCircle2, Clock3, Calendar, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

export function KPIClient() {
    const currentDate = new Date();
    const [startDate, setStartDate] = useState<Date>(startOfMonth(currentDate));
    const [endDate, setEndDate] = useState<Date>(endOfMonth(currentDate));

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        projectsTotal: 0,
        projectsActive: 0,
        employeesActive: 0,
        vehiclesActive: 0,
        hoursThisMonth: 0,
        avgHoursPerDay: 0,
        completedThisMonth: 0,
    });
    const [projectStatuses, setProjectStatuses] = useState<Record<string, number>>({});
    const [serviceDistribution, setServiceDistribution] = useState<{ name: string; count: number; color: string }[]>([]);
    const [topEmployees, setTopEmployees] = useState<{ id: string; name: string; hours: number }[]>([]);
    const [dailyHours, setDailyHours] = useState<{ date: string; dayStart: Date; hours: number }[]>([]);
    const [recentProjects, setRecentProjects] = useState<any[]>([]);

    const fetchKPIs = async () => {
        setLoading(true);
        try {
            const startStr = format(startDate, 'yyyy-MM-dd');
            const endStr = format(endDate, 'yyyy-MM-dd');

            // 1. Projects
            const { data: projects } = await supabase.from('t_projects').select('project_id, status, name, created_at, dienstleistungen').order('created_at', { ascending: false });

            let pTotal = 0;
            let pActive = 0;
            let pCompPeriod = 0;
            const statuses: Record<string, number> = { 'Planung': 0, 'Bestätigt': 0, 'Abgeschlossen': 0, 'Archiviert': 0 };
            const servicesMap: Record<string, number> = {};

            if (projects) {
                pTotal = projects.length;
                projects.forEach(p => {
                    const status = p.status || 'Planung';
                    if (status !== 'Archiviert' && status !== 'Abgeschlossen') pActive++;
                    if (status === 'Abgeschlossen' && p.created_at && p.created_at >= startStr && p.created_at <= endStr + 'T23:59:59') pCompPeriod++;

                    if (statuses[status] !== undefined) statuses[status]++;
                    else statuses[status] = 1;

                    // Parse services
                    if (p.dienstleistungen) {
                        try {
                            let svcs = [];
                            if (p.dienstleistungen.startsWith('[')) {
                                svcs = JSON.parse(p.dienstleistungen);
                            } else {
                                svcs = p.dienstleistungen.split(',').map((s: string) => s.trim());
                            }
                            svcs.forEach((s: string) => {
                                if (s) servicesMap[s] = (servicesMap[s] || 0) + 1;
                            });
                        } catch (e) {
                            // ignore parse errors
                        }
                    }
                });
                setRecentProjects(projects.slice(0, 5));
            }

            const SERVICE_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500', 'bg-cyan-500'];
            const servDist = Object.entries(servicesMap)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([name, count], i) => ({ name, count, color: SERVICE_COLORS[i % SERVICE_COLORS.length] }));

            // 2. Employees active
            const { count: empCount } = await supabase.from('t_employees').select('*', { count: 'exact', head: true }).eq('is_active', true);

            // 3. Vehicles active
            const { count: vehCount } = await supabase.from('t_vehicles').select('*', { count: 'exact', head: true }).eq('is_deleted', false);

            // 4. Hours this period
            const { data: times } = await supabase.from('t_time_pairs')
                .select('ges_lis_h, datum, employee_name, employee_id')
                .gte('datum', startStr)
                .lte('datum', endStr);

            let totalHours = 0;
            const empHours: Record<string, { id: string; name: string; hours: number }> = {};
            const dayMap: Record<string, number> = {};

            if (times) {
                times.forEach(t => {
                    const h = Number(t.ges_lis_h) || 0;
                    totalHours += h;

                    // Group by employee
                    if (t.employee_name && h > 0) {
                        const key = t.employee_id || t.employee_name;
                        if (!empHours[key]) empHours[key] = { id: key, name: t.employee_name, hours: 0 };
                        empHours[key].hours += h;
                    }

                    // Group by day
                    if (t.datum) {
                        dayMap[t.datum] = (dayMap[t.datum] || 0) + h;
                    }
                });
            }

            const topEmps = Object.values(empHours)
                .sort((a, b) => b.hours - a.hours)
                .slice(0, 5);

            // Build daily graph data for entire selected range
            const dailyData = [];
            let daysWithWork = 0;
            const totalDays = differenceInDays(endDate, startDate) + 1;

            // Limit to at most 90 days for performance/rendering
            const maxDaysToRender = Math.min(totalDays, 90);

            for (let i = 0; i < maxDaysToRender; i++) {
                const d = addDays(startDate, i);
                const dStr = format(d, 'yyyy-MM-dd');
                const h = dayMap[dStr] || 0;
                if (h > 0) daysWithWork++;
                dailyData.push({ date: dStr, dayStart: d, hours: h });
            }

            const avgHours = daysWithWork > 0 ? (totalHours / daysWithWork) : 0;

            setStats({
                projectsTotal: pTotal,
                projectsActive: pActive,
                employeesActive: empCount || 0,
                vehiclesActive: vehCount || 0,
                hoursThisMonth: totalHours,
                avgHoursPerDay: avgHours,
                completedThisMonth: pCompPeriod,
            });
            setProjectStatuses(statuses);
            setServiceDistribution(servDist);
            setTopEmployees(topEmps);
            setDailyHours(dailyData);

        } catch (error) {
            console.error('Error fetching KPIs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (startDate && endDate) {
            fetchKPIs();
        }
    }, [startDate, endDate]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full bg-slate-50">
                <div className="text-slate-500 flex flex-col items-center gap-2">
                    <span className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                    <span>Lade Statistiken...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col bg-slate-50/50 overflow-auto">
            <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b bg-white px-8 py-6 shadow-sm z-10 sticky top-0">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">KPI & Statistik</h1>
                    <p className="text-sm text-slate-500">Übersicht über die Leistung und Auslastung im gewählten Zeitraum.</p>
                </div>

                {/* Date Controls */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                const d = new Date();
                                setStartDate(startOfMonth(d));
                                setEndDate(endOfMonth(d));
                            }}
                            className={cn("px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                                isSameDay(startDate, startOfMonth(new Date())) && isSameDay(endDate, endOfMonth(new Date())) ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                            )}>Dieser Monat</button>
                        <button
                            onClick={() => {
                                const d = subMonths(new Date(), 1);
                                setStartDate(startOfMonth(d));
                                setEndDate(endOfMonth(d));
                            }}
                            className={cn("px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                                isSameDay(startDate, startOfMonth(subMonths(new Date(), 1))) && isSameDay(endDate, endOfMonth(subMonths(new Date(), 1))) ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                            )}>Letzter Monat</button>
                    </div>

                    <div className="h-4 w-px bg-slate-300 hidden sm:block"></div>

                    <div className="flex items-center gap-2 px-1">
                        <input
                            type="date"
                            value={format(startDate, 'yyyy-MM-dd')}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val) setStartDate(new Date(val));
                            }}
                            className="bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer"
                            title="Startdatum"
                        />
                        <span className="text-slate-400 font-medium">-</span>
                        <input
                            type="date"
                            value={format(endDate, 'yyyy-MM-dd')}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val) setEndDate(new Date(val));
                            }}
                            className="bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer"
                            title="Enddatum"
                        />
                    </div>
                </div>
            </header>

            <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-8">
                {/* 1. KEY METRICS CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-5 bg-blue-600 rounded-bl-full w-20 h-20 transition-transform group-hover:scale-110" />
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FolderKanban className="w-4 h-4" /></div>
                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Aktive Projekte</h3>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-extrabold text-slate-800 tracking-tight">{stats.projectsActive}</span>
                            <span className="text-xs text-slate-400 font-medium">/ {stats.projectsTotal} total</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-5 bg-emerald-600 rounded-bl-full w-20 h-20 transition-transform group-hover:scale-110" />
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle2 className="w-4 h-4" /></div>
                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Erledigt (Zeitraum)</h3>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-extrabold text-slate-800 tracking-tight">{stats.completedThisMonth}</span>
                            <span className="text-xs text-slate-400 font-medium">Projekte</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-5 bg-violet-600 rounded-bl-full w-20 h-20 transition-transform group-hover:scale-110" />
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-2 bg-violet-50 text-violet-600 rounded-lg"><Users className="w-4 h-4" /></div>
                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Personal</h3>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-extrabold text-slate-800 tracking-tight">{stats.employeesActive}</span>
                            <span className="text-xs text-slate-400 font-medium">Aktiv</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-5 bg-amber-600 rounded-bl-full w-20 h-20 transition-transform group-hover:scale-110" />
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Truck className="w-4 h-4" /></div>
                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Fahrzeuge</h3>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-extrabold text-slate-800 tracking-tight">{stats.vehiclesActive}</span>
                            <span className="text-xs text-slate-400 font-medium">Verfügbar</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-5 bg-indigo-600 rounded-bl-full w-20 h-20 transition-transform group-hover:scale-110" />
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Clock className="w-4 h-4" /></div>
                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Gesamt (Zeitraum)</h3>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-extrabold text-slate-800 tracking-tight">{stats.hoursThisMonth.toFixed(0)}</span>
                            <span className="text-xs text-slate-400 font-medium">h erfasst</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-5 bg-cyan-600 rounded-bl-full w-20 h-20 transition-transform group-hover:scale-110" />
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-2 bg-cyan-50 text-cyan-600 rounded-lg"><Calendar className="w-4 h-4" /></div>
                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ø pro Tag</h3>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-extrabold text-slate-800 tracking-tight">{stats.avgHoursPerDay.toFixed(1)}</span>
                            <span className="text-xs text-slate-400 font-medium">h / Aktivtag</span>
                        </div>
                    </div>
                </div>

                {/* 2. CHARTS & LISTS ROW */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
                    {/* Project Status Dist */}
                    <div className="bg-white border text-card-foreground rounded-2xl shadow-sm p-5 md:p-6 transition-all hover:shadow-md">
                        <div className="flex flex-col space-y-1 mb-5">
                            <h3 className="font-semibold text-lg flex items-center gap-2 text-slate-800"><TrendingUp className="w-4 h-4 text-slate-400" />Projektstatus</h3>
                            <p className="text-xs text-slate-500">Verteilung auf einen Blick</p>
                        </div>

                        <div className="space-y-3.5">
                            {[
                                { label: 'Planung', count: projectStatuses['Planung'] || 0, color: 'bg-amber-400', icon: Clock3 },
                                { label: 'Bestätigt', count: projectStatuses['Bestätigt'] || 0, color: 'bg-blue-500', icon: AlertCircle },
                                { label: 'Abgeschlossen', count: projectStatuses['Abgeschlossen'] || 0, color: 'bg-emerald-500', icon: CheckCircle2 },
                                { label: 'Archiviert', count: projectStatuses['Archiviert'] || 0, color: 'bg-slate-300', icon: FolderKanban }
                            ].map(status => {
                                const percentage = stats.projectsTotal > 0 ? (status.count / stats.projectsTotal) * 100 : 0;
                                const I = status.icon;
                                return (
                                    <div key={status.label} className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="flex items-center gap-1.5 text-slate-700 font-medium"><I className="w-3.5 h-3.5 text-slate-400" /> {status.label}</span>
                                            <span className="font-semibold text-slate-900">{status.count} <span className="text-slate-400 font-normal">({percentage.toFixed(0)}%)</span></span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div className={cn("h-full rounded-full transition-all duration-1000", status.color)} style={{ width: `${percentage}%` }}></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Dienstleistungen */}
                    <div className="bg-white border text-card-foreground rounded-2xl shadow-sm p-5 md:p-6 transition-all hover:shadow-md">
                        <div className="flex flex-col space-y-1 mb-5">
                            <h3 className="font-semibold text-lg flex items-center gap-2 text-slate-800"><CheckCircle2 className="w-4 h-4 text-slate-400" />Dienstleistungen</h3>
                            <p className="text-xs text-slate-500">Beliebteste Leistungsarten</p>
                        </div>

                        {serviceDistribution.length === 0 ? (
                            <div className="h-40 flex items-center justify-center text-slate-400 text-sm">Keine Daten vorhanden</div>
                        ) : (
                            <div className="space-y-3">
                                {serviceDistribution.map(svc => {
                                    const maxCount = serviceDistribution[0].count;
                                    const percentage = (svc.count / maxCount) * 100;
                                    return (
                                        <div key={svc.name} className="space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-700 font-medium truncate pr-2" title={svc.name}>{svc.name}</span>
                                                <span className="font-semibold text-slate-900">{svc.count}</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div className={cn("h-full rounded-full transition-all duration-1000", svc.color)} style={{ width: `${percentage}%` }}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Top Employees */}
                    <div className="bg-white border text-card-foreground rounded-2xl shadow-sm p-5 md:p-6 flex flex-col transition-all hover:shadow-md">
                        <div className="flex flex-col space-y-1 mb-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2 text-slate-800"><Award className="w-4 h-4 text-slate-400" />Personal (Top 5)</h3>
                            <p className="text-xs text-slate-500">Meiste erfasste Stunden (Monat)</p>
                        </div>

                        {topEmployees.length === 0 ? (
                            <div className="h-40 flex items-center justify-center text-slate-400 text-sm">Keine erfassten Stunden</div>
                        ) : (
                            <div className="flex-1 space-y-2">
                                {topEmployees.map((emp, idx) => (
                                    <div key={emp.id} className="flex items-center justify-between p-2 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100/50 transition-colors">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                                                {idx + 1}
                                            </div>
                                            <span className="font-medium text-slate-700 text-sm truncate max-w-[120px]" title={emp.name}>{emp.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="block font-bold text-slate-900 text-sm">{emp.hours.toFixed(1)} <span className="text-xs text-slate-400 font-medium">h</span></span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. DAILY ACTIVITY CHART & RECENT PROJECTS */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
                    {/* Activity Bar Chart (Full Width on mobile, 2/3 on desktop) */}
                    <div className="bg-white border text-card-foreground rounded-2xl shadow-sm p-5 md:p-6 lg:col-span-2 flex flex-col">
                        <div className="flex flex-col space-y-1 mb-8">
                            <h3 className="font-semibold text-lg flex items-center gap-2 text-slate-800"><Calendar className="w-4 h-4 text-slate-400" />Tägliche Arbeitsstunden</h3>
                            <p className="text-xs text-slate-500">Trendanalyse für den gewählten Zeitraum</p>
                        </div>

                        <div className="flex-1 min-h-[200px] flex items-end gap-1 sm:gap-2 pt-4 px-2 overflow-x-auto pb-4">
                            <div className="flex items-end h-full gap-1 min-w-full">
                                {dailyHours.map((col, i) => {
                                    const maxHours = Math.max(...dailyHours.map(d => d.hours), 10);
                                    const heightPct = Math.max((col.hours / maxHours) * 100, 2);
                                    const isToday = isSameDay(col.dayStart, new Date());

                                    return (
                                        <div key={i} className="group relative flex-1 flex flex-col items-center justify-end h-full min-w-[16px]">
                                            {/* Tooltip */}
                                            <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-10 bg-slate-800 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap z-10 transition-all duration-200 translate-y-2 group-hover:translate-y-0">
                                                <div className="font-semibold">{format(col.dayStart, 'dd.MM.yyyy')}</div>
                                                <div className="text-slate-300">{col.hours.toFixed(1)} Stunden</div>
                                                {/* little pointer triangle */}
                                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                                            </div>

                                            {/* Bar */}
                                            <div
                                                className={cn(
                                                    "w-full rounded-t-sm transition-all duration-500 hover:opacity-80 max-w-[40px] shadow-sm",
                                                    col.hours === 0 ? "bg-slate-100" : isToday ? "bg-indigo-500" : "bg-blue-500"
                                                )}
                                                style={{ height: `${heightPct}%` }}
                                            ></div>

                                            {/* X-Axis */}
                                            <span className={cn(
                                                "text-[10px] mt-2 font-medium shrink-0",
                                                isToday ? "text-indigo-600 font-bold" : "text-slate-400"
                                            )}>
                                                {format(col.dayStart, dailyHours.length > 31 ? 'dd.MM' : 'd')}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Recent Projects List */}
                    <div className="bg-white border text-card-foreground rounded-2xl shadow-sm p-5 md:p-6 flex flex-col h-[350px]">
                        <div className="flex flex-col space-y-1 mb-4">
                            <h3 className="font-semibold text-lg text-slate-800">Neueste Aufträge</h3>
                            <p className="text-xs text-slate-500">Die 5 zuletzt erfassten Projekte</p>
                        </div>

                        <div className="flex-1 overflow-auto -mx-2 px-2">
                            <div className="relative w-full">
                                <table className="w-full text-sm text-left border-collapse">
                                    <tbody className="text-slate-700">
                                        {recentProjects.map(p => (
                                            <tr key={p.project_id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors group">
                                                <td className="py-3 align-middle font-medium truncate max-w-[140px]" title={p.name || ''}>
                                                    {p.name || 'Ohne Name'}
                                                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                                                        {format(new Date(p.created_at), 'dd.MM. yyyy', { locale: de })}
                                                    </div>
                                                </td>
                                                <td className="py-3 align-middle text-right">
                                                    <span className={cn("inline-flex items-center rounded-lg px-2 py-1 text-[10px] font-semibold tracking-wide uppercase",
                                                        p.status === 'Abgeschlossen' ? 'bg-emerald-50 text-emerald-700' :
                                                            p.status === 'Bestätigt' ? 'bg-blue-50 text-blue-700' :
                                                                p.status === 'Archiviert' ? 'bg-slate-100 text-slate-700' :
                                                                    'bg-amber-50 text-amber-700'
                                                    )}>
                                                        {p.status || 'Planung'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
