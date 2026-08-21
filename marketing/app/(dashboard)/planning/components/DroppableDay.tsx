import React from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { format, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { Clock, GripVertical, Pencil, Truck, UserPlus, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MorningPlan, EmployeeEvent, Employee } from './types';

const EVENT_EMOJI: Record<string, string> = {
    'Urlaub': '🏖',
    'Termin': '📅',
    'Krankheit': '🤒',
    'Schulung': '📚',
    'Sonstiges': '📌',
};

interface DroppableDayProps {
    day: Date;
    plans: MorningPlan[];
    employeeEvents?: EmployeeEvent[];
    employees?: Employee[];
    onDelete: (id: string, e: React.MouseEvent) => void;
    onEditPlan: (plan: MorningPlan) => void;
    onAddStaff: (planId: string, employeeId: string) => void;
}

/** A single draggable plan card inside the week/month calendar */
function DraggablePlanCard({ plan, employees, onDelete, onEditPlan, onAddStaff }: {
    plan: MorningPlan;
    employees: Employee[];
    onDelete: (id: string, e: React.MouseEvent) => void;
    onEditPlan: (plan: MorningPlan) => void;
    onAddStaff: (planId: string, employeeId: string) => void;
}) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `plan-${plan.plan_id}`,
        data: { type: 'plan', plan },
    });
    const isBesichtigung = plan.is_besichtigung;
    const assignedEmployeeIds = new Set((plan.staff || []).map(staff => staff.employee_id).filter(Boolean));
    const availableEmployees = employees.filter(employee => !assignedEmployeeIds.has(employee.employee_id));

    return (
        <div ref={setNodeRef}
            className={cn(
                "relative rounded-md border p-2 shadow-sm group hover:border-opacity-100 transition-colors",
                isBesichtigung
                    ? "bg-violet-50 border-violet-200 hover:border-violet-400"
                    : "bg-white border-slate-200 hover:border-blue-200",
                isDragging && "opacity-50 z-20"
            )}
            onClick={e => e.stopPropagation()}>
            {/* Drag handle */}
            <div {...listeners} {...attributes}
                className="absolute top-1 left-1 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 p-0.5 touch-none">
                <GripVertical className="h-3 w-3" />
            </div>
            <div className="absolute top-1 right-1 opacity-60 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                <button onClick={() => onEditPlan(plan)} className="text-slate-400 hover:text-blue-600 text-xs p-0.5"><Pencil className="h-3 w-3" /></button>
                <button onClick={(e) => onDelete(plan.plan_id, e)} type="button" className="text-slate-400 hover:text-red-500 text-xs p-0.5">×</button>
            </div>

            <div className="pl-4">
                {isBesichtigung ? (
                    <>
                        <div className="text-xs font-semibold text-violet-700 truncate mb-0.5 flex items-center gap-1">
                            <span>🔍</span>
                            <span>{plan.project?.name || 'Besichtigung'}</span>
                        </div>
                        <div className="text-[10px] text-violet-600 flex items-center gap-1.5">
                            <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{plan.start_time?.substring(0, 5) || '–'}</span>
                        </div>
                        {plan.notes && <div className="text-[9px] text-violet-500 mt-0.5 truncate italic">{plan.notes}</div>}
                    </>
                ) : (
                    <>
                        <div className="text-xs font-semibold text-blue-700 truncate mb-0.5 flex items-center gap-1">
                            <span>{plan.project?.name || 'Unbekannt'}</span>
                            {plan.project?.mannanzahl != null && (
                                <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded-full ml-auto shrink-0 flex items-center gap-0.5">
                                    <Users className="h-2 w-2" />{plan.project.mannanzahl}
                                </span>
                            )}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2 mb-1">
                            <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{plan.start_time?.substring(0, 5) || '–'}</span>
                            {plan.vehicle_names && <span className="flex items-center gap-0.5"><Truck className="h-2.5 w-2.5" />{plan.vehicle_names}</span>}
                        </div>
                        {plan.service_type && <div className="text-[9px] text-slate-400 mb-0.5">{plan.service_type}</div>}
                        <div className="flex items-center gap-1 flex-wrap">
                            {(plan.staff || []).map(s => (
                                <span key={s.id} className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full truncate max-w-[60px]">{s.employee?.name?.split(' ')[0] || '?'}</span>
                            ))}
                        </div>
                        <div className="relative mt-1">
                            <UserPlus className="pointer-events-none absolute left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                            <select
                                aria-label={`Mitarbeiter zu ${plan.project?.name || 'Einsatz'} hinzufügen`}
                                disabled={availableEmployees.length === 0}
                                className="h-6 w-full rounded border border-slate-200 bg-white pl-5 pr-1 text-[10px] text-slate-600 hover:border-blue-300 focus:border-blue-400 focus:outline-none disabled:bg-slate-50 disabled:text-slate-300"
                                defaultValue=""
                                onPointerDown={event => event.stopPropagation()}
                                onClick={event => event.stopPropagation()}
                                onChange={event => {
                                    if (event.target.value) {
                                        onAddStaff(plan.plan_id, event.target.value);
                                        event.target.value = '';
                                    }
                                }}
                            >
                                <option value="">{availableEmployees.length > 0 ? 'Mitarbeiter hinzufügen' : 'Alle zugewiesen'}</option>
                                {availableEmployees.map(employee => (
                                    <option key={employee.employee_id} value={employee.employee_id}>{employee.name}</option>
                                ))}
                            </select>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export function DroppableDay({ day, plans, employeeEvents = [], employees = [], onDelete, onEditPlan, onAddStaff }: DroppableDayProps) {
    const dateStr = format(day, 'yyyy-MM-dd');
    const { setNodeRef, isOver } = useDroppable({ id: `day-${dateStr}`, data: { date: dateStr } });
    const isToday = isSameDay(day, new Date());

    const dayEvents = employeeEvents.filter(e => e.start_date <= dateStr && e.end_date >= dateStr);
    const employeeMap = new Map(employees.map(e => [e.employee_id, e]));

    return (
        <div ref={setNodeRef}
            className={cn("flex flex-col h-full rounded-xl border shadow-sm overflow-hidden transition-colors group/day",
                isOver ? "bg-blue-50 border-blue-400" : "bg-white border-slate-200")}>
            <div className={cn("px-3 py-2 border-b flex flex-col items-center gap-0.5 relative", isToday ? "bg-blue-50/50" : "bg-white")}>
                <span className="text-[10px] font-medium text-slate-400 uppercase">{format(day, 'EEE', { locale: de })}</span>
                <span className={cn("text-base font-bold w-7 h-7 flex items-center justify-center rounded-full",
                    isToday ? "bg-blue-600 text-white" : "text-slate-700")}>{format(day, 'd')}</span>
            </div>

            {/* Employee Events */}
            {dayEvents.length > 0 && (
                <div className="px-1.5 py-1 bg-amber-50/80 border-b border-amber-100 space-y-0.5">
                    {dayEvents.slice(0, 3).map(ev => {
                        const emp = employeeMap.get(ev.employee_id);
                        const name = emp?.name?.split(' ')[0] || '?';
                        const emoji = EVENT_EMOJI[ev.event_type] || '📌';
                        return (
                            <div key={ev.id} className="text-[9px] text-amber-800 truncate" title={`${emp?.name}: ${ev.event_type}`}>
                                {emoji} {name}
                            </div>
                        );
                    })}
                    {dayEvents.length > 3 && (
                        <div className="text-[8px] text-amber-500 font-medium">+{dayEvents.length - 3}</div>
                    )}
                </div>
            )}

            <div className="flex-1 p-1.5 bg-slate-50/30 space-y-1.5 overflow-y-auto">
                {plans.map(plan => (
                    <DraggablePlanCard
                        key={plan.plan_id}
                        plan={plan}
                        employees={employees}
                        onDelete={onDelete}
                        onEditPlan={onEditPlan}
                        onAddStaff={onAddStaff}
                    />
                ))}
                {plans.length === 0 && dayEvents.length === 0 && !isOver && (
                    <div className="h-full min-h-[80px] border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-300 text-[10px]">Frei</div>
                )}
            </div>
        </div>
    );
}
