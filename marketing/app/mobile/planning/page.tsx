'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/components/ui/toast';
import { format, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import {
    ChevronLeft, ChevronRight, Plus, X, Save, Loader2,
    Trash2, Users, Copy, ArrowRight, Truck, Clock, MapPin, FileText,
    ChevronDown, ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { requireSupabaseSuccess } from '@/lib/supabase-result';
import { Database } from '@/types/supabase';
import { AnimatePresence, motion } from 'framer-motion';

// Types (reused from desktop)
type Project = Database['public']['Tables']['t_projects']['Row'];
type Employee = Database['public']['Tables']['t_employees']['Row'];
type Vehicle = Database['public']['Tables']['t_vehicles']['Row'];
type StaffRowType = Database['public']['Tables']['t_morningplan_staff']['Row'] & { employee?: Employee };
type MorningPlan = Database['public']['Tables']['t_morningplan']['Row'] & {
    project?: Project;
    staff?: StaffRowType[];
};
type VehicleDailyStatus = Database['public']['Tables']['t_vehicle_daily_status']['Row'];

const SERVICE_TYPES = ['Umzug', 'Entrümpelung', 'Transport', 'Einlagerung', 'Malerarbeiten', 'Kartonlieferung', 'Sonstiges'];

export default function MobilePlanningPage() {
    const { toast } = useToast();
    const [viewMode, setViewMode] = useState<'day' | '3day'>('day');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [projects, setProjects] = useState<Project[]>([]);
    const [plans, setPlans] = useState<MorningPlan[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [vehicleStatuses, setVehicleStatuses] = useState<VehicleDailyStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [selectedDay, setSelectedDay] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [vehiclesOpen, setVehiclesOpen] = useState(false);

    // Plan modal
    const [planModal, setPlanModal] = useState<{ mode: 'create' | 'edit'; plan?: MorningPlan; date: string } | null>(null);
    const [planForm, setPlanForm] = useState({ project_id: '', start_time: '', vehicle_id: '', vehicle_names: '', service_type: '', notes: '' });
    const [savingPlan, setSavingPlan] = useState(false);

    // Staff modal
    const [staffModalPlanId, setStaffModalPlanId] = useState<string | null>(null);

    // Expanded cards
    const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

    const dateRange = useMemo(() => {
        if (viewMode === '3day') {
            return { start: format(currentDate, 'yyyy-MM-dd'), end: format(addDays(currentDate, 2), 'yyyy-MM-dd') };
        }
        return { start: format(currentDate, 'yyyy-MM-dd'), end: format(currentDate, 'yyyy-MM-dd') };
    }, [viewMode, currentDate]);

    // ---- DATA FETCHING ----
    const fetchData = useCallback(async () => {
        setLoading(true);
        const [projRes, planRes, empRes, vehRes] = await Promise.all([
            supabase.from('t_projects').select('*').order('created_at', { ascending: false }).limit(100),
            supabase.from('t_morningplan')
                .select('*, project:t_projects(*), staff:t_morningplan_staff(*, employee:t_employees(*))')
                .gte('plan_date', dateRange.start)
                .lte('plan_date', dateRange.end),
            supabase.from('t_employees').select('*').eq('is_active', true).order('name'),
            supabase.from('t_vehicles').select('*').eq('is_deleted', false).order('nickname'),
        ]);
        setProjects(projRes.data || []);
        setPlans((planRes.data || []) as MorningPlan[]);
        setEmployees(empRes.data || []);
        setVehicles(vehRes.data || []);
        setLoading(false);
    }, [dateRange.start, dateRange.end]);

    const fetchVehicleStatuses = useCallback(async () => {
        const { data } = await supabase.from('t_vehicle_daily_status').select('*').eq('plan_date', selectedDay);
        setVehicleStatuses(data || []);
    }, [selectedDay]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => { fetchVehicleStatuses(); }, [fetchVehicleStatuses]);
    useEffect(() => { setMounted(true); }, []);

    // ---- PLAN CRUD ----
    const openCreatePlan = (dateStr: string) => {
        setPlanForm({ project_id: '', start_time: '', vehicle_id: '', vehicle_names: '', service_type: '', notes: '' });
        setPlanModal({ mode: 'create', date: dateStr });
    };

    const openEditPlan = (plan: MorningPlan) => {
        setPlanForm({
            project_id: plan.project_id || '', start_time: plan.start_time?.substring(0, 5) || '',
            vehicle_id: plan.vehicle_id || '', vehicle_names: plan.vehicle_names || '',
            service_type: plan.service_type || '', notes: plan.notes || '',
        });
        setPlanModal({ mode: 'edit', plan, date: plan.plan_date });
    };

    const savePlan = async () => {
        if (!planForm.project_id || !planModal) return;
        setSavingPlan(true);
        try {
            const payload = {
                plan_date: planModal.date, project_id: planForm.project_id, start_time: planForm.start_time || null,
                vehicle_id: planForm.vehicle_id || null, vehicle_names: planForm.vehicle_names || null,
                service_type: planForm.service_type || null, notes: planForm.notes || null,
            };
            if (planModal.mode === 'create') {
                const { error } = await supabase.from('t_morningplan').insert(payload);
                if (error) throw error;
                toast('Einsatz erstellt');
            } else if (planModal.plan) {
                const { error } = await supabase.from('t_morningplan').update(payload).eq('plan_id', planModal.plan.plan_id);
                if (error) throw error;
                toast('Einsatz aktualisiert');
            }
            setPlanModal(null);
            fetchData();
        } catch { toast('Fehler beim Speichern', 'error'); }
        setSavingPlan(false);
    };

    const handleDeletePlan = async (planId: string) => {
        if (!confirm('Einsatz wirklich löschen?')) return;
        setPlans(p => p.filter(x => x.plan_id !== planId));
        const { error } = await supabase.from('t_morningplan').delete().eq('plan_id', planId);
        if (error) toast('Fehler beim Löschen', 'error');
    };

    const duplicatePlan = async (plan: MorningPlan) => {
        try {
            const { data: newPlan, error } = await supabase.from('t_morningplan').insert({
                plan_date: plan.plan_date, project_id: plan.project_id,
                start_time: plan.start_time, vehicle_id: plan.vehicle_id,
                vehicle_names: plan.vehicle_names, service_type: plan.service_type,
                notes: plan.notes,
            }).select().single();
            if (error) throw error;
            if (plan.staff && plan.staff.length > 0) {
                const staffPayload = plan.staff.map(s => ({
                    plan_id: newPlan.plan_id, employee_id: s.employee_id,
                    individual_start_time: s.individual_start_time,
                    member_notes: (s as any).member_notes, sort_order: s.sort_order
                }));
                requireSupabaseSuccess(await supabase.from('t_morningplan_staff').insert(staffPayload));
            }
            toast('Einsatz dupliziert');
            fetchData();
        } catch { toast('Fehler beim Duplizieren', 'error'); }
    };

    const moveToTomorrow = async (plan: MorningPlan) => {
        const tomorrow = format(addDays(new Date(plan.plan_date), 1), 'yyyy-MM-dd');
        try {
            const { error } = await supabase.from('t_morningplan').update({ plan_date: tomorrow }).eq('plan_id', plan.plan_id);
            if (error) throw error;
            toast(`Auf morgen verschoben`);
            fetchData();
        } catch { toast('Fehler beim Verschieben', 'error'); }
    };

    // ---- STAFF CRUD ----
    const addStaffToPlan = async (planId: string, employeeId: string) => {
        if (!employeeId) return;
        try {
            const currentStaff = plans.find(p => p.plan_id === planId)?.staff || [];
            const maxOrder = currentStaff.reduce((max, s) => Math.max(max, s.sort_order || 0), 0);
            const { error } = await supabase.from('t_morningplan_staff').insert({
                plan_id: planId, employee_id: employeeId, sort_order: maxOrder + 1, individual_start_time: null,
            });
            if (error) throw error;
            toast('Mitarbeiter hinzugefügt');
            fetchData();
        } catch { toast('Fehler beim Hinzufügen', 'error'); }
    };

    const removeStaffFromPlan = async (staffId: number) => {
        try {
            const { error } = await supabase.from('t_morningplan_staff').delete().eq('id', staffId);
            if (error) throw error;
            toast('Mitarbeiter entfernt');
            fetchData();
        } catch { toast('Fehler beim Entfernen', 'error'); }
    };

    // ---- HELPERS ----
    const dayPlans = (dateStr: string) => plans
        .filter(p => p.plan_date === dateStr)
        .sort((a, b) => {
            if ((a as any).sort_order !== (b as any).sort_order) return ((a as any).sort_order || 0) - ((b as any).sort_order || 0);
            return (a.start_time || '').localeCompare(b.start_time || '');
        });

    const toggleCard = (planId: string) => {
        setExpandedCards(prev => {
            const next = new Set(prev);
            if (next.has(planId)) next.delete(planId);
            else next.add(planId);
            return next;
        });
    };

    const navigate = (dir: -1 | 1) => {
        const step = viewMode === '3day' ? 3 : 1;
        const newDate = addDays(currentDate, dir * step);
        setCurrentDate(newDate);
        setSelectedDay(format(newDate, 'yyyy-MM-dd'));
    };

    const goToday = () => {
        setCurrentDate(new Date());
        setSelectedDay(format(new Date(), 'yyyy-MM-dd'));
    };

    // ---- 3-Day dates ----
    const threeDayDates = viewMode === '3day'
        ? [currentDate, addDays(currentDate, 1), addDays(currentDate, 2)]
        : [];

    // =================== RENDER ===================
    if (!mounted) {
        return <div className="flex min-h-full items-center justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-blue-500" /></div>;
    }

    return (
        <div className="flex flex-col min-h-full">
            {/* Sticky Sub-Header */}
            <div className="sticky top-[calc(64px+env(safe-area-inset-top,0px))] z-30 bg-white border-b border-slate-200 shadow-sm">
                {/* View toggle + date nav */}
                <div className="flex items-center justify-between px-4 py-2.5">
                    {/* View mode toggle */}
                    <div className="flex p-0.5 bg-slate-100 rounded-lg">
                        {(['day', '3day'] as const).map(mode => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={cn(
                                    'px-3 py-1.5 text-xs font-semibold rounded-md transition-all',
                                    viewMode === mode ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                                )}
                            >
                                {mode === 'day' ? 'Tag' : '3 Tage'}
                            </button>
                        ))}
                    </div>

                    {/* Date navigation */}
                    <div className="flex items-center gap-1">
                        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                            <ChevronLeft className="w-5 h-5 text-slate-600" />
                        </button>
                        <button onClick={goToday} className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md">
                            Heute
                        </button>
                        <button onClick={() => navigate(1)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                            <ChevronRight className="w-5 h-5 text-slate-600" />
                        </button>
                    </div>
                </div>

                {/* Date label */}
                <div className="px-4 pb-2 text-sm font-semibold text-slate-700">
                    {viewMode === 'day'
                        ? format(currentDate, 'EEEE, d. MMMM yyyy', { locale: de })
                        : `${format(currentDate, 'd. MMM', { locale: de })} – ${format(addDays(currentDate, 2), 'd. MMM yyyy', { locale: de })}`
                    }
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex-1 flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
            ) : viewMode === 'day' ? (
                /* ========== DAY VIEW ========== */
                <div className="p-4 sm:p-6 space-y-4">
                    {/* Vehicles (collapsible) */}
                    {vehicles.length > 0 && (
                        <button
                            onClick={() => setVehiclesOpen(!vehiclesOpen)}
                            className="w-full flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm"
                        >
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <Truck className="w-4 h-4 text-orange-500" />
                                Fahrzeuge ({vehicles.length})
                            </div>
                            {vehiclesOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </button>
                    )}
                    {vehiclesOpen && (
                        <div className="space-y-2 -mt-2">
                            {vehicles.map(v => {
                                const status = vehicleStatuses.find(vs => vs.vehicle_name === v.nickname && vs.plan_date === selectedDay);
                                return (
                                    <div key={v.vehicle_id} className="bg-white rounded-lg border border-slate-200 p-3 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-slate-700">{v.nickname || v.vehicle_id}</p>
                                            {status?.status && <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', status.status === 'Verfügbar' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>{status.status}</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Plan cards */}
                    {dayPlans(selectedDay).length === 0 ? (
                        <div className="text-center py-16 text-slate-400 bg-white rounded-xl border-2 border-dashed border-slate-200">
                            <p className="text-sm">Keine Einsätze für diesen Tag.</p>
                        </div>
                    ) : (
                        dayPlans(selectedDay).map(plan => (
                            <MobilePlanCard
                                key={plan.plan_id}
                                plan={plan}
                                expanded={expandedCards.has(plan.plan_id)}
                                onToggle={() => toggleCard(plan.plan_id)}
                                onEdit={() => openEditPlan(plan)}
                                onDelete={() => handleDeletePlan(plan.plan_id)}
                                onDuplicate={() => duplicatePlan(plan)}
                                onMoveToTomorrow={() => moveToTomorrow(plan)}
                                employees={employees}
                                onAddStaff={(empId) => addStaffToPlan(plan.plan_id, empId)}
                                onRemoveStaff={removeStaffFromPlan}
                                onOpenStaffModal={() => setStaffModalPlanId(plan.plan_id)}
                            />
                        ))
                    )}
                </div>
            ) : (
                /* ========== 3-DAY VIEW ========== */
                <div className="p-4 sm:p-6 space-y-6">
                    {threeDayDates.map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const dPlans = dayPlans(dateStr);
                        return (
                            <div key={dateStr}>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-bold text-slate-700">
                                        {format(day, 'EEEE, d. MMM', { locale: de })}
                                    </h3>
                                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{dPlans.length} Einsätze</span>
                                </div>
                                {dPlans.length === 0 ? (
                                    <div className="text-center py-6 text-slate-300 text-xs border border-dashed border-slate-200 rounded-lg">
                                        Keine Einsätze
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {dPlans.map(plan => (
                                            <MobilePlanCard
                                                key={plan.plan_id}
                                                plan={plan}
                                                expanded={expandedCards.has(plan.plan_id)}
                                                onToggle={() => toggleCard(plan.plan_id)}
                                                onEdit={() => openEditPlan(plan)}
                                                onDelete={() => handleDeletePlan(plan.plan_id)}
                                                onDuplicate={() => duplicatePlan(plan)}
                                                onMoveToTomorrow={() => moveToTomorrow(plan)}
                                                employees={employees}
                                                onAddStaff={(empId) => addStaffToPlan(plan.plan_id, empId)}
                                                onRemoveStaff={removeStaffFromPlan}
                                                onOpenStaffModal={() => setStaffModalPlanId(plan.plan_id)}
                                                compact
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* FAB: New Plan */}
            <button
                onClick={() => openCreatePlan(selectedDay)}
                className="fixed fab-position z-30 w-14 h-14 rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/30 flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all touch-btn"
            >
                <Plus className="w-6 h-6" />
            </button>

            {/* ======= PLAN CREATE/EDIT BOTTOM SHEET ======= */}
            <AnimatePresence>
                {planModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-black/40" onClick={() => setPlanModal(null)}
                        />
                        <motion.div
                            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            data-mobile-sheet="true" className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
                        >
                            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between rounded-t-2xl">
                                <h2 className="text-lg font-bold text-slate-800">
                                    {planModal.mode === 'create' ? 'Neuer Einsatz' : 'Einsatz bearbeiten'}
                                </h2>
                                <button onClick={() => setPlanModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                            <div className="p-4 space-y-4 pb-8">
                                <div className="text-sm text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                                    {format(new Date(planModal.date), 'EEEE, d. MMMM yyyy', { locale: de })}
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Projekt *</label>
                                    <select className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm bg-white"
                                        value={planForm.project_id}
                                        onChange={e => {
                                            const p = projects.find(pr => pr.project_id === e.target.value);
                                            setPlanForm({ ...planForm, project_id: e.target.value, service_type: p?.dienstleistungen || planForm.service_type });
                                        }}>
                                        <option value="">Projekt wählen...</option>
                                        {projects.map(p => <option key={p.project_id} value={p.project_id}>{p.project_code} — {p.name}</option>)}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Startzeit</label>
                                        <input type="time" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                                            value={planForm.start_time} onChange={e => setPlanForm({ ...planForm, start_time: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Dienstleistung</label>
                                        <select className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm bg-white"
                                            value={planForm.service_type} onChange={e => setPlanForm({ ...planForm, service_type: e.target.value })}>
                                            <option value="">—</option>
                                            {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Fahrzeug</label>
                                        <select className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm bg-white"
                                            value={planForm.vehicle_id}
                                            onChange={e => {
                                                const v = vehicles.find(vh => vh.vehicle_id === e.target.value);
                                                setPlanForm({ ...planForm, vehicle_id: e.target.value, vehicle_names: v?.nickname || '' });
                                            }}>
                                            <option value="">Kein Fahrzeug</option>
                                            {vehicles.map(v => <option key={v.vehicle_id} value={v.vehicle_id}>{v.nickname || v.vehicle_id}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Fahrzeug-Name</label>
                                        <input className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                                            value={planForm.vehicle_names} onChange={e => setPlanForm({ ...planForm, vehicle_names: e.target.value })}
                                            placeholder="z.B. L4U + Caddy" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Notizen</label>
                                    <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm resize-none" rows={3}
                                        value={planForm.notes} onChange={e => setPlanForm({ ...planForm, notes: e.target.value })} />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button onClick={() => setPlanModal(null)}
                                        className="flex-1 px-4 py-3 text-sm font-medium text-slate-600 rounded-xl border border-slate-300 hover:bg-slate-50">
                                        Abbrechen
                                    </button>
                                    <button onClick={savePlan} disabled={savingPlan || !planForm.project_id}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 shadow-sm">
                                        {savingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Speichern
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ======= STAFF ADD BOTTOM SHEET ======= */}
            <AnimatePresence>
                {staffModalPlanId && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-black/40" onClick={() => setStaffModalPlanId(null)}
                        />
                        <motion.div
                            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            data-mobile-sheet="true" className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[70vh] overflow-y-auto"
                        >
                            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between rounded-t-2xl">
                                <h2 className="text-base font-bold text-slate-800">Mitarbeiter hinzufügen</h2>
                                <button onClick={() => setStaffModalPlanId(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                            <div className="p-2 pb-8">
                                {employees.map(emp => {
                                    const alreadyAssigned = plans.find(p => p.plan_id === staffModalPlanId)?.staff?.some(s => s.employee_id === emp.employee_id);
                                    return (
                                        <button
                                            key={emp.employee_id}
                                            onClick={() => {
                                                if (!alreadyAssigned) {
                                                    addStaffToPlan(staffModalPlanId!, emp.employee_id);
                                                    setStaffModalPlanId(null);
                                                }
                                            }}
                                            disabled={!!alreadyAssigned}
                                            className={cn(
                                                'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors',
                                                alreadyAssigned ? 'opacity-40' : 'hover:bg-slate-50 active:bg-slate-100'
                                            )}
                                        >
                                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                                {emp.name?.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-700">{emp.name}</p>
                                                <p className="text-xs text-slate-400">{emp.contract_type || '—'}</p>
                                            </div>
                                            {alreadyAssigned && <span className="ml-auto text-xs text-slate-400">Bereits zugewiesen</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

// =================== MOBILE PLAN CARD ===================
function MobilePlanCard({
    plan, expanded, onToggle, onEdit, onDelete, onDuplicate, onMoveToTomorrow,
    employees, onAddStaff, onRemoveStaff, onOpenStaffModal, compact = false,
}: {
    plan: MorningPlan;
    expanded: boolean;
    onToggle: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onDuplicate: () => void;
    onMoveToTomorrow: () => void;
    employees: Employee[];
    onAddStaff: (empId: string) => void;
    onRemoveStaff: (staffId: number) => void;
    onOpenStaffModal: () => void;
    compact?: boolean;
}) {
    const staffSorted = (plan.staff || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Card header — always visible */}
            <button onClick={onToggle} className="w-full text-left px-4 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            {plan.start_time?.substring(0, 5) || '–'}
                        </span>
                        {plan.service_type && (
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide border border-slate-200 px-1.5 py-0.5 rounded">
                                {plan.service_type}
                            </span>
                        )}
                    </div>
                    <h4 className={cn('font-bold text-slate-800 leading-snug', compact ? 'text-sm' : 'text-base')}>
                        {plan.project?.name || 'Unbekannt'}
                    </h4>
                    {!compact && plan.project?.ort && (
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {plan.project.ort}
                        </p>
                    )}
                    {/* Staff count preview */}
                    <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Users className="w-3 h-3" /> {staffSorted.length} MA
                        </span>
                        {plan.vehicle_names && (
                            <span className="text-xs text-orange-600 flex items-center gap-1">
                                <Truck className="w-3 h-3" /> {plan.vehicle_names}
                            </span>
                        )}
                    </div>
                </div>
                <ChevronDown className={cn('w-5 h-5 text-slate-400 transition-transform shrink-0 mt-1', expanded && 'rotate-180')} />
            </button>

            {/* Expanded details */}
            {expanded && (
                <div className="border-t border-slate-100">
                    {/* Address + notes */}
                    {!compact && (
                        <div className="px-4 py-3 space-y-2 bg-slate-50/50">
                            {plan.project?.strasse && (
                                <p className="text-xs text-slate-600 flex items-start gap-1.5">
                                    <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                                    <span>
                                        {[plan.project.strasse, plan.project.nr].filter(Boolean).join(' ')}, {plan.project.plz} {plan.project.ort}
                                    </span>
                                </p>
                            )}
                            {plan.notes && (
                                <p className="text-xs text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-lg px-2.5 py-2 italic flex items-start gap-1.5">
                                    <FileText className="w-3 h-3 mt-0.5 shrink-0" />
                                    {plan.notes}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Staff list */}
                    <div className="px-4 py-2">
                        <div className="flex items-center justify-between mb-2">
                            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <Users className="w-3 h-3" /> Einsatz-Team
                            </h5>
                            <button
                                onClick={onOpenStaffModal}
                                className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors"
                            >
                                <Plus className="w-3 h-3" /> Hinzufügen
                            </button>
                        </div>
                        {staffSorted.length === 0 ? (
                            <p className="text-xs text-slate-300 text-center py-4 italic">Noch keine Mitarbeiter zugewiesen.</p>
                        ) : (
                            <div className="space-y-1.5">
                                {staffSorted.map(staff => (
                                    <div key={staff.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                                                {staff.employee?.name?.substring(0, 2).toUpperCase() || '?'}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium text-slate-700 truncate">{staff.employee?.name || 'Unbekannt'}</p>
                                                {staff.individual_start_time && (
                                                    <p className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                                        <Clock className="w-2.5 h-2.5" /> {staff.individual_start_time.substring(0, 5)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <button onClick={() => onRemoveStaff(staff.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center border-t border-slate-100 divide-x divide-slate-100">
                        <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                            <Save className="w-3.5 h-3.5" /> Bearbeiten
                        </button>
                        <button onClick={onDuplicate} className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                            <Copy className="w-3.5 h-3.5" /> Duplizieren
                        </button>
                        <button onClick={onMoveToTomorrow} className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-orange-600 hover:bg-orange-50 transition-colors">
                            <ArrowRight className="w-3.5 h-3.5" /> Morgen
                        </button>
                        <button onClick={onDelete} className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" /> Löschen
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
