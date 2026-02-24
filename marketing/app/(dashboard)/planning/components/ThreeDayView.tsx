import React from 'react';
import { format, addDays, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { useDroppable } from '@dnd-kit/core';
import { Clock, Pencil, Truck, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MorningPlan } from './types';

interface ThreeDayViewProps {
    startDate: Date;
    plans: MorningPlan[];
    onDayClick: (dateStr: string) => void;
    onDelete: (id: string, e?: React.MouseEvent) => void;
    onEditPlan: (plan: MorningPlan) => void;
}

function ThreeDayColumn({ day, plans, onDayClick, onDelete, onEditPlan }: {
    day: Date;
    plans: MorningPlan[];
    onDayClick: (dateStr: string) => void;
    onDelete: (id: string, e?: React.MouseEvent) => void;
    onEditPlan: (plan: MorningPlan) => void;
}) {
    const dateStr = format(day, 'yyyy-MM-dd');
    const isToday = isSameDay(day, new Date());
    const { setNodeRef, isOver } = useDroppable({ id: `day-${dateStr}`, data: { date: dateStr } });

    const dayPlans = plans.filter(p => p.plan_date === dateStr).sort((a, b) => {
        if ((a as any).sort_order !== (b as any).sort_order) {
            return ((a as any).sort_order || 0) - ((b as any).sort_order || 0);
        }
        return (a.start_time || '07:00').localeCompare(b.start_time || '07:00');
    });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "flex flex-col rounded-xl border shadow-sm overflow-hidden transition-colors h-full",
                isOver ? "bg-blue-50 border-blue-400" : "bg-white border-slate-200"
            )}
        >
            {/* Day Header */}
            <div
                onClick={() => onDayClick(dateStr)}
                className={cn(
                    "px-4 py-3 border-b flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors",
                    isToday ? "bg-blue-50/50" : "bg-white"
                )}
            >
                <div className={cn(
                    "text-lg font-bold w-9 h-9 flex items-center justify-center rounded-full",
                    isToday ? "bg-blue-600 text-white" : "text-slate-700"
                )}>
                    {format(day, 'd')}
                </div>
                <div>
                    <div className="text-sm font-semibold text-slate-700">{format(day, 'EEEE', { locale: de })}</div>
                    <div className="text-xs text-slate-400">{format(day, 'd. MMMM', { locale: de })}</div>
                </div>
                <div className="ml-auto">
                    <span className="text-xs font-medium text-slate-400">{dayPlans.length} Einsätze</span>
                </div>
            </div>

            {/* Plans */}
            <div className="flex-1 p-3 space-y-2 overflow-y-auto bg-slate-50/30">
                {dayPlans.map(plan => (
                    <div
                        key={plan.plan_id}
                        className="relative rounded-lg border border-slate-200 bg-white p-3 shadow-sm group hover:border-blue-200 hover:shadow-md transition-all"
                    >
                        {/* Actions */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            <button onClick={() => onEditPlan(plan)} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600">
                                <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={(e) => onDelete(plan.plan_id, e)} type="button" className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-red-500">
                                ×
                            </button>
                        </div>

                        {/* Project Name */}
                        <div className="text-sm font-semibold text-blue-700 mb-1 pr-12 truncate">
                            {plan.project?.name || 'Unbekannt'}
                        </div>

                        {/* Meta */}
                        <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                            <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {plan.start_time?.substring(0, 5) || '07:00'}
                            </span>
                            {plan.vehicle_names && (
                                <span className="flex items-center gap-1">
                                    <Truck className="h-3 w-3" />
                                    {plan.vehicle_names}
                                </span>
                            )}
                            {plan.service_type && (
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{plan.service_type}</span>
                            )}
                        </div>

                        {/* Staff */}
                        {plan.staff && plan.staff.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                                <Users className="h-3 w-3 text-slate-400 mr-0.5" />
                                {plan.staff.map(s => (
                                    <span key={s.id} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">
                                        {s.employee?.name?.split(' ')[0] || '?'}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                {dayPlans.length === 0 && !isOver && (
                    <div className="h-full min-h-[120px] border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-300 text-xs">
                        Keine Einsätze
                    </div>
                )}
            </div>
        </div>
    );
}

export function ThreeDayView({ startDate, plans, onDayClick, onDelete, onEditPlan }: ThreeDayViewProps) {
    const days = [startDate, addDays(startDate, 1), addDays(startDate, 2)];

    return (
        <div className="flex-1 overflow-auto p-4">
            <div className="grid grid-cols-3 gap-4 h-full min-h-[500px]">
                {days.map(day => (
                    <ThreeDayColumn
                        key={format(day, 'yyyy-MM-dd')}
                        day={day}
                        plans={plans}
                        onDayClick={onDayClick}
                        onDelete={onDelete}
                        onEditPlan={onEditPlan}
                    />
                ))}
            </div>
        </div>
    );
}
