"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
    ChevronRight,
    Users,
    UserCheck,
    Star,
    Clock,
    CheckCircle2,
    AlertCircle,
    Send,
    ArrowLeft,
    MessageSquare,
    Lock,
    ChevronDown,
    ChevronUp,
    Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    KPI_METRICS_DEFINITION,
    KPIMetric,
    mapProfileToStaffRole,
    StaffRole,
} from "../command-center/kpi-data";

// ─────────────────── Types ───────────────────

interface Peer {
    id: string;
    full_name: string;
    avatar_url: string | null;
    job_level: string | null;
    job_type: string | null;
    role: string;
    sharedProjects: { id: string; name: string }[];
    reviewedMetrics: string[]; // metric IDs already reviewed
}

interface ReviewPeriod {
    deadline_date: string;
    is_locked: boolean;
}

// ─────────────────── Component ───────────────────

export default function PeerReviewPage() {
    const supabase = createClient();
    const { profile } = useAuth();

    const [loading, setLoading] = useState(true);
    const [peers, setPeers] = useState<Peer[]>([]);
    const [reviewPeriod, setReviewPeriod] = useState<ReviewPeriod | null>(null);
    const [myReviewCount, setMyReviewCount] = useState(0);

    // Review form state
    const [selectedPeer, setSelectedPeer] = useState<Peer | null>(null);
    const [selectedMetric, setSelectedMetric] = useState<string>("");
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);

    // Success/error modal
    const [modalOpen, setModalOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState<{
        type: "success" | "error";
        title: string;
        message: string;
    }>({ type: "success", title: "", message: "" });

    const PERIOD = "2026-S1";

    // ─── Deadline helpers ───
    const isDeadlinePassed = useMemo(() => {
        if (!reviewPeriod) return false;
        return reviewPeriod.is_locked || new Date(reviewPeriod.deadline_date) < new Date();
    }, [reviewPeriod]);

    const daysRemaining = useMemo(() => {
        if (!reviewPeriod) return null;
        const diff = Math.ceil(
            (new Date(reviewPeriod.deadline_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        return diff;
    }, [reviewPeriod]);

    // ─── Fetch Data ───
    useEffect(() => {
        if (!profile) return;
        if (profile.job_type === 'intern' || profile.job_level === 'Intern') {
            setLoading(false);
            return;
        }

        const fetchAll = async () => {
            try {
                setLoading(true);

                // 1. Fetch review period / deadline for current user
                const { data: periodData } = await supabase
                    .from("kpi_review_periods")
                    .select("deadline_date, is_locked")
                    .eq("profile_id", profile.id)
                    .eq("period", PERIOD)
                    .single();

                if (periodData) setReviewPeriod(periodData);

                // 2. Fetch all projects where user is lead, member, or helper
                const [
                    { data: asLead },
                    { data: asMember },
                    { data: asHelper },
                ] = await Promise.all([
                    supabase
                        .from("projects")
                        .select("id, name, lead_id")
                        .eq("lead_id", profile.id)
                        .eq("is_archived", false),
                    supabase
                        .from("project_members")
                        .select("project_id, project:projects(id, name, lead_id)")
                        .eq("profile_id", profile.id),
                    supabase
                        .from("project_helpers")
                        .select("project_id, project:projects(id, name, lead_id)")
                        .eq("profile_id", profile.id),
                ]);

                // Build set of project IDs the user is involved in
                const myProjectIds = new Set<string>();
                const projectMap = new Map<string, { id: string; name: string; lead_id: string }>();

                (asLead || []).forEach((p: any) => {
                    myProjectIds.add(p.id);
                    projectMap.set(p.id, { id: p.id, name: p.name, lead_id: p.lead_id });
                });
                (asMember || []).forEach((m: any) => {
                    if (m.project) {
                        myProjectIds.add(m.project.id);
                        projectMap.set(m.project.id, m.project);
                    }
                });
                (asHelper || []).forEach((h: any) => {
                    if (h.project) {
                        myProjectIds.add(h.project.id);
                        projectMap.set(h.project.id, h.project);
                    }
                });

                if (myProjectIds.size === 0) {
                    setPeers([]);
                    setLoading(false);
                    return;
                }

                // 3. Find all people who share projects with me
                const projectIdArr = Array.from(myProjectIds);

                // Get leads, members, helpers for these projects
                const [
                    { data: projectsWithLeads },
                    { data: sharedMembers },
                    { data: sharedHelpers },
                ] = await Promise.all([
                    supabase
                        .from("projects")
                        .select("id, name, lead_id")
                        .in("id", projectIdArr),
                    supabase
                        .from("project_members")
                        .select("project_id, profile_id")
                        .in("project_id", projectIdArr),
                    supabase
                        .from("project_helpers")
                        .select("project_id, profile_id")
                        .in("project_id", projectIdArr)
                        .not("profile_id", "is", null),
                ]);

                // Build peer-project map: { profile_id -> Set<project_id> }
                const peerProjects = new Map<string, Set<string>>();

                const addPeerProject = (profileId: string, projectId: string) => {
                    if (profileId === profile.id) return; // exclude self
                    if (!peerProjects.has(profileId)) peerProjects.set(profileId, new Set());
                    peerProjects.get(profileId)!.add(projectId);
                };

                // Leads of shared projects
                (projectsWithLeads || []).forEach((p: any) => {
                    if (p.lead_id) addPeerProject(p.lead_id, p.id);
                });
                // Members of shared projects
                (sharedMembers || []).forEach((m: any) => {
                    addPeerProject(m.profile_id, m.project_id);
                });
                // Helpers of shared projects
                (sharedHelpers || []).forEach((h: any) => {
                    if (h.profile_id) addPeerProject(h.profile_id, h.project_id);
                });

                const peerIds = Array.from(peerProjects.keys());

                if (peerIds.length === 0) {
                    setPeers([]);
                    setLoading(false);
                    return;
                }

                // 4. Fetch peer profiles (exclude CEO/HR/Interns)
                const { data: peerProfiles } = await supabase
                    .from("profiles")
                    .select("id, full_name, avatar_url, job_level, job_type, role, is_hr")
                    .in("id", peerIds)
                    .neq("role", "ceo")
                    .eq("is_hr", false)
                    .neq("job_type", "intern");

                // 5. Fetch my existing reviews for this period
                const { data: myReviews } = await supabase
                    .from("peer_reviews")
                    .select("reviewee_id, kpi_metric_id")
                    .eq("reviewer_id", profile.id)
                    .eq("period", PERIOD);

                const reviewedMap = new Map<string, string[]>();
                (myReviews || []).forEach((r: any) => {
                    if (!reviewedMap.has(r.reviewee_id)) reviewedMap.set(r.reviewee_id, []);
                    reviewedMap.get(r.reviewee_id)!.push(r.kpi_metric_id);
                });

                setMyReviewCount(myReviews?.length || 0);

                // 6. Build peers list
                const peersResult: Peer[] = (peerProfiles || []).map((p: any) => {
                    const projectIds = peerProjects.get(p.id) || new Set();
                    const sharedProjectsList = Array.from(projectIds).map((pid) => {
                        const proj = projectMap.get(pid);
                        return { id: pid, name: proj?.name || "Unknown" };
                    });

                    return {
                        id: p.id,
                        full_name: p.full_name,
                        avatar_url: p.avatar_url,
                        job_level: p.job_level,
                        job_type: p.job_type,
                        role: p.role,
                        sharedProjects: sharedProjectsList,
                        reviewedMetrics: reviewedMap.get(p.id) || [],
                    };
                });

                setPeers(peersResult.sort((a, b) => a.full_name.localeCompare(b.full_name)));
            } catch (err) {
                console.error("Error fetching peer review data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchAll();
    }, [profile]);

    // ─── Get available metrics for a peer ───
    const getAvailableMetrics = (peer: Peer): KPIMetric[] => {
        const peerRole = mapProfileToStaffRole(peer.job_level, peer.job_type);
        const peerReviewMetrics = KPI_METRICS_DEFINITION.filter((m) => m.isPeerReview);

        return peerReviewMetrics.filter((m) => {
            // L1 role lock: only show if peer is analyst_supervisor or bisdev
            if (m.peerReviewRoleLock && m.peerReviewRoleLock.length > 0) {
                if (!peerRole || !m.peerReviewRoleLock.includes(peerRole)) return false;
            }
            // Exclude already reviewed metrics
            if (peer.reviewedMetrics.includes(m.id)) return false;
            return true;
        });
    };

    // ─── Open review form ───
    const openReviewForm = (peer: Peer) => {
        setSelectedPeer(peer);
        setSelectedMetric("");
        setAnswers({});
        setComment("");
        setShowForm(true);
    };

    // ─── Get current metric definition ───
    const currentMetric = useMemo(() => {
        if (!selectedMetric) return null;
        return KPI_METRICS_DEFINITION.find((m) => m.id === selectedMetric) || null;
    }, [selectedMetric]);

    // ─── Calculate average score ───
    const averageScore = useMemo(() => {
        if (!currentMetric?.peerReviewConfig) return 0;
        const qCount = currentMetric.peerReviewConfig.questions.length;
        const answered = Object.values(answers);
        if (answered.length === 0) return 0;
        return answered.reduce((sum, v) => sum + v, 0) / qCount;
    }, [answers, currentMetric]);

    // ─── Submit review ───
    const handleSubmit = async () => {
        if (!profile || !selectedPeer || !currentMetric) return;

        const qCount = currentMetric.peerReviewConfig?.questions.length || 0;
        if (Object.keys(answers).length < qCount) {
            setModalConfig({
                type: "error",
                title: "Lengkapi Semua Pertanyaan",
                message: `Anda belum menjawab semua ${qCount} pertanyaan. Silakan lengkapi sebelum submit.`,
            });
            setModalOpen(true);
            return;
        }

        setSubmitting(true);
        try {
            // 1. Insert peer_review
            const { data: review, error: reviewErr } = await supabase
                .from("peer_reviews")
                .insert({
                    reviewer_id: profile.id,
                    reviewee_id: selectedPeer.id,
                    period: PERIOD,
                    kpi_metric_id: selectedMetric,
                    project_id: null,
                    average_score: averageScore,
                    comment: comment.trim() || null,
                })
                .select()
                .single();

            if (reviewErr) throw reviewErr;

            // 2. Insert answers
            const answerPayloads = Object.entries(answers).map(([qNum, score]) => ({
                peer_review_id: review.id,
                question_number: parseInt(qNum),
                score,
            }));

            const { error: ansErr } = await supabase
                .from("peer_review_answers")
                .insert(answerPayloads);

            if (ansErr) throw ansErr;

            // 3. Update local state
            setPeers((prev) =>
                prev.map((p) =>
                    p.id === selectedPeer.id
                        ? { ...p, reviewedMetrics: [...p.reviewedMetrics, selectedMetric] }
                        : p
                )
            );
            setMyReviewCount((c) => c + 1);
            setShowForm(false);

            setModalConfig({
                type: "success",
                title: "✅ Review Terkirim!",
                message: `Review Anda untuk ${selectedPeer.full_name} pada ${currentMetric.name} berhasil disimpan secara anonim.`,
            });
            setModalOpen(true);
        } catch (err: any) {
            console.error("Submit error:", err);
            setModalConfig({
                type: "error",
                title: "Gagal Mengirim",
                message: err.message || "Terjadi kesalahan saat mengirim review.",
            });
            setModalOpen(true);
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Total reviewable count ───
    const totalReviewable = useMemo(() => {
        return peers.reduce((sum, p) => sum + getAvailableMetrics(p).length, 0);
    }, [peers]);

    // ─── Loading / Guard ───
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-[#e8c559] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-[var(--text-secondary)]">Memuat data peer review...</p>
                </div>
            </div>
        );
    }

    if (!profile) return null;

    if (profile.job_type === 'intern' || profile.job_level === 'Intern') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                    <Lock className="w-10 h-10 text-gray-400" />
                </div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Akses Dibatasi</h1>
                <p className="text-[var(--text-secondary)] max-w-md">
                    Fitur Peer Review tidak berlaku untuk peran Intern.
                </p>
            </div>
        );
    }

    // ─── Review Form View ───
    if (showForm && selectedPeer) {
        const availableMetrics = getAvailableMetrics(selectedPeer);

        return (
            <div className="pb-20 max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <button
                        onClick={() => setShowForm(false)}
                        className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-[var(--text-primary)]"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                            Review: {selectedPeer.full_name}
                        </h1>
                        <p className="text-sm text-[var(--text-secondary)]">
                            {selectedPeer.sharedProjects.length} project bersama
                        </p>
                    </div>
                </div>

                {/* Metric Selector */}
                <Card className="p-5 mb-6 bg-[var(--card-bg)] border-[var(--glass-border)]">
                    <label className="text-xs uppercase text-[var(--text-secondary)] font-bold mb-2 block">
                        Pilih KPI Metric
                    </label>
                    {availableMetrics.length === 0 ? (
                        <p className="text-amber-400 text-sm flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            Semua metric sudah di-review untuk rekan ini.
                        </p>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {availableMetrics.map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => {
                                        setSelectedMetric(m.id);
                                        setAnswers({});
                                    }}
                                    className={`p-3 rounded-xl border text-left transition-all text-sm ${selectedMetric === m.id
                                        ? "border-[#e8c559] bg-[#e8c559]/10 text-[#e8c559]"
                                        : "border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]"
                                        }`}
                                >
                                    <span className="font-bold">{m.id}</span>
                                    <p className="text-[10px] mt-1 opacity-70 line-clamp-2">{m.name}</p>
                                </button>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Questions Form */}
                {selectedMetric && currentMetric?.peerReviewConfig && (
                    <Card className="p-5 mb-6 bg-[var(--card-bg)] border-[var(--glass-border)]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-[var(--text-primary)]">
                                {currentMetric.name}
                            </h3>
                            <span className="px-3 py-1 rounded-full bg-[#e8c559]/10 text-[#e8c559] text-xs font-bold">
                                Avg: {averageScore.toFixed(1)}/5.0
                            </span>
                        </div>

                        {/* Scale Legend */}
                        <div className="mb-6 p-3 rounded-lg bg-black/20 border border-white/5">
                            <p className="text-[10px] uppercase text-[var(--text-secondary)] font-bold mb-2">Skala Penilaian:</p>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(currentMetric.peerReviewConfig.scale).map(([score, label]) => (
                                    <span key={score} className="text-[10px] text-[var(--text-secondary)]">
                                        <span className={`inline-block w-4 text-center rounded font-bold mr-1 ${parseInt(score) >= 4 ? "bg-emerald-500/20 text-emerald-400" :
                                            parseInt(score) >= 3 ? "bg-amber-500/20 text-amber-400" :
                                                "bg-rose-500/20 text-rose-400"
                                            }`}>{score}</span>
                                        {label}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Questions */}
                        <div className="space-y-4">
                            {currentMetric.peerReviewConfig.questions.map((question, idx) => (
                                <div key={idx} className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                                    <p className="text-sm text-[var(--text-primary)] mb-3">
                                        <span className="text-[#e8c559] font-bold mr-2">Q{idx + 1}.</span>
                                        {question}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        {[1, 2, 3, 4, 5].map((val) => (
                                            <button
                                                key={val}
                                                onClick={() => setAnswers((prev) => ({ ...prev, [idx]: val }))}
                                                className={`w-10 h-10 rounded-lg border-2 font-bold text-sm transition-all transform hover:scale-105 ${answers[idx] === val
                                                    ? val >= 4
                                                        ? "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                                                        : val >= 3
                                                            ? "bg-amber-500 border-amber-400 text-white shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                                                            : "bg-rose-500 border-rose-400 text-white shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                                                    : "bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)] hover:border-[var(--text-primary)]"
                                                    }`}
                                            >
                                                {val}
                                            </button>
                                        ))}
                                        {answers[idx] && (
                                            <span className="text-[10px] text-[var(--text-secondary)] ml-2">
                                                {currentMetric.peerReviewConfig!.scale[answers[idx]]}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Comment */}
                        <div className="mt-6">
                            <label className="text-xs uppercase text-[var(--text-secondary)] font-bold mb-2 block">
                                💬 Komentar Anonim (opsional)
                            </label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Feedback konstruktif untuk rekan kerja (nama Anda tidak akan ditampilkan)..."
                                className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl p-3 text-sm text-[var(--text-primary)] focus:border-[#e8c559] outline-none transition-all resize-none min-h-[80px]"
                                maxLength={500}
                            />
                            <p className="text-[10px] text-[var(--text-secondary)] mt-1 text-right">
                                {comment.length}/500
                            </p>
                        </div>

                        {/* Submit */}
                        <div className="flex justify-end mt-6">
                            <Button
                                onClick={handleSubmit}
                                disabled={
                                    submitting ||
                                    Object.keys(answers).length < (currentMetric.peerReviewConfig?.questions.length || 0) ||
                                    isDeadlinePassed
                                }
                                className="bg-[#e8c559] text-black hover:bg-[#d4a843] font-bold px-8"
                            >
                                {submitting ? (
                                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />
                                ) : (
                                    <Send className="w-4 h-4 mr-2" />
                                )}
                                Submit Review (Anonim)
                            </Button>
                        </div>
                    </Card>
                )}
            </div>
        );
    }

    // ─── Main Peer List View ───
    return (
        <div className="pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <UserCheck className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-[var(--text-secondary)]">
                            <Link href="/dashboard" className="hover:text-[var(--text-primary)] transition-colors">Dashboard</Link>
                            <ChevronRight className="h-4 w-4" />
                            <span>Peer Review</span>
                        </div>
                        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Peer Review</h2>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Beri penilaian anonim terhadap rekan kerja Anda di project yang sama.
                        </p>
                    </div>
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {/* Progress */}
                <Card className="p-5 bg-[var(--card-bg)] border-[var(--glass-border)]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/10">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-xs text-[var(--text-secondary)]">Review Terkirim</p>
                            <p className="text-2xl font-bold text-[var(--text-primary)]">{myReviewCount}</p>
                        </div>
                    </div>
                </Card>

                {/* Remaining */}
                <Card className="p-5 bg-[var(--card-bg)] border-[var(--glass-border)]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/10">
                            <Star className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <p className="text-xs text-[var(--text-secondary)]">Sisa Review</p>
                            <p className="text-2xl font-bold text-[var(--text-primary)]">{totalReviewable}</p>
                        </div>
                    </div>
                </Card>

                {/* Deadline */}
                <Card className={`p-5 border ${isDeadlinePassed
                    ? "bg-rose-500/5 border-rose-500/20"
                    : daysRemaining !== null && daysRemaining <= 7
                        ? "bg-amber-500/5 border-amber-500/20"
                        : "bg-[var(--card-bg)] border-[var(--glass-border)]"
                    }`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isDeadlinePassed ? "bg-rose-500/10" : "bg-blue-500/10"
                            }`}>
                            {isDeadlinePassed ? (
                                <Lock className="w-5 h-5 text-rose-400" />
                            ) : (
                                <Clock className="w-5 h-5 text-blue-400" />
                            )}
                        </div>
                        <div>
                            <p className="text-xs text-[var(--text-secondary)]">Deadline</p>
                            {reviewPeriod ? (
                                <>
                                    <p className="text-sm font-bold text-[var(--text-primary)]">
                                        {new Date(reviewPeriod.deadline_date).toLocaleDateString("id-ID", {
                                            day: "numeric", month: "long", year: "numeric",
                                        })}
                                    </p>
                                    {isDeadlinePassed ? (
                                        <p className="text-[10px] text-rose-400 font-bold">🔒 TERKUNCI</p>
                                    ) : daysRemaining !== null ? (
                                        <p className={`text-[10px] font-bold ${daysRemaining <= 3 ? "text-rose-400" :
                                            daysRemaining <= 7 ? "text-amber-400" : "text-emerald-400"
                                            }`}>
                                            {daysRemaining} hari lagi
                                        </p>
                                    ) : null}
                                </>
                            ) : (
                                <p className="text-sm text-[var(--text-secondary)]">Belum ditentukan</p>
                            )}
                        </div>
                    </div>
                </Card>
            </div>

            {/* Locked Banner */}
            {isDeadlinePassed && (
                <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3">
                    <Lock className="w-5 h-5 text-rose-400 shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-rose-400">Periode Review Terkunci</p>
                        <p className="text-xs text-[var(--text-secondary)]">
                            Deadline telah terlewati. Anda tidak bisa mengirim review baru.
                        </p>
                    </div>
                </div>
            )}

            {/* Anonymity Notice */}
            <div className="mb-6 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-bold text-indigo-400">🔒 Review Anonim Penuh</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                        Identitas Anda sebagai reviewer <strong>tidak akan</strong> ditampilkan ke siapapun.
                        Skor & komentar Anda hanya muncul dalam agregat. Yang bersangkutan tidak bisa melihat siapa yang me-review.
                    </p>
                </div>
            </div>

            {/* Peer List */}
            {peers.length === 0 ? (
                <div className="text-center py-16">
                    <Users className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-bold text-[var(--text-primary)]">Tidak Ada Rekan untuk Di-review</p>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                        Anda perlu tergabung dalam project bersama rekan lain.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {peers.map((peer) => {
                        const available = getAvailableMetrics(peer);
                        const allDone = available.length === 0;
                        const peerRole = mapProfileToStaffRole(peer.job_level, peer.job_type);

                        return (
                            <Card
                                key={peer.id}
                                className={`p-5 transition-all hover:shadow-lg ${allDone
                                    ? "bg-emerald-500/5 border-emerald-500/20"
                                    : "bg-[var(--card-bg)] border-[var(--glass-border)] hover:border-[var(--text-secondary)]"
                                    }`}
                            >
                                <div className="flex items-start gap-3 mb-3">
                                    {/* Avatar */}
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0 overflow-hidden">
                                        {peer.avatar_url ? (
                                            <Image
                                                src={peer.avatar_url}
                                                alt={peer.full_name}
                                                width={40}
                                                height={40}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            peer.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">{peer.full_name}</p>
                                        <p className="text-[10px] text-[var(--text-secondary)]">
                                            {peer.job_level || peer.job_type || "Staff"}
                                        </p>
                                    </div>
                                    {allDone ? (
                                        <span className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                                            ✅ Done
                                        </span>
                                    ) : (
                                        <span className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                                            ⏳ {available.length}
                                        </span>
                                    )}
                                </div>

                                {/* Shared Projects */}
                                <div className="flex items-center gap-1 mb-3 text-[10px] text-[var(--text-secondary)]">
                                    <Briefcase className="w-3 h-3" />
                                    <span>{peer.sharedProjects.length} project bersama</span>
                                </div>

                                {/* Reviewed Metrics */}
                                {peer.reviewedMetrics.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {peer.reviewedMetrics.map((mid) => (
                                            <span
                                                key={mid}
                                                className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold"
                                            >
                                                ✅ {mid}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Action */}
                                {!allDone && !isDeadlinePassed && (
                                    <button
                                        onClick={() => openReviewForm(peer)}
                                        className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#e8c559]/10 text-[#e8c559] text-sm font-bold border border-[#e8c559]/20 hover:bg-[#e8c559]/20 transition-all"
                                    >
                                        Review →
                                    </button>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Custom Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="glass-panel rounded-2xl p-6 max-w-md w-full border border-white/20 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${modalConfig.type === "success" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                            }`}>
                            {modalConfig.type === "success" ? (
                                <CheckCircle2 className="w-7 h-7" />
                            ) : (
                                <AlertCircle className="w-7 h-7" />
                            )}
                        </div>
                        <h3 className="text-xl font-bold text-white text-center mb-2">{modalConfig.title}</h3>
                        <p className="text-gray-300 text-center text-sm mb-6">{modalConfig.message}</p>
                        <div className="flex justify-center">
                            <button
                                onClick={() => setModalOpen(false)}
                                className="px-6 py-2.5 rounded-xl bg-[#e8c559] hover:bg-[#d4a843] text-black font-semibold transition-colors"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
