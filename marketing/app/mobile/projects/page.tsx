'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/components/ui/toast';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Search, Plus, X, Save, Loader2, Trash2, MapPin, Calendar, Tag, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { requireSupabaseSuccess } from '@/lib/supabase-result';
import { Database } from '@/types/supabase';
import { AnimatePresence, motion } from 'framer-motion';

type Project = Database['public']['Tables']['t_projects']['Row'];
type ProjectInsert = Database['public']['Tables']['t_projects']['Insert'];

const SERVICE_TYPES = ['Umzug', 'Entrümpelung', 'Transport', 'Einlagerung', 'Malerarbeiten', 'Kartonlieferung', 'Sonstiges'];
const STATUS_OPTIONS = ['In Planung', 'Bestätigt', 'Abgeschlossen', 'Storniert'];

const EMPTY_FORM: ProjectInsert = {
    project_code: '', name: '', strasse: '', nr: '', plz: '', ort: '',
    telefon: '', email: '', notes: '', dienstleistungen: '', offer_type: '',
    project_date: null, project_time: '', project_start_date: null, project_end_date: null,
    anrede: '',
};

export default function MobileProjectsPage() {
    const { toast } = useToast();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [modal, setModal] = useState<{ mode: 'create' | 'edit'; project?: Project } | null>(null);
    const [form, setForm] = useState<ProjectInsert>(EMPTY_FORM);

    const fetchProjects = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase.from('t_projects').select('*').order('created_at', { ascending: false });
        setProjects(data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchProjects(); }, [fetchProjects]);

    const filtered = useMemo(() => {
        if (!search) return projects;
        const low = search.toLowerCase();
        return projects.filter(p => p.name?.toLowerCase().includes(low) || p.ort?.toLowerCase().includes(low) || p.project_code?.toLowerCase().includes(low));
    }, [projects, search]);

    const openCreate = () => { setForm(EMPTY_FORM); setModal({ mode: 'create' }); };
    const openEdit = (p: Project) => {
        setForm({
            project_code: p.project_code || '', name: p.name || '', strasse: p.strasse || '', nr: p.nr || '',
            plz: p.plz || '', ort: p.ort || '', telefon: p.telefon || '', email: p.email || '',
            notes: p.notes || '', dienstleistungen: p.dienstleistungen || '', offer_type: p.offer_type || '',
            project_date: p.project_date, project_time: p.project_time || '',
            project_start_date: p.project_start_date, project_end_date: p.project_end_date, anrede: p.anrede || '',
        });
        setModal({ mode: 'edit', project: p });
    };

    const handleSave = async () => {
        if (!form.name) return;
        setSaving(true);
        try {
            if (modal?.mode === 'create') {
                const { error } = await supabase.from('t_projects').insert(form as any);
                if (error) throw error;
                toast('Projekt erstellt');
            } else if (modal?.project) {
                const { error } = await supabase.from('t_projects').update(form as any).eq('project_id', modal.project.project_id);
                if (error) throw error;
                toast('Projekt aktualisiert');
            }
            setModal(null); fetchProjects();
        } catch { toast('Fehler beim Speichern', 'error'); }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Projekt wirklich löschen?')) return;
        setProjects(prev => prev.filter(p => p.project_id !== id));
        try {
            requireSupabaseSuccess(await supabase.from('t_projects').delete().eq('project_id', id));
        } catch {
            toast('Fehler beim Löschen', 'error');
            await fetchProjects();
        }
    };

    const setField = (key: keyof ProjectInsert, val: string) => setForm(prev => ({ ...prev, [key]: val }));

    return (
        <div className="flex flex-col min-h-full">
            {/* Search bar */}
            <div className="sticky top-[calc(64px+env(safe-area-inset-top,0px))] z-30 bg-white border-b border-slate-200 shadow-sm px-4 sm:px-6 py-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="Suche nach Name, Ort, Code..." value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </div>
                <p className="text-xs text-slate-400 mt-2">{filtered.length} Projekte</p>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
            ) : (
                <div className="p-4 space-y-3">
                    {filtered.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 bg-white rounded-xl border-2 border-dashed border-slate-200">
                            <p className="text-sm">Keine Projekte gefunden.</p>
                        </div>
                    ) : filtered.map(p => (
                        <div key={p.project_id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <button onClick={() => setExpandedId(expandedId === p.project_id ? null : p.project_id)}
                                className="w-full text-left px-4 py-3">
                                <div className="flex items-start justify-between">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            {p.project_code && <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{p.project_code}</span>}
                                            {p.status && <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                                                p.status === 'Bestätigt' ? 'bg-green-100 text-green-700' : p.status === 'Storniert' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                            )}>{p.status}</span>}
                                        </div>
                                        <h4 className="text-sm font-bold text-slate-800 truncate">{p.name || 'Ohne Name'}</h4>
                                        <div className="flex items-center gap-3 mt-1">
                                            {p.ort && <span className="text-xs text-slate-500 flex items-center gap-0.5"><MapPin className="w-3 h-3" />{p.ort}</span>}
                                            {p.project_date && <span className="text-xs text-slate-400 flex items-center gap-0.5"><Calendar className="w-3 h-3" />{format(new Date(p.project_date), 'dd.MM.yy')}</span>}
                                        </div>
                                    </div>
                                    {expandedId === p.project_id ? <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />}
                                </div>
                            </button>
                            {expandedId === p.project_id && (
                                <div className="border-t border-slate-100 px-4 py-3 space-y-2 bg-slate-50/50">
                                    {p.dienstleistungen && <p className="text-xs"><span className="text-slate-400">Service:</span> <span className="text-slate-600">{p.dienstleistungen}</span></p>}
                                    {p.strasse && <p className="text-xs"><span className="text-slate-400">Adresse:</span> <span className="text-slate-600">{p.strasse} {p.nr}, {p.plz} {p.ort}</span></p>}
                                    {p.telefon && <p className="text-xs"><span className="text-slate-400">Tel:</span> <span className="text-slate-600">{p.telefon}</span></p>}
                                    {p.email && <p className="text-xs"><span className="text-slate-400">Email:</span> <span className="text-slate-600">{p.email}</span></p>}
                                    {p.notes && <p className="text-xs italic text-slate-500">{p.notes}</p>}
                                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                                        <button onClick={() => openEdit(p)} className="flex-1 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg">Bearbeiten</button>
                                        <button onClick={() => handleDelete(p.project_id)} className="py-2 px-3 text-xs font-medium text-red-500 bg-red-50 rounded-lg">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
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
                            data-mobile-sheet="true" className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between rounded-t-2xl">
                                <h2 className="text-base font-bold text-slate-800">{modal.mode === 'create' ? 'Neues Projekt' : 'Projekt bearbeiten'}</h2>
                                <button onClick={() => setModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-400" /></button>
                            </div>
                            <div className="p-4 sm:p-6 space-y-3 pb-24">
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="block text-xs font-medium text-slate-500 mb-1">Projektcode</label>
                                        <input className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" value={form.project_code || ''} onChange={e => setField('project_code', e.target.value)} /></div>
                                    <div><label className="block text-xs font-medium text-slate-500 mb-1">Service</label>
                                        <select className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm bg-white" value={form.dienstleistungen || ''} onChange={e => setField('dienstleistungen', e.target.value)}>
                                            <option value="">—</option>{SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                                </div>
                                <div><label className="block text-xs font-medium text-slate-500 mb-1">Name *</label>
                                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" value={form.name || ''} onChange={e => setField('name', e.target.value)} /></div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="col-span-2"><label className="block text-xs font-medium text-slate-500 mb-1">Straße</label>
                                        <input className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" value={form.strasse || ''} onChange={e => setField('strasse', e.target.value)} /></div>
                                    <div><label className="block text-xs font-medium text-slate-500 mb-1">Nr.</label>
                                        <input className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" value={form.nr || ''} onChange={e => setField('nr', e.target.value)} /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="block text-xs font-medium text-slate-500 mb-1">PLZ</label>
                                        <input className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" value={form.plz || ''} onChange={e => setField('plz', e.target.value)} /></div>
                                    <div><label className="block text-xs font-medium text-slate-500 mb-1">Ort</label>
                                        <input className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" value={form.ort || ''} onChange={e => setField('ort', e.target.value)} /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="block text-xs font-medium text-slate-500 mb-1">Telefon</label>
                                        <input type="tel" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" value={form.telefon || ''} onChange={e => setField('telefon', e.target.value)} /></div>
                                    <div><label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                                        <input type="email" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" value={form.email || ''} onChange={e => setField('email', e.target.value)} /></div>
                                </div>
                                <div><label className="block text-xs font-medium text-slate-500 mb-1">Datum</label>
                                    <input type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" value={form.project_date || ''} onChange={e => setField('project_date', e.target.value)} /></div>
                                <div><label className="block text-xs font-medium text-slate-500 mb-1">Notizen</label>
                                    <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm resize-none" rows={3} value={form.notes || ''} onChange={e => setField('notes', e.target.value)} /></div>
                                <div className="flex gap-3 pt-2">
                                    <button onClick={() => setModal(null)} className="flex-1 px-4 py-3 text-sm font-medium text-slate-600 rounded-xl border border-slate-300">Abbrechen</button>
                                    <button onClick={handleSave} disabled={saving || !form.name}
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
