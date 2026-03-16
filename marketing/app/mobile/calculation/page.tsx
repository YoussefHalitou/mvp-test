'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/components/ui/toast';
import { Calculator, Loader2, Users, Package, Truck, Wrench, Receipt, BarChart3, HardHat, Fuel, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';

type Project = Database['public']['Tables']['t_projects']['Row'];

// ---- Interfaces matching desktop ----
interface TimePairWithRate {
    pair_id: string; datum: string; mitarbeiter: string; role: string | null;
    lis_von: string | null; lis_bis: string | null; kunde_von: string | null; kunde_bis: string | null;
    pause_min: number; lis_stunden: number; kunden_stunden: number; satz: number; kosten: number;
}
interface MaterialRow {
    id: string; material_id: string; material_name: string; unit: string;
    quantity: number; cost_per_unit: number; price_per_unit: number; total_cost: number; total_price: number;
}
interface VehicleCostRow {
    id: string; vehicle_id: string; fahrzeug: string; usage_type: string;
    usage_value: number; cost_per_unit: number; total_cost: number; notes: string;
}
interface ServiceCostRow {
    id: string; service_id: string; service_name: string; supplier: string;
    quantity: number; unit: string; cost_per_unit: number; total_cost: number;
    price_per_unit: number; total_price: number;
}
interface RevenueRow {
    id: string; position_label: string; qty: number; unit: string;
    unit_price: number; line_total: number; kind: string;
}
interface HvzCostRow {
    id: string; datum_von: string | null; datum_bis: string | null; tage: number | null;
    ek_preis: number; vk_preis: number;
}
interface BnkCostRow {
    id: string; beschreibung: string | null; menge: number | null;
    ek_preis: number; vk_preis: number;
}
interface DiscountRow {
    id: string; mode: string; description: string; value: number;
}
interface ExtraCostRow {
    cost_id: string; cost_type: string; description: string; cost: number;
}

function calcHours(von: string | null, bis: string | null, pauseMin: number = 0): number {
    if (!von || !bis) return 0;
    const [vh, vm] = von.split(':').map(Number);
    const [bh, bm] = bis.split(':').map(Number);
    const totalMin = (bh * 60 + bm) - (vh * 60 + vm) - pauseMin;
    return totalMin > 0 ? +(totalMin / 60).toFixed(2) : 0;
}

function eur(n: number) { return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }); }

const COST_TABS = [
    { id: 'personnel', label: 'Personal', icon: Users },
    { id: 'materials', label: 'Material', icon: Package },
    { id: 'vehicles', label: 'Fahrzeuge', icon: Truck },
    { id: 'services', label: 'Leistungen', icon: Wrench },
    { id: 'hvz', label: 'HVZ', icon: HardHat },
    { id: 'bnk', label: 'Diesel', icon: Fuel },
    { id: 'revenue', label: 'Erlöse', icon: Receipt },
    { id: 'summary', label: 'Übersicht', icon: BarChart3 },
] as const;

type CostTabId = typeof COST_TABS[number]['id'];

export default function MobileCalculationPage() {
    const { toast } = useToast();
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingData, setLoadingData] = useState(false);
    const [activeTab, setActiveTab] = useState<CostTabId>('personnel');

    // Data states — matching desktop
    const [personnel, setPersonnel] = useState<TimePairWithRate[]>([]);
    const [materials, setMaterials] = useState<MaterialRow[]>([]);
    const [vehicles, setVehicles] = useState<VehicleCostRow[]>([]);
    const [services, setServices] = useState<ServiceCostRow[]>([]);
    const [revenue, setRevenue] = useState<RevenueRow[]>([]);
    const [extraCosts, setExtraCosts] = useState<ExtraCostRow[]>([]);
    const [discounts, setDiscounts] = useState<DiscountRow[]>([]);
    const [hvzCosts, setHvzCosts] = useState<HvzCostRow[]>([]);
    const [bnkCosts, setBnkCosts] = useState<BnkCostRow[]>([]);

    // Collapsed groups in personnel tab
    const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());

    // Morningplan per-date entries
    const [morningPlanEntries, setMorningPlanEntries] = useState<{ plan_id: string; project_id: string; plan_date: string }[]>([]);
    const [selectedPlanDate, setSelectedPlanDate] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            const [projRes, mpRes] = await Promise.all([
                supabase.from('t_projects').select('*').order('created_at', { ascending: false }),
                supabase.from('t_morningplan').select('plan_id, project_id, plan_date').order('plan_date', { ascending: false }),
            ]);
            setProjects(projRes.data || []);
            setMorningPlanEntries(mpRes.data || []);
            setLoading(false);
        })();
    }, []);

    const loadProjectData = useCallback(async (projectId: string) => {
        if (!projectId) return;
        setLoadingData(true);

        // Load employee rates
        const { data: employees } = await supabase.from('t_employees').select('employee_id, name, hourly_rate, role');
        const rateMap: Record<string, { rate: number; role: string | null }> = {};
        (employees || []).forEach(e => { rateMap[e.name] = { rate: e.hourly_rate || 0, role: e.role }; });

        // Load all 9 tables — same as desktop
        const [tpRes, matRes, vehRes, svcRes, revRes, extRes, discRes, hvzRes, bnkRes, waRes] = await Promise.all([
            supabase.from('t_time_pairs').select('*').eq('project_id', projectId).order('datum'),
            supabase.from('t_project_material_usage').select('*, material:t_materials(name, unit, prices:t_material_prices(cost_per_unit, price_per_unit))').eq('project_id', projectId),
            supabase.from('t_project_vehicle_costs').select('*, vehicle:t_vehicles(nickname)').eq('project_id', projectId),
            supabase.from('t_project_service_usage').select('*, service:t_services(name, default_unit, prices:t_service_prices(cost_per_unit, customer_price_per_unit, supplier))').eq('project_id', projectId),
            supabase.from('t_project_revenue_items').select('*').eq('project_id', projectId).order('sort_order'),
            supabase.from('t_project_costs_extra').select('*').eq('project_id', projectId),
            supabase.from('t_project_discounts').select('*').eq('project_id', projectId),
            supabase.from('t_project_hvz_costs').select('*').eq('project_id', projectId),
            supabase.from('t_project_bnk_costs').select('*').eq('project_id', projectId),
            supabase.from('t_work_assignments').select('*').eq('project_id', projectId).order('assignment_date'),
        ]);

        // Map time pairs to personnel rows — optionally filter by planDate
        const filteredTpData = selectedPlanDate ? (tpRes.data || []).filter((tp: any) => tp.datum === selectedPlanDate) : (tpRes.data || []);
        const tpPersonnel: TimePairWithRate[] = filteredTpData.filter((tp: any) => tp.pause !== 'deleted').map((tp: any) => {
            const lisH = calcHours(tp.lis_von, tp.lis_bis, tp.pause_min || 0);
            const kdH = calcHours(tp.kunde_von, tp.kunde_bis);
            const satz = rateMap[tp.mitarbeiter]?.rate || 0;
            return {
                pair_id: tp.pair_id, datum: tp.datum, mitarbeiter: tp.mitarbeiter, role: rateMap[tp.mitarbeiter]?.role || null,
                lis_von: tp.lis_von, lis_bis: tp.lis_bis, kunde_von: tp.kunde_von, kunde_bis: tp.kunde_bis,
                pause_min: tp.pause_min || 0, lis_stunden: lisH, kunden_stunden: kdH, satz, kosten: +(lisH * satz).toFixed(2),
            };
        });

        // Map work assignments to personnel rows — optionally filter by planDate
        const filteredWaData = selectedPlanDate ? (waRes.data || []).filter((wa: any) => wa.assignment_date === selectedPlanDate) : (waRes.data || []);
        const waPersonnel: TimePairWithRate[] = (filteredWaData as any[]).map((wa: any) => {
            const lisH = calcHours(wa.start_time, wa.end_time, wa.break_minutes || 0);
            const satz = rateMap[wa.employee_name]?.rate || 0;
            return {
                pair_id: `wa-${wa.assignment_id}`, datum: wa.assignment_date, mitarbeiter: wa.employee_name,
                role: rateMap[wa.employee_name]?.role || wa.work_type || null,
                lis_von: wa.start_time, lis_bis: wa.end_time, kunde_von: null, kunde_bis: null,
                pause_min: wa.break_minutes || 0, lis_stunden: lisH, kunden_stunden: lisH, satz, kosten: +(lisH * satz).toFixed(2),
            };
        });

        setPersonnel([...tpPersonnel, ...waPersonnel]);

        setMaterials((matRes.data as any || []).map((m: any) => {
            const p = Array.isArray(m.material?.prices) ? m.material.prices[0] : m.material?.prices;
            return {
                id: m.id, material_id: m.material_id, material_name: m.material?.name || m.material_id, unit: m.material?.unit || '',
                quantity: m.quantity, cost_per_unit: p?.cost_per_unit || 0, price_per_unit: p?.price_per_unit || 0,
                total_cost: +(m.quantity * (p?.cost_per_unit || 0)).toFixed(2), total_price: +(m.quantity * (p?.price_per_unit || 0)).toFixed(2),
            };
        }));

        setVehicles((vehRes.data as any || []).map((v: any) => ({
            id: v.id, vehicle_id: v.vehicle_id, fahrzeug: v.vehicle?.nickname || v.vehicle_id, usage_type: v.usage_type || 'km',
            usage_value: v.usage_value || 0, cost_per_unit: v.cost_per_unit || 0,
            total_cost: v.total_cost || +(v.usage_value * (v.cost_per_unit || 0)).toFixed(2), notes: v.notes || '',
        })));

        setServices((svcRes.data as any || []).map((s: any) => {
            const prices: any[] = Array.isArray(s.service?.prices) ? s.service.prices : s.service?.prices ? [s.service.prices] : [];
            const p = s.supplier ? prices.find((x: any) => x.supplier === s.supplier) || prices[0] : prices[0];
            return {
                id: s.id, service_id: s.service_id, service_name: s.service?.name || s.service_id, supplier: s.supplier || p?.supplier || '',
                quantity: s.quantity || 1, unit: s.service?.default_unit || 'Std', cost_per_unit: p?.cost_per_unit || 0,
                total_cost: +((s.quantity || 1) * (p?.cost_per_unit || 0)).toFixed(2),
                price_per_unit: p?.customer_price_per_unit || p?.cost_per_unit || 0,
                total_price: +((s.quantity || 1) * (p?.customer_price_per_unit || p?.cost_per_unit || 0)).toFixed(2),
            };
        }));

        setRevenue((revRes.data || []).map((r: any) => ({
            id: r.id, position_label: r.position_label, qty: r.qty, unit: r.unit || '',
            unit_price: r.unit_price, line_total: r.line_total || +(r.qty * r.unit_price).toFixed(2), kind: r.kind,
        })));

        setExtraCosts((extRes.data || []).map((e: any) => ({ cost_id: e.cost_id, cost_type: e.cost_type, description: e.description || '', cost: e.cost })));
        setDiscounts((discRes.data || []).map((d: any) => ({ id: d.id, mode: d.mode || 'flat', description: d.description || '', value: d.value || 0 })));
        setHvzCosts((hvzRes.data || []).map((h: any) => ({ id: h.id, datum_von: h.datum_von, datum_bis: h.datum_bis, tage: h.tage, ek_preis: h.ek_preis, vk_preis: h.vk_preis })));
        setBnkCosts((bnkRes.data || []).map((b: any) => ({ id: b.id, beschreibung: b.beschreibung, menge: b.menge, ek_preis: b.ek_preis, vk_preis: b.vk_preis })));

        setLoadingData(false);
    }, []);

    useEffect(() => {
        if (!selectedProjectId) {
            setPersonnel([]); setMaterials([]); setVehicles([]); setServices([]);
            setRevenue([]); setExtraCosts([]); setDiscounts([]); setHvzCosts([]); setBnkCosts([]);
            return;
        }
        loadProjectData(selectedProjectId);
    }, [selectedProjectId, selectedPlanDate, loadProjectData]);

    // ---- Calculations (matching desktop) ----
    const personalKosten = useMemo(() => personnel.reduce((s, p) => s + p.kosten, 0), [personnel]);
    const materialKosten = useMemo(() => materials.reduce((s, m) => s + m.total_cost, 0), [materials]);
    const materialErloes = useMemo(() => materials.reduce((s, m) => s + m.total_price, 0), [materials]);
    const vehicleErloes = useMemo(() => vehicles.reduce((s, v) => s + v.total_cost, 0), [vehicles]);
    const serviceKosten = useMemo(() => services.reduce((s, sv) => s + sv.total_cost, 0), [services]);
    const serviceErloes = useMemo(() => services.reduce((s, sv) => s + (sv.total_price || 0), 0), [services]);
    const extraKosten = useMemo(() => extraCosts.reduce((s, e) => s + e.cost, 0), [extraCosts]);
    const revenueTotal = useMemo(() => revenue.reduce((s, r) => s + r.line_total, 0), [revenue]);
    const hvzKosten = useMemo(() => hvzCosts.reduce((s, h) => s + (h.tage || 0) * (h.ek_preis || 0), 0), [hvzCosts]);
    const hvzErloes = useMemo(() => hvzCosts.reduce((s, h) => s + (h.tage || 0) * (h.vk_preis || 0), 0), [hvzCosts]);
    const bnkKosten = useMemo(() => bnkCosts.reduce((s, b) => s + (b.menge || 0) * (b.ek_preis || 0), 0), [bnkCosts]);
    const bnkErloes = useMemo(() => bnkCosts.reduce((s, b) => s + (b.menge || 0) * (b.vk_preis || 0), 0), [bnkCosts]);

    const totalCosts = personalKosten + materialKosten + serviceKosten + extraKosten + hvzKosten + bnkKosten;
    const baseRevenue = revenueTotal + materialErloes + vehicleErloes + serviceErloes + hvzErloes + bnkErloes;
    const discountTotal = useMemo(() => discounts.reduce((s, d) => {
        if (d.mode === 'percent') return s + (baseRevenue * ((d.value || 0) / 100));
        return s + (d.value || 0);
    }, 0), [discounts, baseRevenue]);
    const totalRevenue = baseRevenue - discountTotal;
    const margin = totalRevenue - totalCosts;
    const marginPct = totalRevenue > 0 ? (margin / totalRevenue) * 100 : 0;

    // Personnel grouped by date
    const personnelByDate = useMemo(() => {
        const groups: Record<string, TimePairWithRate[]> = {};
        personnel.forEach(p => {
            const key = p.datum || 'Ohne Datum';
            if (!groups[key]) groups[key] = [];
            groups[key].push(p);
        });
        return groups;
    }, [personnel]);

    const toggleDate = (d: string) => {
        setCollapsedDates(prev => {
            const next = new Set(prev);
            if (next.has(d)) next.delete(d); else next.add(d);
            return next;
        });
    };

    // Count for tab badges
    const tabCount = (tabId: CostTabId): number => {
        switch (tabId) {
            case 'personnel': return personnel.length;
            case 'materials': return materials.length;
            case 'vehicles': return vehicles.length;
            case 'services': return services.length;
            case 'hvz': return hvzCosts.length;
            case 'bnk': return bnkCosts.length;
            case 'revenue': return revenue.length;
            default: return 0;
        }
    };

    return (
        <div className="flex flex-col min-h-full">
            {/* Project selector */}
            <div className="sticky top-[calc(64px+env(safe-area-inset-top,0px))] z-30 bg-white border-b border-slate-200 shadow-sm px-4 sm:px-6 py-3">
                <select className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white"
                    value={selectedProjectId} onChange={e => { setSelectedProjectId(e.target.value); setSelectedPlanDate(null); }}>
                    <option value="">Projekt auswählen...</option>
                    {projects.map(p => <option key={p.project_id} value={p.project_id}>{p.project_code} — {p.name}</option>)}
                </select>
                {/* Per-date filter for multiday projects */}
                {selectedProjectId && (() => {
                    const projectPlanDates = Array.from(new Set(
                        morningPlanEntries
                            .filter(mp => mp.project_id === selectedProjectId)
                            .map(mp => mp.plan_date)
                    )).sort();
                    if (projectPlanDates.length <= 1) return null;
                    return (
                        <div className="flex overflow-x-auto gap-1 mt-2 -mx-1 px-1 pb-1 scrollbar-hide">
                            <button
                                onClick={() => setSelectedPlanDate(null)}
                                className={cn('px-2.5 py-1.5 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-colors shrink-0',
                                    !selectedPlanDate ? 'bg-violet-100 text-violet-700' : 'text-slate-500 bg-slate-50')}
                            >Alle Tage</button>
                            {projectPlanDates.map(pd => (
                                <button key={pd} onClick={() => setSelectedPlanDate(pd)}
                                    className={cn('px-2.5 py-1.5 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-colors shrink-0',
                                        selectedPlanDate === pd ? 'bg-violet-100 text-violet-700' : 'text-slate-500 bg-slate-50')}
                                >{formatDate(pd)}</button>
                            ))}
                        </div>
                    );
                })()}
                {/* Cost tabs */}
                {selectedProjectId && (
                    <div className="flex overflow-x-auto gap-1 mt-2 -mx-1 px-1 pb-1 scrollbar-hide">
                        {COST_TABS.map(tab => {
                            const Icon = tab.icon;
                            const count = tabCount(tab.id);
                            return (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                    className={cn('flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-colors shrink-0',
                                        activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'text-slate-500 bg-slate-50')}>
                                    <Icon className="w-3 h-3" /> {tab.label}
                                    {count > 0 && tab.id !== 'summary' && (
                                        <span className={cn('ml-0.5 text-[9px] px-1 rounded-full',
                                            activeTab === tab.id ? 'bg-blue-200 text-blue-800' : 'bg-slate-200 text-slate-600')}>{count}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {!selectedProjectId ? (
                <div className="flex-1 flex items-center justify-center py-20 text-slate-400">
                    <div className="text-center">
                        <Calculator className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">Bitte ein Projekt auswählen</p>
                    </div>
                </div>
            ) : loadingData ? (
                <div className="flex-1 flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
            ) : (
                <div className="p-4 sm:p-6 space-y-3">
                    {/* =========== PERSONAL TAB =========== */}
                    {activeTab === 'personnel' && (
                        personnel.length === 0 ? (
                            <EmptyState label="Keine Personaleinträge" />
                        ) : (
                            Object.entries(personnelByDate).map(([date, entries]) => {
                                const collapsed = collapsedDates.has(date);
                                const dayTotal = entries.reduce((s, p) => s + p.kosten, 0);
                                return (
                                    <div key={date} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                        <button onClick={() => toggleDate(date)}
                                            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                                            <div className="flex items-center gap-2">
                                                {collapsed ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
                                                <span className="text-xs font-bold text-slate-700">{formatDate(date)}</span>
                                                <span className="text-[10px] text-slate-400">{entries.length} Einträge</span>
                                            </div>
                                            <span className="text-xs font-bold text-slate-700">{eur(dayTotal)}</span>
                                        </button>
                                        {!collapsed && (
                                            <div className="divide-y divide-slate-100">
                                                {entries.map(p => (
                                                    <div key={p.pair_id} className="px-4 py-3 flex items-center justify-between">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-medium text-slate-700 truncate">{p.mitarbeiter}</p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                {p.role && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{p.role}</span>}
                                                                <span className="text-[10px] text-blue-600 font-medium">{p.lis_stunden.toFixed(2)}h LiS</span>
                                                                <span className="text-[10px] text-green-600 font-medium">{p.kunden_stunden.toFixed(2)}h Kd</span>
                                                                <span className="text-[10px] text-slate-400">{eur(p.satz)}/h</span>
                                                            </div>
                                                        </div>
                                                        <span className="text-sm font-semibold text-slate-700 ml-3">{eur(p.kosten)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )
                    )}

                    {/* =========== MATERIAL TAB =========== */}
                    {activeTab === 'materials' && (
                        materials.length === 0 ? <EmptyState label="Kein Material" /> : materials.map(m => (
                            <div key={m.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                                <p className="text-sm font-medium text-slate-700">{m.material_name}</p>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{m.quantity} {m.unit}</span>
                                    <span className="text-[10px] text-slate-400">EK {eur(m.cost_per_unit)}</span>
                                    <span className="text-[10px] text-slate-400">VK {eur(m.price_per_unit)}</span>
                                </div>
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                                    <span className="text-xs text-red-600">Kosten: {eur(m.total_cost)}</span>
                                    <span className="text-xs text-green-600">Erlöse: {eur(m.total_price)}</span>
                                </div>
                            </div>
                        ))
                    )}

                    {/* =========== FAHRZEUGE TAB =========== */}
                    {activeTab === 'vehicles' && (
                        vehicles.length === 0 ? <EmptyState label="Keine Fahrzeuge" /> : vehicles.map(v => (
                            <div key={v.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-700">{v.fahrzeug}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{v.usage_value} {v.usage_type}</span>
                                        <span className="text-[10px] text-slate-400">× {eur(v.cost_per_unit)}</span>
                                    </div>
                                    {v.notes && <p className="text-[10px] text-slate-400 mt-1">{v.notes}</p>}
                                </div>
                                <span className="text-sm font-semibold text-green-600">{eur(v.total_cost)}</span>
                            </div>
                        ))
                    )}

                    {/* =========== LEISTUNGEN TAB =========== */}
                    {activeTab === 'services' && (
                        services.length === 0 ? <EmptyState label="Keine Leistungen" /> : services.map(s => (
                            <div key={s.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                                <p className="text-sm font-medium text-slate-700">{s.service_name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {s.supplier && <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-600">{s.supplier}</span>}
                                    <span className="text-[10px] text-slate-400">{s.quantity} {s.unit} × {eur(s.cost_per_unit)}</span>
                                </div>
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                                    <span className="text-xs text-red-600">Kosten: {eur(s.total_cost)}</span>
                                    <span className="text-xs text-green-600">Erlöse: {eur(s.total_price)}</span>
                                </div>
                            </div>
                        ))
                    )}

                    {/* =========== HVZ TAB =========== */}
                    {activeTab === 'hvz' && (
                        hvzCosts.length === 0 ? <EmptyState label="Keine HVZ-Einträge" /> : hvzCosts.map(h => (
                            <div key={h.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                    <span>{h.datum_von ? new Date(h.datum_von).toLocaleDateString('de-DE') : '—'}</span>
                                    <span>→</span>
                                    <span>{h.datum_bis ? new Date(h.datum_bis).toLocaleDateString('de-DE') : '—'}</span>
                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{h.tage || 0} Tage</span>
                                </div>
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                                    <span className="text-xs text-red-600">EK: {eur((h.tage || 0) * (h.ek_preis || 0))}</span>
                                    <span className="text-xs text-green-600">VK: {eur((h.tage || 0) * (h.vk_preis || 0))}</span>
                                </div>
                            </div>
                        ))
                    )}

                    {/* =========== BNK / DIESEL TAB =========== */}
                    {activeTab === 'bnk' && (
                        bnkCosts.length === 0 ? <EmptyState label="Keine Diesel / BNK-Einträge" /> : bnkCosts.map(b => (
                            <div key={b.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                                <p className="text-sm font-medium text-slate-700">{b.beschreibung || 'Diesel'}</p>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 mt-1 inline-block">Menge: {b.menge || 0}</span>
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                                    <span className="text-xs text-red-600">EK: {eur((b.menge || 0) * (b.ek_preis || 0))}</span>
                                    <span className="text-xs text-green-600">VK: {eur((b.menge || 0) * (b.vk_preis || 0))}</span>
                                </div>
                            </div>
                        ))
                    )}

                    {/* =========== ERLÖSE TAB =========== */}
                    {activeTab === 'revenue' && (
                        revenue.length === 0 ? <EmptyState label="Keine Erlöse" /> : revenue.map(r => (
                            <div key={r.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-700">{r.position_label || '—'}</p>
                                    <p className="text-xs text-slate-400">{r.qty} {r.unit} × {eur(r.unit_price)}</p>
                                </div>
                                <span className="text-sm font-semibold text-green-600">{eur(r.line_total)}</span>
                            </div>
                        ))
                    )}

                    {/* =========== ÜBERSICHT TAB =========== */}
                    {activeTab === 'summary' && (
                        <div className="space-y-4">
                            {/* KPI Cards */}
                            <div className="grid grid-cols-2 gap-3">
                                <KpiCard label="Gesamtkosten" value={eur(totalCosts)} color="text-red-600" />
                                <KpiCard label="Gesamterlöse" value={eur(totalRevenue)} color="text-green-600" />
                                <KpiCard label="Marge" value={eur(margin)} color={margin >= 0 ? 'text-green-600' : 'text-red-600'} />
                                <KpiCard label="Marge %" value={`${marginPct.toFixed(1)}%`} color={marginPct >= 0 ? 'text-green-600' : 'text-red-600'} />
                            </div>

                            {/* Cost breakdown */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2">
                                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Kostenaufschlüsselung</h3>
                                <SummaryRow label="Personal" kostVal={personalKosten} />
                                <SummaryRow label="Material" kostVal={materialKosten} erloeVal={materialErloes} />
                                <SummaryRow label="Fahrzeuge" erloeVal={vehicleErloes} />
                                <SummaryRow label="Leistungen" kostVal={serviceKosten} erloeVal={serviceErloes} />
                                <SummaryRow label="HVZ" kostVal={hvzKosten} erloeVal={hvzErloes} />
                                <SummaryRow label="Diesel / BNK" kostVal={bnkKosten} erloeVal={bnkErloes} />
                                {extraKosten > 0 && <SummaryRow label="Sonderkosten" kostVal={extraKosten} />}
                                <SummaryRow label="Erlöse (manuell)" erloeVal={revenueTotal} />
                                {discountTotal > 0 && (
                                    <div className="flex items-center justify-between py-1.5 border-t border-slate-100">
                                        <span className="text-xs text-slate-600">Rabatte</span>
                                        <span className="text-xs font-semibold text-orange-600">−{eur(discountTotal)}</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between pt-2 border-t-2 border-slate-300">
                                    <span className="text-sm font-bold text-slate-800">Ergebnis</span>
                                    <span className={cn('text-sm font-bold', margin >= 0 ? 'text-green-600' : 'text-red-600')}>{eur(margin)}</span>
                                </div>
                            </div>

                            {/* Totals row at bottom */}
                            {personnel.length > 0 && (
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-1">
                                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Personal Zusammenfassung</h3>
                                    <div className="flex justify-between text-xs text-slate-600">
                                        <span>Einträge</span><span className="font-semibold">{personnel.length}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-600">
                                        <span>LiS Stunden gesamt</span><span className="font-semibold">{personnel.reduce((s, p) => s + p.lis_stunden, 0).toFixed(2)}h</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-600">
                                        <span>Kunden Stunden gesamt</span><span className="font-semibold">{personnel.reduce((s, p) => s + p.kunden_stunden, 0).toFixed(2)}h</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ---- Helper components ----
function EmptyState({ label }: { label: string }) {
    return (
        <div className="text-center py-16 text-slate-400 bg-white rounded-xl border-2 border-dashed border-slate-200">
            <p className="text-sm">{label}</p>
        </div>
    );
}

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 text-center">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
            <p className={cn('text-lg font-bold mt-0.5', color)}>{value}</p>
        </div>
    );
}

function SummaryRow({ label, kostVal, erloeVal }: { label: string; kostVal?: number; erloeVal?: number }) {
    return (
        <div className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
            <span className="text-xs text-slate-600">{label}</span>
            <div className="flex items-center gap-3">
                {kostVal !== undefined && kostVal > 0 && <span className="text-xs font-semibold text-red-600">{eur(kostVal)}</span>}
                {erloeVal !== undefined && erloeVal > 0 && <span className="text-xs font-semibold text-green-600">{eur(erloeVal)}</span>}
                {(kostVal === undefined || kostVal === 0) && (erloeVal === undefined || erloeVal === 0) && <span className="text-xs text-slate-300">—</span>}
            </div>
        </div>
    );
}

function formatDate(dateStr: string): string {
    try {
        return new Date(dateStr).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return dateStr;
    }
}
