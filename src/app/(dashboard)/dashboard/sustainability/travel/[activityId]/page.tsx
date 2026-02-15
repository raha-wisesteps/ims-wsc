"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
    ChevronRight,
    ArrowLeft,
    Plus,
    Trash2,
    Calendar,
    MapPin,
    Users,
    Plane,
    Car,
    Train,
    Ship,
    Bike,
    MoreHorizontal,
    Briefcase,
    Loader2,
    ArrowRight,
    X,
    User,
    Edit2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
}

interface TravelLog {
    id: string;
    travel_date: string;
    transport_mode: string;
    transport_subtype: string;
    distance_km: number;
    passenger_count: number;
    activity_type: string;
    origin: string;
    destination: string;
    total_emission: number;
    emission_per_person: number;
    title?: string; // Added
    notes?: string; // Made optional
    created_at: string; // Added
    created_by: string;
    participants: { profile: { id: string; full_name: string; avatar_url: string } }[];
}

interface EmissionConfig {
    config_key: string;
    config_label: string;
    emission_factor: number;
}

interface Profile {
    id: string;
    full_name: string;
    job_type: string;
    role: string;
    avatar_url: string;
}

// Configs
const ACTIVITY_TYPE_LABELS: Record<string, string> = {
    meeting_client: "Meeting Client / Partner",
    project_related: "Project Related",
    site_visit: "Site Visit",
    training_conference: "Training & Conference",
    event_exhibition: "Event & Exhibition",
    guest_speaker: "Guest Speaker",
    internal_meeting: "Internal Meeting",
    others: "Etc / Others",
};

const TRANSPORT_ICONS: Record<string, any> = {
    plane: Plane,
    car: Car,
    train: Train,
    travel: Car,
    motorcycle: Bike,
    ferry: Ship
};

export default function ActivityDetailPage() {
    const params = useParams();
    const router = useRouter();
    const supabase = createClient();
    const { profile, isLoading: authLoading } = useAuth();

    // State
    const [activity, setActivity] = useState<TravelActivity | null>(null);
    const [logs, setLogs] = useState<TravelLog[]>([]);
    const [configs, setConfigs] = useState<EmissionConfig[]>([]);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingLogId, setEditingLogId] = useState<string | null>(null);

    // Form Data
    const [formData, setFormData] = useState({
        activity_type: "meeting_client",
        transport_mode: "car",
        transport_subtype: "car_bensin",
        distance_km: "",
        passenger_count: "1",
        origin: "",
        destination: "",
        travel_date: new Date().toISOString().split('T')[0],
        participant_ids: [] as string[],
        notes: "",
        title: "" // Added
    });

    const [isSaving, setIsSaving] = useState(false);

    // Initial Fetch
    useEffect(() => {
        const fetchAll = async () => {
            setIsLoading(true);
            try {
                // 1. Fetch Activity
                const { data: act, error: errAct } = await supabase
                    .from('travel_activities')
                    .select('*')
                    .eq('id', params.activityId)
                    .single();
                if (errAct) throw errAct;
                setActivity(act);

                // 2. Fetch Logs
                fetchLogs();

                // 3. Fetch Configs (for dropdowns & calc)
                const { data: conf } = await supabase.from('travel_emission_config').select('*');
                setConfigs(conf || []);

                // 4. Fetch Profiles (for participants)
                const { data: profs } = await supabase
                    .from('profiles')
                    .select('id, full_name, job_type, role, avatar_url')
                    .neq('role', 'hr')
                    .order('full_name');
                setProfiles(profs || []);

            } catch (error) {
                console.error(error);
                toast.error("Failed to load data");
            } finally {
                setIsLoading(false);
            }
        };

        if (params.activityId) fetchAll();
    }, [params.activityId]);

    const fetchLogs = async () => {
        const { data } = await supabase
            .from('travel_logs')
            .select(`
                *,
                participants:travel_log_participants(
                    profile:profile_id(id, full_name, avatar_url)
                ),
                created_by
            `)
            .eq('activity_id', params.activityId)
            .order('travel_date', { ascending: false });
        setLogs(data || []);
    };

    // Derived Form Options
    const transportOptions = useMemo(() => {
        const modes = ["plane", "car", "train", "travel", "motorcycle", "ferry"];
        return modes;
    }, []);

    const subtypeOptions = useMemo(() => {
        return configs.filter(c => c.config_key.startsWith(formData.transport_mode));
    }, [configs, formData.transport_mode]);

    // Sync passenger count with selected participants
    useEffect(() => {
        // If participants change, update passenger count to at least match participants + 1 (self) or just count?
        // Assuming "Participant IDs" are "Other people". So Total = IDs.length + 1 (Self).
        // Let's assume the user IS in the car.
        if (formData.participant_ids.length > 0) {
            const currentCount = parseInt(formData.passenger_count) || 1;
            const minCount = formData.participant_ids.length + 1; // Self + others

            // Only auto-update if the manual count is less than implicit count, OR always sync?
            // User asked: "add participant tidak mempengaruhi ... jumlah yang di mobil"
            // So they expect it to update.
            setFormData(prev => ({
                ...prev,
                passenger_count: minCount.toString()
            }));
        } else {
            // If no participants selected, reset passenger count to 1 (for self)
            setFormData(prev => ({
                ...prev,
                passenger_count: "1"
            }));
        }
    }, [formData.participant_ids]);

    // Live Emission Calc
    const calculatePreview = useMemo(() => { // Renamed to calculatePreview
        if (!formData.distance_km || !formData.transport_mode) return { total: 0, perPerson: 0 };
        const dist = parseFloat(formData.distance_km);
        if (isNaN(dist)) return { total: 0, perPerson: 0 };

        let factor = 0;
        const exactConfig = configs.find(c => c.config_key === formData.transport_subtype);
        if (exactConfig) factor = exactConfig.emission_factor;
        else {
            const baseConfig = configs.find(c => c.config_key === formData.transport_mode);
            if (baseConfig) factor = baseConfig.emission_factor;
        }

        let total = 0;
        let perPerson = 0;

        // Count for split logic
        const pCountInput = parseInt(formData.passenger_count) || 1;

        if (['car', 'motorcycle'].includes(formData.transport_mode)) {
            total = dist * factor;
            // Car logic: Total is fixed (vehicle), Per Person is Split
            perPerson = total / (pCountInput > 0 ? pCountInput : 1);
        } else {
            // Passenger logic: Total is sum of passengers? No, usually Dist * Factor * Count
            // Wait, if factor is kgCO2/km/passenger, then Total = Dist * Factor * Count.
            // And Per Person = Dist * Factor.
            // Let's assume factor is per passenger for Public Transport/Flight.
            total = dist * factor * pCountInput;
            perPerson = dist * factor;
        }

        return { total, perPerson };

    }, [formData.distance_km, formData.transport_mode, formData.transport_subtype, formData.passenger_count, configs]);

    const isFormValid = useMemo(() => {
        return (
            formData.title?.trim().length > 0 &&
            formData.origin?.trim().length > 0 &&
            formData.destination?.trim().length > 0 &&
            formData.distance_km && parseFloat(formData.distance_km) > 0 &&
            formData.travel_date
        );
    }, [formData]);

    const handleSave = async () => {
        // Strict Validation
        if (!formData.title?.trim()) {
            toast.error("Please enter a Segment Title (e.g., Flight to Jakarta)");
            return;
        }
        if (!formData.origin?.trim()) {
            toast.error("Please enter the Origin location");
            return;
        }
        if (!formData.destination?.trim()) {
            toast.error("Please enter the Destination location");
            return;
        }
        if (!formData.distance_km || parseFloat(formData.distance_km) <= 0) {
            toast.error("Please enter a valid Distance (km)");
            return;
        }
        if (!formData.travel_date) {
            toast.error("Please select a Date");
            return;
        }

        setIsSaving(true);
        try {
            // Recalculate Logic Final
            const dist = parseFloat(formData.distance_km);
            const pCountInput = parseInt(formData.passenger_count) || 1;
            const participants = formData.participant_ids;

            let factor = 0;
            const subtype = configs.find(c => c.config_key === formData.transport_subtype);
            if (subtype) factor = subtype.emission_factor;
            else {
                const base = configs.find(c => c.config_key === formData.transport_mode);
                if (base) factor = base.emission_factor;
            }

            let totalEmission = 0;
            let emissionPerPerson = 0;

            if (['car', 'motorcycle'].includes(formData.transport_mode)) {
                totalEmission = dist * factor;
                // For car, split total emission by the number of passengers (from form input if valid, else 1)
                // This ensures that even if specific participants aren't selected but count is manually set, calculation follows
                if (pCountInput > 0) {
                    emissionPerPerson = totalEmission / pCountInput;
                } else {
                    emissionPerPerson = totalEmission;
                }
            } else {
                totalEmission = factor * dist * pCountInput;
                emissionPerPerson = factor * dist;
            }

            // Define Payload
            const payload = {
                activity_id: params.activityId,
                travel_date: formData.travel_date,
                transport_mode: formData.transport_mode,
                transport_subtype: formData.transport_subtype,
                distance_km: dist,
                passenger_count: pCountInput,
                activity_type: formData.activity_type,
                origin: formData.origin,
                destination: formData.destination,
                total_emission: totalEmission,
                emission_per_person: emissionPerPerson,
                emission_factor: factor,
                notes: formData.notes,
                title: formData.title // Added
            };

            let currentLogId = editingLogId;

            if (editingLogId) {
                // Update
                const { error } = await supabase
                    .from('travel_logs')
                    .update(payload)
                    .eq('id', editingLogId);

                if (error) throw error;

                // Sync Participants: Delete all and re-insert
                const { error: delErr } = await supabase.from('travel_log_participants').delete().eq('travel_log_id', editingLogId);
                if (delErr) throw delErr;

            } else {
                // Insert
                const { data, error } = await supabase
                    .from('travel_logs')
                    .insert({ ...payload, created_by: profile?.id })
                    .select()
                    .single();

                if (error) throw error;
                currentLogId = data.id;
            }

            // Insert Participants
            if (participants.length > 0 && currentLogId) {
                const pPayload = participants.map(pid => ({
                    travel_log_id: currentLogId,
                    profile_id: pid
                }));
                const { error: pError } = await supabase.from('travel_log_participants').insert(pPayload);
                if (pError) throw pError;
            }

            // Recalculate Activity Stats from DB (Robust)
            const { data: allLogs } = await supabase.from('travel_logs').select('total_emission, distance_km').eq('activity_id', params.activityId);
            if (allLogs) {
                const newTotalEmission = allLogs.reduce((sum: number, l: any) => sum + (l.total_emission || 0), 0);
                const newTotalDist = allLogs.reduce((sum: number, l: any) => sum + (l.distance_km || 0), 0);

                await supabase.from('travel_activities').update({
                    total_emission: newTotalEmission,
                    total_distance: newTotalDist,
                    log_count: allLogs.length
                }).eq('id', params.activityId);
            }

            toast.success(editingLogId ? "Log updated" : "Travel Log Added");
            setShowAddModal(false);
            setEditingLogId(null);

            // Reset form
            setFormData({
                activity_type: "meeting_client",
                transport_mode: "car",
                transport_subtype: "car_bensin",
                distance_km: "",
                passenger_count: "1",
                origin: "",
                destination: "",
                travel_date: new Date().toISOString().split('T')[0],
                participant_ids: [],
                notes: "",
                title: "" // Reset title
            });
            fetchLogs();
            // Re-fetch activity to get updated stats
            const { data: act } = await supabase.from('travel_activities').select('*').eq('id', params.activityId).single();
            if (act) setActivity(act);

        } catch (error: any) {
            console.error("Save Error:", error);
            toast.error(error?.message || "Failed to save log. Please check your connection.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditLog = (log: TravelLog) => {
        setEditingLogId(log.id);
        setFormData({
            activity_type: log.activity_type,
            transport_mode: log.transport_mode,
            transport_subtype: log.transport_subtype,
            distance_km: log.distance_km.toString(),
            passenger_count: log.passenger_count.toString(),
            origin: log.origin,
            destination: log.destination,
            travel_date: log.travel_date,
            participant_ids: log.participants.map((p: any) => p.profile.id), // Note: participant object depends on fetch structure
            notes: log.notes || "", // Ensure notes is not undefined
            title: log.title || "" // Added
        });
        setShowAddModal(true);
    };

    const handleDeleteLog = async (logId: string, emission: number, dist: number) => {
        if (!confirm("Delete this log?")) return;
        try {
            const { error } = await supabase.from('travel_logs').delete().eq('id', logId);
            if (error) throw error;

            // Decrement stats
            await supabase
                .from('travel_activities')
                .update({
                    total_emission: Math.max(0, (activity?.total_emission || 0) - emission),
                    total_distance: Math.max(0, (activity?.total_distance || 0) - dist),
                    log_count: Math.max(0, (activity?.log_count || 0) - 1)
                })
                .eq('id', params.activityId);

            fetchLogs();
            setActivity(prev => prev ? ({
                ...prev,
                total_emission: Math.max(0, prev.total_emission - emission),
                total_distance: Math.max(0, prev.total_distance - dist),
                log_count: Math.max(0, prev.log_count - 1)
            }) : null);
            toast.success("Log deleted");

        } catch (error) {
            toast.error("Failed to delete");
        }
    };

    if (isLoading || !activity) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    const canAction = (logCreatorId: string) => {
        const userRole = profile?.role || "";
        return profile?.id === logCreatorId || ['ceo', 'super_admin', 'hr'].includes(userRole);
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <MapPin className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-[var(--text-secondary)]">
                            <Link href="/dashboard" className="hover:text-[var(--text-primary)]">Dashboard</Link>
                            <ChevronRight className="h-4 w-4" />
                            <Link href="/dashboard/sustainability" className="hover:text-[var(--text-primary)]">Sustainability</Link>
                            <ChevronRight className="h-4 w-4" />
                            <Link href="/dashboard/sustainability/travel" className="hover:text-[var(--text-primary)]">Travel Log</Link>
                            <ChevronRight className="h-4 w-4" />
                            <span className="text-[var(--text-primary)]">Activity Details</span>
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{activity.title}</h1>
                        <p className="text-sm text-[var(--text-secondary)]">
                            {activity.description || "Manage travel segments for this activity"}
                        </p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="glass-panel p-4 rounded-xl text-center min-w-[120px] bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] shadow-sm">
                        <p className="text-xs text-[var(--text-muted)] uppercase mb-1">Total Emission</p>
                        <p className="text-2xl font-bold text-emerald-500">{activity.total_emission.toFixed(1)} <span className="text-sm">kg</span></p>
                    </div>
                    <div className="glass-panel p-4 rounded-xl text-center min-w-[120px] bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] shadow-sm">
                        <p className="text-xs text-[var(--text-muted)] uppercase mb-1">Distance</p>
                        <p className="text-2xl font-bold text-[var(--text-primary)]">{activity.total_distance.toLocaleString()} <span className="text-sm">km</span></p>
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center mb-6 shrink-0">
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Travel Segments ({logs.length})</h3>
                <button
                    onClick={() => {
                        setShowAddModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#e8c559] hover:bg-[#d4b44e] text-[#171611] font-bold shadow-lg shadow-orange-500/10 transition-colors"
                >
                    <Plus className="w-4 h-4" /> Add Segment
                </button>
            </div>

            {/* List */}
            <div className="space-y-4 flex-1 overflow-y-auto pb-20">
                {logs.map((log) => {
                    const Icon = TRANSPORT_ICONS[log.transport_mode] || Car;
                    return (
                        <div key={log.id} className="group relative flex flex-col md:flex-row gap-6 p-5 rounded-2xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] hover:border-[#e8c559]/50 transition-all">
                            <div className="flex flex-col items-center justify-center min-w-[60px]">
                                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
                                    <Icon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">{log.transport_mode}</span>
                            </div>

                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        {/* Removed the icon and activity type label from here to consolidate */}
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-[var(--text-primary)]">{log.title || "Travel Segment"}</p>
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--text-secondary)]/10 text-[var(--text-secondary)] border border-[var(--glass-border)]">
                                                    {ACTIVITY_TYPE_LABELS[log.activity_type] || log.activity_type}
                                                </span>
                                            </div>
                                            <p className="text-xs text-[var(--text-secondary)]">{new Date(log.travel_date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <h4 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                                        {log.origin} <ArrowRight className="w-4 h-4 text-[var(--text-muted)]" /> {log.destination}
                                    </h4>
                                    <p className="text-sm text-[var(--text-secondary)] mt-1">{log.notes || "No additional notes"}</p>
                                </div>

                                <div>
                                    <p className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">Participants</p>
                                    <div className="flex -space-x-2">
                                        {log.participants?.map((p, i) => (
                                            <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-[#1c2120] bg-gray-200" title={p.profile.full_name}>
                                                {p.profile.avatar_url ? (
                                                    <img src={p.profile.avatar_url} alt="av" className="w-full h-full rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">{p.profile.full_name[0]}</div>
                                                )}
                                            </div>
                                        ))}
                                        {(!log.participants || log.participants.length === 0) && (
                                            <span className="text-sm text-[var(--text-muted)] italic">No participants listed</span>
                                        )}
                                    </div>
                                </div>

                                <div className="text-right flex flex-col justify-center min-w-[100px]">
                                    <p className="text-3xl font-bold text-emerald-500">{log.total_emission.toFixed(2)}</p>
                                    <p className="text-sm font-medium text-[var(--text-secondary)]">kgCO2</p>
                                    <p className="text-xs text-[var(--text-muted)] mt-1">{log.distance_km.toLocaleString()} km traveled</p>
                                </div>
                            </div>

                            {/* Action Buttons - Dedicated Side Column */}
                            {canAction(log.created_by) && (
                                <div className="hidden md:flex flex-col gap-2 justify-center pl-4 border-l border-[var(--glass-border)] opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleEditLog(log)}
                                        className="p-2 text-[var(--text-secondary)] hover:text-[#e8c559] hover:bg-[#e8c559]/10 rounded-lg transition-colors"
                                        title="Edit Log"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteLog(log.id, log.total_emission, log.distance_km)}
                                        className="p-2 text-[var(--text-secondary)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                                        title="Delete Log"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {/* Mobile Action Buttons (Absolute but positioned strictly) */}
                            {canAction(log.created_by) && (
                                <div className="md:hidden absolute top-3 right-3 flex gap-2">
                                    <button onClick={() => handleEditLog(log)} className="p-1.5 bg-[var(--glass-bg)] rounded-lg text-[var(--text-secondary)]"><Edit2 className="w-4 h-4" /></button>
                                    <button onClick={() => handleDeleteLog(log.id, log.total_emission, log.distance_km)} className="p-1.5 bg-[var(--glass-bg)] rounded-lg text-[var(--text-secondary)]"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-xl bg-white dark:bg-[#1c2120] rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto border border-[var(--glass-border)]">
                        <div className="flex items-center justify-between p-6 border-b border-[var(--glass-border)] sticky top-0 bg-white dark:bg-[#1c2120] z-10">
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">{editingLogId ? "Edit Travel Segment" : "Add Travel Segment"}</h2>
                            <button onClick={() => { setShowAddModal(false); setEditingLogId(null); }} className="p-2 rounded-lg hover:bg-black/10 transition-colors">
                                <X className="h-5 w-5 text-[var(--text-secondary)]" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Segment Title */}
                            <div>
                                <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Segment Title *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Flight to Jakarta, Drive to Site"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]"
                                />
                            </div>

                            {/* Mode Selection */}
                            <div className="grid grid-cols-1 mb-4">
                                <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Travel Type</label>
                                <select
                                    value={formData.activity_type}
                                    onChange={e => setFormData({ ...formData, activity_type: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]"
                                >
                                    {Object.entries(ACTIVITY_TYPE_LABELS).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Transport Mode</label>
                                    <select
                                        value={formData.transport_mode}
                                        onChange={e => setFormData({ ...formData, transport_mode: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]"
                                    >
                                        {transportOptions.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Resulting Sub-type</label>
                                    <select
                                        value={formData.transport_subtype}
                                        onChange={e => setFormData({ ...formData, transport_subtype: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]"
                                    >
                                        {subtypeOptions.map(c => <option key={c.config_key} value={c.config_key}>{c.config_label}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Origin/Dest */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative">
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Origin *</label>
                                    <MapPin className="absolute left-3 top-[34px] w-4 h-4 text-[var(--text-muted)]" />
                                    <input
                                        type="text"
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]"
                                        value={formData.origin}
                                        onChange={e => setFormData({ ...formData, origin: e.target.value })}
                                        placeholder="City / Location"
                                    />
                                </div>
                                <div className="relative">
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Destination *</label>
                                    <MapPin className="absolute left-3 top-[34px] w-4 h-4 text-[var(--text-muted)]" />
                                    <input
                                        type="text"
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]"
                                        value={formData.destination}
                                        onChange={e => setFormData({ ...formData, destination: e.target.value })}
                                        placeholder="City / Location"
                                    />
                                </div>
                            </div>

                            {/* Distance & Date */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Distance (km) *</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]"
                                        value={formData.distance_km}
                                        onChange={e => setFormData({ ...formData, distance_km: e.target.value })}
                                        placeholder="0.0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Date *</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]"
                                        value={formData.travel_date}
                                        onChange={e => setFormData({ ...formData, travel_date: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Car Specific: Passenger Count */}
                            {formData.transport_mode === 'car' && (
                                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30">
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Passengers in vehicle (excluding driver)</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559]"
                                        value={formData.passenger_count}
                                        onChange={e => setFormData({ ...formData, passenger_count: e.target.value })}
                                    />
                                    <p className="text-xs text-[var(--text-secondary)] mt-2 flex items-center gap-1">
                                        <Users className="w-3 h-3" /> Used to calculate split emission for shared rides/taxi.
                                    </p>
                                </div>
                            )}


                            {/* Participants Selection */}
                            <div>
                                <label className="block text-sm font-bold text-[var(--text-primary)] mb-2">Participants</label>
                                <div className="border border-[var(--glass-border)] rounded-xl overflow-hidden bg-white dark:bg-[#232b2a]">
                                    <div className="max-h-48 overflow-y-auto p-2 space-y-1">
                                        {profiles.map(p => {
                                            const isSelected = formData.participant_ids.includes(p.id);
                                            return (
                                                <label
                                                    key={p.id}
                                                    className={cn(
                                                        "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors",
                                                        isSelected ? "bg-[#e8c559]/10" : "hover:bg-gray-50 dark:hover:bg-white/5"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                                        isSelected ? "bg-[#e8c559] border-[#e8c559]" : "border-[var(--text-muted)] bg-transparent"
                                                    )}>
                                                        {isSelected && <Users className="w-3 h-3 text-[#171611]" />}
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={isSelected}
                                                        onChange={e => {
                                                            if (e.target.checked) setFormData({ ...formData, participant_ids: [...formData.participant_ids, p.id] });
                                                            else setFormData({ ...formData, participant_ids: formData.participant_ids.filter(id => id !== p.id) });
                                                        }}
                                                    />
                                                    <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                                                        {p.avatar_url
                                                            ? <img src={p.avatar_url} className="w-full h-full object-cover" />
                                                            : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">{p.full_name[0]}</div>
                                                        }
                                                    </div>
                                                    <div>
                                                        <p className={cn("text-sm font-medium", isSelected ? "text-[#e8c559]" : "text-[var(--text-primary)]")}>{p.full_name}</p>
                                                        <p className="text-xs text-[var(--text-muted)] capitalize">{p.job_type === 'fulltime' ? 'Employee' : p.job_type}</p>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Notes (Optional)</label>
                                <textarea
                                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e8c559] resize-none h-20"
                                    placeholder="Add any additional details..."
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Footer / Calc Preview */}
                        <div className="p-6 border-t border-[var(--glass-border)] bg-[var(--glass-bg)] sticky bottom-0 z-10">
                            {/* Live Preview */}
                            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Estimated Total Emission</p>
                                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                        {calculatePreview.total.toFixed(2)} <span className="text-sm font-normal">kgCO2</span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 font-medium">Your Share</p>
                                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                        {calculatePreview.perPerson.toFixed(2)} <span className="text-xs font-normal">kgCO2</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-4">
                                <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-3 rounded-xl border border-[var(--glass-border)] text-[var(--text-secondary)] font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving || !isFormValid}
                                    title={!isFormValid ? "Please fill all required fields (*)" : "Save Travel Log"}
                                    className={`flex-1 px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${isSaving || !isFormValid
                                        ? "bg-gray-200 text-gray-400 cursor-not-allowed opacity-70 dark:bg-white/5 dark:text-gray-600"
                                        : "bg-[#e8c559] text-[#171611] hover:bg-[#d4b44e] shadow-lg shadow-orange-500/10 cursor-pointer"
                                        }`}
                                >
                                    {isSaving ? <Loader2 className="animate-spin w-5 h-5" /> : "Save Travel Log"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
