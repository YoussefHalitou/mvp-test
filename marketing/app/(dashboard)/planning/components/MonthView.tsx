import React from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { MorningPlan, EmployeeEvent, Employee } from './types';

const EVENT_EMOJI: Record<string, string> = {
    'Urlaub': '🏖', 'Termin': '📅', 'Krankheit': '🤒', 'Schulung': '📚', 'Sonstiges': '📌',
};

interface MonthViewProps {
    currentDate: Date;
    plans: MorningPlan[];
    employeeEvents?: EmployeeEvent[];
    employees?: Employee[];
    onDayClick: (dateStr: string) => void;
}

const SERVICE_COLORS: Record<string, string> = {
    'Umzug': 'bg-blue-500', 'Entrümpelung': 'bg-amber-500', 'Transport': 'bg-emerald-500',
    'Einlagerung': 'bg-purple-500', 'Malerarbeiten': 'bg-rose-500', 'Kartonlieferung': 'bg-cyan-500', 'Sonstiges': 'bg-slate-400',
};

export function MonthView({ currentDate, plans, employeeEvents = [], employees = [], onDayClick }: MonthViewProps) {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const today = new Date();
    const weekDayHeaders = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    const employeeMap = React.useMemo(() => new Map(employees.map(e => [e.employee_id, e])), [employees]);

    const plansByDate = React.useMemo(() => {
        const map: Record<string, MorningPlan[]> = {};
        plans.forEach(p => { if (!map[p.plan_date]) map[p.plan_date] = []; map[p.plan_date].push(p); });
        return map;
    }, [plans]);

    return (
        <div className="flex-1 overflow-auto p-4">
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-7 mb-1">
                    {weekDayHeaders.map(d => <div key={d} className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider py-2">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 border-t border-l border-slate-200 rounded-xl overflow-hidden">
                    {allDays.map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const isCurrentMonth = isSameMonth(day, currentDate);
                        const isToday = isSameDay(day, today);
                        const dayPlans = plansByDate[dateStr] || [];
                        const dayEvents = employeeEvents.filter(e => e.start_date <= dateStr && e.end_date >= dateStr);
                        const maxVisible = 3;
                        const totalItems = dayPlans.length + dayEvents.length;
                        const overflow = totalItems - maxVisible;

                        return (
                            <div key={dateStr} onClick={() => onDayClick(dateStr)}
                                className={cn("min-h-[100px] border-r border-b border-slate-200 p-1.5 cursor-pointer transition-colors hover:bg-blue-50/50 group", !isCurrentMonth && "bg-slate-50/50")}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className={cn("text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full transition-colors",
                                        isToday ? "bg-blue-600 text-white" : isCurrentMonth ? "text-slate-700" : "text-slate-300")}>{format(day, 'd')}</span>
                                    {totalItems > 0 && <span className="text-[10px] text-slate-400 font-medium">{totalItems}</span>}
                                </div>
                                <div className="space-y-0.5">
                                    {dayEvents.slice(0, maxVisible).map(ev => {
                                        const emp = employeeMap.get(ev.employee_id);
                                        const name = emp?.name?.split(' ')[0] || '?';
                                        const emoji = EVENT_EMOJI[ev.event_type] || '📌';
                                        return <div key={ev.id} className="text-[10px] leading-tight rounded px-1.5 py-0.5 bg-amber-100 text-amber-800 truncate">{emoji} {name}</div>;
                                    })}
                                    {dayPlans.slice(0, Math.max(0, maxVisible - dayEvents.length)).map(plan => {
                                        const color = SERVICE_COLORS[plan.service_type || ''] || 'bg-slate-400';
                                        return <div key={plan.plan_id} className={cn("text-[10px] leading-tight rounded px-1.5 py-0.5 text-white truncate", color)}>{plan.start_time?.substring(0, 5)} {plan.project?.name || 'Einsatz'}</div>;
                                    })}
                                    {overflow > 0 && <div className="text-[10px] text-slate-400 font-medium px-1">+{overflow} weitere</div>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
