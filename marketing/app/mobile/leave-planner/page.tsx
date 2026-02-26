'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/components/ui/toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, isSameDay, isSameMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, X, Save, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';
import { AnimatePresence, motion } from 'framer-motion';

type Employee = Database['public']['Tables']['t_employees']['Row'];
type EmployeeEvent = Database['public']['Tables']['t_employee_events']['Row'];

const EVENT_TYPES = ['Urlaub', 'Termin', 'Krankheit', 'Schulung', 'Sonstiges'] as const;
const EVENT_COLORS: Record<string, string> = {
    'Urlaub': 'bg-emerald-500', 'Termin': 'bg-blue-500', 'Krankheit': 'bg-red-500',
    'Schulung': 'bg-purple-500', 'Sonstiges': 'bg-slate-400',
};
const EVENT_BADGE: Record<string, string> = {
    'Urlaub': 'bg-emerald-100 text-emerald-700', 'Termin': 'bg-blue-100 text-blue-700',
    'Krankheit': 'bg-red-100 text-red-700', 'Schulung': 'bg-purple-100 text-purple-700',
    'Sonstiges': 'bg-slate-100 text-slate-700',
};

export default function MobileLeavePlannerPage() {
    const { toast } = useToast();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [events, setEvents] = useState<EmployeeEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [modal, setModal] = useState<{ mode: 'create' | 'edit'; event?: EmployeeEvent } | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ employee_id: '', event_type: 'Urlaub' as string, start_date: '', end_date: '', notes: '' });

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDow = monthStart.getDay() === 0 ? 6 : monthStart.getDay() - 1; // Monday = 0

    const fetchData = useCallback(async () => {
        setLoading(true);
        const range = { start: format(addMonths(currentDate, -1), 'yyyy-MM-dd'), end: format(addMonths(currentDate, 2), 'yyyy-MM-dd') };
        const [empRes, eventsRes] = await Promise.all([
            supabase.from('t_employees').select('*').eq('is_active', true).order('name'),
            supabase.from('t_employee_events').select('*').lte('start_date', range.end).gte('end_date', range.start),
        ]);
        setEmployees(empRes.data || []);
        setEvents(eventsRes.data || []);
        setLoading(false);
    }, [currentDate]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const getEventsForDay = (day: Date) => {
        const ds = format(day, 'yyyy-MM-dd');
        return events.filter(e => e.start_date <= ds && e.end_date >= ds);
    };

    const openCreate = (dateStr?: string) => {
        setForm({ employee_id: '', event_type: 'Urlaub', start_date: dateStr || format(new Date(), 'yyyy-MM-dd'), end_date: dateStr || format(new Date(), 'yyyy-MM-dd'), notes: '' });
        setModal({ mode: 'create' });
    };

    const handleSave = async () => {
        if (!form.employee_id || !form.start_date || !form.end_date) return;
        setSaving(true);
        try {
            const payload = { employee_id: form.employee_id, event_type: form.event_type, start_date: form.start_date, end_date: form.end_date, notes: form.notes || null };
            if (modal?.mode === 'create') {
                const { error } = await supabase.from('t_employee_events').insert(payload);
                if (error) throw error;
                toast('Ereignis erstellt');
            } else if (modal?.event) {
                const { error } = await supabase.from('t_employee_events').update(payload).eq('id', modal.event.id);
                if (error) throw error;
                toast('Aktualisiert');
            }
            setModal(null); fetchData();
        } catch { toast('Fehler beim Speichern', 'error'); }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Löschen?')) return;
        setEvents(prev => prev.filter(e => e.id !== id));
        await supabase.from('t_employee_events').delete().eq('id', id);
    };

    // Day detail
    const selectedDayEvents = selectedDate ? events.filter(e => e.start_date <= selectedDate && e.end_date >= selectedDate) : [];

    return (
        <div className="flex flex-col min-h-full">
            {/* Month navigation */}
            <div className="sticky top-[calc(64px+env(safe-area-inset-top,0px))] z-30 bg-white border-b border-slate-200 shadow-sm px-4 sm:px-6 py-3">
                <div className="flex items-center justify-between">
                    <button onClick={() => setCurrentDate(addMonths(currentDate, -1))} className="p-1.5 hover:bg-slate-100 rounded-lg">
                        <ChevronLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <span className="text-sm font-bold text-slate-700">{format(currentDate, 'MMMM yyyy', { locale: de })}</span>
                    <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1.5 hover:bg-slate-100 rounded-lg">
                        <ChevronRight className="w-5 h-5 text-slate-600" />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
            ) : (
                <div className="p-4 sm:p-6 space-y-4">
                    {/* Calendar grid */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
                        {/* Day names */}
                        <div className="grid grid-cols-7 mb-1">
                            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => (
                                <div key={d} className="text-center text-[10px] font-medium text-slate-400 py-1">{d}</div>
                            ))}
                        </div>
                        {/* Days */}
                        <div className="grid grid-cols-7 gap-0.5">
                            {Array.from({ length: startDow }).map((_, i) => <div key={`e-${i}`} />)}
                            {days.map(day => {
                                const ds = format(day, 'yyyy-MM-dd');
                                const dayEvents = getEventsForDay(day);
                                const isToday = isSameDay(day, new Date());
                                const isSelected = ds === selectedDate;
                                return (
                                    <button key={ds} onClick={() => setSelectedDate(isSelected ? null : ds)}
                                        className={cn('relative flex flex-col items-center py-1.5 rounded-lg transition-colors min-h-[44px]',
                                            isSelected ? 'bg-blue-100 ring-1 ring-blue-400' : 'hover:bg-slate-50',
                                            isToday && 'font-bold')}>
                                        <span className={cn('text-xs', isToday ? 'text-blue-600' : 'text-slate-700')}>{format(day, 'd')}</span>
                                        {dayEvents.length > 0 && (
                                            <div className="flex gap-0.5 mt-0.5">
                                                {dayEvents.slice(0, 3).map((e, i) => (
                                                    <div key={i} className={cn('w-1.5 h-1.5 rounded-full', EVENT_COLORS[e.event_type] || 'bg-slate-400')} />
                                                ))}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-2">
                        {EVENT_TYPES.map(t => (
                            <span key={t} className="flex items-center gap-1 text-[10px] text-slate-500">
                                <div className={cn('w-2 h-2 rounded-full', EVENT_COLORS[t])} />{t}
                            </span>
                        ))}
                    </div>

                    {/* Selected day detail */}
                    {selectedDate && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-700">{format(new Date(selectedDate), 'EEEE, d. MMM', { locale: de })}</h3>
                                <button onClick={() => openCreate(selectedDate)} className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-md font-medium">
                                    <Plus className="w-3 h-3 inline mr-0.5" />Neu
                                </button>
                            </div>
                            {selectedDayEvents.length === 0 ? (
                                <p className="text-xs text-slate-400 text-center py-4">Keine Ereignisse</p>
                            ) : selectedDayEvents.map(e => {
                                const emp = employees.find(em => em.employee_id === e.employee_id);
                                return (
                                    <div key={e.id} className="bg-white rounded-lg border border-slate-200 p-3 flex items-center justify-between">
                                        <div>
                                            <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', EVENT_BADGE[e.event_type])}>{e.event_type}</span>
                                            <p className="text-sm font-medium text-slate-700 mt-1">{emp?.name || 'Unbekannt'}</p>
                                            <p className="text-xs text-slate-400">{e.start_date === e.end_date ? format(new Date(e.start_date), 'dd.MM.yy') : `${format(new Date(e.start_date), 'dd.MM.')} – ${format(new Date(e.end_date), 'dd.MM.yy')}`}</p>
                                            {e.notes && <p className="text-xs text-slate-500 italic mt-0.5">{e.notes}</p>}
                                        </div>
                                        <button onClick={() => handleDelete(e.id)} className="p-1.5 text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Upcoming events list */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-700 mb-2">Kommende Ereignisse</h3>
                        {events.filter(e => e.end_date >= format(new Date(), 'yyyy-MM-dd')).sort((a, b) => a.start_date.localeCompare(b.start_date)).slice(0, 10).map(e => {
                            const emp = employees.find(em => em.employee_id === e.employee_id);
                            return (
                                <div key={e.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                                    <div className={cn('w-2 h-8 rounded-full', EVENT_COLORS[e.event_type])} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-slate-700 truncate">{emp?.name || '?'} — {e.event_type}</p>
                                        <p className="text-[10px] text-slate-400">{format(new Date(e.start_date), 'dd.MM.')} – {format(new Date(e.end_date), 'dd.MM.yyyy')}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* FAB */}
            <button onClick={() => openCreate()} className="fixed fab-position z-30 w-14 h-14 rounded-full bg-blue-600 text-white shadow-xl flex items-center justify-center touch-btn">
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
                                <h2 className="text-base font-bold text-slate-800">{modal.mode === 'create' ? 'Neues Ereignis' : 'Bearbeiten'}</h2>
                                <button onClick={() => setModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-400" /></button>
                            </div>
                            <div className="p-4 space-y-3 pb-8">
                                <div><label className="block text-xs font-medium text-slate-500 mb-1">Mitarbeiter *</label>
                                    <select className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm bg-white" value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })}>
                                        <option value="">Wählen...</option>
                                        {employees.map(emp => <option key={emp.employee_id} value={emp.employee_id}>{emp.name}</option>)}
                                    </select></div>
                                <div><label className="block text-xs font-medium text-slate-500 mb-1">Typ</label>
                                    <select className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm bg-white" value={form.event_type} onChange={e => setForm({ ...form, event_type: e.target.value })}>
                                        {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="block text-xs font-medium text-slate-500 mb-1">Von</label>
                                        <input type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
                                    <div><label className="block text-xs font-medium text-slate-500 mb-1">Bis</label>
                                        <input type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
                                </div>
                                <div><label className="block text-xs font-medium text-slate-500 mb-1">Notizen</label>
                                    <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm resize-none" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                                <div className="flex gap-3 pt-2">
                                    <button onClick={() => setModal(null)} className="flex-1 px-4 py-3 text-sm font-medium text-slate-600 rounded-xl border border-slate-300">Abbrechen</button>
                                    <button onClick={handleSave} disabled={saving || !form.employee_id}
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
