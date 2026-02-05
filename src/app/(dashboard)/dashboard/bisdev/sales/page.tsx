"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
    TrendingUp,
    ChevronRight,
    LayoutGrid,
    List,
    Plus,
    X,
    Calendar,
    Trash2,
    Edit3,
    Clock,
    Eye,
    GripVertical,
} from "lucide-react";

// Jira and Drive icons as SVGs
const JiraIcon = () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.005 1.005 0 0 0 23.013 0z" />
    </svg>
);

const DriveIcon = () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M4.433 22.396l4-6.929H24l-4 6.929H4.433zm3.566-6.929l-3.998 6.929L0 15.467 7.785 1.98l3.999 6.931-3.785 6.556zm15.784-.001H7.784L11.783 8.91h15.999l-3.999 6.556z" />
    </svg>
);

// Status configurations
const STATUS_CONFIG = {
    running: { label: "Running", bgClass: "bg-blue-500/10", textClass: "text-blue-600 dark:text-blue-400", barClass: "bg-blue-500" },
    partial: { label: "Partial", bgClass: "bg-amber-500/10", textClass: "text-amber-600 dark:text-amber-400", barClass: "bg-amber-500" },
    paid: { label: "Paid", bgClass: "bg-emerald-500/10", textClass: "text-emerald-600 dark:text-emerald-400", barClass: "bg-emerald-500" },
    unpaid: { label: "Unpaid", bgClass: "bg-rose-500/10", textClass: "text-rose-600 dark:text-rose-400", barClass: "bg-rose-500" },
};

type SalesStatus = keyof typeof STATUS_CONFIG;

interface SalesItem {
    id: string;
    project_name: string;
    company_name: string;
    pic_name: string | null;
    pic_position: string | null;
    pic_contact: string | null;
    contract_value: number;
    contract_start: string | null;
    contract_end: string | null;
    status: SalesStatus;
    sales_person: string | null;
    jira_link: string | null;
    drive_link: string | null;
    start_date: string | null;
    end_date: string | null;
    progress: number;
    notes: string | null;
    created_at: string;
    created_by: string;
    sales_person_name?: string;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

export default function SalesPage() {
    const supabase = createClient();
    const { profile, canAccessBisdev, isLoading: authLoading } = useAuth();

    const [salesData, setSalesData] = useState<SalesItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"board" | "list">("board");
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<SalesItem | null>(null);
    const [detailItem, setDetailItem] = useState<SalesItem | null>(null);
    const [draggedItem, setDraggedItem] = useState<SalesItem | null>(null);
    const [dragOverStatus, setDragOverStatus] = useState<SalesStatus | null>(null);

    // Check if user has full access (can delete)
    const hasFullAccess = useMemo(() => {
        if (!profile) return false;
        return profile.job_type === 'bisdev' || profile.role === 'ceo' || profile.role === 'super_admin';
    }, [profile]);

    // Fetch sales data
    const fetchSalesData = async () => {
        try {
            const { data, error } = await supabase
                .from('bisdev_sales')
                .select(`
                    *,
                    sales_person_profile:profiles!sales_person(full_name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formattedData = data?.map((item: any) => ({
                ...item,
                sales_person_name: item.sales_person_profile?.full_name || null,
            })) || [];

            setSalesData(formattedData);
        } catch (error) {
            console.error('Error fetching sales data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (canAccessBisdev) {
            fetchSalesData();
        }
    }, [canAccessBisdev]);

    // Handle status change (for both quick update and drag-drop)
    const handleStatusChange = async (id: string, newStatus: SalesStatus) => {
        try {
            const { error } = await supabase
                .from('bisdev_sales')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;

            setSalesData(prev => prev.map(item =>
                item.id === id ? { ...item, status: newStatus } : item
            ));
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    // Drag and Drop handlers
    const handleDragStart = (e: React.DragEvent, item: SalesItem) => {
        setDraggedItem(item);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.id);
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
        setDragOverStatus(null);
    };

    const handleDragOver = (e: React.DragEvent, status: SalesStatus) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverStatus(status);
    };

    const handleDragLeave = () => {
        setDragOverStatus(null);
    };

    const handleDrop = async (e: React.DragEvent, newStatus: SalesStatus) => {
        e.preventDefault();
        setDragOverStatus(null);

        if (draggedItem && draggedItem.status !== newStatus) {
            await handleStatusChange(draggedItem.id, newStatus);
        }
        setDraggedItem(null);
    };

    // Handle delete
    const handleDelete = async (id: string) => {
        if (!confirm('Yakin ingin menghapus data ini?')) return;

        try {
            const { error } = await supabase
                .from('bisdev_sales')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setSalesData(prev => prev.filter(item => item.id !== id));
        } catch (error) {
            console.error('Error deleting:', error);
        }
    };

    // Handle form submit
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const payload = {
            project_name: formData.get('project_name') as string,
            company_name: formData.get('company_name') as string,
            pic_name: formData.get('pic_name') as string || null,
            pic_position: formData.get('pic_position') as string || null,
            pic_contact: formData.get('pic_contact') as string || null,
            contract_value: parseFloat(formData.get('contract_value') as string) || 0,
            contract_start: formData.get('contract_start') as string || null,
            contract_end: formData.get('contract_end') as string || null,
            status: formData.get('status') as SalesStatus,
            jira_link: formData.get('jira_link') as string || null,
            drive_link: formData.get('drive_link') as string || null,
            start_date: formData.get('start_date') as string || null,
            end_date: formData.get('end_date') as string || null,
            progress: parseInt(formData.get('progress') as string) || 0,
            notes: formData.get('notes') as string || null,
            created_by: profile?.id,
            updated_at: new Date().toISOString(),
        };

        try {
            if (editingItem) {
                const { error } = await supabase
                    .from('bisdev_sales')
                    .update(payload)
                    .eq('id', editingItem.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('bisdev_sales')
                    .insert([payload]);
                if (error) throw error;
            }

            setShowForm(false);
            setEditingItem(null);
            fetchSalesData();
        } catch (error) {
            console.error('Error saving:', error);
            alert('Gagal menyimpan data');
        }
    };

    // Group by status for board view
    const groupedByStatus = useMemo(() => {
        const grouped: Record<SalesStatus, SalesItem[]> = {
            running: [],
            partial: [],
            paid: [],
            unpaid: [],
        };
        salesData.forEach(item => {
            if (grouped[item.status]) {
                grouped[item.status].push(item);
            }
        });
        return grouped;
    }, [salesData]);

    if (authLoading || isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e8c559]"></div>
            </div>
        );
    }

    if (!canAccessBisdev) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="text-6xl mb-4">🔒</div>
                <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Access Denied</h2>
                <p className="text-[var(--text-secondary)]">Anda tidak memiliki akses ke halaman ini.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-[var(--text-secondary)]">
                            <Link href="/dashboard" className="hover:text-[var(--text-primary)] transition-colors">Dashboard</Link>
                            <ChevronRight className="h-4 w-4" />
                            <Link href="/dashboard/bisdev" className="hover:text-[var(--text-primary)] transition-colors">Bisdev</Link>
                            <ChevronRight className="h-4 w-4" />
                            <span className="text-[var(--text-primary)]">Sales</span>
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Sales Pipeline</h1>
                        <p className="text-sm text-[var(--text-secondary)]">Track and manage sales contracts</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard/bisdev/sales/timeline"
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)] transition-all"
                    >
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm font-medium">Timeline</span>
                    </Link>

                    <div className="flex rounded-lg bg-[var(--glass-bg)] p-1 border border-[var(--glass-border)]">
                        <button
                            onClick={() => setViewMode("board")}
                            className={`p-2 rounded-md transition-all ${viewMode === "board" ? "bg-[#e8c559] text-[#171611]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`p-2 rounded-md transition-all ${viewMode === "list" ? "bg-[#e8c559] text-[#171611]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
                        >
                            <List className="h-4 w-4" />
                        </button>
                    </div>

                    <button
                        onClick={() => { setEditingItem(null); setShowForm(true); }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#e8c559] to-[#d4b44a] text-[#171611] font-semibold hover:shadow-lg hover:shadow-[#e8c559]/20 transition-all"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Tambah</span>
                    </button>
                </div>
            </div>

            {/* Drag hint */}
            {viewMode === "board" && (
                <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2">
                        <GripVertical className="h-4 w-4" />
                        Tip: Drag kartu untuk mengubah status dengan cepat
                    </p>
                </div>
            )}

            {/* Board View */}
            {viewMode === "board" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
                    {(Object.keys(STATUS_CONFIG) as SalesStatus[]).map((status) => (
                        <div
                            key={status}
                            className="flex flex-col"
                            onDragOver={(e) => handleDragOver(e, status)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, status)}
                        >
                            {/* Column Header */}
                            <div className={`flex items-center gap-2 p-3 rounded-t-xl ${STATUS_CONFIG[status].bgClass} border-b-2 ${STATUS_CONFIG[status].barClass.replace('bg-', 'border-')}`}>
                                <span className={`text-sm font-bold ${STATUS_CONFIG[status].textClass}`}>
                                    {STATUS_CONFIG[status].label}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CONFIG[status].bgClass} ${STATUS_CONFIG[status].textClass}`}>
                                    {groupedByStatus[status].length}
                                </span>
                            </div>

                            {/* Drop Zone */}
                            <div className={`flex-1 space-y-3 p-3 rounded-b-xl min-h-[200px] transition-all ${dragOverStatus === status
                                    ? 'bg-blue-500/20 border-2 border-dashed border-blue-500'
                                    : 'bg-black/5 dark:bg-white/5'
                                }`}>
                                {groupedByStatus[status].map((item) => (
                                    <div
                                        key={item.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, item)}
                                        onDragEnd={handleDragEnd}
                                        className={`p-4 rounded-xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] shadow-sm hover:shadow-md transition-all group cursor-grab active:cursor-grabbing ${draggedItem?.id === item.id ? 'opacity-50 scale-95' : ''
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <h4 className="font-bold text-[var(--text-primary)] text-sm line-clamp-2">{item.project_name}</h4>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {/* Eye icon for detail */}
                                                <button
                                                    onClick={() => setDetailItem(item)}
                                                    className="p-1 rounded hover:bg-blue-500/10"
                                                    title="Lihat Detail"
                                                >
                                                    <Eye className="h-3 w-3 text-blue-500" />
                                                </button>
                                                <button
                                                    onClick={() => { setEditingItem(item); setShowForm(true); }}
                                                    className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
                                                >
                                                    <Edit3 className="h-3 w-3 text-[var(--text-secondary)]" />
                                                </button>
                                                {hasFullAccess && (
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="p-1 rounded hover:bg-rose-500/10"
                                                    >
                                                        <Trash2 className="h-3 w-3 text-rose-500" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-xs text-[var(--text-secondary)] mb-1">{item.company_name}</p>
                                        <p className="text-sm font-semibold text-[#e8c559] mb-3">{formatCurrency(item.contract_value)}</p>

                                        {/* Progress Bar */}
                                        {item.progress > 0 && (
                                            <div className="mb-3">
                                                <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
                                                    <span>Progress</span>
                                                    <span>{item.progress}%</span>
                                                </div>
                                                <div className="h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                                                    <div className={`h-full ${STATUS_CONFIG[status].barClass}`} style={{ width: `${item.progress}%` }}></div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Links */}
                                        <div className="flex items-center gap-2">
                                            {item.jira_link && (
                                                <a href={item.jira_link} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors" title="Open Jira">
                                                    <JiraIcon />
                                                </a>
                                            )}
                                            {item.drive_link && (
                                                <a href={item.drive_link} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors" title="Open Drive">
                                                    <DriveIcon />
                                                </a>
                                            )}
                                            {item.contract_end && (
                                                <span className="text-xs text-[var(--text-muted)] flex items-center gap-1 ml-auto">
                                                    <Clock className="h-3 w-3" />
                                                    {new Date(item.contract_end).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* List View */}
            {viewMode === "list" && (
                <div className="rounded-2xl border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[var(--glass-border)] bg-black/5 dark:bg-white/5">
                                    <th className="text-left p-4 text-xs font-bold text-[var(--text-muted)] uppercase">Project</th>
                                    <th className="text-left p-4 text-xs font-bold text-[var(--text-muted)] uppercase">Company</th>
                                    <th className="text-right p-4 text-xs font-bold text-[var(--text-muted)] uppercase">Value</th>
                                    <th className="text-center p-4 text-xs font-bold text-[var(--text-muted)] uppercase">Status</th>
                                    <th className="text-center p-4 text-xs font-bold text-[var(--text-muted)] uppercase">Links</th>
                                    <th className="text-center p-4 text-xs font-bold text-[var(--text-muted)] uppercase">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--glass-border)]">
                                {salesData.map((item) => (
                                    <tr key={item.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                        <td className="p-4 text-sm text-[var(--text-primary)] font-medium">{item.project_name}</td>
                                        <td className="p-4 text-sm text-[var(--text-secondary)]">{item.company_name}</td>
                                        <td className="p-4 text-sm text-[#e8c559] font-semibold text-right">{formatCurrency(item.contract_value)}</td>
                                        <td className="p-4">
                                            <div className="flex justify-center">
                                                <select
                                                    value={item.status}
                                                    onChange={(e) => handleStatusChange(item.id, e.target.value as SalesStatus)}
                                                    className={`text-xs font-bold px-3 py-1.5 rounded-full border-0 cursor-pointer ${STATUS_CONFIG[item.status].bgClass} ${STATUS_CONFIG[item.status].textClass}`}
                                                >
                                                    {(Object.keys(STATUS_CONFIG) as SalesStatus[]).map((s) => (
                                                        <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-center gap-2">
                                                {item.jira_link && (
                                                    <a href={item.jira_link} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">
                                                        <JiraIcon />
                                                    </a>
                                                )}
                                                {item.drive_link && (
                                                    <a href={item.drive_link} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20">
                                                        <DriveIcon />
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => setDetailItem(item)} className="p-2 rounded-lg hover:bg-blue-500/10" title="Lihat Detail">
                                                    <Eye className="h-4 w-4 text-blue-500" />
                                                </button>
                                                <button onClick={() => { setEditingItem(item); setShowForm(true); }} className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10">
                                                    <Edit3 className="h-4 w-4 text-[var(--text-secondary)]" />
                                                </button>
                                                {hasFullAccess && (
                                                    <button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg hover:bg-rose-500/10">
                                                        <Trash2 className="h-4 w-4 text-rose-500" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {detailItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setDetailItem(null)}>
                    <div className="w-full max-w-2xl bg-white dark:bg-[#1c2120] rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-[var(--glass-border)]">
                            <div>
                                <h2 className="text-xl font-bold text-[var(--text-primary)]">{detailItem.project_name}</h2>
                                <p className="text-sm text-[var(--text-secondary)]">{detailItem.company_name}</p>
                            </div>
                            <button onClick={() => setDetailItem(null)} className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10">
                                <X className="h-5 w-5 text-[var(--text-secondary)]" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Status & Value */}
                            <div className="flex items-center gap-4">
                                <span className={`px-4 py-2 rounded-full text-sm font-bold ${STATUS_CONFIG[detailItem.status].bgClass} ${STATUS_CONFIG[detailItem.status].textClass}`}>
                                    {STATUS_CONFIG[detailItem.status].label}
                                </span>
                                <span className="text-2xl font-bold text-[#e8c559]">{formatCurrency(detailItem.contract_value)}</span>
                            </div>

                            {/* PIC Info */}
                            {detailItem.pic_name && (
                                <div className="p-4 rounded-xl bg-black/5 dark:bg-white/5">
                                    <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2">PIC Information</h4>
                                    <p className="font-bold text-[var(--text-primary)]">{detailItem.pic_name}</p>
                                    {detailItem.pic_position && <p className="text-sm text-[var(--text-secondary)]">{detailItem.pic_position}</p>}
                                    {detailItem.pic_contact && <p className="text-sm text-[var(--text-muted)]">{detailItem.pic_contact}</p>}
                                </div>
                            )}

                            {/* Contract Period */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-black/5 dark:bg-white/5">
                                    <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Contract Start</h4>
                                    <p className="font-medium text-[var(--text-primary)]">
                                        {detailItem.contract_start ? new Date(detailItem.contract_start).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                                    </p>
                                </div>
                                <div className="p-4 rounded-xl bg-black/5 dark:bg-white/5">
                                    <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Contract End</h4>
                                    <p className="font-medium text-[var(--text-primary)]">
                                        {detailItem.contract_end ? new Date(detailItem.contract_end).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                                    </p>
                                </div>
                            </div>

                            {/* Progress */}
                            <div>
                                <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Progress</h4>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 h-3 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                                        <div className={`h-full ${STATUS_CONFIG[detailItem.status].barClass}`} style={{ width: `${detailItem.progress}%` }}></div>
                                    </div>
                                    <span className="text-lg font-bold text-[var(--text-primary)]">{detailItem.progress}%</span>
                                </div>
                            </div>

                            {/* Notes */}
                            {detailItem.notes && (
                                <div>
                                    <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Notes</h4>
                                    <p className="text-sm text-[var(--text-secondary)]">{detailItem.notes}</p>
                                </div>
                            )}

                            {/* Links */}
                            <div className="flex items-center gap-3">
                                {detailItem.jira_link && (
                                    <a href={detailItem.jira_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors">
                                        <JiraIcon /> Open Jira
                                    </a>
                                )}
                                {detailItem.drive_link && (
                                    <a href={detailItem.drive_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors">
                                        <DriveIcon /> Open Drive
                                    </a>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 p-6 border-t border-[var(--glass-border)]">
                            <button
                                onClick={() => { setDetailItem(null); setEditingItem(detailItem); setShowForm(true); }}
                                className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#e8c559] to-[#d4b44a] text-[#171611] font-semibold"
                            >
                                Edit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#1c2120] rounded-2xl shadow-2xl">
                        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-[var(--glass-border)] bg-white dark:bg-[#1c2120]">
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">
                                {editingItem ? 'Edit Sales' : 'Tambah Sales'}
                            </h2>
                            <button onClick={() => { setShowForm(false); setEditingItem(null); }} className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10">
                                <X className="h-5 w-5 text-[var(--text-secondary)]" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Nama Project *</label>
                                <input type="text" name="project_name" defaultValue={editingItem?.project_name || ''} required className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Nama Perusahaan *</label>
                                <input type="text" name="company_name" defaultValue={editingItem?.company_name || ''} required className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]" />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">PIC Name</label>
                                    <input type="text" name="pic_name" defaultValue={editingItem?.pic_name || ''} className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">PIC Position</label>
                                    <input type="text" name="pic_position" defaultValue={editingItem?.pic_position || ''} className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">PIC Contact</label>
                                    <input type="text" name="pic_contact" defaultValue={editingItem?.pic_contact || ''} className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Nilai Kontrak</label>
                                    <input type="number" name="contract_value" defaultValue={editingItem?.contract_value || 0} className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Status</label>
                                    <select name="status" defaultValue={editingItem?.status || 'running'} className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]">
                                        {(Object.keys(STATUS_CONFIG) as SalesStatus[]).map((s) => (
                                            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Contract Start</label>
                                    <input type="date" name="contract_start" defaultValue={editingItem?.contract_start || ''} className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Contract End</label>
                                    <input type="date" name="contract_end" defaultValue={editingItem?.contract_end || ''} className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]" />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Start Date (Timeline)</label>
                                    <input type="date" name="start_date" defaultValue={editingItem?.start_date || ''} className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">End Date (Timeline)</label>
                                    <input type="date" name="end_date" defaultValue={editingItem?.end_date || ''} className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Progress (%)</label>
                                    <input type="number" name="progress" min="0" max="100" defaultValue={editingItem?.progress || 0} className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Jira Link</label>
                                    <input type="url" name="jira_link" defaultValue={editingItem?.jira_link || ''} placeholder="https://..." className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Drive Link</label>
                                    <input type="url" name="drive_link" defaultValue={editingItem?.drive_link || ''} placeholder="https://..." className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Notes</label>
                                <textarea name="notes" rows={3} defaultValue={editingItem?.notes || ''} className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559] resize-none" />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => { setShowForm(false); setEditingItem(null); }} className="px-6 py-2 rounded-lg border border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                    Batal
                                </button>
                                <button type="submit" className="px-6 py-2 rounded-lg bg-gradient-to-r from-[#e8c559] to-[#d4b44a] text-[#171611] font-semibold hover:shadow-lg hover:shadow-[#e8c559]/20 transition-all">
                                    {editingItem ? 'Update' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
