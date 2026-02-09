"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
    FileText,
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

// Status configurations for Proposals
const STATUS_CONFIG = {
    draft: { label: "Draft", bgClass: "bg-gray-500/10", textClass: "text-gray-600 dark:text-gray-400", barClass: "bg-gray-500" },
    sent: { label: "Sent", bgClass: "bg-blue-500/10", textClass: "text-blue-600 dark:text-blue-400", barClass: "bg-blue-500" },
    negotiation: { label: "Negotiation", bgClass: "bg-amber-500/10", textClass: "text-amber-600 dark:text-amber-400", barClass: "bg-amber-500" },
    approved: { label: "Approved", bgClass: "bg-emerald-500/10", textClass: "text-emerald-600 dark:text-emerald-400", barClass: "bg-emerald-500" },
    rejected: { label: "Rejected", bgClass: "bg-rose-500/10", textClass: "text-rose-600 dark:text-rose-400", barClass: "bg-rose-500" },
};

type ProposalStatus = keyof typeof STATUS_CONFIG;

interface ProposalItem {
    id: string;
    proposal_number: string | null;
    sent_date: string | null;
    company_name: string;
    proposal_title: string;
    service_type: string | null;
    offer_value: number;
    status: ProposalStatus;
    last_follow_up: string | null;
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
    client_id?: string | null;
}

interface CRMClient {
    id: string;
    company_name: string;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

export default function ProposalsPage() {
    const supabase = createClient();
    const { profile, canAccessBisdev, isLoading: authLoading } = useAuth();

    const [proposalsData, setProposalsData] = useState<ProposalItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"board" | "list">("board");
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<ProposalItem | null>(null);
    const [detailItem, setDetailItem] = useState<ProposalItem | null>(null);
    const [draggedItem, setDraggedItem] = useState<ProposalItem | null>(null);
    const [dragOverStatus, setDragOverStatus] = useState<ProposalStatus | null>(null);
    const [crmClients, setCrmClients] = useState<CRMClient[]>([]);
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

    // Check if user has full access (can delete)
    const hasFullAccess = useMemo(() => {
        if (!profile) return false;
        return profile.job_type === 'bisdev' || profile.role === 'ceo' || profile.role === 'super_admin';
    }, [profile]);

    // Fetch proposals data
    const fetchProposalsData = async () => {
        try {
            const { data, error } = await supabase
                .from('bisdev_proposals')
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

            setProposalsData(formattedData);
        } catch (error) {
            console.error('Error fetching proposals data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch CRM Clients for dropdown
    const fetchCrmClients = async () => {
        try {
            const { data, error } = await supabase
                .from('crm_clients')
                .select('id, company_name')
                .order('company_name');

            if (error) throw error;
            setCrmClients(data || []);
        } catch (error) {
            console.error('Error fetching CRM clients:', error);
        }
    };

    useEffect(() => {
        if (canAccessBisdev) {
            fetchProposalsData();
            fetchCrmClients();
        }
    }, [canAccessBisdev]);

    // Sync selectedClientId when editing
    useEffect(() => {
        setSelectedClientId(editingItem?.client_id || null);
    }, [editingItem]);

    // Handle status change (quick update) with journey logging
    const handleStatusChange = async (id: string, newStatus: ProposalStatus) => {
        const item = proposalsData.find(p => p.id === id);
        if (!item) return;
        const oldStatus = item.status;

        try {
            const { error } = await supabase
                .from('bisdev_proposals')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;

            // Log to crm_journey if client_id exists
            if (item.client_id && profile?.id) {
                await supabase.from('crm_journey').insert({
                    client_id: item.client_id,
                    from_stage: 'proposal',
                    to_stage: 'proposal',
                    source_table: 'bisdev_proposals',
                    source_id: id,
                    notes: `Status: ${STATUS_CONFIG[oldStatus].label} → ${STATUS_CONFIG[newStatus].label}`,
                    created_by: profile.id,
                });
            }

            setProposalsData(prev => prev.map(item =>
                item.id === id ? { ...item, status: newStatus } : item
            ));
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    // Drag and Drop handlers
    const handleDragStart = (e: React.DragEvent, item: ProposalItem) => {
        setDraggedItem(item);
        e.dataTransfer.effectAllowed = 'move';
    };
    const handleDragEnd = () => { setDraggedItem(null); setDragOverStatus(null); };
    const handleDragOver = (e: React.DragEvent, status: ProposalStatus) => { e.preventDefault(); setDragOverStatus(status); };
    const handleDrop = async (e: React.DragEvent, newStatus: ProposalStatus) => {
        e.preventDefault(); setDragOverStatus(null);
        if (draggedItem && draggedItem.status !== newStatus) await handleStatusChange(draggedItem.id, newStatus);
        setDraggedItem(null);
    };

    // Handle delete
    const handleDelete = async (id: string) => {
        if (!confirm('Yakin ingin menghapus data ini?')) return;

        try {
            const { error } = await supabase
                .from('bisdev_proposals')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setProposalsData(prev => prev.filter(item => item.id !== id));
        } catch (error) {
            console.error('Error deleting:', error);
        }
    };

    // Handle form submit
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const payload = {
            proposal_number: formData.get('proposal_number') as string || null,
            sent_date: formData.get('sent_date') as string || null,
            company_name: formData.get('company_name') as string,
            proposal_title: formData.get('proposal_title') as string,
            service_type: formData.get('service_type') as string || null,
            offer_value: parseFloat(formData.get('offer_value') as string) || 0,
            status: formData.get('status') as ProposalStatus,
            last_follow_up: formData.get('last_follow_up') as string || null,
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
                    .from('bisdev_proposals')
                    .update(payload)
                    .eq('id', editingItem.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('bisdev_proposals')
                    .insert([payload]);
                if (error) throw error;
            }

            setShowForm(false);
            setEditingItem(null);
            fetchProposalsData();
        } catch (error) {
            console.error('Error saving:', error);
            alert('Gagal menyimpan data');
        }
    };

    // Group by status for board view
    const groupedByStatus = useMemo(() => {
        const grouped: Record<ProposalStatus, ProposalItem[]> = {
            draft: [],
            sent: [],
            negotiation: [],
            approved: [],
            rejected: [],
        };
        proposalsData.forEach(item => {
            if (grouped[item.status]) {
                grouped[item.status].push(item);
            }
        });
        return grouped;
    }, [proposalsData]);

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
                    {/* Icon Box */}
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <FileText className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        {/* Breadcrumb */}
                        <div className="flex items-center gap-2 mb-1 text-sm text-[var(--text-secondary)]">
                            <Link href="/dashboard" className="hover:text-[var(--text-primary)] transition-colors">Dashboard</Link>
                            <ChevronRight className="h-4 w-4" />
                            <Link href="/dashboard/bisdev" className="hover:text-[var(--text-primary)] transition-colors">Bisdev</Link>
                            <ChevronRight className="h-4 w-4" />
                            <span className="text-[var(--text-primary)]">Proposals</span>
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Proposals</h1>
                        <p className="text-sm text-[var(--text-secondary)]">Track and manage proposals</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    {/* Timeline Button */}
                    <Link
                        href="/dashboard/bisdev/proposals/timeline"
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)] transition-all"
                    >
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm font-medium">Timeline</span>
                    </Link>

                    {/* View Toggle */}
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
                </div>
            </div>

            {/* Board View */}
            {viewMode === "board" && (
                <>
                    <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <p className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2">
                            <GripVertical className="h-4 w-4" />Tip: Drag kartu untuk mengubah status
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 flex-1">
                        {(Object.keys(STATUS_CONFIG) as ProposalStatus[]).map((status) => (
                            <div key={status} className="flex flex-col" onDragOver={(e) => handleDragOver(e, status)} onDragLeave={() => setDragOverStatus(null)} onDrop={(e) => handleDrop(e, status)}>
                                {/* Column Header */}
                                <div className={`flex items-center gap-2 p-3 rounded-t-xl ${STATUS_CONFIG[status].bgClass} border-b-2 ${STATUS_CONFIG[status].barClass.replace('bg-', 'border-')}`}>
                                    <span className={`text-sm font-bold ${STATUS_CONFIG[status].textClass}`}>
                                        {STATUS_CONFIG[status].label}
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CONFIG[status].bgClass} ${STATUS_CONFIG[status].textClass}`}>
                                        {groupedByStatus[status].length}
                                    </span>
                                </div>

                                {/* Cards */}
                                <div className={`flex-1 space-y-3 p-3 rounded-b-xl min-h-[200px] transition-all ${dragOverStatus === status ? 'bg-blue-500/20 border-2 border-dashed border-blue-500' : 'bg-black/5 dark:bg-white/5'}`}>
                                    {groupedByStatus[status].map((item) => (
                                        <div
                                            key={item.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, item)}
                                            onDragEnd={handleDragEnd}
                                            className={`p-4 rounded-xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] shadow-sm hover:shadow-md transition-all group cursor-grab active:cursor-grabbing ${draggedItem?.id === item.id ? 'opacity-50 scale-95' : ''}`}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <h4 className="font-bold text-[var(--text-primary)] text-sm line-clamp-2">{item.proposal_title}</h4>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setDetailItem(item)} className="p-1 rounded hover:bg-blue-500/10" title="Lihat Detail">
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
                                            {item.proposal_number && (
                                                <p className="text-xs text-[var(--text-muted)] mb-2"># {item.proposal_number}</p>
                                            )}
                                            <p className="text-sm font-semibold text-[#e8c559] mb-3">{formatCurrency(item.offer_value)}</p>

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
                                                {item.sent_date && (
                                                    <span className="text-xs text-[var(--text-muted)] flex items-center gap-1 ml-auto">
                                                        <Calendar className="h-3 w-3" />
                                                        {new Date(item.sent_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {viewMode === "list" && (
                <div className="rounded-2xl border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[var(--glass-border)] bg-black/5 dark:bg-white/5">
                                    <th className="text-left p-4 text-xs font-bold text-[var(--text-muted)] uppercase">No. Proposal</th>
                                    <th className="text-left p-4 text-xs font-bold text-[var(--text-muted)] uppercase">Perusahaan</th>
                                    <th className="text-left p-4 text-xs font-bold text-[var(--text-muted)] uppercase">Judul</th>
                                    <th className="text-right p-4 text-xs font-bold text-[var(--text-muted)] uppercase">Nilai</th>
                                    <th className="text-center p-4 text-xs font-bold text-[var(--text-muted)] uppercase">Sent</th>
                                    <th className="text-center p-4 text-xs font-bold text-[var(--text-muted)] uppercase">Status</th>
                                    <th className="text-center p-4 text-xs font-bold text-[var(--text-muted)] uppercase">Links</th>
                                    <th className="text-center p-4 text-xs font-bold text-[var(--text-muted)] uppercase">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--glass-border)]">
                                {proposalsData.map((item) => (
                                    <tr key={item.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                        <td className="p-4 text-sm text-[var(--text-secondary)]">{item.proposal_number || '-'}</td>
                                        <td className="p-4 text-sm text-[var(--text-primary)] font-medium">{item.company_name}</td>
                                        <td className="p-4 text-sm text-[var(--text-secondary)]">{item.proposal_title}</td>
                                        <td className="p-4 text-sm text-[var(--text-primary)] text-right font-semibold">{formatCurrency(item.offer_value)}</td>
                                        <td className="p-4 text-sm text-[var(--text-secondary)] text-center">
                                            {item.sent_date ? new Date(item.sent_date).toLocaleDateString('id-ID') : '-'}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex justify-center">
                                                <select
                                                    value={item.status}
                                                    onChange={(e) => handleStatusChange(item.id, e.target.value as ProposalStatus)}
                                                    className={`text-xs font-bold px-3 py-1.5 rounded-full border-0 cursor-pointer ${STATUS_CONFIG[item.status].bgClass} ${STATUS_CONFIG[item.status].textClass}`}
                                                >
                                                    {(Object.keys(STATUS_CONFIG) as ProposalStatus[]).map((s) => (
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
            )
            }

            {/* Detail Modal */}
            {detailItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setDetailItem(null)}>
                    <div className="w-full max-w-2xl bg-white dark:bg-[#1c2120] rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-[var(--glass-border)]">
                            <div><h2 className="text-xl font-bold text-[var(--text-primary)]">{detailItem.proposal_title}</h2><p className="text-sm text-[var(--text-secondary)]">{detailItem.company_name}</p></div>
                            <button onClick={() => setDetailItem(null)} className="p-2 rounded-lg hover:bg-black/10"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-4">
                                <span className={`px-4 py-2 rounded-full text-sm font-bold ${STATUS_CONFIG[detailItem.status].bgClass} ${STATUS_CONFIG[detailItem.status].textClass}`}>{STATUS_CONFIG[detailItem.status].label}</span>
                                <span className="text-2xl font-bold text-[#e8c559]">{formatCurrency(detailItem.offer_value)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 rounded-xl bg-black/5"><h4 className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Proposal Number</h4><p className="font-medium">{detailItem.proposal_number || '-'}</p></div>
                                <div className="p-3 rounded-xl bg-black/5"><h4 className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Service Type</h4><p className="font-medium">{detailItem.service_type || '-'}</p></div>
                            </div>
                            <div><h4 className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Progress</h4><div className="flex items-center gap-4"><div className="flex-1 h-3 bg-black/10 rounded-full overflow-hidden"><div className={`h-full ${STATUS_CONFIG[detailItem.status].barClass}`} style={{ width: `${detailItem.progress}%` }}></div></div><span className="text-lg font-bold">{detailItem.progress}%</span></div></div>
                            {detailItem.notes && <div><h4 className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Notes</h4><p className="text-sm text-[var(--text-secondary)]">{detailItem.notes}</p></div>}
                            <div className="flex gap-3">{detailItem.jira_link && <a href={detailItem.jira_link} target="_blank" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 text-blue-600"><JiraIcon /> Jira</a>}{detailItem.drive_link && <a href={detailItem.drive_link} target="_blank" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 text-green-600"><DriveIcon /> Drive</a>}</div>
                        </div>
                        <div className="flex justify-end gap-3 p-6 border-t border-[var(--glass-border)]"><button onClick={() => { setDetailItem(null); setEditingItem(detailItem); setShowForm(true); }} className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#e8c559] to-[#d4b44a] text-[#171611] font-semibold">Edit</button></div>
                    </div>
                </div>
            )}

            {/* Form Modal */}
            {
                showForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#1c2120] rounded-2xl shadow-2xl">
                            <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-[var(--glass-border)] bg-white dark:bg-[#1c2120]">
                                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                                    {editingItem ? 'Edit Proposal' : 'Tambah Proposal'}
                                </h2>
                                <button onClick={() => { setShowForm(false); setEditingItem(null); }} className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10">
                                    <X className="h-5 w-5 text-[var(--text-secondary)]" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">No. Proposal</label>
                                        <input type="text" name="proposal_number" defaultValue={editingItem?.proposal_number || ''} className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Tanggal Kirim</label>
                                        <input type="date" name="sent_date" defaultValue={editingItem?.sent_date || ''} className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Nama Perusahaan *</label>
                                    <input type="text" name="company_name" defaultValue={editingItem?.company_name || ''} required className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]" />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Judul Proposal *</label>
                                    <input type="text" name="proposal_title" defaultValue={editingItem?.proposal_title || ''} required className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Jenis Layanan</label>
                                        <input type="text" name="service_type" defaultValue={editingItem?.service_type || ''} className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Nilai Penawaran</label>
                                        <input type="number" name="offer_value" defaultValue={editingItem?.offer_value || 0} className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Status</label>
                                        <select name="status" defaultValue={editingItem?.status || 'draft'} className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]">
                                            {(Object.keys(STATUS_CONFIG) as ProposalStatus[]).map((s) => (
                                                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Last Follow Up</label>
                                        <input type="date" name="last_follow_up" defaultValue={editingItem?.last_follow_up || ''} className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Start Date</label>
                                        <input type="date" name="start_date" defaultValue={editingItem?.start_date || ''} className="w-full px-4 py-2 rounded-lg border border-[var(--glass-border)] bg-transparent text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">End Date</label>
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
                )
            }
        </div >
    );
}
