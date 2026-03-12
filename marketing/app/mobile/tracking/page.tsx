'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/toast';
import { format, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Save, Loader2, Trash2, Plus, X, Clock, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';
import { formatTimeInput } from '@/lib/timeUtils';
import { AnimatePresence, motion } from 'framer-motion';

type Project = { project_id: string; name: string; project_code: string | null; project_date?: string | null; created_at?: string };
type Employee = { employee_id: string; name: string; employee_code: string | null };
type MorningPlan = { plan_id: string; project_id: string | null; project?: Project };
type WorkAssignment = Database['public']['Tables']['t_work_assignments']['Row'];

interface TrackingRow {
    _tempId: string; pair_id: string | null; project_id: string | null;
    project_name: string; project_code: string; plan_id: string | null;
    mitarbeiter: string; employee_id: string | null;
    lis_von: string; lis_bis: string; kunde_von: string; kunde_bis: string;
    pause_min: number; notes: string; datum?: string; isNew: boolean;
}

const WORK_TYPES = ['Büroarbeit', 'Lager', 'Werkstatt', 'Reinigung', 'Fahrt', 'Schulung', 'Entrümpelung', 'Sonstiges'];

export default function MobileTrackingPage() {
    const { toast } = useToast();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [rows, setRows] = useState<TrackingRow[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'timepairs' | 'workassignments'>('timepairs');
    const [workAssignments, setWorkAssignments] = useState<WorkAssignment[]>([]);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    // WA modal
    const [waModal, setWaModal] = useState<{ mode: 'create' | 'edit'; item?: WorkAssignment } | null>(null);
    const [waForm, setWaForm] = useState({ work_type: '', employee_name: '', employee_code: '', assignment_date: '', start_time: '', end_time: '', break_minutes: 0, hours_estimated: 0, status: 'Offen', notes: '', project_id: '' });
    const [savingWa, setSavingWa] = useState(false);

    const dateStr = format(currentDate, 'yyyy-MM-dd');

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [empRes, projRes] = await Promise.all([
            supabase.from('t_employees').select('employee_id, name, employee_code').eq('is_active', true).order('name'),
            supabase.from('t_projects').select('project_id, name, project_code, project_date, created_at').order('created_at', { ascending: false }),
        ]);
        setEmployees(empRes.data || []);
        setProjects(projRes.data || []);

        const [tpRes, planRes, waRes] = await Promise.all([
            supabase.from('t_time_pairs').select('*').eq('datum', dateStr).order('mitarbeiter'),
            supabase.from('t_morningplan').select('*, project:t_projects(project_id, name, project_code)').eq('plan_date', dateStr),
            supabase.from('t_work_assignments').select('*').eq('assignment_date', dateStr).order('employee_name'),
        ]);
        const plans = (planRes.data || []) as (MorningPlan & { project: Project })[];
        const timePairs = tpRes.data || [];
        const trackingRows: TrackingRow[] = timePairs.map(tp => {
            const plan = plans.find(p => p.plan_id === tp.plan_id) || plans.find(p => p.project_id === tp.project_id);
            return {
                _tempId: tp.pair_id || `tp-${Math.random()}`, pair_id: tp.pair_id, project_id: tp.project_id,
                project_name: plan?.project?.name || tp.project_id || '', project_code: plan?.project?.project_code || '',
                plan_id: tp.plan_id, mitarbeiter: tp.mitarbeiter, employee_id: null,
                lis_von: tp.lis_von?.substring(0, 5) || '', lis_bis: tp.lis_bis?.substring(0, 5) || '',
                kunde_von: tp.kunde_von?.substring(0, 5) || '', kunde_bis: tp.kunde_bis?.substring(0, 5) || '',
                pause_min: tp.pause_min || 0, notes: '', isNew: false,
            };
        });
        // Auto-merge plan staff
        const { data: planStaff } = await supabase.from('t_morningplan_staff')
            .select('*, plan:t_morningplan!inner(*, project:t_projects(project_id, name, project_code)), employee:t_employees(employee_id, name)')
            .eq('plan.plan_date', dateStr);
        const existingKeys = new Set(trackingRows.map(r => `${r.project_id}-${r.mitarbeiter}`));
        const staff = (planStaff as any[] || []).filter((s: any) => s.plan?.plan_date === dateStr);
        staff.forEach((s: any) => {
            const key = `${s.plan?.project_id}-${s.employee?.name}`;
            if (!existingKeys.has(key) && s.employee?.name) {
                trackingRows.push({
                    _tempId: `new-${Math.random()}`, pair_id: null, project_id: s.plan?.project_id,
                    project_name: s.plan?.project?.name || '', project_code: s.plan?.project?.project_code || '',
                    plan_id: s.plan?.plan_id, mitarbeiter: s.employee.name, employee_id: s.employee.employee_id,
                    lis_von: s.individual_start_time?.substring(0, 5) || s.plan?.start_time?.substring(0, 5) || '07:00',
                    lis_bis: '', kunde_von: '', kunde_bis: '', pause_min: 0, notes: '', isNew: true,
                });
            }
        });
        setRows(trackingRows);
        setWorkAssignments(waRes.data || []);
        setLoading(false);
    }, [dateStr]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const calcHours = (von: string, bis: string, pause: number = 0) => {
        if (!von || !bis) return '—';
        const [vh, vm] = von.split(':').map(Number);
        const [bh, bm] = bis.split(':').map(Number);
        const m = (bh * 60 + bm) - (vh * 60 + vm) - pause;
        return m > 0 ? (m / 60).toFixed(1) : '—';
    };

    const updateRow = (id: string, field: keyof TrackingRow, value: any) => {
        setRows(prev => prev.map(r => r._tempId === id ? { ...r, [field]: value } : r));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await Promise.all(rows.map(row => {
                const record: any = {
                    pair_id: row.pair_id || `${row.project_id}-${row.employee_id}-${dateStr}-${Date.now()}-${Math.random()}`,
                    project_id: row.project_id, plan_id: row.plan_id, datum: dateStr,
                    mitarbeiter: row.mitarbeiter,
                    lis_von: row.lis_von ? `${row.lis_von}:00` : null, lis_bis: row.lis_bis ? `${row.lis_bis}:00` : null,
                    kunde_von: row.kunde_von ? `${row.kunde_von}:00` : null, kunde_bis: row.kunde_bis ? `${row.kunde_bis}:00` : null,
                    pause_min: row.pause_min, updated_at: new Date().toISOString(),
                };
                return supabase.from('t_time_pairs').upsert(record, { onConflict: 'pair_id' });
            }));
            toast('Zeiten gespeichert');
            fetchData();
        } catch { toast('Fehler beim Speichern', 'error'); }
        setSaving(false);
    };

    const handleDelete = async (row: TrackingRow) => {
        if (row.isNew) { setRows(prev => prev.filter(r => r._tempId !== row._tempId)); return; }
        if (confirm('Zeiteintrag löschen?') && row.pair_id) {
            setRows(prev => prev.filter(r => r._tempId !== row._tempId));
            await supabase.from('t_time_pairs').delete().eq('pair_id', row.pair_id);
        }
    };

    const addRowToProject = (projectId: string, projectName: string, projectCode: string) => {
        setRows(prev => [...prev, {
            _tempId: `manual-${Math.random()}`, pair_id: null, project_id: projectId === 'unassigned' ? null : projectId,
            project_name: projectName, project_code: projectCode, plan_id: null, mitarbeiter: '', employee_id: null,
            lis_von: '07:00', lis_bis: '', kunde_von: '', kunde_bis: '', pause_min: 0, notes: '', datum: dateStr, isNew: true,
        }]);
    };

    // WA CRUD
    const openCreateWa = () => {
        setWaForm({ work_type: 'Büroarbeit', employee_name: '', employee_code: '', assignment_date: dateStr, start_time: '08:00', end_time: '16:00', break_minutes: 30, hours_estimated: 0, status: 'Offen', notes: '', project_id: '' });
        setWaModal({ mode: 'create' });
    };
    const saveWa = async () => {
        if (!waForm.employee_name || !waForm.work_type) return;
        setSavingWa(true);
        try {
            const payload = {
                work_type: waForm.work_type, employee_name: waForm.employee_name, employee_code: waForm.employee_code || null,
                assignment_date: waForm.assignment_date, start_time: waForm.start_time ? `${waForm.start_time}:00` : null,
                end_time: waForm.end_time ? `${waForm.end_time}:00` : null, break_minutes: waForm.break_minutes,
                hours_estimated: waForm.hours_estimated, status: waForm.status, notes: waForm.notes || null,
                project_id: waForm.project_id || null,
            };
            if (waModal?.mode === 'create') {
                const { error } = await supabase.from('t_work_assignments').insert(payload);
                if (error) throw error;
                toast('Arbeitseinsatz erstellt');
            } else if (waModal?.item) {
                const { error } = await supabase.from('t_work_assignments').update(payload).eq('assignment_id', waModal.item.assignment_id);
                if (error) throw error;
                toast('Arbeitseinsatz aktualisiert');
            }
            setWaModal(null); fetchData();
        } catch { toast('Fehler beim Speichern', 'error'); }
        setSavingWa(false);
    };
    const deleteWa = async (id: string) => {
        if (!confirm('Löschen?')) return;
        setWorkAssignments(prev => prev.filter(w => w.assignment_id !== id));
        await supabase.from('t_work_assignments').delete().eq('assignment_id', id);
    };

    // Group rows by project
    const grouped = rows.reduce((acc, row) => {
        const key = row.project_id || 'unassigned';
        if (!acc[key]) acc[key] = [];
        acc[key].push(row);
        return acc;
    }, {} as Record<string, TrackingRow[]>);

    return (
        <div className="flex flex-col min-h-full">
            {/* Sub-header */}
            <div className="sticky top-[calc(64px+env(safe-area-inset-top,0px))] z-30 bg-white border-b border-slate-200 shadow-sm">
                <div className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-1">
                        <button onClick={() => setCurrentDate(addDays(currentDate, -1))} className="p-1.5 hover:bg-slate-100 rounded-lg">
                            <ChevronLeft className="w-5 h-5 text-slate-600" />
                        </button>
                        <span className="text-sm font-semibold text-slate-700 min-w-[140px] text-center">
                            {format(currentDate, 'EEE, d. MMM yyyy', { locale: de })}
                        </span>
                        <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className="p-1.5 hover:bg-slate-100 rounded-lg">
                            <ChevronRight className="w-5 h-5 text-slate-600" />
                        </button>
                    </div>
                    <button onClick={() => { setCurrentDate(new Date()); }} className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md">
                        Heute
                    </button>
                </div>
                {/* Tab bar */}
                <div className="flex px-4 gap-2 pb-2">
                    <button onClick={() => setActiveTab('timepairs')}
                        className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors',
                            activeTab === 'timepairs' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 bg-slate-100')}>
                        <Clock className="w-3.5 h-3.5" /> Zeiten ({rows.length})
                    </button>
                    <button onClick={() => setActiveTab('workassignments')}
                        className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors',
                            activeTab === 'workassignments' ? 'bg-orange-100 text-orange-700' : 'text-slate-500 bg-slate-100')}>
                        <Briefcase className="w-3.5 h-3.5" /> Einsätze ({workAssignments.length})
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
            ) : activeTab === 'timepairs' ? (
                <div className="p-4 space-y-6">
                    {Object.entries(grouped).map(([projectId, projectRows]) => {
                        const title = projectId === 'unassigned' ? 'Ohne Projekt' : (projectRows[0]?.project_name || 'Unbenannt');
                        return (
                            <div key={projectId}>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-bold text-slate-700">{title}</h3>
                                    <button onClick={() => addRowToProject(projectId, title, projectRows[0]?.project_code || '')}
                                        className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-md font-medium">
                                        <Plus className="w-3 h-3 inline mr-0.5" />Hinzufügen
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {projectRows.map(row => (
                                        <MobileTimeCard key={row._tempId} row={row} employees={employees}
                                            expanded={expandedRows.has(row._tempId)}
                                            onToggle={() => setExpandedRows(prev => { const s = new Set(prev); s.has(row._tempId) ? s.delete(row._tempId) : s.add(row._tempId); return s; })}
                                            onUpdate={updateRow} onDelete={() => handleDelete(row)} calcHours={calcHours} />
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {/* Save button */}
                    <button onClick={handleSave} disabled={saving}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white font-medium rounded-xl shadow-sm disabled:opacity-50">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Speichern
                    </button>
                </div>
            ) : (
                <div className="p-4 sm:p-6 space-y-4">
                    {workAssignments.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 bg-white rounded-xl border-2 border-dashed border-slate-200">
                            <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">Keine Arbeitseinsätze</p>
                        </div>
                    ) : workAssignments.map(wa => (
                        <div key={wa.assignment_id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{wa.work_type}</span>
                                <span className={cn('text-xs px-2 py-0.5 rounded-full', wa.status === 'Erledigt' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>{wa.status || 'Offen'}</span>
                            </div>
                            <p className="text-sm font-semibold text-slate-800">{wa.employee_name}</p>
                            {wa.project_id && <p className="text-xs text-blue-600 font-medium mt-0.5">{projects.find(p => p.project_id === wa.project_id)?.name || 'Projekt'}</p>}
                            <p className="text-xs text-slate-500 mt-1">
                                {wa.start_time?.substring(0, 5) || '—'} – {wa.end_time?.substring(0, 5) || '—'} · Pause: {wa.break_minutes || 0}min
                            </p>
                            {wa.notes && <p className="text-xs text-slate-400 mt-1 italic">{wa.notes}</p>}
                            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100">
                                <button onClick={() => deleteWa(wa.assignment_id)} className="text-xs text-red-500 hover:text-red-700">Löschen</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* FAB */}
            {activeTab === 'workassignments' && (
                <button onClick={openCreateWa}
                    className="fixed fab-position z-30 w-14 h-14 rounded-full bg-orange-600 text-white shadow-xl flex items-center justify-center touch-btn">
                    <Plus className="w-6 h-6" />
                </button>
            )}

            {/* WA Modal */}
            <AnimatePresence>
                {waModal && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40" onClick={() => setWaModal(null)} />
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            data-mobile-sheet="true" className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between rounded-t-2xl">
                                <h2 className="text-base font-bold text-slate-800">{waModal.mode === 'create' ? 'Neuer Arbeitseinsatz' : 'Bearbeiten'}</h2>
                                <button onClick={() => setWaModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-400" /></button>
                            </div>
                            <div className="p-4 space-y-3 pb-8">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Arbeitstyp</label>
                                    <input list="mobile-work-types-list" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm bg-white" value={waForm.work_type}
                                        onChange={e => setWaForm({ ...waForm, work_type: e.target.value })} placeholder="Typ eingeben oder wählen" />
                                    <datalist id="mobile-work-types-list">
                                        {WORK_TYPES.map(wt => <option key={wt} value={wt} />)}
                                    </datalist>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Mitarbeiter</label>
                                    <select className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm bg-white" value={waForm.employee_name}
                                        onChange={e => { const emp = employees.find(em => em.name === e.target.value); setWaForm({ ...waForm, employee_name: e.target.value, employee_code: emp?.employee_code || '' }); }}>
                                        <option value="">Wählen...</option>
                                        {employees.map(emp => <option key={emp.employee_id} value={emp.name}>{emp.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Projekt (optional)</label>
                                    <select className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm bg-white" value={waForm.project_id}
                                        onChange={e => setWaForm({ ...waForm, project_id: e.target.value })}>
                                        <option value="">Kein Projekt</option>
                                        {[...projects].sort((a, b) => (b.project_date || '').localeCompare(a.project_date || '')).map(p => <option key={p.project_id} value={p.project_id}>{p.name}{p.project_date ? ` — ${new Date(p.project_date).toLocaleDateString('de-DE')}` : ''}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="block text-xs font-medium text-slate-500 mb-1">Start</label>
                                        <input type="time" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" value={waForm.start_time} onChange={e => setWaForm({ ...waForm, start_time: e.target.value })} /></div>
                                    <div><label className="block text-xs font-medium text-slate-500 mb-1">Ende</label>
                                        <input type="time" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" value={waForm.end_time} onChange={e => setWaForm({ ...waForm, end_time: e.target.value })} /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="block text-xs font-medium text-slate-500 mb-1">Pause (min)</label>
                                        <input type="number" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" value={waForm.break_minutes} onChange={e => setWaForm({ ...waForm, break_minutes: parseInt(e.target.value) || 0 })} /></div>
                                    <div><label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                                        <select className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm bg-white" value={waForm.status} onChange={e => setWaForm({ ...waForm, status: e.target.value })}>
                                            <option value="Offen">Offen</option><option value="In Bearbeitung">In Bearbeitung</option><option value="Erledigt">Erledigt</option>
                                        </select></div>
                                </div>
                                <div><label className="block text-xs font-medium text-slate-500 mb-1">Notizen</label>
                                    <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm resize-none" rows={2} value={waForm.notes} onChange={e => setWaForm({ ...waForm, notes: e.target.value })} /></div>
                                <div className="flex gap-3 pt-2">
                                    <button onClick={() => setWaModal(null)} className="flex-1 px-4 py-3 text-sm font-medium text-slate-600 rounded-xl border border-slate-300">Abbrechen</button>
                                    <button onClick={saveWa} disabled={savingWa || !waForm.employee_name}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-orange-600 rounded-xl disabled:opacity-50">
                                        {savingWa ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Speichern
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

// Mobile time entry card
function MobileTimeCard({ row, employees, expanded, onToggle, onUpdate, onDelete, calcHours }: {
    row: TrackingRow; employees: { employee_id: string; name: string }[]; expanded: boolean;
    onToggle: () => void; onUpdate: (id: string, field: keyof TrackingRow, value: any) => void;
    onDelete: () => void; calcHours: (v: string, b: string, p?: number) => string;
}) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <button onClick={onToggle} className="w-full text-left px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                        {row.mitarbeiter?.substring(0, 2).toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{row.mitarbeiter || 'Kein MA'}</p>
                        <p className="text-xs text-slate-400">{row.lis_von || '—'} – {row.lis_bis || '—'} · <span className="font-semibold text-blue-600">{calcHours(row.lis_von, row.lis_bis, row.pause_min)}h</span></p>
                    </div>
                </div>
                {row.isNew && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Neu</span>}
            </button>
            {expanded && (
                <div className="border-t border-slate-100 p-4 space-y-3">
                    <div>
                        <label className="block text-[10px] font-medium text-slate-400 uppercase mb-1">Mitarbeiter</label>
                        <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white" value={row.employee_id || ''}
                            onChange={e => { const emp = employees.find(em => em.employee_id === e.target.value); onUpdate(row._tempId, 'employee_id', e.target.value); if (emp) onUpdate(row._tempId, 'mitarbeiter', emp.name); }}>
                            <option value="">{row.mitarbeiter || 'Wählen...'}</option>
                            {employees.map(emp => <option key={emp.employee_id} value={emp.employee_id}>{emp.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div><label className="block text-[10px] font-medium text-blue-500 uppercase mb-1">LiS Von</label>
                            <input type="time" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={row.lis_von} onChange={e => onUpdate(row._tempId, 'lis_von', e.target.value)} /></div>
                        <div><label className="block text-[10px] font-medium text-blue-500 uppercase mb-1">LiS Bis</label>
                            <input type="time" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={row.lis_bis} onChange={e => onUpdate(row._tempId, 'lis_bis', e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div><label className="block text-[10px] font-medium text-green-500 uppercase mb-1">Kunde Von</label>
                            <input type="time" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={row.kunde_von} onChange={e => onUpdate(row._tempId, 'kunde_von', e.target.value)} /></div>
                        <div><label className="block text-[10px] font-medium text-green-500 uppercase mb-1">Kunde Bis</label>
                            <input type="time" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={row.kunde_bis} onChange={e => onUpdate(row._tempId, 'kunde_bis', e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div><label className="block text-[10px] font-medium text-slate-400 uppercase mb-1">Pause (min)</label>
                            <input type="number" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={row.pause_min} onChange={e => onUpdate(row._tempId, 'pause_min', parseInt(e.target.value) || 0)} /></div>
                        <div className="flex items-end">
                            <button onClick={onDelete} className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50">
                                <Trash2 className="w-3.5 h-3.5" /> Löschen
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
