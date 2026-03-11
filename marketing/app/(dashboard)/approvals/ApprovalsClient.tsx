'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/toast';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
    ClipboardCheck, CheckCircle2, XCircle, Clock, Loader2, FileText,
    ChevronDown, User, Calendar, MessageSquare, Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

// German month names for folder creation
const GERMAN_MONTHS = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

interface Submission {
    id: string;
    project_id: string;
    submitted_by: string;
    submitted_at: string;
    status: 'pending' | 'accepted' | 'rejected';
    reviewed_by: string | null;
    reviewed_at: string | null;
    rejection_comment: string | null;
    snapshot_data: any;
    file_id: string | null;
}

export default function ApprovalsClient() {
    const { toast } = useToast();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectComment, setRejectComment] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
    const [userEmail, setUserEmail] = useState('');

    // Fetch current user
    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) setUserEmail(user.email);
        })();
    }, []);

    // Fetch submissions
    const fetchSubmissions = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('t_nachkalkulation_submissions')
                .select('*')
                .order('submitted_at', { ascending: false });
            if (error) throw error;
            setSubmissions(data || []);
        } catch (err) {
            console.error('Error fetching submissions:', err);
            toast('Fehler beim Laden der Freigaben', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

    // Filtered submissions
    const filtered = filterStatus === 'all'
        ? submissions
        : submissions.filter(s => s.status === filterStatus);

    // ---- Folder Helpers ----
    const ensureFolder = async (name: string, parentId: string | null): Promise<string> => {
        // Check if folder already exists
        let query = supabase.from('t_folders').select('id').eq('name', name);
        if (parentId) {
            query = query.eq('parent_id', parentId);
        } else {
            query = query.is('parent_id', null);
        }
        const { data: existing } = await query.maybeSingle();
        if (existing) return existing.id;

        // Create folder
        const { data: created, error } = await supabase.from('t_folders').insert({
            name,
            parent_id: parentId,
        }).select('id').single();
        if (error) throw error;
        return created.id;
    };

    const ensureFolderHierarchy = async (projectDate: string | null): Promise<string> => {
        const date = projectDate ? new Date(projectDate) : new Date();
        const year = date.getFullYear().toString();
        const monthName = GERMAN_MONTHS[date.getMonth()];

        // Nachkalkulation (root)
        const rootId = await ensureFolder('Nachkalkulation', null);
        // Year
        const yearId = await ensureFolder(year, rootId);
        // Month
        const monthId = await ensureFolder(monthName, yearId);
        return monthId;
    };

    // ---- Generate PDF from snapshot ----
    const generatePdfBlob = async (snapshot: any): Promise<Blob> => {
        const s = snapshot;
        const numFormat = (n: number) => n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

        // Build the same HTML as exportAuftragsnachkalkulationHTML
        const rateMap = new Map<number, { names: string[], std: number, satz: number, kosten: number }>();
        let gesamtStd = 0;
        (s.adjustedPersonnel || []).forEach((p: any) => {
            const hours = p._basis === 'lis' ? p.lis_stunden : p.kunden_stunden;
            gesamtStd += hours;
            const existing = rateMap.get(p.satz) || { names: [] as string[], std: 0, satz: p.satz, kosten: 0 };
            if (!existing.names.includes(p.mitarbeiter)) existing.names.push(p.mitarbeiter);
            existing.std += hours;
            existing.kosten += p.kosten;
            rateMap.set(p.satz, existing);
        });

        const materials = s.materials || [];
        const vehicles = s.vehicles || [];
        const services = s.services || [];
        const hvzCosts = s.hvzCosts || [];
        const bnkCosts = s.bnkCosts || [];
        const extraCosts = s.extraCosts || [];
        const discounts = s.discounts || [];
        const revenue = s.revenue || [];
        const isKvMode = s.isKvMode || false;
        const kvValues = s.kvValues || {};

        const materialKosten = materials.reduce((acc: number, m: any) => acc + (m.total_cost || 0), 0);
        const materialErloes = materials.reduce((acc: number, m: any) => acc + (m.total_price || 0), 0);
        const vehicleErloes = vehicles.reduce((acc: number, v: any) => acc + (v.total_cost || 0), 0);
        const serviceKosten = services.reduce((acc: number, sv: any) => acc + (sv.total_cost || 0), 0);
        const serviceErloes = services.reduce((acc: number, sv: any) => acc + (sv.total_price || sv.total_cost || 0), 0);
        const hvzKosten = hvzCosts.reduce((acc: number, h: any) => acc + ((h.tage || 0) * (h.ek_preis || 0)), 0);
        const hvzErloes = hvzCosts.reduce((acc: number, h: any) => acc + ((h.tage || 0) * (h.vk_preis || 0)), 0);
        const bnkKosten = bnkCosts.reduce((acc: number, b: any) => acc + ((b.menge || 0) * (b.ek_preis || 0)), 0);
        const bnkErloes = bnkCosts.reduce((acc: number, b: any) => acc + ((b.menge || 0) * (b.vk_preis || 0)), 0);
        const extraKosten = extraCosts.reduce((acc: number, e: any) => acc + (e.cost || 0), 0);
        const revenueTotal = revenue.reduce((acc: number, r: any) => acc + (r.line_total || 0), 0);
        const personalKosten = (s.adjustedPersonnel || []).reduce((acc: number, p: any) => acc + p.kosten, 0);
        const totalCosts = personalKosten + materialKosten + serviceKosten + extraKosten + hvzKosten + bnkKosten;
        const baseRevenue = revenueTotal + materialErloes + vehicleErloes + serviceErloes + hvzErloes + bnkErloes;
        const discountTotal = discounts.reduce((acc: number, d: any) => {
            const mode = d.mode || 'flat';
            if (mode === 'percent') return acc + (baseRevenue * ((d.value || 0) / 100));
            return acc + (d.value || 0);
        }, 0);
        const totalRevenue = baseRevenue - discountTotal;
        const margin = totalRevenue - totalCosts;
        const marginPct = totalRevenue > 0 ? (margin / totalRevenue) * 100 : 0;

        let lkwErloes = 0;
        vehicles.forEach((v: any) => { lkwErloes += v.total_cost || 0; });

        const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>Auftragsnachkalkulation – ${s.project?.name || ''}</title>
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body { font-family: "Inter", -apple-system, sans-serif; font-size: 11px; margin: 20px; color: #1e293b; background: white; }
    h1 { font-size: 20px; text-align: center; margin-bottom: 25px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
    .header-grid { display: flex; gap: 30px; margin-bottom: 25px; }
    .header-grid > div:first-child { flex: 3; }
    .header-grid > div:last-child { flex: 2; }
    .field-row { display: flex; margin-bottom: 12px; align-items: flex-end; }
    .field-row .label { font-size: 10px; font-weight: 600; width: 130px; color: #475569; }
    .field-row .value { flex: 1; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; min-height: 18px; font-size: 12px; font-weight: 500; }
    .box { border: 1px solid #94a3b8; border-radius: 4px; padding: 10px; height: 90px; font-size: 10px; font-weight: 600; color: #475569; background: #f8fafc; }
    .box-content { font-weight: 400; font-size: 11px; color: #1e293b; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; border-radius: 4px; overflow: hidden; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 10px; }
    th { text-align: center; font-weight: 600; color: #334155; background-color: #f1f5f9; text-transform: uppercase; font-size: 10px; letter-spacing: 0.03em; }
    .bg-green { background-color: #86efac; color: #166534; border-color: #4ade80; }
    .text-orange { color: #ea580c; font-weight: 600; }
    .right { text-align: right; }
    .center { text-align: center; }
    .val-container { display: flex; justify-content: space-between; width: 100%; }
    .val-container .cur { color: #94a3b8; }
    .summary-table { width: 320px; margin-left: auto; margin-top: 30px; border-collapse: separate; border-spacing: 0 4px; }
    .summary-table td { border: none; padding: 6px 10px; background: #f8fafc; }
    .summary-table tr:last-child td { background: none; }
    .summary-table td.label { font-weight: 600; width: 60%; color: #475569; border-radius: 4px 0 0 4px; }
    .summary-table td.val { text-align: right; font-weight: 500; border-radius: 0 4px 4px 0; }
    .summary-table tr.total td.val { font-weight: 700; border-bottom: 2px solid #334155; border-radius: 0; background: transparent; }
    .header-grid, table, .summary-table { page-break-inside: avoid; break-inside: avoid; }
    tr { page-break-inside: avoid; break-inside: avoid; }
</style>
</head><body>
    <h1>Auftragsnachkalkulation</h1>
    <div class="header-grid">
        <div>
            <div class="field-row"><div class="label">Rechnungsadresse</div><div class="value" style="border:none;"></div></div>
            <div class="field-row"><div class="value">${s.project?.anrede || ''} ${s.project?.name || ''}</div></div>
            <div class="field-row"><div class="value">${s.project?.strasse || ''} ${s.project?.nr || ''}</div></div>
            <div class="field-row"><div class="value">${s.project?.plz || ''} ${s.project?.ort || ''}</div></div>
        </div>
        <div class="box">Sonstige Bemerkungen<div class="box-content">${s.project?.notes || ''}</div></div>
    </div>
    <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
        <div class="field-row" style="width: 50%;"><div class="label">Telefonnummer Kunde:</div><div class="value">${s.project?.telefon || ''}</div></div>
        <div style="width: 40%; display:flex; align-items: flex-end;">
            <div style="font-size:10px; font-weight:600; margin-right:12px; color: #475569;">KV oder FP</div>
            <div style="flex:1; background-color:${isKvMode ? '#86efac' : '#fde68a'}; height:18px; border-radius:2px; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:700; color:${isKvMode ? '#166534' : '#92400e'};">${isKvMode ? 'KV' : 'FP'}</div>
        </div>
    </div>
    <div class="field-row"><div class="label">Auftragsdatum</div><div class="value">${s.project?.project_date ? new Date(s.project.project_date).toLocaleDateString('de-DE') : ''}</div></div>
    <div class="field-row"><div class="label">Aufgaben</div><div class="value">${s.project?.dienstleistungen || ''}</div></div>

    <table>
        <tr>
            <th style="text-align:left;">Kosten:</th>
            <th style="width:28%;">Land in Sicht</th>
            <th style="width:28%;">Kunde</th>
            ${isKvMode ? '<th class="bg-green" style="width:18%;">KV</th>' : ''}
        </tr>
        <tr>
            <td class="text-orange" style="background:#fff7ed;">Gesamt Std</td>
            <td class="center text-orange" style="background:#fff7ed;">${gesamtStd.toFixed(2)}</td>
            <td style="background:#fff7ed;"></td>
            ${isKvMode ? '<td style="background:#fff7ed;"></td>' : ''}
        </tr>
        ${Array.from(rateMap.values()).map((data, i) => {
            const kvCell = isKvMode ? (i > 0 ? '<td></td>' : `<td class="right">${kvValues['personalkosten'] ? numFormat(kvValues['personalkosten']) : ''}</td>`) : '';
            return `<tr>
            <td style="font-weight:600; color:#475569;">Stunden ${data.names.join(', ')} <span style="color:#94a3b8; font-weight:400;">(${data.std.toFixed(2)} Std.)</span></td>
            <td class="center"><div class="val-container"><span>${data.std.toFixed(2)} x ${numFormat(data.satz)} =</span><span>${numFormat(data.kosten)}</span></div></td>
            <td></td>
            ${kvCell}
        </tr>`;
        }).join('')}
        <tr>
            <td style="font-weight:600; color:#475569;">Entsorgungen</td>
            <td><div class="val-container"><span></span><span>${numFormat(serviceKosten)}</span></div></td>
            <td><div class="val-container"><span></span><span>${numFormat(serviceErloes)}</span></div></td>
            ${isKvMode ? `<td class="right">${kvValues['service_total'] ? numFormat(kvValues['service_total']) : ''}</td>` : ''}
        </tr>
        <tr>
            <td style="font-weight:600; color:#475569;">LKW</td>
            <td></td><td><div class="val-container"><span></span><span>${numFormat(lkwErloes)}</span></div></td>
            ${isKvMode ? `<td class="right">${kvValues['lkw'] ? numFormat(kvValues['lkw']) : ''}</td>` : ''}
        </tr>
        <tr>
            <td style="font-weight:600; color:#475569;">HVZ</td>
            <td><div class="val-container"><span></span><span>${numFormat(hvzKosten)}</span></div></td>
            <td><div class="val-container"><span></span><span>${numFormat(hvzErloes)}</span></div></td>
            ${isKvMode ? `<td class="right">${kvValues['hvz'] ? numFormat(kvValues['hvz']) : ''}</td>` : ''}
        </tr>
        <tr>
            <td style="font-weight:600; color:#475569;">Diesel / BNK</td>
            <td><div class="val-container"><span></span><span>${numFormat(bnkKosten)}</span></div></td>
            <td><div class="val-container"><span></span><span>${numFormat(bnkErloes)}</span></div></td>
            ${isKvMode ? `<td class="right">${kvValues['diesel'] ? numFormat(kvValues['diesel']) : ''}</td>` : ''}
        </tr>
        <tr>
            <td style="font-weight:600; color:#475569;">Sonstige Kosten</td>
            <td><div class="val-container"><span></span><span>${numFormat(extraKosten)}</span></div></td><td></td>
            ${isKvMode ? `<td class="right">${kvValues['extra'] ? numFormat(kvValues['extra']) : ''}</td>` : ''}
        </tr>
        <tr>
            <td style="font-weight:600; color:#475569;">Material</td>
            <td><div class="val-container"><span></span><span>${numFormat(materialKosten)}</span></div></td>
            <td><div class="val-container"><span></span><span>${numFormat(materialErloes)}</span></div></td>
            ${isKvMode ? `<td class="right">${kvValues['material'] ? numFormat(kvValues['material']) : ''}</td>` : ''}
        </tr>
        <tr>
            <td style="font-weight:600; color:#475569;">Erlöse</td>
            <td></td>
            <td><div class="val-container"><span></span><span>${numFormat(revenueTotal)}</span></div></td>
            ${isKvMode ? '<td></td>' : ''}
        </tr>
        <tr>
            <td style="font-weight:600; color:#475569;">Rabatt / Nachlässe</td>
            <td></td>
            <td><div class="val-container"><span></span><span>${numFormat(discountTotal)}</span></div></td>
            ${isKvMode ? '<td></td>' : ''}
        </tr>
        <tr style="border-top:3px double #334155; background:#f1f5f9;">
            <td style="font-weight:700; color:#0f172a;">Summe</td>
            <td style="font-weight:700; text-align:right; color:#0f172a;">${numFormat(totalCosts)}</td>
            <td style="font-weight:700; text-align:right; color:#0f172a;">${numFormat(totalRevenue)}</td>
            ${isKvMode ? `<td style="font-weight:700; text-align:right; color:#166534;">${numFormat((Object.values(kvValues) as number[]).reduce((a: number, b: number) => a + b, 0))}</td>` : ''}
        </tr>
    </table>

    <table class="summary-table">
        <tr><td class="label">KV vorher</td><td class="val${isKvMode ? '' : ' cur'}">${isKvMode ? numFormat((Object.values(kvValues) as number[]).reduce((a: number, b: number) => a + b, 0)) : '- €'}</td></tr>
        <tr><td class="label">Nettoumsatz</td><td class="val">${numFormat(totalRevenue)}</td></tr>
        <tr class="total"><td class="label">Bruttoumsatz</td><td class="val">${numFormat(totalRevenue * 1.19)}</td></tr>
        <tr><td class="label">Gesamtkosten netto</td><td class="val">${numFormat(totalCosts)}</td></tr>
        <tr class="total"><td class="label">Nettoeinnahme</td><td class="val">${numFormat(margin)}</td></tr>
        <tr><td class="label">Prozent</td><td class="val" style="padding-top: 12px;"><span style="background-color:#86efac; color:#166534; padding:6px 12px; border-radius:4px; font-weight:700; font-size:14px; border:1px solid #4ade80;">${marginPct.toFixed(1)}%</span></td></tr>
    </table>
</body></html>`;

        const html2pdf = (await import('html2pdf.js')).default;
        const container = document.createElement('div');
        container.innerHTML = html;
        document.body.appendChild(container);

        const pdfBlob: Blob = await html2pdf().set({
            margin: 10,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        }).from(container).output('blob');

        document.body.removeChild(container);
        return pdfBlob;
    };

    // ---- Accept ----
    const handleAccept = async (submission: Submission) => {
        setProcessing(submission.id);
        try {
            const snapshot = submission.snapshot_data;
            const project = snapshot.project || {};

            // 1. Generate PDF
            const pdfBlob = await generatePdfBlob(snapshot);

            // 2. Build filename
            const projectDate = project.project_date;
            const dateStr = projectDate ? format(new Date(projectDate), 'dd.MM.yyyy') : format(new Date(), 'dd.MM.yyyy');
            const cleanName = (project.name || 'Projekt').replace(/[^a-zA-Z0-9äöüÄÖÜß\-_ ]/g, '').trim();
            const projectCode = project.project_code || 'NK';
            const filename = `NK_${projectCode}_${cleanName}_${dateStr}.pdf`;

            // 3. Ensure folder hierarchy
            const monthFolderId = await ensureFolderHierarchy(projectDate);

            // 4. Upload to Supabase Storage
            const timestamp = Date.now();
            const storagePath = `uploads/${monthFolderId}/${timestamp}_${filename}`;
            const { error: uploadError } = await supabase.storage.from('files').upload(storagePath, pdfBlob, {
                contentType: 'application/pdf',
            });
            if (uploadError) throw uploadError;

            // 5. Create t_files record
            const { data: fileRecord, error: fileError } = await supabase.from('t_files').insert({
                name: filename,
                folder_id: monthFolderId,
                storage_path: storagePath,
                size: pdfBlob.size,
                mime_type: 'application/pdf',
            }).select('id').single();
            if (fileError) throw fileError;

            // 6. Update submission
            const { error: updateError } = await supabase.from('t_nachkalkulation_submissions').update({
                status: 'accepted',
                reviewed_by: userEmail,
                reviewed_at: new Date().toISOString(),
                file_id: fileRecord.id,
            }).eq('id', submission.id);
            if (updateError) throw updateError;

            toast('Nachkalkulation angenommen und als PDF gespeichert', 'success');
            fetchSubmissions();
        } catch (err) {
            console.error('Error accepting submission:', err);
            toast('Fehler beim Annehmen', 'error');
        } finally {
            setProcessing(null);
        }
    };

    // ---- Reject ----
    const handleReject = async (submissionId: string) => {
        setProcessing(submissionId);
        try {
            const { error } = await supabase.from('t_nachkalkulation_submissions').update({
                status: 'rejected',
                reviewed_by: userEmail,
                reviewed_at: new Date().toISOString(),
                rejection_comment: rejectComment || null,
            }).eq('id', submissionId);
            if (error) throw error;

            toast('Nachkalkulation abgelehnt', 'success');
            setRejectingId(null);
            setRejectComment('');
            fetchSubmissions();
        } catch (err) {
            console.error('Error rejecting submission:', err);
            toast('Fehler beim Ablehnen', 'error');
        } finally {
            setProcessing(null);
        }
    };

    const statusConfig = {
        pending: { label: 'Ausstehend', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock },
        accepted: { label: 'Angenommen', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle2 },
        rejected: { label: 'Abgelehnt', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
    };

    const pendingCount = submissions.filter(s => s.status === 'pending').length;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full pt-20">
                <div className="flex flex-col items-center gap-4 text-slate-500">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <p>Lade Freigaben...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 h-full flex flex-col pt-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-light tracking-tight text-slate-900 flex items-center gap-3">
                        <ClipboardCheck className="h-8 w-8 text-blue-600" />
                        Freigaben
                        {pendingCount > 0 && (
                            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                {pendingCount} ausstehend
                            </span>
                        )}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Nachkalkulationen prüfen und freigeben</p>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
                {(['all', 'pending', 'accepted', 'rejected'] as const).map(status => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={cn(
                            "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                            filterStatus === status
                                ? "bg-white shadow-sm text-slate-800"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        {status === 'all' ? 'Alle' : status === 'pending' ? 'Ausstehend' : status === 'accepted' ? 'Angenommen' : 'Abgelehnt'}
                        {status === 'pending' && pendingCount > 0 && (
                            <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-800">{pendingCount}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Submissions List */}
            <div className="flex-1 space-y-3 overflow-y-auto pb-8">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <ClipboardCheck className="w-12 h-12 mb-3 text-slate-300" />
                        <p className="text-sm font-medium">Keine Freigaben gefunden</p>
                        <p className="text-xs mt-1 text-slate-400">
                            {filterStatus === 'all'
                                ? 'Es wurden noch keine Nachkalkulationen zur Freigabe eingereicht.'
                                : `Keine ${filterStatus === 'pending' ? 'ausstehenden' : filterStatus === 'accepted' ? 'angenommenen' : 'abgelehnten'} Freigaben.`}
                        </p>
                    </div>
                ) : (
                    filtered.map(sub => {
                        const cfg = statusConfig[sub.status];
                        const StatusIcon = cfg.icon;
                        const project = sub.snapshot_data?.project || {};
                        const isExpanded = expandedId === sub.id;
                        const isRejecting = rejectingId === sub.id;

                        // Summary values from snapshot
                        const snap = sub.snapshot_data || {};
                        const totalCosts = snap.totalCosts ?? 0;
                        const totalRevenue = snap.totalRevenue ?? 0;
                        const margin = snap.margin ?? (totalRevenue - totalCosts);
                        const marginPct = snap.marginPct ?? (totalRevenue > 0 ? (margin / totalRevenue) * 100 : 0);

                        return (
                            <div key={sub.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
                                {/* Card Header */}
                                <div className="flex items-center gap-4 px-5 py-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-sm font-semibold text-slate-800 truncate">
                                                {project.name || 'Unbenanntes Projekt'}
                                            </h3>
                                            {project.project_code && (
                                                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                                    {project.project_code}
                                                </span>
                                            )}
                                            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border", cfg.color)}>
                                                <StatusIcon className="w-3 h-3" />
                                                {cfg.label}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-slate-500">
                                            {project.ort && <span>{project.ort}</span>}
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {project.project_date ? new Date(project.project_date).toLocaleDateString('de-DE') : '—'}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <User className="w-3 h-3" />
                                                {sub.submitted_by?.split('@')[0] || '—'}
                                            </span>
                                            <span>Eingereicht: {format(new Date(sub.submitted_at), 'dd.MM.yyyy HH:mm', { locale: de })}</span>
                                        </div>
                                    </div>

                                    {/* Quick KPIs */}
                                    <div className="flex items-center gap-4 shrink-0">
                                        <div className="text-center px-3">
                                            <div className="text-[10px] font-semibold text-slate-400 uppercase">Kosten</div>
                                            <div className="text-sm font-bold text-slate-700">{totalCosts.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</div>
                                        </div>
                                        <div className="text-center px-3">
                                            <div className="text-[10px] font-semibold text-slate-400 uppercase">Erlöse</div>
                                            <div className="text-sm font-bold text-slate-700">{totalRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</div>
                                        </div>
                                        <div className="text-center px-3">
                                            <div className="text-[10px] font-semibold text-slate-400 uppercase">Marge</div>
                                            <div className={cn("text-sm font-bold", margin >= 0 ? "text-emerald-600" : "text-red-600")}>
                                                {marginPct.toFixed(1)}%
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                                            className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                                            title="Details anzeigen"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        {sub.status === 'pending' && (
                                            <>
                                                <button
                                                    onClick={() => handleAccept(sub)}
                                                    disabled={processing === sub.id}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm transition-all disabled:opacity-50"
                                                >
                                                    {processing === sub.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                                    Annehmen
                                                </button>
                                                <button
                                                    onClick={() => { setRejectingId(sub.id); setRejectComment(''); }}
                                                    disabled={processing === sub.id}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-all disabled:opacity-50"
                                                >
                                                    <XCircle className="w-3.5 h-3.5" />
                                                    Ablehnen
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Rejection Dialog */}
                                {isRejecting && (
                                    <div className="px-5 pb-4 border-t border-slate-100 pt-3 bg-red-50/50">
                                        <div className="flex items-start gap-3">
                                            <MessageSquare className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                            <div className="flex-1">
                                                <label className="block text-xs font-semibold text-red-700 mb-1">Kommentar (optional)</label>
                                                <textarea
                                                    value={rejectComment}
                                                    onChange={e => setRejectComment(e.target.value)}
                                                    placeholder="Grund für die Ablehnung..."
                                                    rows={2}
                                                    className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 bg-white"
                                                />
                                                <div className="flex justify-end gap-2 mt-2">
                                                    <button
                                                        onClick={() => { setRejectingId(null); setRejectComment(''); }}
                                                        className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                                                    >
                                                        Abbrechen
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(sub.id)}
                                                        disabled={processing === sub.id}
                                                        className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                                                    >
                                                        {processing === sub.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Ablehnen bestätigen'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div className="px-5 pb-4 border-t border-slate-100 pt-3 bg-slate-50/50">
                                        {sub.status === 'rejected' && sub.rejection_comment && (
                                            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                                <div className="flex items-center gap-2 text-xs font-semibold text-red-700 mb-1">
                                                    <MessageSquare className="w-3 h-3" />
                                                    Ablehnungsgrund
                                                </div>
                                                <p className="text-sm text-red-800">{sub.rejection_comment}</p>
                                            </div>
                                        )}
                                        {sub.reviewed_by && (
                                            <div className="text-xs text-slate-500 mb-2">
                                                Geprüft von <strong>{sub.reviewed_by.split('@')[0]}</strong> am {sub.reviewed_at ? format(new Date(sub.reviewed_at), 'dd.MM.yyyy HH:mm', { locale: de }) : '—'}
                                            </div>
                                        )}
                                        <div className="text-xs text-slate-400">
                                            Snapshot-Daten enthalten {(snap.adjustedPersonnel || []).length} Personaleinträge, {(snap.materials || []).length} Materialien, {(snap.vehicles || []).length} Fahrzeuge, {(snap.services || []).length} Dienstleistungen
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
