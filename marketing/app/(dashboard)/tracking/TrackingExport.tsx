'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { Download, Loader2, X, FileText, FileType } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface TrackingRow {
    _tempId: string;
    pair_id: string | null;
    project_id: string | null;
    project_name: string;
    project_code: string;
    mitarbeiter: string;
    lis_von: string;
    lis_bis: string;
    kunde_von: string;
    kunde_bis: string;
    pause_min: number;
    notes: string;
    datum?: string;
    replaced_by: string | null;
    is_replacement: boolean;
}

interface ProjectMatRow {
    material_name: string;
    unit: string;
    quantity: number;
}

interface ProjectSvcRow {
    service_name: string;
    supplier: string;
    quantity: number;
}

interface ProjectExtraRow {
    cost_type: string;
    description: string;
    cost: number;
}

interface EmployeeInfo {
    name: string;
    contract_type?: string;
}

interface TrackingExportProps {
    rows: TrackingRow[];
    projectMaterials: Record<string, ProjectMatRow[]>;
    projectServices: Record<string, ProjectSvcRow[]>;
    projectExtraCosts: Record<string, ProjectExtraRow[]>;
    currentDate: Date;
    viewMode: 'day' | 'project';
    selectedProjectId: string;
    employees: EmployeeInfo[];
}

export function TrackingExport({
    rows,
    projectMaterials,
    projectServices,
    projectExtraCosts,
    currentDate,
    viewMode,
    selectedProjectId,
    employees,
}: TrackingExportProps) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [exportFormat, setExportFormat] = useState<'html' | 'pdf'>('html');

    const calculateHours = (von: string, bis: string, pauseMin = 0): string => {
        if (!von || !bis) return '—';
        const [vh, vm] = von.split(':').map(Number);
        const [bh, bm] = bis.split(':').map(Number);
        const totalMin = (bh * 60 + bm) - (vh * 60 + vm) - pauseMin;
        if (totalMin <= 0) return '—';
        return (totalMin / 60).toFixed(2);
    };

    const escapeHtml = (str: any) => {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };

    const fmtEuro = (val: number) =>
        new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(val);

    const buildTrackingHtml = (): string => {
        const activeRows = rows.filter(r => !r.replaced_by);

        // Group by project
        const grouped: Record<string, TrackingRow[]> = {};
        activeRows.forEach(row => {
            const key = row.project_id || 'unassigned';
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(row);
        });

        const dateLabel = viewMode === 'day'
            ? format(currentDate, 'dd.MM.yyyy')
            : (rows[0]?.project_name || 'Projekt');

        const css = `
        :root {
            --color-bg: #f5f5f8;
            --color-surface: #ffffff;
            --color-border: #d2d6e0;
            --color-text: #222333;
            --color-muted: #7a8090;
            --color-primary: #1f6feb;
            --color-primary-soft: #e4edff;
            --radius-card: 8px;
            --shadow-soft: 0 2px 6px rgba(15,23,42,0.08);
        }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 12px; color: var(--color-text); background: var(--color-bg); }
        .page { max-width: 1000px; margin: 16px auto; padding: 24px 28px 32px; background: var(--color-surface); border-radius: 10px; box-shadow: var(--shadow-soft); }
        .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--color-border); }
        .header-left { display: flex; align-items: center; gap: 12px; }
        .logo { width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, var(--color-primary), #3b82f6); display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; color: #fff; }
        .header-title { font-size: 20px; font-weight: 700; }
        .header-sub { font-size: 11px; color: var(--color-muted); }
        .chip { padding: 4px 10px; border-radius: 999px; font-size: 11px; background: var(--color-primary-soft); color: var(--color-primary); font-weight: 600; }
        .project-block { margin-top: 24px; page-break-inside: avoid; }
        .project-title { font-size: 15px; font-weight: 700; margin-bottom: 2px; color: #111827; }
        .project-code { font-size: 11px; font-family: monospace; color: var(--color-muted); margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
        th, td { border: 1px solid #d2d6e0; padding: 4px 8px; vertical-align: top; font-size: 11px; }
        th { background: #f3f4f8; font-weight: 600; text-align: left; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .total-row td { font-weight: 700; background: #f8fafc; }
        .section-label { font-size: 13px; font-weight: 600; margin-top: 14px; margin-bottom: 6px; color: #374151; display: flex; align-items: center; gap: 6px; }
        .section-label .icon { display: inline-block; width: 8px; height: 8px; border-radius: 2px; }
        .icon-amber { background: #f59e0b; }
        .icon-purple { background: #8b5cf6; }
        .icon-slate { background: #64748b; }
        .empty { color: var(--color-muted); font-style: italic; padding: 8px; }
        .footer { margin-top: 20px; font-size: 10px; color: var(--color-muted); text-align: right; border-top: 1px solid var(--color-border); padding-top: 6px; }
        .divider { border: 0; border-top: 1px dashed #e2e5ea; margin: 18px 0; }
        .summary-block { margin-top: 28px; page-break-inside: avoid; }
        .summary-title { font-size: 16px; font-weight: 700; margin-bottom: 4px; color: #111827; display: flex; align-items: center; gap: 8px; }
        .summary-sub { font-size: 11px; color: var(--color-muted); margin-bottom: 10px; }
        .group-header td { font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; padding: 6px 8px; }
        .group-header-intern td { background: #eff6ff; color: #1e40af; border-bottom: 1px solid #bfdbfe; }
        .group-header-extern td { background: #fff7ed; color: #9a3412; border-bottom: 1px solid #fed7aa; }
        .subtotal-row td { font-weight: 600; font-size: 10px; background: #f8fafc; }
        .grand-total td { font-weight: 700; background: #f1f5f9; border-top: 2px solid #cbd5e1; }
        .badge { display: inline-block; padding: 1px 6px; border-radius: 999px; font-size: 10px; font-weight: 600; }
        .badge-intern { background: #dbeafe; color: #1d4ed8; }
        .badge-extern { background: #ffedd5; color: #c2410c; }
        .badge-green { background: #dcfce7; color: #15803d; }
        .replaced-block { margin-top: 28px; page-break-inside: avoid; }
        .replaced-title { font-size: 16px; font-weight: 700; margin-bottom: 4px; color: #111827; display: flex; align-items: center; gap: 8px; }
        .replaced-sub { font-size: 11px; color: #ef4444; margin-bottom: 10px; }
        @media print {
            body { background: #fff; }
            .page { margin: 0; border-radius: 0; box-shadow: none; }
            .project-block { page-break-inside: avoid; }
            .summary-block { page-break-inside: avoid; }
            .replaced-block { page-break-inside: avoid; }
        }
        `;

        let projectsHtml = '';

        Object.entries(grouped).forEach(([projectId, projectRows]) => {
            const projectTitle = projectId === 'unassigned' ? 'Ohne Projekt' : (projectRows[0]?.project_name || 'Unbenannt');
            const projectCode = projectId === 'unassigned' ? '' : (projectRows[0]?.project_code || '');

            // Time pairs table
            let totalLiS = 0;
            let totalKd = 0;
            const timeRowsHtml = projectRows.map(row => {
                const lisH = calculateHours(row.lis_von, row.lis_bis, row.pause_min);
                const kdH = calculateHours(row.kunde_von, row.kunde_bis);
                if (lisH !== '—') totalLiS += parseFloat(lisH);
                if (kdH !== '—') totalKd += parseFloat(kdH);
                return `<tr>
                    ${viewMode === 'project' ? `<td>${row.datum ? format(new Date(row.datum), 'dd.MM.yyyy') : '—'}</td>` : ''}
                    <td>${escapeHtml(row.mitarbeiter)}</td>
                    <td class="text-center">${escapeHtml(row.lis_von) || '—'}</td>
                    <td class="text-center">${escapeHtml(row.lis_bis) || '—'}</td>
                    <td class="text-center">${lisH}</td>
                    <td class="text-center">${escapeHtml(row.kunde_von) || '—'}</td>
                    <td class="text-center">${escapeHtml(row.kunde_bis) || '—'}</td>
                    <td class="text-center">${kdH}</td>
                    <td class="text-center">${row.pause_min || '—'}</td>
                    <td>${escapeHtml(row.notes)}</td>
                </tr>`;
            }).join('');

            const timeHeaders = [
                ...(viewMode === 'project' ? ['Datum'] : []),
                'Mitarbeiter', 'LiS Von', 'LiS Bis', 'Σ LiS', 'Kd Von', 'Kd Bis', 'Σ Kd', 'Pause', 'Notizen'
            ];
            const colCount = timeHeaders.length;

            const timeTotalRow = `<tr class="total-row">
                ${viewMode === 'project' ? '<td></td>' : ''}
                <td>Gesamt</td>
                <td></td><td></td>
                <td class="text-center">${totalLiS > 0 ? totalLiS.toFixed(2) : '—'}</td>
                <td></td><td></td>
                <td class="text-center">${totalKd > 0 ? totalKd.toFixed(2) : '—'}</td>
                <td></td><td></td>
            </tr>`;

            // Material table
            const mats = projectMaterials[projectId] || [];
            let matsHtml = '';
            if (mats.length > 0) {
                matsHtml = `
                <div class="section-label"><span class="icon icon-amber"></span> Material</div>
                <table>
                    <thead><tr><th>Material</th><th class="text-right" style="width:80px">Menge</th><th style="width:60px">Einheit</th></tr></thead>
                    <tbody>${mats.map(m => `<tr><td>${escapeHtml(m.material_name)}</td><td class="text-right">${m.quantity}</td><td>${escapeHtml(m.unit)}</td></tr>`).join('')}</tbody>
                </table>`;
            }

            // Services table
            const svcs = projectServices[projectId] || [];
            let svcsHtml = '';
            if (svcs.length > 0) {
                svcsHtml = `
                <div class="section-label"><span class="icon icon-purple"></span> Dienstleistungskosten</div>
                <table>
                    <thead><tr><th>Leistung</th><th style="width:140px">Lieferant</th><th class="text-right" style="width:80px">Menge</th></tr></thead>
                    <tbody>${svcs.map(s => `<tr><td>${escapeHtml(s.service_name)}</td><td>${escapeHtml(s.supplier)}</td><td class="text-right">${s.quantity}</td></tr>`).join('')}</tbody>
                </table>`;
            }

            // Extra costs table
            const extras = projectExtraCosts[projectId] || [];
            let extrasHtml = '';
            if (extras.length > 0) {
                extrasHtml = `
                <div class="section-label"><span class="icon icon-slate"></span> Sonderkosten</div>
                <table>
                    <thead><tr><th>Typ</th><th>Beschreibung</th><th class="text-right" style="width:100px">Kosten</th></tr></thead>
                    <tbody>${extras.map(e => `<tr><td>${escapeHtml(e.cost_type)}</td><td>${escapeHtml(e.description)}</td><td class="text-right">${fmtEuro(e.cost)}</td></tr>`).join('')}</tbody>
                </table>`;
            }

            projectsHtml += `
            <div class="project-block">
                <div class="project-title">${escapeHtml(projectTitle)}</div>
                ${projectCode ? `<div class="project-code">${escapeHtml(projectCode)}</div>` : ''}
                <table>
                    <thead><tr>${timeHeaders.map(h => `<th class="${h.startsWith('Σ') || h === 'Pause' ? 'text-center' : ''}">${h}</th>`).join('')}</tr></thead>
                    <tbody>${timeRowsHtml}${timeTotalRow}</tbody>
                </table>
                ${matsHtml}${svcsHtml}${extrasHtml}
            </div>
            <hr class="divider" />`;
        });

        // ===== GESAMTÜBERSICHT (All Employees Summary) =====
        const buildGesamtuebersichtHtml = (): string => {
            const activeRows = rows.filter(r => !r.replaced_by);
            if (activeRows.length === 0) return '';

            // Build contract type lookup
            const contractMap: Record<string, string> = {};
            employees.forEach(emp => {
                if (emp.name) contractMap[emp.name] = emp.contract_type || 'Intern';
            });

            // Group by employee
            const empMap: Record<string, { lisTotal: number; kdTotal: number; pauseTotal: number; count: number; projects: Set<string>; lisVonMin: string; lisBisMax: string; kdVonMin: string; kdBisMax: string; contractType: string }> = {};
            activeRows.forEach(row => {
                const key = row.mitarbeiter || '(Unbekannt)';
                if (!empMap[key]) empMap[key] = { lisTotal: 0, kdTotal: 0, pauseTotal: 0, count: 0, projects: new Set(), lisVonMin: '', lisBisMax: '', kdVonMin: '', kdBisMax: '', contractType: contractMap[key] || 'Intern' };
                const lisH = calculateHours(row.lis_von, row.lis_bis, row.pause_min);
                const kdH = calculateHours(row.kunde_von, row.kunde_bis);
                empMap[key].lisTotal += lisH === '—' ? 0 : parseFloat(lisH);
                empMap[key].kdTotal += kdH === '—' ? 0 : parseFloat(kdH);
                empMap[key].pauseTotal += row.pause_min || 0;
                empMap[key].count += 1;
                if (row.project_name) empMap[key].projects.add(row.project_name);
                if (row.lis_von && (!empMap[key].lisVonMin || row.lis_von < empMap[key].lisVonMin)) empMap[key].lisVonMin = row.lis_von;
                if (row.lis_bis && (!empMap[key].lisBisMax || row.lis_bis > empMap[key].lisBisMax)) empMap[key].lisBisMax = row.lis_bis;
                if (row.kunde_von && (!empMap[key].kdVonMin || row.kunde_von < empMap[key].kdVonMin)) empMap[key].kdVonMin = row.kunde_von;
                if (row.kunde_bis && (!empMap[key].kdBisMax || row.kunde_bis > empMap[key].kdBisMax)) empMap[key].kdBisMax = row.kunde_bis;
            });

            const allEntries = Object.entries(empMap).sort((a, b) => a[0].localeCompare(b[0]));
            const internEntries = allEntries.filter(([, d]) => d.contractType !== 'Extern');
            const externEntries = allEntries.filter(([, d]) => d.contractType === 'Extern');

            const colCount = viewMode === 'day' ? 10 : 9;

            const renderRow = ([name, data]: [string, typeof empMap[string]]) => `<tr>
                <td>${escapeHtml(name)}</td>
                ${viewMode === 'day' ? `<td style="font-size:10px;color:#64748b">${escapeHtml(Array.from(data.projects).join(', ') || '—')}</td>` : ''}
                <td class="text-center">${data.lisVonMin || '—'}</td>
                <td class="text-center">${data.lisBisMax || '—'}</td>
                <td class="text-center" style="font-weight:600">${data.lisTotal > 0 ? data.lisTotal.toFixed(2) : '—'}</td>
                <td class="text-center">${data.kdVonMin || '—'}</td>
                <td class="text-center">${data.kdBisMax || '—'}</td>
                <td class="text-center" style="font-weight:600">${data.kdTotal > 0 ? data.kdTotal.toFixed(2) : '—'}</td>
                <td class="text-center">${data.pauseTotal > 0 ? `${data.pauseTotal} min` : '—'}</td>
                <td class="text-center">${data.count}</td>
            </tr>`;

            const calcTotals = (group: typeof allEntries) => ({
                lis: group.reduce((s, [, v]) => s + v.lisTotal, 0),
                kd: group.reduce((s, [, v]) => s + v.kdTotal, 0),
                pause: group.reduce((s, [, v]) => s + v.pauseTotal, 0),
                count: group.reduce((s, [, v]) => s + v.count, 0),
            });

            const renderSubtotal = (label: string, badgeClass: string, totals: ReturnType<typeof calcTotals>, empCount: number) => `<tr class="subtotal-row">
                <td><span class="badge ${badgeClass}">${label}</span> <span style="color:#94a3b8;margin-left:4px">${empCount} Mitarbeiter</span></td>
                ${viewMode === 'day' ? '<td></td>' : ''}
                <td></td><td></td>
                <td class="text-center">${totals.lis > 0 ? totals.lis.toFixed(2) : '—'}</td>
                <td></td><td></td>
                <td class="text-center">${totals.kd > 0 ? totals.kd.toFixed(2) : '—'}</td>
                <td class="text-center">${totals.pause > 0 ? `${totals.pause} min` : '—'}</td>
                <td class="text-center">${totals.count}</td>
            </tr>`;

            const grandTotals = calcTotals(allEntries);

            const headers = [
                'Mitarbeiter',
                ...(viewMode === 'day' ? ['Projekt(e)'] : []),
                'LiS Von', 'LiS Bis', 'Σ LiS Std.', 'Kd Von', 'Kd Bis', 'Σ Kd Std.', 'Σ Pause', 'Einträge'
            ];

            let body = '';
            if (internEntries.length > 0) {
                body += `<tr class="group-header group-header-intern"><td colspan="${colCount}">👷 Interne Mitarbeiter</td></tr>`;
                body += internEntries.map(renderRow).join('');
                body += renderSubtotal('Intern', 'badge-intern', calcTotals(internEntries), internEntries.length);
            }
            if (externEntries.length > 0) {
                body += `<tr class="group-header group-header-extern"><td colspan="${colCount}">🤝 Externe Mitarbeiter</td></tr>`;
                body += externEntries.map(renderRow).join('');
                body += renderSubtotal('Extern', 'badge-extern', calcTotals(externEntries), externEntries.length);
            }
            body += `<tr class="grand-total">
                <td>Gesamt</td>
                ${viewMode === 'day' ? `<td style="font-size:10px;color:#64748b">${allEntries.length} Mitarbeiter</td>` : ''}
                <td></td><td></td>
                <td class="text-center">${grandTotals.lis > 0 ? grandTotals.lis.toFixed(2) : '—'}</td>
                <td></td><td></td>
                <td class="text-center">${grandTotals.kd > 0 ? grandTotals.kd.toFixed(2) : '—'}</td>
                <td class="text-center">${grandTotals.pause > 0 ? `${grandTotals.pause} min` : '—'}</td>
                <td class="text-center">${grandTotals.count}</td>
            </tr>`;

            return `
            <div class="summary-block">
                <div class="summary-title">⏱ Gesamtübersicht</div>
                <div class="summary-sub">Alle Mitarbeiter</div>
                <table>
                    <thead><tr>${headers.map(h => `<th class="${h.startsWith('Σ') || h === 'Einträge' ? 'text-center' : ''}">${h}</th>`).join('')}</tr></thead>
                    <tbody>${body}</tbody>
                </table>
            </div>`;
        };

        // ===== ERSETZTE MITARBEITER =====
        const buildErsetzteHtml = (): string => {
            const replacedRows = rows.filter(r => !!r.replaced_by);
            if (replacedRows.length === 0) return '';

            const headers = [
                'Original Mitarbeiter', 'Projekt',
                ...(viewMode === 'project' ? ['Datum'] : []),
                'LiS Von', 'LiS Bis', 'Σ LiS', 'Kd Von', 'Kd Bis', 'Σ Kd', 'Pause', 'Ersetzt durch'
            ];

            const body = replacedRows.map(row => {
                const replacementRow = rows.find(r => r.pair_id === row.replaced_by);
                const lisH = calculateHours(row.lis_von, row.lis_bis, row.pause_min);
                const kdH = calculateHours(row.kunde_von, row.kunde_bis);
                return `<tr>
                    <td>${escapeHtml(row.mitarbeiter)}</td>
                    <td style="font-size:10px">${escapeHtml(row.project_name || '—')}</td>
                    ${viewMode === 'project' ? `<td>${row.datum ? format(new Date(row.datum), 'dd.MM.yyyy') : '—'}</td>` : ''}
                    <td class="text-center">${escapeHtml(row.lis_von) || '—'}</td>
                    <td class="text-center">${escapeHtml(row.lis_bis) || '—'}</td>
                    <td class="text-center" style="font-weight:600">${lisH}</td>
                    <td class="text-center">${escapeHtml(row.kunde_von) || '—'}</td>
                    <td class="text-center">${escapeHtml(row.kunde_bis) || '—'}</td>
                    <td class="text-center" style="font-weight:600">${kdH}</td>
                    <td class="text-center">${row.pause_min > 0 ? `${row.pause_min} min` : '—'}</td>
                    <td>${row.replaced_by === 'crossed_out' ? '<span class="badge" style="background:#fef3c7;color:#92400e">✕ Gestrichen</span>' : (replacementRow ? `<span class="badge badge-green">→ ${escapeHtml(replacementRow.mitarbeiter)}</span>` : '—')}</td>
                </tr>`;
            }).join('');

            return `
            <div class="replaced-block">
                <div class="replaced-title">🔄 Ersetzte / Gestrichene Mitarbeiter</div>
                <div class="replaced-sub">${replacedRows.filter(r => r.replaced_by !== 'crossed_out').length} Ersetzungen, ${replacedRows.filter(r => r.replaced_by === 'crossed_out').length} Streichungen</div>
                <table>
                    <thead><tr>${headers.map(h => `<th class="${h.startsWith('Σ') || h === 'Pause' ? 'text-center' : ''}">${h}</th>`).join('')}</tr></thead>
                    <tbody>${body}</tbody>
                </table>
            </div>`;
        };

        const subtitle = viewMode === 'day'
            ? `Tagesübersicht · ${format(currentDate, 'dd.MM.yyyy')}`
            : `Projektansicht · ${rows[0]?.project_name || ''}`;

        return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><title>Rückerfassung ${dateLabel}</title>
<style>${css}</style></head>
<body>
<div class="page">
    <div class="header">
        <div class="header-left">
            <div class="logo">LiS</div>
            <div>
                <div class="header-title">Rückerfassung</div>
                <div class="header-sub">${escapeHtml(subtitle)}</div>
            </div>
        </div>
        <div class="chip">${escapeHtml(dateLabel)}</div>
    </div>
    ${projectsHtml}
    ${buildGesamtuebersichtHtml()}
    ${buildErsetzteHtml()}
    <div class="footer">Erstellt am: ${new Date().toLocaleString('de-DE')} · Land in Sicht GmbH</div>
</div>
</body></html>`;
    };

    const handleExport = async () => {
        setLoading(true);
        try {
            const html = buildTrackingHtml();

            if (exportFormat === 'html') {
                const blob = new Blob([html], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const dateStr = format(currentDate, 'yyyy-MM-dd');
                a.download = `Rueckerfassung_${dateStr}.html`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast(`Rueckerfassung_${dateStr}.html exportiert`, 'success');
            } else {
                const html2pdf = (await import('html2pdf.js')).default;
                const container = document.createElement('div');
                container.innerHTML = html;
                document.body.appendChild(container);
                const dateStr = format(currentDate, 'yyyy-MM-dd');
                await html2pdf().set({
                    margin: 8,
                    filename: `Rueckerfassung_${dateStr}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
                    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
                }).from(container).save();
                document.body.removeChild(container);
                toast(`Rueckerfassung_${dateStr}.pdf exportiert`, 'success');
            }
            setOpen(false);
        } catch (error) {
            console.error(error);
            toast('Fehler beim Export.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all shadow-sm"
            >
                <Download className="h-4 w-4" />
                Export
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm m-4 overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b px-4 py-3 bg-slate-50">
                            <h3 className="text-sm font-bold text-slate-800">Rückerfassung exportieren</h3>
                            <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <p className="text-xs text-slate-500 bg-blue-50 p-2 rounded border border-blue-100">
                                {viewMode === 'day'
                                    ? `Exportiert alle Zeitpaare und Kosten für den ${format(currentDate, 'dd.MM.yyyy')}.`
                                    : `Exportiert alle Zeitpaare und Kosten für das ausgewählte Projekt.`
                                }
                            </p>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-medium text-slate-500">Format wählen</label>
                                <div className="flex bg-slate-100 p-1 rounded-lg">
                                    <button
                                        onClick={() => setExportFormat('html')}
                                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${exportFormat === 'html' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <FileText className="h-3 w-3" /> HTML
                                    </button>
                                    <button
                                        onClick={() => setExportFormat('pdf')}
                                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${exportFormat === 'pdf' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <FileType className="h-3 w-3" /> PDF
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 bg-slate-50 px-4 py-3 border-t">
                            <button
                                onClick={() => setOpen(false)}
                                className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                            >
                                Abbrechen
                            </button>
                            <button
                                onClick={handleExport}
                                disabled={loading || rows.length === 0}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                Exportieren
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
