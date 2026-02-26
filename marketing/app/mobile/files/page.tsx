'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/toast';
import { FolderPlus, Upload, Trash2, FolderOpen, FileText, ChevronRight, Home, Download, Loader2, File, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface FolderItem { id: string; name: string; parent_id: string | null; created_at: string; }
interface FileItem { id: string; name: string; folder_id: string | null; storage_path: string; size: number; mime_type: string | null; created_at: string; }

const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (mime: string | null) => {
    if (mime?.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-purple-500" />;
    return <File className="w-5 h-5 text-slate-400" />;
};

export default function MobileFilesPage() {
    const { toast } = useToast();
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [path, setPath] = useState<{ id: string | null; name: string }[]>([{ id: null, name: 'Dateien' }]);
    const [folders, setFolders] = useState<FolderItem[]>([]);
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [fRes, fiRes] = await Promise.all([
            supabase.from('t_folders').select('*').eq(currentFolderId ? 'parent_id' : 'parent_id', currentFolderId as any).order('name'),
            supabase.from('t_files').select('*').eq(currentFolderId ? 'folder_id' : 'folder_id', currentFolderId as any).order('name'),
        ]);
        // Filter properly since eq with null can be tricky
        const allFolders = fRes.data || [];
        const allFiles = fiRes.data || [];
        setFolders(currentFolderId ? allFolders.filter(f => f.parent_id === currentFolderId) : allFolders.filter(f => !f.parent_id));
        setFiles(currentFolderId ? allFiles.filter(f => f.folder_id === currentFolderId) : allFiles.filter(f => !f.folder_id));
        setLoading(false);
    }, [currentFolderId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const navigateToFolder = (folderId: string | null, folderName?: string) => {
        if (folderId === null) {
            setPath([{ id: null, name: 'Dateien' }]);
        } else {
            setPath(prev => [...prev, { id: folderId, name: folderName || '' }]);
        }
        setCurrentFolderId(folderId);
    };

    const navigateToBreadcrumb = (index: number) => {
        const item = path[index];
        setPath(prev => prev.slice(0, index + 1));
        setCurrentFolderId(item.id);
    };

    const createFolder = async () => {
        const name = window.prompt('Ordnername:');
        if (!name) return;
        try {
            const { error } = await supabase.from('t_folders').insert({ name, parent_id: currentFolderId });
            if (error) throw error;
            toast('Ordner erstellt');
            fetchData();
        } catch { toast('Fehler', 'error'); }
    };

    const deleteFolder = async (id: string) => {
        if (!confirm('Ordner und Inhalt löschen?')) return;
        try {
            // Delete files in folder
            const { data: folderFiles } = await supabase.from('t_files').select('*').eq('folder_id', id);
            if (folderFiles && folderFiles.length > 0) {
                const paths = folderFiles.map(f => f.storage_path);
                await supabase.storage.from('files').remove(paths);
                await supabase.from('t_files').delete().eq('folder_id', id);
            }
            await supabase.from('t_folders').delete().eq('id', id);
            toast('Ordner gelöscht');
            fetchData();
        } catch { toast('Fehler', 'error'); }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const path = `uploads/${Date.now()}_${file.name}`;
            const { error: uploadError } = await supabase.storage.from('files').upload(path, file);
            if (uploadError) throw uploadError;
            const { error: dbError } = await supabase.from('t_files').insert({
                name: file.name, folder_id: currentFolderId, storage_path: path, size: file.size, mime_type: file.type,
            });
            if (dbError) throw dbError;
            toast('Datei hochgeladen');
            fetchData();
        } catch { toast('Upload fehlgeschlagen', 'error'); }
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const downloadFile = async (file: FileItem) => {
        try {
            const { data, error } = await supabase.storage.from('files').download(file.storage_path);
            if (error) throw error;
            const url = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url; a.download = file.name; a.click();
            URL.revokeObjectURL(url);
        } catch { toast('Download fehlgeschlagen', 'error'); }
    };

    const deleteFile = async (file: FileItem) => {
        if (!confirm(`"${file.name}" löschen?`)) return;
        try {
            await supabase.storage.from('files').remove([file.storage_path]);
            await supabase.from('t_files').delete().eq('id', file.id);
            toast('Gelöscht');
            fetchData();
        } catch { toast('Fehler', 'error'); }
    };

    return (
        <div className="flex flex-col min-h-full">
            {/* Breadcrumb */}
            <div className="sticky top-[calc(64px+env(safe-area-inset-top,0px))] z-30 bg-white border-b border-slate-200 shadow-sm px-4 sm:px-6 py-3">
                <div className="flex items-center gap-1 overflow-x-auto text-sm">
                    {path.map((p, i) => (
                        <React.Fragment key={i}>
                            {i > 0 && <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />}
                            <button onClick={() => navigateToBreadcrumb(i)}
                                className={cn('shrink-0 px-1.5 py-0.5 rounded text-xs font-medium transition-colors',
                                    i === path.length - 1 ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:text-slate-700')}>
                                {i === 0 ? <Home className="w-3.5 h-3.5 inline" /> : p.name}
                            </button>
                        </React.Fragment>
                    ))}
                </div>
                {/* Actions */}
                <div className="flex items-center gap-2 mt-2">
                    <button onClick={createFolder}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 rounded-lg text-xs font-medium text-slate-700">
                        <FolderPlus className="w-3.5 h-3.5" /> Neuer Ordner
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                        className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 rounded-lg text-xs font-medium text-white disabled:opacity-50">
                        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        Hochladen
                    </button>
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
            ) : (
                <div className="p-4 sm:p-6 space-y-3">
                    {folders.length === 0 && files.length === 0 && (
                        <div className="text-center py-16 text-slate-400 bg-white rounded-xl border-2 border-dashed border-slate-200">
                            <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">Dieser Ordner ist leer.</p>
                        </div>
                    )}
                    {/* Folders */}
                    {folders.map(f => (
                        <div key={f.id} className="bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between px-4 py-3">
                            <button onClick={() => navigateToFolder(f.id, f.name)} className="flex items-center gap-3 flex-1 min-w-0">
                                <FolderOpen className="w-5 h-5 text-yellow-500 shrink-0" />
                                <span className="text-sm font-medium text-slate-700 truncate">{f.name}</span>
                            </button>
                            <button onClick={() => deleteFolder(f.id)} className="p-1.5 text-slate-300 hover:text-red-500 shrink-0">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {/* Files */}
                    {files.map(f => (
                        <div key={f.id} className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3">
                            <div className="flex items-center gap-3">
                                {getFileIcon(f.mime_type)}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-700 truncate">{f.name}</p>
                                    <p className="text-[10px] text-slate-400">{formatFileSize(f.size)} · {format(new Date(f.created_at), 'dd.MM.yy', { locale: de })}</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button onClick={() => downloadFile(f)} className="p-1.5 text-slate-400 hover:text-blue-600"><Download className="w-4 h-4" /></button>
                                    <button onClick={() => deleteFile(f)} className="p-1.5 text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
