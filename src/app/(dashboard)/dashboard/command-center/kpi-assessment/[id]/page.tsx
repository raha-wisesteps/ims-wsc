"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Save,
    BookOpen,
    Users,
    Star,
    TrendingUp,
    Award,
    AlertCircle,
    CheckCircle2,
    Info,
    FileEdit,
    Send,
    ChevronDown,
    ChevronUp,
    MessageSquare,
    BarChart3,
    Eye,
    Lock,
    ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import {
    StaffKPI,
    ROLE_NAMES,
    SCORE_LEVELS,
    KPIPillar,
    KPIMetric,
    KPI_CATEGORIES,
    KPI_METRICS_DEFINITION,
    getGroupedMetrics,
    getRoleLabel,
    StaffRole,
    mapProfileToStaffRole
} from "../../kpi-data";

// Peer Review aggregate types
interface PeerReviewAggregate {
    kpi_metric_id: string;
    reviewer_count: number;
    avg_score: number;
    comments: string[];
}

interface CompletionEntry {
    reviewer_id: string;
    reviewer_name: string;
    kpi_metric_id: string;
}

interface PerQuestionAvg {
    question_number: number;
    avg_score: number;
}

interface ProposalItem {
    id: string;
    name: string;
    proposal_status: 'success' | 'fail' | null;
    proposal_reason: string | null;
}

interface SharingSessionItem {
    id: string;
    title: string;
    session_date: string;
    session_type: 'internal_training' | 'sharing_session';
}



export default function AssessmentPage() {
    const supabase = createClient();
    const params = useParams();
    const router = useRouter();
    const profileId = params.id as string;

    const [staff, setStaff] = useState<StaffKPI | null>(null);
    const [loading, setLoading] = useState(true);
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const [kpiScoreId, setKpiScoreId] = useState<string | null>(null);
    const [attendancePercent, setAttendancePercent] = useState<number>(0);
    const [docStatus, setDocStatus] = useState<'draft' | 'final'>('draft');

    // Peer review + conversion rate state
    const [peerAggregates, setPeerAggregates] = useState<PeerReviewAggregate[]>([]);
    const [completionStatus, setCompletionStatus] = useState<CompletionEntry[]>([]);
    const [perQuestionAvgs, setPerQuestionAvgs] = useState<Record<string, PerQuestionAvg[]>>({});
    const [proposals, setProposals] = useState<ProposalItem[]>([]);
    const [conversionRate, setConversionRate] = useState<{ rate: number; won: number; total: number }>({ rate: 0, won: 0, total: 0 });
    const [expandedSysRec, setExpandedSysRec] = useState<Record<string, boolean>>({});
    const [totalEligibleReviewers, setTotalEligibleReviewers] = useState<Record<string, number>>({});

    // K2 & K3 Sharing Session / Internal Training state
    const [k2Sessions, setK2Sessions] = useState<SharingSessionItem[]>([]);
    const [k2Count, setK2Count] = useState(0);
    const [k3Stats, setK3Stats] = useState<{ attended: number; total: number; percentage: number }>({ attended: 0, total: 0, percentage: 0 });
    const [k3Sessions, setK3Sessions] = useState<SharingSessionItem[]>([]);

    // K1 Blog Links state
    const [k1BlogLinks, setK1BlogLinks] = useState<any[]>([]);

    // Modal states for frontend dialogs
    const [modalOpen, setModalOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState<{
        type: 'warning' | 'confirm' | 'success' | 'error';
        title: string;
        message: string;
        onConfirm?: () => void;
        confirmText?: string;
        cancelText?: string;
    }>({ type: 'warning', title: '', message: '' });

    const [expandedCriteria, setExpandedCriteria] = useState<Record<string, boolean>>({});
    const toggleCriteria = (id: string) => {
        setExpandedCriteria(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Initial Data Fetch
    useEffect(() => {
        const loadData = async () => {
            try {
                // 1. Fetch Profile
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', profileId)
                    .single();

                if (profileError || !profile) {
                    console.error("Profile not found");
                    return;
                }

                // 2. Fetch Existing KPI
                const { data: existingKPI } = await supabase
                    .from('kpi_scores')
                    .select('*, kpi_sub_aspect_scores(*)')
                    .eq('profile_id', profileId)
                    .eq('period', '2026-S1')
                    .single();

                if (existingKPI) {
                    setKpiScoreId(existingKPI.id);
                    setDocStatus(existingKPI.status || 'draft');

                    // Load K1 blog links from sub aspect scores
                    const k1SubAspect = existingKPI.kpi_sub_aspect_scores?.find((s: any) => s.sub_aspect_id === 'K1');
                    if (k1SubAspect?.blog_links && Array.isArray(k1SubAspect.blog_links)) {
                        setK1BlogLinks(k1SubAspect.blog_links);
                    }
                }

                // 3. Fetch Attendance for Recommendation
                const { data: checkins } = await supabase
                    .from('daily_checkins')
                    .select('is_late')
                    .eq('profile_id', profileId)
                    .gte('checkin_date', '2026-01-01'); // Start of semester

                let latePct = 0;
                if (checkins && checkins.length > 0) {
                    const lateCount = checkins.filter((c: any) => c.is_late).length;
                    latePct = (lateCount / checkins.length) * 100;
                }
                setAttendancePercent(latePct);

                // 4. Fetch Peer Review Aggregates
                const { data: aggregateData } = await supabase
                    .from('peer_review_aggregated')
                    .select('*')
                    .eq('reviewee_id', profileId)
                    .eq('period', '2026-S1');

                if (aggregateData) {
                    setPeerAggregates(aggregateData.map((a: any) => ({
                        kpi_metric_id: a.kpi_metric_id,
                        reviewer_count: a.reviewer_count,
                        avg_score: parseFloat(a.avg_score) || 0,
                        comments: a.comments || [],
                    })));
                }

                // 5. Fetch Completion Status
                const { data: completionData } = await supabase
                    .from('peer_review_completion_status')
                    .select('*')
                    .eq('reviewee_id', profileId)
                    .eq('period', '2026-S1');

                if (completionData) {
                    setCompletionStatus(completionData.map((c: any) => ({
                        reviewer_id: c.reviewer_id,
                        reviewer_name: c.reviewer_name,
                        kpi_metric_id: c.kpi_metric_id,
                    })));
                }

                // 6. Fetch Per-Question Averages for peer review metrics
                const peerMetricIds = ['L1', 'S2', 'S4', 'P2'];
                const pqAvgs: Record<string, PerQuestionAvg[]> = {};

                for (const metricId of peerMetricIds) {
                    const { data: reviewsForMetric } = await supabase
                        .from('peer_reviews')
                        .select('id')
                        .eq('reviewee_id', profileId)
                        .eq('period', '2026-S1')
                        .eq('kpi_metric_id', metricId);

                    if (reviewsForMetric && reviewsForMetric.length > 0) {
                        const reviewIds = reviewsForMetric.map((r: any) => r.id);
                        const { data: answersData } = await supabase
                            .from('peer_review_answers')
                            .select('question_number, score')
                            .in('peer_review_id', reviewIds);

                        if (answersData) {
                            // Group by question_number, calculate avg
                            const byQ = new Map<number, number[]>();
                            answersData.forEach((a: any) => {
                                if (!byQ.has(a.question_number)) byQ.set(a.question_number, []);
                                byQ.get(a.question_number)!.push(a.score);
                            });
                            pqAvgs[metricId] = Array.from(byQ.entries()).map(([qn, scores]) => ({
                                question_number: qn,
                                avg_score: scores.reduce((s, v) => s + v, 0) / scores.length,
                            })).sort((a, b) => a.question_number - b.question_number);
                        }
                    }
                }
                setPerQuestionAvgs(pqAvgs);

                // 7. Fetch Proposals (B3 Conversion Rate)
                // Get projects where this person is lead
                const { data: staffProposals } = await supabase
                    .from('projects')
                    .select('id, name, proposal_status, proposal_reason')
                    .eq('lead_id', profileId)
                    .eq('category', 'proposal');

                if (staffProposals) {
                    setProposals(staffProposals);
                    const total = staffProposals.length;
                    const won = staffProposals.filter((p: any) => p.proposal_status === 'success').length;
                    setConversionRate({
                        rate: total > 0 ? (won / total) * 100 : 0,
                        won,
                        total,
                    });
                }

                // 7b. Fetch K2 Sharing Sessions (where user is speaker, type = sharing_session)
                const { data: speakerSessions } = await supabase
                    .from('sharing_sessions')
                    .select('id, title, session_date, session_type')
                    .eq('speaker_id', profileId)
                    .eq('session_type', 'sharing_session')
                    .gte('session_date', '2026-01-01')
                    .order('session_date', { ascending: false });

                if (speakerSessions) {
                    setK2Sessions(speakerSessions);
                    setK2Count(speakerSessions.length);
                }

                // 7c. Fetch K3 Internal Training Attendance
                // Total internal trainings in the period
                const { data: allInternalTrainings } = await supabase
                    .from('sharing_sessions')
                    .select('id, title, session_date, session_type')
                    .eq('session_type', 'internal_training')
                    .gte('session_date', '2026-01-01')
                    .order('session_date', { ascending: false });

                const totalTrainings = allInternalTrainings?.length || 0;

                if (totalTrainings > 0) {
                    // Check which ones the user attended
                    const trainingIds = allInternalTrainings!.map((t: any) => t.id);
                    const { data: participationData } = await supabase
                        .from('sharing_session_participants')
                        .select('session_id, participation_status')
                        .eq('profile_id', profileId)
                        .in('session_id', trainingIds)
                        .eq('participation_status', 'full');

                    const attendedCount = participationData?.length || 0;
                    const attendedSessionIds = new Set(participationData?.map((p: any) => p.session_id) || []);

                    setK3Sessions(allInternalTrainings!.map((t: any) => ({
                        ...t,
                        _attended: attendedSessionIds.has(t.id)
                    })));
                    setK3Stats({
                        attended: attendedCount,
                        total: totalTrainings,
                        percentage: (attendedCount / totalTrainings) * 100
                    });
                }

                // 8. Count total eligible reviewers for each peer metric
                // (people who share projects with this staff, excluding CEO/HR/self)
                const [{ data: asLeadP }, { data: asMemberP }, { data: asHelperP }] = await Promise.all([
                    supabase.from('projects').select('id').eq('lead_id', profileId).eq('is_archived', false),
                    supabase.from('project_members').select('project_id').eq('profile_id', profileId),
                    supabase.from('project_helpers').select('project_id').eq('profile_id', profileId),
                ]);
                const staffProjectIds = new Set<string>();
                (asLeadP || []).forEach((p: any) => staffProjectIds.add(p.id));
                (asMemberP || []).forEach((m: any) => staffProjectIds.add(m.project_id));
                (asHelperP || []).forEach((h: any) => staffProjectIds.add(h.project_id));

                if (staffProjectIds.size > 0) {
                    const pArr = Array.from(staffProjectIds);
                    const [{ data: pLeads }, { data: pMembers }, { data: pHelpers }] = await Promise.all([
                        supabase.from('projects').select('lead_id').in('id', pArr),
                        supabase.from('project_members').select('profile_id').in('project_id', pArr),
                        supabase.from('project_helpers').select('profile_id').in('project_id', pArr).not('profile_id', 'is', null),
                    ]);
                    const eligibleIds = new Set<string>();
                    (pLeads || []).forEach((p: any) => { if (p.lead_id !== profileId) eligibleIds.add(p.lead_id); });
                    (pMembers || []).forEach((m: any) => { if (m.profile_id !== profileId) eligibleIds.add(m.profile_id); });
                    (pHelpers || []).forEach((h: any) => { if (h.profile_id && h.profile_id !== profileId) eligibleIds.add(h.profile_id); });

                    // Remove CEO/HR from eligible
                    if (eligibleIds.size > 0) {
                        const { data: eligibleProfiles } = await supabase
                            .from('profiles').select('id').in('id', Array.from(eligibleIds))
                            .neq('role', 'ceo').eq('is_hr', false);
                        const eligibleCount = eligibleProfiles?.length || 0;
                        // Set same count for all peer metrics as base
                        const erMap: Record<string, number> = {};
                        peerMetricIds.forEach(mid => { erMap[mid] = eligibleCount; });
                        setTotalEligibleReviewers(erMap);
                    }
                }


                // 9. Initialize Staff KPI Structure
                const role = mapProfileToStaffRole(profile.job_level, profile.job_type) || 'analyst_staff';
                const groupedMetrics = getGroupedMetrics(role);

                // Helper to merge existing scores
                const getMetricData = (metricId: string) => {
                    if (existingKPI?.kpi_sub_aspect_scores) {
                        const saved = existingKPI.kpi_sub_aspect_scores.find((s: any) => s.sub_aspect_id === metricId);
                        if (saved) return { actual: saved.actual, score: saved.score, note: saved.ceo_note || saved.note, employee_note: saved.employee_note };
                    }
                    // Defaults
                    if (metricId === 'B4') return { actual: `${latePct.toFixed(1)}%`, score: undefined, note: 'System Calculated', employee_note: '' };
                    return { actual: '', score: undefined, note: '', employee_note: '' };
                };

                const pillars: Record<string, KPIPillar> = {
                    knowledge: {
                        ...KPI_CATEGORIES.KNOWLEDGE,
                        metrics: groupedMetrics.knowledge.map(m => ({ ...m, ...getMetricData(m.id) }))
                    },
                    people: {
                        ...KPI_CATEGORIES.PEOPLE,
                        metrics: groupedMetrics.people.map(m => ({ ...m, ...getMetricData(m.id) }))
                    },
                    service: {
                        ...KPI_CATEGORIES.SERVICE,
                        metrics: groupedMetrics.service.map(m => ({ ...m, ...getMetricData(m.id) }))
                    },
                    business: {
                        ...KPI_CATEGORIES.BUSINESS,
                        metrics: groupedMetrics.business.map(m => ({ ...m, ...getMetricData(m.id) }))
                    },
                    leadership: {
                        ...KPI_CATEGORIES.LEADERSHIP,
                        metrics: groupedMetrics.leadership.map(m => ({ ...m, ...getMetricData(m.id) }))
                    },
                };

                setStaff({
                    id: profile.id,
                    name: profile.full_name || 'Unknown',
                    role: role,
                    period: "2026-S1",
                    pillars: pillars
                });

            } catch (err) {
                console.error("Error loading assessment data:", err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [profileId]);

    // Helper to calculate totals
    const calculations = useMemo(() => {
        if (!staff) return { totalScore: 0, level: SCORE_LEVELS[2], pillarScores: {} };

        let totalWeightedScore = 0;
        let totalWeight = 0;
        const pillarScores: Record<string, number> = {};

        Object.entries(staff.pillars).forEach(([key, pillar]) => {
            let pillarWeightedSum = 0;
            let pillarWeightInfo = 0;

            pillar.metrics.forEach(m => {
                const mScore = m.score || 0;
                totalWeightedScore += mScore * (m.weight / 100);
                totalWeight += m.weight;

                pillarWeightedSum += mScore * (m.weight / 100);
                pillarWeightInfo += m.weight;
            });

            pillarScores[`score_${key}`] = pillarWeightInfo > 0 ? (pillarWeightedSum / (pillarWeightInfo / 100)) : 0;
        });

        const finalScore = totalWeight > 0 ? (totalWeightedScore / (totalWeight / 100)) : 0;
        const level = SCORE_LEVELS.find(l => finalScore >= l.min && finalScore < l.max) || SCORE_LEVELS[2];

        return { totalScore: finalScore, level, pillarScores };
    }, [staff]);

    const handleMetricChange = (pillarKey: string, metricId: string, field: 'actual' | 'score' | 'note', value: any) => {
        if (!staff) return;

        setStaff(prev => {
            if (!prev) return null;
            const newStaff = { ...prev };
            const newPillars = { ...newStaff.pillars };
            const newMetrics = [...newPillars[pillarKey].metrics];

            const metricIndex = newMetrics.findIndex(m => m.id === metricId);

            if (metricIndex !== -1) {
                newMetrics[metricIndex] = {
                    ...newMetrics[metricIndex],
                    [field]: value
                };
            }
            newPillars[pillarKey] = { ...newPillars[pillarKey], metrics: newMetrics };
            newStaff.pillars = newPillars;

            return newStaff;
        });
        setUnsavedChanges(true);
    };

    const handleSave = async (status: 'draft' | 'final') => {
        if (!staff) return;

        // Collect all metrics that need scoring
        const allMetrics: { pillar: string; metric: KPIMetric }[] = [];
        Object.entries(staff.pillars).forEach(([key, pillar]) => {
            pillar.metrics.forEach(metric => {
                allMetrics.push({ pillar: key, metric });
            });
        });

        // Check for incomplete scores
        const incompleteMetrics = allMetrics.filter(m => !m.metric.score || m.metric.score === 0);

        if (incompleteMetrics.length > 0) {
            const pillarNames = [...new Set(incompleteMetrics.map(m => m.pillar))];

            if (status === 'final') {
                // Cannot finalize with incomplete scores
                setModalConfig({
                    type: 'error',
                    title: 'Cannot Finalize',
                    message: `${incompleteMetrics.length} KPI metric(s) belum dinilai di pillar: ${pillarNames.join(', ').toUpperCase()}.\n\nSilakan nilai semua metrik sebelum finalisasi.`,
                });
                setModalOpen(true);
                return;
            }

            // For draft, show warning and ask to proceed
            setModalConfig({
                type: 'warning',
                title: 'Incomplete Scores',
                message: `${incompleteMetrics.length} KPI metric(s) belum dinilai di pillar: ${pillarNames.join(', ').toUpperCase()}.\n\nSimpan sebagai draft dengan data tidak lengkap?`,
                confirmText: 'Simpan Draft',
                cancelText: 'Batal',
                onConfirm: () => performSave('draft')
            });
            setModalOpen(true);
            return;
        }

        if (status === 'final') {
            // Show finalize confirmation
            setModalConfig({
                type: 'confirm',
                title: '⚠️ Finalisasi Assessment',
                message: 'Apakah Anda yakin ingin memfinalisasi assessment ini?\n\n• Aksi ini TIDAK BISA dibatalkan\n• Hasil akan terlihat oleh karyawan\n• Skor akan terkunci dari editing',
                confirmText: 'Ya, Finalisasi',
                cancelText: 'Batal',
                onConfirm: () => performSave('final')
            });
            setModalOpen(true);
            return;
        }

        // Direct save for complete draft
        performSave(status);
    };

    const performSave = async (status: 'draft' | 'final') => {
        if (!staff) return;
        setModalOpen(false);

        try {
            // 1. Upsert KPI Main Score
            const kpiPayload = {
                profile_id: staff.id,
                period: staff.period,
                final_score: calculations.totalScore,
                ...calculations.pillarScores,
                status: status,
                updated_at: new Date().toISOString()
            };

            let currentScoreId = kpiScoreId;

            if (currentScoreId) {
                const { error } = await supabase.from('kpi_scores').update(kpiPayload).eq('id', currentScoreId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('kpi_scores').insert(kpiPayload).select().single();
                if (error) throw error;
                currentScoreId = data.id;
                setKpiScoreId(data.id);
            }

            // 2. Upsert Sub Aspects (only for scored metrics)
            const subAspectPayloads: any[] = [];

            Object.values(staff.pillars).forEach(pillar => {
                pillar.metrics.forEach(metric => {
                    // Only save if score is valid (1-5)
                    if (metric.score && metric.score >= 1 && metric.score <= 5) {
                        subAspectPayloads.push({
                            kpi_score_id: currentScoreId,
                            sub_aspect_id: metric.id,
                            score: metric.score,
                            ceo_note: (metric as any).note || '',
                            updated_at: new Date().toISOString()
                        });
                    }
                });
            });

            if (subAspectPayloads.length > 0) {
                const { error: subError } = await supabase
                    .from('kpi_sub_aspect_scores')
                    .upsert(subAspectPayloads, { onConflict: 'kpi_score_id,sub_aspect_id' });

                if (subError) throw subError;
            }

            setUnsavedChanges(false);
            setDocStatus(status);
            setModalConfig({
                type: 'success',
                title: status === 'final' ? '✅ Berhasil Difinalisasi' : '💾 Draft Tersimpan',
                message: status === 'final'
                    ? 'Assessment berhasil difinalisasi! Hasil sudah dapat dilihat oleh karyawan.'
                    : 'Draft berhasil disimpan. Anda dapat melanjutkan nanti.',
            });
            setModalOpen(true);

            if (status === 'final') {
                setTimeout(() => router.push("/dashboard/command-center/kpi-management"), 1500);
            }

        } catch (err: any) {
            console.error("Save failed:", err);
            setModalConfig({
                type: 'error',
                title: 'Gagal Menyimpan',
                message: `Error: ${err.message}`,
            });
            setModalOpen(true);
        }
    };

    const getIcon = (key: string) => {
        switch (key) {
            case 'knowledge': return BookOpen;
            case 'people': return Users;
            case 'service': return Star;
            case 'business': return TrendingUp;
            case 'leadership': return Award;
            default: return Star;
        }
    };

    if (loading) return <div className="p-10 text-white min-h-[60vh] flex items-center justify-center">Loading staff data...</div>;
    if (!staff) return <div className="p-10 text-white min-h-[60vh] flex items-center justify-center">Staff not found.</div>;

    return (
        <div className="pb-20 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/command-center/kpi-management"
                        className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-black text-white">Assessment Form</h1>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-opacity-30 ${docStatus === 'final'
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                                : 'bg-gray-500/20 text-gray-400 border-gray-500'
                                }`}>
                                {docStatus}
                            </span>
                        </div>
                        <p className="text-gray-400">Detailed Grading for <span className="text-[#e8c559] font-bold">{staff.name}</span></p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {unsavedChanges && (
                        <span className="text-amber-400 text-sm font-medium flex items-center gap-2 animate-pulse mr-2">
                            <AlertCircle className="w-4 h-4" /> Unsaved
                        </span>
                    )}

                    <Button
                        onClick={() => handleSave('draft')}
                        variant="outline"
                        className="border-white/10 hover:bg-white/5 text-gray-300"
                        disabled={docStatus === 'final'}
                    >
                        <FileEdit className="w-4 h-4 mr-2" /> Save Draft
                    </Button>

                    <Button
                        onClick={() => handleSave('final')}
                        className="bg-[#e8c559] text-black hover:bg-[#d4a843] font-bold"
                    >
                        <Send className="w-4 h-4 mr-2" /> Finalize & Publish
                    </Button>
                </div>
            </div>

            {/* Score Summary Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="p-6 bg-[#e8c559]/10 border-[#e8c559]/30 border flex flex-col items-center justify-center text-center">
                    <p className="text-sm text-[#e8c559] uppercase font-bold tracking-wider mb-2">Projected Score</p>
                    <p className="text-5xl font-black text-white mb-2">{calculations.totalScore.toFixed(2)}<span className="text-lg text-white/50 font-normal">/5.0</span></p>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${calculations.level.bgLight} ${calculations.level.color}`}>
                        {calculations.level.label}
                    </div>
                </Card>

                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-gray-400 text-xs mb-1">Role</p>
                        <p className="text-white font-bold text-lg">{getRoleLabel(staff.role)}</p>
                    </div>
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-gray-400 text-xs mb-1">Period</p>
                        <p className="text-white font-bold text-lg">{staff.period}</p>
                    </div>
                </div>
            </div>

            {/* Detailed Form */}
            <div className="space-y-8">
                {Object.entries(staff.pillars).map(([key, pillar]) => {
                    const pillarTotalWeight = pillar.metrics.reduce((sum, m) => sum + m.weight, 0);
                    if (pillarTotalWeight === 0) return null;

                    const Icon = getIcon(key);

                    return (
                        <div key={key} className="glass-panel p-6 rounded-2xl border border-white/10">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                                <div className={`p-2 rounded-lg bg-${pillar.color}-500/20 text-${pillar.color}-500`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">{pillar.label}</h3>
                                    <p className="text-xs text-gray-400">Total Weight: {pillarTotalWeight}%</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {pillar.metrics.map((metric) => (
                                    <div key={metric.id} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                        <div className="md:col-span-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-bold text-white max-w-[200px]">{metric.name}</p>
                                                <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-400 border border-white/5 shrink-0">
                                                    {metric.weight}%
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mb-2">{metric.criteria}</p>

                                            {/* Scoring Guidelines Toggle */}
                                            {metric.scoring_criteria && (
                                                <div className="mb-4">
                                                    <button
                                                        onClick={() => toggleCriteria(metric.id)}
                                                        className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/5 px-2 py-1 rounded border border-blue-500/10 hover:bg-blue-500/10"
                                                    >
                                                        {expandedCriteria[metric.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                        {expandedCriteria[metric.id] ? "Hide Scoring Guidelines" : "Show Scoring Guidelines"}
                                                    </button>

                                                    {expandedCriteria[metric.id] && (
                                                        <div className="mt-2 p-3 rounded-lg bg-black/40 border border-white/5 text-[11px] space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                                                            {Object.entries(metric.scoring_criteria).map(([score, desc]: any) => (
                                                                <div key={score} className="flex gap-2 items-start">
                                                                    <span className={`font-bold w-4 shrink-0 text-center rounded ${score >= 4 ? 'bg-emerald-500/20 text-emerald-400' :
                                                                        score >= 3 ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
                                                                        }`}>{score}</span>
                                                                    <span className="text-gray-300 leading-tight">{desc}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* SYSTEM RECOMMENDATION FOR PEER REVIEW METRICS */}
                                            {metric.isPeerReview && (() => {
                                                const agg = peerAggregates.find(a => a.kpi_metric_id === metric.id);
                                                const metricCompletion = completionStatus.filter(c => c.kpi_metric_id === metric.id);
                                                const allEligible = totalEligibleReviewers[metric.id] || 0;
                                                const pqData = perQuestionAvgs[metric.id] || [];
                                                const metricDef = KPI_METRICS_DEFINITION.find(m => m.id === metric.id);
                                                const isExpanded = expandedSysRec[metric.id] || false;

                                                return (
                                                    <div className="mt-2 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                                                        <p className="text-[10px] text-indigo-300 font-bold mb-2 flex items-center gap-1">
                                                            <BarChart3 className="w-3 h-3" /> SYSTEM RECOMMENDATION (Peer Review)
                                                        </p>
                                                        {agg ? (
                                                            <>
                                                                <div className="flex justify-between items-end mb-1">
                                                                    <span className="text-xs text-gray-300">Rata-rata:</span>
                                                                    <span className="text-sm font-bold text-white">
                                                                        {agg.avg_score.toFixed(1)} / 5.0
                                                                        <span className="text-xs font-normal text-gray-400 ml-1">
                                                                            (dari {agg.reviewer_count}/{allEligible} reviewer)
                                                                        </span>
                                                                    </span>
                                                                </div>
                                                                <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden mb-2">
                                                                    <div className="h-full bg-indigo-500 transition-all" style={{ width: `${(agg.avg_score / 5) * 100}%` }} />
                                                                </div>

                                                                {/* Comments */}
                                                                {agg.comments.length > 0 && (
                                                                    <div className="mb-2">
                                                                        <p className="text-[10px] text-gray-400 font-bold mb-1">💬 Komentar Anonim:</p>
                                                                        {agg.comments.slice(0, 3).map((c, i) => (
                                                                            <p key={i} className="text-[10px] text-gray-300 italic pl-2 border-l border-indigo-500/30 mb-1">"{c}"</p>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                {/* Toggle Detail */}
                                                                <button
                                                                    onClick={() => setExpandedSysRec(p => ({ ...p, [metric.id]: !p[metric.id] }))}
                                                                    className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 mt-1"
                                                                >
                                                                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                                                    {isExpanded ? 'Hide Detail' : 'View Detail'}
                                                                </button>

                                                                {isExpanded && (
                                                                    <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                                                        {/* Completion Status */}
                                                                        <div className="p-2 rounded bg-black/20 border border-white/5">
                                                                            <p className="text-[10px] text-gray-400 font-bold mb-1">
                                                                                📋 Completion ({metricCompletion.length}/{allEligible})
                                                                            </p>
                                                                            <div className="space-y-0.5 max-h-32 overflow-y-auto">
                                                                                {metricCompletion.map((c, i) => (
                                                                                    <p key={i} className="text-[10px] text-emerald-400">✅ {c.reviewer_name}</p>
                                                                                ))}
                                                                            </div>
                                                                        </div>

                                                                        {/* Per-Question Breakdown */}
                                                                        {pqData.length > 0 && metricDef?.peerReviewConfig && (
                                                                            <div className="p-2 rounded bg-black/20 border border-white/5">
                                                                                <p className="text-[10px] text-gray-400 font-bold mb-1">📊 Per-Question Breakdown:</p>
                                                                                {pqData.map((pq) => (
                                                                                    <div key={pq.question_number} className="flex items-center gap-2 mb-0.5">
                                                                                        <span className="text-[9px] text-gray-500 w-6 shrink-0">Q{pq.question_number + 1}</span>
                                                                                        <div className="flex-1 h-1 bg-black/40 rounded-full overflow-hidden">
                                                                                            <div className="h-full bg-indigo-400/60" style={{ width: `${(pq.avg_score / 5) * 100}%` }} />
                                                                                        </div>
                                                                                        <span className="text-[9px] text-gray-300 w-6 text-right">{pq.avg_score.toFixed(1)}</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <p className="text-[10px] text-gray-500 italic">Belum ada peer review untuk metrik ini.</p>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            {/* SYSTEM RECOMMENDATION FOR B3 (CONVERSION RATE) */}
                                            {metric.id === 'B3' && (
                                                <div className="mt-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                                    <p className="text-[10px] text-purple-300 font-bold mb-1 flex items-center gap-1">
                                                        <BarChart3 className="w-3 h-3" /> SYSTEM RECOMMENDATION (IMS Data)
                                                    </p>
                                                    <div className="flex justify-between items-end mb-1">
                                                        <span className="text-xs text-gray-300">Conversion Rate:</span>
                                                        <span className="text-sm font-bold text-white">
                                                            {conversionRate.rate.toFixed(0)}%
                                                            <span className="text-xs font-normal text-gray-400 ml-1">
                                                                ({conversionRate.won}/{conversionRate.total} proposals)
                                                            </span>
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden mb-1">
                                                        <div className="h-full bg-purple-500 transition-all" style={{ width: `${Math.min(100, conversionRate.rate)}%` }} />
                                                    </div>
                                                    <p className="text-[9px] text-gray-500 mb-2">
                                                        → Score: {conversionRate.rate >= 60 ? '5' : conversionRate.rate >= 45 ? '4' : conversionRate.rate >= 30 ? '3' : conversionRate.rate >= 15 ? '2' : '1'}
                                                        {' '}({conversionRate.rate >= 60 ? 'Sangat efektif' : conversionRate.rate >= 45 ? 'Tinggi' : conversionRate.rate >= 30 ? 'Wajar' : conversionRate.rate >= 15 ? 'Perlu perbaikan' : 'Tidak efektif'})
                                                    </p>

                                                    <button
                                                        onClick={() => setExpandedSysRec(p => ({ ...p, B3: !p.B3 }))}
                                                        className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300"
                                                    >
                                                        {expandedSysRec.B3 ? <ChevronUp className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                                        {expandedSysRec.B3 ? 'Hide Detail' : 'View Detail'}
                                                    </button>

                                                    {expandedSysRec.B3 && proposals.length > 0 && (
                                                        <div className="mt-2 space-y-1 max-h-40 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                                                            {proposals.map(p => (
                                                                <div key={p.id} className="flex items-center gap-2 text-[10px] p-1.5 rounded bg-black/20">
                                                                    <span className={`w-4 text-center ${p.proposal_status === 'success' ? 'text-emerald-400' : p.proposal_status === 'fail' ? 'text-rose-400' : 'text-gray-500'}`}>
                                                                        {p.proposal_status === 'success' ? '✅' : p.proposal_status === 'fail' ? '❌' : '⏳'}
                                                                    </span>
                                                                    <span className="text-gray-300 flex-1 truncate">{p.name}</span>
                                                                    {p.proposal_reason && (
                                                                        <span className="text-gray-500 text-[9px] truncate max-w-[100px]">{p.proposal_reason}</span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* SYSTEM RECOMMENDATION FOR K2 (KNOWLEDGE SHARING) */}
                                            {metric.id === 'K2' && (
                                                <div className="mt-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                                    <p className="text-[10px] text-blue-300 font-bold mb-1 flex items-center gap-1">
                                                        <BarChart3 className="w-3 h-3" /> SYSTEM RECOMMENDATION (IMS Data)
                                                    </p>
                                                    <div className="flex justify-between items-end mb-1">
                                                        <span className="text-xs text-gray-300">Sharing Sessions Diadakan:</span>
                                                        <span className="text-sm font-bold text-white">
                                                            {k2Count} sesi
                                                            <span className="text-xs font-normal text-gray-400 ml-1">
                                                                (per 6 bulan)
                                                            </span>
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden mb-1">
                                                        <div className="h-full bg-blue-500 transition-all" style={{ width: `${Math.min(100, (k2Count / 4) * 100)}%` }} />
                                                    </div>
                                                    <p className="text-[9px] text-gray-500 mb-2">
                                                        → Score: {k2Count >= 4 ? '5' : k2Count >= 3 ? '4' : k2Count >= 2 ? '3' : k2Count >= 1 ? '2' : '1'}
                                                        {' '}({k2Count >= 4 ? 'Sangat aktif' : k2Count >= 3 ? 'Aktif' : k2Count >= 2 ? 'Cukup' : k2Count >= 1 ? 'Minimal' : 'Tidak ada'})
                                                    </p>

                                                    <button
                                                        onClick={() => setExpandedSysRec(p => ({ ...p, K2: !p.K2 }))}
                                                        className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300"
                                                    >
                                                        {expandedSysRec.K2 ? <ChevronUp className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                                        {expandedSysRec.K2 ? 'Hide Detail' : 'View Detail'}
                                                    </button>

                                                    {expandedSysRec.K2 && k2Sessions.length > 0 && (
                                                        <div className="mt-2 space-y-1 max-h-40 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                                                            {k2Sessions.map(s => (
                                                                <div key={s.id} className="flex items-center gap-2 text-[10px] p-1.5 rounded bg-black/20">
                                                                    <span className="text-blue-400">📢</span>
                                                                    <span className="text-gray-300 flex-1 truncate">{s.title}</span>
                                                                    <span className="text-gray-500 text-[9px] shrink-0">{new Date(s.session_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* SYSTEM RECOMMENDATION FOR K3 (INTERNAL TRAINING ATTENDANCE) */}
                                            {metric.id === 'K3' && (
                                                <div className="mt-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                                    <p className="text-[10px] text-blue-300 font-bold mb-1 flex items-center gap-1">
                                                        <BarChart3 className="w-3 h-3" /> SYSTEM RECOMMENDATION (IMS Data)
                                                    </p>
                                                    <div className="flex justify-between items-end mb-1">
                                                        <span className="text-xs text-gray-300">Kehadiran Training:</span>
                                                        <span className="text-sm font-bold text-white">
                                                            {k3Stats.percentage.toFixed(0)}%
                                                            <span className="text-xs font-normal text-gray-400 ml-1">
                                                                ({k3Stats.attended}/{k3Stats.total} sesi)
                                                            </span>
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden mb-1">
                                                        <div className="h-full bg-blue-500 transition-all" style={{ width: `${Math.min(100, k3Stats.percentage)}%` }} />
                                                    </div>
                                                    <p className="text-[9px] text-gray-500 mb-2">
                                                        → Score: {k3Stats.percentage > 80 ? '5' : k3Stats.percentage > 60 ? '4' : k3Stats.percentage > 40 ? '3' : k3Stats.percentage > 20 ? '2' : '1'}
                                                        {' '}({k3Stats.percentage > 80 ? 'Sangat disiplin' : k3Stats.percentage > 60 ? 'Disiplin' : k3Stats.percentage > 40 ? 'Cukup' : k3Stats.percentage > 20 ? 'Kurang' : 'Sangat kurang'})
                                                    </p>

                                                    <button
                                                        onClick={() => setExpandedSysRec(p => ({ ...p, K3: !p.K3 }))}
                                                        className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300"
                                                    >
                                                        {expandedSysRec.K3 ? <ChevronUp className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                                        {expandedSysRec.K3 ? 'Hide Detail' : 'View Detail'}
                                                    </button>

                                                    {expandedSysRec.K3 && k3Sessions.length > 0 && (
                                                        <div className="mt-2 space-y-1 max-h-40 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                                                            {k3Sessions.map((s: any) => (
                                                                <div key={s.id} className="flex items-center gap-2 text-[10px] p-1.5 rounded bg-black/20">
                                                                    <span className={`w-4 text-center ${s._attended ? 'text-emerald-400' : 'text-gray-500'}`}>
                                                                        {s._attended ? '✅' : '❌'}
                                                                    </span>
                                                                    <span className="text-gray-300 flex-1 truncate">{s.title}</span>
                                                                    <span className="text-gray-500 text-[9px] shrink-0">{new Date(s.session_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* SPECIAL RENDER FOR B4 (ATTENDANCE) */}
                                            {metric.id === 'B4' && (
                                                <div className="mt-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                                    <p className="text-[10px] text-purple-300 font-bold mb-1 flex items-center gap-1">
                                                        <Info className="w-3 h-3" /> SYSTEM RECOMMENDATION
                                                    </p>
                                                    <div className="flex justify-between items-end mb-1">
                                                        <span className="text-xs text-gray-300">Keterlambatan:</span>
                                                        <span className="text-sm font-bold text-white">
                                                            {attendancePercent.toFixed(1)}%
                                                            <span className="text-xs font-normal text-gray-400 ml-1">
                                                                ({attendancePercent <= 2 ? 'Excellent' : attendancePercent <= 5 ? 'Very Good' : 'Needs Improvement'})
                                                            </span>
                                                        </span>
                                                    </div>
                                                    <p className="text-[9px] text-gray-500 mb-1">Formula: Hari Terlambat / Total Kehadiran × 100%</p>
                                                    <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden mb-2">
                                                        <div
                                                            className="h-full bg-purple-500 transition-all"
                                                            style={{ width: `${Math.max(0, 100 - (attendancePercent * 5))}%` }}
                                                        ></div>
                                                    </div>
                                                    <Link
                                                        href={`/dashboard/attendance?id=${staff.id}`}
                                                        target="_blank"
                                                        className="text-[10px] text-purple-400 hover:text-purple-300 underline block text-right"
                                                    >
                                                        Check Attendance Log &gt;
                                                    </Link>
                                                </div>
                                            )}

                                            {/* K1 BLOG/NEWS LINKS (read-only for CEO) */}
                                            {metric.id === 'K1' && k1BlogLinks.length > 0 && (
                                                <div className="mt-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                                    <p className="text-[10px] text-blue-300 font-bold mb-2 flex items-center gap-1">
                                                        <ExternalLink className="w-3 h-3" /> EMPLOYEE BLOG/NEWS LINKS
                                                    </p>
                                                    <div className="space-y-1.5 overflow-hidden">
                                                        {k1BlogLinks.map((link, idx) => {
                                                            const url = typeof link === 'string' ? link : (link.url || '');
                                                            const title = typeof link === 'string' ? link : (link.title || link.url || '');
                                                            return (
                                                                <div key={idx} className="flex items-center gap-2 text-[10px] p-1.5 rounded bg-black/20">
                                                                    <span className="text-blue-400 shrink-0">📝</span>
                                                                    <a
                                                                        href={url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-blue-400 hover:text-blue-300 underline flex-1 truncate"
                                                                    >
                                                                        {title}
                                                                    </a>
                                                                    <ExternalLink className="w-3 h-3 text-gray-500 shrink-0" />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    <p className="text-[9px] text-gray-500 mt-2">
                                                        {k1BlogLinks.length} artikel disubmit oleh karyawan
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Inputs */}
                                        <div className="md:col-span-8 grid grid-cols-1 gap-4">
                                            {/* User Note Display */}
                                            {(metric as any).employee_note && (
                                                <div className="p-3 rounded-lg bg-[#e8c559]/5 border border-[#e8c559]/20 relative group">
                                                    <div className="absolute -top-2 left-3 px-2 py-0.5 bg-[#1a1a1a] text-[9px] text-[#e8c559] border border-[#e8c559]/30 rounded uppercase font-bold flex items-center gap-1">
                                                        <MessageSquare className="w-2.5 h-2.5" />
                                                        User Note
                                                    </div>
                                                    <p className="text-xs text-gray-300 italic pt-1">"{(metric as any).employee_note}"</p>
                                                </div>
                                            )}

                                            {/* Score Input */}
                                            {/* Score Input with Bullet Indicators */}
                                            <div>
                                                <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Score (1-5)</label>
                                                <div className="flex items-center gap-3">
                                                    {/* Custom Slider with Dots */}
                                                    <div className="flex-1 relative">
                                                        {/* Track */}
                                                        <div className="h-2 bg-gray-300 dark:bg-gray-700 rounded-full relative">
                                                            {/* Filled portion */}
                                                            <div
                                                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 rounded-full transition-all duration-200"
                                                                style={{ width: `${((metric.score || 0) - 1) / 4 * 100}%` }}
                                                            />
                                                        </div>
                                                        {/* Dot Indicators */}
                                                        <div className="absolute inset-0 flex justify-between items-center px-0">
                                                            {[1, 2, 3, 4, 5].map((val) => (
                                                                <button
                                                                    key={val}
                                                                    type="button"
                                                                    onClick={() => handleMetricChange(key, metric.id, 'score', val)}
                                                                    disabled={docStatus === 'final'}
                                                                    className={`w-5 h-5 rounded-full border-2 transition-all transform hover:scale-110 ${(metric.score || 0) >= val
                                                                        ? val >= 4 ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                                                                            : val >= 3 ? 'bg-amber-500 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                                                                                : 'bg-rose-500 border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                                                                        : 'bg-gray-400 border-gray-500 dark:bg-gray-800 dark:border-gray-600 hover:border-gray-600 dark:hover:border-gray-400'
                                                                        } ${docStatus === 'final' ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                                                                    title={`Score ${val}`}
                                                                >
                                                                    {(metric.score || 0) === val && (
                                                                        <div className="w-full h-full flex items-center justify-center">
                                                                            <div className="w-2 h-2 bg-white rounded-full" />
                                                                        </div>
                                                                    )}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    {/* Score Display */}
                                                    <span className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl border border-white/10 bg-black/30 ${(metric.score || 0) >= 4 ? 'text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]' :
                                                        (metric.score || 0) >= 3 ? 'text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]' :
                                                            (metric.score || 0) > 0 ? 'text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 'text-gray-600'
                                                        }`}>
                                                        {metric.score || '-'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* CEO Note Input */}
                                            <div>
                                                <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">CEO Feedback / Note</label>
                                                <textarea
                                                    value={(metric as any).note || ""}
                                                    onChange={(e) => handleMetricChange(key, metric.id, 'note', e.target.value)}
                                                    placeholder="Add detailed feedback for this metric..."
                                                    className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-xs text-gray-300 focus:border-[#e8c559] outline-none transition-all resize-none min-h-[60px]"
                                                    disabled={docStatus === 'final'}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Custom Modal Dialog */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="glass-panel rounded-2xl p-6 max-w-md w-full border border-white/20 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        {/* Icon */}
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${modalConfig.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                            modalConfig.type === 'error' ? 'bg-rose-500/20 text-rose-400' :
                                modalConfig.type === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                                    'bg-blue-500/20 text-blue-400'
                            }`}>
                            {modalConfig.type === 'success' ? (
                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            ) : modalConfig.type === 'error' ? (
                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            ) : (
                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            )}
                        </div>

                        {/* Title */}
                        <h3 className="text-xl font-bold text-white text-center mb-2">{modalConfig.title}</h3>

                        {/* Message */}
                        <p className="text-gray-300 text-center text-sm whitespace-pre-line mb-6">{modalConfig.message}</p>

                        {/* Buttons */}
                        <div className="flex gap-3 justify-center">
                            {modalConfig.cancelText && (
                                <button
                                    onClick={() => setModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors border border-white/10"
                                >
                                    {modalConfig.cancelText}
                                </button>
                            )}
                            {modalConfig.onConfirm ? (
                                <button
                                    onClick={modalConfig.onConfirm}
                                    className={`px-5 py-2.5 rounded-xl font-semibold transition-colors ${modalConfig.type === 'error' ? 'bg-rose-500 hover:bg-rose-600 text-white' :
                                        modalConfig.type === 'warning' ? 'bg-amber-500 hover:bg-amber-600 text-black' :
                                            'bg-[#e8c559] hover:bg-[#d4a843] text-black'
                                        }`}
                                >
                                    {modalConfig.confirmText || 'OK'}
                                </button>
                            ) : (
                                <button
                                    onClick={() => setModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl bg-[#e8c559] hover:bg-[#d4a843] text-black font-semibold transition-colors"
                                >
                                    OK
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
