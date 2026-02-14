"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle, Clock, DollarSign, Gift, Loader2, RefreshCw, XCircle, ChevronRight, ArrowLeftRight } from "lucide-react";

interface OvertimeUser {
    id: string;
    name: string;
    avatar_url: string | null;
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

    // Cash Conversion Modal State
    const [showCashModal, setShowCashModal] = useState(false);
    const [cashUser, setCashUser] = useState<OvertimeUser | null>(null);
    const [cashAmount, setCashAmount] = useState("");
    const [isSubmittingCash, setIsSubmittingCash] = useState(false);

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
                        avatar_url,
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
                        avatar_url: req.profile.avatar_url,
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
        const potentialLeaveDays = Math.floor(user.total_hours / 8);
        return { potentialLeaveDays };
    };

    // Handle Convert to Leave
    const handleConvertToLeave = async () => {
        if (!selectedUserForConversion || !user) return;
        const targetUser = selectedUserForConversion;

        const daysToGrant = parseInt(inputDays);

        const { potentialLeaveDays } = calculateSelectionDetails(targetUser);

        if (isNaN(daysToGrant) || daysToGrant <= 0) {
            alert("Masukkan jumlah hari cuti yang valid (minimal 1).");
            return;
        }

        if (daysToGrant > potentialLeaveDays) {
            alert(`Jumlah hari melebihi batas konversi (${potentialLeaveDays} hari).`);
            return;
        }

        if (!confirm(`Konversi lembur menjadi ${daysToGrant} hari Cuti Ekstra untuk ${targetUser.name}?`)) return;

        setProcessingId(targetUser.id);

        try {
            // Call RPC function
            const { error } = await supabase.rpc('convert_overtime_to_leave', {
                admin_id: user.id, // Current logged in admin
                target_profile_id: targetUser.id,
                request_ids: targetUser.unconverted_requests, // Pass all available requests, backend logic handles consumption
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
    // Open Cash Modal
    const handleOpenCashModal = (user: OvertimeUser) => {
        setCashUser(user);
        setCashAmount("");
        setShowCashModal(true);
    };

    // Submit Cash Conversion
    const handleSubmitCashConversion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cashUser || !cashAmount || !user) return;

        // Simple validation to ensure it looks like a number or currency
        const cleanAmount = cashAmount.replace(/[^0-9]/g, '');
        if (!cleanAmount) {
            alert("Mohon masukkan nominal yang valid.");
            return;
        }

        setIsSubmittingCash(true);
        try {
            // Call RPC function
            const { error } = await supabase.rpc('convert_overtime_to_cash', {
                admin_id: user.id,
                target_profile_id: cashUser.id,
                request_ids: cashUser.unconverted_requests,
                amount: `Rp ${Number(cleanAmount).toLocaleString('id-ID')}` // Format as currency string for storage if needed, or just send raw value depending on RPC/DB expectation. Based on previous prompt logic "Rp ", it seems string.
            });

            if (error) throw error;

            alert("Berhasil dicairkan!");
            setShowCashModal(false);
            setCashUser(null);
            fetchOvertimeData();
        } catch (err: any) {
            console.error("Cash out error:", err);
            alert("Gagal memproses: " + err.message);
        } finally {
            setIsSubmittingCash(false);
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
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-2xl text-orange-500 shadow-lg border border-orange-500/20">
                            <ArrowLeftRight className="w-6 h-6 text-orange-500" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1 text-sm text-[var(--text-secondary)]">
                                <Link href="/dashboard" className="hover:text-[var(--text-primary)] transition-colors">Dashboard</Link>
                                <ChevronRight className="h-4 w-4" />
                                <Link href="/dashboard/command-center" className="hover:text-[var(--text-primary)] transition-colors">Command Center</Link>
                                <ChevronRight className="h-4 w-4" />
                                <span className="text-[var(--text-primary)]">Overtime Conversion</span>
                            </div>
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
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-inner overflow-hidden relative">
                                            {user.avatar_url ? (
                                                <img
                                                    src={user.avatar_url}
                                                    alt={user.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                user.name.charAt(0)
                                            )}
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
                                                onClick={() => handleOpenCashModal(user)}
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
            {/* Cash Conversion Modal */}
            {showCashModal && cashUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#171611] border border-gray-200 dark:border-[var(--glass-border)] rounded-2xl w-full max-w-md shadow-2xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-[var(--text-primary)]">
                                Pencairan Lembur
                            </h3>
                            <button
                                onClick={() => setShowCashModal(false)}
                                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                            >
                                <XCircle className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        <div className="mb-6 flex items-center gap-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
                                <DollarSign className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="font-bold text-[var(--text-primary)]">{cashUser.name}</p>
                                <p className="text-sm text-[var(--text-secondary)]">Total Lembur: <span className="font-mono font-bold text-amber-500">{cashUser.total_hours} Jam</span></p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmitCashConversion}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                                        Nominal Pencairan (Rp)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">Rp</span>
                                        <input
                                            type="text"
                                            value={cashAmount}
                                            onChange={(e) => {
                                                // Allow only numbers
                                                const val = e.target.value.replace(/[^0-9]/g, '');
                                                setCashAmount(val ? Number(val).toLocaleString('id-ID') : '');
                                            }}
                                            placeholder="0"
                                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--surface-color)] border border-[var(--glass-border)] text-lg font-bold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all placeholder:text-gray-500/30"
                                            autoFocus
                                        />
                                    </div>
                                    <p className="text-xs text-[var(--text-muted)] mt-1.5">
                                        Masukkan nominal yang disepakati untuk {cashUser.total_hours} jam lembur.
                                    </p>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowCashModal(false)}
                                        className="flex-1 py-3 rounded-xl border border-[var(--glass-border)] hover:bg-[var(--glass-border)] text-[var(--text-secondary)] font-medium transition-colors"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingCash || !cashAmount}
                                        className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg shadow-amber-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isSubmittingCash ? <Loader2 className="w-5 h-5 animate-spin" /> : "Cairkan Dana"}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
