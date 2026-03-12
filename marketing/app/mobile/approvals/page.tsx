'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { generateAuftragsnachkalkulationHTML } from '@/lib/generateNachkalkulationHTML';
import { useToast } from '@/components/ui/toast';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
    ClipboardCheck, CheckCircle2, XCircle, Clock, Loader2,
    User, Calendar, MessageSquare, Eye, EyeOff, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

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

function eur(n: number) { return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }); }

export default function MobileApprovalsPage() {
    const { toast } = useToast();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectComment, setRejectComment] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
    const [userEmail, setUserEmail] = useState('');

    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) setUserEmail(user.email);
        })();
    }, []);

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

    const filtered = filterStatus === 'all'
        ? submissions
        : submissions.filter(s => s.status === filterStatus);

    const pendingCount = submissions.filter(s => s.status === 'pending').length;

    // ---- Folder Helpers (same as desktop) ----
    const ensureFolder = async (name: string, parentId: string | null): Promise<string> => {
        let query = supabase.from('t_folders').select('id').eq('name', name);
        if (parentId) { query = query.eq('parent_id', parentId); } else { query = query.is('parent_id', null); }
        const { data: existing } = await query.maybeSingle();
        if (existing) return existing.id;
        const { data: created, error } = await supabase.from('t_folders').insert({ name, parent_id: parentId }).select('id').single();
        if (error) throw error;
        return created.id;
    };

    const ensureFolderHierarchy = async (projectDate: string | null): Promise<string> => {
        const date = projectDate ? new Date(projectDate) : new Date();
        const rootId = await ensureFolder('Nachkalkulation', null);
        const yearId = await ensureFolder(date.getFullYear().toString(), rootId);
        const monthId = await ensureFolder(GERMAN_MONTHS[date.getMonth()], yearId);
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

            const pdfBlob = await generatePdfBlob(snapshot);

            const projectDate = project.project_date;
            const dateStr = projectDate ? format(new Date(projectDate), 'dd.MM.yyyy') : format(new Date(), 'dd.MM.yyyy');
            const cleanName = (project.name || 'Projekt').replace(/[^a-zA-Z0-9äöüÄÖÜß\-_ ]/g, '').trim();
            const projectCode = project.project_code || 'NK';
            const filename = `NK_${projectCode}_${cleanName}_${dateStr}.pdf`;

            const monthFolderId = await ensureFolderHierarchy(projectDate);

            const timestamp = Date.now();
            const storagePath = `uploads/${monthFolderId}/${timestamp}_${filename}`;
            const { error: uploadError } = await supabase.storage.from('files').upload(storagePath, pdfBlob, { contentType: 'application/pdf' });
            if (uploadError) throw uploadError;

            const { data: fileRecord, error: fileError } = await supabase.from('t_files').insert({
                name: filename, folder_id: monthFolderId, storage_path: storagePath, size: pdfBlob.size, mime_type: 'application/pdf',
            }).select('id').single();
            if (fileError) throw fileError;

            const { error: updateError } = await supabase.from('t_nachkalkulation_submissions').update({
                status: 'accepted', reviewed_by: userEmail, reviewed_at: new Date().toISOString(), file_id: fileRecord.id,
            }).eq('id', submission.id);
            if (updateError) throw updateError;

            toast('Nachkalkulation angenommen ✓', 'success');
            fetchSubmissions();
        } catch (err) {
            console.error('Error accepting:', err);
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
                status: 'rejected', reviewed_by: userEmail, reviewed_at: new Date().toISOString(), rejection_comment: rejectComment || null,
            }).eq('id', submissionId);
            if (error) throw error;

            toast('Nachkalkulation abgelehnt', 'success');
            setRejectingId(null);
            setRejectComment('');
            fetchSubmissions();
        } catch (err) {
            console.error('Error rejecting:', err);
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

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-full">
            {/* Header area */}
            <div className="sticky top-[calc(64px+env(safe-area-inset-top,0px))] z-30 bg-white border-b border-slate-200 shadow-sm px-4 sm:px-6 py-3">
                {/* Pending badge */}
                {pendingCount > 0 && (
                    <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            {pendingCount} ausstehend
                        </span>
                    </div>
                )}
                {/* Filter tabs */}
                <div className="flex overflow-x-auto gap-1 -mx-1 px-1 pb-1 scrollbar-hide">
                    {(['all', 'pending', 'accepted', 'rejected'] as const).map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={cn(
                                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors shrink-0',
                                filterStatus === status ? 'bg-blue-100 text-blue-700' : 'text-slate-500 bg-slate-50'
                            )}
                        >
                            {status === 'all' ? 'Alle' : status === 'pending' ? 'Ausstehend' : status === 'accepted' ? 'Angenommen' : 'Abgelehnt'}
                            {status === 'pending' && pendingCount > 0 && (
                                <span className="ml-0.5 text-[9px] px-1 rounded-full bg-amber-200 text-amber-800">{pendingCount}</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Submissions list */}
            <div className="p-4 sm:p-6 space-y-3">
                {filtered.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 bg-white rounded-xl border-2 border-dashed border-slate-200">
                        <ClipboardCheck className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">Keine Freigaben gefunden</p>
                        <p className="text-xs mt-1">
                            {filterStatus === 'all'
                                ? 'Es wurden noch keine Nachkalkulationen eingereicht.'
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
                        const snap = sub.snapshot_data || {};
                        const totalCosts = snap.totalCosts ?? 0;
                        const totalRevenue = snap.totalRevenue ?? 0;
                        const margin = snap.margin ?? (totalRevenue - totalCosts);
                        const marginPct = snap.marginPct ?? (totalRevenue > 0 ? (margin / totalRevenue) * 100 : 0);

                        return (
                            <div key={sub.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                {/* Card header */}
                                <div className="px-4 py-3">
                                    {/* Top row: name + status */}
                                    <div className="flex items-center justify-between mb-1.5">
                                        <h3 className="text-sm font-semibold text-slate-800 truncate flex-1 mr-2">
                                            {project.name || 'Unbenanntes Projekt'}
                                        </h3>
                                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0", cfg.color)}>
                                            <StatusIcon className="w-3 h-3" />
                                            {cfg.label}
                                        </span>
                                    </div>

                                    {/* Meta row */}
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500 mb-3">
                                        {project.project_code && (
                                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">{project.project_code}</span>
                                        )}
                                        {project.ort && <span>{project.ort}</span>}
                                        <span className="flex items-center gap-0.5">
                                            <Calendar className="w-3 h-3" />
                                            {project.project_date ? new Date(project.project_date).toLocaleDateString('de-DE') : '—'}
                                        </span>
                                        <span className="flex items-center gap-0.5">
                                            <User className="w-3 h-3" />
                                            {sub.submitted_by?.split('@')[0] || '—'}
                                        </span>
                                    </div>

                                    {/* KPI row */}
                                    <div className="grid grid-cols-3 gap-2 mb-3">
                                        <div className="bg-slate-50 rounded-lg p-2 text-center">
                                            <div className="text-[9px] font-semibold text-slate-400 uppercase">Kosten</div>
                                            <div className="text-xs font-bold text-slate-700">{eur(totalCosts)}</div>
                                        </div>
                                        <div className="bg-slate-50 rounded-lg p-2 text-center">
                                            <div className="text-[9px] font-semibold text-slate-400 uppercase">Erlöse</div>
                                            <div className="text-xs font-bold text-slate-700">{eur(totalRevenue)}</div>
                                        </div>
                                        <div className="bg-slate-50 rounded-lg p-2 text-center">
                                            <div className="text-[9px] font-semibold text-slate-400 uppercase">Marge</div>
                                            <div className={cn("text-xs font-bold", margin >= 0 ? "text-emerald-600" : "text-red-600")}>
                                                {marginPct.toFixed(1)}%
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                                            className={cn("flex items-center gap-1 px-3 py-2 text-[11px] font-medium rounded-lg border transition-colors flex-1 justify-center",
                                                isExpanded ? "bg-blue-50 text-blue-700 border-blue-200" : "text-slate-500 border-slate-200 bg-white")}
                                        >
                                            {isExpanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                            {isExpanded ? 'Zuklappen' : 'Details'}
                                        </button>
                                        {sub.status === 'pending' && (
                                            <>
                                                <button
                                                    onClick={() => handleAccept(sub)}
                                                    disabled={processing === sub.id}
                                                    className="flex items-center gap-1 px-3 py-2 text-[11px] font-semibold text-white bg-emerald-600 rounded-lg shadow-sm disabled:opacity-50 flex-1 justify-center"
                                                >
                                                    {processing === sub.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                                    Annehmen
                                                </button>
                                                <button
                                                    onClick={() => { setRejectingId(sub.id); setRejectComment(''); }}
                                                    disabled={processing === sub.id}
                                                    className="flex items-center gap-1 px-3 py-2 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg disabled:opacity-50 flex-1 justify-center"
                                                >
                                                    <XCircle className="w-3.5 h-3.5" />
                                                    Ablehnen
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Rejection dialog */}
                                <AnimatePresence>
                                    {isRejecting && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-4 pb-4 border-t border-slate-100 pt-3 bg-red-50/50">
                                                <div className="flex items-start gap-2">
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
                                                        <div className="flex gap-2 mt-2">
                                                            <button
                                                                onClick={() => { setRejectingId(null); setRejectComment(''); }}
                                                                className="flex-1 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg"
                                                            >
                                                                Abbrechen
                                                            </button>
                                                            <button
                                                                onClick={() => handleReject(sub.id)}
                                                                disabled={processing === sub.id}
                                                                className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg disabled:opacity-50"
                                                            >
                                                                {processing === sub.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Bestätigen'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Expanded details */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-4 pb-4 border-t border-slate-100 pt-3 bg-slate-50/50 space-y-2">
                                                {sub.status === 'rejected' && sub.rejection_comment && (
                                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-red-700 mb-1">
                                                            <MessageSquare className="w-3 h-3" />
                                                            Ablehnungsgrund
                                                        </div>
                                                        <p className="text-xs text-red-800">{sub.rejection_comment}</p>
                                                    </div>
                                                )}
                                                {sub.reviewed_by && (
                                                    <div className="text-[10px] text-slate-500">
                                                        Geprüft von <strong>{sub.reviewed_by.split('@')[0]}</strong> am{' '}
                                                        {sub.reviewed_at ? format(new Date(sub.reviewed_at), 'dd.MM.yyyy HH:mm', { locale: de }) : '—'}
                                                    </div>
                                                )}
                                                <div className="text-[10px] text-slate-500">
                                                    Eingereicht: {format(new Date(sub.submitted_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                                                </div>
                                                <div className="text-[10px] text-slate-400">
                                                    {(snap.adjustedPersonnel || []).length} Personaleinträge · {(snap.materials || []).length} Materialien · {(snap.vehicles || []).length} Fahrzeuge · {(snap.services || []).length} Leistungen
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
