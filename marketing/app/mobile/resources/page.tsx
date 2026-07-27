'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/toast';
import { Users, Truck, Package, Wrench, Plus, X, Save, Loader2, Trash2, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { requireSupabaseSuccess } from '@/lib/supabase-result';
import { Database } from '@/types/supabase';
import { NumberInput } from '@/components/ui/number-input';
import { AnimatePresence, motion } from 'framer-motion';

type Employee = Database['public']['Tables']['t_employees']['Row'];
type Vehicle = Database['public']['Tables']['t_vehicles']['Row'];
type MaterialPrice = Database['public']['Tables']['t_material_prices']['Row'];
type ServicePrice = Database['public']['Tables']['t_service_prices']['Row'];
type Material = Database['public']['Tables']['t_materials']['Row'] & { prices?: MaterialPrice[] };
type Service = Database['public']['Tables']['t_services']['Row'] & { prices?: ServicePrice[] };

const TABS = [
    { id: 'employees', label: 'Mitarbeiter', icon: Users },
    { id: 'vehicles', label: 'Fahrzeuge', icon: Truck },
    { id: 'materials', label: 'Material', icon: Package },
    { id: 'services', label: 'Leistungen', icon: Wrench },
] as const;

type TabId = typeof TABS[number]['id'];

export default function MobileResourcesPage() {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<TabId>('employees');
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [modal, setModal] = useState<{ type: TabId; mode: 'create' | 'edit'; data?: any } | null>(null);
    const [form, setForm] = useState<Record<string, any>>({});
    const [saving, setSaving] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [empRes, vehRes, matRes, svcRes] = await Promise.all([
                supabase.from('t_employees').select('*').eq('is_active', true).order('name'),
                supabase.from('t_vehicles').select('*').eq('is_deleted', false).order('nickname'),
                supabase.from('t_materials').select('*, prices:t_material_prices(*)').order('name'),
                supabase.from('t_services').select('*, prices:t_service_prices(*)').order('name'),
            ]);
            [empRes, vehRes, matRes, svcRes].forEach(requireSupabaseSuccess);
            setEmployees(empRes.data || []);
            setVehicles(vehRes.data || []);
            setMaterials((matRes.data || []) as Material[]);
            setServices((svcRes.data || []) as Service[]);
        } catch (error) {
            console.error('Failed to load mobile resources:', error);
            toast('Stammdaten konnten nicht vollständig geladen werden', 'error');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Generic save
    const handleSave = async () => {
        setSaving(true);
        try {
            const table = activeTab === 'employees' ? 't_employees' : activeTab === 'vehicles' ? 't_vehicles' : activeTab === 'materials' ? 't_materials' : 't_services';
            const idField = activeTab === 'employees' ? 'employee_id' : activeTab === 'vehicles' ? 'vehicle_id' : activeTab === 'materials' ? 'material_id' : 'service_id';
            const recordId = modal?.data?.[idField] || (activeTab === 'materials' ? `MAT-${Date.now()}` : activeTab === 'services' ? `SVC-${Date.now()}` : null);
            const baseForm = { ...form };
            delete baseForm.cost_per_unit;
            delete baseForm.price_per_unit;

            if (modal?.mode === 'create') {
                requireSupabaseSuccess(await supabase.from(table).insert({
                    ...baseForm,
                    ...(recordId ? { [idField]: recordId } : {}),
                } as any));
                toast('Erstellt');
            } else if (modal?.data) {
                requireSupabaseSuccess(await supabase.from(table).update(baseForm as any).eq(idField, modal.data[idField]));
                toast('Aktualisiert');
            }

            if (activeTab === 'materials' && recordId) {
                requireSupabaseSuccess(await supabase.from('t_material_prices').upsert({
                    material_id: recordId,
                    cost_per_unit: Number(form.cost_per_unit) || 0,
                    price_per_unit: Number(form.price_per_unit) || 0,
                }));
            } else if (activeTab === 'services' && recordId) {
                const existingPrice = modal?.data?.prices?.[0] as ServicePrice | undefined;
                requireSupabaseSuccess(await supabase.from('t_service_prices').upsert({
                    price_id: existingPrice?.price_id || `PRICE-${Date.now()}`,
                    service_id: recordId,
                    supplier: existingPrice?.supplier || 'EVD',
                    unit: form.default_unit || 'Std',
                    cost_per_unit: Number(form.cost_per_unit) || 0,
                    customer_price_per_unit: Number(form.price_per_unit) || 0,
                }));
            }
            setModal(null);
            await fetchData();
        } catch (error) {
            console.error('Failed to save mobile resource:', error);
            toast('Fehler beim Speichern', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Wirklich löschen?')) return;
        const table = activeTab === 'employees' ? 't_employees' : activeTab === 'vehicles' ? 't_vehicles' : activeTab === 'materials' ? 't_materials' : 't_services';
        const idField = activeTab === 'employees' ? 'employee_id' : activeTab === 'vehicles' ? 'vehicle_id' : activeTab === 'materials' ? 'material_id' : 'service_id';

        try {
            if (activeTab === 'employees') {
                requireSupabaseSuccess(await supabase.from(table).update({ is_active: false } as any).eq(idField, id));
            } else if (activeTab === 'vehicles') {
                requireSupabaseSuccess(await supabase.from(table).update({ is_deleted: true } as any).eq(idField, id));
            } else {
                requireSupabaseSuccess(await supabase.from(table).delete().eq(idField, id));
            }
            toast('Gelöscht');
            await fetchData();
        } catch (error) {
            console.error('Failed to delete mobile resource:', error);
            toast('Fehler beim Löschen', 'error');
        }
    };

    const openCreate = () => {
        if (activeTab === 'employees') setForm({ name: '', employee_code: '', contract_type: '', role: '' });
        else if (activeTab === 'vehicles') setForm({ nickname: '', license_plate: '', type: '' });
        else if (activeTab === 'materials') setForm({ name: '', unit: '', cost_per_unit: 0, price_per_unit: 0 });
        else setForm({ name: '', default_unit: '', cost_per_unit: 0, price_per_unit: 0 });
        setModal({ type: activeTab, mode: 'create' });
    };

    const openEdit = (data: any) => {
        if (activeTab === 'employees') setForm({ name: data.name || '', employee_code: data.employee_code || '', contract_type: data.contract_type || '', role: data.role || '' });
        else if (activeTab === 'vehicles') setForm({ nickname: data.nickname || '', license_plate: data.license_plate || '', type: data.type || '' });
        else if (activeTab === 'materials') {
            const price = data.prices?.[0];
            setForm({ name: data.name || '', unit: data.unit || '', cost_per_unit: price?.cost_per_unit || 0, price_per_unit: price?.price_per_unit || 0 });
        } else {
            const price = data.prices?.[0];
            setForm({ name: data.name || '', default_unit: data.default_unit || '', cost_per_unit: price?.cost_per_unit || 0, price_per_unit: price?.customer_price_per_unit || 0 });
        }
        setModal({ type: activeTab, mode: 'edit', data });
    };

    // Filter
    const items = activeTab === 'employees' ? employees : activeTab === 'vehicles' ? vehicles : activeTab === 'materials' ? materials : services;
    const filtered = search
        ? items.filter(i => JSON.stringify(i).toLowerCase().includes(search.toLowerCase()))
        : items;

    const getItemId = (item: any) => item.employee_id || item.vehicle_id || item.material_id || item.service_id;
    const getItemName = (item: any) => item.name || item.nickname || '—';
    const getItemSub = (item: any) => {
        if (activeTab === 'employees') return item.contract_type || item.role || '';
        if (activeTab === 'vehicles') return item.license_plate || '';
        if (activeTab === 'materials') return `${item.unit || '—'} · ${item.prices?.[0]?.cost_per_unit?.toFixed(2) || '0'}€`;
        return `${item.default_unit || '—'} · ${item.prices?.[0]?.cost_per_unit?.toFixed(2) || '0'}€`;
    };

    return (
        <div className="flex flex-col min-h-full">
            {/* Tab bar */}
            <div className="sticky top-[calc(64px+env(safe-area-inset-top,0px))] z-30 bg-white border-b border-slate-200 shadow-sm">
                <div className="flex overflow-x-auto px-2 py-2 gap-1">
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSearch(''); setExpandedId(null); }}
                                className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0',
                                    activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'text-slate-500 bg-slate-50')}>
                                <Icon className="w-3.5 h-3.5" /> {tab.label}
                            </button>
                        );
                    })}
                </div>
                {/* Search */}
                <div className="px-4 pb-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" placeholder="Suche..." value={search} onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
            ) : (
                <div className="p-4 sm:p-6 pb-24 space-y-3">
                    <p className="text-xs text-slate-400 mb-1">{filtered.length} Einträge</p>
                    {filtered.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 bg-white rounded-xl border-2 border-dashed border-slate-200">
                            <p className="text-sm">Keine Einträge gefunden.</p>
                        </div>
                    ) : filtered.map(item => {
                        const id = getItemId(item);
                        const isExpanded = expandedId === id;
                        return (
                            <div key={id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <button onClick={() => setExpandedId(isExpanded ? null : id)} className="w-full text-left px-4 py-3 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">{getItemName(item)}</p>
                                        <p className="text-xs text-slate-400">{getItemSub(item)}</p>
                                    </div>
                                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                </button>
                                {isExpanded && (
                                    <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50 space-y-1">
                                        {Object.entries(item).filter(([k]) => !['employee_id', 'vehicle_id', 'material_id', 'service_id', 'created_at', 'is_active', 'is_deleted'].includes(k) && item[k as keyof typeof item] != null).map(([k, v]) => (
                                            <p key={k} className="text-xs"><span className="text-slate-400 capitalize">{k.replace(/_/g, ' ')}:</span> <span className="text-slate-600">{String(v)}</span></p>
                                        ))}
                                        <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                                            <button onClick={() => openEdit(item)} className="flex-1 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg">Bearbeiten</button>
                                            <button onClick={() => handleDelete(id)} className="py-2 px-3 text-xs font-medium text-red-500 bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* FAB */}
            <button onClick={openCreate}
                className="fixed fab-position z-30 w-14 h-14 rounded-full bg-blue-600 text-white shadow-xl flex items-center justify-center touch-btn">
                <Plus className="w-6 h-6" />
            </button>

            {/* Create/Edit Modal */}
            <AnimatePresence>
                {modal && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40" onClick={() => setModal(null)} />
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            data-mobile-sheet="true" className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[85vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between rounded-t-2xl">
                                <h2 className="text-base font-bold text-slate-800">{modal.mode === 'create' ? 'Neu' : 'Bearbeiten'}</h2>
                                <button onClick={() => setModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-400" /></button>
                            </div>
                            <div className="p-4 space-y-3 pb-8">
                                {Object.entries(form).map(([key, val]) => (
                                    <div key={key}>
                                        <label className="block text-xs font-medium text-slate-500 mb-1 capitalize">{key.replace(/_/g, ' ')}</label>
                                        {typeof val === 'number' ? (
                                            <NumberInput step="0.01" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                                                value={val} onValueChange={value => setForm(prev => ({ ...prev, [key]: value ?? 0 }))} />
                                        ) : (
                                            <input className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                                                value={val || ''} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))} />
                                        )}
                                    </div>
                                ))}
                                <div className="flex gap-3 pt-2">
                                    <button onClick={() => setModal(null)} className="flex-1 px-4 py-3 text-sm font-medium text-slate-600 rounded-xl border border-slate-300">Abbrechen</button>
                                    <button onClick={handleSave} disabled={saving}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-blue-600 rounded-xl disabled:opacity-50">
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Speichern
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
