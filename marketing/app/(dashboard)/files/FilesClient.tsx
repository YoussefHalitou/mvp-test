'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
    FolderPlus, FilePlus, Upload, Trash2, FolderOpen, FileText, ChevronRight,
    Home, MoreVertical, Pencil, X, Loader2, Download, Image as ImageIcon, FileSpreadsheet, File
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

// --- Types ---
interface FolderItem {
    id: string;
    name: string;
    parent_id: string | null;
    created_at: string;
}

interface FileItem {
    id: string;
    name: string;
    folder_id: string | null;
    storage_path: string;
    size: number;
    mime_type: string | null;
    created_at: string;
}

// --- Helpers ---
const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
};

const getFileIcon = (mime: string | null) => {
    if (!mime) return File;
    if (mime.startsWith('image/')) return ImageIcon;
    if (mime.includes('spreadsheet') || mime.includes('csv') || mime.includes('excel')) return FileSpreadsheet;
    if (mime.includes('pdf') || mime.includes('document') || mime.includes('text')) return FileText;
    return File;
};

export default function FilesClient() {
    const [folders, setFolders] = useState<FolderItem[]>([]);
    const [files, setFiles] = useState<FileItem[]>([]);
    const [currentFolder, setCurrentFolder] = useState<string | null>(null);
    const [breadcrumb, setBreadcrumb] = useState<{ id: string | null; name: string }[]>([{ id: null, name: 'Dateien' }]);
    const [isLoading, setIsLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // Modal states
    const [showNewFolder, setShowNewFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [renamingItem, setRenamingItem] = useState<{ type: 'folder' | 'file'; id: string; name: string } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Data Fetching ---
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [foldersRes, filesRes] = await Promise.all([
                supabase.from('t_folders').select('*').order('name'),
                supabase.from('t_files').select('*').order('name')
            ]);
            setFolders(foldersRes.data || []);
            setFiles(filesRes.data || []);
        } catch (error) {
            console.error('Error fetching files:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Current folder contents
    const currentFolders = folders.filter(f => f.parent_id === currentFolder);
    const currentFiles = files.filter(f => f.folder_id === currentFolder);

    // --- Navigation ---
    const navigateToFolder = (folderId: string | null, folderName?: string) => {
        if (folderId === null) {
            setBreadcrumb([{ id: null, name: 'Dateien' }]);
        } else {
            // Build breadcrumb path
            const bc: { id: string | null; name: string }[] = [{ id: null, name: 'Dateien' }];
            const buildPath = (id: string | null): void => {
                if (!id) return;
                const folder = folders.find(f => f.id === id);
                if (folder) {
                    buildPath(folder.parent_id);
                    bc.push({ id: folder.id, name: folder.name });
                }
            };
            buildPath(folderId);
            setBreadcrumb(bc);
        }
        setCurrentFolder(folderId);
    };

    // --- Folder CRUD ---
    const createFolder = async () => {
        if (!newFolderName.trim()) return;
        try {
            const { data, error } = await supabase.from('t_folders').insert({
                name: newFolderName.trim(),
                parent_id: currentFolder,
            }).select().single();
            if (error) throw error;
            if (data) setFolders([...folders, data]);
            setNewFolderName('');
            setShowNewFolder(false);
        } catch (error) {
            console.error('Error creating folder:', error);
            alert('Fehler beim Erstellen des Ordners.');
        }
    };

    const deleteFolder = async (folderId: string) => {
        if (!confirm('Ordner und alle Inhalte löschen?')) return;
        try {
            // Delete files in folder from storage
            const folderFiles = files.filter(f => f.folder_id === folderId);
            for (const file of folderFiles) {
                await supabase.storage.from('files').remove([file.storage_path]);
                await supabase.from('t_files').delete().eq('id', file.id);
            }
            // Delete subfolders recursively
            const subFolders = folders.filter(f => f.parent_id === folderId);
            for (const sub of subFolders) {
                await deleteFolder(sub.id);
            }
            await supabase.from('t_folders').delete().eq('id', folderId);
            setFolders(folders.filter(f => f.id !== folderId));
            setFiles(files.filter(f => f.folder_id !== folderId));
        } catch (error) {
            console.error('Error deleting folder:', error);
            alert('Fehler beim Löschen.');
        }
    };

    // --- File Upload ---
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files;
        if (!selectedFiles || selectedFiles.length === 0) return;

        setUploading(true);
        try {
            for (const file of Array.from(selectedFiles)) {
                const timestamp = Date.now();
                const storagePath = `uploads/${currentFolder || 'root'}/${timestamp}_${file.name}`;

                const { error: uploadError } = await supabase.storage.from('files').upload(storagePath, file);
                if (uploadError) throw uploadError;

                const { data, error: dbError } = await supabase.from('t_files').insert({
                    name: file.name,
                    folder_id: currentFolder,
                    storage_path: storagePath,
                    size: file.size,
                    mime_type: file.type || null,
                }).select().single();

                if (dbError) throw dbError;
                if (data) setFiles(prev => [...prev, data]);
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Fehler beim Hochladen.');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // --- File Download ---
    const downloadFile = async (file: FileItem) => {
        try {
            const { data, error } = await supabase.storage.from('files').download(file.storage_path);
            if (error) throw error;
            const url = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading file:', error);
            alert('Fehler beim Herunterladen.');
        }
    };

    // --- File Delete ---
    const deleteFile = async (file: FileItem) => {
        if (!confirm(`"${file.name}" löschen?`)) return;
        try {
            await supabase.storage.from('files').remove([file.storage_path]);
            await supabase.from('t_files').delete().eq('id', file.id);
            setFiles(files.filter(f => f.id !== file.id));
        } catch (error) {
            console.error('Error deleting file:', error);
            alert('Fehler beim Löschen.');
        }
    };

    // --- Rename ---
    const handleRename = async () => {
        if (!renamingItem || !renamingItem.name.trim()) return;
        try {
            if (renamingItem.type === 'folder') {
                await supabase.from('t_folders').update({ name: renamingItem.name.trim() }).eq('id', renamingItem.id);
                setFolders(folders.map(f => f.id === renamingItem.id ? { ...f, name: renamingItem.name.trim() } : f));
            } else {
                await supabase.from('t_files').update({ name: renamingItem.name.trim() }).eq('id', renamingItem.id);
                setFiles(files.map(f => f.id === renamingItem.id ? { ...f, name: renamingItem.name.trim() } : f));
            }
            setRenamingItem(null);
        } catch (error) {
            console.error('Error renaming:', error);
            alert('Fehler beim Umbenennen.');
        }
    };

    if (isLoading && folders.length === 0) {
        return (
            <div className="flex items-center justify-center h-full pt-20">
                <div className="flex flex-col items-center gap-4 text-slate-500">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <p>Lade Dateien...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 h-full flex flex-col pt-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-light tracking-tight text-slate-900">
                        Dateien
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Ordner und Dateien verwalten</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowNewFolder(true)}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-all">
                        <FolderPlus className="w-4 h-4" /> Neuer Ordner
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50">
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        Datei hochladen
                    </button>
                    <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
                </div>
            </div>

            {/* Breadcrumb */}
            <div className="flex items-center gap-1 mb-4 text-sm">
                {breadcrumb.map((bc, i) => (
                    <div key={bc.id ?? 'root'} className="flex items-center gap-1">
                        {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}
                        <button
                            onClick={() => navigateToFolder(bc.id, bc.name)}
                            className={cn(
                                "px-2 py-1 rounded-md transition-colors",
                                i === breadcrumb.length - 1
                                    ? "font-semibold text-slate-800 bg-slate-100"
                                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                            )}
                        >
                            {i === 0 && <Home className="w-3.5 h-3.5 inline mr-1" />}
                            {bc.name}
                        </button>
                    </div>
                ))}
            </div>

            {/* New Folder Inline */}
            {showNewFolder && (
                <div className="mb-4 flex items-center gap-2 bg-blue-50/80 border border-blue-200 rounded-lg p-3">
                    <FolderOpen className="w-5 h-5 text-blue-500" />
                    <input
                        autoFocus
                        type="text"
                        value={newFolderName}
                        onChange={e => setNewFolderName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && createFolder()}
                        placeholder="Ordnername..."
                        className="flex-1 bg-white border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button onClick={createFolder} className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Erstellen</button>
                    <button onClick={() => { setShowNewFolder(false); setNewFolderName(''); }} className="p-1.5 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* Content Grid */}
            <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {currentFolders.length === 0 && currentFiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-slate-400">
                        <FolderOpen className="w-12 h-12 mb-3 text-slate-300" />
                        <p className="text-sm font-medium">Dieser Ordner ist leer</p>
                        <p className="text-xs mt-1 text-slate-400">Erstellen Sie einen Ordner oder laden Sie Dateien hoch</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {/* Folders */}
                        {currentFolders.map(folder => (
                            <div key={folder.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors group">
                                <button onClick={() => navigateToFolder(folder.id, folder.name)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                                    <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                                        <FolderOpen className="w-5 h-5 text-amber-600" />
                                    </div>
                                    <div className="min-w-0">
                                        {renamingItem?.type === 'folder' && renamingItem.id === folder.id ? (
                                            <input autoFocus value={renamingItem.name} onChange={e => setRenamingItem({ ...renamingItem, name: e.target.value })}
                                                onKeyDown={e => e.key === 'Enter' && handleRename()} onBlur={handleRename}
                                                className="text-sm font-medium border border-blue-300 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500" onClick={e => e.stopPropagation()} />
                                        ) : (
                                            <p className="text-sm font-medium text-slate-800 truncate">{folder.name}</p>
                                        )}
                                        <p className="text-xs text-slate-400">{format(new Date(folder.created_at), 'd. MMM yyyy', { locale: de })}</p>
                                    </div>
                                </button>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setRenamingItem({ type: 'folder', id: folder.id, name: folder.name })}
                                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50"><Pencil className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => deleteFolder(folder.id)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 rounded hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                            </div>
                        ))}

                        {/* Files */}
                        {currentFiles.map(file => {
                            const Icon = getFileIcon(file.mime_type);
                            return (
                                <div key={file.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors group">
                                    <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                                        <Icon className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {renamingItem?.type === 'file' && renamingItem.id === file.id ? (
                                            <input autoFocus value={renamingItem.name} onChange={e => setRenamingItem({ ...renamingItem, name: e.target.value })}
                                                onKeyDown={e => e.key === 'Enter' && handleRename()} onBlur={handleRename}
                                                className="text-sm font-medium border border-blue-300 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                        ) : (
                                            <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                                        )}
                                        <p className="text-xs text-slate-400">{formatFileSize(file.size)} · {format(new Date(file.created_at), 'd. MMM yyyy', { locale: de })}</p>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => downloadFile(file)}
                                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50"><Download className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => setRenamingItem({ type: 'file', id: file.id, name: file.name })}
                                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50"><Pencil className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => deleteFile(file)}
                                            className="p-1.5 text-slate-400 hover:text-red-500 rounded hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
