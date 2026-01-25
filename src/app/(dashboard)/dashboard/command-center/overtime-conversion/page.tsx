"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle, Clock, DollarSign, Gift, Loader2, RefreshCw, XCircle } from "lucide-react";

interface OvertimeUser {
    id: string;
    name: string;
    role: string;
    total_hours: number;
    unconverted_requests: string[]; // array of request IDs
}

export default function OvertimeConversionPage() {
    const { user, canAccessCommandCenter } = useAuth();
    const supabase = createClient();

    const [overtimeUsers, setOvertimeUsers] = useState<OvertimeUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // State for selection and input
    const [selectedRequestIds, setSelectedRequestIds] = useState<Set<string>>(new Set());
    const [inputDays, setInputDays] = useState<string>("0");
    const [selectedUserForConversion, setSelectedUserForConversion] = useState<OvertimeUser | null>(null);

    // Fetch Overtime Data
    const fetchOvertimeData = async () => {
        setIsLoading(true);
        setError(null);
        setSelectedUserForConversion(null);
        setSelectedRequestIds(new Set());
        setInputDays("0");

        try {
            // Fetch all approved overtime requests that are NOT fully converted
            const { data, error: fetchError } = await supabase
                .from("leave_requests")
                .select(`
                    id,
                    total_hours,
                    converted_hours,
                    is_converted,
                    profile:profiles!profile_id (
                        id,
                        full_name,
                        job_title
                    )
                `)
                .eq("leave_type", "overtime")
                .eq("status", "approved")
                .neq("is_converted", true);

            if (fetchError) throw fetchError;

            // Aggregate by user
            const userMap = new Map<string, OvertimeUser>();

            data?.forEach((req: any) => {
                const profileId = req.profile.id;
                const hours = Number(req.total_hours) || 0;
                const converted = Number(req.converted_hours) || 0;
                const remaining = Math.max(0, hours - converted);

                if (remaining <= 0) return; // Skip if no hours left

                if (!userMap.has(profileId)) {
                    userMap.set(profileId, {
                        id: profileId,
                        name: req.profile.full_name,
                        role: req.profile.job_title || "Staff",
                        total_hours: 0,
                        unconverted_requests: []
                    });
                }

                const userData = userMap.get(profileId)!;
                userData.total_hours += remaining; // Show available remaining hours
                userData.unconverted_requests.push(req.id);
            });

            setOvertimeUsers(Array.from(userMap.values()));
        } catch (err: any) {
            console.error("Error fetching overtime:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (canAccessCommandCenter) {
            fetchOvertimeData();
        }
    }, [canAccessCommandCenter]);

    // Calculate details for selected user
    const calculateSelectionDetails = (user: OvertimeUser) => {
        const potentialLeaveDays = Math.floor(user.total_hours / 4);
        return { potentialLeaveDays };
    };

    // Handle Convert to Leave
    const handleConvertToLeave = async () => {
        if (!selectedUserForConversion) return;
        const user = selectedUserForConversion;

        const daysToGrant = parseInt(inputDays);

        const { potentialLeaveDays } = calculateSelectionDetails(user);

        if (isNaN(daysToGrant) || daysToGrant <= 0) {
            alert("Masukkan jumlah hari cuti yang valid (minimal 1).");
            return;
        }

        if (daysToGrant > potentialLeaveDays) {
            alert(`Jumlah hari melebihi batas konversi (${potentialLeaveDays} hari).`);
            return;
        }

        if (!confirm(`Konversi lembur menjadi ${daysToGrant} hari Cuti Ekstra untuk ${user.name}?`)) return;

        setProcessingId(user.id);

        try {
            // Call RPC function
            const { error } = await supabase.rpc('convert_overtime_to_leave', {
                admin_id: user.id, // Current logged in admin
                target_profile_id: user.id,
                request_ids: user.unconverted_requests, // Pass all available requests, backend logic handles consumption
                days_to_grant: daysToGrant,
                reason_text: `Konversi Lembur (Grant: ${daysToGrant} hari)`
            });

            if (error) throw error;

            alert("Berhasil dikonversi menjadi Cuti Ekstra!");
            fetchOvertimeData(); // Refresh list
        } catch (err: any) {
            console.error("Conversion error:", err);
            alert("Gagal memproses: " + err.message);
        } finally {
            setProcessingId(null);
        }
    };

    // Handle Convert to Cash
    const handleConvertToCash = async (user: OvertimeUser) => {
        const amount = prompt(`Masukkan nominal pencairan untuk ${user.total_hours} jam lembur ${user.name}:`, "Rp ");

        if (!amount) return;

        setProcessingId(user.id);

        try {
            // Call RPC function
            const { error } = await supabase.rpc('convert_overtime_to_cash', {
                admin_id: user.id,
                target_profile_id: user.id,
                request_ids: user.unconverted_requests,
                amount: amount
            });

            if (error) throw error;

            alert("Berhasil dicairkan!");
            fetchOvertimeData();
        } catch (err: any) {
            console.error("Cash out error:", err);
            alert("Gagal memproses: " + err.message);
        } finally {
            setProcessingId(null);
        }
    };

    if (!canAccessCommandCenter) {
        return <div className="p-8 text-center text-muted-foreground">Access Denied</div>;
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-1">
                        <Link href="/dashboard" className="hover:text-[var(--text-primary)]">Dashboard</Link>
                        <span>/</span>
                        <Link href="/dashboard/command-center" className="hover:text-[var(--text-primary)]">Command Center</Link>
                        <span>/</span>
                        <span className="text-[var(--text-primary)]">Overtime Conversion</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-2xl text-orange-500 shadow-lg border border-orange-500/20">
                            ⚖️
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Overtime Conversion</h2>
                            <p className="text-[var(--text-secondary)] text-sm">Kelola kompensasi lembur staff</p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={fetchOvertimeData}
                    disabled={isLoading}
                    className="px-4 py-2 rounded-lg bg-[var(--glass-bg)] hover:bg-[var(--glass-border)] border border-[var(--glass-border)] text-[var(--text-secondary)] transition-colors flex items-center gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Content */}
            <div className="glass-panel p-6 rounded-xl flex-1 overflow-auto">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-lg text-[var(--text-primary)]">
                        Pending Conversions ({overtimeUsers.length})
                    </h3>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <p>Memuat data lembur...</p>
                    </div>
                ) : overtimeUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
                        <p className="text-4xl mb-2">✨</p>
                        <p>Semua lembur telah diproses</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {overtimeUsers.map(user => {
                            const isProcessing = processingId === user.id;
                            const { potentialLeaveDays } = calculateSelectionDetails(user);
                            const isSelected = selectedUserForConversion?.id === user.id;

                            return (
                                <div key={user.id} className={`p-5 rounded-2xl border transition-all ${isSelected ? 'bg-orange-500/5 border-orange-500 shadow-md ring-1 ring-orange-500' : 'bg-[var(--surface-color)] border-[var(--glass-border)] hover:shadow-md'}`}>
                                    {/* User Info */}
                                    <div className="flex items-center gap-4 pb-4 border-b border-[var(--glass-border)]">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                                            {user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-[var(--text-primary)] text-lg">{user.name}</h4>
                                            <p className="text-sm text-[var(--text-muted)]">{user.role}</p>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="py-2">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Clock className="w-4 h-4 text-orange-500" />
                                            <span className="text-sm font-medium text-[var(--text-secondary)]">Sisa Jam Lembur</span>
                                        </div>
                                        <p className="text-3xl font-bold text-[var(--text-primary)] font-mono">
                                            {user.total_hours} <span className="text-base font-normal text-[var(--text-muted)]">Jam</span>
                                        </p>
                                        <div className="mt-2 text-xs text-[var(--text-muted)] bg-black/5 dark:bg-white/5 py-1 px-2 rounded inline-block">
                                            Max Konversi: {potentialLeaveDays} Hari
                                        </div>
                                    </div>

                                    {/* Conversion Controls (Visible if Selected) */}
                                    {isSelected ? (
                                        <div className="mt-4 p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--glass-border)]">
                                            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wide">
                                                Konversi ke Cuti
                                            </label>
                                            <div className="flex items-center gap-2 mb-3">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={potentialLeaveDays}
                                                    value={inputDays}
                                                    onChange={(e) => setInputDays(e.target.value)}
                                                    className="w-20 px-3 py-2 rounded-lg bg-[var(--surface-color)] border border-[var(--glass-border)] text-center font-bold text-lg focus:outline-none focus:border-orange-500"
                                                />
                                                <span className="text-sm font-medium">Hari</span>
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleConvertToLeave}
                                                    disabled={isProcessing || parseInt(inputDays || '0') < 1 || parseInt(inputDays || '0') > potentialLeaveDays}
                                                    className="flex-1 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Konfirmasi"}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedUserForConversion(null);
                                                        setInputDays("0");
                                                    }}
                                                    className="px-3 py-2 rounded-lg bg-[var(--surface-color)] border border-[var(--glass-border)] hover:bg-[var(--glass-border)] text-[var(--text-secondary)] text-sm transition-colors"
                                                >
                                                    Batal
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Actions (Default View) */
                                        <div className="grid grid-cols-2 gap-3 mt-auto">
                                            <button
                                                onClick={() => {
                                                    setSelectedUserForConversion(user);
                                                    setInputDays("0");
                                                }}
                                                disabled={isProcessing || potentialLeaveDays < 1}
                                                className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all font-bold flex flex-col items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Gift className="w-5 h-5" />
                                                <span className="text-xs">Cuti Ekstra</span>
                                            </button>

                                            <button
                                                onClick={() => handleConvertToCash(user)}
                                                disabled={isProcessing}
                                                className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-all font-bold flex flex-col items-center justify-center gap-1 disabled:opacity-50"
                                            >
                                                <DollarSign className="w-5 h-5" />
                                                <span className="text-xs">Uangkan</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
