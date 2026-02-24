'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/toast';
import {
    Users, Truck, Package, Wrench, Plus, Pencil, Trash2, X, Save, Loader2, Check,
    Settings, Eye, EyeOff, Columns3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';

type Employee = Database['public']['Tables']['t_employees']['Row'];
type Vehicle = Database['public']['Tables']['t_vehicles']['Row'];
type Material = Database['public']['Tables']['t_materials']['Row'];
type Service = Database['public']['Tables']['t_services']['Row'];

const TABS = [
    { id: 'employees', label: 'Mitarbeiter', icon: Users },
    { id: 'vehicles', label: 'Fahrzeuge', icon: Truck },
    { id: 'materials', label: 'Material', icon: Package },
    { id: 'services', label: 'Leistungen', icon: Wrench },
] as const;

import { DndContext, DragEndEvent, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Sortable Header Component ---
function SortableHeader({ id, children, onClick, sortDirection }: { id: string, children: React.ReactNode, onClick: () => void, sortDirection?: 'asc' | 'desc' }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        cursor: isDragging ? 'grabbing' : 'pointer',
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.8 : 1,
        position: 'relative',
    };

    return (
        <th ref={setNodeRef} style={style} className="px-4 py-3 select-none group" onClick={onClick} {...attributes} {...listeners}>
            <div className="flex items-center gap-1">
                {children}
                {sortDirection && (
                    <span className="text-slate-400 text-[10px] ml-1">
                        {sortDirection === 'asc' ? '▲' : '▼'}
                    </span>
                )}
            </div>
        </th>
    );
}

// --- LocalStorage Helpers ---
const useLocalStorage = <T,>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] => {
    const [storedValue, setStoredValue] = useState<T>(() => {
        if (typeof window === 'undefined') return initialValue;
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.warn(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    });

    const setValue = (value: T | ((val: T) => T)) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            }
        } catch (error) {
            console.warn(`Error setting localStorage key "${key}":`, error);
        }
    };

    return [storedValue, setValue];
};


type TabId = typeof TABS[number]['id'];

export default function ResourcesPage() {
    const [activeTab, setActiveTab] = useState<TabId>('employees');

    return (
        <div className="flex h-full flex-col bg-slate-50">
            <header className="flex items-center gap-4 border-b bg-white px-6 py-4 shadow-sm">
                <h1 className="text-2xl font-bold text-slate-800">Ressourcen</h1>
                <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 ml-4">
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                className={cn('flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all',
                                    activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                                <Icon className="h-4 w-4" /> {tab.label}
                            </button>
                        );
                    })}
                </div>
            </header>
            <div className="flex-1 overflow-auto p-6">
                {activeTab === 'employees' && <EmployeesTab />}
                {activeTab === 'vehicles' && <VehiclesTab />}
                {activeTab === 'materials' && <MaterialsTab />}
                {activeTab === 'services' && <ServicesTab />}
            </div>
        </div>
    );
}

// ============ CUSTOM COLUMNS HOOK (Supabase-backed) ============

type CustomCol = { id: string; label: string; type: 'text' | 'number' };

function useCustomColumns(tableName: string) {
    const [customColumns, setCustomColumns] = useState<CustomCol[]>([]);
    const [customData, setCustomData] = useState<Record<string, Record<string, string>>>({});
    // Temp state for editing custom values (works for both new and existing records)
    const [editingCustomValues, setEditingCustomValues] = useState<Record<string, string>>({});

    const fetchColumns = useCallback(async () => {
        const { data } = await supabase
            .from('t_custom_columns')
            .select('*')
            .eq('table_name', tableName)
            .order('sort_order');
        if (data) {
            setCustomColumns(data.map((d: any) => ({ id: d.id, label: d.column_name, type: d.column_type as 'text' | 'number' })));
        }
    }, [tableName]);

    const fetchData = useCallback(async (recordIds: string[]) => {
        if (recordIds.length === 0) return;
        const { data } = await supabase
            .from('t_custom_column_data')
            .select('custom_column_id, record_id, value')
            .in('record_id', recordIds);
        if (data) {
            const map: Record<string, Record<string, string>> = {};
            data.forEach((d: any) => {
                if (!map[d.record_id]) map[d.record_id] = {};
                map[d.record_id][d.custom_column_id] = d.value || '';
            });
            setCustomData(map);
        }
    }, []);

    const addColumn = useCallback(async (name: string, type: 'text' | 'number') => {
        const id = `custom_${Date.now()}`;
        const { error } = await supabase.from('t_custom_columns').insert({
            id, table_name: tableName, column_name: name, column_type: type, sort_order: customColumns.length
        });
        if (!error) {
            setCustomColumns(prev => [...prev, { id, label: name, type }]);
        }
    }, [tableName, customColumns.length]);

    const deleteColumn = useCallback(async (id: string) => {
        const { error } = await supabase.from('t_custom_columns').delete().eq('id', id);
        if (!error) {
            setCustomColumns(prev => prev.filter(c => c.id !== id));
        }
    }, []);

    const initEditingValues = useCallback((recordId: string | undefined) => {
        if (recordId && customData[recordId]) {
            setEditingCustomValues({ ...customData[recordId] });
        } else {
            setEditingCustomValues({});
        }
    }, [customData]);

    const setEditingValue = useCallback((colId: string, value: string) => {
        setEditingCustomValues(prev => ({ ...prev, [colId]: value }));
    }, []);

    const saveData = useCallback(async (recordId: string) => {
        const entries = Object.entries(editingCustomValues).filter(([, v]) => v !== '');
        if (entries.length === 0) return;
        const rows = entries.map(([colId, value]) => ({
            custom_column_id: colId,
            record_id: recordId,
            value,
        }));
        await supabase.from('t_custom_column_data').upsert(rows, { onConflict: 'custom_column_id,record_id' });
        // Update local cache
        setCustomData(prev => ({ ...prev, [recordId]: { ...prev[recordId], ...editingCustomValues } }));
    }, [editingCustomValues]);

    return {
        customColumns, customData, editingCustomValues,
        fetchColumns, fetchData, addColumn, deleteColumn,
        initEditingValues, setEditingValue, saveData,
    };
}

// ============ EMPLOYEES TAB ============

function EmployeesTab() {
    const { toast } = useToast();
    const [items, setItems] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Partial<Employee> | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [saving, setSaving] = useState(false);

    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    // Column Definitions
    const initialColumns: { id: string; label: string; align?: string }[] = [
        { id: 'employee_code', label: 'Kürzel' },
        { id: 'name', label: 'Name' },
        { id: 'role', label: 'Rolle' },
        { id: 'contract_type', label: 'Vertrag' },
        { id: 'weekly_hours_contract', label: 'Std./Woche', align: 'right' },
        { id: 'hourly_rate', label: 'Stundensatz', align: 'right' },
        { id: 'is_active', label: 'Aktiv', align: 'center' },
    ];

    // Persisted Column Order
    const [columnOrder, setColumnOrder] = useLocalStorage<string[]>('employees_column_order', initialColumns.map(c => c.id));
    // Hidden Columns
    const [hiddenColumns, setHiddenColumns] = useLocalStorage<string[]>('employees_hidden_columns', []);
    // Custom Columns (Supabase-backed)
    const cc = useCustomColumns('employees');

    // All columns = built-in + custom
    const allColumns = React.useMemo(() => [
        ...initialColumns,
        ...cc.customColumns.map(c => ({ id: c.id, label: c.label, align: c.type === 'number' ? 'right' : undefined, isCustom: true as const }))
    ], [cc.customColumns]);

    // Sync column order when custom columns are added/removed
    React.useEffect(() => {
        const allIds = allColumns.map(c => c.id);
        const hasNew = allIds.some(id => !columnOrder.includes(id));
        const hasRemoved = columnOrder.some(id => !allIds.some(c => c === id));
        if (hasNew || hasRemoved) {
            setColumnOrder(prev => {
                const existing = prev.filter(id => allIds.includes(id));
                const newIds = allIds.filter(id => !existing.includes(id));
                return [...existing, ...newIds];
            });
        }
    }, [allColumns]);

    const toggleColumn = (colId: string) => {
        setHiddenColumns(prev => prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId]);
    };

    const deleteCustomColumn = (id: string) => {
        cc.deleteColumn(id);
        setColumnOrder(prev => prev.filter(cid => cid !== id));
        setHiddenColumns(prev => prev.filter(cid => cid !== id));
    };

    const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor));

    const fetch = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase.from('t_employees').select('*').order('name');
        setItems(data || []);
        await cc.fetchColumns();
        if (data && data.length > 0) await cc.fetchData(data.map((d: any) => d.employee_id));
        setLoading(false);
    }, [cc.fetchColumns, cc.fetchData]);

    useEffect(() => { fetch(); }, [fetch]);

    const openNew = () => { setEditing({ name: '', is_active: true, hourly_rate: 0, contract_type: 'Vollzeit' }); setIsNew(true); cc.initEditingValues(undefined); };
    const openEdit = (e: Employee) => { setEditing({ ...e }); setIsNew(false); cc.initEditingValues(e.employee_id); };

    const save = async () => {
        if (!editing?.name) return;
        setSaving(true);
        try {
            if (isNew) {
                const id = `EMP-${Date.now()}`;
                const { error } = await supabase.from('t_employees').insert({
                    employee_id: id,
                    name: editing.name,
                    employee_code: editing.employee_code || null,
                    email: editing.email || null,
                    phone: editing.phone || null,
                    role: editing.role || null,
                    contract_type: editing.contract_type || null,
                    weekly_hours_contract: editing.weekly_hours_contract || null,
                    hourly_rate: editing.hourly_rate || null,
                    notes: editing.notes || null,
                    is_active: editing.is_active ?? true,
                });
                if (error) throw error;
                await cc.saveData(id);
                toast('Mitarbeiter erstellt');
            } else {
                const { employee_id, created_at, updated_at, ...upd } = editing as Employee;
                const { error } = await supabase.from('t_employees').update(upd).eq('employee_id', employee_id);
                if (error) throw error;
                await cc.saveData(employee_id);
                toast('Mitarbeiter aktualisiert');
            }
            setEditing(null);
            fetch();
        } catch { toast('Fehler beim Speichern', 'error'); }
        setSaving(false);
    };

    const remove = async (id: string, e?: React.MouseEvent) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        if (!confirm('Mitarbeiter wirklich löschen?')) return;
        setItems(prev => prev.filter(e => e.employee_id !== id));
        const { error } = await supabase.from('t_employees').delete().eq('employee_id', id);
        if (error) { toast('Fehler beim Löschen', 'error'); fetch(); }
    };

    // --- Sort Logic ---
    const handleSort = (key: string) => {
        setSortConfig(current => {
            if (current?.key === key) {
                return current.direction === 'asc' ? { key, direction: 'desc' } : null;
            }
            return { key, direction: 'asc' };
        });
    };

    const sortedItems = React.useMemo(() => {
        if (!sortConfig) return items;
        return [...items].sort((a: any, b: any) => {
            const aVal = a[sortConfig.key] ?? '';
            const bVal = b[sortConfig.key] ?? '';
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [items, sortConfig]);

    // --- Drag Logic ---
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            setColumnOrder((items) => {
                const oldIndex = items.indexOf(active.id as string);
                const newIndex = items.indexOf(over?.id as string);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    // --- Column Renderer Helper ---
    const renderCell = (e: Employee, colId: string) => {
        switch (colId) {
            case 'employee_code': return <td className="px-4 py-3 font-mono text-xs text-slate-500">{e.employee_code || '—'}</td>;
            case 'name': return <td className="px-4 py-3 font-medium text-slate-900">{e.name}</td>;
            case 'role': return <td className="px-4 py-3 text-slate-600">{e.role || '—'}</td>;
            case 'contract_type': return <td className="px-4 py-3"><span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{e.contract_type || '—'}</span></td>;
            case 'weekly_hours_contract': return <td className="px-4 py-3 text-right font-mono">{e.weekly_hours_contract ?? '—'}</td>;
            case 'hourly_rate': return <td className="px-4 py-3 text-right font-mono">{e.hourly_rate ? `${e.hourly_rate.toFixed(2)} €` : '—'}</td>;
            case 'is_active': return <td className="px-4 py-3 text-center">{e.is_active ? <Check className="h-4 w-4 text-green-600 mx-auto" /> : <X className="h-4 w-4 text-slate-300 mx-auto" />}</td>;
            default: {
                // Custom column
                const val = cc.customData[e.employee_id]?.[colId] || '';
                const col = cc.customColumns.find(c => c.id === colId);
                return <td className={cn('px-4 py-3', col?.type === 'number' ? 'text-right font-mono' : 'text-slate-600')}>{val || '—'}</td>;
            }
        }
    };

    if (loading) return <LoadingSpinner />;

    // Derived ordered columns (visible only)
    const orderedColumns = columnOrder.map(id => allColumns.find(c => c.id === id)!).filter(Boolean);
    const visibleColumns = orderedColumns.filter(col => !hiddenColumns.includes(col.id));

    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-slate-500">{items.length} Mitarbeiter</span>
                <div className="flex items-center gap-2">
                    <ColumnSettingsDropdown
                        allColumns={allColumns.map(c => ({ id: c.id, label: c.label, isCustom: 'isCustom' in c && c.isCustom === true }))}
                        hiddenColumns={hiddenColumns}
                        onToggle={toggleColumn}
                        customColumns={cc.customColumns}
                        onAddCustomColumn={cc.addColumn}
                        onDeleteCustomColumn={deleteCustomColumn}
                    />
                    <button onClick={openNew} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-sm">
                        <Plus className="h-4 w-4" /> Hinzufügen
                    </button>
                </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b text-xs font-medium text-slate-500 uppercase">
                            <SortableContext items={visibleColumns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                                <tr>
                                    {visibleColumns.map(col => (
                                        <SortableHeader
                                            key={col.id}
                                            id={col.id}
                                            onClick={() => handleSort(col.id)}
                                            sortDirection={sortConfig?.key === col.id ? sortConfig.direction : undefined}
                                        >
                                            <div className={cn("flex items-center gap-1",
                                                col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start')}>
                                                {col.label}
                                            </div>
                                        </SortableHeader>
                                    ))}
                                    <th className="w-20"></th>
                                </tr>
                            </SortableContext>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedItems.map(e => (
                                <tr key={e.employee_id} className="hover:bg-slate-50 group cursor-pointer" onClick={() => openEdit(e)}>
                                    {visibleColumns.map(col => (
                                        <React.Fragment key={col.id}>
                                            {renderCell(e, col.id)}
                                        </React.Fragment>
                                    ))}
                                    <td className="px-4 py-3" onClick={ev => ev.stopPropagation()}>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEdit(e)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600"><Pencil className="h-4 w-4" /></button>
                                            <button onClick={(ev) => remove(e.employee_id, ev)} type="button" className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </DndContext>
            </div>

            {editing && (
                <Modal title={isNew ? 'Neuer Mitarbeiter' : 'Bearbeiten'} onClose={() => setEditing(null)} onSave={save} saving={saving}>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Kürzel" value={editing.employee_code || ''} onChange={v => setEditing({ ...editing, employee_code: v })} />
                        <Field label="Name *" value={editing.name || ''} onChange={v => setEditing({ ...editing, name: v })} />
                        <Field label="Rolle" value={editing.role || ''} onChange={v => setEditing({ ...editing, role: v })} />
                        <div><label className="block text-xs font-medium text-slate-500 mb-1">Vertrag</label>
                            <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={editing.contract_type || ''} onChange={e => setEditing({ ...editing, contract_type: e.target.value })}>
                                <option value="">—</option><option value="Vollzeit">Vollzeit</option><option value="Teilzeit">Teilzeit</option><option value="Minijob">Minijob</option><option value="Freelance">Freelance</option>
                            </select>
                        </div>
                        <Field label="Std./Woche" type="number" value={String(editing.weekly_hours_contract || '')} onChange={v => setEditing({ ...editing, weekly_hours_contract: +v })} />
                        <Field label="Stundensatz (€)" type="number" value={String(editing.hourly_rate || '')} onChange={v => setEditing({ ...editing, hourly_rate: +v })} />
                        <Field label="Telefon" value={editing.phone || ''} onChange={v => setEditing({ ...editing, phone: v })} />
                        <Field label="E-Mail" value={editing.email || ''} onChange={v => setEditing({ ...editing, email: v })} />
                    </div>
                    <div className="mt-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.is_active ?? true} onChange={e => setEditing({ ...editing, is_active: e.target.checked })} className="rounded" /> Aktiv</label></div>
                    <Field label="Notizen" value={editing.notes || ''} onChange={v => setEditing({ ...editing, notes: v })} textarea />
                    {cc.customColumns.length > 0 && (
                        <div className="border-t border-slate-200 pt-3 mt-3">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Eigene Spalten</p>
                            <div className="grid grid-cols-2 gap-3">
                                {cc.customColumns.map(col => (
                                    <Field
                                        key={col.id}
                                        label={col.label}
                                        type={col.type === 'number' ? 'number' : 'text'}
                                        value={cc.editingCustomValues[col.id] || ''}
                                        onChange={v => cc.setEditingValue(col.id, v)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </Modal>
            )}
        </>
    );
}

// ============ VEHICLES TAB ============

function VehiclesTab() {
    const { toast } = useToast();
    const [items, setItems] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Partial<Vehicle & { cost_per_unit: number, price_per_unit: number, gas_cost_per_unit: number, gas_price_per_unit: number }> | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [saving, setSaving] = useState(false);

    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    // Column Definitions
    const initialColumns: { id: string; label: string; align?: string }[] = [
        { id: 'vehicle_id', label: 'ID' },
        { id: 'nickname', label: 'Spitzname' },
        { id: 'unit', label: 'Einheit' },
        { id: 'status', label: 'Status' },
        { id: 'inhalt', label: 'Inhalt' },
        { id: 'cost_per_unit', label: 'EK / KM', align: 'right' },
        { id: 'gas_cost_per_unit', label: 'Kraftstoff EK', align: 'right' },
        { id: 'price_per_unit', label: 'VK / KM', align: 'right' },
        { id: 'gas_price_per_unit', label: 'Kraftstoff VK', align: 'right' },
    ];

    // Persisted Column Order
    const [columnOrder, setColumnOrder] = useLocalStorage<string[]>('vehicles_column_order_v4', initialColumns.map(c => c.id));
    const [hiddenColumns, setHiddenColumns] = useLocalStorage<string[]>('vehicles_hidden_columns', []);
    const cc = useCustomColumns('vehicles');

    const allColumns = React.useMemo(() => [
        ...initialColumns,
        ...cc.customColumns.map(c => ({ id: c.id, label: c.label, align: c.type === 'number' ? 'right' : undefined, isCustom: true as const }))
    ], [cc.customColumns]);

    React.useEffect(() => {
        const allIds = allColumns.map(c => c.id);
        const hasNew = allIds.some(id => !columnOrder.includes(id));
        const hasRemoved = columnOrder.some(id => !allIds.some(c => c === id));
        if (hasNew || hasRemoved) {
            setColumnOrder(prev => {
                const existing = prev.filter(id => allIds.includes(id));
                const newIds = allIds.filter(id => !existing.includes(id));
                return [...existing, ...newIds];
            });
        }
    }, [allColumns]);

    const toggleColumn = (colId: string) => setHiddenColumns(prev => prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId]);
    const deleteCustomColumn = (id: string) => { cc.deleteColumn(id); setColumnOrder(prev => prev.filter(cid => cid !== id)); setHiddenColumns(prev => prev.filter(cid => cid !== id)); };

    const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor));

    const fetch = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase.from('t_vehicles')
            .select('*, rates:t_vehicle_rates(cost_per_unit, price_per_unit, gas_cost_per_unit, gas_price_per_unit)')
            .eq('is_deleted', false)
            .order('nickname');

        // Flatten
        const flatData = (data || []).map((v: any) => {
            const r = Array.isArray(v.rates) ? v.rates[0] : v.rates;
            return {
                ...v,
                cost_per_unit: r?.cost_per_unit || 0,
                price_per_unit: r?.price_per_unit || 0,
                gas_cost_per_unit: r?.gas_cost_per_unit || 0,
                gas_price_per_unit: r?.gas_price_per_unit || 0,
            };
        });

        setItems(flatData);
        await cc.fetchColumns();
        if (flatData.length > 0) await cc.fetchData(flatData.map((d: any) => d.vehicle_id));
        setLoading(false);
    }, [cc.fetchColumns, cc.fetchData]);

    useEffect(() => { fetch(); }, [fetch]);

    const openNew = () => { setEditing({ nickname: '', vehicle_id: `v-${Date.now()}`, is_deleted: false, cost_per_unit: 0, price_per_unit: 0, gas_cost_per_unit: 0, gas_price_per_unit: 0 }); setIsNew(true); cc.initEditingValues(undefined); };
    const openEdit = (v: any) => { setEditing({ ...v }); setIsNew(false); cc.initEditingValues(v.vehicle_id); };

    const save = async () => {
        if (!editing?.nickname) return;
        setSaving(true);
        try {
            if (isNew) {
                const vid = editing.vehicle_id || `v-${Date.now()}`;
                const { error } = await supabase.from('t_vehicles').insert({
                    vehicle_id: vid,
                    nickname: editing.nickname,
                    unit: editing.unit || null,
                    status: editing.status || null,
                    inhalt: editing.inhalt || null,
                    notes: editing.notes || null,
                    is_deleted: false,
                });
                if (error) throw error;
                await supabase.from('t_vehicle_rates').upsert({
                    vehicle_id: vid,
                    cost_per_unit: Number(editing.cost_per_unit) || 0,
                    price_per_unit: Number(editing.price_per_unit) || 0,
                    gas_cost_per_unit: Number(editing.gas_cost_per_unit) || 0,
                    gas_price_per_unit: Number(editing.gas_price_per_unit) || 0,
                    currency: 'EUR'
                });
                await cc.saveData(vid);
                toast('Fahrzeug erstellt');
            } else {
                const { created_at, updated_at, rates, cost_per_unit, price_per_unit, gas_cost_per_unit, gas_price_per_unit, ...upd } = editing as any;
                const { error } = await supabase.from('t_vehicles').update(upd).eq('vehicle_id', editing.vehicle_id);
                if (error) throw error;
                await supabase.from('t_vehicle_rates').upsert({
                    vehicle_id: editing.vehicle_id,
                    cost_per_unit: Number(editing.cost_per_unit) || 0,
                    price_per_unit: Number(editing.price_per_unit) || 0,
                    gas_cost_per_unit: Number(editing.gas_cost_per_unit) || 0,
                    gas_price_per_unit: Number(editing.gas_price_per_unit) || 0,
                    currency: 'EUR'
                });
                await cc.saveData(editing.vehicle_id!);
                toast('Fahrzeug aktualisiert');
            }
            setEditing(null);
            fetch();
        } catch (err) {
            console.error(err);
            toast('Fehler beim Speichern', 'error');
        }
        setSaving(false);
    };

    const remove = async (id: string, e?: React.MouseEvent) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        if (!confirm('Fahrzeug wirklich löschen?')) return;
        setItems(prev => prev.filter(v => v.vehicle_id !== id));
        const { error } = await supabase.from('t_vehicles').update({ is_deleted: true }).eq('vehicle_id', id);
        if (error) { toast('Fehler beim Löschen', 'error'); fetch(); }
    };

    // --- Sort Logic ---
    const handleSort = (key: string) => {
        setSortConfig(current => {
            if (current?.key === key) {
                return current.direction === 'asc' ? { key, direction: 'desc' } : null;
            }
            return { key, direction: 'asc' };
        });
    };

    const sortedItems = React.useMemo(() => {
        if (!sortConfig) return items;
        return [...items].sort((a: any, b: any) => {
            const aVal = a[sortConfig.key] ?? '';
            const bVal = b[sortConfig.key] ?? '';
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [items, sortConfig]);

    // --- Drag Logic ---
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            setColumnOrder((items) => {
                const oldIndex = items.indexOf(active.id as string);
                const newIndex = items.indexOf(over?.id as string);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    // --- Column Renderer Helper ---
    const renderCell = (v: any, colId: string) => {
        switch (colId) {
            case 'vehicle_id': return <td className="px-4 py-3 font-mono text-xs text-slate-500">{v.vehicle_id}</td>;
            case 'nickname': return <td className="px-4 py-3 font-medium text-slate-900">{v.nickname}</td>;
            case 'unit': return <td className="px-4 py-3 text-slate-600">{v.unit || '—'}</td>;
            case 'status': return <td className="px-4 py-3"><span className={cn('text-xs px-2 py-0.5 rounded-full', v.status === 'Aktiv' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600')}>{v.status || '—'}</span></td>;
            case 'inhalt': return <td className="px-4 py-3 text-slate-600 truncate max-w-[200px]">{v.inhalt || '—'}</td>;
            case 'cost_per_unit': return <td className="px-4 py-3 text-right font-mono">{v.cost_per_unit ? `${v.cost_per_unit.toFixed(2)} €` : '—'}</td>;
            case 'gas_cost_per_unit': return <td className="px-4 py-3 text-right font-mono text-slate-500">{v.gas_cost_per_unit ? `${v.gas_cost_per_unit.toFixed(2)} €` : '—'}</td>;
            case 'price_per_unit': return <td className="px-4 py-3 text-right font-mono">{v.price_per_unit ? `${v.price_per_unit.toFixed(2)} €` : '—'}</td>;
            case 'gas_price_per_unit': return <td className="px-4 py-3 text-right font-mono text-slate-500">{v.gas_price_per_unit ? `${v.gas_price_per_unit.toFixed(2)} €` : '—'}</td>;
            default: {
                const val = cc.customData[v.vehicle_id]?.[colId] || '';
                const col = cc.customColumns.find(c => c.id === colId);
                return <td className={cn('px-4 py-3', col?.type === 'number' ? 'text-right font-mono' : 'text-slate-600')}>{val || '—'}</td>;
            }
        }
    };

    if (loading) return <LoadingSpinner />;

    // Derived ordered columns (visible only)
    const orderedColumns = columnOrder.map(id => allColumns.find(c => c.id === id)!).filter(Boolean);
    const visibleColumns = orderedColumns.filter(col => !hiddenColumns.includes(col.id));

    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-slate-500">{items.length} Fahrzeuge</span>
                <div className="flex items-center gap-2">
                    <ColumnSettingsDropdown
                        allColumns={allColumns.map(c => ({ id: c.id, label: c.label, isCustom: 'isCustom' in c && c.isCustom === true }))}
                        hiddenColumns={hiddenColumns}
                        onToggle={toggleColumn}
                        customColumns={cc.customColumns}
                        onAddCustomColumn={cc.addColumn}
                        onDeleteCustomColumn={deleteCustomColumn}
                    />
                    <button onClick={openNew} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-sm">
                        <Plus className="h-4 w-4" /> Hinzufügen
                    </button>
                </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b text-xs font-medium text-slate-500 uppercase">
                            <SortableContext items={visibleColumns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                                <tr>
                                    {visibleColumns.map(col => (
                                        <SortableHeader
                                            key={col.id}
                                            id={col.id}
                                            onClick={() => handleSort(col.id)}
                                            sortDirection={sortConfig?.key === col.id ? sortConfig.direction : undefined}
                                        >
                                            <div className={cn("flex items-center gap-1",
                                                col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start')}>
                                                {col.label}
                                            </div>
                                        </SortableHeader>
                                    ))}
                                    <th className="w-20"></th>
                                </tr>
                            </SortableContext>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedItems.map(v => (
                                <tr key={v.vehicle_id} className="hover:bg-slate-50 group cursor-pointer" onClick={() => openEdit(v)}>
                                    {visibleColumns.map(col => (
                                        <React.Fragment key={col.id}>
                                            {renderCell(v, col.id)}
                                        </React.Fragment>
                                    ))}
                                    <td className="px-4 py-3" onClick={ev => ev.stopPropagation()}>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEdit(v)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600"><Pencil className="h-4 w-4" /></button>
                                            <button onClick={(e) => remove(v.vehicle_id, e)} type="button" className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </DndContext>
            </div>
            {editing && (
                <Modal title={isNew ? 'Neues Fahrzeug' : 'Fahrzeug bearbeiten'} onClose={() => setEditing(null)} onSave={save} saving={saving}>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Spitzname *" value={editing.nickname || ''} onChange={v => setEditing({ ...editing, nickname: v })} />
                        <Field label="Einheit" value={editing.unit || ''} onChange={v => setEditing({ ...editing, unit: v })} placeholder="z.B. km, Std" />
                        <Field label="Status" value={editing.status || ''} onChange={v => setEditing({ ...editing, status: v })} />
                        <Field label="Inhalt / Notizen" value={editing.inhalt || ''} onChange={v => setEditing({ ...editing, inhalt: v })} />
                        <Field label="EK / KM (€)" value={String(editing.cost_per_unit || '')} onChange={v => setEditing({ ...editing, cost_per_unit: Number(v) || 0 })} type="number" />
                        <Field label="VK / KM (€)" value={String(editing.price_per_unit || '')} onChange={v => setEditing({ ...editing, price_per_unit: Number(v) || 0 })} type="number" />
                        <Field label="Kraftstoff EK (€)" value={String(editing.gas_cost_per_unit || '')} onChange={v => setEditing({ ...editing, gas_cost_per_unit: Number(v) || 0 })} type="number" />
                        <Field label="Kraftstoff VK (€)" value={String(editing.gas_price_per_unit || '')} onChange={v => setEditing({ ...editing, gas_price_per_unit: Number(v) || 0 })} type="number" />
                    </div>
                </Modal>
            )}
        </>
    );
}

function MaterialsTab() {
    const { toast } = useToast();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<any | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [saving, setSaving] = useState(false);

    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    // Column Definitions
    const initialColumns: { id: string; label: string; align?: string }[] = [
        { id: 'name', label: 'Material' },
        { id: 'unit', label: 'Einheit' },
        { id: 'category', label: 'Kategorie' },
        { id: 'cost_per_unit', label: 'EK/Einheit', align: 'right' },
        { id: 'price_per_unit', label: 'VK/Einheit', align: 'right' },
        { id: 'vat_rate', label: 'MwSt %', align: 'right' },
    ];

    // Persisted Column Order
    const [columnOrder, setColumnOrder] = useLocalStorage<string[]>('materials_column_order', initialColumns.map(c => c.id));
    const [hiddenColumns, setHiddenColumns] = useLocalStorage<string[]>('materials_hidden_columns', []);
    const cc = useCustomColumns('materials');

    const allColumns = React.useMemo(() => [
        ...initialColumns,
        ...cc.customColumns.map(c => ({ id: c.id, label: c.label, align: c.type === 'number' ? 'right' : undefined, isCustom: true as const }))
    ], [cc.customColumns]);

    React.useEffect(() => {
        const allIds = allColumns.map(c => c.id);
        const hasNew = allIds.some(id => !columnOrder.includes(id));
        const hasRemoved = columnOrder.some(id => !allIds.some(c => c === id));
        if (hasNew || hasRemoved) {
            setColumnOrder(prev => { const existing = prev.filter(id => allIds.includes(id)); const newIds = allIds.filter(id => !existing.includes(id)); return [...existing, ...newIds]; });
        }
    }, [allColumns]);

    const toggleColumn = (colId: string) => setHiddenColumns(prev => prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId]);
    const deleteCustomColumn = (id: string) => { cc.deleteColumn(id); setColumnOrder(prev => prev.filter(cid => cid !== id)); setHiddenColumns(prev => prev.filter(cid => cid !== id)); };

    const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor));

    const fetch = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase.from('t_materials').select('*, prices:t_material_prices(cost_per_unit, price_per_unit)').eq('is_active', true).order('name');

        // Flatten data for easier sorting
        const flatData = (data || []).map((m: any) => {
            const p = Array.isArray(m.prices) ? m.prices[0] : m.prices;
            return {
                ...m,
                cost_per_unit: p?.cost_per_unit || 0,
                price_per_unit: p?.price_per_unit || 0
            };
        });

        setItems(flatData);
        await cc.fetchColumns();
        if (flatData.length > 0) await cc.fetchData(flatData.map((d: any) => d.material_id));
        setLoading(false);
    }, [cc.fetchColumns, cc.fetchData]);

    useEffect(() => { fetch(); }, [fetch]);

    const openNew = () => {
        setEditing({ material_id: '', name: '', unit: 'Stk', category: '', vat_rate: 19, cost_per_unit: 0, price_per_unit: 0 });
        setIsNew(true);
        cc.initEditingValues(undefined);
    };
    const openEdit = (m: any) => {
        setEditing({ ...m });
        setIsNew(false);
        cc.initEditingValues(m.material_id);
    };

    const save = async () => {
        if (!editing?.name) return;
        setSaving(true);
        try {
            if (isNew) {
                const id = editing.material_id || `MAT-${Date.now()}`;
                const { error } = await supabase.from('t_materials').insert({
                    material_id: id, name: editing.name, unit: editing.unit || 'Stk',
                    category: editing.category || null, vat_rate: editing.vat_rate || 19, is_active: true,
                });
                if (error) throw error;
                await supabase.from('t_material_prices').upsert({
                    material_id: id, cost_per_unit: Number(editing.cost_per_unit) || 0, price_per_unit: Number(editing.price_per_unit) || 0
                });
                await cc.saveData(id);
                toast('Material erstellt');
            } else {
                const { error } = await supabase.from('t_materials').update({
                    name: editing.name, unit: editing.unit, category: editing.category,
                    vat_rate: editing.vat_rate,
                }).eq('material_id', editing.material_id);
                if (error) throw error;
                await supabase.from('t_material_prices').upsert({
                    material_id: editing.material_id, cost_per_unit: Number(editing.cost_per_unit) || 0, price_per_unit: Number(editing.price_per_unit) || 0
                });
                await cc.saveData(editing.material_id);
                toast('Material aktualisiert');
            }
            setEditing(null); fetch();
        } catch { toast('Fehler beim Speichern', 'error'); }
        setSaving(false);
    };

    const remove = async (id: string, e?: React.MouseEvent) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        if (!confirm('Material wirklich löschen?')) return;
        setItems(prev => prev.filter(m => m.material_id !== id));
        const { error } = await supabase.from('t_materials').update({ is_active: false }).eq('material_id', id);
        if (error) { toast('Fehler beim Löschen', 'error'); fetch(); }
    };

    // --- Sort Logic ---
    const handleSort = (key: string) => {
        setSortConfig(current => {
            if (current?.key === key) {
                return current.direction === 'asc' ? { key, direction: 'desc' } : null;
            }
            return { key, direction: 'asc' };
        });
    };

    const sortedItems = React.useMemo(() => {
        if (!sortConfig) return items;
        return [...items].sort((a: any, b: any) => {
            const aVal = a[sortConfig.key] ?? '';
            const bVal = b[sortConfig.key] ?? '';
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [items, sortConfig]);

    // --- Drag Logic ---
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            setColumnOrder((items) => {
                const oldIndex = items.indexOf(active.id as string);
                const newIndex = items.indexOf(over?.id as string);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    // --- Column Renderer Helper ---
    const renderCell = (m: any, colId: string) => {
        switch (colId) {
            case 'name': return <td className="px-4 py-3 font-medium text-slate-900">{m.name}</td>;
            case 'unit': return <td className="px-4 py-3 text-slate-600">{m.unit}</td>;
            case 'category': return <td className="px-4 py-3"><span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{m.category || '—'}</span></td>;
            case 'cost_per_unit': return <td className="px-4 py-3 text-right font-mono">{m.cost_per_unit ? `${m.cost_per_unit.toFixed(2)} €` : '—'}</td>;
            case 'price_per_unit': return <td className="px-4 py-3 text-right font-mono">{m.price_per_unit ? `${m.price_per_unit.toFixed(2)} €` : '—'}</td>;
            case 'vat_rate': return <td className="px-4 py-3 text-right">{m.vat_rate ? `${m.vat_rate}%` : '—'}</td>;
            default: {
                const val = cc.customData[m.material_id]?.[colId] || '';
                const col = cc.customColumns.find(c => c.id === colId);
                return <td className={cn('px-4 py-3', col?.type === 'number' ? 'text-right font-mono' : 'text-slate-600')}>{val || '—'}</td>;
            }
        }
    };

    if (loading) return <LoadingSpinner />;

    // Derived ordered columns (visible only)
    const orderedColumns = columnOrder.map(id => allColumns.find(c => c.id === id)!).filter(Boolean);
    const visibleColumns = orderedColumns.filter(col => !hiddenColumns.includes(col.id));

    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-slate-500">{items.length} Materialien</span>
                <div className="flex items-center gap-2">
                    <ColumnSettingsDropdown
                        allColumns={allColumns.map(c => ({ id: c.id, label: c.label, isCustom: 'isCustom' in c && c.isCustom === true }))}
                        hiddenColumns={hiddenColumns}
                        onToggle={toggleColumn}
                        customColumns={cc.customColumns}
                        onAddCustomColumn={cc.addColumn}
                        onDeleteCustomColumn={deleteCustomColumn}
                    />
                    <button onClick={openNew} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-sm">
                        <Plus className="h-4 w-4" /> Hinzufügen
                    </button>
                </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b text-xs font-medium text-slate-500 uppercase">
                            <SortableContext items={visibleColumns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                                <tr>
                                    {visibleColumns.map(col => (
                                        <SortableHeader key={col.id} id={col.id} onClick={() => handleSort(col.id)}
                                            sortDirection={sortConfig?.key === col.id ? sortConfig.direction : undefined}>
                                            <div className={cn("flex items-center gap-1", col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start')}>{col.label}</div>
                                        </SortableHeader>
                                    ))}
                                    <th className="w-20"></th>
                                </tr>
                            </SortableContext>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedItems.map(m => (
                                <tr key={m.material_id} className="hover:bg-slate-50 group cursor-pointer" onClick={() => openEdit(m)}>
                                    {visibleColumns.map(col => (
                                        <React.Fragment key={col.id}>
                                            {renderCell(m, col.id)}
                                        </React.Fragment>
                                    ))}
                                    <td className="px-4 py-3" onClick={ev => ev.stopPropagation()}>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEdit(m)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600"><Pencil className="h-4 w-4" /></button>
                                            <button onClick={(e) => remove(m.material_id, e)} type="button" className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </DndContext>
            </div>
            {editing && (
                <Modal title={isNew ? 'Neues Material' : 'Material bearbeiten'} onClose={() => setEditing(null)} onSave={save} saving={saving}>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Name *" value={editing.name || ''} onChange={v => setEditing({ ...editing, name: v })} />
                        <Field label="Einheit" value={editing.unit || ''} onChange={v => setEditing({ ...editing, unit: v })} placeholder="z.B. Stk, m², Rolle" />
                        <Field label="Kategorie" value={editing.category || ''} onChange={v => setEditing({ ...editing, category: v })} />
                        <Field label="MwSt (%)" value={String(editing.vat_rate || '')} onChange={v => setEditing({ ...editing, vat_rate: parseFloat(v) || 0 })} type="number" />
                        <Field label="EK/Einheit (€)" value={String(editing.cost_per_unit || '')} onChange={v => setEditing({ ...editing, cost_per_unit: v })} type="number" />
                        <Field label="VK/Einheit (€)" value={String(editing.price_per_unit || '')} onChange={v => setEditing({ ...editing, price_per_unit: v })} type="number" />
                    </div>
                </Modal>
            )}
        </>
    );
}

function ServicesTab() {
    const { toast } = useToast();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<any | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [saving, setSaving] = useState(false);

    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    // Column Definitions
    const initialColumns: { id: string; label: string; align?: string }[] = [
        { id: 'name', label: 'Leistung' },
        { id: 'default_unit', label: 'Einheit' },
        { id: 'category', label: 'Kategorie' },
        { id: 'prices', label: 'Preise' },
    ];

    // Persisted Column Order
    const [columnOrder, setColumnOrder] = useLocalStorage<string[]>('services_column_order', initialColumns.map(c => c.id));
    const [hiddenColumns, setHiddenColumns] = useLocalStorage<string[]>('services_hidden_columns', []);
    const cc = useCustomColumns('services');

    const allColumns = React.useMemo(() => [
        ...initialColumns,
        ...cc.customColumns.map(c => ({ id: c.id, label: c.label, align: c.type === 'number' ? 'right' : undefined, isCustom: true as const }))
    ], [cc.customColumns]);

    React.useEffect(() => {
        const allIds = allColumns.map(c => c.id);
        const hasNew = allIds.some(id => !columnOrder.includes(id));
        const hasRemoved = columnOrder.some(id => !allIds.some(c => c === id));
        if (hasNew || hasRemoved) {
            setColumnOrder(prev => { const existing = prev.filter(id => allIds.includes(id)); const newIds = allIds.filter(id => !existing.includes(id)); return [...existing, ...newIds]; });
        }
    }, [allColumns]);

    const toggleColumn = (colId: string) => setHiddenColumns(prev => prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId]);
    const deleteCustomColumn = (id: string) => { cc.deleteColumn(id); setColumnOrder(prev => prev.filter(cid => cid !== id)); setHiddenColumns(prev => prev.filter(cid => cid !== id)); };

    const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor));

    const fetch = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase.from('t_services').select('*, prices:t_service_prices(*)').eq('is_active', true).order('name');
        setItems(data || []);
        await cc.fetchColumns();
        if (data && data.length > 0) await cc.fetchData(data.map((d: any) => d.service_id));
        setLoading(false);
    }, [cc.fetchColumns, cc.fetchData]);

    useEffect(() => { fetch(); }, [fetch]);

    const openNew = () => { setEditing({ name: '', default_unit: 'Std', is_active: true, prices: [] }); setIsNew(true); cc.initEditingValues(undefined); };
    const openEdit = (s: any) => { setEditing({ ...s, prices: s.prices || [] }); setIsNew(false); cc.initEditingValues(s.service_id); };

    const save = async () => {
        if (!editing?.name) return;
        setSaving(true);
        try {
            let sid = editing.service_id;
            if (isNew) {
                sid = sid || `SVC-${Date.now()}`;
                const { error } = await supabase.from('t_services').insert({
                    service_id: sid,
                    name: editing.name,
                    default_unit: editing.default_unit || 'Std',
                    category: editing.category || null,
                    is_active: true,
                });
                if (error) throw error;
            } else {
                const { prices, created_at, updated_at, ...upd } = editing as any;
                const { error } = await supabase.from('t_services').update(upd).eq('service_id', sid);
                if (error) throw error;
            }

            // Sync prices
            // 1. Get current prices in DB to identify deletions (only if not new)
            if (!isNew) {
                const { data: existingPrices } = await supabase.from('t_service_prices').select('price_id').eq('service_id', sid);
                const currentIds = (editing.prices || []).map((p: any) => p.price_id).filter(Boolean);
                const idsToDelete = (existingPrices || []).map(p => p.price_id).filter(id => !currentIds.includes(id));

                if (idsToDelete.length > 0) {
                    await supabase.from('t_service_prices').delete().in('price_id', idsToDelete);
                }
            }

            // 2. Upsert current prices
            if (editing.prices && editing.prices.length > 0) {
                const pricesToUpsert = editing.prices.map((p: any) => ({
                    price_id: p.price_id || `PRC-${Math.random().toString(36).substr(2, 9)}`,
                    service_id: sid,
                    supplier: p.supplier || 'Unbekannt',
                    unit: p.unit || 'Std',
                    cost_per_unit: Number(p.cost_per_unit) || 0,
                    customer_price_per_unit: Number(p.customer_price_per_unit) || 0
                }));
                const { error: pError } = await supabase.from('t_service_prices').upsert(pricesToUpsert);
                if (pError) throw pError;
            }

            toast(isNew ? 'Leistung erstellt' : 'Leistung aktualisiert');
            await cc.saveData(sid);
            setEditing(null);
            fetch();
        } catch (err) {
            console.error(err);
            toast('Fehler beim Speichern', 'error');
        }
        setSaving(false);
    };

    const addPriceRow = () => {
        const newPrice = { supplier: '', unit: editing.default_unit || 'Std', cost_per_unit: 0, customer_price_per_unit: 0 };
        setEditing({ ...editing, prices: [...(editing.prices || []), newPrice] });
    };

    const updatePriceRow = (index: number, field: string, value: any) => {
        const newPrices = [...(editing.prices || [])];
        newPrices[index] = { ...newPrices[index], [field]: value };
        setEditing({ ...editing, prices: newPrices });
    };

    const removePriceRow = (index: number) => {
        const newPrices = (editing.prices || []).filter((_: any, i: number) => i !== index);
        setEditing({ ...editing, prices: newPrices });
    };

    const remove = async (id: string, e?: React.MouseEvent) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        if (!confirm('Leistung wirklich löschen?')) return;
        setItems(prev => prev.filter(s => s.service_id !== id));
        const { error } = await supabase.from('t_services').update({ is_active: false }).eq('service_id', id);
        if (error) { toast('Fehler beim Löschen', 'error'); fetch(); }
    };

    // --- Sort Logic ---
    const handleSort = (key: string) => {
        setSortConfig(current => {
            if (current?.key === key) {
                return current.direction === 'asc' ? { key, direction: 'desc' } : null;
            }
            return { key, direction: 'asc' };
        });
    };

    const sortedItems = React.useMemo(() => {
        if (!sortConfig) return items;
        return [...items].sort((a: any, b: any) => {
            const aVal = a[sortConfig.key] ?? '';
            const bVal = b[sortConfig.key] ?? '';
            if (sortConfig.key === 'prices') return 0; // Don't sort complex objects easily
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [items, sortConfig]);

    // --- Drag Logic ---
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            setColumnOrder((items) => {
                const oldIndex = items.indexOf(active.id as string);
                const newIndex = items.indexOf(over?.id as string);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    // --- Column Renderer Helper ---
    const renderCell = (s: any, colId: string) => {
        switch (colId) {
            case 'name': return <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>;
            case 'default_unit': return <td className="px-4 py-3 text-slate-600">{s.default_unit}</td>;
            case 'category': return <td className="px-4 py-3"><span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{s.category || '—'}</span></td>;
            case 'prices': return (
                <td className="px-4 py-3 text-xs text-slate-500">
                    <div className="flex flex-col gap-1">
                        {s.prices?.map((p: any) => (
                            <div key={p.price_id} className="flex justify-between w-max gap-4 border-b border-slate-100 last:border-0 pb-0.5">
                                <span>{p.supplier}:</span>
                                <span className="font-mono">{p.cost_per_unit} / {p.customer_price_per_unit}</span>
                            </div>
                        ))}
                    </div>
                </td>
            );
            default: {
                const val = cc.customData[s.service_id]?.[colId] || '';
                const col = cc.customColumns.find(c => c.id === colId);
                return <td className={cn('px-4 py-3', col?.type === 'number' ? 'text-right font-mono' : 'text-slate-600')}>{val || '—'}</td>;
            }
        }
    };

    if (loading) return <LoadingSpinner />;

    // Derived ordered columns (visible only)
    const orderedColumns = columnOrder.map(id => allColumns.find(c => c.id === id)!).filter(Boolean);
    const visibleColumns = orderedColumns.filter(col => !hiddenColumns.includes(col.id));

    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-slate-500">{items.length} Leistungen</span>
                <div className="flex items-center gap-2">
                    <ColumnSettingsDropdown
                        allColumns={allColumns.map(c => ({ id: c.id, label: c.label, isCustom: 'isCustom' in c && c.isCustom === true }))}
                        hiddenColumns={hiddenColumns}
                        onToggle={toggleColumn}
                        customColumns={cc.customColumns}
                        onAddCustomColumn={cc.addColumn}
                        onDeleteCustomColumn={deleteCustomColumn}
                    />
                    <button onClick={openNew} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-sm">
                        <Plus className="h-4 w-4" /> Hinzufügen
                    </button>
                </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b text-xs font-medium text-slate-500 uppercase">
                            <SortableContext items={visibleColumns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                                <tr>
                                    {visibleColumns.map(col => (
                                        <SortableHeader key={col.id} id={col.id} onClick={() => handleSort(col.id)}
                                            sortDirection={sortConfig?.key === col.id ? sortConfig.direction : undefined}>
                                            <div className={cn("flex items-center gap-1", col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start')}>{col.label}</div>
                                        </SortableHeader>
                                    ))}
                                    <th className="w-20"></th>
                                </tr>
                            </SortableContext>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedItems.map(s => (
                                <tr key={s.service_id} className="hover:bg-slate-50 group cursor-pointer" onClick={() => openEdit(s)}>
                                    {visibleColumns.map(col => (
                                        <React.Fragment key={col.id}>
                                            {renderCell(s, col.id)}
                                        </React.Fragment>
                                    ))}
                                    <td className="px-4 py-3" onClick={ev => ev.stopPropagation()}>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEdit(s)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600"><Pencil className="h-4 w-4" /></button>
                                            <button onClick={(e) => remove(s.service_id, e)} type="button" className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </DndContext>
            </div>
            {editing && (
                <Modal title={isNew ? 'Neue Leistung' : 'Leistung bearbeiten'} onClose={() => setEditing(null)} onSave={save} saving={saving}>
                    <div className="space-y-6">
                        <div className="grid grid-cols-3 gap-3">
                            <Field label="Name *" value={editing.name || ''} onChange={v => setEditing({ ...editing, name: v })} />
                            <Field label="Einheit" value={editing.default_unit || ''} onChange={v => setEditing({ ...editing, default_unit: v })} />
                            <Field label="Kategorie" value={editing.category || ''} onChange={v => setEditing({ ...editing, category: v })} />
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-slate-900">Preise pro Lieferant</h4>
                                <button onClick={addPriceRow} className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium">
                                    <Plus className="h-3 w-3" /> Preis hinzufügen
                                </button>
                            </div>

                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                {(!editing.prices || editing.prices.length === 0) ? (
                                    <div className="text-center py-4 text-xs text-slate-400">Keine Preise hinterlegt</div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="grid grid-cols-12 gap-2 px-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            <div className="col-span-4">Lieferant</div>
                                            <div className="col-span-2">Einheit</div>
                                            <div className="col-span-2 text-right">EK (€)</div>
                                            <div className="col-span-2 text-right">VK (€)</div>
                                            <div className="col-span-2"></div>
                                        </div>
                                        {editing.prices.map((p: any, idx: number) => (
                                            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                                                <div className="col-span-4">
                                                    <input
                                                        className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                                        value={p.supplier || ''}
                                                        onChange={e => updatePriceRow(idx, 'supplier', e.target.value)}
                                                        placeholder="Name"
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <input
                                                        className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                                        value={p.unit || ''}
                                                        onChange={e => updatePriceRow(idx, 'unit', e.target.value)}
                                                        placeholder="Std"
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <input
                                                        type="number"
                                                        className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500 outline-none text-right"
                                                        value={p.cost_per_unit ?? ''}
                                                        onChange={e => updatePriceRow(idx, 'cost_per_unit', e.target.value)}
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <input
                                                        type="number"
                                                        className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500 outline-none text-right"
                                                        value={p.customer_price_per_unit ?? ''}
                                                        onChange={e => updatePriceRow(idx, 'customer_price_per_unit', e.target.value)}
                                                    />
                                                </div>
                                                <div className="col-span-2 flex justify-end">
                                                    <button onClick={() => removePriceRow(idx)} className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-white transition-colors">
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
}

// ============ SHARED COMPONENTS ============

// --- Column Settings Dropdown ---
function ColumnSettingsDropdown({
    allColumns,
    hiddenColumns,
    onToggle,
    customColumns,
    onAddCustomColumn,
    onDeleteCustomColumn,
}: {
    allColumns: { id: string; label: string; isCustom?: boolean }[];
    hiddenColumns: string[];
    onToggle: (colId: string) => void;
    customColumns?: { id: string; label: string; type: 'text' | 'number' }[];
    onAddCustomColumn?: (name: string, type: 'text' | 'number') => void;
    onDeleteCustomColumn?: (id: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [addingCol, setAddingCol] = useState(false);
    const [newColName, setNewColName] = useState('');
    const [newColType, setNewColType] = useState<'text' | 'number'>('text');
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
                setAddingCol(false);
            }
        };
        if (open) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const handleAdd = () => {
        if (newColName.trim() && onAddCustomColumn) {
            onAddCustomColumn(newColName.trim(), newColType);
            setNewColName('');
            setNewColType('text');
            setAddingCol(false);
        }
    };

    const hiddenCount = hiddenColumns.length;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setOpen(!open)}
                className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border transition-all',
                    hiddenCount > 0
                        ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                )}
            >
                <Columns3 className="h-4 w-4" />
                Spalten
                {hiddenCount > 0 && (
                    <span className="ml-1 text-xs bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full font-semibold">
                        {hiddenCount} ausgeblendet
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sichtbare Spalten</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto py-1">
                        {allColumns.map(col => {
                            const isHidden = hiddenColumns.includes(col.id);
                            const isCustom = col.isCustom;
                            return (
                                <div key={col.id} className="flex items-center justify-between px-4 py-2 hover:bg-slate-50 group">
                                    <button
                                        onClick={() => onToggle(col.id)}
                                        className="flex items-center gap-3 flex-1 text-left"
                                    >
                                        <div className={cn(
                                            'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                                            isHidden
                                                ? 'border-slate-300 bg-white'
                                                : 'border-blue-500 bg-blue-500'
                                        )}>
                                            {!isHidden && <Check className="h-3 w-3 text-white" />}
                                        </div>
                                        <span className={cn('text-sm', isHidden ? 'text-slate-400' : 'text-slate-700 font-medium')}>
                                            {col.label}
                                        </span>
                                        {isCustom && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">Eigene</span>}
                                    </button>
                                    {isCustom && onDeleteCustomColumn && (
                                        <button
                                            onClick={() => onDeleteCustomColumn(col.id)}
                                            className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {onAddCustomColumn && (
                        <div className="border-t border-slate-100 p-3">
                            {!addingCol ? (
                                <button
                                    onClick={() => setAddingCol(true)}
                                    className="flex items-center gap-2 w-full text-sm text-blue-600 hover:text-blue-700 font-medium px-1 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                                >
                                    <Plus className="h-4 w-4" /> Spalte hinzufügen
                                </button>
                            ) : (
                                <div className="space-y-2">
                                    <input
                                        autoFocus
                                        placeholder="Spaltenname"
                                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        value={newColName}
                                        onChange={e => setNewColName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                                    />
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={newColType}
                                            onChange={e => setNewColType(e.target.value as 'text' | 'number')}
                                            className="flex-1 px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                                        >
                                            <option value="text">Text</option>
                                            <option value="number">Zahl</option>
                                        </select>
                                        <button onClick={handleAdd} disabled={!newColName.trim()}
                                            className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
                                        >Hinzufügen</button>
                                        <button onClick={() => { setAddingCol(false); setNewColName(''); }}
                                            className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700"
                                        >×</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {hiddenCount > 0 && (
                        <div className="border-t border-slate-100 px-4 py-2.5">
                            <button
                                onClick={() => hiddenColumns.forEach(id => onToggle(id))}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Alle einblenden
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function LoadingSpinner() {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;
}

function Modal({ title, onClose, onSave, saving, children }: {
    title: string; onClose: () => void; onSave: () => void; saving: boolean; children: React.ReactNode;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto m-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <h2 className="text-lg font-bold text-slate-800">{title}</h2>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X className="h-5 w-5 text-slate-400" /></button>
                </div>
                <div className="p-6 space-y-3">{children}</div>
                <div className="flex justify-end gap-3 border-t px-6 py-4">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 rounded-lg border border-slate-300 hover:bg-slate-50">Abbrechen</button>
                    <button onClick={onSave} disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-sm">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Speichern
                    </button>
                </div>
            </div>
        </div>
    );
}

function Field({ label, value, onChange, type = 'text', textarea = false, placeholder }: {
    label: string; value: string; onChange: (v: string) => void; type?: string; textarea?: boolean; placeholder?: string;
}) {
    return (
        <div className={textarea ? 'col-span-full mt-2' : ''}>
            <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
            {textarea ? (
                <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none focus:border-blue-500 focus:outline-none"
                    rows={2} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
            ) : (
                <input type={type} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
            )}
        </div>
    );
}
