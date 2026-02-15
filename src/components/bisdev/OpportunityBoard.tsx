"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Plus, Search, Filter, Calendar, DollarSign, GripVertical, CheckCircle, XCircle, Building2, X, User, Eye, FileDown, Edit3, Trash2 } from "lucide-react";
import Image from "next/image";
import { Opportunity, opportunityService } from "@/lib/services/opportunity.service";
import { formatCurrency } from "@/lib/utils"; // Assume utility exists or create inline
import { createClient } from "@/lib/supabase/client";

import { useSearchParams } from "next/navigation";

// Status Configuration 
// Status Configuration 
const STAGE_CONFIG = {
    prospect: {
        label: "Prospects",
        color: "blue",
        columns: ["pending", "on_going", "sent", "follow_up"],
        nextStage: "proposal",
        nextStatus: "pending"
    },
    proposal: {
        label: "Proposals",
        color: "purple",
        columns: ["pending", "on_going", "sent"],
        nextStage: "leads",
        nextStatus: "pending"
    },
    leads: {
        label: "Leads",
        color: "orange",
        columns: ["pending", "low", "moderate", "hot"],
        nextStage: "sales",
        nextStatus: "pending"
    },
    sales: {
        label: "Sales",
        color: "emerald",
        columns: ["pending", "down_payment", "account_receivable", "full_payment"],
        nextStage: null,
        nextStatus: null
    }
};

const STATUS_LABELS: Record<string, string> = {
    on_going: "On Going",
    pending: "Pending",
    sent: "Sent",
    follow_up: "Follow Up",
    low: "Low",
    moderate: "Moderate",
    hot: "Hot",
    down_payment: "Down Payment",
    account_receivable: "Account Receivable",
    full_payment: "Full Payment",
    failed: "Failed",
    lost: "Lost",
    won: "Won"
};

export default function OpportunityBoard() {
    const searchParams = useSearchParams();
    const initialStage = searchParams.get("stage") as keyof typeof STAGE_CONFIG;
    const [activeTab, setActiveTab] = useState<keyof typeof STAGE_CONFIG>(
        (initialStage && STAGE_CONFIG[initialStage]) ? initialStage : "prospect"
    );
    const [viewMode, setViewMode] = useState<"board" | "table">("board");
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false); // Default to Quick View (false)
    const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null);

    // Fetch Data
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const data = await opportunityService.getOpportunities();
            setOpportunities(data || []);
        } catch (error) {
            console.error("Failed to fetch opportunities", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Filter Logic
    const filteredOpportunities = opportunities.filter(opp =>
        opp.stage === activeTab &&
        (opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            opp.client?.company_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Group by Status Column
    const columns = STAGE_CONFIG[activeTab].columns;
    const groupedData = columns.reduce((acc, col) => {
        acc[col] = filteredOpportunities.filter(o => o.status === col);
        return acc;
    }, {} as Record<string, Opportunity[]>);

    // Drag & Drop Handler
    const onDragEnd = async (result: any) => {
        const { source, destination, draggableId } = result;

        // Dropped outside or no change
        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        // Optimistic UI Update
        const updatedOpp = opportunities.find(o => o.id === draggableId);
        if (!updatedOpp) return;

        const newStatus = destination.droppableId;
        const oldStatus = source.droppableId;

        // Update Local State
        const newOpportunities = opportunities.map(o =>
            o.id === draggableId ? { ...o, status: newStatus } : o
        );
        setOpportunities(newOpportunities);

        // API Call
        try {
            await opportunityService.updateStage(draggableId, activeTab, newStatus, updatedOpp.stage); // Keep stage same within tab
        } catch (error) {
            console.error("Failed to move card", error);
            fetchData(); // Revert on error
        }
    };

    // Action Handlers (Done/Win/Fail/Lost)
    const handleMoveToNextStage = async (id: string) => {
        const config = STAGE_CONFIG[activeTab];
        if (!config.nextStage || !config.nextStatus) return;

        if (!confirm(`Move to ${config.nextStage.toUpperCase()}?`)) return;

        try {
            const opp = opportunities.find(o => o.id === id);
            await opportunityService.updateStage(id, config.nextStage, config.nextStatus, opp?.stage);
            fetchData(); // Refresh to remove from current view
        } catch (error) {
            alert("Failed to move stage");
        }
    };

    const handleArchive = async (id: string, reason: 'won' | 'lost' | 'failed') => {
        if (!confirm(`Mark as ${reason.toUpperCase()} and archive?`)) return;
        try {
            // We can either update status to 'failed'/'lost' (keeping it in DB but hidden via filter)
            // Or actually delete/archive. User requested "hilang dari visual".
            // Let's set status to failed/lost and keep the stage. The filter `opp.stage === activeTab` handles it if we don't include 'failed' in columns.
            await opportunityService.updateStage(id, activeTab, reason);
            fetchData();
        } catch (error) {
            alert("Failed to archive");
        }
    };

    const handleExport = async () => {
        // Dynamic import - only loads xlsx (~200KB) when user clicks Export
        const [XLSX, { saveAs }] = await Promise.all([
            import("xlsx"),
            import("file-saver")
        ]);

        const exportData = filteredOpportunities.map(opp => {
            const client = opp.client;
            // Format ALL contacts
            const contactNames = client?.contacts?.map(c => c.name).join(", ") || "-";
            const contactEmails = client?.contacts?.map(c => c.email).join(", ") || "-";
            const contactPhones = client?.contacts?.map(c => c.phone).join(", ") || "-";

            return {
                "Opportunity Title": opp.title,
                "Company Name": client?.company_name || "-",
                "Type": opp.opportunity_type ? opp.opportunity_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : "-",
                "Status": STATUS_LABELS[opp.status] || opp.status,
                "Value": opp.value,
                "Priority": opp.priority,
                "Created At": new Date(opp.created_at).toLocaleDateString(),
                "Updated At": new Date(opp.updated_at).toLocaleDateString(),
                "Contact Names": contactNames,
                "Contact Emails": contactEmails,
                "Contact Phones": contactPhones
            };
        });

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(workbook, worksheet, "Opportunities");
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
        saveAs(data, `opportunities_${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // Edit Modal State


    // Edit Form State
    const [editForm, setEditForm] = useState({
        title: "",
        stage: "prospect" as keyof typeof STAGE_CONFIG,
        status: "pending",
        value: 0,
        cash_in: 0,
        priority: "medium",
        opportunity_type: "" as "" | "customer_based" | "product_based",
        notes: "",
        created_at: ""
    });

    // Revenue Management State
    const [revenueForm, setRevenueForm] = useState({
        amount: 0,
        payment_date: new Date().toISOString().split('T')[0],
        notes: ''
    });
    const [pendingRevenue, setPendingRevenue] = useState<{ amount: number; payment_date: string; notes: string; _tempId: string }[]>([]);
    const [existingRevenue, setExistingRevenue] = useState<any[]>([]);

    const openEditModal = (opp: Opportunity) => {
        setEditingOpp(opp);
        setEditForm({
            title: opp.title,
            stage: opp.stage,
            status: opp.status,
            value: opp.value,
            priority: opp.priority,
            opportunity_type: opp.opportunity_type || "",
            cash_in: opp.cash_in || 0,
            notes: opp.notes || "",
            created_at: opp.created_at ? new Date(opp.created_at).toISOString().split('T')[0] : ""
        });
        setExistingRevenue(opp.revenue || []);
        setPendingRevenue([]);
        setRevenueForm({ amount: 0, payment_date: new Date().toISOString().split('T')[0], notes: '' });
        setIsEditMode(false);
        setIsEditModalOpen(true);
    };

    const handleAddRevenue = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!revenueForm.amount || revenueForm.amount <= 0) return;
        setPendingRevenue(prev => [
            ...prev,
            { amount: revenueForm.amount, payment_date: revenueForm.payment_date, notes: revenueForm.notes, _tempId: crypto.randomUUID() }
        ]);
        setRevenueForm({ amount: 0, payment_date: new Date().toISOString().split('T')[0], notes: '' });
    };

    const handleDeletePendingRevenue = (tempId: string) => {
        setPendingRevenue(prev => prev.filter(r => r._tempId !== tempId));
    };

    const handleDeleteRevenue = async (revenueId: string) => {
        if (!confirm('Delete this payment record?')) return;
        const supabase = createClient();
        try {
            await supabase.from('crm_revenue').delete().eq('id', revenueId);
            setExistingRevenue(prev => prev.filter(r => r.id !== revenueId));
        } catch (error) {
            console.error('Error deleting revenue:', error);
            alert('Failed to delete payment.');
        }
    };

    const handleUpdateOpportunity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingOpp) return;

        try {
            // Calculate total cash in from revenue records
            const totalRevenue = existingRevenue.reduce((sum, r) => sum + (r.amount || 0), 0) +
                pendingRevenue.reduce((sum, r) => sum + (r.amount || 0), 0);

            const payload = {
                ...editForm,
                cash_in: totalRevenue, // Use calculated revenue instead of manual input
                opportunity_type: editForm.opportunity_type || null,
                created_at: editForm.created_at ? new Date(editForm.created_at).toISOString() : undefined
            };
            await opportunityService.updateOpportunity(editingOpp.id, payload);

            // Save pending revenue entries
            if (pendingRevenue.length > 0) {
                const supabase = createClient();
                const userId = (await supabase.auth.getUser()).data.user?.id;
                const revenueEntries = pendingRevenue.map(r => ({
                    opportunity_id: editingOpp.id,
                    amount: r.amount,
                    payment_date: r.payment_date,
                    notes: r.notes,
                    created_by: userId
                }));
                const { error: revError } = await supabase.from('crm_revenue').insert(revenueEntries);
                if (revError) console.error('Error saving pending revenue:', revError);
            }

            setIsEditModalOpen(false);
            setEditingOpp(null);
            setPendingRevenue([]);
            fetchData();
        } catch (error) {
            console.error("Failed to update opportunity", error);
            alert("Failed to update opportunity");
        }
    };

    return (
        <div className="flex flex-col h-full w-full">
            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-[var(--glass-border)] mb-6 overflow-x-auto">
                {Object.entries(STAGE_CONFIG).map(([key, config]) => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key as any)}
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                            ${activeTab === key
                                ? `border-${config.color}-500 text-[var(--text-primary)]`
                                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            }`}
                    >
                        {config.label}
                    </button>
                ))}
            </div>

            {/* Toolbar */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            placeholder="Search opportunities..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] text-sm focus:ring-1 focus:ring-amber-400"
                        />
                    </div>
                    <div className="flex items-center">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-emerald-500 transition-colors mr-2"
                            title="Export to Excel"
                        >
                            <FileDown className="h-4 w-4" />
                            <span className="hidden sm:inline">Export</span>
                        </button>
                        <div className="flex bg-[var(--glass-bg)] rounded-lg p-1 border border-[var(--glass-border)]">
                            <button
                                onClick={() => setViewMode("board")}
                                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${viewMode === "board" ? "bg-amber-100 text-amber-800" : "text-[var(--text-secondary)]"}`}
                            >
                                Board
                            </button>
                            <button
                                onClick={() => setViewMode("table")}
                                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${viewMode === "table" ? "bg-amber-100 text-amber-800" : "text-[var(--text-secondary)]"}`}
                            >
                                Table
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Board View */}
            {viewMode === "board" && (
                <div className="flex-1 overflow-x-auto">
                    <DragDropContext onDragEnd={onDragEnd}>
                        <div className="flex gap-6 min-w-full pb-4">
                            {columns.map((colId) => (
                                <div key={colId} className="flex-col min-w-[300px] max-w-[300px]">
                                    {/* Column Header */}
                                    <div className={`mb-4 pb-2 border-b-2 border-${STAGE_CONFIG[activeTab].color}-500/20 flex justify-between items-center`}>
                                        <h3 className="font-semibold text-[var(--text-primary)] uppercase text-xs tracking-wider">
                                            {STATUS_LABELS[colId]}
                                        </h3>
                                        <span className="text-xs text-[var(--text-muted)] bg-[var(--glass-bg)] px-2 py-0.5 rounded-full">
                                            {groupedData[colId]?.length || 0}
                                        </span>
                                    </div>

                                    {/* Droppable Area */}
                                    <Droppable droppableId={colId}>
                                        {(provided: any, snapshot: any) => (
                                            <div
                                                {...provided.droppableProps}
                                                ref={provided.innerRef}
                                                className={`flex flex-col gap-3 min-h-[200px] rounded-xl transition-colors ${snapshot.isDraggingOver ? "bg-[var(--glass-border)]/20" : ""}`}
                                            >
                                                {groupedData[colId]?.map((opp, index) => (
                                                    <Draggable key={opp.id} draggableId={opp.id} index={index}>
                                                        {(provided: any, snapshot: any) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                className={`
                                                                    group relative bg-[var(--card-bg)] border border-[var(--glass-border)] border-l-4 p-4 rounded-xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 overflow-hidden
                                                                    ${activeTab === 'prospect' ? 'border-l-blue-500' :
                                                                        activeTab === 'proposal' ? 'border-l-purple-500' :
                                                                            activeTab === 'leads' ? 'border-l-orange-500' : 'border-l-emerald-500'}
                                                                    ${snapshot.isDragging ? "rotate-2 scale-105 z-50 ring-2 ring-amber-400" : ""}
                                                                `}
                                                            >
                                                                <div className="flex justify-between items-start mb-3">
                                                                    <div className="flex-1 mr-2">
                                                                        <div className="flex items-center justify-between mb-1">
                                                                            <h4 className="font-bold text-[var(--text-primary)] text-sm leading-snug break-words mb-1" title={opp.title}>{opp.title}</h4>
                                                                            <button
                                                                                onClick={() => openEditModal(opp)}
                                                                                className="p-1 rounded hover:bg-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                                                                title="Quick View & Edit"
                                                                            >
                                                                                <Eye className="h-3.5 w-3.5" />
                                                                            </button>
                                                                        </div>
                                                                        <div className="flex items-start gap-1 mb-1">
                                                                            <Building2 className="h-3 w-3 text-[var(--text-secondary)] mt-0.5 flex-shrink-0" />
                                                                            <p className="text-xs text-[var(--text-secondary)] break-words leading-tight" title={opp.client?.company_name}>{opp.client?.company_name || 'No Client'}</p>
                                                                        </div>
                                                                        {opp.opportunity_type && (
                                                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${opp.opportunity_type === 'customer_based'
                                                                                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
                                                                                : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800'
                                                                                }`}>
                                                                                {opp.opportunity_type === 'customer_based' ? 'Customer' : 'Product'}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${opp.priority === 'high' ? 'bg-red-100 text-red-600' :
                                                                        opp.priority === 'medium' ? 'bg-amber-100 text-amber-600' :
                                                                            'bg-green-100 text-green-600'
                                                                        }`}>
                                                                        {opp.priority}
                                                                    </span>
                                                                </div>

                                                                <div className="flex items-end justify-between mt-3 pt-3 border-t border-[var(--glass-border)]">
                                                                    <div className="flex flex-col gap-0.5">
                                                                        {activeTab === 'sales' ? (
                                                                            <>
                                                                                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Cash In</span>
                                                                                <span className="text-sm font-mono font-bold text-emerald-600 truncate block max-w-[140px]" title={`Rp ${(opp.revenue?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0).toLocaleString('id-ID')}`}>
                                                                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumSignificantDigits: 3 }).format(opp.revenue?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0)}
                                                                                </span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Value</span>
                                                                                <span className="text-sm font-mono font-bold text-emerald-600 truncate block max-w-[140px]" title={`Rp ${opp.value.toLocaleString('id-ID')}`}>
                                                                                    {opp.value > 0 ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumSignificantDigits: 3 }).format(opp.value) : '-'}
                                                                                </span>
                                                                            </>
                                                                        )}
                                                                        <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)] mt-1">
                                                                            <Calendar className="h-3 w-3" />
                                                                            <span>Updated: {new Date(opp.updated_at).toLocaleDateString()}</span>
                                                                        </div>
                                                                    </div>

                                                                    <div className="opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                                        {/* Action Buttons based on stage */}
                                                                        {(activeTab === 'prospect' || activeTab === 'proposal') && (
                                                                            <button
                                                                                onClick={() => handleArchive(opp.id, 'failed')}
                                                                                title="Mark Failed"
                                                                                className="p-1 hover:bg-rose-100 text-rose-500 rounded bg-rose-50/50"
                                                                            >
                                                                                <XCircle className="h-4 w-4" />
                                                                            </button>
                                                                        )}
                                                                        {(activeTab === 'leads') && (
                                                                            <button
                                                                                onClick={() => handleArchive(opp.id, 'lost')}
                                                                                title="Mark Lost"
                                                                                className="p-1 hover:bg-rose-100 text-rose-500 rounded bg-rose-50/50"
                                                                            >
                                                                                <XCircle className="h-4 w-4" />
                                                                            </button>
                                                                        )}

                                                                        {(() => {
                                                                            if (activeTab === 'sales') {
                                                                                // Only allow "Won" if status is Full Payment AND Cash In equals Value
                                                                                const isFullPayment = opp.status === 'full_payment';
                                                                                const currentCashIn = opp.revenue?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
                                                                                const isPaidInFull = currentCashIn >= (opp.value || 0);
                                                                                const canComplete = isFullPayment && isPaidInFull;

                                                                                return (
                                                                                    <button
                                                                                        onClick={() => handleArchive(opp.id, 'won')}
                                                                                        title={canComplete ? "Mark Completed (Won)" : "Requires Full Payment Status & 100% Cash In"}
                                                                                        disabled={!canComplete}
                                                                                        className={`p-1 rounded transition-colors ${!canComplete
                                                                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                                                            : 'hover:bg-emerald-100 text-emerald-500 bg-emerald-50/50'
                                                                                            }`}
                                                                                    >
                                                                                        <CheckCircle className="h-4 w-4" />
                                                                                    </button>
                                                                                );
                                                                            }

                                                                            // Logic for Proposal: Only "sent" can move next
                                                                            if (activeTab === 'proposal') {
                                                                                const canMoveNext = opp.status === 'sent';
                                                                                return (
                                                                                    <button
                                                                                        onClick={() => canMoveNext && handleMoveToNextStage(opp.id)}
                                                                                        title={canMoveNext ? "Move Next" : "Complete checklist to proceed"}
                                                                                        disabled={!canMoveNext}
                                                                                        className={`p-1 rounded transition-colors ${!canMoveNext
                                                                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                                                            : 'hover:bg-emerald-100 text-emerald-500 bg-emerald-50/50'
                                                                                            }`}
                                                                                    >
                                                                                        <CheckCircle className="h-4 w-4" />
                                                                                    </button>
                                                                                );
                                                                            }

                                                                            // Logic for Leads: Only non-pending can move next
                                                                            if (activeTab === 'leads') {
                                                                                const canMoveNext = opp.status !== 'pending';
                                                                                return (
                                                                                    <button
                                                                                        onClick={() => canMoveNext && handleMoveToNextStage(opp.id)}
                                                                                        title={canMoveNext ? "Move Next" : "Warm up the lead first"}
                                                                                        disabled={!canMoveNext}
                                                                                        className={`p-1 rounded transition-colors ${!canMoveNext
                                                                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                                                            : 'hover:bg-emerald-100 text-emerald-500 bg-emerald-50/50'
                                                                                            }`}
                                                                                    >
                                                                                        <CheckCircle className="h-4 w-4" />
                                                                                    </button>
                                                                                );
                                                                            }

                                                                            // Logic for Prospect: Only non-pending can move next
                                                                            if (activeTab === 'prospect') {
                                                                                const canMoveNext = opp.status !== 'pending';
                                                                                return (
                                                                                    <button
                                                                                        onClick={() => canMoveNext && handleMoveToNextStage(opp.id)}
                                                                                        title={canMoveNext ? "Move Next" : "Complete checklist to proceed"}
                                                                                        disabled={!canMoveNext}
                                                                                        className={`p-1 rounded transition-colors ${!canMoveNext
                                                                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                                                            : 'hover:bg-emerald-100 text-emerald-500 bg-emerald-50/50'
                                                                                            }`}
                                                                                    >
                                                                                        <CheckCircle className="h-4 w-4" />
                                                                                    </button>
                                                                                );
                                                                            }

                                                                            // Default (others)
                                                                            return (
                                                                                <button
                                                                                    onClick={() => handleMoveToNextStage(opp.id)}
                                                                                    title="Move Next"
                                                                                    className="p-1 hover:bg-emerald-100 text-emerald-500 bg-emerald-50/50"
                                                                                >
                                                                                    <CheckCircle className="h-4 w-4" />
                                                                                </button>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </div>
                            ))}
                        </div>
                    </DragDropContext >
                </div >
            )
            }

            {/* Table View */}
            {
                viewMode === "table" && (
                    <div className="flex-1 bg-[var(--card-bg)] rounded-xl border border-[var(--glass-border)] overflow-hidden flex flex-col">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[var(--glass-border)] bg-[var(--glass-bg)]/50">
                                        <th className="px-6 py-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Opportunity</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Type</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Value</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Updated</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Priority</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--glass-border)]">
                                    {filteredOpportunities.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-8 text-center text-[var(--text-muted)] italic">
                                                No opportunities found in this stage.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredOpportunities.map((opp) => (
                                            <tr key={opp.id} className="group hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-[var(--text-primary)] text-sm">{opp.title}</span>
                                                        <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] mt-0.5">
                                                            <Building2 className="h-3 w-3" />
                                                            <span>{opp.client?.company_name || 'No Client'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {opp.opportunity_type ? (
                                                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${opp.opportunity_type === 'customer_based'
                                                            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
                                                            : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800'
                                                            }`}>
                                                            {opp.opportunity_type === 'customer_based' ? 'Customer Based' : 'Product Based'}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-[var(--text-muted)]">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-secondary)] capitalize">
                                                        {STATUS_LABELS[opp.status] || opp.status.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {opp.value > 0 ? (
                                                        <span className="font-mono text-sm font-bold text-emerald-600">
                                                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumSignificantDigits: 3 }).format(opp.value)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-[var(--text-muted)]">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        <span>{new Date(opp.updated_at).toLocaleDateString()}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${opp.priority === 'high' ? 'bg-red-100 text-red-600' :
                                                        opp.priority === 'medium' ? 'bg-amber-100 text-amber-600' :
                                                            'bg-green-100 text-green-600'
                                                        }`}>
                                                        {opp.priority}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => openEditModal(opp)}
                                                            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-secondary)] rounded"
                                                            title="Quick Edit"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </button>
                                                        {(activeTab === 'prospect' || activeTab === 'proposal') && (
                                                            <button
                                                                onClick={() => handleArchive(opp.id, 'failed')}
                                                                title="Mark Failed"
                                                                className="p-1.5 hover:bg-rose-100 text-rose-500 rounded bg-rose-50/50"
                                                            >
                                                                <XCircle className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                        {(activeTab === 'leads') && (
                                                            <button
                                                                onClick={() => handleArchive(opp.id, 'lost')}
                                                                title="Mark Lost"
                                                                className="p-1.5 hover:bg-rose-100 text-rose-500 rounded bg-rose-50/50"
                                                            >
                                                                <XCircle className="h-4 w-4" />
                                                            </button>
                                                        )}

                                                        {activeTab === 'sales' ? (
                                                            (() => {
                                                                const isFullPayment = opp.status === 'full_payment';
                                                                const currentCashIn = opp.revenue?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
                                                                const isPaidInFull = currentCashIn >= (opp.value || 0);
                                                                const canComplete = isFullPayment && isPaidInFull;
                                                                return (
                                                                    <button
                                                                        onClick={() => handleArchive(opp.id, 'won')}
                                                                        title={canComplete ? "Mark Completed (Won)" : "Requires Full Payment Status & 100% Cash In"}
                                                                        disabled={!canComplete}
                                                                        className={`p-1.5 rounded transition-colors ${!canComplete
                                                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                                            : 'hover:bg-emerald-100 text-emerald-500 bg-emerald-50/50'
                                                                            }`}
                                                                    >
                                                                        <CheckCircle className="h-4 w-4" />
                                                                    </button>
                                                                );
                                                            })()
                                                        ) : (
                                                            <button
                                                                onClick={() => handleMoveToNextStage(opp.id)}
                                                                title="Move Next"
                                                                className="p-1.5 hover:bg-emerald-100 text-emerald-500 rounded bg-emerald-50/50"
                                                            >
                                                                <CheckCircle className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }

            {/* Edit Opportunity Modal */}
            {
                isEditModalOpen && editingOpp && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="w-full max-w-md bg-white dark:bg-[#1c2120] rounded-2xl shadow-2xl overflow-hidden border border-[var(--glass-border)] flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-[var(--glass-border)] flex justify-between items-center relative overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500 opacity-80" />
                                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                                    {isEditMode ? "Edit Opportunity" : "Opportunity Details"}
                                </h2>
                                <div className="flex items-center gap-2">
                                    {!isEditMode ? (
                                        <button
                                            onClick={() => setIsEditMode(true)}
                                            className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-secondary)] hover:text-amber-500 transition-colors"
                                            title="Edit Opportunity"
                                        >
                                            <Edit3 className="w-5 h-5" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setIsEditMode(false)}
                                            className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-secondary)] hover:text-blue-500 transition-colors"
                                            title="Quick View"
                                        >
                                            <Eye className="w-5 h-5" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setIsEditModalOpen(false)}
                                        className="p-2 rounded-lg hover:bg-red-50 text-[var(--text-secondary)] hover:text-red-500 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-6 overflow-y-auto">
                                {!isEditMode && editingOpp ? (
                                    // Quick View Card
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-2xl font-bold text-[var(--text-primary)] break-words leading-tight">{editingOpp.title}</h3>
                                                <div className="flex items-center gap-2 text-[var(--text-secondary)] mt-1">
                                                    <Building2 className="h-4 w-4" />
                                                    <span className="font-medium">{editingOpp.client?.company_name || 'No Client'}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${editingOpp.stage === 'prospect' ? 'bg-blue-100 text-blue-700' :
                                                    editingOpp.stage === 'proposal' ? 'bg-purple-100 text-purple-700' :
                                                        editingOpp.stage === 'leads' ? 'bg-orange-100 text-orange-700' :
                                                            'bg-emerald-100 text-emerald-700'
                                                    }`}>
                                                    {STAGE_CONFIG[editingOpp.stage].label}
                                                </span>
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                                    {STATUS_LABELS[editingOpp.status] || editingOpp.status.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                                                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Value</p>
                                                <p className="text-xl font-mono font-bold text-emerald-600 break-words line-clamp-2" title={`Rp ${editingOpp.value.toLocaleString('id-ID')}`}>
                                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(editingOpp.value)}
                                                </p>
                                            </div>
                                            {editingOpp.stage === 'sales' && (
                                                <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                                                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Cash In</p>
                                                    <p className="text-xl font-mono font-bold text-emerald-600 break-words line-clamp-2" title={`Rp ${(editingOpp.revenue?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0).toLocaleString('id-ID')}`}>
                                                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(editingOpp.revenue?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0)}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-bold text-[var(--text-primary)] text-sm">Notes</h4>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${editingOpp.priority === 'high' ? 'bg-red-100 text-red-600' :
                                                    editingOpp.priority === 'medium' ? 'bg-amber-100 text-amber-600' :
                                                        'bg-green-100 text-green-600'
                                                    }`}>
                                                    {editingOpp.priority} Priority
                                                </span>
                                            </div>
                                            <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] min-h-[80px]">
                                                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap italic">
                                                    {editingOpp.notes ? `"${editingOpp.notes}"` : "No notes yet."}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center pt-4 border-t border-[var(--glass-border)]">
                                            <div className="text-xs text-[var(--text-muted)] flex flex-col gap-1">
                                                <span>Created: {new Date(editingOpp.created_at).toLocaleDateString()}</span>
                                                <span>Updated: {new Date(editingOpp.updated_at).toLocaleDateString()}</span>
                                            </div>
                                            <Link
                                                href={`/dashboard/bisdev/crm/${editingOpp.client_id}?tab=opportunities`}
                                                className="px-4 py-2 bg-[#e8c559] text-[#171611] font-bold rounded-xl hover:bg-[#d4b44e] transition-colors flex items-center gap-2"
                                            >
                                                <Building2 className="h-4 w-4" />
                                                Go to CRM
                                            </Link>
                                        </div>
                                    </div>
                                ) : (
                                    // Edit Form
                                    <form onSubmit={handleUpdateOpportunity} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Title *</label>
                                            <input
                                                type="text"
                                                required
                                                value={editForm.title}
                                                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                                className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)]"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Type</label>
                                            <select
                                                value={editForm.opportunity_type}
                                                onChange={(e) => setEditForm({ ...editForm, opportunity_type: e.target.value as any })}
                                                className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)]"
                                            >
                                                <option value="">-- Select Type --</option>
                                                <option value="customer_based">Customer Based</option>
                                                <option value="product_based">Product Based</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Created Date</label>
                                            <input
                                                type="date"
                                                value={editForm.created_at}
                                                onChange={(e) => setEditForm({ ...editForm, created_at: e.target.value })}
                                                className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)]"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Stage</label>
                                                <select
                                                    disabled
                                                    value={editForm.stage}
                                                    className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-gray-50 dark:bg-[#2c3332] text-[var(--text-muted)] cursor-not-allowed uppercase"
                                                >
                                                    {Object.entries(STAGE_CONFIG).map(([key, config]) => (
                                                        <option key={key} value={key}>{config.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Status</label>
                                                <select
                                                    value={editForm.status}
                                                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                                    className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)] capitalize"
                                                >
                                                    {STAGE_CONFIG[editForm.stage as keyof typeof STAGE_CONFIG]?.columns.map((status) => (
                                                        <option key={status} value={status}>{STATUS_LABELS[status] || status.replace('_', ' ')}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2">
                                                <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Value (IDR)</label>
                                                <div className="space-y-1">
                                                    <input
                                                        type="text"
                                                        value={editForm.value}
                                                        onChange={(e) => {
                                                            const val = e.target.value.replace(/[^0-9]/g, '');
                                                            setEditForm({ ...editForm, value: val ? parseFloat(val) : 0 });
                                                        }}
                                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)]"
                                                    />
                                                    {editForm.value > 0 && (
                                                        <p className="text-xs text-[var(--text-muted)]">
                                                            Rp {editForm.value.toLocaleString('id-ID')}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Revenue & Payments Section */}
                                        {editForm.stage === 'sales' && (
                                            <div className="col-span-2 mt-4 border-t border-[var(--glass-border)] pt-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="block text-sm font-bold text-[var(--text-primary)]">
                                                        Revenue & Payments (Cash In)
                                                    </label>
                                                    <div className="text-right">
                                                        <p className="text-sm font-bold text-emerald-600">
                                                            Total: Rp {((existingRevenue.reduce((sum: number, r: any) => sum + r.amount, 0) || 0) + pendingRevenue.reduce((sum, r) => sum + r.amount, 0)).toLocaleString('id-ID')}
                                                        </p>
                                                        <p className="text-[10px] text-[var(--text-muted)]">
                                                            Target: Rp {editForm.value.toLocaleString('id-ID')}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* List of Payments */}
                                                <div className="space-y-2 mb-4">
                                                    {existingRevenue.length > 0 ? (
                                                        existingRevenue.map((rev: any) => (
                                                            <div key={rev.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-[var(--glass-border)] text-sm">
                                                                <div>
                                                                    <p className="font-bold text-[var(--text-primary)]">
                                                                        Rp {rev.amount.toLocaleString('id-ID')}
                                                                    </p>
                                                                    <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)]">
                                                                        <span>{new Date(rev.payment_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                                        {rev.notes && <span>• {rev.notes}</span>}
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteRevenue(rev.id)}
                                                                    className="p-1.5 text-red-500 hover:bg-red-500/10 rounded"
                                                                    title="Delete Payment"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        ))
                                                    ) : pendingRevenue.length === 0 ? (
                                                        <p className="text-xs text-[var(--text-muted)] italic text-center py-2">No payments recorded yet.</p>
                                                    ) : null}
                                                    {/* Pending Revenue */}
                                                    {pendingRevenue.map((rev) => (
                                                        <div key={rev._tempId} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-[var(--glass-border)] text-sm">
                                                            <div>
                                                                <p className="font-bold text-[var(--text-primary)]">
                                                                    Rp {rev.amount.toLocaleString('id-ID')}
                                                                </p>
                                                                <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)]">
                                                                    <span>{new Date(rev.payment_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                                    {rev.notes && <span>• {rev.notes}</span>}
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeletePendingRevenue(rev._tempId)}
                                                                className="p-1.5 text-red-500 hover:bg-red-500/10 rounded"
                                                                title="Remove Payment"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Add Payment Form */}
                                                <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
                                                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-2">Add New Payment</p>
                                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                                        <div>
                                                            <label className="block text-[10px] uppercase font-bold text-[var(--text-muted)] mb-1">Amount</label>
                                                            <input
                                                                type="text"
                                                                placeholder="0"
                                                                value={revenueForm.amount}
                                                                onChange={(e) => {
                                                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                                                    setRevenueForm({ ...revenueForm, amount: val ? parseFloat(val) : 0 });
                                                                }}
                                                                className="w-full px-2 py-1.5 rounded-lg border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] text-sm"
                                                            />
                                                            {revenueForm.amount > 0 && (
                                                                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Rp {revenueForm.amount.toLocaleString('id-ID')}</p>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] uppercase font-bold text-[var(--text-muted)] mb-1">Date</label>
                                                            <input
                                                                type="date"
                                                                value={revenueForm.payment_date}
                                                                onChange={(e) => setRevenueForm({ ...revenueForm, payment_date: e.target.value })}
                                                                className="w-full px-2 py-1.5 rounded-lg border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Notes (Optional)"
                                                            value={revenueForm.notes}
                                                            onChange={(e) => setRevenueForm({ ...revenueForm, notes: e.target.value })}
                                                            className="flex-1 px-2 py-1.5 rounded-lg border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] text-sm"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={handleAddRevenue}
                                                            disabled={!revenueForm.amount || revenueForm.amount <= 0}
                                                            className="px-3 py-1.5 rounded-lg bg-[#e8c559] text-[#171611] text-xs font-bold hover:bg-[#d4b44e] disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            Add
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Priority</label>
                                            <select
                                                value={editForm.priority}
                                                onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                                                className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)]"
                                            >
                                                <option value="low">Low</option>
                                                <option value="medium">Medium</option>
                                                <option value="high">High</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Notes</label>
                                            <textarea
                                                rows={3}
                                                value={editForm.notes}
                                                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                                className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)]"
                                            />
                                        </div>
                                        <div className="flex justify-end gap-3 pt-4 mt-2">
                                            <button
                                                type="button"
                                                onClick={() => setIsEditModalOpen(false)}
                                                className="px-4 py-2 rounded-xl border border-[var(--glass-border)] text-[var(--text-secondary)]"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="px-6 py-2 rounded-xl bg-[#e8c559] text-[#171611] font-bold hover:bg-[#d4b44e]"
                                            >
                                                Save Changes
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {
                isEditModalOpen && (
                    <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" />
                )
            }
        </div >
    );
}

