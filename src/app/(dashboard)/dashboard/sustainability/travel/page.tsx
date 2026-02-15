"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
    Plane,
    Plus,
    Search,
    LayoutGrid,
    List as ListIcon,
    Settings,
    Download,
    ChevronRight,
    Leaf,
    Loader2,
    Save,
    X,
    User,
    MoreVertical,
    Edit3,
    Trash2
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { cn } from "@/lib/utils";

// Configs
const ACTIVITY_TYPE_LABELS: Record<string, string> = {
    meeting_client: "Meeting Client",
    project_related: "Project Related",
    site_visit: "Site Visit",
    training_conference: "Training",
    event_exhibition: "Event",
    guest_speaker: "Speaker",
    internal_meeting: "Internal",
    others: "Others",
};

// Types
interface TravelActivity {
    id: string;
    title: string;
    description: string;
    total_emission: number;
    total_distance: number;
    log_count: number;
    created_at: string;
    created_by: string;
    creator?: {
        full_name: string;
        avatar_url: string;
    };
    travel_logs: {
        activity_type: string;
    }[];
}

interface EmissionConfig {
    id: string;
    config_key: string;
    config_label: string;
    emission_factor: number;
    updated_at: string;
}

export default function TravelPage() {
    const supabase = createClient();
    const router = useRouter();
    const { profile, isLoading: authLoading } = useAuth();

    // State
    const [activities, setActivities] = useState<TravelActivity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [searchQuery, setSearchQuery] = useState("");

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [activeActionDropdown, setActiveActionDropdown] = useState<string | null>(null);
    const [editingActivityId, setEditingActivityId] = useState<string | null>(null);

    // Form Data
    const [newActivity, setNewActivity] = useState({ title: "", description: "" });
    const [isSaving, setIsSaving] = useState(false);

    // Settings Data
    const [configs, setConfigs] = useState<EmissionConfig[]>([]);
    const [editedConfigs, setEditedConfigs] = useState<Record<string, number>>({});
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    // Fetch Data
    const fetchActivities = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('travel_activities')
                .select(`
                    *,
                    creator:created_by(full_name, avatar_url),
                    travel_logs(activity_type)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setActivities(data || []);
        } catch (error) {
            console.error("Error fetching activities:", error);
            toast.error("Failed to load activities");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchConfigs = async () => {
        try {
            const { data, error } = await supabase
                .from('travel_emission_config')
                .select('*')
                .order('config_key');

            if (error) throw error;
            setConfigs(data || []);
            // Initialize edit state
            const editState: Record<string, number> = {};
            data?.forEach((c: EmissionConfig) => {
                editState[c.id] = c.emission_factor;
            });
            setEditedConfigs(editState);
        } catch (error) {
            toast.error("Failed to load settings");
        }
    };

    useEffect(() => {
        if (!authLoading) {
            fetchActivities();
        }
    }, [authLoading]);

    // Derived State
    const filteredActivities = useMemo(() => {
        return activities.filter(act =>
            act.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            act.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [activities, searchQuery]);

    const stats = useMemo(() => {
        return activities.reduce((acc, act) => ({
            totalEmission: acc.totalEmission + (act.total_emission || 0),
            totalDistance: acc.totalDistance + (act.total_distance || 0),
            logCount: acc.logCount + (act.log_count || 0)
        }), { totalEmission: 0, totalDistance: 0, logCount: 0 });
    }, [activities]);

    // Handlers
    const handleCreateActivity = async () => {
        if (!newActivity.title) {
            toast.error("Title is required");
            return;
        }
        setIsSaving(true);
        try {
            if (editingActivityId) {
                const { error } = await supabase
                    .from('travel_activities')
                    .update({
                        title: newActivity.title,
                        description: newActivity.description,
                    })
                    .eq('id', editingActivityId);

                if (error) throw error;
                toast.success("Activity updated");
            } else {
                const { error } = await supabase
                    .from('travel_activities')
                    .insert({
                        title: newActivity.title,
                        description: newActivity.description,
                        created_by: profile?.id
                    });

                if (error) throw error;
                toast.success("Activity created");
            }

            setShowAddModal(false);
            setNewActivity({ title: "", description: "" });
            setEditingActivityId(null);
            fetchActivities();
        } catch (error) {
            toast.error(editingActivityId ? "Failed to update activity" : "Failed to create activity");
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditActivity = (act: TravelActivity) => {
        setNewActivity({ title: act.title, description: act.description });
        setEditingActivityId(act.id);
        setShowAddModal(true);
        setActiveActionDropdown(null);
    };

    const handleDeleteActivity = async (id: string) => {
        if (!confirm("Are you sure? This will delete the activity and ALL associated logs.")) return;
        try {
            const { error } = await supabase.from('travel_activities').delete().eq('id', id);
            if (error) throw error;
            toast.success("Activity deleted");
            fetchActivities();
            setActiveActionDropdown(null);
        } catch (error) {
            toast.error("Failed to delete activity");
        }
    };


    const handleSaveSettings = async () => {
        setIsSavingSettings(true);
        try {
            // Use existing configs to ensure all required fields are present for upsert
            const updates = configs.map(c => ({
                id: c.id,
                config_key: c.config_key,
                config_label: c.config_label,
                emission_factor: editedConfigs[c.id] ?? c.emission_factor,
                updated_at: new Date().toISOString()
            }));

            const { error } = await supabase
                .from('travel_emission_config')
                .upsert(updates);

            if (error) throw error;

            toast.success("Settings updated");
            setShowSettingsModal(false);
            fetchConfigs(); // Refresh
        } catch (error) {
            console.error(error);
            toast.error("Failed to update settings");
        } finally {
            setIsSavingSettings(false);
        }
    };

    const handleExport = async () => {
        try {
            const { data: logsData, error } = await supabase
                .from('travel_logs')
                .select(`
                    *,
                    activity:activity_id(title),
                    creator:created_by(full_name)
                `);

            if (error) throw error;
            if (!logsData || logsData.length === 0) {
                toast.error("No data to export");
                return;
            }

            // Sheet 1: Activities Summary
            const summaryData = activities.map(act => ({
                "Activity Title": act.title,
                "Description": act.description,
                "Created Date": new Date(act.created_at).toLocaleDateString(),
                "Created By": act.creator?.full_name || "Unknown",
                "Total Emission (kgCO2)": act.total_emission,
                "Total Distance (km)": act.total_distance,
                "Log Count": act.log_count
            }));

            // Sheet 2: Detailed Logs (Type check via explicit any/interface if needed, or inferred)
            const detailedData = logsData.map((log: any) => ({
                "Date": new Date(log.travel_date).toLocaleDateString(),
                "Activity": log.activity?.title,
                "Transport Mode": log.transport_mode,
                "Subtype": log.transport_subtype,
                "Origin": log.origin,
                "Destination": log.destination,
                "Distance (km)": log.distance_km,
                "Total Emission (kgCO2)": log.total_emission,
                "Emission/Person": log.emission_per_person,
                "Jumlah Orang": log.passenger_count,
                "Logged By": log.creator?.full_name,
                "Notes": log.notes
            }));

            const wb = XLSX.utils.book_new();
            const ws1 = XLSX.utils.json_to_sheet(summaryData);
            const ws2 = XLSX.utils.json_to_sheet(detailedData);

            XLSX.utils.book_append_sheet(wb, ws1, "Activities Summary");
            XLSX.utils.book_append_sheet(wb, ws2, "Detailed Logs");

            const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
            const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            saveAs(blob, `Travel_Emission_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success("Exported successfully");

        } catch (error) {
            console.error(error);
            toast.error("Export failed");
        }
    };

    // Permission check for settings
    const canEditSettings = useMemo(() => {
        return ['ceo', 'super_admin', 'hr'].includes(profile?.role || "");
    }, [profile]);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Plane className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-[var(--text-secondary)]">
                            <Link href="/dashboard" className="hover:text-[var(--text-primary)]">Dashboard</Link>
                            <ChevronRight className="h-4 w-4" />
                            <Link href="/dashboard/sustainability" className="hover:text-[var(--text-primary)]">Sustainability</Link>
                            <ChevronRight className="h-4 w-4" />
                            <span className="text-[var(--text-primary)]">Travel Log</span>
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Travel Logs</h1>
                        <p className="text-sm text-[var(--text-secondary)]">
                            {activities.length} activities logged
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {canEditSettings && (
                        <button
                            onClick={() => {
                                fetchConfigs();
                                setShowSettingsModal(true);
                            }}
                            className="p-2 rounded-xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[#e8c559] transition-colors"
                            title="Configurations"
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                    )}
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[#e8c559] transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Export</span>
                    </button>
                    <button
                        onClick={() => {
                            setEditingActivityId(null);
                            setNewActivity({ title: "", description: "" });
                            setShowAddModal(true);
                        }}

                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#e8c559] text-[#171611] font-bold hover:bg-[#d4b44e] transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Add Activity
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 shrink-0" onClick={() => setActiveActionDropdown(null)}>
                <div className="glass-panel p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden shadow-sm">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Leaf className="w-24 h-24 text-emerald-500" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-emerald-600 dark:text-emerald-400 text-sm font-bold uppercase tracking-wider mb-2">Total Emission</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-[var(--text-primary)]">{stats.totalEmission.toFixed(1)}</span>
                            <span className="text-sm text-[var(--text-secondary)] font-medium">kgCO2</span>
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 relative overflow-hidden shadow-sm">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Plane className="w-24 h-24 text-blue-500" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-blue-600 dark:text-blue-400 text-sm font-bold uppercase tracking-wider mb-2">Total Distance</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-[var(--text-primary)]">{stats.totalDistance.toLocaleString()}</span>
                            <span className="text-sm text-[var(--text-secondary)] font-medium">km</span>
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 relative overflow-hidden shadow-sm">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <LayoutGrid className="w-24 h-24 text-amber-500" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-amber-600 dark:text-amber-400 text-sm font-bold uppercase tracking-wider mb-2">Total Activities</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-[var(--text-primary)]">{activities.length}</span>
                            <span className="text-sm text-[var(--text-secondary)] font-medium">Logs</span>
                        </div>
                    </div>
                </div>
            </div>


            {/* Filters */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 shrink-0">
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            placeholder="Search activities..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]"
                        />
                    </div>
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-1 bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode("grid")}
                        className={cn("p-2 rounded-md transition-all", viewMode === "grid" ? "bg-[#e8c559] text-[#171611]" : "text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5")}
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode("list")}
                        className={cn("p-2 rounded-md transition-all", viewMode === "list" ? "bg-[#e8c559] text-[#171611]" : "text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5")}
                    >
                        <ListIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--text-muted)]" />
                </div>
            ) : filteredActivities.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)]">
                    <Leaf className="w-12 h-12 mb-4 opacity-20" />
                    <p>No travel activities found</p>
                </div>
            ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-10">
                    {filteredActivities.map(act => {
                        // Derive unique activity types for this activity
                        const uniqueTypes = Array.from(new Set(act.travel_logs?.map(l => l.activity_type) || []));

                        // Get Labels, filter out undefined if any weird data
                        const typeLabels = uniqueTypes
                            .map(type => ACTIVITY_TYPE_LABELS[type])
                            .filter(Boolean);

                        return (
                            <div
                                key={act.id}
                                onClick={() => router.push(`/dashboard/sustainability/travel/${act.id}`)}
                                className="group flex flex-col p-5 rounded-2xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] hover:border-[#e8c559]/50 hover:shadow-xl transition-all duration-300 cursor-pointer"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/30">
                                                Activity
                                            </span>
                                            <span className="text-xs text-[var(--text-muted)]">{new Date(act.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-[var(--text-primary)] group-hover:text-[#e8c559] transition-colors line-clamp-1">
                                            {act.title}
                                        </h3>
                                    </div>
                                    {(profile?.id === act.created_by || ['ceo', 'super_admin', 'hr'].includes(profile?.role || "")) && (
                                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => setActiveActionDropdown(activeActionDropdown === act.id ? null : act.id)}
                                                className="p-1 rounded-lg text-[var(--text-muted)] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[var(--text-primary)] transition-colors"
                                            >
                                                <MoreVertical className="w-5 h-5" />
                                            </button>
                                            {activeActionDropdown === act.id && (
                                                <>
                                                    <div className="fixed inset-0 z-10" onClick={() => setActiveActionDropdown(null)} />
                                                    <div className="absolute right-0 top-8 w-40 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] shadow-xl z-20 p-1 flex flex-col gap-0.5">
                                                        <button
                                                            onClick={() => handleEditActivity(act)}
                                                            className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[#e8c559]/10 hover:text-[#e8c559] rounded-lg transition-colors w-full text-left"
                                                        >
                                                            <Edit3 className="w-4 h-4" /> Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteActivity(act.id)}
                                                            className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-rose-500/10 hover:text-rose-500 rounded-lg transition-colors w-full text-left"
                                                        >
                                                            <Trash2 className="w-4 h-4" /> Delete
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>


                                <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-4 h-10">{act.description || "No description provided."}</p>

                                <div className="flex flex-col gap-3 mb-4 p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                                    <div>
                                        <p className="text-xs text-[var(--text-muted)] mb-1">Total Emission</p>
                                        <p className="text-2xl font-bold text-emerald-500">
                                            {act.total_emission.toFixed(1)} <span className="text-sm font-normal text-[var(--text-secondary)]">kgCO2</span>
                                        </p>
                                    </div>

                                    {typeLabels.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[var(--glass-border)] border-dashed">
                                            {typeLabels.map(label => (
                                                <span key={label} className="px-2 py-0.5 text-[10px] rounded-md bg-[var(--text-primary)]/5 text-[var(--text-secondary)] border border-[var(--glass-border)] font-medium">
                                                    {label}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-auto px-1 flex items-center justify-between">
                                    {/* Removed footer total emission to avoid redundancy, kept 'Details' */}
                                    <span className="text-xs text-[var(--text-muted)]">
                                        {act.log_count} segments
                                    </span>
                                    <span className="flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)] group-hover:text-[#e8c559] transition-colors">
                                        Details <ChevronRight className="w-3 h-3" />
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="bg-white dark:bg-[#1c2120] rounded-2xl border border-[var(--glass-border)] overflow-hidden flex-1 overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-[var(--glass-bg)] border-b border-[var(--glass-border)] sticky top-0 z-10 backdrop-blur-md">
                            <tr>
                                <th className="px-6 py-4 text-left font-semibold text-[var(--text-primary)]">Activity Title</th>
                                <th className="px-6 py-4 text-left font-semibold text-[var(--text-primary)]">Created By</th>
                                <th className="px-6 py-4 text-left font-semibold text-[var(--text-primary)]">Date</th>
                                <th className="px-6 py-4 text-right font-semibold text-[var(--text-primary)]">Logs</th>
                                <th className="px-6 py-4 text-right font-semibold text-[var(--text-primary)]">Tot. Distance</th>
                                <th className="px-6 py-4 text-right font-semibold text-[var(--text-primary)]">Tot. Emission</th>
                                <th className="px-6 py-4 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--glass-border)]">
                            {filteredActivities.map(act => (
                                <tr key={act.id} onClick={() => router.push(`/dashboard/sustainability/travel/${act.id}`)} className="hover:bg-[var(--glass-bg)] cursor-pointer transition-colors">
                                    <td className="px-6 py-4 font-semibold text-[var(--text-primary)] hover:text-[#e8c559]">{act.title}</td>
                                    <td className="px-6 py-4 text-[var(--text-muted)]">{act.creator?.full_name}</td>
                                    <td className="px-6 py-4 text-[var(--text-muted)]">{new Date(act.created_at).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-right text-[var(--text-primary)]">{act.log_count}</td>
                                    <td className="px-6 py-4 text-right text-[var(--text-primary)]">{act.total_distance.toLocaleString()} km</td>
                                    <td className="px-6 py-4 text-right font-bold text-emerald-500">{act.total_emission.toFixed(1)} kg</td>
                                    <td className="px-6 py-4">
                                        <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-panel w-full max-w-xl bg-white dark:bg-[#1c2120] rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto border border-[var(--glass-border)]">
                        <div className="flex items-center justify-between p-6 border-b border-[var(--glass-border)]">
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">{editingActivityId ? "Edit Activity" : "New Travel Activity"}</h2>
                            <button onClick={() => setShowAddModal(false)} className="p-2 rounded-lg hover:bg-black/10">
                                <X className="h-5 w-5 text-[var(--text-secondary)]" />
                            </button>
                        </div>


                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Activity Title *</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]"
                                    placeholder="e.g. Site Visit Project A"
                                    value={newActivity.title}
                                    onChange={e => setNewActivity({ ...newActivity, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Description</label>
                                <textarea
                                    className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)] h-32 resize-none focus:outline-none focus:ring-2 focus:ring-[#e8c559]"
                                    placeholder="Optional notes or details about this activity..."
                                    value={newActivity.description}
                                    onChange={e => setNewActivity({ ...newActivity, description: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-3 mt-6 pt-4 border-t border-[var(--glass-border)]">
                                <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 rounded-xl border border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 font-medium transition-colors">Cancel</button>
                                <button onClick={handleCreateActivity} disabled={isSaving} className="flex-1 px-4 py-2 rounded-xl bg-[#e8c559] hover:bg-[#d4b44e] text-[#171611] font-bold flex justify-center transition-colors">
                                    {isSaving ? <Loader2 className="animate-spin w-5 h-5" /> : (editingActivityId ? "Update Activity" : "Create Activity")}
                                </button>

                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {showSettingsModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-panel w-full max-w-2xl bg-white dark:bg-[#1c2120] rounded-2xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[85vh] border border-[var(--glass-border)]">
                        <div className="flex justify-between items-center mb-6 shrink-0 border-b border-[var(--glass-border)] pb-4">
                            <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                                <Settings className="w-5 h-5 text-emerald-500" /> Emission Configurations
                            </h2>
                            <button onClick={handleSaveSettings} disabled={isSavingSettings} className="px-4 py-2 rounded-xl flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors">
                                {isSavingSettings ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />} Save Changes
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 pr-2">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-white dark:bg-[#1c2120] z-10">
                                    <tr className="text-left text-[var(--text-muted)] border-b border-[var(--glass-border)]">
                                        <th className="p-3">Config Label</th>
                                        <th className="p-3 w-32">Factor (kg/km)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--glass-border)]">
                                    {configs.map(c => (
                                        <tr key={c.id}>
                                            <td className="p-3 text-[var(--text-primary)]">{c.config_label}</td>
                                            <td className="p-3">
                                                <input
                                                    type="number"
                                                    step="0.0001"
                                                    className="w-full p-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-right text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 outline-none"
                                                    value={editedConfigs[c.id]}
                                                    onChange={e => setEditedConfigs({ ...editedConfigs, [c.id]: parseFloat(e.target.value) })}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-4 pt-4 border-t border-[var(--glass-border)] flex justify-end">
                            <button onClick={() => setShowSettingsModal(false)} className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
