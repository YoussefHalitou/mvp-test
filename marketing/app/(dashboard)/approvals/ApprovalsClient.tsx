'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { generateAuftragsnachkalkulationHTML } from '@/lib/generateNachkalkulationHTML';
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

    // ---- Generate PDF from snapshot using shared HTML generator ----
    const generatePdfBlob = async (snapshot: any): Promise<Blob> => {
        const html = generateAuftragsnachkalkulationHTML(snapshot);

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
