'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from '@/components/ui/toast';
import { format } from 'date-fns';
import {
    Calculator, ChevronDown, Users, Truck, Package, Wrench,
    TrendingUp, DollarSign, Loader2, Plus, Trash2, Save, FileText, X, Pencil,
    AlertCircle, Percent, Search, Calendar, ChevronLeft, ChevronRight, ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Project = Database['public']['Tables']['t_projects']['Row'];

interface TimePairWithRate {
    pair_id: string; datum: string; mitarbeiter: string; role: string | null;
    lis_von: string | null; lis_bis: string | null; kunde_von: string | null; kunde_bis: string | null;
    pause_min: number; lis_stunden: number; kunden_stunden: number; satz: number; kosten: number;
}
interface MaterialRow {
    id: string; material_id: string; material_name: string; unit: string;
    quantity: number; cost_per_unit: number; price_per_unit: number; total_cost: number; total_price: number;
    isNew?: boolean;
}
interface VehicleCostRow {
    id: string; vehicle_id: string; fahrzeug: string; usage_type: string;
    usage_value: number; cost_per_unit: number; total_cost: number; notes: string;
    isNew?: boolean;
}
type ServiceCostRow = {
    id?: string;
    service_id?: string;
    service_name: string;
    supplier: string;
    quantity: number;
    unit: string;
    cost_per_unit: number;
    total_cost: number;
    price_per_unit?: number;
    total_price?: number;
    isNew?: boolean;
};
interface RevenueRow {
    id: string; position_label: string; qty: number; unit: string;
    unit_price: number; line_total: number; kind: string; isNew?: boolean;
}
interface DiscountRow {
    id: string; mode: string; description: string; value: number; isNew?: boolean;
}
interface HvzCostRow {
    id: string; datum_von: string | null; datum_bis: string | null; tage: number | null;
    ek_preis: number; vk_preis: number; isNew?: boolean;
}
interface BnkCostRow {
    id: string; beschreibung: string | null; menge: number | null;
    ek_preis: number; vk_preis: number; isNew?: boolean;
}

function calcHours(von: string | null, bis: string | null, pauseMin: number = 0): number {
    if (!von || !bis) return 0;
    const [vh, vm] = von.split(':').map(Number);
    const [bh, bm] = bis.split(':').map(Number);
    const totalMin = (bh * 60 + bm) - (vh * 60 + vm) - pauseMin;
    return totalMin > 0 ? +(totalMin / 60).toFixed(2) : 0;
}
function eur(n: number) { return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }); }

export default function CalculationPage() {
    const { toast } = useToast();
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(false);
    const [isKvMode, setIsKvMode] = useState(false);
    // Multi-select mode
    const [multiSelectMode, setMultiSelectMode] = useState(false);
    const [checkedProjectIds, setCheckedProjectIds] = useState<Set<string>>(new Set());
    const [mergedProjectNames, setMergedProjectNames] = useState<string[]>([]);

    const [personnel, setPersonnel] = useState<TimePairWithRate[]>([]);
    const [materials, setMaterials] = useState<MaterialRow[]>([]);
    const [vehicles, setVehicles] = useState<VehicleCostRow[]>([]);
    const [services, setServices] = useState<ServiceCostRow[]>([]);
    const [revenue, setRevenue] = useState<RevenueRow[]>([]);
    const [extraCosts, setExtraCosts] = useState<{ cost_id: string; cost_type: string; description: string; cost: number; isNew?: boolean }[]>([]);
    const [discounts, setDiscounts] = useState<DiscountRow[]>([]);
    const [hvzCosts, setHvzCosts] = useState<HvzCostRow[]>([]);
    const [bnkCosts, setBnkCosts] = useState<BnkCostRow[]>([]);

    // Catalog data for modals
    const [materialCatalog, setMaterialCatalog] = useState<any[]>([]);
    const [vehicleCatalog, setVehicleCatalog] = useState<any[]>([]);
    const [serviceCatalog, setServiceCatalog] = useState<any[]>([]);

    // Add modals
    const [addMatModal, setAddMatModal] = useState(false);
    const [addMatForm, setAddMatForm] = useState({ material_id: '', quantity: 0 });
    const [addVehModal, setAddVehModal] = useState(false);
    const [addVehForm, setAddVehForm] = useState({ vehicle_id: '', usage_type: 'km', usage_value: 0, cost_per_unit: 0, notes: '' });
    const [addExtraModal, setAddExtraModal] = useState(false);
    const [addExtraForm, setAddExtraForm] = useState({ cost_type: 'Sonstiges', description: '', cost: 0 });
    const [addSvcModal, setAddSvcModal] = useState(false);
    const [addSvcForm, setAddSvcForm] = useState({ service_id: '', quantity: 0, unit: 'Std', cost_per_unit: 0, supplier: '' });
    const [addHvzModal, setAddHvzModal] = useState(false);
    const [addHvzForm, setAddHvzForm] = useState({ datum_von: '', datum_bis: '', tage: 0, ek_preis: 0, vk_preis: 0 });
    const [addBnkModal, setAddBnkModal] = useState(false);
    const [addBnkForm, setAddBnkForm] = useState({ beschreibung: 'Diesel', menge: 0, ek_preis: 0, vk_preis: 0 });

    // Layout Order State
    const [containerOrder, setContainerOrder] = useState<string[]>(['personnel', 'material', 'vehicle', 'hvz', 'bnk', 'service', 'extra', 'revenue']);
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        const saved = localStorage.getItem('calculationLayoutOrder');
        if (saved) {
            try {
                // simple validation to ensure no arrays with missing modules
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length >= 8) {
                    setContainerOrder(parsed);
                }
            } catch (e) {
                // ignore and use default
            }
        }
    }, []);

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setContainerOrder((items) => {
                const oldIndex = items.indexOf(active.id);
                const newIndex = items.indexOf(over.id);
                const newOrder = arrayMove(items, oldIndex, newIndex);
                localStorage.setItem('calculationLayoutOrder', JSON.stringify(newOrder));
                return newOrder;
            });
        }
    };

    // Cost basis toggle: 'lis' or 'kd' (global default)
    const [costBasis, setCostBasis] = useState<'lis' | 'kd'>('lis');
    // Per-row overrides: pair_id -> 'lis' | 'kd'
    const [perRowBasis, setPerRowBasis] = useState<Record<string, 'lis' | 'kd'>>({});
    const getRowBasis = (pairId: string): 'lis' | 'kd' => perRowBasis[pairId] || costBasis;
    const toggleRowBasis = (pairId: string) => {
        setPerRowBasis(prev => {
            const current = prev[pairId] || costBasis;
            return { ...prev, [pairId]: current === 'lis' ? 'kd' : 'lis' };
        });
    };
    const setGlobalBasis = (basis: 'lis' | 'kd') => {
        setCostBasis(basis);
        setPerRowBasis({}); // reset all individual overrides
    };

    // Sidebar State
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [projectSearch, setProjectSearch] = useState('');
    const [projectFilterStart, setProjectFilterStart] = useState('');
    const [projectFilterEnd, setProjectFilterEnd] = useState('');
    const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

    const filteredProjects = useMemo(() => {
        let res = [...projects];
        // Sort by date desc (recent first)
        res.sort((a, b) => {
            const dateA = a.project_date ? new Date(a.project_date).getTime() : 0;
            const dateB = b.project_date ? new Date(b.project_date).getTime() : 0;
            // Descending order
            if (dateA === 0 && dateB === 0) return 0;
            if (dateA === 0) return 1;
            if (dateB === 0) return -1;
            return dateB - dateA;
        });

        if (projectSearch) {
            const low = projectSearch.toLowerCase();
            res = res.filter(p =>
                (p.name?.toLowerCase().includes(low)) ||
                (p.ort?.toLowerCase().includes(low)) ||
                (p.project_code?.toLowerCase().includes(low))
            );
        }
        if (projectFilterStart) {
            res = res.filter(p => p.project_date && p.project_date >= projectFilterStart);
        }
        if (projectFilterEnd) {
            res = res.filter(p => p.project_date && p.project_date <= projectFilterEnd);
        }
        return res;
    }, [projects, projectSearch, projectFilterStart, projectFilterEnd]);

    // Group projects by Month (e.g., "März 2026")
    const groupedProjects = useMemo(() => {
        const groups: Record<string, typeof filteredProjects> = {};
        filteredProjects.forEach(p => {
            const dateStr = p.project_date ? new Date(p.project_date).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }) : 'Ohne Datum';
            if (!groups[dateStr]) groups[dateStr] = [];
            groups[dateStr].push(p);
        });
        return groups;
    }, [filteredProjects]);

    const toggleMonthExpanded = (monthKey: string) => {
        setExpandedMonths(prev => ({ ...prev, [monthKey]: !prev[monthKey] }));
    };

    useEffect(() => {
        (async () => {
            const [projRes, matRes, vehRes, svcRes] = await Promise.all([
                supabase.from('t_projects').select('*').order('created_at', { ascending: false }),
                supabase.from('t_materials').select('*, prices:t_material_prices(cost_per_unit, price_per_unit)').eq('is_active', true).order('name'),
                supabase.from('t_vehicles').select('*').eq('is_deleted', false).order('nickname'),
                supabase.from('t_services').select('*, prices:t_service_prices(*)').eq('is_active', true).order('name'),
            ]);
            setProjects(projRes.data || []);
            setMaterialCatalog(matRes.data || []);
            setVehicleCatalog(vehRes.data || []);
            setServiceCatalog(svcRes.data || []);
        })();
    }, []);

    useEffect(() => {
        if (multiSelectMode) return; // don't auto-load in multi-select mode
        if (!selectedProjectId) {
            setSelectedProject(null); setPersonnel([]); setMaterials([]); setVehicles([]); setServices([]); setRevenue([]); setExtraCosts([]); setDiscounts([]);
            return;
        }
        setMergedProjectNames([]);
        loadProjectData([selectedProjectId]);
    }, [selectedProjectId]);

    const toggleChecked = (pid: string) => {
        setCheckedProjectIds(prev => {
            const next = new Set(prev);
            if (next.has(pid)) next.delete(pid); else next.add(pid);
            return next;
        });
    };

    const loadMergedProjects = () => {
        const ids = Array.from(checkedProjectIds);
        if (ids.length === 0) return;
        const names = ids.map(id => projects.find(p => p.project_id === id)?.name || 'Unbenannt');
        setMergedProjectNames(names);
        // Use first project as the "selected" for header display
        const first = projects.find(p => p.project_id === ids[0]) || null;
        setSelectedProject(first);
        setSelectedProjectId(ids[0]);
        loadProjectData(ids);
    };

    const loadProjectData = async (pids: string[]) => {
        setLoading(true);
        const proj = projects.find(p => p.project_id === pids[0]) || null;
        if (proj) setSelectedProject(proj);



        const { data: employees } = await supabase.from('t_employees').select('employee_id, name, hourly_rate, role');
        const rateMap: Record<string, { rate: number; role: string | null }> = {};
        (employees || []).forEach(e => { rateMap[e.name] = { rate: e.hourly_rate || 0, role: e.role }; });

        const allResults = await Promise.all(pids.map(pid => Promise.all([
            supabase.from('t_time_pairs').select('*').eq('project_id', pid).order('datum'),
            supabase.from('t_project_material_usage').select('*, material:t_materials(name, unit, prices:t_material_prices(cost_per_unit, price_per_unit))').eq('project_id', pid),
            supabase.from('t_project_vehicle_costs').select('*, vehicle:t_vehicles(nickname)').eq('project_id', pid),
            supabase.from('t_project_service_usage').select('*, service:t_services(name, default_unit, prices:t_service_prices(cost_per_unit, customer_price_per_unit, supplier))').eq('project_id', pid),
            supabase.from('t_project_revenue_items').select('*').eq('project_id', pid).order('sort_order'),
            supabase.from('t_project_costs_extra').select('*').eq('project_id', pid),
            supabase.from('t_project_discounts').select('*').eq('project_id', pid),
            supabase.from('t_project_hvz_costs').select('*').eq('project_id', pid),
            supabase.from('t_project_bnk_costs').select('*').eq('project_id', pid),
        ])));

        // Merge all results
        const tpData = allResults.flatMap(r => r[0].data || []);
        const matData = allResults.flatMap(r => r[1].data || []);
        const vehData = allResults.flatMap(r => r[2].data || []);
        const svcData = allResults.flatMap(r => r[3].data || []);
        const revData = allResults.flatMap(r => r[4].data || []);
        const extData = allResults.flatMap(r => r[5].data || []);
        const discData = allResults.flatMap(r => r[6].data || []);
        const hvzData = allResults.flatMap(r => r[7].data || []);
        const bnkData = allResults.flatMap(r => r[8].data || []);

        setPersonnel(tpData.filter(tp => tp.pause !== 'deleted').map(tp => {
            const lisH = calcHours(tp.lis_von, tp.lis_bis, tp.pause_min || 0);
            const kdH = calcHours(tp.kunde_von, tp.kunde_bis);
            const satz = rateMap[tp.mitarbeiter]?.rate || 0;
            return {
                pair_id: tp.pair_id, datum: tp.datum, mitarbeiter: tp.mitarbeiter, role: rateMap[tp.mitarbeiter]?.role || null,
                lis_von: tp.lis_von, lis_bis: tp.lis_bis, kunde_von: tp.kunde_von, kunde_bis: tp.kunde_bis,
                pause_min: tp.pause_min || 0, lis_stunden: lisH, kunden_stunden: kdH, satz, kosten: 0
            };
        }));

        setMaterials((matData as any || []).map((m: any) => {
            const p = Array.isArray(m.material?.prices) ? m.material.prices[0] : m.material?.prices;
            return {
                id: m.id, material_id: m.material_id, material_name: m.material?.name || m.material_id, unit: m.material?.unit || '',
                quantity: m.quantity, cost_per_unit: p?.cost_per_unit || 0, price_per_unit: p?.price_per_unit || 0,
                total_cost: +(m.quantity * (p?.cost_per_unit || 0)).toFixed(2), total_price: +(m.quantity * (p?.price_per_unit || 0)).toFixed(2)
            };
        }));

        setVehicles((vehData as any || []).map((v: any) => ({
            id: v.id, vehicle_id: v.vehicle_id, fahrzeug: v.vehicle?.nickname || v.vehicle_id, usage_type: v.usage_type || 'km',
            usage_value: v.usage_value || 0, cost_per_unit: v.cost_per_unit || 0,
            total_cost: v.total_cost || +(v.usage_value * (v.cost_per_unit || 0)).toFixed(2), notes: v.notes || '',
        })));

        setServices((svcData as any || []).map((s: any) => {
            const p = Array.isArray(s.service?.prices) ? s.service.prices[0] : s.service?.prices;
            return {
                id: s.id, service_id: s.service_id, service_name: s.service?.name || s.service_id, supplier: s.supplier || p?.supplier || '',
                quantity: s.quantity || 1, unit: s.service?.default_unit || 'Std', cost_per_unit: p?.cost_per_unit || 0,
                total_cost: +((s.quantity || 1) * (p?.cost_per_unit || 0)).toFixed(2),
                price_per_unit: p?.customer_price_per_unit || p?.cost_per_unit || 0,
                total_price: +((s.quantity || 1) * (p?.customer_price_per_unit || p?.cost_per_unit || 0)).toFixed(2)
            };
        }));

        setRevenue(revData.map((r: any) => ({
            id: r.id, position_label: r.position_label, qty: r.qty, unit: r.unit || '',
            unit_price: r.unit_price, line_total: r.line_total || +(r.qty * r.unit_price).toFixed(2), kind: r.kind
        })));

        setExtraCosts(extData.map((e: any) => ({ cost_id: e.cost_id, cost_type: e.cost_type, description: e.description || '', cost: e.cost })));
        setDiscounts(discData.map((d: any) => ({ id: d.id, mode: d.mode || 'flat', description: d.description || '', value: d.value || 0 })));
        setHvzCosts(hvzData.map((h: any) => ({ id: h.id, datum_von: h.datum_von, datum_bis: h.datum_bis, tage: h.tage, ek_preis: h.ek_preis, vk_preis: h.vk_preis })));
        setBnkCosts(bnkData.map((b: any) => ({ id: b.id, beschreibung: b.beschreibung, menge: b.menge, ek_preis: b.ek_preis, vk_preis: b.vk_preis })));
        setLoading(false);
    };

    // Recalculate personnel costs based on per-row or global costBasis
    const adjustedPersonnel = useMemo(() => personnel.map(p => {
        const basis = perRowBasis[p.pair_id] || costBasis;
        return {
            ...p,
            _basis: basis,
            kosten: +((basis === 'lis' ? p.lis_stunden : p.kunden_stunden) * p.satz).toFixed(2)
        };
    }), [personnel, costBasis, perRowBasis]);
    // Calculations
    const personalKosten = useMemo(() => adjustedPersonnel.reduce((s, p) => s + p.kosten, 0), [adjustedPersonnel]);
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
        const mode = d.mode || 'flat';
        if (mode === 'percent') return s + (baseRevenue * ((d.value || 0) / 100)); // Apply % to revenue
        return s + (d.value || 0);
    }, 0), [discounts, baseRevenue]);
    const totalRevenue = baseRevenue - discountTotal;
    const margin = totalRevenue - totalCosts;
    const marginPct = totalRevenue > 0 ? (margin / totalRevenue) * 100 : 0;

    // ---- MATERIAL CRUD ----
    const addMaterial = async () => {
        if (!addMatForm.material_id || !selectedProjectId) return;
        try {
            const { error } = await supabase.from('t_project_material_usage').insert({ project_id: selectedProjectId, material_id: addMatForm.material_id, quantity: addMatForm.quantity });
            if (error) throw error;
            setAddMatModal(false);
            toast('Material hinzugefügt');
            loadProjectData([selectedProjectId]);
        } catch { toast('Fehler beim Hinzufügen', 'error'); }
    };
    const updateMaterialQty = (id: string, qty: number) => {
        setMaterials(prev => prev.map(m => m.id === id ? { ...m, quantity: qty, total_cost: +(qty * m.cost_per_unit).toFixed(2), total_price: +(qty * m.price_per_unit).toFixed(2) } : m));
    };
    const saveMaterials = async () => {
        try {
            await Promise.all(materials.filter(m => !m.isNew).map(m =>
                supabase.from('t_project_material_usage').update({ quantity: m.quantity }).eq('id', m.id)
            ));
            toast('Materialmengen gespeichert');
            loadProjectData([selectedProjectId]);
        } catch { toast('Fehler beim Speichern', 'error'); }
    };
    const deleteMaterial = async (id: string) => {
        setMaterials(prev => prev.filter(m => m.id !== id));
        const { error } = await supabase.from('t_project_material_usage').delete().eq('id', id);
        if (error) { toast('Fehler beim Löschen', 'error'); loadProjectData([selectedProjectId]); }
    };

    // ---- VEHICLE COST CRUD ----
    const addVehicleCost = async () => {
        if (!addVehForm.vehicle_id || !selectedProjectId) return;
        try {
            const vehicleExists = vehicleCatalog.some(v => v.vehicle_id === addVehForm.vehicle_id);
            if (!vehicleExists) {
                const { error: vehError } = await supabase.from('t_vehicles').insert({ vehicle_id: addVehForm.vehicle_id, nickname: addVehForm.vehicle_id, status: 'bereit' });
                if (vehError && vehError.code !== '23505') throw vehError;
                setVehicleCatalog(prev => [...prev, { vehicle_id: addVehForm.vehicle_id, nickname: addVehForm.vehicle_id }]);
            }

            const total = +(addVehForm.usage_value * addVehForm.cost_per_unit).toFixed(2);
            const { error } = await supabase.from('t_project_vehicle_costs').insert({
                project_id: selectedProjectId, vehicle_id: addVehForm.vehicle_id, usage_type: addVehForm.usage_type,
                usage_value: addVehForm.usage_value, cost_per_unit: addVehForm.cost_per_unit, total_cost: total, notes: addVehForm.notes || null,
            });
            if (error) throw error;
            setAddVehModal(false);
            toast('Fahrzeugkosten hinzugefügt');
            loadProjectData([selectedProjectId]);
        } catch { toast('Fehler beim Hinzufügen', 'error'); }
    };
    const updateVehicleCost = (id: string, field: string, value: any) => {
        setVehicles(prev => prev.map(v => {
            if (v.id !== id) return v;
            const updated = { ...v, [field]: value };
            updated.total_cost = +(updated.usage_value * updated.cost_per_unit).toFixed(2);
            return updated;
        }));
    };
    const saveVehicleCosts = async () => {
        try {
            await Promise.all(vehicles.map(v =>
                supabase.from('t_project_vehicle_costs').update({ usage_type: v.usage_type, usage_value: v.usage_value, cost_per_unit: v.cost_per_unit, total_cost: v.total_cost, notes: v.notes }).eq('id', v.id)
            ));
            toast('Fahrzeugkosten gespeichert');
            loadProjectData([selectedProjectId]);
        } catch { toast('Fehler beim Speichern', 'error'); }
    };
    const deleteVehicleCost = async (id: string) => {
        setVehicles(prev => prev.filter(v => v.id !== id));
        const { error } = await supabase.from('t_project_vehicle_costs').delete().eq('id', id);
        if (error) { toast('Fehler beim Löschen', 'error'); loadProjectData([selectedProjectId]); }
    };

    // ---- SERVICE COST CRUD ----
    const addServiceCost = async () => {
        if (!addSvcForm.service_id || !selectedProjectId) return;
        try {
            const { error } = await supabase.from('t_project_service_usage').insert({
                project_id: selectedProjectId, service_id: addSvcForm.service_id,
                quantity: addSvcForm.quantity, supplier: addSvcForm.supplier || null,
            });
            if (error) throw error;
            setAddSvcModal(false);
            toast('Leistung hinzugefügt');
            loadProjectData([selectedProjectId]);
        } catch { toast('Fehler beim Hinzufügen', 'error'); }
    };
    const deleteServiceCost = async (id: string) => {
        setServices(prev => prev.filter(s => s.id !== id));
        const { error } = await supabase.from('t_project_service_usage').delete().eq('id', id);
        if (error) { toast('Fehler beim Löschen', 'error'); loadProjectData([selectedProjectId]); }
    };

    // ---- EXTRA COSTS CRUD ----
    const addExtraCost = async () => {
        if (!selectedProjectId || !addExtraForm.description) return;
        try {
            const { error } = await supabase.from('t_project_costs_extra').insert({
                project_id: selectedProjectId, cost_type: addExtraForm.cost_type,
                description: addExtraForm.description, cost: addExtraForm.cost,
            });
            if (error) throw error;
            setAddExtraModal(false);
            toast('Sonderkosten hinzugefügt');
            loadProjectData([selectedProjectId]);
        } catch { toast('Fehler beim Hinzufügen', 'error'); }
    };
    const updateExtraCost = (costId: string, field: string, value: any) => {
        setExtraCosts(prev => prev.map(e => e.cost_id === costId ? { ...e, [field]: value } : e));
    };
    const saveExtraCosts = async () => {
        try {
            await Promise.all(extraCosts.map(e =>
                supabase.from('t_project_costs_extra').update({ cost_type: e.cost_type, description: e.description, cost: e.cost }).eq('cost_id', e.cost_id)
            ));
            toast('Sonderkosten gespeichert');
            loadProjectData([selectedProjectId]);
        } catch { toast('Fehler beim Speichern', 'error'); }
    };
    const deleteExtraCost = async (costId: string) => {
        setExtraCosts(prev => prev.filter(e => e.cost_id !== costId));
        const { error } = await supabase.from('t_project_costs_extra').delete().eq('cost_id', costId);
        if (error) { toast('Fehler beim Löschen', 'error'); loadProjectData([selectedProjectId]); }
    };

    // ---- DISCOUNT CRUD ----
    const addDiscountRow = () => {
        setDiscounts(prev => [...prev, { id: `temp-${Date.now()}`, mode: 'flat', description: '', value: 0, isNew: true } as any]);
    };
    const updateDiscount = (id: string, field: string, value: any) => {
        setDiscounts(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
    };
    const saveDiscounts = async () => {
        if (!selectedProjectId) return;
        try {
            await Promise.all(discounts.map((d: any) => {
                const record = { project_id: selectedProjectId, mode: d.mode || 'flat', description: d.description || '', value: d.value, target: 'total' };
                const currentId = d.id;
                return d.isNew || currentId.startsWith('temp-')
                    ? supabase.from('t_project_discounts').insert(record)
                    : supabase.from('t_project_discounts').update(record).eq('id', currentId);
            }));
            toast('Rabatte gespeichert');
            loadProjectData([selectedProjectId]);
        } catch { toast('Fehler beim Speichern', 'error'); }
    };
    const deleteDiscount = async (id: string) => {
        if (id.startsWith('temp-')) { setDiscounts(prev => prev.filter(d => d.id !== id)); return; }
        setDiscounts(prev => prev.filter(d => d.id !== id));
        const { error } = await supabase.from('t_project_discounts').delete().eq('id', id);
        if (error) { toast('Fehler beim Löschen', 'error'); loadProjectData([selectedProjectId]); }
    };

    // ---- HVZ CRUD ----
    const addHvzCost = async () => {
        if (!selectedProjectId) return;
        try {
            const { error } = await supabase.from('t_project_hvz_costs').insert({
                project_id: selectedProjectId, datum_von: addHvzForm.datum_von || null, datum_bis: addHvzForm.datum_bis || null,
                tage: addHvzForm.tage || null, ek_preis: addHvzForm.ek_preis, vk_preis: addHvzForm.vk_preis
            });
            if (error) throw error;
            setAddHvzModal(false);
            toast('HVZ hinzugefügt');
            loadProjectData([selectedProjectId]);
        } catch { toast('Fehler beim Hinzufügen', 'error'); }
    };
    const deleteHvzCost = async (id: string) => {
        setHvzCosts(prev => prev.filter(h => h.id !== id));
        const { error } = await supabase.from('t_project_hvz_costs').delete().eq('id', id);
        if (error) { toast('Fehler beim Löschen', 'error'); loadProjectData([selectedProjectId]); }
    };

    // ---- BNK CRUD ----
    const addBnkCost = async () => {
        if (!selectedProjectId) return;
        try {
            const { error } = await supabase.from('t_project_bnk_costs').insert({
                project_id: selectedProjectId, beschreibung: addBnkForm.beschreibung || null, menge: addBnkForm.menge || null,
                ek_preis: addBnkForm.ek_preis, vk_preis: addBnkForm.vk_preis
            });
            if (error) throw error;
            setAddBnkModal(false);
            toast('Diesel (BNK) hinzugefügt');
            loadProjectData([selectedProjectId]);
        } catch { toast('Fehler beim Hinzufügen', 'error'); }
    };
    const deleteBnkCost = async (id: string) => {
        setBnkCosts(prev => prev.filter(b => b.id !== id));
        const { error } = await supabase.from('t_project_bnk_costs').delete().eq('id', id);
        if (error) { toast('Fehler beim Löschen', 'error'); loadProjectData([selectedProjectId]); }
    };

    // ---- REVENUE CRUD ----
    const addRevenueRow = () => { setRevenue(prev => [...prev, { id: `temp-${Date.now()}`, position_label: '', qty: 0, unit: 'Std', unit_price: 0, line_total: 0, kind: 'manual', isNew: true }]); };
    const updateRevenue = (id: string, field: keyof RevenueRow, value: any) => {
        setRevenue(prev => prev.map(r => {
            if (r.id !== id) return r;
            const updated = { ...r, [field]: value };
            if (field === 'qty' || field === 'unit_price') updated.line_total = +((updated.qty || 0) * (updated.unit_price || 0)).toFixed(2);
            return updated;
        }));
    };
    const saveRevenue = async () => {
        if (!selectedProjectId) return;
        try {
            await Promise.all(revenue.map(r => {
                const record = { project_id: selectedProjectId, position_label: r.position_label, qty: r.qty, unit: r.unit, unit_price: r.unit_price, line_total: r.line_total, kind: r.kind };
                return r.isNew || r.id.startsWith('temp-')
                    ? supabase.from('t_project_revenue_items').insert(record)
                    : supabase.from('t_project_revenue_items').update(record).eq('id', r.id);
            }));
            toast('Erlöse gespeichert');
            loadProjectData([selectedProjectId]);
        } catch { toast('Fehler beim Speichern', 'error'); }
    };
    const deleteRevenue = async (id: string) => {
        if (id.startsWith('temp-')) { setRevenue(prev => prev.filter(r => r.id !== id)); return; }
        setRevenue(prev => prev.filter(r => r.id !== id));
        const { error } = await supabase.from('t_project_revenue_items').delete().eq('id', id);
        if (error) { toast('Fehler beim Löschen', 'error'); loadProjectData([selectedProjectId]); }
    };

    // ---- EXPORT ----
    const exportHTML = () => {
        const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>Nachkalkulation – ${selectedProject?.name || ''}</title>
        <style>body{font-family:system-ui;margin:2rem;color:#1e293b}h1{font-size:1.5rem}h2{margin-top:1.5rem;font-size:1.1rem;border-bottom:2px solid #e2e8f0;padding-bottom:4px}table{width:100%;border-collapse:collapse;margin:.5rem 0}th,td{border:1px solid #e2e8f0;padding:6px 10px;text-align:left;font-size:.8rem}th{background:#f1f5f9;font-weight:600}.right{text-align:right}.kpi{display:flex;gap:1rem;margin:1rem 0}.kpi-card{flex:1;border:1px solid #e2e8f0;border-radius:8px;padding:.75rem;text-align:center}.kpi-label{font-size:.7rem;color:#64748b;text-transform:uppercase}.kpi-value{font-size:1.3rem;font-weight:700;margin-top:2px}.positive{color:#16a34a}.negative{color:#dc2626}</style></head><body>
        <h1>Nachkalkulation: ${selectedProject?.anrede || ''} ${selectedProject?.name || ''}</h1>
        <p>${selectedProject?.strasse || ''} ${selectedProject?.nr || ''}, ${selectedProject?.plz || ''} ${selectedProject?.ort || ''}</p>
        <p><strong>Projektdatum:</strong> ${selectedProject?.project_date ? new Date(selectedProject.project_date).toLocaleDateString('de-DE') : '—'}</p>
        <div class="kpi"><div class="kpi-card"><div class="kpi-label">Gesamtkosten</div><div class="kpi-value">${eur(totalCosts)}</div></div>
        <div class="kpi-card"><div class="kpi-label">Gesamterlöse</div><div class="kpi-value">${eur(totalRevenue)}</div></div>
        <div class="kpi-card"><div class="kpi-label">Marge</div><div class="kpi-value ${margin >= 0 ? 'positive' : 'negative'}">${eur(margin)}</div></div>
        <div class="kpi-card"><div class="kpi-label">Marge %</div><div class="kpi-value ${marginPct >= 0 ? 'positive' : 'negative'}">${marginPct.toFixed(1)}%</div></div></div>
        <h2>1. Personalkosten (${eur(personalKosten)})</h2><table><tr><th>Datum</th><th>Mitarbeiter</th><th>LiS Std.</th><th>Kd Std.</th><th>Basis</th><th class="right">Satz</th><th class="right">Kosten</th></tr>
        ${adjustedPersonnel.map((p: any) => { const b = p._basis || costBasis; return `<tr><td>${p.datum}</td><td>${p.mitarbeiter}</td><td style="${b === 'lis' ? 'font-weight:700;color:#1d4ed8' : 'color:#94a3b8'}">${p.lis_stunden.toFixed(2)}</td><td style="${b === 'kd' ? 'font-weight:700;color:#15803d' : 'color:#94a3b8'}">${p.kunden_stunden.toFixed(2)}</td><td style="text-align:center"><span style="background:${b === 'lis' ? '#dbeafe;color:#1d4ed8' : '#dcfce7;color:#15803d'};padding:2px 8px;border-radius:10px;font-size:0.7rem;font-weight:600">${b === 'lis' ? 'LiS' : 'Kd'}</span></td><td class="right">${eur(p.satz)}</td><td class="right">${eur(p.kosten)}</td></tr>`; }).join('')}
        <tr><th colspan="6">Summe</th><th class="right">${eur(personalKosten)}</th></tr></table>
        <h2>2. Material (${eur(materialKosten)})</h2><table><tr><th>Material</th><th>Menge</th><th>Einheit</th><th class="right">EK</th><th class="right">VK</th><th class="right">Kosten</th><th class="right">Erlöse</th></tr>
        ${materials.map(m => `<tr><td>${m.material_name}</td><td>${m.quantity}</td><td>${m.unit}</td><td class="right">${eur(m.cost_per_unit)}</td><td class="right">${eur(m.price_per_unit)}</td><td class="right">${eur(m.total_cost)}</td><td class="right">${eur(m.total_price)}</td></tr>`).join('')}
        <tr><th colspan="5">Summe</th><th class="right">${eur(materialKosten)}</th><th class="right">${eur(materialErloes)}</th></tr></table>
        <h2>3. Fahrzeug (${eur(vehicleErloes)})</h2><table><tr><th>Fahrzeug</th><th>Typ</th><th>Wert</th><th class="right">Satz</th><th class="right">Erlöse</th></tr>
        ${vehicles.map(v => `<tr><td>${v.fahrzeug}</td><td>${v.usage_type}</td><td>${v.usage_value}</td><td class="right">${eur(v.cost_per_unit)}</td><td class="right">${eur(v.total_cost)}</td></tr>`).join('')}
        <tr><th colspan="4">Summe Erlöse</th><th class="right">${eur(vehicleErloes)}</th></tr></table>
        <h2>HVZ (EK: ${eur(hvzKosten)} / VK: ${eur(hvzErloes)})</h2><table><tr><th>Von</th><th>Bis</th><th>Tage</th><th class="right">EK</th><th class="right">VK</th></tr>
        ${hvzCosts.map(h => `<tr><td>${h.datum_von ? new Date(h.datum_von).toLocaleDateString('de-DE') : '—'}</td><td>${h.datum_bis ? new Date(h.datum_bis).toLocaleDateString('de-DE') : '—'}</td><td>${h.tage || '—'}</td><td class="right">${eur(h.ek_preis)}</td><td class="right">${eur(h.vk_preis)}</td></tr>`).join('')}
        <tr><th colspan="3">Summe</th><th class="right">${eur(hvzKosten)}</th><th class="right">${eur(hvzErloes)}</th></tr></table>
        <h2>Diesel / BNK (EK: ${eur(bnkKosten)} / VK: ${eur(bnkErloes)})</h2><table><tr><th>Beschreibung</th><th>Menge</th><th class="right">EK</th><th class="right">VK</th></tr>
        ${bnkCosts.map(b => `<tr><td>${b.beschreibung || '—'}</td><td>${b.menge || '—'}</td><td class="right">${eur(b.ek_preis)}</td><td class="right">${eur(b.vk_preis)}</td></tr>`).join('')}
        <tr><th colspan="2">Summe</th><th class="right">${eur(bnkKosten)}</th><th class="right">${eur(bnkErloes)}</th></tr></table>
        <h2>4. Dienstleistungskosten (${eur(serviceKosten)})</h2><table><tr><th>Leistung</th><th>Lieferant</th><th>Menge</th><th class="right">EK</th><th class="right">Kosten</th></tr>
        ${services.map(s => `<tr><td>${s.service_name}</td><td>${s.supplier}</td><td>${s.quantity}</td><td class="right">${eur(s.cost_per_unit)}</td><td class="right">${eur(s.total_cost)}</td></tr>`).join('')}
        <tr><th colspan="4">Summe</th><th class="right">${eur(serviceKosten)}</th></tr></table>
        <h2>5. Sonderkosten (${eur(extraKosten)})</h2><table><tr><th>Typ</th><th>Beschreibung</th><th class="right">Betrag</th></tr>
        ${extraCosts.map(e => `<tr><td>${e.cost_type}</td><td>${e.description}</td><td class="right">${eur(e.cost)}</td></tr>`).join('')}
        <tr><th colspan="2">Summe</th><th class="right">${eur(extraKosten)}</th></tr></table>
        <h2>6. Rabatte / Nachlässe (${eur(discountTotal)})</h2><table><tr><th>Bezeichnung</th><th>Typ</th><th class="right">Wert</th><th class="right">Betrag</th></tr>
        ${discounts.map((d: any) => `<tr><td>${d.description || ''}</td><td>${d.mode === 'percent' ? 'Prozent' : 'Pauschal'}</td><td class="right">${d.mode === 'percent' ? `${d.value}%` : eur(d.value)}</td><td class="right">${eur(d.mode === 'percent' ? baseRevenue * (d.value / 100) : d.value)}</td></tr>`).join('')}
        <tr><th colspan="3">Summe Abzug</th><th class="right">${eur(discountTotal)}</th></tr></table>
        <h2>7. Erlöse Manuell (${eur(revenueTotal)})</h2><table><tr><th>Position</th><th>Menge</th><th>Einheit</th><th class="right">Preis</th><th class="right">Gesamt</th></tr>
        ${revenue.map(r => `<tr><td>${r.position_label}</td><td>${r.qty}</td><td>${r.unit}</td><td class="right">${eur(r.unit_price)}</td><td class="right">${eur(r.line_total)}</td></tr>`).join('')}
        <tr><th colspan="4">Summe Erlöse Manuell</th><th class="right">${eur(revenueTotal)}</th></tr></table>
        </body></html>`;
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `Nachkalkulation_${selectedProject?.name || 'Projekt'}.html`; a.click();
        URL.revokeObjectURL(url);
    };

    const exportAuftragsnachkalkulationHTML = async () => {
        // Prepare personnel grouping by rate (merge employees with same rate)
        const rateMap = new Map<number, { names: string[], std: number, satz: number, kosten: number }>();
        let gesamtStd = 0;
        adjustedPersonnel.forEach((p: any) => {
            const basis = p._basis || costBasis;
            const hours = basis === 'lis' ? p.lis_stunden : p.kunden_stunden;
            gesamtStd += hours;
            const existing = rateMap.get(p.satz) || { names: [] as string[], std: 0, satz: p.satz, kosten: 0 };
            if (!existing.names.includes(p.mitarbeiter)) existing.names.push(p.mitarbeiter);
            existing.std += hours;
            existing.kosten += p.kosten;
            rateMap.set(p.satz, existing);
        });

        // EVD, HVZ, LKW, Diesel, Sonstige
        let lkwKosten = 0, lkwErloes = 0;
        vehicles.forEach(v => {
            lkwErloes += v.total_cost;
            lkwKosten += (v.usage_value * (v.cost_per_unit || 0));
        });

        // Build dynamic EVD rows from services, grouped by supplier
        const evdLisMap = new Map<string, { service: string, qty: number, cost: number }[]>();
        const evdKundeMap = new Map<string, { service: string, qty: number, cost: number }[]>();
        services.forEach(s => {
            const supplier = s.supplier || 'Sonstige';
            if (!evdLisMap.has(supplier)) evdLisMap.set(supplier, []);
            evdLisMap.get(supplier)!.push({ service: s.service_name, qty: s.quantity || 1, cost: s.total_cost });
            if (!evdKundeMap.has(supplier)) evdKundeMap.set(supplier, []);
            evdKundeMap.get(supplier)!.push({ service: s.service_name, qty: s.quantity || 1, cost: s.total_price || s.total_cost });
        });

        const numFormat = (n: number) => n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

        const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>Auftragsnachkalkulation – ${selectedProject?.name || ''}</title>
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body { font-family: "Inter", -apple-system, sans-serif; font-size: 11px; margin: 20px; color: #1e293b; background: white; }
    h1 { font-size: 20px; text-align: center; margin-bottom: 25px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
    .header-grid { display: flex; gap: 30px; margin-bottom: 25px; }
    .header-grid > div:first-child { flex: 3; }
    .header-grid > div:last-child { flex: 2; }
    .field-row { display: flex; margin-bottom: 12px; align-items: flex-end; }
    .field-row .label { font-size: 10px; font-weight: 600; width: 130px; color: #475569; }
    .field-row .value { flex: 1; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; min-height: 18px; font-size: 12px; font-weight: 500; }
    .box { border: 1px solid #94a3b8; border-radius: 4px; padding: 10px; height: 90px; font-size: 10px; font-weight: 600; color: #475569; background: #f8fafc; }
    .box-content { font-weight: 400; font-size: 11px; color: #1e293b; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; border-radius: 4px; overflow: hidden; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 10px; }
    th { text-align: center; font-weight: 600; color: #334155; background-color: #f1f5f9; text-transform: uppercase; font-size: 10px; letter-spacing: 0.03em; }
    .bg-green { background-color: #86efac; color: #166534; border-color: #4ade80; }
    .text-orange { color: #ea580c; font-weight: 600; }
    .right { text-align: right; }
    .center { text-align: center; }
    .val-container { display: flex; justify-content: space-between; width: 100%; }
    .val-container .cur { color: #94a3b8; }
    .summary-table { width: 320px; margin-left: auto; margin-top: 30px; border-collapse: separate; border-spacing: 0 4px; }
    .summary-table td { border: none; padding: 6px 10px; background: #f8fafc; }
    .summary-table tr:last-child td { background: none; }
    .summary-table td.label { font-weight: 600; width: 60%; color: #475569; border-radius: 4px 0 0 4px; }
    .summary-table td.val { text-align: right; font-weight: 500; border-radius: 0 4px 4px 0; }
    .summary-table tr.total td.val { font-weight: 700; border-bottom: 2px solid #334155; border-radius: 0; background: transparent; }
    .flex-tables { display: flex; gap: 30px; margin-top: 25px; }
    .half-table { flex: 1; }
    .half-table-title { font-weight: 600; font-size: 11px; margin-bottom: 6px; color: #334155; text-transform: uppercase; letter-spacing: 0.03em; }
    .half-table table { width: 100%; }
    .half-table td { padding: 4px 8px; border-color: #e2e8f0; }
    .half-table td.label { color: #475569; font-weight: 500; }
</style>
</head><body>
    <h1>Auftragsnachkalkulation</h1>
    <div class="header-grid">
        <div>
            <div class="field-row"><div class="label">Rechnungsadresse</div><div class="value" style="border:none;"></div></div>
            <div class="field-row"><div class="value">${selectedProject?.anrede || ''} ${selectedProject?.name || ''}</div></div>
            <div class="field-row"><div class="value">${selectedProject?.strasse || ''} ${selectedProject?.nr || ''}</div></div>
            <div class="field-row"><div class="value">${selectedProject?.plz || ''} ${selectedProject?.ort || ''}</div></div>
        </div>
        <div class="box">Sonstige Bemerkungen<div class="box-content">${selectedProject?.notes || ''}</div></div>
    </div>
    <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
        <div class="field-row" style="width: 50%;"><div class="label">Telefonnummer Kunde:</div><div class="value">${selectedProject?.telefon || ''}</div></div>
        <div style="width: 40%; display:flex; align-items: flex-end;">
            <div style="font-size:10px; font-weight:600; margin-right:12px; color: #475569;">KV oder FP</div>
            <div style="flex:1; background-color:#86efac; height:18px; border-radius:2px;"></div>
            <div style="font-size:10px; font-weight:600; margin-left:15px; margin-right:12px; color: #475569;">Kunden Nr.</div>
            <div class="value" style="flex:1;"></div>
        </div>
    </div>
    <div class="field-row"><div class="label">Auftragsdatum</div><div class="value">${selectedProject?.project_date ? new Date(selectedProject.project_date).toLocaleDateString('de-DE') : ''}</div></div>
    <div class="field-row"><div class="label">Aufgaben</div><div class="value">${selectedProject?.dienstleistungen || ''}</div></div>
    <div class="field-row"><div class="label">Sonstige Infos</div><div class="value"></div></div>

    <table>
        <tr>
            <th style="text-align:left;">Kosten:</th>
            <th style="width:28%;">Land in Sicht</th>
            <th style="width:28%;">Kunde</th>
            <th class="bg-green" style="width:18%;">KV</th>
        </tr>
        <tr>
            <td class="text-orange" style="background:#fff7ed;">Gesamt Std</td>
            <td class="center text-orange" style="background:#fff7ed;">${gesamtStd.toFixed(2)}</td>
            <td style="background:#fff7ed;"></td>
            <td style="background:#fff7ed;"></td>
        </tr>
        ${Array.from(rateMap.values()).map(data => `<tr>
            <td style="font-weight:600; color:#475569;">Stunden ${data.names.join(', ')} <span style="color:#94a3b8; font-weight:400;">(${data.std.toFixed(2)} Std.)</span></td>
            <td class="center"><div class="val-container"><span>${data.std.toFixed(2)} x ${numFormat(data.satz)} =</span><span>${numFormat(data.kosten)}</span></div></td>
            <td></td>
            <td></td>
        </tr>`).join('')}
        ${rateMap.size === 0 ? `<tr><td style="font-weight:600; color:#475569;">Stunden LiS</td><td class="center"><div class="val-container"><span>x 0,00 € =</span><span class="cur">- €</span></div></td><td></td><td></td></tr>` : ''}
        ${(() => {
                const totalServiceKosten = services.reduce((s, x) => s + x.total_cost, 0);
                // For Kunde side: use total_price if available, else total_cost
                const totalServiceErloes = services.reduce((s, x) => s + ((x as any).total_price || x.total_cost), 0);
                if (services.length > 0) return `<tr>
            <td style="font-weight:600; color:#475569;">Entsorgungen</td>
            <td><div class="val-container"><span></span><span>${numFormat(totalServiceKosten)}</span></div></td>
            <td><div class="val-container"><span></span><span>${numFormat(totalServiceErloes)}</span></div></td>
            <td></td>
        </tr>`;
                return `<tr>
            <td style="font-weight:600; color:#475569; height:28px;">Entsorgungen</td>
            <td><div class="val-container"><span></span><span class="cur">- €</span></div></td>
            <td><div class="val-container"><span></span><span class="cur">- €</span></div></td>
            <td></td>
        </tr>`;
            })()}
        <tr>
            <td style="font-weight:600; color:#475569; height:28px;">LKW</td>
            <td></td><td><div class="val-container"><span></span><span>${numFormat(lkwErloes)}</span></div></td><td></td>
        </tr>
        <tr>
            <td style="font-weight:600; color:#475569; height:28px;">HVZ</td>
            <td><div class="val-container"><span></span><span>${numFormat(hvzKosten)}</span></div></td>
            <td><div class="val-container"><span></span><span>${numFormat(hvzErloes)}</span></div></td>
            <td></td>
        </tr>
        <tr>
            <td style="font-weight:600; color:#475569; height:28px;">Diesel / BNK</td>
            <td><div class="val-container"><span></span><span>${numFormat(bnkKosten)}</span></div></td>
            <td><div class="val-container"><span></span><span>${numFormat(bnkErloes)}</span></div></td>
            <td></td>
        </tr>
        <tr>
            <td style="font-weight:600; color:#475569; height:28px;">Sonstige Kosten</td>
            <td><div class="val-container"><span></span><span>${numFormat(extraKosten)}</span></div></td><td></td><td></td>
        </tr>
        <tr>
            <td style="border:none; background:transparent;"></td>
            <td style="border:none; background:transparent;"></td>
            <td class="center" style="font-weight:600; color:#475569; border-top:2px solid #cbd5e1;">Rabatt</td>
            <td class="right" style="border-top:2px solid #cbd5e1; font-weight:600;">${numFormat(discountTotal)}</td>
        </tr>
    </table>

    <div class="flex-tables">
        <div class="half-table">
            <div class="half-table-title">EVD LiS</div>
            <table>
                ${evdLisMap.size > 0 ? Array.from(evdLisMap.entries()).map(([supplier, items]) =>
                items.map(item => `<tr><td class="label" style="width:60%;">${item.qty.toFixed(2)} x ${item.service} (${supplier}):</td><td class="right">${numFormat(item.cost)}</td></tr>`).join('')
            ).join('') : `<tr><td class="label" style="width:60%;">&nbsp;</td><td class="right cur">- €</td></tr>`}
            </table>
        </div>
        <div class="half-table">
            <div class="half-table-title">EVD Kunde</div>
            <table>
                ${evdKundeMap.size > 0 ? Array.from(evdKundeMap.entries()).map(([supplier, items]) =>
                items.map(item => `<tr><td class="label" style="width:60%;">${item.qty.toFixed(2)} x ${item.service} (${supplier}):</td><td class="right">${numFormat(item.cost)}</td></tr>`).join('')
            ).join('') : `<tr><td class="label" style="width:60%;">&nbsp;</td><td class="right cur">- €</td></tr>`}
            </table>
        </div>
    </div>

    <div class="flex-tables">
        <div class="half-table">
            <div class="half-table-title">Material LiS</div>
            <table>
                ${materials.length > 0 ? materials.map(m => `<tr><td class="label" style="width:50%;">${m.material_name}:</td><td class="right font-medium">${numFormat(m.total_cost)}</td></tr>`).join('') : `
                <tr><td class="label" style="width:50%;">&nbsp;</td><td class="right cur">- €</td></tr>`}
            </table>
        </div>
        <div class="half-table">
            <div class="half-table-title">Material Kunde</div>
            <table>
                ${materials.length > 0 ? materials.map(m => `<tr><td class="label" style="width:50%;">${m.material_name}:</td><td class="right font-medium">${numFormat(m.total_price)}</td></tr>`).join('') : `
                <tr><td class="label" style="width:50%;">&nbsp;</td><td class="right cur">- €</td></tr>`}
            </table>
        </div>
    </div>

    <table class="summary-table">
        <tr><td class="label">KV vorher</td><td class="val cur">- €</td></tr>
        <tr><td class="label">Nettoumsatz</td><td class="val">${numFormat(totalRevenue)}</td></tr>
        <tr class="total"><td class="label">Bruttoumsatz</td><td class="val">${numFormat(totalRevenue * 1.19)}</td></tr>
        <tr><td class="label">Gesamtkosten netto</td><td class="val">${numFormat(totalCosts)}</td></tr>
        <tr class="total"><td class="label">Nettoeinnahme</td><td class="val">${numFormat(margin)}</td></tr>
        <tr><td class="label">Prozent</td><td class="val" style="padding-top: 12px;"><span style="background-color:#86efac; color:#166534; padding:6px 12px; border-radius:4px; font-weight:700; font-size:14px; border:1px solid #4ade80;">${marginPct >= 0 || marginPct < 0 ? marginPct.toFixed(1) + '%' : '#DIV/0!'}</span></td></tr>
    </table>
</body></html>`;

        const html2pdf = (await import('html2pdf.js')).default;
        const container = document.createElement('div');
        container.innerHTML = html;
        document.body.appendChild(container);
        await html2pdf().set({
            margin: 10,
            filename: `Auftragsnachkalkulation_${selectedProject?.project_code || 'Projekt'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).from(container).save();
        document.body.removeChild(container);
        toast(`Auftragsnachkalkulation.pdf exportiert`, 'success');
    };

    return (
        <div className="flex h-full w-full bg-slate-50 overflow-hidden">
            <aside className={cn(
                "flex flex-col border-r bg-white transition-all duration-300 ease-in-out shrink-0",
                sidebarOpen ? "w-80" : "w-0 opacity-0 overflow-hidden"
            )}>
                <div className="p-4 border-b space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-slate-800">Projekte</h2>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => { setMultiSelectMode(m => !m); setCheckedProjectIds(new Set()); setMergedProjectNames([]); }}
                                className={cn(
                                    "px-2 py-1 text-[10px] font-semibold rounded-md transition-colors border",
                                    multiSelectMode
                                        ? "bg-blue-100 text-blue-700 border-blue-200"
                                        : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                                )}
                                title="Mehrere Projekte zusammenführen"
                            >
                                Multi
                            </button>
                            <button onClick={() => setSidebarOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500">
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                            className="w-full rounded-md border border-slate-200 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
                            placeholder="Suchen..."
                            value={projectSearch}
                            onChange={e => setProjectSearch(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Von</label>
                            <input
                                type="date"
                                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                                value={projectFilterStart}
                                onChange={e => setProjectFilterStart(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Bis</label>
                            <input
                                type="date"
                                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                                value={projectFilterEnd}
                                onChange={e => setProjectFilterEnd(e.target.value)}
                            />
                        </div>
                    </div>

                    {multiSelectMode && checkedProjectIds.size > 0 && (
                        <button
                            onClick={loadMergedProjects}
                            className="w-full py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            {checkedProjectIds.size} Projekt{checkedProjectIds.size > 1 ? 'e' : ''} zusammenführen
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading && projects.length === 0 ? (
                        <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" /></div>
                    ) : filteredProjects.length === 0 ? (
                        <div className="p-8 text-center">
                            <Package className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                            <p className="text-sm text-slate-500">Keine Projekte gefunden</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {Object.entries(groupedProjects).map(([monthKey, monthProjects]) => (
                                <div key={monthKey} className="border-b border-slate-200 last:border-0">
                                    <button
                                        onClick={() => toggleMonthExpanded(monthKey)}
                                        className="w-full flex items-center justify-between p-3 bg-slate-100 hover:bg-slate-200 transition-colors focus:outline-none"
                                    >
                                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{monthKey} <span className="text-slate-400 font-normal ml-1">({monthProjects.length})</span></span>
                                        {expandedMonths[monthKey] === false ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronUp className="h-4 w-4 text-slate-400" />}
                                    </button>

                                    {expandedMonths[monthKey] !== false && (
                                        <div className="divide-y divide-slate-50 border-t border-slate-100">
                                            {monthProjects.map(p => {
                                                // Basic visual status indicators: past = red/gray, upcoming = blue
                                                const isPast = p.project_date ? new Date(p.project_date).getTime() < new Date().setHours(0, 0, 0, 0) : true;
                                                const isUnassigned = (!p.project_date && !p.ort);

                                                return (
                                                    <button
                                                        key={p.project_id}
                                                        onClick={() => multiSelectMode ? toggleChecked(p.project_id) : setSelectedProjectId(p.project_id)}
                                                        className={cn(
                                                            "w-full text-left p-3 hover:bg-white transition-all border-l-[3px] group focus:outline-none bg-slate-50/50",
                                                            !multiSelectMode && selectedProjectId === p.project_id
                                                                ? "bg-blue-50/60 border-l-blue-600 shadow-inner"
                                                                : multiSelectMode && checkedProjectIds.has(p.project_id)
                                                                    ? "bg-blue-50/60 border-l-blue-600 shadow-inner"
                                                                    : "border-l-transparent"
                                                        )}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            {multiSelectMode && (
                                                                <div className={cn(
                                                                    "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors mt-0.5",
                                                                    checkedProjectIds.has(p.project_id)
                                                                        ? "bg-blue-600 border-blue-600"
                                                                        : "border-slate-300 bg-white"
                                                                )}>
                                                                    {checkedProjectIds.has(p.project_id) && (
                                                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                                    )}
                                                                </div>
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    {/* Status Indicator Dot */}
                                                                    <div className={cn(
                                                                        "w-2 h-2 rounded-full flex-shrink-0",
                                                                        isUnassigned ? "bg-slate-300" : isPast ? "bg-amber-400" : "bg-emerald-400"
                                                                    )} title={isUnassigned ? "Unvollständig" : isPast ? "Abgeschlossen/Vergangen" : "Zukünftig"} />

                                                                    <div className={cn(
                                                                        "text-sm font-medium truncate",
                                                                        (!multiSelectMode && selectedProjectId === p.project_id) || (multiSelectMode && checkedProjectIds.has(p.project_id))
                                                                            ? "text-blue-700" : "text-slate-700"
                                                                    )}>
                                                                        {p.name || 'Unbenanntes Projekt'}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center justify-between gap-2 pl-4">
                                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                                        {p.project_code && (
                                                                            <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                                                                {p.project_code}
                                                                            </span>
                                                                        )}
                                                                        {p.ort && (
                                                                            <span className="text-xs text-slate-400 truncate flex-1 block" title={p.ort}>
                                                                                {p.ort}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {p.project_date && (
                                                                        <span className="text-[10px] text-slate-400 whitespace-nowrap font-mono">
                                                                            {format(new Date(p.project_date), 'dd.MM.yy')}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 h-full relative">
                {!sidebarOpen && (
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="absolute left-4 top-4 z-20 p-2 bg-white border border-slate-200 shadow-md rounded-md hover:bg-slate-50 text-slate-600 transition-all"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                )}

                <header className="flex-none flex items-center justify-between border-b bg-white px-6 py-4 shadow-sm z-10">
                    <div className={cn("flex items-center gap-3 transition-all", !sidebarOpen && "ml-12")}>
                        <Calculator className="h-6 w-6 text-slate-700" />
                        <div>
                            <h1 className="text-xl font-bold text-slate-800 line-clamp-1">
                                {mergedProjectNames.length > 1
                                    ? `${mergedProjectNames.length} Projekte zusammengeführt`
                                    : selectedProject ? (selectedProject.name || 'Unbenannt') : 'Nachkalkulation'}
                            </h1>
                            {mergedProjectNames.length > 1 ? (
                                <p className="text-xs text-blue-600 flex items-center gap-1 flex-wrap">
                                    {mergedProjectNames.map((n, i) => (
                                        <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-medium border border-blue-100">
                                            {n}
                                        </span>
                                    ))}
                                </p>
                            ) : selectedProject && (
                                <p className="text-xs text-slate-500 flex items-center gap-2">
                                    {selectedProject.project_code && <span>{selectedProject.project_code}</span>}
                                    {selectedProject.ort && <span>• {selectedProject.ort}</span>}
                                    {selectedProject.project_date && <span>• {format(new Date(selectedProject.project_date), 'dd.MM.yyyy')}</span>}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {selectedProject && (
                            <>
                                <button onClick={exportHTML} className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 border border-slate-300 shadow-sm transition-colors">
                                    <FileText className="h-4 w-4" /> Standard Export
                                </button>
                                <button onClick={exportAuftragsnachkalkulationHTML} className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 shadow-sm transition-colors">
                                    <FileText className="h-4 w-4" /> Auftragsnachkalkulation
                                </button>
                            </>
                        )}
                    </div>
                </header>

                <div className="flex-1 overflow-auto bg-slate-50/50">
                    {loading && !selectedProject ? (
                        <div className="flex h-full items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                        </div>
                    ) : !selectedProject ? (
                        <div className="flex h-full flex-col items-center justify-center text-slate-400 p-8">
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                                <Calculator className="h-8 w-8 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-600">Kein Projekt ausgewählt</h3>
                            <p className="text-sm max-w-xs text-center mt-2 text-slate-500">
                                Wähle ein Projekt aus der Liste links, um die Nachkalkulation anzuzeigen.
                            </p>
                        </div>
                    ) : (
                        <div className="p-6 space-y-6 pb-20">
                            {/* Cost Basis Toggle */}
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-sm font-medium text-slate-600">Standard-Basis Personalkosten:</span>
                                <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                                    <button
                                        onClick={() => setGlobalBasis('lis')}
                                        className={cn(
                                            "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                                            costBasis === 'lis' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        LiS Std.
                                    </button>
                                    <button
                                        onClick={() => setGlobalBasis('kd')}
                                        className={cn(
                                            "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                                            costBasis === 'kd' ? "bg-white text-green-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        Kd Std.
                                    </button>
                                </div>
                                {Object.keys(perRowBasis).length > 0 && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">⚠ {Object.keys(perRowBasis).length} individuelle Überschreibung(en)</span>}
                            </div>

                            {/* KPI Cards */}
                            <div className="grid grid-cols-4 gap-4">
                                <KpiCard label="Gesamtkosten" value={eur(totalCosts)} icon={<DollarSign className="h-5 w-5" />} color="text-slate-800" bgColor="bg-slate-100" />
                                <KpiCard label="Gesamterlöse" value={eur(totalRevenue)} icon={<TrendingUp className="h-5 w-5" />} color="text-blue-700" bgColor="bg-blue-50" />
                                <KpiCard label="Marge (€)" value={eur(margin)} icon={<TrendingUp className="h-5 w-5" />}
                                    color={margin >= 0 ? 'text-green-700' : 'text-red-600'} bgColor={margin >= 0 ? 'bg-green-50' : 'bg-red-50'} />
                                <KpiCard label="Marge (%)" value={`${marginPct.toFixed(1)}%`} icon={<TrendingUp className="h-5 w-5" />}
                                    color={marginPct >= 0 ? 'text-green-700' : 'text-red-600'} bgColor={marginPct >= 0 ? 'bg-green-50' : 'bg-red-50'} />
                            </div>

                            {/* Sortable Sections */}
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={containerOrder} strategy={verticalListSortingStrategy}>
                                    {containerOrder.map(section => {
                                        switch (section) {
                                            case 'personnel':
                                                return (
                                                    <SortableCostSection key="personnel" id="personnel">
                                                        <CostSection title="Personalkosten" icon={<Users className="h-5 w-5" />} total={personalKosten} color="blue">
                                                            <table className="w-full text-sm">
                                                                <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase">
                                                                    <tr><th className="px-4 py-2 text-left">Datum</th><th className="px-4 py-2 text-left">Mitarbeiter</th><th className="px-4 py-2 text-left">Rolle</th>
                                                                        <th className="px-4 py-2 text-right">LiS Std.</th><th className="px-4 py-2 text-right">Kd Std.</th><th className="px-4 py-2 text-center w-[80px]">Basis</th><th className="px-4 py-2 text-right">Satz</th><th className="px-4 py-2 text-right">Kosten</th></tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {adjustedPersonnel.length === 0 ? <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-400">Keine Zeitpaare</td></tr> : adjustedPersonnel.map((p: any) => {
                                                                        const rowBasis = getRowBasis(p.pair_id);
                                                                        return (
                                                                            <tr key={p.pair_id} className="hover:bg-slate-50">
                                                                                <td className="px-4 py-2 text-slate-600">{p.datum}</td><td className="px-4 py-2 font-medium">{p.mitarbeiter}</td><td className="px-4 py-2 text-slate-500">{p.role || '—'}</td>
                                                                                <td className={cn("px-4 py-2 text-right font-mono", rowBasis === 'lis' ? 'font-semibold text-blue-700' : 'text-slate-400')}>{p.lis_stunden.toFixed(2)}</td>
                                                                                <td className={cn("px-4 py-2 text-right font-mono", rowBasis === 'kd' ? 'font-semibold text-green-700' : 'text-slate-400')}>{p.kunden_stunden.toFixed(2)}</td>
                                                                                <td className="px-2 py-2 text-center">
                                                                                    <button onClick={() => toggleRowBasis(p.pair_id)}
                                                                                        className={cn("text-xs font-semibold px-2 py-0.5 rounded-full transition-colors",
                                                                                            rowBasis === 'lis' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                                                        )}>
                                                                                        {rowBasis === 'lis' ? 'LiS' : 'Kd'}
                                                                                    </button>
                                                                                </td>
                                                                                <td className="px-4 py-2 text-right">{eur(p.satz)}</td><td className="px-4 py-2 text-right font-semibold">{eur(p.kosten)}</td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </CostSection>
                                                    </SortableCostSection>
                                                );
                                            case 'material':
                                                return (
                                                    <SortableCostSection key="material" id="material">
                                                        <CostSection title="Material" icon={<Package className="h-5 w-5" />} total={materialKosten} color="amber"
                                                            actions={<div className="flex gap-2">
                                                                <button onClick={() => { setAddMatForm({ material_id: '', quantity: 0 }); setAddMatModal(true); }} className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900"><Plus className="h-3.5 w-3.5" /> Material</button>
                                                                <button onClick={saveMaterials} className="flex items-center gap-1 text-xs bg-amber-600 text-white px-2 py-1 rounded hover:bg-amber-700"><Save className="h-3.5 w-3.5" /> Speichern</button>
                                                            </div>}>
                                                            <table className="w-full text-sm">
                                                                <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase">
                                                                    <tr><th className="px-4 py-2 text-left">Material</th><th className="px-4 py-2 text-right w-24">Menge</th><th className="px-4 py-2 text-left">Einheit</th>
                                                                        <th className="px-4 py-2 text-right">EK/Einheit</th><th className="px-4 py-2 text-right">VK/Einheit</th><th className="px-4 py-2 text-right">Kosten</th><th className="px-4 py-2 text-right">Erlöse</th><th className="w-10"></th></tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {materials.length === 0 ? <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-400">Keine Materialien</td></tr> : materials.map(m => (
                                                                        <tr key={m.id} className="hover:bg-slate-50 group">
                                                                            <td className="px-4 py-2 font-medium">{m.material_name}</td>
                                                                            <td className="px-4 py-1.5"><input type="number" className="w-full bg-transparent border border-transparent hover:border-slate-200 rounded px-2 py-1 text-sm text-right" value={m.quantity === 0 ? '' : (m.quantity ?? '')} onChange={e => updateMaterialQty(m.id, e.target.value === '' ? 0 : +e.target.value)} onFocus={e => e.target.select()} /></td>
                                                                            <td className="px-4 py-2 text-slate-500">{m.unit}</td>
                                                                            <td className="px-4 py-2 text-right">{eur(m.cost_per_unit)}</td><td className="px-4 py-2 text-right">{eur(m.price_per_unit)}</td>
                                                                            <td className="px-4 py-2 text-right font-semibold">{eur(m.total_cost)}</td><td className="px-4 py-2 text-right text-green-700">{eur(m.total_price)}</td>
                                                                            <td className="px-2"><button onClick={() => deleteMaterial(m.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button></td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </CostSection>
                                                    </SortableCostSection>
                                                );
                                            case 'vehicle':
                                                return (
                                                    <SortableCostSection key="vehicle" id="vehicle">
                                                        <CostSection title="Fahrzeug" icon={<Truck className="h-5 w-5" />} total={vehicleErloes} color="green"
                                                            actions={<div className="flex gap-2">
                                                                <button onClick={() => { setAddVehForm({ vehicle_id: '', usage_type: 'km', usage_value: 0, cost_per_unit: 0, notes: '' }); setAddVehModal(true); }} className="flex items-center gap-1 text-xs text-sky-700 hover:text-sky-900"><Plus className="h-3.5 w-3.5" /> Fahrzeug</button>
                                                                <button onClick={saveVehicleCosts} className="flex items-center gap-1 text-xs bg-sky-600 text-white px-2 py-1 rounded hover:bg-sky-700"><Save className="h-3.5 w-3.5" /> Speichern</button>
                                                            </div>}>
                                                            <table className="w-full text-sm">
                                                                <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase">
                                                                    <tr><th className="px-4 py-2 text-left">Fahrzeug</th><th className="px-4 py-2 w-20">Typ</th><th className="px-4 py-2 text-right w-24">Wert</th><th className="px-4 py-2 text-right w-28">Satz (€)</th><th className="px-4 py-2 text-right">Erlöse</th><th className="w-10"></th></tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {vehicles.length === 0 ? <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Keine Fahrzeugkosten</td></tr> : vehicles.map(v => (
                                                                        <tr key={v.id} className="hover:bg-slate-50 group">
                                                                            <td className="px-4 py-2 font-medium">{v.fahrzeug}</td>
                                                                            <td className="px-4 py-1.5"><select className="w-full bg-transparent border border-transparent hover:border-slate-200 rounded px-1 py-1 text-sm" value={v.usage_type} onChange={e => updateVehicleCost(v.id, 'usage_type', e.target.value)}><option value="km">km</option><option value="Std">Std</option><option value="Tag">Tag</option><option value="Pauschal">Pauschal</option></select></td>
                                                                            <td className="px-4 py-1.5"><input type="number" className="w-full bg-transparent border border-transparent hover:border-slate-200 rounded px-2 py-1 text-sm text-right" value={v.usage_value === 0 ? '' : (v.usage_value ?? '')} onChange={e => updateVehicleCost(v.id, 'usage_value', e.target.value === '' ? 0 : +e.target.value)} onFocus={e => e.target.select()} /></td>
                                                                            <td className="px-4 py-1.5"><input type="number" step="0.01" className="w-full bg-transparent border border-transparent hover:border-slate-200 rounded px-2 py-1 text-sm text-right" value={v.cost_per_unit === 0 ? '' : (v.cost_per_unit ?? '')} onChange={e => updateVehicleCost(v.id, 'cost_per_unit', e.target.value === '' ? 0 : +e.target.value)} onFocus={e => e.target.select()} /></td>
                                                                            <td className="px-4 py-2 text-right font-semibold">{eur(v.total_cost)}</td>
                                                                            <td className="px-2"><button onClick={() => deleteVehicleCost(v.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button></td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </CostSection>
                                                    </SortableCostSection>
                                                );
                                            case 'service':
                                                return (
                                                    <SortableCostSection key="service" id="service">
                                                        <CostSection title="Dienstleistungskosten" icon={<Wrench className="h-5 w-5" />} total={serviceKosten} color="purple"
                                                            actions={<button onClick={() => { setAddSvcForm({ service_id: '', quantity: 0, unit: 'Std', cost_per_unit: 0, supplier: '' }); setAddSvcModal(true); }} className="flex items-center gap-1 text-xs text-purple-700 hover:text-purple-900"><Plus className="h-3.5 w-3.5" /> Leistung</button>}>
                                                            <table className="w-full text-sm">
                                                                <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase">
                                                                    <tr><th className="px-4 py-2 text-left">Leistung</th><th className="px-4 py-2 text-left">Lieferant</th><th className="px-4 py-2 text-right">Menge</th><th className="px-4 py-2 text-right">EK/Einheit</th><th className="px-4 py-2 text-right">VK/Einheit</th><th className="px-4 py-2 text-right">Kosten</th><th className="px-4 py-2 text-right">Erlöse</th><th className="w-10"></th></tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {services.length === 0 ? <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-400">Keine Dienstleistungen</td></tr> : services.map(s => (
                                                                        <tr key={s.id} className="hover:bg-slate-50 group">
                                                                            <td className="px-4 py-2 font-medium">{s.service_name}</td><td className="px-4 py-2 text-slate-500">{s.supplier || '—'}</td>
                                                                            <td className="px-4 py-2 text-right font-mono">{s.quantity}</td>
                                                                            <td className="px-4 py-2 text-right">{eur(s.cost_per_unit)}</td>
                                                                            <td className="px-4 py-2 text-right">{eur(s.price_per_unit ?? 0)}</td>
                                                                            <td className="px-4 py-2 text-right font-semibold">{eur(s.total_cost)}</td>
                                                                            <td className="px-4 py-2 text-right text-green-700">{eur(s.total_price ?? 0)}</td>
                                                                            <td className="px-2"><button onClick={() => deleteServiceCost(s.id!)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button></td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </CostSection>
                                                    </SortableCostSection>
                                                );
                                            case 'hvz':
                                                return (
                                                    <SortableCostSection key="hvz" id="hvz">
                                                        <CostSection title="HVZ" icon={<Truck className="h-5 w-5" />} total={hvzKosten} color="orange"
                                                            actions={<button onClick={() => { setAddHvzForm({ datum_von: '', datum_bis: '', tage: 0, ek_preis: 0, vk_preis: 0 }); setAddHvzModal(true); }} className="flex items-center gap-1 text-xs text-orange-700 hover:text-orange-900"><Plus className="h-3.5 w-3.5" /> HVZ</button>}>
                                                            <table className="w-full text-sm">
                                                                <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase">
                                                                    <tr><th className="px-4 py-2 text-left">Von</th><th className="px-4 py-2 text-left">Bis</th><th className="px-4 py-2 text-right">Tage</th><th className="px-4 py-2 text-right">EK-Preis</th><th className="px-4 py-2 text-right">VK-Preis</th><th className="px-4 py-2 text-right">Kosten</th><th className="px-4 py-2 text-right">Erlöse</th><th className="w-10"></th></tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {hvzCosts.length === 0 ? <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Keine HVZ Einträge</td></tr> : hvzCosts.map(h => (
                                                                        <tr key={h.id} className="hover:bg-slate-50 group">
                                                                            <td className="px-4 py-2 text-slate-500">{h.datum_von ? format(new Date(h.datum_von), 'dd.MM.yy') : '—'}</td>
                                                                            <td className="px-4 py-2 text-slate-500">{h.datum_bis ? format(new Date(h.datum_bis), 'dd.MM.yy') : '—'}</td>
                                                                            <td className="px-4 py-2 text-right">{h.tage || '—'}</td>
                                                                            <td className="px-4 py-2 text-right">{eur(h.ek_preis)}</td>
                                                                            <td className="px-4 py-2 text-right">{eur(h.vk_preis)}</td>
                                                                            <td className="px-4 py-2 text-right font-semibold">{eur((h.tage || 0) * (h.ek_preis || 0))}</td>
                                                                            <td className="px-4 py-2 text-right text-green-700">{eur((h.tage || 0) * (h.vk_preis || 0))}</td>
                                                                            <td className="px-2"><button onClick={() => deleteHvzCost(h.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button></td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </CostSection>
                                                    </SortableCostSection>
                                                );
                                            case 'bnk':
                                                return (
                                                    <SortableCostSection key="bnk" id="bnk">
                                                        <CostSection title="Diesel / BNK" icon={<Truck className="h-5 w-5" />} total={bnkKosten} color="blue"
                                                            actions={<button onClick={() => { setAddBnkForm({ beschreibung: 'Diesel', menge: 0, ek_preis: 0, vk_preis: 0 }); setAddBnkModal(true); }} className="flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900"><Plus className="h-3.5 w-3.5" /> Diesel / BNK</button>}>
                                                            <table className="w-full text-sm">
                                                                <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase">
                                                                    <tr><th className="px-4 py-2 text-left">Beschreibung</th><th className="px-4 py-2 text-right">Menge</th><th className="px-4 py-2 text-right">EK-Preis</th><th className="px-4 py-2 text-right">VK-Preis</th><th className="px-4 py-2 text-right">Kosten</th><th className="px-4 py-2 text-right">Erlöse</th><th className="w-10"></th></tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {bnkCosts.length === 0 ? <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Keine Diesel/BNK Einträge</td></tr> : bnkCosts.map(b => (
                                                                        <tr key={b.id} className="hover:bg-slate-50 group">
                                                                            <td className="px-4 py-2 font-medium">{b.beschreibung || '—'}</td>
                                                                            <td className="px-4 py-2 text-right">{b.menge || '—'}</td>
                                                                            <td className="px-4 py-2 text-right">{eur(b.ek_preis)}</td>
                                                                            <td className="px-4 py-2 text-right">{eur(b.vk_preis)}</td>
                                                                            <td className="px-4 py-2 text-right font-semibold">{eur((b.menge || 0) * (b.ek_preis || 0))}</td>
                                                                            <td className="px-4 py-2 text-right text-green-700">{eur((b.menge || 0) * (b.vk_preis || 0))}</td>
                                                                            <td className="px-2"><button onClick={() => deleteBnkCost(b.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button></td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </CostSection>
                                                    </SortableCostSection>
                                                );
                                            case 'extra':
                                                return (
                                                    <SortableCostSection key="extra" id="extra">
                                                        <CostSection title="Sonderkosten" icon={<AlertCircle className="h-5 w-5" />} total={extraKosten} color="amber"
                                                            actions={<div className="flex gap-2">
                                                                <button onClick={() => { setAddExtraForm({ cost_type: 'Sonstiges', description: '', cost: 0 }); setAddExtraModal(true); }} className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900"><Plus className="h-3.5 w-3.5" /> Kosten</button>
                                                                <button onClick={saveExtraCosts} className="flex items-center gap-1 text-xs bg-amber-600 text-white px-2 py-1 rounded hover:bg-amber-700"><Save className="h-3.5 w-3.5" /> Speichern</button>
                                                            </div>}>
                                                            <table className="w-full text-sm">
                                                                <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase">
                                                                    <tr><th className="px-4 py-2 text-left">Typ</th><th className="px-4 py-2 text-left">Beschreibung</th><th className="px-4 py-2 text-right w-32">Betrag (€)</th><th className="w-10"></th></tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {extraCosts.length === 0 ? <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Keine Sonderkosten</td></tr> : extraCosts.map(e => (
                                                                        <tr key={e.cost_id} className="hover:bg-slate-50 group">
                                                                            <td className="px-4 py-1.5"><select className="w-full bg-transparent border border-transparent hover:border-slate-200 rounded px-2 py-1 text-sm" value={e.cost_type} onChange={ev => updateExtraCost(e.cost_id, 'cost_type', ev.target.value)}>
                                                                                <option value="Maut">Maut</option><option value="Parkgebühr">Parkgebühr</option><option value="Entsorgung">Entsorgung</option><option value="Verpackung">Verpackung</option><option value="Sonstiges">Sonstiges</option>
                                                                            </select></td>
                                                                            <td className="px-4 py-1.5"><input className="w-full bg-transparent border border-transparent hover:border-slate-200 rounded px-2 py-1 text-sm" value={e.description} onChange={ev => updateExtraCost(e.cost_id, 'description', ev.target.value)} placeholder="Beschreibung..." /></td>
                                                                            <td className="px-4 py-1.5"><input type="number" step="0.01" className="w-full bg-transparent border border-transparent hover:border-slate-200 rounded px-2 py-1 text-sm text-right" value={e.cost === 0 ? '' : (e.cost ?? '')} onChange={ev => updateExtraCost(e.cost_id, 'cost', ev.target.value === '' ? 0 : +ev.target.value)} onFocus={ev => ev.target.select()} /></td>
                                                                            <td className="px-2"><button onClick={() => deleteExtraCost(e.cost_id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button></td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </CostSection>
                                                    </SortableCostSection>
                                                );
                                            case 'revenue':
                                                return (
                                                    <SortableCostSection key="revenue" id="revenue">
                                                        {/* Rabatte & Erlöse merged into one block or stacked */}
                                                        <CostSection title="Rabatte / Nachlässe" icon={<Percent className="h-5 w-5" />} total={discountTotal} color="purple"
                                                            actions={<div className="flex gap-2">
                                                                <button onClick={addDiscountRow} className="flex items-center gap-1 text-xs text-purple-700 hover:text-purple-900"><Plus className="h-3.5 w-3.5" /> Rabatt</button>
                                                                <button onClick={saveDiscounts} className="flex items-center gap-1 text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700"><Save className="h-3.5 w-3.5" /> Speichern</button>
                                                            </div>}>
                                                            <table className="w-full text-sm mb-4">
                                                                <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase">
                                                                    <tr><th className="px-4 py-2 text-left">Bezeichnung</th><th className="px-4 py-2 w-24">Typ</th><th className="px-4 py-2 text-right w-32">Wert (€)</th><th className="w-10"></th></tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {discounts.length === 0 ? <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Keine Rabatte</td></tr> : discounts.map((d: any) => {
                                                                        const rowId = d.id;
                                                                        return (
                                                                            <tr key={rowId} className="hover:bg-slate-50 group">
                                                                                <td className="px-4 py-1.5"><input className="w-full bg-transparent border border-transparent hover:border-slate-200 rounded px-2 py-1 text-sm" value={d.description || ''} onChange={e => updateDiscount(rowId, 'description', e.target.value)} placeholder="Beschreibung..." /></td>
                                                                                <td className="px-4 py-1.5"><select className="w-full bg-transparent border border-transparent hover:border-slate-200 rounded px-1 py-1 text-sm" value={d.mode || 'flat'} onChange={e => updateDiscount(rowId, 'mode', e.target.value)}><option value="flat">Pauschal</option><option value="percent">Prozent</option></select></td>
                                                                                <td className="px-4 py-1.5"><input type="number" step="0.01" className="w-full bg-transparent border border-transparent hover:border-slate-200 rounded px-2 py-1 text-sm text-right" value={d.value === 0 ? '' : (d.value ?? '')} onChange={e => updateDiscount(rowId, 'value', e.target.value === '' ? 0 : +e.target.value)} onFocus={e => e.target.select()} /></td>
                                                                                <td className="px-2"><button onClick={() => deleteDiscount(rowId)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button></td>
                                                                            </tr>
                                                                        )
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </CostSection>
                                                        <div className="h-6" />
                                                        <CostSection title="Erlöse (Rechnungspositionen)" icon={<TrendingUp className="h-5 w-5" />} total={revenueTotal} color="green"
                                                            actions={<div className="flex gap-2">
                                                                <button onClick={addRevenueRow} className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900"><Plus className="h-3.5 w-3.5" /> Zeile</button>
                                                                <button onClick={saveRevenue} className="flex items-center gap-1 text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"><Save className="h-3.5 w-3.5" /> Speichern</button>
                                                            </div>}>
                                                            <table className="w-full text-sm">
                                                                <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase">
                                                                    <tr><th className="px-4 py-2 text-left">Position</th><th className="px-4 py-2 text-right w-20">Menge</th><th className="px-4 py-2 w-20">Einheit</th><th className="px-4 py-2 text-right w-28">Preis/Einheit</th><th className="px-4 py-2 text-right w-28">Gesamt</th><th className="w-10"></th></tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {revenue.length === 0 ? <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Keine Erlöse</td></tr> : revenue.map(r => (
                                                                        <tr key={r.id} className="hover:bg-slate-50 group">
                                                                            <td className="px-4 py-1.5"><input className="w-full bg-transparent border border-transparent hover:border-slate-200 rounded px-2 py-1 text-sm" value={r.position_label} onChange={e => updateRevenue(r.id, 'position_label', e.target.value)} placeholder="Position..." /></td>
                                                                            <td className="px-4 py-1.5"><input type="number" step="0.01" className="w-full bg-transparent border border-transparent hover:border-slate-200 rounded px-2 py-1 text-sm text-right" value={r.qty === 0 ? '' : (r.qty ?? '')} onChange={e => updateRevenue(r.id, 'qty', e.target.value === '' ? 0 : +e.target.value)} onFocus={e => e.target.select()} /></td>
                                                                            <td className="px-4 py-1.5"><input className="w-full bg-transparent border border-transparent hover:border-slate-200 rounded px-2 py-1 text-sm" value={r.unit} onChange={e => updateRevenue(r.id, 'unit', e.target.value)} /></td>
                                                                            <td className="px-4 py-1.5"><input type="number" step="0.01" className="w-full bg-transparent border border-transparent hover:border-slate-200 rounded px-2 py-1 text-sm text-right" value={r.unit_price === 0 ? '' : (r.unit_price ?? '')} onChange={e => updateRevenue(r.id, 'unit_price', e.target.value === '' ? 0 : +e.target.value)} onFocus={e => e.target.select()} /></td>
                                                                            <td className="px-4 py-2 text-right font-semibold text-green-700">{eur(r.line_total)}</td>
                                                                            <td className="px-2"><button onClick={() => deleteRevenue(r.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button></td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </CostSection>
                                                    </SortableCostSection>
                                                );
                                            default: return null;
                                        }
                                    })}
                                </SortableContext>
                            </DndContext>
                        </div>
                    )}

                    {/* ======= ADD MATERIAL MODAL ======= */}
                    {addMatModal && <Modal title="Material hinzufügen" onClose={() => setAddMatModal(false)} onSave={addMaterial} disabled={!addMatForm.material_id}>
                        <div className="space-y-3">
                            <div><label className="block text-xs font-medium text-slate-500 mb-1">Material</label>
                                <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={addMatForm.material_id} onChange={e => setAddMatForm({ ...addMatForm, material_id: e.target.value })}>
                                    <option value="">Wählen...</option>
                                    {materialCatalog.map((m: any) => <option key={m.material_id} value={m.material_id}>{m.name} ({m.unit})</option>)}
                                </select></div>
                            <div><label className="block text-xs font-medium text-slate-500 mb-1">Menge</label>
                                <input type="number" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={addMatForm.quantity === 0 ? '' : (addMatForm.quantity ?? '')} onChange={e => setAddMatForm({ ...addMatForm, quantity: e.target.value === '' ? 0 : +e.target.value })} onFocus={e => e.target.select()} /></div>
                        </div>
                    </Modal>}

                    {/* ======= ADD VEHICLE COST MODAL ======= */}
                    {addVehModal && <Modal title="Fahrzeugkosten hinzufügen" onClose={() => setAddVehModal(false)} onSave={addVehicleCost} disabled={!addVehForm.vehicle_id}>
                        <div className="space-y-3">
                            <div><label className="block text-xs font-medium text-slate-500 mb-1">Fahrzeug</label>
                                <input list="fahrzeugList" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={addVehForm.vehicle_id} onChange={e => setAddVehForm({ ...addVehForm, vehicle_id: e.target.value })} placeholder="Wählen oder eingeben..." />
                                <datalist id="fahrzeugList">
                                    <option value="L4U" />
                                    <option value="L4N" />
                                    <option value="L Olaf" />
                                    <option value="L Khalid" />
                                    <option value="L Caddy" />
                                    <option value="L Star" />
                                </datalist></div>
                            <div className="grid grid-cols-3 gap-3">
                                <div><label className="block text-xs font-medium text-slate-500 mb-1">Typ</label>
                                    <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={addVehForm.usage_type} onChange={e => setAddVehForm({ ...addVehForm, usage_type: e.target.value })}>
                                        <option value="km">km</option><option value="Std">Std</option><option value="Tag">Tag</option><option value="Pauschal">Pauschal</option>
                                    </select></div>
                                <div><label className="block text-xs font-medium text-slate-500 mb-1">Wert</label>
                                    <input type="number" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={addVehForm.usage_value === 0 ? '' : (addVehForm.usage_value ?? '')} onChange={e => setAddVehForm({ ...addVehForm, usage_value: e.target.value === '' ? 0 : +e.target.value })} onFocus={e => e.target.select()} /></div>
                                <div><label className="block text-xs font-medium text-slate-500 mb-1">Satz (€)</label>
                                    <input type="number" step="0.01" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={addVehForm.cost_per_unit === 0 ? '' : (addVehForm.cost_per_unit ?? '')} onChange={e => setAddVehForm({ ...addVehForm, cost_per_unit: e.target.value === '' ? 0 : +e.target.value })} onFocus={e => e.target.select()} /></div>
                            </div>
                            <div><label className="block text-xs font-medium text-slate-500 mb-1">Notizen</label>
                                <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={addVehForm.notes} onChange={e => setAddVehForm({ ...addVehForm, notes: e.target.value })} /></div>
                        </div>
                    </Modal>}

                    {/* ======= ADD SERVICE MODAL ======= */}
                    {addSvcModal && <Modal title="Dienstleistung hinzufügen" onClose={() => setAddSvcModal(false)} onSave={addServiceCost} disabled={!addSvcForm.service_id}>
                        <div className="space-y-3">
                            <div><label className="block text-xs font-medium text-slate-500 mb-1">Lieferant</label>
                                <select
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                    value={addSvcForm.supplier || ''}
                                    onChange={e => setAddSvcForm({ ...addSvcForm, supplier: e.target.value, service_id: '' })}>
                                    <option value="">Alle Lieferanten...</option>
                                    {Array.from(new Set(
                                        serviceCatalog.flatMap((svc: any) =>
                                            (svc.prices || []).map((p: any) => p.supplier).filter(Boolean)
                                        )
                                    )).sort().map((s: any) => <option key={s as string} value={s as string}>{s as React.ReactNode}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-xs font-medium text-slate-500 mb-1">Leistung</label>
                                    <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={addSvcForm.service_id} onChange={e => {
                                        const newServiceId = e.target.value;
                                        const svc = serviceCatalog.find((x: any) => x.service_id === newServiceId);
                                        const prices = svc?.prices || [];
                                        const existingSupplierValid = prices.some((x: any) => x.supplier === addSvcForm.supplier);
                                        const chosenSupplier = existingSupplierValid ? addSvcForm.supplier : (prices[0]?.supplier || '');
                                        setAddSvcForm({ ...addSvcForm, service_id: newServiceId, supplier: chosenSupplier });
                                    }}>
                                        <option value="">Wählen...</option>
                                        {serviceCatalog
                                            .filter((svc: any) => !addSvcForm.supplier || (svc.prices || []).some((p: any) => p.supplier === addSvcForm.supplier))
                                            .map((s: any) => <option key={s.service_id} value={s.service_id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div><label className="block text-xs font-medium text-slate-500 mb-1">Menge</label>
                                    <input type="number" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={addSvcForm.quantity === 0 ? '' : (addSvcForm.quantity ?? '')} onChange={e => setAddSvcForm({ ...addSvcForm, quantity: e.target.value === '' ? 0 : +e.target.value })} onFocus={e => e.target.select()} />
                                </div>
                            </div>
                        </div>
                    </Modal>}

                    {/* ======= ADD EXTRA COST MODAL ======= */}
                    {addExtraModal && <Modal title="Sonderkosten hinzufügen" onClose={() => setAddExtraModal(false)} onSave={addExtraCost} disabled={!addExtraForm.description}>
                        <div className="space-y-3">
                            <div><label className="block text-xs font-medium text-slate-500 mb-1">Typ</label>
                                <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={addExtraForm.cost_type} onChange={e => setAddExtraForm({ ...addExtraForm, cost_type: e.target.value })}>
                                    <option value="Maut">Maut</option><option value="Parkgebühr">Parkgebühr</option><option value="Entsorgung">Entsorgung</option><option value="Verpackung">Verpackung</option><option value="Sonstiges">Sonstiges</option>
                                </select></div>
                            <div><label className="block text-xs font-medium text-slate-500 mb-1">Beschreibung</label>
                                <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={addExtraForm.description} onChange={e => setAddExtraForm({ ...addExtraForm, description: e.target.value })} placeholder="z.B. Autobahnmaut A3" /></div>
                            <div><label className="block text-xs font-medium text-slate-500 mb-1">Betrag (€)</label>
                                <input type="number" step="0.01" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={addExtraForm.cost === 0 ? '' : (addExtraForm.cost ?? '')} onChange={e => setAddExtraForm({ ...addExtraForm, cost: e.target.value === '' ? 0 : +e.target.value })} onFocus={e => e.target.select()} /></div>
                        </div>
                    </Modal>}
                    {/* ======= ADD HVZ MODAL ======= */}
                    {addHvzModal && <Modal title="HVZ hinzufügen" onClose={() => setAddHvzModal(false)} onSave={addHvzCost} disabled={!addHvzForm.datum_von && !addHvzForm.datum_bis && !addHvzForm.ek_preis && !addHvzForm.vk_preis}>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-xs font-medium text-slate-500 mb-1">Von (Datum)</label>
                                    <input type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={addHvzForm.datum_von} onChange={e => setAddHvzForm({ ...addHvzForm, datum_von: e.target.value })} /></div>
                                <div><label className="block text-xs font-medium text-slate-500 mb-1">Bis (Datum)</label>
                                    <input type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={addHvzForm.datum_bis} onChange={e => setAddHvzForm({ ...addHvzForm, datum_bis: e.target.value })} /></div>
                            </div>
                            <div><label className="block text-xs font-medium text-slate-500 mb-1">Tage</label>
                                <input type="number" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={addHvzForm.tage === 0 ? '' : (addHvzForm.tage ?? '')} onChange={e => setAddHvzForm({ ...addHvzForm, tage: e.target.value === '' ? 0 : +e.target.value })} onFocus={e => e.target.select()} /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-xs font-medium text-slate-500 mb-1">EK-Preis (€)</label>
                                    <input type="number" step="0.01" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={addHvzForm.ek_preis === 0 ? '' : (addHvzForm.ek_preis ?? '')} onChange={e => setAddHvzForm({ ...addHvzForm, ek_preis: e.target.value === '' ? 0 : +e.target.value })} onFocus={e => e.target.select()} /></div>
                                <div><label className="block text-xs font-medium text-slate-500 mb-1">VK-Preis (€)</label>
                                    <input type="number" step="0.01" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={addHvzForm.vk_preis === 0 ? '' : (addHvzForm.vk_preis ?? '')} onChange={e => setAddHvzForm({ ...addHvzForm, vk_preis: e.target.value === '' ? 0 : +e.target.value })} onFocus={e => e.target.select()} /></div>
                            </div>
                        </div>
                    </Modal>}

                    {/* ======= ADD BNK MODAL ======= */}
                    {addBnkModal && <Modal title="Diesel (BNK) hinzufügen" onClose={() => setAddBnkModal(false)} onSave={addBnkCost} disabled={!addBnkForm.beschreibung}>
                        <div className="space-y-3">
                            <div><label className="block text-xs font-medium text-slate-500 mb-1">Beschreibung</label>
                                <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={addBnkForm.beschreibung} onChange={e => setAddBnkForm({ ...addBnkForm, beschreibung: e.target.value })} /></div>
                            <div><label className="block text-xs font-medium text-slate-500 mb-1">Menge</label>
                                <input type="number" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={addBnkForm.menge === 0 ? '' : (addBnkForm.menge ?? '')} onChange={e => setAddBnkForm({ ...addBnkForm, menge: e.target.value === '' ? 0 : +e.target.value })} onFocus={e => e.target.select()} /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-xs font-medium text-slate-500 mb-1">EK-Preis (€)</label>
                                    <input type="number" step="0.01" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={addBnkForm.ek_preis === 0 ? '' : (addBnkForm.ek_preis ?? '')} onChange={e => setAddBnkForm({ ...addBnkForm, ek_preis: e.target.value === '' ? 0 : +e.target.value })} onFocus={e => e.target.select()} /></div>
                                <div><label className="block text-xs font-medium text-slate-500 mb-1">VK-Preis (€)</label>
                                    <input type="number" step="0.01" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={addBnkForm.vk_preis === 0 ? '' : (addBnkForm.vk_preis ?? '')} onChange={e => setAddBnkForm({ ...addBnkForm, vk_preis: e.target.value === '' ? 0 : +e.target.value })} onFocus={e => e.target.select()} /></div>
                            </div>
                        </div>
                    </Modal>}
                </div>
            </div>
        </div>
    );
}

// -- Helper Components --
function KpiCard({ label, value, icon, color, bgColor }: { label: string; value: string; icon: React.ReactNode; color: string; bgColor: string }) {
    return (<div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2"><span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span><div className={cn('p-2 rounded-lg', bgColor, color)}>{icon}</div></div>
        <div className={cn('text-2xl font-bold', color)}>{value}</div>
    </div>);
}

function CostSection({ title, icon, total, color, children, actions }: { title: string; icon: React.ReactNode; total: number; color: string; children: React.ReactNode; actions?: React.ReactNode }) {
    const colorMap: Record<string, string> = { blue: 'border-l-blue-500', amber: 'border-l-amber-500', sky: 'border-l-sky-500', green: 'border-l-green-500', purple: 'border-l-purple-500', red: 'border-l-red-500', orange: 'border-l-orange-500' };
    return (<div className={cn('bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden border-l-4', colorMap[color] || 'border-l-slate-300')}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-700">{icon}<span className="font-semibold">{title}</span></div>
            <div className="flex items-center gap-4">{actions}<span className="text-lg font-bold text-slate-800">{eur(total)}</span></div>
        </div>{children}
    </div>);
}

function Modal({ title, onClose, onSave, disabled, children }: { title: string; onClose: () => void; onSave: () => void; disabled?: boolean; children: React.ReactNode }) {
    return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-6 py-4"><h2 className="text-lg font-bold text-slate-800">{title}</h2><button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X className="h-5 w-5 text-slate-400" /></button></div>
            <div className="p-6">{children}</div>
            <div className="flex justify-end gap-3 border-t px-6 py-4">
                <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 rounded-lg border border-slate-300 hover:bg-slate-50">Abbrechen</button>
                <button onClick={onSave} disabled={disabled} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-sm"><Save className="h-4 w-4" /> Hinzufügen</button>
            </div>
        </div>
    </div>);
}

function SortableCostSection(props: any) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: props.id });
    const style = { transform: CSS.Transform.toString(transform), transition };
    return (
        <div ref={setNodeRef} style={style} className="relative group">
            <div className="absolute top-2 right-2 bg-slate-100 hover:bg-slate-200 text-slate-400 p-1.5 rounded-lg cursor-grab active:cursor-grabbing z-10 transition-opacity opacity-0 group-hover:opacity-100" {...attributes} {...listeners}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1" /><circle cx="9" cy="5" r="1" /><circle cx="9" cy="19" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="19" r="1" /></svg>
            </div>
            {props.children}
        </div>
    );
}
