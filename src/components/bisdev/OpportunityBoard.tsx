"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Plus, Search, Filter, Calendar, DollarSign, GripVertical, CheckCircle, XCircle, Building2, X, User, Eye, FileDown } from "lucide-react";
import Image from "next/image";
import { Opportunity, opportunityService } from "@/lib/services/opportunity.service";
import { formatCurrency } from "@/lib/utils"; // Assume utility exists or create inline
import { createClient } from "@/lib/supabase/client";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// Status Configuration 
// Status Configuration 
const STAGE_CONFIG = {
    prospect: {
        label: "Prospects",
        color: "blue",
        columns: ["pending", "on_going", "preparation", "follow_up"],
        nextStage: "proposal",
        nextStatus: "pending"
    },
    proposal: {
        label: "Proposals",
        color: "purple",
        columns: ["pending", "on_going", "preparation", "follow_up"],
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
    preparation: "Preparation",
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
    const [activeTab, setActiveTab] = useState<keyof typeof STAGE_CONFIG>("prospect");
    const [viewMode, setViewMode] = useState<"board" | "table">("board");
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

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

    const handleExport = () => {
        const exportData = filteredOpportunities.map(opp => {
            const client = opp.client;
            // Format ALL contacts
            const contactNames = client?.contacts?.map(c => c.name).join(", ") || "-";
            const contactEmails = client?.contacts?.map(c => c.email).join(", ") || "-";
            const contactPhones = client?.contacts?.map(c => c.phone).join(", ") || "-";

            return {
                "Opportunity Title": opp.title,
                "Company Name": client?.company_name || "-",
                "Type": opp.opportunity_type ? opp.opportunity_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : "-", // Add Type
                "Status": STATUS_LABELS[opp.status] || opp.status,
                // Stage removed as requested
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
                                                                    group relative bg-[var(--card-bg)] border border-[var(--glass-border)] p-4 rounded-xl shadow-sm hover:shadow-md transition-all
                                                                    ${snapshot.isDragging ? "rotate-2 scale-105 z-50 ring-2 ring-amber-400" : ""}
                                                                `}
                                                            >
                                                                <div className="flex justify-between items-start mb-3">
                                                                    <div className="flex-1 mr-2">
                                                                        <div className="flex items-center justify-between mb-1">
                                                                            <h4 className="font-bold text-[var(--text-primary)] line-clamp-2 text-sm leading-snug">{opp.title}</h4>
                                                                            <Link
                                                                                href={`/dashboard/bisdev/crm/${opp.client_id}`}
                                                                                className="p-1 rounded hover:bg-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                                                                title="View in CRM"
                                                                            >
                                                                                <Eye className="h-3.5 w-3.5" />
                                                                            </Link>
                                                                        </div>
                                                                        <p className="text-xs text-[var(--text-secondary)] truncate mb-1">{opp.client?.company_name || 'No Client'}</p>
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
                                                                        {opp.value > 0 ? (
                                                                            <span className="text-sm font-mono font-bold text-emerald-600">
                                                                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumSignificantDigits: 3 }).format(opp.value)}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-xs text-[var(--text-muted)]">-</span>
                                                                        )}
                                                                        <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                                                                            <Calendar className="h-3 w-3" />
                                                                            <span>{new Date(opp.updated_at).toLocaleDateString()}</span>
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

                                                                        {activeTab === 'sales' ? (
                                                                            <button
                                                                                onClick={() => handleArchive(opp.id, 'won')}
                                                                                title="Mark Completed (Won)"
                                                                                disabled={['down_payment', 'account_receivable'].includes(opp.status)}
                                                                                className={`p-1 rounded transition-colors ${['down_payment', 'account_receivable'].includes(opp.status)
                                                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                                                    : 'hover:bg-emerald-100 text-emerald-500 bg-emerald-50/50'
                                                                                    }`}
                                                                            >
                                                                                <CheckCircle className="h-4 w-4" />
                                                                            </button>
                                                                        ) : (
                                                                            <button
                                                                                onClick={() => handleMoveToNextStage(opp.id)}
                                                                                title="Move Next"
                                                                                className="p-1 hover:bg-emerald-100 text-emerald-500 rounded bg-emerald-50/50"
                                                                            >
                                                                                <CheckCircle className="h-4 w-4" />
                                                                            </button>
                                                                        )}
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
                    </DragDropContext>
                </div>
            )}

            {/* Table View Placeholder (Can implement later if requested) */}
            {/* Table View */}
            {viewMode === "table" && (
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
                                                    <Link
                                                        href={`/dashboard/bisdev/crm/${opp.client_id}`}
                                                        className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-secondary)] rounded"
                                                        title="View in CRM"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Link>
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
                                                        <button
                                                            onClick={() => handleArchive(opp.id, 'won')}
                                                            title="Mark Completed (Won)"
                                                            disabled={['down_payment', 'account_receivable'].includes(opp.status)}
                                                            className={`p-1.5 rounded transition-colors ${['down_payment', 'account_receivable'].includes(opp.status)
                                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                                : 'hover:bg-emerald-100 text-emerald-500 bg-emerald-50/50'
                                                                }`}
                                                        >
                                                            <CheckCircle className="h-4 w-4" />
                                                        </button>
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
            )}
        </div>
    );
}

