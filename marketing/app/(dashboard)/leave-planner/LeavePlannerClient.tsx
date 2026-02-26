'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, X, Loader2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type Employee = Database['public']['Tables']['t_employees']['Row'];
type EmployeeEvent = Database['public']['Tables']['t_employee_events']['Row'];

const EVENT_TYPES = ['Urlaub', 'Termin', 'Krankheit', 'Schulung', 'Sonstiges'] as const;
const EVENT_COLORS: Record<string, string> = {
    'Urlaub': 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30',
    'Termin': 'bg-blue-500/20 text-blue-700 border-blue-500/30',
    'Krankheit': 'bg-red-500/20 text-red-700 border-red-500/30',
    'Schulung': 'bg-purple-500/20 text-purple-700 border-purple-500/30',
    'Sonstiges': 'bg-slate-500/20 text-slate-700 border-slate-500/30',
};

export default function LeavePlannerClient() {
    const [isLoading, setIsLoading] = useState(true);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<EmployeeEvent[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [editingEvent, setEditingEvent] = useState<EmployeeEvent | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

    // Form State
    const [eventType, setEventType] = useState<string>('Urlaub');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [startTime, setStartTime] = useState<string>('');
    const [endTime, setEndTime] = useState<string>('');
    const [notes, setNotes] = useState<string>('');

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const [empsRes, eventsRes] = await Promise.all([
                supabase.from('t_employees').select('*').eq('is_active', true).order('name'),
                supabase.from('t_employee_events').select('*')
            ]);
            if (empsRes.error) throw empsRes.error;
            if (eventsRes.error) throw eventsRes.error;
            setEmployees(empsRes.data || []);
            setEvents(eventsRes.data || []);
        } catch (error) {
            console.error('Error fetching planner data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Date calculations
    const visibleDays = useMemo(() => {
        if (viewMode === 'month') {
            return eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
        } else {
            const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
            return eachDayOfInterval({ start: weekStart, end: weekEnd });
        }
    }, [currentDate, viewMode]);

    const headerLabel = useMemo(() => {
        if (viewMode === 'month') {
            return format(currentDate, 'MMMM yyyy', { locale: de });
        } else {
            const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
            return `${format(weekStart, 'd. MMM', { locale: de })} – ${format(weekEnd, 'd. MMM yyyy', { locale: de })}`;
        }
    }, [currentDate, viewMode]);

    const navigateBack = () => {
        setCurrentDate(viewMode === 'month' ? subMonths(currentDate, 1) : subWeeks(currentDate, 1));
    };

    const navigateForward = () => {
        setCurrentDate(viewMode === 'month' ? addMonths(currentDate, 1) : addWeeks(currentDate, 1));
    };

    const openModal = (employeeId?: string, date?: Date, eventToEdit?: EmployeeEvent) => {
        setIsModalOpen(true);
        if (eventToEdit) {
            setEditingEvent(eventToEdit);
            setSelectedEmployeeId(eventToEdit.employee_id);
            setEventType(eventToEdit.event_type);
            setStartDate(eventToEdit.start_date);
            setEndDate(eventToEdit.end_date);
            setStartTime(eventToEdit.start_time?.substring(0, 5) || '');
            setEndTime(eventToEdit.end_time?.substring(0, 5) || '');
            setNotes(eventToEdit.notes || '');
        } else {
            setEditingEvent(null);
            setSelectedEmployeeId(employeeId || (employees.length > 0 ? employees[0].employee_id : ''));
            const dateStr = date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
            setStartDate(dateStr);
            setEndDate(dateStr);
            setStartTime('');
            setEndTime('');
            setEventType('Urlaub');
            setNotes('');
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingEvent(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmployeeId || !startDate || !endDate || !eventType) return;

        setIsSaving(true);
        try {
            const hasTime = ['Termin', 'Schulung'].includes(eventType);
            const payload = {
                employee_id: selectedEmployeeId,
                event_type: eventType,
                start_date: startDate,
                end_date: endDate,
                start_time: hasTime && startTime ? startTime : null,
                end_time: hasTime && endTime ? endTime : null,
                notes: notes || null,
            };

            if (editingEvent) {
                const { data, error } = await supabase
                    .from('t_employee_events')
                    .update(payload)
                    .eq('id', editingEvent.id)
                    .select()
                    .single();
                if (error) throw error;
                if (data) setEvents(events.map(ev => ev.id === editingEvent.id ? data : ev));
            } else {
                const { data, error } = await supabase
                    .from('t_employee_events')
                    .insert(payload)
                    .select()
                    .single();
                if (error) throw error;
                if (data) setEvents([...events, data]);
            }
            closeModal();
        } catch (error) {
            console.error('Error saving event:', error);
            alert('Fehler beim Speichern des Ereignisses.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!editingEvent) return;
        if (!confirm('Möchten Sie dieses Ereignis wirklich löschen?')) return;

        setIsSaving(true);
        try {
            const { error } = await supabase.from('t_employee_events').delete().eq('id', editingEvent.id);
            if (error) throw error;
            setEvents(events.filter(ev => ev.id !== editingEvent.id));
            closeModal();
        } catch (error) {
            console.error('Error deleting event:', error);
            alert('Fehler beim Löschen des Ereignisses.');
        } finally {
            setIsSaving(false);
        }
    };

    const getEventForDay = (employeeId: string, day: Date) => {
        const dayStr = format(day, 'yyyy-MM-dd');
        return events.find(e =>
            e.employee_id === employeeId &&
            e.start_date <= dayStr &&
            e.end_date >= dayStr
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full pt-20">
                <div className="flex flex-col items-center gap-4 text-slate-500">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <p>Lade Planer-Daten...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 h-full flex flex-col pt-20">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-light tracking-tight text-slate-900 border-b border-transparent">
                        Urlaubs- <span className="text-slate-400 font-extralight">& Terminplaner</span>
                    </h1>
                    <p className="text-sm text-slate-500 mt-1 font-medium tracking-wide">
                        Behalten Sie den Überblick über Abwesenheiten
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {/* View Mode Toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('month')}
                            className={cn(
                                "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                                viewMode === 'month' ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Monat
                        </button>
                        <button
                            onClick={() => setViewMode('week')}
                            className={cn(
                                "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                                viewMode === 'week' ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Woche
                        </button>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center bg-white rounded-xl shadow-sm border border-slate-200 p-1">
                        <button
                            onClick={navigateBack}
                            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="w-48 text-center font-medium text-slate-700 capitalize text-sm">
                            {headerLabel}
                        </div>
                        <button
                            onClick={navigateForward}
                            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    <button
                        onClick={() => openModal()}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium shadow-sm hover:bg-blue-700 hover:shadow shadow-blue-500/20 active:scale-[0.98] transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Neuer Eintrag</span>
                    </button>
                </div>
            </div>

            {/* Matrix View */}
            <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-auto flex-1">
                    <table className="w-full border-collapse table-fixed">
                        <thead>
                            <tr>
                                <th className="sticky left-0 z-10 bg-slate-50 p-4 font-semibold text-slate-700 text-left border-b border-r border-slate-200 w-[180px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                    Mitarbeiter
                                </th>
                                {visibleDays.map(day => (
                                    <th
                                        key={day.toISOString()}
                                        className={cn(
                                            "p-1.5 text-center border-b border-slate-200 text-xs font-medium",
                                            day.getDay() === 0 || day.getDay() === 6
                                                ? "bg-slate-100 text-slate-500"
                                                : "bg-slate-50 text-slate-700"
                                        )}
                                    >
                                        <div className="flex flex-col items-center gap-0.5">
                                            <span className="text-[10px] uppercase">{format(day, 'E', { locale: de })}</span>
                                            <span className={cn(
                                                "w-6 h-6 rounded-full flex items-center justify-center text-xs",
                                                isSameDay(day, new Date()) && "bg-blue-600 text-white shadow-sm"
                                            )}>
                                                {format(day, 'd')}
                                            </span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {employees.length === 0 ? (
                                <tr>
                                    <td colSpan={visibleDays.length + 1} className="py-8 text-center text-slate-500">
                                        Keine Mitarbeiter gefunden.
                                    </td>
                                </tr>
                            ) : employees.map(employee => (
                                <tr key={employee.employee_id} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 p-3 font-medium text-slate-700 text-sm border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] transition-colors truncate w-[180px]">
                                        {employee.name}
                                    </td>
                                    {visibleDays.map(day => {
                                        const event = getEventForDay(employee.employee_id, day);
                                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                                        let eventClasses = "";
                                        let content = null;

                                        if (event) {
                                            const dayStr = format(day, 'yyyy-MM-dd');
                                            const isStart = dayStr === event.start_date;
                                            const isEnd = dayStr === event.end_date;

                                            eventClasses = cn(
                                                "cursor-pointer border-y transition-all hover:brightness-95 h-full py-1 text-center shadow-sm relative overflow-hidden",
                                                EVENT_COLORS[event.event_type] || "bg-slate-100",
                                                isStart ? "rounded-l-md border-l ml-0.5" : "-ml-[1px]",
                                                isEnd ? "rounded-r-md border-r mr-0.5" : "-mr-[1px]",
                                                !isStart && !isEnd && "border-x-transparent border-slate-200/50"
                                            );

                                            if (isStart || day.getDate() === 1 || day.getDay() === 1) {
                                                const timeStr = (event.start_time && event.end_time)
                                                    ? `${event.start_time.substring(0, 5)}-${event.end_time.substring(0, 5)}`
                                                    : '';

                                                content = (
                                                    <div className="flex flex-col items-center justify-center h-full px-0.5 leading-tight">
                                                        <span className="text-[10px] font-bold truncate block w-full">
                                                            {viewMode === 'week' ? event.event_type : event.event_type.charAt(0)}
                                                        </span>
                                                        {timeStr && (
                                                            <span className="text-[8px] font-medium opacity-80 whitespace-nowrap">
                                                                {timeStr}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            }
                                        }

                                        return (
                                            <td
                                                key={day.toISOString()}
                                                className={cn(
                                                    "p-0.5 text-center relative",
                                                    viewMode === 'week' ? "h-[64px]" : "h-[48px]",
                                                    isWeekend ? "bg-slate-50/50" : "",
                                                    !event && "cursor-pointer hover:bg-blue-50 transition-colors"
                                                )}
                                                onClick={() => !event ? openModal(employee.employee_id, day) : openModal(employee.employee_id, day, event)}
                                            >
                                                {event ? (
                                                    <div className={eventClasses} title={`${event.event_type}${event.start_time ? ' (' + event.start_time.substring(0, 5) + ' - ' + event.end_time?.substring(0, 5) + ')' : ''}${event.notes ? ': ' + event.notes : ''}`}>
                                                        {content}
                                                    </div>
                                                ) : null}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                            onClick={closeModal}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
                        >
                            <form onSubmit={handleSave}>
                                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                            <CalendarIcon className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold text-slate-800">
                                                {editingEvent ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}
                                            </h2>
                                            <p className="text-sm text-slate-500">
                                                Urlaub, Termine oder Krankheit erfassen
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-xl transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="p-6 space-y-5">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700">Mitarbeiter</label>
                                        <select
                                            value={selectedEmployeeId}
                                            onChange={(e) => setSelectedEmployeeId(e.target.value)}
                                            className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="" disabled>Bitte wählen...</option>
                                            {employees.map((emp) => (
                                                <option key={emp.employee_id} value={emp.employee_id}>
                                                    {emp.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700">Ereignis-Typ</label>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                            {EVENT_TYPES.map((type) => (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    onClick={() => setEventType(type)}
                                                    className={cn(
                                                        "px-3 py-2 rounded-lg text-sm font-medium transition-all border",
                                                        eventType === type
                                                            ? EVENT_COLORS[type]
                                                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                                    )}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">Beginn</label>
                                            <input
                                                type="date"
                                                value={startDate}
                                                required
                                                onChange={(e) => {
                                                    setStartDate(e.target.value);
                                                    if (e.target.value > endDate) setEndDate(e.target.value);
                                                }}
                                                className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">Ende</label>
                                            <input
                                                type="date"
                                                value={endDate}
                                                required
                                                onChange={(e) => setEndDate(e.target.value)}
                                                min={startDate}
                                                className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Conditional Time Fields */}
                                    {['Termin', 'Schulung'].includes(eventType) && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="grid grid-cols-2 gap-4 pt-2"
                                        >
                                            <div className="space-y-1.5">
                                                <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                                                    <Clock className="w-4 h-4 text-slate-400" />
                                                    Von
                                                </label>
                                                <input
                                                    type="time"
                                                    value={startTime}
                                                    onChange={(e) => setStartTime(e.target.value)}
                                                    className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 focus:ring-blue-500 outline-none"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                                                    <Clock className="w-4 h-4 text-slate-400" />
                                                    Bis
                                                </label>
                                                <input
                                                    type="time"
                                                    value={endTime}
                                                    onChange={(e) => setEndTime(e.target.value)}
                                                    className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 focus:ring-blue-500 outline-none"
                                                />
                                            </div>
                                        </motion.div>
                                    )}

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700">Notizen (Optional)</label>
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            rows={2}
                                            className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-blue-500 resize-none outline-none"
                                            placeholder="Zusätzliche Informationen..."
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-6 border-t border-slate-100 bg-slate-50/50">
                                    {editingEvent ? (
                                        <button
                                            type="button"
                                            onClick={handleDelete}
                                            disabled={isSaving}
                                            className="text-sm font-medium text-red-600 hover:text-red-700 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
                                        >
                                            Löschen
                                        </button>
                                    ) : (
                                        <div></div>
                                    )}
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={closeModal}
                                            disabled={isSaving}
                                            className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-xl transition-all shadow-sm"
                                        >
                                            Abbrechen
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSaving || !startDate || !endDate || !selectedEmployeeId}
                                            className="flex items-center justify-center min-w-[100px] px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm shadow-blue-500/20 active:scale-[0.98]"
                                        >
                                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Speichern'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
