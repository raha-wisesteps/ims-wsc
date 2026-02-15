"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
    LayoutGrid,
    List,
    Plus,
    Search,
    Filter,
    FileDown,
    ChevronRight,
    Package, // Icon for Asset
    MapPin,
    Calendar,
    User,
    Tag,
    AlertCircle,
    CheckCircle2,
    Truck,
    Laptop,
    Armchair,
    BookOpen,
    Paperclip,
    Box
} from "lucide-react";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// --- CONFIGURATION ---

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
    furniture: { label: "Furniture", icon: Armchair, color: "bg-amber-500" },
    electronics: { label: "Electronics", icon: Laptop, color: "bg-blue-500" },
    books: { label: "Books & Stationery", icon: BookOpen, color: "bg-emerald-500" },
    office_supplies: { label: "Office Supplies", icon: Paperclip, color: "bg-purple-500" },
    vehicles: { label: "Vehicles", icon: Truck, color: "bg-red-500" },
    others: { label: "Others", icon: Box, color: "bg-gray-500" },
};

const CONDITION_CONFIG: Record<string, { label: string; color: string }> = {
    excellent: { label: "Excellent", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
    good: { label: "Good", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
    fair: { label: "Fair", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" },
    poor: { label: "Poor", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
    damaged: { label: "Damaged", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    available: { label: "Available", color: "bg-green-500" },
    in_use: { label: "In Use", color: "bg-blue-500" },
    maintenance: { label: "Maintenance", color: "bg-orange-500" },
    lost: { label: "Lost", color: "bg-red-500" },
    disposed: { label: "Disposed", color: "bg-gray-500" },
};

// --- TYPES ---

interface Asset {
    id: string;
    name: string;
    code: string;
    category: string;
    condition: string;
    status: string;
    location: string;
    purchase_value: number;
    acquisition_date: string;
    current_holder_id: string | null;
    current_holder?: { full_name: string }; // Join result
    description: string | null;
    image_url: string | null;
    created_at: string;
}

interface Employee {
    id: string;
    full_name: string;
}

export default function AssetManagementPage() {
    const supabase = createClient();
    const { profile, isLoading: authLoading } = useAuth(); // Assuming profile has necessary role info

    // State
    const [assets, setAssets] = useState<Asset[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [searchQuery, setSearchQuery] = useState("");

    // Filters
    const [filterCategory, setFilterCategory] = useState<string>("");
    const [filterStatus, setFilterStatus] = useState<string>("");
    const [filterCondition, setFilterCondition] = useState<string>("");

    // Modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        category: "electronics",
        condition: "good",
        acquisition_date: new Date().toISOString().split('T')[0],
        location: "",
        purchase_value: 0,
        existing_value: 0,
        current_holder_id: "",
        description: "",
        image_url: ""
    });

    // --- FETCH DATA ---

    useEffect(() => {
        if (!authLoading) {
            fetchAssets();
            fetchEmployees();
        }
    }, [authLoading]);

    const fetchAssets = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("operational_assets")
                .select(`
                    *,
                    current_holder:profiles!operational_assets_current_holder_id_fkey(full_name)
                `)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setAssets(data || []);
        } catch (error) {
            console.error("Error fetching assets:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            // Fetch employees excluding HR role as requested
            const { data, error } = await supabase
                .from("profiles")
                .select("id, full_name")
                .neq("role", "hr")
                .order("full_name");

            if (error) throw error;
            setEmployees(data || []);
        } catch (error) {
            console.error("Error fetching employees:", error);
        }
    };

    // --- HANDLERS ---

    const handleAddAsset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;

        try {
            const payload = {
                name: formData.name,
                category: formData.category,
                condition: formData.condition,
                status: formData.current_holder_id ? 'in_use' : 'available', // Auto-set status
                location: formData.location,
                purchase_value: formData.purchase_value,
                existing_value: formData.existing_value,
                acquisition_date: formData.acquisition_date,
                current_holder_id: formData.current_holder_id || null,
                description: formData.description || null,
                image_url: formData.image_url || null,
                created_by: profile.id
            };

            const { data: newAsset, error } = await supabase
                .from("operational_assets")
                .insert(payload)
                .select()
                .single();

            if (error) throw error;

            // Create Creation Log
            await supabase.from("operational_asset_logs").insert({
                asset_id: newAsset.id,
                action_type: 'creation',
                actor_id: profile.id,
                new_condition: formData.condition,
                notes: 'Initial asset creation'
            });

            // If assigned immediately, create Assignment Log
            if (formData.current_holder_id) {
                await supabase.from("operational_asset_logs").insert({
                    asset_id: newAsset.id,
                    action_type: 'assignment',
                    actor_id: profile.id,
                    new_holder_id: formData.current_holder_id,
                    notes: 'Assigned upon creation'
                });
            }

            setShowAddModal(false);
            setFormData({
                name: "",
                category: "electronics",
                condition: "good",
                acquisition_date: new Date().toISOString().split('T')[0],
                location: "",
                purchase_value: 0,
                existing_value: 0,
                current_holder_id: "",
                description: "",
                image_url: ""
            });
            fetchAssets();

        } catch (error) {
            console.error("Error adding asset:", error);
            alert("Failed to add asset.");
        }
    };

    const handleExport = () => {
        const exportData = filteredAssets.map(asset => ({
            "Code": asset.code,
            "Name": asset.name,
            "Category": CATEGORY_CONFIG[asset.category]?.label || asset.category,
            "Status": STATUS_CONFIG[asset.status]?.label || asset.status,
            "Condition": CONDITION_CONFIG[asset.condition]?.label || asset.condition,
            "Location": asset.location,
            "Value": asset.purchase_value,
            "Acquisition Date": asset.acquisition_date,
            "Holder": asset.current_holder?.full_name || "None",
            "Description": asset.description || ""
        }));

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(workbook, worksheet, "Assets");
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
        saveAs(data, `assets_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // --- FILTERING ---

    const filteredAssets = useMemo(() => {
        return assets.filter(asset => {
            const matchSearch =
                asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                asset.code?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchCategory = !filterCategory || asset.category === filterCategory;
            const matchStatus = !filterStatus || asset.status === filterStatus;
            const matchCondition = !filterCondition || asset.condition === filterCondition;

            return matchSearch && matchCategory && matchStatus && matchCondition;
        });
    }, [assets, searchQuery, filterCategory, filterStatus, filterCondition]);


    if (authLoading || isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e8c559]"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full space-y-6">

            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                        <Package className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-[var(--text-secondary)]">
                            <Link href="/dashboard" className="hover:text-[var(--text-primary)]">Dashboard</Link>
                            <ChevronRight className="h-4 w-4" />
                            <Link href="/dashboard/operational" className="hover:text-[var(--text-primary)]">Operational</Link>
                            <ChevronRight className="h-4 w-4" />
                            <span className="text-[var(--text-primary)]">Asset Management</span>
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Asset Database</h1>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Track and manage company assets, assignments, and conditions.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                        <FileDown className="h-4 w-4" />
                        <span className="hidden sm:inline">Export</span>
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#e8c559] text-[#171611] font-bold hover:bg-[#d4b44e] transition-colors shadow-lg shadow-amber-500/20"
                    >
                        <Plus className="h-4 w-4" />
                        Add Asset
                    </button>
                </div>
            </div>

            {/* --- CONTROLS --- */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex flex-wrap flex-1 gap-3 w-full">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            placeholder="Search asset name or code..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]"
                        />
                    </div>

                    {/* Filters */}
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]"
                    >
                        <option value="">All Categories</option>
                        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                            <option key={key} value={key}>{config.label}</option>
                        ))}
                    </select>

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]"
                    >
                        <option value="">All Statuses</option>
                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                            <option key={key} value={key}>{config.label}</option>
                        ))}
                    </select>

                    <select
                        value={filterCondition}
                        onChange={(e) => setFilterCondition(e.target.value)}
                        className="px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]"
                    >
                        <option value="">All Conditions</option>
                        {Object.entries(CONDITION_CONFIG).map(([key, config]) => (
                            <option key={key} value={key}>{config.label}</option>
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

            {/* --- CONTENT --- */}

            {filteredAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-20 h-20 bg-[var(--glass-bg)] rounded-full flex items-center justify-center mb-4">
                        <Package className="h-10 w-10 text-[var(--text-muted)]" />
                    </div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">No assets found</h3>
                    <p className="text-[var(--text-secondary)] max-w-sm">
                        Try adjusting your filters or add a new asset to get started.
                    </p>
                </div>
            ) : (
                <>
                    {viewMode === "grid" ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredAssets.map(asset => {
                                const CategoryIcon = CATEGORY_CONFIG[asset.category]?.icon || Box;
                                return (
                                    <Link key={asset.id} href={`/dashboard/operational/asset-management/${asset.id}`}>
                                        <div className="group h-full bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] rounded-2xl p-5 hover:border-[#e8c559] hover:shadow-lg transition-all duration-300 flex flex-col">

                                            {/* Top Row: Icon + Status */}
                                            <div className="flex justify-between items-start mb-4">
                                                <div className={`w-10 h-10 rounded-lg ${CATEGORY_CONFIG[asset.category]?.color || "bg-gray-500"} flex items-center justify-center`}>
                                                    <CategoryIcon className="h-5 w-5 text-white" />
                                                </div>
                                                <div className={`px-2 py-1 rounded-full text-xs font-bold text-white ${STATUS_CONFIG[asset.status]?.color || "bg-gray-500"}`}>
                                                    {STATUS_CONFIG[asset.status]?.label}
                                                </div>
                                            </div>

                                            {/* Main Info */}
                                            <div className="mb-4 flex-1">
                                                <p className="text-xs font-mono text-[var(--text-secondary)] mb-1">{asset.code || "PENDING"}</p>
                                                <h3 className="text-lg font-bold text-[var(--text-primary)] line-clamp-2 group-hover:text-[#e8c559] transition-colors">{asset.name}</h3>
                                            </div>

                                            {/* Meta Details */}
                                            <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${asset.current_holder ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                                                    <span className="truncate">{asset.current_holder?.full_name || "Unassigned"}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="h-4 w-4" />
                                                    <span className="truncate">{asset.location}</span>
                                                </div>
                                            </div>

                                            {/* Footer: Condition */}
                                            <div className="mt-4 pt-3 border-t border-[var(--glass-border)] flex justify-between items-center">
                                                <span className={`text-xs px-2 py-0.5 rounded-md ${CONDITION_CONFIG[asset.condition]?.color || 'bg-gray-100'}`}>
                                                    {CONDITION_CONFIG[asset.condition]?.label}
                                                </span>
                                                {asset.image_url && <Paperclip className="h-4 w-4 text-[var(--text-muted)]" />}
                                            </div>

                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-[#1c2120] rounded-2xl border border-[var(--glass-border)] overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-[var(--glass-bg)] border-b border-[var(--glass-border)] text-[var(--text-secondary)]">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold">Code</th>
                                            <th className="px-6 py-4 font-semibold">Asset Name</th>
                                            <th className="px-6 py-4 font-semibold">Category</th>
                                            <th className="px-6 py-4 font-semibold">Holder</th>
                                            <th className="px-6 py-4 font-semibold">Status</th>
                                            <th className="px-6 py-4 font-semibold">Condition</th>
                                            <th className="px-6 py-4 font-semibold">Location</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--glass-border)]">
                                        {filteredAssets.map(asset => (
                                            <tr key={asset.id} className="hover:bg-[var(--glass-bg)] transition-colors">
                                                <td className="px-6 py-4 font-mono text-[var(--text-secondary)]">
                                                    <Link href={`/dashboard/operational/asset-management/${asset.id}`} className="hover:underline">
                                                        {asset.code}
                                                    </Link>
                                                </td>
                                                <td className="px-6 py-4 font-semibold text-[var(--text-primary)]">
                                                    <Link href={`/dashboard/operational/asset-management/${asset.id}`} className="hover:text-[#e8c559]">
                                                        {asset.name}
                                                    </Link>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {CATEGORY_CONFIG[asset.category]?.label}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {asset.current_holder?.full_name || "-"}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold text-white ${STATUS_CONFIG[asset.status]?.color}`}>
                                                        {STATUS_CONFIG[asset.status]?.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-xs ${CONDITION_CONFIG[asset.condition]?.color}`}>
                                                        {CONDITION_CONFIG[asset.condition]?.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {asset.location}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* --- ADD MODAL --- */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl bg-white dark:bg-[#1c2120] rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-[var(--glass-border)]">
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">Add New Asset</h2>
                            <button onClick={() => setShowAddModal(false)} className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10">
                                <span className="sr-only">Close</span>
                                <Plus className="h-5 w-5 rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleAddAsset} className="p-6 space-y-6">

                            {/* Grid Layout for compact form */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Asset Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]"
                                        placeholder="e.g. MacBook Pro M3, High-Back Ergonomic Chair"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Category *</label>
                                    <select
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]"
                                    >
                                        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                                            <option key={key} value={key}>{config.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Condition *</label>
                                    <select
                                        value={formData.condition}
                                        onChange={e => setFormData({ ...formData, condition: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]"
                                    >
                                        {Object.entries(CONDITION_CONFIG).map(([key, config]) => (
                                            <option key={key} value={key}>{config.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Acquisition Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.acquisition_date}
                                        onChange={e => setFormData({ ...formData, acquisition_date: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]"
                                    />
                                    <p className="text-xs text-[var(--text-secondary)] mt-1">Used for Asset Code Generation</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Purchase Value</label>
                                    <input
                                        type="number"
                                        value={formData.purchase_value || ""}
                                        onChange={e => setFormData({ ...formData, purchase_value: Number(e.target.value) })}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]"
                                        min="0"
                                    />
                                    {formData.purchase_value > 0 && (
                                        <p className="text-xs text-[#e8c559] mt-1 font-mono">
                                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(formData.purchase_value)}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Existing Value</label>
                                    <input
                                        type="number"
                                        value={formData.existing_value || ""}
                                        onChange={e => setFormData({ ...formData, existing_value: Number(e.target.value) })}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]"
                                        min="0"
                                    />
                                    <p className="text-xs text-[var(--text-secondary)] mt-1">Current estimated value</p>
                                    {formData.existing_value > 0 && (
                                        <p className="text-xs text-[#e8c559] mt-1 font-mono">
                                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(formData.existing_value)}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Location *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.location}
                                        onChange={e => setFormData({ ...formData, location: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]"
                                        placeholder="e.g. Main Office, Warehouse A"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Used By (Optional)</label>
                                    <select
                                        value={formData.current_holder_id}
                                        onChange={e => setFormData({ ...formData, current_holder_id: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]"
                                    >
                                        <option value="">-- Available / No Holder --</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Photo / GDrive Link (Optional)</label>
                                    <div className="flex items-center gap-2">
                                        <Paperclip className="h-4 w-4 text-[var(--text-secondary)]" />
                                        <input
                                            type="url"
                                            value={formData.image_url}
                                            onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                                            className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]"
                                            placeholder="https://drive.google.com/..."
                                        />
                                    </div>
                                </div>

                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Notes (Optional)</label>
                                    <textarea
                                        rows={3}
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)] resize-none"
                                        placeholder="Additional details, SN, model number..."
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--glass-border)]">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 rounded-xl text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 rounded-xl bg-[#e8c559] text-[#171611] font-bold hover:bg-[#d4b44e] transition-colors"
                                >
                                    Save Asset
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
