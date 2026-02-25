import React from 'react';
import { EmployeeEvent, Employee } from './types';

const EVENT_EMOJI: Record<string, string> = {
    'Urlaub': '🏖',
    'Termin': '📅',
    'Krankheit': '🤒',
    'Schulung': '📚',
    'Sonstiges': '📌',
};

const EVENT_COLORS: Record<string, string> = {
    'Urlaub': 'bg-amber-100 text-amber-800 border-amber-200',
    'Termin': 'bg-blue-100 text-blue-800 border-blue-200',
    'Krankheit': 'bg-red-100 text-red-800 border-red-200',
    'Schulung': 'bg-violet-100 text-violet-800 border-violet-200',
    'Sonstiges': 'bg-slate-100 text-slate-700 border-slate-200',
};

interface EmployeeEventsBannerProps {
    events: EmployeeEvent[];
    employees: Employee[];
}

export function EmployeeEventsBanner({ events, employees }: EmployeeEventsBannerProps) {
    const employeeMap = new Map(employees.map(e => [e.employee_id, e]));

    // Group events by employee for compact display
    const grouped = events.reduce<Record<string, EmployeeEvent[]>>((acc, ev) => {
        const empName = employeeMap.get(ev.employee_id)?.name || 'Unbekannt';
        if (!acc[empName]) acc[empName] = [];
        acc[empName].push(ev);
        return acc;
    }, {});

    return (
        <div className="bg-amber-50/60 border-b border-amber-200/50 px-4 py-2 flex items-center gap-2 overflow-x-auto shrink-0">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider whitespace-nowrap mr-1">
                Abwesenheiten
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
                {Object.entries(grouped).map(([empName, empEvents]) =>
                    empEvents.map(ev => {
                        const emoji = EVENT_EMOJI[ev.event_type] || '📌';
                        const colors = EVENT_COLORS[ev.event_type] || EVENT_COLORS['Sonstiges'];
                        const dateRange = ev.start_date === ev.end_date
                            ? ev.start_date.substring(5).replace('-', '.')
                            : `${ev.start_date.substring(5).replace('-', '.')}-${ev.end_date.substring(5).replace('-', '.')}`;
                        const timeStr = ev.start_time && ev.end_time
                            ? ` ${ev.start_time.substring(0, 5)}-${ev.end_time.substring(0, 5)}`
                            : '';
                        return (
                            <span
                                key={ev.id}
                                className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${colors}`}
                                title={`${empName}: ${ev.event_type} (${dateRange})${timeStr}${ev.notes ? ' – ' + ev.notes : ''}`}
                            >
                                {emoji} {empName.split(' ')[0]} <span className="opacity-60">{dateRange}{timeStr}</span>
                            </span>
                        );
                    })
                )}
            </div>
        </div>
    );
}
