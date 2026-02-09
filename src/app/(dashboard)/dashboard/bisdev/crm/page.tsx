"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
    Database,
    ChevronRight,
    Plus,
    Search,
    Filter,
    X,
    Building2,
    Tag,
    FileDown,
    Eye,
    LayoutGrid,
    List,
    MoreHorizontal,
    Phone,
    Mail,
    Calendar,
    Edit3,
    Trash2,
    User,
    Sparkles,
    Key,
    AlertTriangle,
    ThumbsUp,
} from "lucide-react";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Category Config
const CATEGORY_CONFIG = {
    government: { label: "Government", color: "bg-blue-500" },
    ngo: { label: "NGO", color: "bg-green-500" },
    media: { label: "Media", color: "bg-purple-500" },
    accommodation: { label: "Accommodation", color: "bg-amber-500" },
    tour_operator: { label: "Tour Operator", color: "bg-cyan-500" },
    bumn: { label: "BUMN", color: "bg-red-500" },
    transportation: { label: "Transportation", color: "bg-indigo-500" },
    fnb: { label: "F&B", color: "bg-orange-500" },
    attraction: { label: "Attraction", color: "bg-pink-500" },
    tourism_village: { label: "Tourism Village", color: "bg-emerald-500" },
    hospitality_suppliers: { label: "Hospitality Suppliers", color: "bg-teal-500" },
    supporting_organizations: { label: "Supporting Orgs", color: "bg-violet-500" },
    others: { label: "Others", color: "bg-gray-500" },
};

const STAGE_CONFIG = {
    prospect: { label: "Prospect", color: "bg-gray-500", textColor: "text-gray-700" },
    proposal: { label: "Proposal", color: "bg-blue-500", textColor: "text-blue-700" },
    lead: { label: "Lead", color: "bg-amber-500", textColor: "text-amber-700" },
    sales: { label: "Sales", color: "bg-emerald-500", textColor: "text-emerald-700" },
    closed_won: { label: "Won", color: "bg-green-600", textColor: "text-green-700" },
    closed_lost: { label: "Lost", color: "bg-rose-500", textColor: "text-rose-700" },
};

const TAG_CONFIG = {
    new: { label: "New", color: "bg-blue-500", icon: <Sparkles className="h-4 w-4 text-blue-500 fill-blue-500" /> },
    key_account: { label: "Key Account", color: "bg-amber-500", icon: <Key className="h-4 w-4 text-amber-500 fill-amber-500" /> },
    problematic: { label: "Problematic", color: "bg-red-500", icon: <AlertTriangle className="h-4 w-4 text-red-500 fill-red-500" /> },
    recommended: { label: "Recommended", color: "bg-green-500", icon: <ThumbsUp className="h-4 w-4 text-green-500 fill-green-500" /> },
};

type CRMCategory = keyof typeof CATEGORY_CONFIG;
type CRMStage = keyof typeof STAGE_CONFIG;
type CRMTag = keyof typeof TAG_CONFIG;

interface CRMClient {
    id: string;
    company_name: string;
    category: CRMCategory;
    current_stage: CRMStage;
    description: string | null; // Added description
    source: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    client_type?: 'company' | 'individual';
    tags?: { tag: CRMTag; notes: string | null }[];
    contacts?: { id: string; name: string; position: string | null; is_primary: boolean; email?: string; phone?: string }[];
}

export default function CRMPage() {
    const supabase = createClient();
    const { profile, canAccessBisdev, isLoading: authLoading } = useAuth();
    const [clients, setClients] = useState<CRMClient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [filterCategory, setFilterCategory] = useState<CRMCategory | "">("");
    const [filterClientType, setFilterClientType] = useState<'company' | 'individual' | "">("");
    const [filterTag, setFilterTag] = useState<CRMTag | "">("");
    const [showForm, setShowForm] = useState(false);
    const [editingClient, setEditingClient] = useState<CRMClient | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        company_name: "",
        client_type: "company" as 'company' | 'individual',
        category: "others" as CRMCategory,
        source: "",
        notes: "",
    });

    // Multi-contact state
    interface ContactItem {
        name: string;
        position: string;
        email: string;
        phone: string;
    }
    const [contacts, setContacts] = useState<ContactItem[]>([{ name: "", position: "", email: "", phone: "" }]);

    const addContact = () => setContacts([...contacts, { name: "", position: "", email: "", phone: "" }]);
    const removeContact = (index: number) => setContacts(contacts.filter((_, i) => i !== index));
    const updateContact = (index: number, field: keyof ContactItem, value: string) => {
        const updated = [...contacts];
        updated[index][field] = value;
        setContacts(updated);
    };

    // Check if user has full access (can delete)
    const hasFullAccess = profile?.job_type === "bisdev" || ["ceo", "super_admin"].includes(profile?.role || "");

    useEffect(() => {
        if (canAccessBisdev) fetchClients();
    }, [canAccessBisdev]);

    const fetchClients = async () => {
        try {
            const { data, error } = await supabase
                .from("crm_clients")
                .select(`
                    *,
                    tags:crm_client_tags(tag, notes),
                    contacts:crm_client_contacts(id, name, position, is_primary, email, phone)
                `)
                .order("updated_at", { ascending: false });

            if (error) throw error;
            setClients(data || []);
        } catch (error) {
            console.error("Error fetching clients:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;

        try {
            const clientData = {
                company_name: formData.company_name,
                client_type: formData.client_type,
                category: formData.category,
                current_stage: "prospect" as CRMStage, // Always starts as prospect
                source: formData.source || null,
                notes: formData.notes || null,
            };

            if (editingClient) {
                // Update
                const { error } = await supabase
                    .from("crm_clients")
                    .update({ ...clientData, updated_at: new Date().toISOString() })
                    .eq("id", editingClient.id);
                if (error) throw error;
            } else {
                // Insert client
                const { data: newClient, error: insertError } = await supabase
                    .from("crm_clients")
                    .insert({ ...clientData, created_by: profile.id })
                    .select()
                    .single();

                if (insertError) throw insertError;

                // Create contacts - support multiple contacts
                const validContacts = contacts.filter(c => c.name.trim());
                for (let i = 0; i < validContacts.length; i++) {
                    const contact = validContacts[i];
                    await supabase.from("crm_client_contacts").insert({
                        client_id: newClient.id,
                        name: contact.name,
                        position: contact.position || null,
                        email: contact.email || null,
                        phone: contact.phone || null,
                        is_primary: i === 0, // First contact is primary
                        created_by: profile.id,
                    });
                }

                // Log journey entry with source and notes as first entry
                const journeyNotes = [
                    formData.source ? `Source: ${formData.source}` : null,
                    formData.notes ? formData.notes : null
                ].filter(Boolean).join(' | ') || 'Client added to CRM';

                await supabase.from("crm_journey").insert({
                    client_id: newClient.id,
                    from_stage: null,
                    to_stage: "prospect",
                    notes: journeyNotes,
                    created_by: profile.id,
                });

                // Automatically add "new" tag
                await supabase.from("crm_client_tags").insert({
                    client_id: newClient.id,
                    tag: "new",
                    created_by: profile.id,
                });
            }

            setShowForm(false);
            setEditingClient(null);
            resetForm();
            fetchClients();
        } catch (error) {
            console.error("Error saving client:", error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus client ini?")) return;
        try {
            const { error } = await supabase.from("crm_clients").delete().eq("id", id);
            if (error) throw error;
            fetchClients();
        } catch (error) {
            console.error("Error deleting client:", error);
        }
    };

    const resetForm = () => {
        setFormData({
            company_name: "",
            client_type: "company",
            category: "others",
            source: "",
            notes: "",
        });
        setContacts([{ name: "", position: "", email: "", phone: "" }]);
    };

    const openEditForm = (client: CRMClient) => {
        setEditingClient(client);
        setFormData({
            company_name: client.company_name,
            client_type: client.client_type || "company",
            category: client.category,
            source: client.source || "",
            notes: client.notes || "",
        });
        // Load existing contacts or empty one
        if (client.contacts && client.contacts.length > 0) {
            setContacts(client.contacts.map(c => ({
                name: c.name || "",
                position: c.position || "",
                email: c.email || "",
                phone: c.phone || "",
            })));
        } else {
            setContacts([{ name: "", position: "", email: "", phone: "" }]);
        }
        setShowForm(true);
    };

    // Filtered clients
    const filteredClients = useMemo(() => {
        return clients.filter((client) => {
            const primaryContact = client.contacts?.find(c => c.is_primary) || client.contacts?.[0];
            const matchSearch =
                client.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                primaryContact?.name?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchCategory = !filterCategory || client.category === filterCategory;
            const matchClientType = !filterClientType || client.client_type === filterClientType;
            const matchTag = !filterTag || client.tags?.some(t => t.tag === filterTag);
            return matchSearch && matchCategory && matchClientType && matchTag;
        });
    }, [clients, searchQuery, filterCategory, filterClientType, filterTag]);

    // Loading & Access Check
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
                <p className="text-[var(--text-secondary)]">You don&apos;t have access to CRM</p>
            </div>
        );
    }

    const handleExport = () => {
        const exportData = filteredClients.flatMap(client => {
            const baseData = {
                "Company": client.company_name,
                "Type": client.client_type || 'Company',
                "Category": CATEGORY_CONFIG[client.category]?.label || client.category,
                "Tags": client.tags?.map(t => t.tag).join(", ") || "",
                "Created At": new Date(client.created_at).toLocaleDateString()
            };

            if (client.contacts && client.contacts.length > 0) {
                return client.contacts.map(contact => ({
                    ...baseData,
                    "Contact Name": contact.name || "-",
                    "Contact Position": contact.position || "-",
                    "Contact Email": contact.email || "-",
                    "Contact Phone": contact.phone || "-",
                }));
            } else {
                return [{
                    ...baseData,
                    "Contact Name": "-",
                    "Contact Position": "-",
                    "Contact Email": "-",
                    "Contact Phone": "-",
                }];
            }
        });

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(workbook, worksheet, "Clients");

        // Generate buffer
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });

        saveAs(data, `crm_clients_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Database className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-[var(--text-secondary)]">
                            <Link href="/dashboard" className="hover:text-[var(--text-primary)]">Dashboard</Link>
                            <ChevronRight className="h-4 w-4" />
                            <Link href="/dashboard/bisdev" className="hover:text-[var(--text-primary)]">Bisdev</Link>
                            <ChevronRight className="h-4 w-4" />
                            <span className="text-[var(--text-primary)]">CRM</span>
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">CRM Database</h1>
                        <p className="text-sm text-[var(--text-secondary)]">
                            {filteredClients.length} clients
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[#e8c559] transition-colors"
                        title="Export to Excel"
                    >
                        <FileDown className="h-4 w-4" />
                        <span className="hidden sm:inline">Export</span>
                    </button>
                    <button
                        onClick={() => {
                            resetForm();
                            setEditingClient(null);
                            setShowForm(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#e8c559] text-[#171611] font-bold hover:bg-[#d4b44e] transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        Add Client
                    </button>
                </div>
            </div>

            {/* Search & Filter & View Toggle */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            placeholder="Search clients..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]"
                        />
                    </div>
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value as CRMCategory | "")}
                        className="px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]"
                    >
                        <option value="">All Categories</option>
                        {Object.entries(CATEGORY_CONFIG).map(([key, { label }]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                    <select
                        value={filterClientType}
                        onChange={(e) => setFilterClientType(e.target.value as 'company' | 'individual' | "")}
                        className="px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]"
                    >
                        <option value="">All Types</option>
                        <option value="company">Company</option>
                        <option value="individual">Individual</option>
                    </select>
                    <select
                        value={filterTag}
                        onChange={(e) => setFilterTag(e.target.value as CRMTag | "")}
                        className="px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]"
                    >
                        <option value="">All Tags</option>
                        {Object.entries(TAG_CONFIG).map(([key, { label }]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>

                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-1 bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode("grid")}
                        className={`p-2 rounded-md transition-colors ${viewMode === "grid" ? "bg-[#e8c559] text-[#171611]" : "text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5"}`}
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode("list")}
                        className={`p-2 rounded-md transition-colors ${viewMode === "list" ? "bg-[#e8c559] text-[#171611]" : "text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5"}`}
                    >
                        <List className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Clients Content */}
            {filteredClients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Building2 className="h-12 w-12 text-[var(--text-muted)] mb-4" />
                    <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">No clients found</h3>
                    <p className="text-[var(--text-secondary)]">Add your first client to get started</p>
                </div>
            ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClients.map((client) => {
                        const primaryContact = client.contacts?.find(c => c.is_primary) || client.contacts?.[0];
                        return (
                            <div
                                key={client.id}
                                className="group relative flex flex-col p-5 rounded-2xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] hover:border-[#e8c559]/50 hover:shadow-xl transition-all duration-300"
                            >
                                {/* Card Header - Tags Top Right */}
                                <div className="absolute top-4 right-4 flex -space-x-2 overflow-hidden hover:space-x-1 transition-all z-10">
                                    {client.tags && client.tags.length > 0 && (
                                        client.tags.slice(0, 3).map((t, i) => (
                                            <div key={i} className="w-8 h-8 rounded-full bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] flex items-center justify-center text-sm shadow-sm cursor-help" title={`${TAG_CONFIG[t.tag]?.label}${t.notes ? `: ${t.notes}` : ''}`}>
                                                {TAG_CONFIG[t.tag]?.icon}
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="flex justify-between items-start mb-4 pr-16">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold text-white ${CATEGORY_CONFIG[client.category]?.color || "bg-gray-500"}`}>
                                                {CATEGORY_CONFIG[client.category]?.label || client.category}
                                            </span>
                                            {client.client_type && (
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold ${client.client_type === 'company'
                                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                                    : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                                                    }`}>
                                                    {client.client_type}
                                                </span>
                                            )}
                                        </div>
                                        <Link href={`/dashboard/bisdev/crm/${client.id}`} className="block">
                                            <h3 className="text-lg font-bold text-[var(--text-primary)] group-hover:text-[#e8c559] transition-colors line-clamp-1 mb-1">
                                                {client.company_name}
                                            </h3>
                                        </Link>
                                    </div>
                                    {/* HIDDEN EDIT MENU 
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => openEditForm(client)}
                                            className="p-1.5 text-[var(--text-secondary)] hover:text-[#e8c559] hover:bg-[#e8c559]/10 rounded-lg transition-colors"
                                        >
                                            <MoreHorizontal className="w-5 h-5" />
                                        </button>
                                    </div>
                                    */}
                                </div>

                                {/* Contact Person */}
                                <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                        {primaryContact?.name?.charAt(0) || <User className="w-5 h-5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                                            {primaryContact?.name || "No Conctact"}
                                        </p>
                                        <p className="text-xs text-[var(--text-secondary)] truncate">
                                            {primaryContact?.position || "Position not set"}
                                        </p>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="mt-auto pt-4 border-t border-[var(--glass-border)] flex items-center justify-between">
                                    <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                                        {primaryContact?.email && (
                                            <a href={`mailto:${primaryContact.email}`} className="hover:text-[#e8c559] transition-colors">
                                                <Mail className="w-4 h-4" />
                                            </a>
                                        )}
                                        {primaryContact?.phone && (
                                            <a href={`tel:${primaryContact.phone}`} className="hover:text-[#e8c559] transition-colors">
                                                <Phone className="w-4 h-4" />
                                            </a>
                                        )}
                                    </div>
                                    <Link href={`/dashboard/bisdev/crm/${client.id}`} className="flex items-center gap-1 text-xs font-medium hover:text-[#e8c559] transition-colors ml-2">
                                        Details <ChevronRight className="w-3 h-3" />
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* List View (Table) */
                <div className="bg-white dark:bg-[#1c2120] rounded-2xl border border-[var(--glass-border)] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[var(--glass-bg)] border-b border-[var(--glass-border)]">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-[var(--text-primary)]">Company/Name</th>
                                    <th className="px-6 py-4 font-semibold text-[var(--text-primary)]">Type</th>
                                    <th className="px-6 py-4 font-semibold text-[var(--text-primary)]">Category</th>
                                    <th className="px-6 py-4 font-semibold text-[var(--text-primary)]">Contact</th>
                                    <th className="px-6 py-4 font-semibold text-[var(--text-primary)]">Tags</th>
                                    <th className="px-6 py-4 font-semibold text-[var(--text-primary)] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--glass-border)]">
                                {filteredClients.map((client) => {
                                    const primaryContact = client.contacts?.find(c => c.is_primary) || client.contacts?.[0];
                                    return (
                                        <tr key={client.id} className="hover:bg-[var(--glass-bg)] transition-colors">
                                            <td className="px-6 py-4">
                                                <Link href={`/dashboard/bisdev/crm/${client.id}`} className="font-semibold text-[var(--text-primary)] hover:text-[#e8c559]">
                                                    {client.company_name}
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4">
                                                {client.client_type && (
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold capitalize ${client.client_type === 'company'
                                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                                        : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                                                        }`}>
                                                        {client.client_type}
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${CATEGORY_CONFIG[client.category]?.color || "bg-gray-500"}`}>
                                                    {CATEGORY_CONFIG[client.category]?.label || client.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[var(--text-primary)] font-medium">{primaryContact?.name || "-"}</span>
                                                    <span className="text-xs text-[var(--text-secondary)]">{primaryContact?.email || primaryContact?.phone || "-"}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {client.tags && client.tags.map((t, i) => (
                                                        <span key={i} className="text-lg cursor-help" title={`${TAG_CONFIG[t.tag]?.label}${t.notes ? `: ${t.notes}` : ''}`}>
                                                            {TAG_CONFIG[t.tag]?.icon}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => openEditForm(client)}
                                                        className="p-2 text-[var(--text-secondary)] hover:text-[#e8c559] hover:bg-[#e8c559]/10 rounded-lg transition-colors"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(client.id)}
                                                        className="p-2 text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add/Edit Form Modal */}
            {
                showForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="w-full max-w-xl bg-white dark:bg-[#1c2120] rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between p-6 border-b border-[var(--glass-border)]">
                                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                                    {editingClient ? "Edit Client" : "Add New Client"}
                                </h2>
                                <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-black/10">
                                    <X className="h-5 w-5" />
                                </button>
                            </div >

                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                {/* Client Type */}
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Client Type</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="client_type"
                                                value="company"
                                                checked={formData.client_type === 'company'}
                                                onChange={() => setFormData({ ...formData, client_type: 'company' })}
                                                className="accent-[#e8c559]"
                                            />
                                            <span className="text-[var(--text-primary)]">Company</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="client_type"
                                                value="individual"
                                                checked={formData.client_type === 'individual'}
                                                onChange={() => setFormData({ ...formData, client_type: 'individual' })}
                                                className="accent-[#e8c559]"
                                            />
                                            <span className="text-[var(--text-primary)]">Individual</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Company Name */}
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">
                                        Company / Client Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.company_name}
                                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)]"
                                    />
                                </div>

                                {/* Category only - Stage removed (starts as prospect automatically) */}
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">
                                        Category
                                    </label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value as CRMCategory })}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)]"
                                    >
                                        {Object.entries(CATEGORY_CONFIG).map(([key, { label }]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Multi Contact Section */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-sm font-bold text-[var(--text-primary)]">
                                            Contact Person(s)
                                        </label>
                                        <button
                                            type="button"
                                            onClick={addContact}
                                            className="text-sm text-[#e8c559] hover:underline flex items-center gap-1"
                                        >
                                            <Plus className="w-4 h-4" /> Add Contact
                                        </button>
                                    </div>

                                    {contacts.map((contact, index) => (
                                        <div key={index} className="p-3 border border-[var(--glass-border)] rounded-xl space-y-3 bg-[var(--glass-bg)]">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-[var(--text-muted)]">
                                                    Contact #{index + 1} {index === 0 && "(Primary)"}
                                                </span>
                                                {contacts.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeContact(index)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <input
                                                    type="text"
                                                    placeholder="Name"
                                                    value={contact.name}
                                                    onChange={(e) => updateContact(index, 'name', e.target.value)}
                                                    className="w-full px-3 py-2 rounded-lg border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)] text-sm"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Position"
                                                    value={contact.position}
                                                    onChange={(e) => updateContact(index, 'position', e.target.value)}
                                                    className="w-full px-3 py-2 rounded-lg border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)] text-sm"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <input
                                                    type="email"
                                                    placeholder="Email"
                                                    value={contact.email}
                                                    onChange={(e) => updateContact(index, 'email', e.target.value)}
                                                    className="w-full px-3 py-2 rounded-lg border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)] text-sm"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Phone"
                                                    value={contact.phone}
                                                    onChange={(e) => updateContact(index, 'phone', e.target.value)}
                                                    className="w-full px-3 py-2 rounded-lg border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)] text-sm"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Source */}
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">
                                        Source
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Conference, Referral, Website"
                                        value={formData.source}
                                        onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)]"
                                    />
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">
                                        Notes
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)]"
                                    />
                                </div>

                                {/* Buttons */}
                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        className="px-4 py-2 rounded-xl border border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-black/5"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 rounded-xl bg-[#e8c559] text-[#171611] font-bold hover:bg-[#d4b44e]"
                                    >
                                        {editingClient ? "Update" : "Create"}
                                    </button>
                                </div>
                            </form>
                        </div >
                    </div >
                )
            }
        </div >
    );
}
