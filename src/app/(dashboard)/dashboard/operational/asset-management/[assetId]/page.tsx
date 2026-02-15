"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
    ChevronRight,
    ArrowLeft,
    Edit3,
    Trash2,
    Package,
    MapPin,
    Calendar,
    User,
    Tag,
    History,
    CheckCircle2,
    AlertTriangle,
    Wrench,
    RefreshCw,
    X,
    ExternalLink,
    Armchair,
    Laptop,
    BookOpen,
    Paperclip,
    Truck,
    Box,
    FileText
} from "lucide-react";

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
    existing_value: number;
    acquisition_date: string;
    current_holder_id: string | null;
    current_holder?: { full_name: string };
    description: string | null;
    image_url: string | null;
    created_at: string;
    updated_at: string;
    created_by: string;
}

interface AssetLog {
    id: string;
    action_type: string;
    created_at: string;
    notes: string | null;
    actor?: { full_name: string };
    previous_holder?: { full_name: string };
    new_holder?: { full_name: string };
    previous_condition: string | null;
    new_condition: string | null;
}

interface Employee {
    id: string;
    full_name: string;
}

export default function AssetDetailPage() {
    const params = useParams();
    const router = useRouter();
    const assetId = params.assetId as string;
    const supabase = createClient();
    const { profile, isLoading: authLoading } = useAuth();

    // State
    const [asset, setAsset] = useState<Asset | null>(null);
    const [logs, setLogs] = useState<AssetLog[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Inline Editing State
    const [isEditingCondition, setIsEditingCondition] = useState(false);
    const [isEditingValues, setIsEditingValues] = useState(false);
    const [tempCondition, setTempCondition] = useState("");
    const [tempValues, setTempValues] = useState({ purchase_value: 0, existing_value: 0 });

    // Modals
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);

    // Forms
    const [editForm, setEditForm] = useState<any>({});
    const [actionForm, setActionForm] = useState({
        holder_id: "",
        notes: ""
    });

    // Access Control
    const canEdit = profile && (
        ['ceo', 'super_admin', 'hr'].includes(profile.role) ||
        (asset?.created_by === profile.id)
    );

    // --- FETCH DATA ---

    useEffect(() => {
        if (!authLoading && assetId) {
            fetchAssetDetails();
            fetchEmployees();
        }
    }, [authLoading, assetId]);

    const fetchAssetDetails = async () => {
        setIsLoading(true);
        try {
            // Fetch Asset
            const { data: assetData, error: assetError } = await supabase
                .from("operational_assets")
                .select(`
                    *,
                    current_holder:profiles!operational_assets_current_holder_id_fkey(full_name)
                `)
                .eq("id", assetId)
                .single();

            if (assetError) throw assetError;
            setAsset(assetData);
            setEditForm(assetData); // Init edit form

            // Fetch Logs
            const { data: logsData, error: logsError } = await supabase
                .from("operational_asset_logs")
                .select(`
                    *,
                    actor:profiles!operational_asset_logs_actor_id_fkey(full_name),
                    previous_holder:profiles!operational_asset_logs_previous_holder_id_fkey(full_name),
                    new_holder:profiles!operational_asset_logs_new_holder_id_fkey(full_name)
                `)
                .eq("asset_id", assetId)
                .order("created_at", { ascending: false });

            if (logsError) throw logsError;
            setLogs(logsData || []);

        } catch (error) {
            console.error("Error fetching asset details:", error);
            // router.push("/dashboard/operational/asset-management"); // Optional: redirect on error
        } finally {
            setIsLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
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

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this asset? This action cannot be undone.")) return;
        try {
            const { error } = await supabase.from("operational_assets").delete().eq("id", assetId);
            if (error) throw error;
            router.push("/dashboard/operational/asset-management");
        } catch (error) {
            console.error("Error deleting asset:", error);
            alert("Failed to delete asset. You might not have permission.");
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { error } = await supabase
                .from("operational_assets")
                .update({
                    name: editForm.name,
                    category: editForm.category,
                    location: editForm.location,
                    purchase_value: editForm.purchase_value,
                    acquisition_date: editForm.acquisition_date,
                    description: editForm.description,
                    image_url: editForm.image_url,
                    updated_at: new Date().toISOString()
                })
                .eq("id", assetId);

            if (error) throw error;

            // Log update
            await supabase.from("operational_asset_logs").insert({
                asset_id: assetId,
                action_type: 'update',
                actor_id: profile?.id,
                notes: 'Asset details updated'
            });

            setShowEditModal(false);
            fetchAssetDetails();
        } catch (error) {
            console.error("Error updating asset:", error);
            alert("Failed to update asset.");
        }
    };

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile || !actionForm.holder_id) return;

        try {
            // Update Asset
            const { error: assetError } = await supabase
                .from("operational_assets")
                .update({
                    current_holder_id: actionForm.holder_id,
                    status: 'in_use',
                    updated_at: new Date().toISOString()
                })
                .eq("id", assetId);
            if (assetError) throw assetError;

            // Log Assignment
            await supabase.from("operational_asset_logs").insert({
                asset_id: assetId,
                action_type: 'assignment',
                actor_id: profile.id,
                previous_holder_id: asset?.current_holder_id || null,
                new_holder_id: actionForm.holder_id,
                notes: actionForm.notes || 'Asset assigned'
            });

            setShowAssignModal(false);
            setActionForm({ holder_id: "", notes: "" });
            fetchAssetDetails();
        } catch (error) {
            console.error("Error creating assignment:", error);
            alert("Failed to assign asset.");
        }
    };

    const handleReturn = async () => {
        if (!confirm("Confirm asset return?")) return;
        if (!profile) return;

        try {
            const { error: assetError } = await supabase
                .from("operational_assets")
                .update({
                    current_holder_id: null,
                    status: 'available',
                    updated_at: new Date().toISOString()
                })
                .eq("id", assetId);
            if (assetError) throw assetError;

            await supabase.from("operational_asset_logs").insert({
                asset_id: assetId,
                action_type: 'return',
                actor_id: profile.id,
                previous_holder_id: asset?.current_holder_id,
                notes: 'Asset returned to storage'
            });

            fetchAssetDetails();
        } catch (error) {
            console.error("Error returning asset:", error);
            alert("Failed to return asset.");
        }
    };

    const handleSaveCondition = async () => {
        if (!profile || !tempCondition) return;

        try {
            const { error: assetError } = await supabase
                .from("operational_assets")
                .update({
                    condition: tempCondition,
                    updated_at: new Date().toISOString()
                })
                .eq("id", assetId);
            if (assetError) throw assetError;

            await supabase.from("operational_asset_logs").insert({
                asset_id: assetId,
                action_type: 'maintenance',
                actor_id: profile.id,
                previous_condition: asset?.condition,
                new_condition: tempCondition,
                notes: 'Condition updated directly'
            });

            setIsEditingCondition(false);
            fetchAssetDetails();
        } catch (error) {
            console.error("Error updating condition:", error);
            alert("Failed to update condition.");
        }
    };

    const handleSaveValues = async () => {
        if (!profile) return;

        try {
            const { error: assetError } = await supabase
                .from("operational_assets")
                .update({
                    purchase_value: tempValues.purchase_value,
                    existing_value: tempValues.existing_value,
                    updated_at: new Date().toISOString()
                })
                .eq("id", assetId);
            if (assetError) throw assetError;

            await supabase.from("operational_asset_logs").insert({
                asset_id: assetId,
                action_type: 'update',
                actor_id: profile.id,
                notes: 'Asset values updated directly'
            });

            setIsEditingValues(false);
            fetchAssetDetails();
        } catch (error) {
            console.error("Error updating values:", error);
            alert("Failed to update values.");
        }
    };


    if (authLoading || isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e8c559]"></div>
            </div>
        );
    }

    if (!asset) return <div className="p-8 text-center text-red-500">Asset not found.</div>;

    const CategoryIcon = CATEGORY_CONFIG[asset.category]?.icon || Box;

    return (
        <div className="flex flex-col h-full space-y-6 max-w-7xl mx-auto">

            {/* --- HEADER --- */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 mb-1 text-sm text-[var(--text-secondary)]">
                    <Link href="/dashboard" className="hover:text-[var(--text-primary)]">Dashboard</Link>
                    <ChevronRight className="h-4 w-4" />
                    <Link href="/dashboard/operational" className="hover:text-[var(--text-primary)]">Operational</Link>
                    <ChevronRight className="h-4 w-4" />
                    <Link href="/dashboard/operational/asset-management" className="hover:text-[var(--text-primary)]">Asset Management</Link>
                    <ChevronRight className="h-4 w-4" />
                    <span className="text-[var(--text-primary)]">{asset.code}</span>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/operational/asset-management" className="p-2 rounded-xl bg-[var(--glass-bg)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                            <ArrowLeft className="h-6 w-6 text-[var(--text-primary)]" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                                {asset.name}
                                <span className={`text-sm px-3 py-1 rounded-full font-bold text-white ${STATUS_CONFIG[asset.status]?.color}`}>
                                    {STATUS_CONFIG[asset.status]?.label}
                                </span>
                            </h1>
                            <p className="font-mono text-[var(--text-secondary)] mt-1">{asset.code}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {canEdit && (
                            <>
                                <button
                                    onClick={() => setShowEditModal(true)}
                                    className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)] rounded-xl transition-colors"
                                    title="Edit Details"
                                >
                                    <Edit3 className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="p-2 text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                                    title="Delete Asset"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* --- LEFT COLUMN: DETAILS --- */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Main Info Card */}
                    <div className="bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className={`p-3 rounded-xl ${CATEGORY_CONFIG[asset.category]?.color || "bg-gray-500"}`}>
                                <CategoryIcon className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-[var(--text-primary)]">Asset Information</h3>
                                <p className="text-sm text-[var(--text-secondary)]">General details and specifications</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Category</label>
                                <p className="text-[var(--text-primary)] font-medium">{CATEGORY_CONFIG[asset.category]?.label || asset.category}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Condition</label>
                                <div className="flex items-center gap-2">
                                    {isEditingCondition ? (
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={tempCondition}
                                                onChange={(e) => setTempCondition(e.target.value)}
                                                className="px-2 py-1 text-sm rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]"
                                            >
                                                {Object.entries(CONDITION_CONFIG).map(([key, config]) => (
                                                    <option key={key} value={key}>{config.label}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={handleSaveCondition}
                                                className="p-1 rounded-full bg-green-500/20 text-green-500 hover:bg-green-500/30"
                                            >
                                                <CheckCircle2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => setIsEditingCondition(false)}
                                                className="p-1 rounded-full bg-red-500/20 text-red-500 hover:bg-red-500/30"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded text-sm font-bold ${CONDITION_CONFIG[asset.condition]?.color}`}>
                                                {CONDITION_CONFIG[asset.condition]?.label}
                                            </span>
                                            {canEdit && (
                                                <button
                                                    onClick={() => {
                                                        setTempCondition(asset.condition);
                                                        setIsEditingCondition(true);
                                                    }}
                                                    className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                                >
                                                    <Edit3 className="h-3 w-3" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Location</label>
                                <div className="flex items-center gap-2 text-[var(--text-primary)]">
                                    <MapPin className="h-4 w-4 text-[var(--text-secondary)]" />
                                    {asset.location}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
                                    Value Information
                                    {canEdit && !isEditingValues && (
                                        <button
                                            onClick={() => {
                                                setTempValues({
                                                    purchase_value: asset.purchase_value,
                                                    existing_value: asset.existing_value || 0
                                                });
                                                setIsEditingValues(true);
                                            }}
                                            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1"
                                            title="Update Values"
                                        >
                                            <Edit3 className="h-3 w-3" />
                                        </button>
                                    )}
                                </label>

                                {isEditingValues ? (
                                    <div className="bg-[var(--glass-bg)] p-3 rounded-xl border border-[var(--glass-border)] space-y-3">
                                        <div>
                                            <label className="text-[10px] uppercase text-[var(--text-secondary)] font-bold">Purchase Value</label>
                                            <input
                                                type="number"
                                                value={tempValues.purchase_value || ""}
                                                onChange={(e) => setTempValues({ ...tempValues, purchase_value: Number(e.target.value) })}
                                                className="w-full px-2 py-1 text-sm rounded-lg border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] text-[var(--text-primary)]"
                                                placeholder="Purchase Value"
                                            />
                                            {tempValues.purchase_value > 0 && (
                                                <p className="text-xs text-[#e8c559] mt-0.5 font-mono">
                                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(tempValues.purchase_value)}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase text-[var(--text-secondary)] font-bold">Existing Value</label>
                                            <input
                                                type="number"
                                                value={tempValues.existing_value || ""}
                                                onChange={(e) => setTempValues({ ...tempValues, existing_value: Number(e.target.value) })}
                                                className="w-full px-2 py-1 text-sm rounded-lg border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] text-[var(--text-primary)]"
                                                placeholder="Existing Value"
                                            />
                                            {tempValues.existing_value > 0 && (
                                                <p className="text-xs text-[#e8c559] mt-0.5 font-mono">
                                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(tempValues.existing_value)}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex justify-end gap-2 pt-1 border-t border-[var(--glass-border)]">
                                            <button
                                                onClick={() => setIsEditingValues(false)}
                                                className="px-3 py-1 text-xs rounded-lg hover:bg-black/5 text-[var(--text-secondary)]"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSaveValues}
                                                className="px-3 py-1 text-xs rounded-lg bg-[#e8c559] text-[#171611] font-bold shadow-lg shadow-amber-500/20"
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-xs text-[var(--text-secondary)] block">Purchase Value</span>
                                            <div className="text-[var(--text-primary)] font-mono">
                                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(asset.purchase_value)}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-xs text-[var(--text-secondary)] block">Existing Value</span>
                                            <div className="text-[var(--text-primary)] font-mono">
                                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(asset.existing_value || 0)}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Acquisition Date</label>
                                <div className="flex items-center gap-2 text-[var(--text-primary)]">
                                    <Calendar className="h-4 w-4 text-[var(--text-secondary)]" />
                                    {new Date(asset.acquisition_date).toLocaleDateString()}
                                </div>
                            </div>
                            {asset.image_url && (
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Attachments</label>
                                    <a
                                        href={asset.image_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-[#e8c559] hover:underline w-fit"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                        View Photo / Document
                                    </a>
                                </div>
                            )}
                            <div className="md:col-span-2 space-y-1">
                                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Description / Notes</label>
                                <p className="text-[var(--text-primary)] whitespace-pre-wrap text-sm leading-relaxed">
                                    {asset.description || "No description provided."}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Log Book */}
                    <div className="bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 rounded-xl bg-indigo-500">
                                <History className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-[var(--text-primary)]">Log Book (History)</h3>
                                <p className="text-sm text-[var(--text-secondary)]">Track history of assignments and changes</p>
                            </div>
                        </div>

                        <div className="relative border-l-2 border-[var(--glass-border)] ml-3 space-y-8">
                            {logs.map((log) => (
                                <div key={log.id} className="relative pl-8">
                                    {/* Dot */}
                                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white dark:bg-[#1c2120] border-2 border-indigo-500"></div>

                                    <div className="flex flex-col gap-1">
                                        <div className="text-xs text-[var(--text-secondary)] font-mono">
                                            {new Date(log.created_at).toLocaleString()}
                                        </div>
                                        <div className="font-bold text-[var(--text-primary)] capitalize">
                                            {log.action_type.replace('_', ' ')}
                                        </div>

                                        {/* Dynamic Content based on action */}
                                        <div className="text-sm text-[var(--text-secondary)]">
                                            {log.action_type === 'assignment' && (
                                                <span>
                                                    Assigned to <span className="text-[var(--text-primary)] font-medium">{log.new_holder?.full_name}</span> by {log.actor?.full_name}
                                                </span>
                                            )}
                                            {log.action_type === 'return' && (
                                                <span>
                                                    Returned from <span className="text-[var(--text-primary)] font-medium">{log.previous_holder?.full_name}</span> by {log.actor?.full_name}
                                                </span>
                                            )}
                                            {log.action_type === 'maintenance' && (
                                                <span>
                                                    Condition changed from <span className="font-medium">{log.previous_condition}</span> to <span className={`font-medium ${CONDITION_CONFIG[log.new_condition || '']?.color}`}>{log.new_condition}</span>
                                                </span>
                                            )}
                                            {log.action_type === 'creation' && (
                                                <span>Created by {log.actor?.full_name}</span>
                                            )}
                                            {log.action_type === 'update' && (
                                                <span>Details updated by {log.actor?.full_name}</span>
                                            )}
                                        </div>

                                        {log.notes && (
                                            <div className="mt-2 text-xs bg-[var(--glass-bg)] p-2 rounded-lg italic">
                                                "{log.notes}"
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {logs.length === 0 && (
                                <p className="pl-6 text-[var(--text-secondary)] italic">No history available.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- RIGHT COLUMN: ACTIONS --- */}
                <div className="space-y-6">

                    {/* Holder Card */}
                    <div className="bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <User className="h-5 w-5 text-[var(--text-primary)]" />
                            <h3 className="font-bold text-[var(--text-primary)]">Current Holder</h3>
                        </div>

                        {asset.current_holder ? (
                            <div className="bg-[var(--glass-bg)] p-4 rounded-xl border border-[var(--glass-border)]">
                                <div className="font-bold text-lg text-[var(--text-primary)] mb-1">
                                    {asset.current_holder.full_name}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                    Currently using since {new Date(asset.updated_at).toLocaleDateString()}
                                </div>
                                <div className="mt-4 pt-4 border-t border-[var(--glass-border)]">
                                    <button
                                        onClick={handleReturn}
                                        className="w-full py-2 rounded-lg border border-red-500 text-red-500 hover:bg-red-500/10 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw className="h-4 w-4" /> Return Asset
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-[var(--glass-bg)] p-6 rounded-xl border border-[var(--glass-border)] border-dashed flex flex-col items-center justify-center text-center">
                                <p className="text-[var(--text-secondary)] mb-4">This asset is currently available.</p>
                                <button
                                    onClick={() => setShowAssignModal(true)}
                                    className="px-4 py-2 rounded-lg bg-[#e8c559] text-[#171611] font-bold hover:bg-[#d4b44e] transition-colors w-full"
                                >
                                    Assign to Employee
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- MODALS --- */}

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl bg-white dark:bg-[#1c2120] rounded-2xl shadow-2xl p-6">
                        <div className="flex items-center justify-between mb-6 border-b border-[var(--glass-border)] pb-4">
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">Edit Asset</h2>
                            <button onClick={() => setShowEditModal(false)}><X className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-1">Name</label>
                                    <input required type="text" value={editForm.name || ""} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">Category</label>
                                    <select value={editForm.category || ""} onChange={e => setEditForm({ ...editForm, category: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]">
                                        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => <option key={key} value={key}>{config.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">Location</label>
                                    <input required type="text" value={editForm.location || ""} onChange={e => setEditForm({ ...editForm, location: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">Purchase Value</label>
                                    <input type="number" value={editForm.purchase_value || ""} onChange={e => setEditForm({ ...editForm, purchase_value: Number(e.target.value) })} className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">Acquisition Date</label>
                                    <input required type="date" value={editForm.acquisition_date ? new Date(editForm.acquisition_date).toISOString().split('T')[0] : ""} onChange={e => setEditForm({ ...editForm, acquisition_date: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold mb-1">Image URL</label>
                                    <input type="url" value={editForm.image_url || ""} onChange={e => setEditForm({ ...editForm, image_url: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold mb-1">Description</label>
                                    <textarea rows={3} value={editForm.description || ""} onChange={e => setEditForm({ ...editForm, description: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 rounded-xl hover:bg-black/5">Cancel</button>
                                <button type="submit" className="px-6 py-2 rounded-xl bg-[#e8c559] text-[#171611] font-bold">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assign Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md bg-white dark:bg-[#1c2120] rounded-2xl shadow-2xl p-6">
                        <h2 className="text-xl font-bold mb-4 text-[var(--text-primary)]">Assign Asset</h2>
                        <form onSubmit={handleAssign} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-1">Select Employee</label>
                                <select required value={actionForm.holder_id} onChange={e => setActionForm({ ...actionForm, holder_id: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]">
                                    <option value="">-- Select Employee --</option>
                                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Notes (Optional)</label>
                                <textarea rows={2} value={actionForm.notes} onChange={e => setActionForm({ ...actionForm, notes: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]" placeholder="e.g. Assigned for temporary project" />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setShowAssignModal(false)} className="px-4 py-2 rounded-xl hover:bg-black/5">Cancel</button>
                                <button type="submit" className="px-6 py-2 rounded-xl bg-[#e8c559] text-[#171611] font-bold">Assign</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}



        </div>
    );
}

