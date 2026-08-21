import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { parseValidDate } from '@/lib/date-utils';
import { Project } from './types';

export function DraggableProject({ project, planDates }: { project: Project; planDates: string[] }) {
    const formattedPlanDates = Array.from(new Set(planDates))
        .map(parseValidDate)
        .filter((date): date is Date => date !== null)
        .sort((a, b) => a.getTime() - b.getTime());
    const visibleDateLabels = formattedPlanDates.slice(0, 4).map(date => format(date, 'dd.MM.'));
    const remainingDateCount = formattedPlanDates.length - visibleDateLabels.length;
    const dateLabel = visibleDateLabels.length > 0
        ? `${visibleDateLabels.join(' · ')}${remainingDateCount > 0 ? ` +${remainingDateCount}` : ''}`
        : 'Ohne Einsatz';
    const dateTitle = formattedPlanDates.length > 0
        ? `Einsatztage: ${formattedPlanDates.map(date => format(date, 'dd.MM.yyyy')).join(', ')}`
        : 'Noch keinem Einsatztag zugeordnet';
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `project-${project.project_id}`,
        data: { type: 'project', project },
    });
    return (
        <div ref={setNodeRef} {...listeners} {...attributes}
            className={cn("cursor-grab active:cursor-grabbing rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:border-blue-300 hover:shadow-md transition-all touch-none", isDragging && "opacity-50")}>
            <div className="flex justify-between items-start mb-1">
                <span title={dateTitle} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 truncate max-w-[170px]">
                    {dateLabel}
                </span>
                <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded",
                    project.status === 'Bestätigt' ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700")}>{project.status || 'Planung'}</span>
            </div>
            <h4 className="font-medium text-sm text-slate-800 truncate">{project.name}</h4>
            {project.ort && <div className="text-[10px] text-slate-400 truncate">{project.plz} {project.ort}</div>}
        </div>
    );
}
