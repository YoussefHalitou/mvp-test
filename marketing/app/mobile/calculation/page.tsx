'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/toast';
import { Calculator, Plus, X, Save, Loader2, Trash2, Users, Package, Truck, Wrench, Receipt, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';
import { AnimatePresence, motion } from 'framer-motion';

type Project = Database['public']['Tables']['t_projects']['Row'];
type CostExtra = Database['public']['Tables']['t_project_costs_extra']['Row'];
type RevenueItem = Database['public']['Tables']['t_project_revenue_items']['Row'];

const COST_TABS = [
    { id: 'personnel', label: 'Personal', icon: Users },
    { id: 'materials', label: 'Material', icon: Package },
    { id: 'vehicles', label: 'Fahrzeuge', icon: Truck },
    { id: 'services', label: 'Leistungen', icon: Wrench },
    { id: 'revenue', label: 'Erlöse', icon: Receipt },
    { id: 'summary', label: 'Übersicht', icon: BarChart3 },
] as const;

type CostTabId = typeof COST_TABS[number]['id'];

export default function MobileCalculationPage() {
    const { toast } = useToast();
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<CostTabId>('personnel');
    const [costs, setCosts] = useState<CostExtra[]>([]);
    const [revenue, setRevenue] = useState<RevenueItem[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);
    const [modal, setModal] = useState<{ mode: 'create' | 'edit'; item?: any; type: CostTabId } | null>(null);
    const [form, setForm] = useState<Record<string, any>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            const { data } = await supabase.from('t_projects').select('*').order('created_at', { ascending: false });
            setProjects(data || []);
            setLoading(false);
        })();
    }, []);

    const fetchCosts = useCallback(async () => {
        if (!selectedProjectId) return;
        setLoadingItems(true);
        const [costsRes, revRes] = await Promise.all([
            supabase.from('t_project_costs_extra').select('*').eq('project_id', selectedProjectId).order('created_at'),
            supabase.from('t_project_revenue_items').select('*').eq('project_id', selectedProjectId).order('created_at'),
        ]);
        setCosts(costsRes.data || []);
        setRevenue(revRes.data || []);
        setLoadingItems(false);
    }, [selectedProjectId]);

    useEffect(() => { fetchCosts(); }, [fetchCosts]);

    // Filter costs by cost_type matching tab
    const filteredCosts = costs.filter(c => c.cost_type === activeTab);

    // Summary
    const totalCosts = costs.reduce((s, c) => s + (c.cost || 0), 0);
    const totalRevenue = revenue.reduce((s, r) => s + ((r.qty || 0) * (r.unit_price || 0)), 0);
    const profit = totalRevenue - totalCosts;

    const openCreate = () => {
        if (activeTab === 'revenue') {
            setForm({ position_label: '', qty: 1, unit_price: 0, kind: 'revenue', notes: '' });
        } else {
            setForm({ description: '', cost: 0, cost_type: activeTab, notes: '' });
        }
        setModal({ mode: 'create', type: activeTab });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (activeTab === 'revenue' || modal?.type === 'revenue') {
                const payload = { project_id: selectedProjectId, position_label: form.position_label || 'Position', qty: form.qty || 1, unit_price: form.unit_price || 0, kind: 'revenue' as const, notes: form.notes || null };
                if (modal?.mode === 'create') {
                    const { error } = await supabase.from('t_project_revenue_items').insert(payload);
                    if (error) throw error;
                } else if (modal?.item) {
                    const { error } = await supabase.from('t_project_revenue_items').update(payload).eq('id', modal.item.id);
                    if (error) throw error;
                }
            } else {
                const payload = { project_id: selectedProjectId, cost_type: modal?.type || activeTab, description: form.description || null, cost: form.cost || 0, phase: null };
                if (modal?.mode === 'create') {
                    const { error } = await supabase.from('t_project_costs_extra').insert(payload);
                    if (error) throw error;
                } else if (modal?.item) {
                    const { error } = await supabase.from('t_project_costs_extra').update(payload).eq('cost_id', modal.item.cost_id);
                    if (error) throw error;
                }
            }
            toast('Gespeichert');
            setModal(null); fetchCosts();
        } catch { toast('Fehler', 'error'); }
        setSaving(false);
    };

    const handleDeleteCost = async (costId: string) => {
        if (!confirm('Löschen?')) return;
        await supabase.from('t_project_costs_extra').delete().eq('cost_id', costId);
        fetchCosts();
    };

    const handleDeleteRevenue = async (id: string) => {
        if (!confirm('Löschen?')) return;
        await supabase.from('t_project_revenue_items').delete().eq('id', id);
        fetchCosts();
    };

    return (
        <div className="flex flex-col min-h-full">
            {/* Project selector */}
            <div className="sticky top-[calc(64px+env(safe-area-inset-top,0px))] z-30 bg-white border-b border-slate-200 shadow-sm px-4 sm:px-6 py-3">
                <select className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white"
                    value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}>
                    <option value="">Projekt auswählen...</option>
                    {projects.map(p => <option key={p.project_id} value={p.project_id}>{p.project_code} — {p.name}</option>)}
                </select>
                {/* Cost tabs */}
                {selectedProjectId && (
                    <div className="flex overflow-x-auto gap-1 mt-2 -mx-1 px-1 pb-1">
                        {COST_TABS.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                    className={cn('flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-colors shrink-0',
                                        activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'text-slate-500 bg-slate-50')}>
                                    <Icon className="w-3 h-3" /> {tab.label}
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
            ) : loadingItems ? (
                <div className="flex-1 flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
            ) : activeTab === 'summary' ? (
                <div className="p-4 sm:p-6 space-y-4">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
                        <h3 className="text-sm font-bold text-slate-700">Kostenübersicht</h3>
                        {['personnel', 'materials', 'vehicles', 'services'].map(cat => {
                            const catTotal = costs.filter(c => c.cost_type === cat).reduce((s, c) => s + (c.cost || 0), 0);
                            const label = COST_TABS.find(t => t.id === cat)?.label || cat;
                            return (
                                <div key={cat} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                                    <span className="text-xs text-slate-600">{label}</span>
                                    <span className="text-xs font-semibold text-slate-700">{catTotal.toFixed(2)}€</span>
                                </div>
                            );
                        })}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                            <span className="text-sm font-bold text-slate-800">Gesamtkosten</span>
                            <span className="text-sm font-bold text-red-600">{totalCosts.toFixed(2)}€</span>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                        <div className="flex items-center justify-between py-1.5">
                            <span className="text-sm text-slate-600">Erlöse</span>
                            <span className="text-sm font-semibold text-green-600">{totalRevenue.toFixed(2)}€</span>
                        </div>
                        <div className="flex items-center justify-between py-1.5 border-t border-slate-200 mt-2 pt-2">
                            <span className="text-sm font-bold text-slate-800">Gewinn / Verlust</span>
                            <span className={cn('text-sm font-bold', profit >= 0 ? 'text-green-600' : 'text-red-600')}>{profit.toFixed(2)}€</span>
                        </div>
                    </div>
                </div>
            ) : activeTab === 'revenue' ? (
                <div className="p-4 sm:p-6 space-y-3">
                    {revenue.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 bg-white rounded-xl border-2 border-dashed border-slate-200"><p className="text-sm">Keine Erlöse</p></div>
                    ) : revenue.map(r => (
                        <div key={r.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-700">{r.position_label || '—'}</p>
                                <p className="text-xs text-slate-400">{r.qty}x · {(r.unit_price || 0).toFixed(2)}€ = <span className="font-semibold text-green-600">{((r.qty || 0) * (r.unit_price || 0)).toFixed(2)}€</span></p>
                            </div>
                            <button onClick={() => handleDeleteRevenue(r.id)} className="p-1.5 text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-4 sm:p-6 space-y-3">
                    {filteredCosts.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 bg-white rounded-xl border-2 border-dashed border-slate-200"><p className="text-sm">Keine Einträge</p></div>
                    ) : filteredCosts.map(c => (
                        <div key={c.cost_id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-700">{c.description || '—'}</p>
                                <p className="text-xs text-slate-400"><span className="font-semibold text-slate-700">{(c.cost || 0).toFixed(2)}€</span></p>
                            </div>
                            <button onClick={() => handleDeleteCost(c.cost_id)} className="p-1.5 text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    ))}
                </div>
            )}

            {/* FAB */}
            {selectedProjectId && activeTab !== 'summary' && (
                <button onClick={openCreate}
                    className="fixed fab-position z-30 w-14 h-14 rounded-full bg-blue-600 text-white shadow-xl flex items-center justify-center touch-btn">
                    <Plus className="w-6 h-6" />
                </button>
            )}

            {/* Create Modal */}
            <AnimatePresence>
                {modal && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40" onClick={() => setModal(null)} />
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            data-mobile-sheet="true" className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[85vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between rounded-t-2xl">
                                <h2 className="text-base font-bold text-slate-800">{modal.mode === 'create' ? 'Neuer Eintrag' : 'Bearbeiten'}</h2>
                                <button onClick={() => setModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-400" /></button>
                            </div>
                            <div className="p-4 space-y-3 pb-8">
                                {modal.type === 'revenue' ? (
                                    <>
                                        <div><label className="block text-xs font-medium text-slate-500 mb-1">Position</label>
                                            <input className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" value={form.position_label || ''} onChange={e => setForm({ ...form, position_label: e.target.value })} /></div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div><label className="block text-xs font-medium text-slate-500 mb-1">Menge</label>
                                                <input type="number" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" value={form.qty || 0} onChange={e => setForm({ ...form, qty: parseFloat(e.target.value) || 0 })} /></div>
                                            <div><label className="block text-xs font-medium text-slate-500 mb-1">Preis (€)</label>
                                                <input type="number" step="0.01" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" value={form.unit_price || 0} onChange={e => setForm({ ...form, unit_price: parseFloat(e.target.value) || 0 })} /></div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div><label className="block text-xs font-medium text-slate-500 mb-1">Beschreibung</label>
                                            <input className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                                        <div><label className="block text-xs font-medium text-slate-500 mb-1">Kosten (€)</label>
                                            <input type="number" step="0.01" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" value={form.cost || 0} onChange={e => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })} /></div>
                                    </>
                                )}
                                <div><label className="block text-xs font-medium text-slate-500 mb-1">Notizen</label>
                                    <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm resize-none" rows={2} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
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
