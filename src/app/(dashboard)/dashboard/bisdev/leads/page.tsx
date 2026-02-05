"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
    Users,
    ChevronRight,
    LayoutGrid,
    List,
    Plus,
    X,
    Calendar,
    Trash2,
    Edit3,
    Eye,
    GripVertical,
} from "lucide-react";

// Jira and Drive icons
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

const STATUS_CONFIG = {
    cold: { label: "Cold", bgClass: "bg-slate-500/10", textClass: "text-slate-600 dark:text-slate-400", barClass: "bg-slate-500" },
    warm: { label: "Warm", bgClass: "bg-amber-500/10", textClass: "text-amber-600 dark:text-amber-400", barClass: "bg-amber-500" },
    hot: { label: "Hot", bgClass: "bg-rose-500/10", textClass: "text-rose-600 dark:text-rose-400", barClass: "bg-rose-500", pulse: true },
    qualified: { label: "Qualified", bgClass: "bg-emerald-500/10", textClass: "text-emerald-600 dark:text-emerald-400", barClass: "bg-emerald-500" },
};

type LeadStatus = keyof typeof STATUS_CONFIG;

interface LeadItem {
    id: string;
    company_name: string;
    industry: string | null;
    data_source: string | null;
    key_person_name: string | null;
    key_person_position: string | null;
    key_person_contact: string | null;
    status: LeadStatus;
    approach_plan: string | null;
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

export default function LeadsPage() {
    const supabase = createClient();
    const { profile, canAccessBisdev, isLoading: authLoading } = useAuth();

    const [leadsData, setLeadsData] = useState<LeadItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"board" | "list">("board");
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<LeadItem | null>(null);
    const [detailItem, setDetailItem] = useState<LeadItem | null>(null);
    const [draggedItem, setDraggedItem] = useState<LeadItem | null>(null);
    const [dragOverStatus, setDragOverStatus] = useState<LeadStatus | null>(null);

    const hasFullAccess = useMemo(() => {
        if (!profile) return false;
        return profile.job_type === 'bisdev' || profile.role === 'ceo' || profile.role === 'super_admin';
    }, [profile]);

    const fetchLeadsData = async () => {
        try {
            const { data, error } = await supabase
                .from('bisdev_leads')
                .select(`*, sales_person_profile:profiles!sales_person(full_name)`)
                .order('created_at', { ascending: false });

            if (error) throw error;
            const formattedData = data?.map((item: any) => ({
                ...item,
                sales_person_name: item.sales_person_profile?.full_name || null,
            })) || [];
            setLeadsData(formattedData);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (canAccessBisdev) fetchLeadsData();
    }, [canAccessBisdev]);

    const handleStatusChange = async (id: string, newStatus: LeadStatus) => {
        try {
            const { error } = await supabase
                .from('bisdev_leads')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
            setLeadsData(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleDragStart = (e: React.DragEvent, item: LeadItem) => {
        setDraggedItem(item);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
        setDragOverStatus(null);
    };

    const handleDragOver = (e: React.DragEvent, status: LeadStatus) => {
        e.preventDefault();
        setDragOverStatus(status);
    };

    const handleDrop = async (e: React.DragEvent, newStatus: LeadStatus) => {
        e.preventDefault();
        setDragOverStatus(null);
        if (draggedItem && draggedItem.status !== newStatus) {
            await handleStatusChange(draggedItem.id, newStatus);
        }
        setDraggedItem(null);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Yakin ingin menghapus?')) return;
        try {
            const { error } = await supabase.from('bisdev_leads').delete().eq('id', id);
            if (error) throw error;
            setLeadsData(prev => prev.filter(item => item.id !== id));
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const payload = {
            company_name: formData.get('company_name') as string,
            industry: formData.get('industry') as string || null,
            data_source: formData.get('data_source') as string || null,
            key_person_name: formData.get('key_person_name') as string || null,
            key_person_position: formData.get('key_person_position') as string || null,
            key_person_contact: formData.get('key_person_contact') as string || null,
            status: formData.get('status') as LeadStatus,
            approach_plan: formData.get('approach_plan') as string || null,
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
                await supabase.from('bisdev_leads').update(payload).eq('id', editingItem.id);
            } else {
                await supabase.from('bisdev_leads').insert([payload]);
            }
            setShowForm(false);
            setEditingItem(null);
            fetchLeadsData();
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const groupedByStatus = useMemo(() => {
        const grouped: Record<LeadStatus, LeadItem[]> = { cold: [], warm: [], hot: [], qualified: [] };
        leadsData.forEach(item => { if (grouped[item.status]) grouped[item.status].push(item); });
        return grouped;
    }, [leadsData]);

    if (authLoading || isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e8c559]"></div></div>;
    if (!canAccessBisdev) return <div className="flex flex-col items-center justify-center h-64"><div className="text-6xl mb-4">🔒</div><h2 className="text-2xl font-bold text-[var(--text-primary)]">Access Denied</h2></div>;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-[var(--text-secondary)]">
                            <Link href="/dashboard" className="hover:text-[var(--text-primary)]">Dashboard</Link>
                            <ChevronRight className="h-4 w-4" />
                            <Link href="/dashboard/bisdev" className="hover:text-[var(--text-primary)]">Bisdev</Link>
                            <ChevronRight className="h-4 w-4" />
                            <span className="text-[var(--text-primary)]">Leads</span>
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Lead Management</h1>
                        <p className="text-sm text-[var(--text-secondary)]">Track and qualify potential clients</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Link href="/dashboard/bisdev/leads/timeline" className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                        <Calendar className="h-4 w-4" /><span className="text-sm font-medium">Timeline</span>
                    </Link>
                    <div className="flex rounded-lg bg-[var(--glass-bg)] p-1 border border-[var(--glass-border)]">
                        <button onClick={() => setViewMode("board")} className={`p-2 rounded-md ${viewMode === "board" ? "bg-[#e8c559] text-[#171611]" : "text-[var(--text-secondary)]"}`}><LayoutGrid className="h-4 w-4" /></button>
                        <button onClick={() => setViewMode("list")} className={`p-2 rounded-md ${viewMode === "list" ? "bg-[#e8c559] text-[#171611]" : "text-[var(--text-secondary)]"}`}><List className="h-4 w-4" /></button>
                    </div>
                    <button onClick={() => { setEditingItem(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#e8c559] to-[#d4b44a] text-[#171611] font-semibold">
                        <Plus className="h-4 w-4" /><span>Tambah</span>
                    </button>
                </div>
            </div>

            {viewMode === "board" && (
                <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2">
                        <GripVertical className="h-4 w-4" />Tip: Drag kartu untuk mengubah status dengan cepat
                    </p>
                </div>
            )}

            {/* Board View */}
            {viewMode === "board" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
                    {(Object.keys(STATUS_CONFIG) as LeadStatus[]).map((status) => (
                        <div key={status} className="flex flex-col"
                            onDragOver={(e) => handleDragOver(e, status)}
                            onDragLeave={() => setDragOverStatus(null)}
                            onDrop={(e) => handleDrop(e, status)}>
                            <div className={`flex items-center gap-2 p-3 rounded-t-xl ${STATUS_CONFIG[status].bgClass} border-b-2 ${STATUS_CONFIG[status].barClass.replace('bg-', 'border-')}`}>
                                <span className={`text-sm font-bold ${STATUS_CONFIG[status].textClass}`}>{STATUS_CONFIG[status].label}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CONFIG[status].bgClass} ${STATUS_CONFIG[status].textClass}`}>{groupedByStatus[status].length}</span>
                            </div>
                            <div className={`flex-1 space-y-3 p-3 rounded-b-xl min-h-[200px] transition-all ${dragOverStatus === status ? 'bg-blue-500/20 border-2 border-dashed border-blue-500' : 'bg-black/5 dark:bg-white/5'}`}>
                                {groupedByStatus[status].map((item) => (
                                    <div key={item.id} draggable onDragStart={(e) => handleDragStart(e, item)} onDragEnd={handleDragEnd}
                                        className={`p-4 rounded-xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] shadow-sm hover:shadow-md transition-all group cursor-grab ${draggedItem?.id === item.id ? 'opacity-50 scale-95' : ''}`}>
                                        <div className="flex items-start justify-between mb-2">
                                            <h4 className="font-bold text-[var(--text-primary)] text-sm">{item.company_name}</h4>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setDetailItem(item)} className="p-1 rounded hover:bg-blue-500/10" title="Lihat Detail"><Eye className="h-3 w-3 text-blue-500" /></button>
                                                <button onClick={() => { setEditingItem(item); setShowForm(true); }} className="p-1 rounded hover:bg-black/10"><Edit3 className="h-3 w-3 text-[var(--text-secondary)]" /></button>
                                                {hasFullAccess && <button onClick={() => handleDelete(item.id)} className="p-1 rounded hover:bg-rose-500/10"><Trash2 className="h-3 w-3 text-rose-500" /></button>}
                                            </div>
                                        </div>
                                        {item.industry && <p className="text-xs text-[var(--text-secondary)] mb-1">{item.industry}</p>}
                                        {item.key_person_name && <p className="text-xs text-[var(--text-muted)]">PIC: {item.key_person_name}</p>}
                                        {item.progress > 0 && (
                                            <div className="mt-3">
                                                <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1"><span>Progress</span><span>{item.progress}%</span></div>
                                                <div className="h-1.5 bg-black/10 rounded-full overflow-hidden"><div className={`h-full ${STATUS_CONFIG[status].barClass}`} style={{ width: `${item.progress}%` }}></div></div>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 mt-3">
                                            {item.jira_link && <a href={item.jira_link} target="_blank" className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20"><JiraIcon /></a>}
                                            {item.drive_link && <a href={item.drive_link} target="_blank" className="p-1.5 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20"><DriveIcon /></a>}
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
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[var(--glass-border)] bg-black/5 dark:bg-white/5">
                                <th className="text-left p-4 text-xs font-bold text-[var(--text-muted)] uppercase">Company</th>
                                <th className="text-left p-4 text-xs font-bold text-[var(--text-muted)] uppercase">Industry</th>
                                <th className="text-left p-4 text-xs font-bold text-[var(--text-muted)] uppercase">Key Person</th>
                                <th className="text-center p-4 text-xs font-bold text-[var(--text-muted)] uppercase">Status</th>
                                <th className="text-center p-4 text-xs font-bold text-[var(--text-muted)] uppercase">Links</th>
                                <th className="text-center p-4 text-xs font-bold text-[var(--text-muted)] uppercase">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--glass-border)]">
                            {leadsData.map((item) => (
                                <tr key={item.id} className="hover:bg-black/5 dark:hover:bg-white/5">
                                    <td className="p-4 text-sm text-[var(--text-primary)] font-medium">{item.company_name}</td>
                                    <td className="p-4 text-sm text-[var(--text-secondary)]">{item.industry || '-'}</td>
                                    <td className="p-4 text-sm text-[var(--text-secondary)]">{item.key_person_name || '-'}</td>
                                    <td className="p-4">
                                        <div className="flex justify-center">
                                            <select value={item.status} onChange={(e) => handleStatusChange(item.id, e.target.value as LeadStatus)}
                                                className={`text-xs font-bold px-3 py-1.5 rounded-full border-0 cursor-pointer ${STATUS_CONFIG[item.status].bgClass} ${STATUS_CONFIG[item.status].textClass}`}>
                                                {(Object.keys(STATUS_CONFIG) as LeadStatus[]).map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                                            </select>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-center gap-2">
                                            {item.jira_link && <a href={item.jira_link} target="_blank" className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600"><JiraIcon /></a>}
                                            {item.drive_link && <a href={item.drive_link} target="_blank" className="p-1.5 rounded-lg bg-green-500/10 text-green-600"><DriveIcon /></a>}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => setDetailItem(item)} className="p-2 rounded-lg hover:bg-blue-500/10"><Eye className="h-4 w-4 text-blue-500" /></button>
                                            <button onClick={() => { setEditingItem(item); setShowForm(true); }} className="p-2 rounded-lg hover:bg-black/10"><Edit3 className="h-4 w-4 text-[var(--text-secondary)]" /></button>
                                            {hasFullAccess && <button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg hover:bg-rose-500/10"><Trash2 className="h-4 w-4 text-rose-500" /></button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Detail Modal */}
            {detailItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setDetailItem(null)}>
                    <div className="w-full max-w-2xl bg-white dark:bg-[#1c2120] rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-[var(--glass-border)]">
                            <div>
                                <h2 className="text-xl font-bold text-[var(--text-primary)]">{detailItem.company_name}</h2>
                                <p className="text-sm text-[var(--text-secondary)]">{detailItem.industry}</p>
                            </div>
                            <button onClick={() => setDetailItem(null)} className="p-2 rounded-lg hover:bg-black/10"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex items-center gap-4">
                                <span className={`px-4 py-2 rounded-full text-sm font-bold ${STATUS_CONFIG[detailItem.status].bgClass} ${STATUS_CONFIG[detailItem.status].textClass}`}>{STATUS_CONFIG[detailItem.status].label}</span>
                            </div>
                            {detailItem.key_person_name && (
                                <div className="p-4 rounded-xl bg-black/5 dark:bg-white/5">
                                    <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Key Person</h4>
                                    <p className="font-bold text-[var(--text-primary)]">{detailItem.key_person_name}</p>
                                    {detailItem.key_person_position && <p className="text-sm text-[var(--text-secondary)]">{detailItem.key_person_position}</p>}
                                    {detailItem.key_person_contact && <p className="text-sm text-[var(--text-muted)]">{detailItem.key_person_contact}</p>}
                                </div>
                            )}
                            {detailItem.approach_plan && (
                                <div>
                                    <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Approach Plan</h4>
                                    <p className="text-sm text-[var(--text-secondary)]">{detailItem.approach_plan}</p>
                                </div>
                            )}
                            <div>
                                <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Progress</h4>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 h-3 bg-black/10 rounded-full overflow-hidden"><div className={`h-full ${STATUS_CONFIG[detailItem.status].barClass}`} style={{ width: `${detailItem.progress}%` }}></div></div>
                                    <span className="text-lg font-bold">{detailItem.progress}%</span>
                                </div>
                            </div>
                            {detailItem.notes && <div><h4 className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Notes</h4><p className="text-sm text-[var(--text-secondary)]">{detailItem.notes}</p></div>}
                            <div className="flex items-center gap-3">
                                {detailItem.jira_link && <a href={detailItem.jira_link} target="_blank" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 text-blue-600"><JiraIcon /> Jira</a>}
                                {detailItem.drive_link && <a href={detailItem.drive_link} target="_blank" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 text-green-600"><DriveIcon /> Drive</a>}
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-6 border-t border-[var(--glass-border)]">
                            <button onClick={() => { setDetailItem(null); setEditingItem(detailItem); setShowForm(true); }} className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#e8c559] to-[#d4b44a] text-[#171611] font-semibold">Edit</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#1c2120] rounded-2xl shadow-2xl">
                        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-[var(--glass-border)] bg-white dark:bg-[#1c2120]">
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">{editingItem ? 'Edit Lead' : 'Tambah Lead'}</h2>
                            <button onClick={() => { setShowForm(false); setEditingItem(null); }} className="p-2 rounded-lg hover:bg-black/10"><X className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Company Name *</label>
                                <input type="text" name="company_name" defaultValue={editingItem?.company_name || ''} required className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)]" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Industry</label>
                                    <input type="text" name="industry" defaultValue={editingItem?.industry || ''} className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)]" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Data Source</label>
                                    <input type="text" name="data_source" defaultValue={editingItem?.data_source || ''} className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)]" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div><label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Key Person Name</label><input type="text" name="key_person_name" defaultValue={editingItem?.key_person_name || ''} className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)]" /></div>
                                <div><label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Position</label><input type="text" name="key_person_position" defaultValue={editingItem?.key_person_position || ''} className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)]" /></div>
                                <div><label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Contact</label><input type="text" name="key_person_contact" defaultValue={editingItem?.key_person_contact || ''} className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)]" /></div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Status</label>
                                <select name="status" defaultValue={editingItem?.status || 'cold'} className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)]">
                                    {(Object.keys(STATUS_CONFIG) as LeadStatus[]).map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Approach Plan</label>
                                <textarea name="approach_plan" rows={3} defaultValue={editingItem?.approach_plan || ''} className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)] resize-none" />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div><label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Start Date</label><input type="date" name="start_date" defaultValue={editingItem?.start_date || ''} className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)]" /></div>
                                <div><label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">End Date</label><input type="date" name="end_date" defaultValue={editingItem?.end_date || ''} className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)]" /></div>
                                <div><label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Progress (%)</label><input type="number" name="progress" min="0" max="100" defaultValue={editingItem?.progress || 0} className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)]" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Jira Link</label><input type="url" name="jira_link" defaultValue={editingItem?.jira_link || ''} className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)]" /></div>
                                <div><label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Drive Link</label><input type="url" name="drive_link" defaultValue={editingItem?.drive_link || ''} className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)]" /></div>
                            </div>
                            <div><label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Notes</label><textarea name="notes" rows={2} defaultValue={editingItem?.notes || ''} className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)] resize-none" /></div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => { setShowForm(false); setEditingItem(null); }} className="px-6 py-2 rounded-lg border border-[var(--glass-border)] text-[var(--text-secondary)]">Batal</button>
                                <button type="submit" className="px-6 py-2 rounded-lg bg-gradient-to-r from-[#e8c559] to-[#d4b44a] text-[#171611] font-semibold">{editingItem ? 'Update' : 'Simpan'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
