"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
    Briefcase,
    BookOpen,
    Users,
    Star,
    TrendingUp,
    Award,
    Target,
    Info,
    AlertCircle,
    ArrowLeft,
    Save,
    HelpCircle,
    ChevronDown,
    ChevronUp,
    ChevronRight,
    MessageSquare,
    BarChart3,
    Lock,
    Clock,
    Eye,
    Check,
    X,
    LinkIcon,
    ExternalLink,
    Plus,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import {
    StaffRole,
    getGroupedMetrics,
    KPI_CATEGORIES,
    KPIMetric,
    SCORE_LEVELS,
    mapProfileToStaffRole,
    KPI_METRICS_DEFINITION,
} from "../command-center/kpi-data";

// Peer review aggregate type
interface PeerReviewAgg {
    kpi_metric_id: string;
    reviewer_count: number;
    avg_score: number;
    comments: string[];
}

interface ProposalItem {
    id: string;
    name: string;
    proposal_status: 'success' | 'fail' | null;
    proposal_reason: string | null;
}

export default function MyKPIPage() {
    const { profile, isLoading: authLoading } = useAuth();
    const supabase = createClient();

    const [kpiData, setKpiData] = useState<any>(null); // Store raw DB data
    const [loading, setLoading] = useState(true);
    const [expandedCriteria, setExpandedCriteria] = useState<Record<string, boolean>>({});

    // Notes tracking
    const [localNotes, setLocalNotes] = useState<Record<string, string>>({});
    const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

    // Blog links tracking for K1
    const [blogLinks, setBlogLinks] = useState<string[]>([]);
    const [newBlogLink, setNewBlogLink] = useState('');

    // Peer review + conversion rate state
    const [peerAggregates, setPeerAggregates] = useState<PeerReviewAgg[]>([]);
    const [proposals, setProposals] = useState<ProposalItem[]>([]);
    const [conversionRate, setConversionRate] = useState<{ rate: number; won: number; total: number }>({ rate: 0, won: 0, total: 0 });
    const [attendanceStats, setAttendanceStats] = useState({ latePercentage: 0, lateDays: 0, totalDays: 0 });
    const [expandedPeerFeedback, setExpandedPeerFeedback] = useState<Record<string, boolean>>({});
    const [expandedSysRec, setExpandedSysRec] = useState<Record<string, boolean>>({});

    // K2 & K3 Sharing Session / Internal Training state
    const [k2Count, setK2Count] = useState(0);
    const [k2Sessions, setK2Sessions] = useState<{ id: string; title: string; session_date: string }[]>([]);
    const [k3Stats, setK3Stats] = useState<{ attended: number; total: number; percentage: number }>({ attended: 0, total: 0, percentage: 0 });
    const [k3Sessions, setK3Sessions] = useState<any[]>([]);

    const toggleCriteria = (id: string) => {
        setExpandedCriteria(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleNoteChange = (subAspectId: string, note: string) => {
        setLocalNotes(prev => ({ ...prev, [subAspectId]: note }));
    };

    const addBlogLink = async () => {
        const url = newBlogLink.trim();
        if (!url) return;
        if (blogLinks.includes(url)) { setNewBlogLink(''); return; }
        const newLinks = [...blogLinks, url];
        setBlogLinks(newLinks);
        setNewBlogLink('');
        await saveBlogLinksToDB(newLinks);
    };

    const removeBlogLink = async (url: string) => {
        const newLinks = blogLinks.filter(l => l !== url);
        setBlogLinks(newLinks);
        await saveBlogLinksToDB(newLinks);
    };

    const saveBlogLinksToDB = async (links: string[]) => {
        if (!kpiData || !profile) return;
        setSavingNoteId('K1_blog');
        try {
            const { error } = await supabase
                .from('kpi_sub_aspect_scores')
                .upsert({
                    kpi_score_id: kpiData.id,
                    sub_aspect_id: 'K1',
                    blog_links: links
                }, { onConflict: 'kpi_score_id,sub_aspect_id' });
            if (error) throw error;
        } catch (err: any) {
            console.error("Error saving blog links:", err);
            alert("Failed to save blog links: " + err.message);
        } finally {
            setSavingNoteId(null);
        }
    };

    const saveSingleNote = async (subAspectId: string) => {
        if (!kpiData || !profile) return;
        const noteToSave = localNotes[subAspectId];
        if (noteToSave === undefined) return;

        setSavingNoteId(subAspectId);
        try {
            const upsertData: any = {
                kpi_score_id: kpiData.id,
                sub_aspect_id: subAspectId,
                employee_note: noteToSave
            };
            // Also persist blog links when saving K1 note
            if (subAspectId === 'K1') {
                upsertData.blog_links = blogLinks;
            }
            const { error } = await supabase
                .from('kpi_sub_aspect_scores')
                .upsert(upsertData, { onConflict: 'kpi_score_id,sub_aspect_id' });

            if (error) throw error;

            // Update kpiData state so the saved note becomes the baseline
            setKpiData((prev: any) => {
                const newScores = [...(prev.kpi_sub_aspect_scores || [])];
                const idx = newScores.findIndex((s: any) => s.sub_aspect_id === subAspectId);
                if (idx >= 0) {
                    newScores[idx] = { ...newScores[idx], employee_note: noteToSave };
                } else {
                    newScores.push({ sub_aspect_id: subAspectId, employee_note: noteToSave, kpi_score_id: prev.id });
                }
                return { ...prev, kpi_sub_aspect_scores: newScores };
            });

            // Clear from local tracking
            setLocalNotes(prev => {
                const updated = { ...prev };
                delete updated[subAspectId];
                return updated;
            });

        } catch (err: any) {
            console.error("Error saving note:", err);
            alert("Failed to save note: " + err.message);
        } finally {
            setSavingNoteId(null);
        }
    };

    const cancelNoteChange = (subAspectId: string) => {
        setLocalNotes(prev => {
            const updated = { ...prev };
            delete updated[subAspectId];
            return updated;
        });
    };

    // Fetch KPI Data
    useEffect(() => {
        const fetchKPI = async () => {
            if (authLoading) return;
            if (!profile) {
                setLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('kpi_scores')
                    .select('*, kpi_sub_aspect_scores(*)')
                    .eq('profile_id', profile.id)
                    .eq('period', '2026-S1')
                    .single();

                if (error && error.code !== 'PGRST116') {
                    console.error("Error fetching KPI:", error);
                }

                setKpiData(data);

                // Initialize blog links from K1 score data
                const k1Score = data?.kpi_sub_aspect_scores?.find((s: any) => s.sub_aspect_id === 'K1');
                if (k1Score?.blog_links && Array.isArray(k1Score.blog_links)) {
                    setBlogLinks(k1Score.blog_links);
                }

                // Fetch peer review aggregates for this user
                const { data: aggData } = await supabase
                    .from('peer_review_aggregated')
                    .select('*')
                    .eq('reviewee_id', profile.id)
                    .eq('period', '2026-S1');

                if (aggData) {
                    setPeerAggregates(aggData.map((a: any) => ({
                        kpi_metric_id: a.kpi_metric_id,
                        reviewer_count: a.reviewer_count,
                        avg_score: parseFloat(a.avg_score) || 0,
                        comments: a.comments || [],
                    })));
                }

                // Fetch B3 conversion rate (projects where user is lead, member, or helper)
                const { data: leadProjects } = await supabase
                    .from('projects')
                    .select('id, name, category, proposal_status, proposal_reason')
                    .eq('lead_id', profile.id)
                    .eq('is_archived', false)
                    .eq('category', 'proposal');

                const { data: memberData } = await supabase
                    .from('project_members')
                    .select('project:projects(id, name, category, proposal_status, proposal_reason)')
                    .eq('profile_id', profile.id);

                const { data: helperData } = await supabase
                    .from('project_helpers')
                    .select('project:projects(id, name, category, proposal_status, proposal_reason)')
                    .eq('profile_id', profile.id);

                const combinedMap = new Map<string, any>();

                // Add Leads
                leadProjects?.forEach((p: any) => combinedMap.set(p.id, p));

                // Add Members
                memberData?.forEach((m: any) => {
                    const p = m.project;
                    if (p && p.category === 'proposal' && !combinedMap.has(p.id)) {
                        combinedMap.set(p.id, p);
                    }
                });

                // Add Helpers
                helperData?.forEach((h: any) => {
                    const p = h.project;
                    if (p && p.category === 'proposal' && !combinedMap.has(p.id)) {
                        combinedMap.set(p.id, p);
                    }
                });

                const allProposals = Array.from(combinedMap.values());
                const decidedProposals = allProposals.filter((p: any) => p.proposal_status === 'success' || p.proposal_status === 'fail');
                setProposals(decidedProposals);

                const successProposals = decidedProposals.filter((p: any) => p.proposal_status === 'success').length;
                const totalDecided = decidedProposals.length;

                setConversionRate({
                    rate: totalDecided > 0 ? Math.round((successProposals / totalDecided) * 100) : 0,
                    won: successProposals,
                    total: totalDecided,
                });

                // Fetch attendance stats for B4
                const { data: attendanceData } = await supabase
                    .from('daily_checkins')
                    .select('id, is_late')
                    .eq('profile_id', profile.id)
                    .gte('checkin_date', '2026-01-01');

                if (attendanceData) {
                    const totalDays = attendanceData.length;
                    const lateDays = attendanceData.filter((a: any) => a.is_late).length;

                    setAttendanceStats({
                        totalDays,
                        lateDays,
                        latePercentage: totalDays > 0 ? (lateDays / totalDays) * 100 : 0
                    });
                }

                // Fetch K2: Sharing Sessions where user is speaker
                const { data: speakerSessions } = await supabase
                    .from('sharing_sessions')
                    .select('id, title, session_date, session_type')
                    .eq('speaker_id', profile.id)
                    .eq('session_type', 'sharing_session')
                    .gte('session_date', '2026-01-01')
                    .order('session_date', { ascending: false });

                if (speakerSessions) {
                    setK2Sessions(speakerSessions);
                    setK2Count(speakerSessions.length);
                }

                // Fetch K3: Internal Training attendance
                const { data: allTrainings } = await supabase
                    .from('sharing_sessions')
                    .select('id, title, session_date, session_type')
                    .eq('session_type', 'internal_training')
                    .gte('session_date', '2026-01-01')
                    .order('session_date', { ascending: false });

                const totalTrainings = allTrainings?.length || 0;
                if (totalTrainings > 0) {
                    const trainingIds = allTrainings!.map((t: any) => t.id);
                    const { data: participationData } = await supabase
                        .from('sharing_session_participants')
                        .select('session_id, participation_status')
                        .eq('profile_id', profile.id)
                        .in('session_id', trainingIds)
                        .eq('participation_status', 'full');

                    const attendedCount = participationData?.length || 0;
                    const attendedIds = new Set(participationData?.map((p: any) => p.session_id) || []);

                    setK3Sessions(allTrainings!.map((t: any) => ({ ...t, _attended: attendedIds.has(t.id) })));
                    setK3Stats({
                        attended: attendedCount,
                        total: totalTrainings,
                        percentage: (attendedCount / totalTrainings) * 100
                    });
                }

            } catch (err) {
                console.error("KPI fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchKPI();
    }, [profile, authLoading]);

    // Handle Loading & Auth
    if (authLoading || loading) {
        return <div className="p-10 text-white text-center">Loading performance data...</div>;
    }

    // Handle Intern Exclusion
    if (profile?.job_type === 'intern' || profile?.job_level === 'Intern') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                    <Info className="w-10 h-10 text-gray-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">KPI Not Applicable</h1>
                <p className="text-gray-400 max-w-md">
                    Key Performance Indicators (KPI) evaluation is not applicable for {profile?.job_type === 'intern' ? 'Intern' : 'this'} role.
                    Please focus on your assigned tasks and learning objectives.
                </p>
            </div>
        );
    }

    // Handle No KPI Data
    if (!kpiData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                    <Target className="w-10 h-10 text-gray-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">KPI Assessment Pending</h1>
                <p className="text-gray-400 max-w-md">
                    Your Key Performance Indicators for this period have not been finalized yet.
                    Please check back later or contact your supervisor.
                </p>
            </div>
        );
    }

    // Transform Data for Display
    // 1. Determine Role (Simplification: Map profile role/level to one of the StaffRoles)
    // Needs better logic in production, for now default to 'analyst_staff' if undefined
    const staffRole = mapProfileToStaffRole(profile?.job_level || null, profile?.job_type || null) || 'analyst_staff';
    const groupedDefinitions = getGroupedMetrics(staffRole);

    // 2. Merge Definitions with Scores
    // kpiData.kpi_sub_aspect_scores is an array of { sub_aspect_id, score, note }
    const getScoreForMetric = (metricId: string) => {
        const scoreRec = kpiData.kpi_sub_aspect_scores?.find((s: any) => s.sub_aspect_id === metricId);
        return scoreRec || { score: 0, note: '-', employee_note: '', blog_links: [] };
    };

    const pillars = [
        { key: 'knowledge', def: KPI_CATEGORIES.KNOWLEDGE, metrics: groupedDefinitions.knowledge, icon: BookOpen },
        { key: 'people', def: KPI_CATEGORIES.PEOPLE, metrics: groupedDefinitions.people, icon: Users },
        { key: 'service', def: KPI_CATEGORIES.SERVICE, metrics: groupedDefinitions.service, icon: Star },
        { key: 'business', def: KPI_CATEGORIES.BUSINESS, metrics: groupedDefinitions.business, icon: TrendingUp },
        { key: 'leadership', def: KPI_CATEGORIES.LEADERSHIP, metrics: groupedDefinitions.leadership, icon: Award },
    ].map(p => {
        // Filter metrics that have weight > 0 (already done in getGroupedMetrics, but safe to verify)
        // And merge scores
        const metricsWithScores = p.metrics.map(m => {
            const { score, note, employee_note, blog_links: savedBlogLinks } = getScoreForMetric(m.id);
            return { ...m, score, note, employee_note, blog_links: savedBlogLinks || [] };
        });

        // Calculate Pillar Average Score (if needed for display)
        // Or usage pillar scores from kpiData if available
        const dbPillarScore = kpiData[`score_${p.key}`]; // Assuming kpi_scores has score_knowledge, etc.

        return {
            ...p.def,
            icon: p.icon,
            metrics: metricsWithScores,
            pillarScore: dbPillarScore
        };
    }).filter(p => p.metrics.length > 0); // Hide empty pillars

    // Get Final Level
    const finalScore = kpiData.final_score || 0;
    const finalLevel = SCORE_LEVELS.find(l => finalScore >= l.min && finalScore < l.max) || SCORE_LEVELS[2];

    return (
        <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-10">
            {/* Disclaimer Bar */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs">
                <Info className="h-4 w-4" />
                <p>Halaman ini bersifat <span className="font-bold">RAHASIA & PRIBADI</span>. Hanya Anda yang dapat melihat detail penilaian kinerja ini.</p>
            </div>

            {/* Standardized Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-1">
                        <Link href="/dashboard" className="hover:text-[#3f545f] dark:hover:text-[#e8c559]">Dashboard</Link>
                        <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                        <span className="text-[var(--text-primary)]">My KPI</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl text-white shadow-lg">
                            <Target className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                                    My KPI
                                </h1>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${kpiData.status === 'final' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                    kpiData.status === 'draft' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                                    }`}>
                                    {kpiData.status === 'final' ? 'Finalized' : kpiData.status === 'draft' ? 'In Review' : 'Pending'}
                                </span>
                            </div>
                            <p className="text-[var(--text-secondary)] text-sm">
                                Performance Report • {profile?.job_title} • {kpiData.period}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href="/dashboard"
                        className="px-4 py-2 rounded-lg bg-[var(--glass-bg)] hover:bg-[var(--glass-border)] text-[var(--text-secondary)] font-medium transition-colors flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Kembali
                    </Link>
                </div>
            </div>

            {/* Summary Stats Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {/* Total Score */}
                <div className="glass-panel p-5 rounded-xl flex items-center gap-4">
                    <div className="p-3 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-500/20">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-[var(--text-muted)] font-medium uppercase tracking-wider">Total Score</p>
                        <p className="text-3xl font-black text-[var(--text-primary)]">{Number(finalScore).toFixed(2)}</p>
                    </div>
                </div>

                {/* Rating */}
                <div className="glass-panel p-5 rounded-xl flex items-center gap-4">
                    <div className={`p-3 rounded-xl shadow-lg ${finalLevel.bgLight.replace('100', '500').replace('50', '500').replace('/10', '')} text-white`}>
                        <Award className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-[var(--text-muted)] font-medium uppercase tracking-wider">Rating</p>
                        <p className={`text-xl font-bold ${finalLevel.color}`}>{finalLevel.label}</p>
                    </div>
                </div>

                {/* Period Info */}
                <div className="glass-panel p-5 rounded-xl flex items-center gap-4">
                    <div className="p-3 bg-violet-500 text-white rounded-xl shadow-lg shadow-violet-500/20">
                        <Briefcase className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-[var(--text-muted)] font-medium uppercase tracking-wider">Period</p>
                        <p className="text-xl font-bold text-[var(--text-primary)]">{kpiData.period}</p>
                    </div>
                </div>
            </div>

            {/* Main Content: Detailed Tables per Pillar */}
            <div className="space-y-8">
                {pillars.map((pillar) => (
                    <div key={pillar.id} className="glass-panel rounded-xl overflow-hidden">
                        {/* Pillar Header */}
                        <div className="p-4 border-b border-[var(--glass-border)] bg-[var(--surface-color-alt)] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg bg-${pillar.color}-100 text-${pillar.color}-600 dark:bg-${pillar.color}-500/20 dark:text-${pillar.color}-400`}>
                                    <pillar.icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-[var(--text-primary)] text-lg">{pillar.label}</h3>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        Total Weights: {pillar.metrics.reduce((acc, m) => acc + m.weight, 0)}%
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-[var(--text-primary)]">{pillar.pillarScore ? Number(pillar.pillarScore).toFixed(1) : '-'}</p>
                                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Pillar Score</p>
                            </div>
                        </div>

                        {/* Metrics Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-[var(--text-muted)] uppercase bg-[var(--surface-color)] border-b border-[var(--glass-border)]">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Metric / Indikator</th>
                                        <th className="px-6 py-3 font-medium text-center">Weight</th>
                                        <th className="px-6 py-3 font-medium text-center">Skor (1-5)</th>
                                        <th className="px-6 py-3 font-medium">Your Note / Justification</th>
                                        <th className="px-6 py-3 font-medium">CEO Note / Feedback</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--glass-border)]">
                                    {pillar.metrics.map((metric: any, idx: number) => {
                                        const originalNote = metric.employee_note || '';
                                        const currentNote = localNotes[metric.id] !== undefined ? localNotes[metric.id] : originalNote;
                                        const isEditing = currentNote !== originalNote;

                                        return (
                                            <tr key={idx} className="hover:bg-[var(--glass-bg-hover)] transition-colors">
                                                <td className="px-6 py-4 font-medium text-[var(--text-primary)] max-w-xs align-top">
                                                    <div>{metric.name}</div>
                                                    <div className="text-[10px] text-[var(--text-muted)] font-normal mt-1">{metric.criteria}</div>

                                                    {/* Scoring Criteria Toggle */}
                                                    {metric.scoring_criteria && (
                                                        <div className="mt-2">
                                                            <button
                                                                onClick={() => toggleCriteria(metric.id)}
                                                                className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                                                            >
                                                                {expandedCriteria[metric.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                                {expandedCriteria[metric.id] ? "Hide Guidelines" : "Show Scoring Guidelines"}
                                                            </button>

                                                            {expandedCriteria[metric.id] && (
                                                                <div className="mt-2 p-2 rounded bg-black/20 border border-white/5 text-[10px] space-y-1">
                                                                    {Object.entries(metric.scoring_criteria).map(([score, desc]: any) => (
                                                                        <div key={score} className="flex gap-2">
                                                                            <span className={`font-bold w-3 shrink-0 ${score >= 4 ? 'text-emerald-400' :
                                                                                score >= 3 ? 'text-amber-400' : 'text-rose-400'
                                                                                }`}>{score}:</span>
                                                                            <span className="text-gray-400">{desc}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {metric.id === 'B4' && (
                                                        <div className="mt-2 space-y-2">
                                                            <span className="inline-flex items-center gap-1 text-[10px] text-purple-500 dark:text-purple-400 mt-1">
                                                                <Info className="w-3 h-3" /> System Calculated
                                                            </span>
                                                            {attendanceStats.totalDays > 0 && (
                                                                <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                                                    <div className="flex items-center gap-1.5 mb-1">
                                                                        <Clock className="w-3 h-3 text-purple-400" />
                                                                        <span className="text-[10px] font-bold text-purple-400">Kehadiran (YTD)</span>
                                                                    </div>
                                                                    <p className="text-[10px] text-gray-300">
                                                                        Lateness Rate: <span className="text-white font-bold">{attendanceStats.latePercentage.toFixed(1)}%</span>
                                                                        <span className="text-gray-500 ml-1">({attendanceStats.lateDays}/{attendanceStats.totalDays} hari)</span>
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Peer Review Badge & Feedback */}
                                                    {metric.isPeerReview && (() => {
                                                        const agg = peerAggregates.find(a => a.kpi_metric_id === metric.id);
                                                        const isExpanded = expandedPeerFeedback[metric.id] || false;

                                                        return (
                                                            <div className="mt-2 p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                                                                <div className="flex items-center gap-1.5 mb-1">
                                                                    <Lock className="w-3 h-3 text-indigo-400" />
                                                                    <span className="text-[10px] font-bold text-indigo-400">Peer Reviewed</span>
                                                                </div>
                                                                {agg ? (
                                                                    <>
                                                                        <p className="text-[10px] text-gray-300">
                                                                            Dinilai oleh <span className="text-white font-bold">{agg.reviewer_count}</span> rekan kerja
                                                                        </p>
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <span className="text-xs text-gray-400">Avg:</span>
                                                                            <span className="text-xs font-bold text-white">{agg.avg_score.toFixed(1)}/5.0</span>
                                                                            <div className="flex-1 h-1 bg-black/30 rounded-full overflow-hidden">
                                                                                <div className="h-full bg-indigo-400" style={{ width: `${(agg.avg_score / 5) * 100}%` }} />
                                                                            </div>
                                                                        </div>

                                                                        {agg.comments.length > 0 && (
                                                                            <>
                                                                                <button
                                                                                    onClick={() => setExpandedPeerFeedback(p => ({ ...p, [metric.id]: !p[metric.id] }))}
                                                                                    className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 mt-1.5"
                                                                                >
                                                                                    <MessageSquare className="w-3 h-3" />
                                                                                    {isExpanded ? 'Sembunyikan' : `${agg.comments.length} Komentar Anonim`}
                                                                                </button>
                                                                                {isExpanded && (
                                                                                    <div className="mt-1.5 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                                                                                        {agg.comments.map((c, i) => (
                                                                                            <p key={i} className="text-[10px] text-gray-300 italic pl-2 border-l border-indigo-500/30">
                                                                                                "{c}"
                                                                                            </p>
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                            </>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <p className="text-[10px] text-gray-500 italic">Belum ada review dari rekan kerja.</p>
                                                                )}
                                                                <p className="text-[9px] text-gray-600 mt-1">Skor final ditentukan oleh CEO</p>
                                                            </div>
                                                        );
                                                    })()}

                                                    {/* K1 Blog Links Badge */}
                                                    {metric.id === 'K1' && (
                                                        <div className="mt-2 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                                            <div className="flex items-center gap-1.5 mb-1">
                                                                <LinkIcon className="w-3 h-3 text-blue-400" />
                                                                <span className="text-[10px] font-bold text-blue-400">Blog/News Links</span>
                                                                {blogLinks.length > 0 && (
                                                                    <span className="text-[9px] text-gray-500 ml-auto">{blogLinks.length} artikel terlampir</span>
                                                                )}
                                                            </div>

                                                            {/* Existing links */}
                                                            {blogLinks.length > 0 && (
                                                                <div className="space-y-1 mb-2 max-h-32 overflow-y-auto">
                                                                    {blogLinks.map((link, i) => (
                                                                        <div key={i} className="flex items-center gap-2 text-[10px] p-1.5 rounded bg-black/20 border border-white/5 group">
                                                                            <ExternalLink className="w-3 h-3 text-blue-400 shrink-0" />
                                                                            <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200 truncate flex-1" title={link}>
                                                                                {link}
                                                                            </a>
                                                                            {kpiData.status !== 'final' && (
                                                                                <button onClick={() => removeBlogLink(link)} className="text-gray-600 hover:text-rose-400 transition-colors shrink-0 opacity-0 group-hover:opacity-100">
                                                                                    <X className="w-3 h-3" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {/* Add new link */}
                                                            {kpiData.status !== 'final' && (
                                                                <div className="flex items-center gap-1.5">
                                                                    <input
                                                                        type="url"
                                                                        value={newBlogLink}
                                                                        onChange={e => setNewBlogLink(e.target.value)}
                                                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addBlogLink(); } }}
                                                                        placeholder="Paste blog/news URL..."
                                                                        className="flex-1 bg-black/30 border border-white/10 rounded px-2 py-1 text-[10px] text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50"
                                                                        disabled={savingNoteId === 'K1_blog'}
                                                                    />
                                                                    <button
                                                                        onClick={addBlogLink}
                                                                        disabled={savingNoteId === 'K1_blog' || !newBlogLink.trim()}
                                                                        className="p-1 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                                                                        title="Add link"
                                                                    >
                                                                        {savingNoteId === 'K1_blog' ? <span className="w-3 h-3 block animate-spin">⏳</span> : <Plus className="w-3 h-3" />}
                                                                    </button>
                                                                </div>
                                                            )}

                                                            {blogLinks.length === 0 && kpiData.status === 'final' && (
                                                                <p className="text-[10px] text-gray-500 italic">Tidak ada link blog yang dilampirkan.</p>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* B3 Conversion Rate Badge */}
                                                    {metric.id === 'B3' && (
                                                        <div className="mt-2 p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                                            <div className="flex items-center gap-1.5 mb-1">
                                                                <BarChart3 className="w-3 h-3 text-purple-400" />
                                                                <span className="text-[10px] font-bold text-purple-400">System Calculated</span>
                                                            </div>
                                                            <p className="text-[10px] text-gray-300">
                                                                Conversion Rate: <span className="text-white font-bold">{conversionRate.rate.toFixed(0)}%</span>
                                                                <span className="text-gray-500 ml-1">({conversionRate.won}/{conversionRate.total} proposals)</span>
                                                            </p>
                                                            <div className="h-1 bg-black/30 rounded-full overflow-hidden mt-1 mb-2">
                                                                <div className="h-full bg-purple-400" style={{ width: `${Math.min(100, conversionRate.rate)}%` }} />
                                                            </div>

                                                            <button
                                                                onClick={() => setExpandedSysRec(p => ({ ...p, B3: !p.B3 }))}
                                                                className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
                                                            >
                                                                {expandedSysRec.B3 ? <ChevronUp className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                                                {expandedSysRec.B3 ? 'Hide Detail' : 'View Detail'}
                                                            </button>

                                                            {expandedSysRec.B3 && proposals.length > 0 && (
                                                                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                                                                    {proposals.map(p => (
                                                                        <div key={p.id} className="flex items-center gap-2 text-[10px] p-1.5 rounded bg-black/20 border border-white/5">
                                                                            <span className={`w-4 text-center ${p.proposal_status === 'success' ? 'text-emerald-400' : p.proposal_status === 'fail' ? 'text-rose-400' : 'text-gray-500'}`}>
                                                                                {p.proposal_status === 'success' ? '✅' : p.proposal_status === 'fail' ? '❌' : '⏳'}
                                                                            </span>
                                                                            <div className="flex flex-col flex-1 overflow-hidden min-w-0">
                                                                                <span className="text-gray-300 truncate w-full">{p.name}</span>
                                                                                {p.proposal_reason && (
                                                                                    <span className="text-gray-500 text-[9px] truncate w-full">{p.proposal_reason}</span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* K2 Sharing Session Badge */}
                                                    {metric.id === 'K2' && (
                                                        <div className="mt-2 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                                            <div className="flex items-center gap-1.5 mb-1">
                                                                <BarChart3 className="w-3 h-3 text-blue-400" />
                                                                <span className="text-[10px] font-bold text-blue-400">System Calculated (IMS)</span>
                                                            </div>
                                                            <p className="text-[10px] text-gray-300">
                                                                Sharing Sessions: <span className="text-white font-bold">{k2Count} sesi</span>
                                                                <span className="text-gray-500 ml-1">(per 6 bulan)</span>
                                                            </p>
                                                            <div className="h-1 bg-black/30 rounded-full overflow-hidden mt-1 mb-1">
                                                                <div className="h-full bg-blue-400" style={{ width: `${Math.min(100, (k2Count / 4) * 100)}%` }} />
                                                            </div>
                                                            <p className="text-[9px] text-gray-500 mb-2">
                                                                → Score: {k2Count >= 4 ? '5' : k2Count >= 3 ? '4' : k2Count >= 2 ? '3' : k2Count >= 1 ? '2' : '1'}
                                                                {' '}({k2Count >= 4 ? 'Sangat aktif' : k2Count >= 3 ? 'Aktif' : k2Count >= 2 ? 'Cukup' : k2Count >= 1 ? 'Minimal' : 'Tidak ada'})
                                                            </p>

                                                            <button
                                                                onClick={() => setExpandedSysRec(p => ({ ...p, K2: !p.K2 }))}
                                                                className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
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

                                                    {/* K3 Internal Training Attendance Badge */}
                                                    {metric.id === 'K3' && (
                                                        <div className="mt-2 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                                            <div className="flex items-center gap-1.5 mb-1">
                                                                <BarChart3 className="w-3 h-3 text-blue-400" />
                                                                <span className="text-[10px] font-bold text-blue-400">System Calculated (IMS)</span>
                                                            </div>
                                                            <p className="text-[10px] text-gray-300">
                                                                Kehadiran Training: <span className="text-white font-bold">{k3Stats.percentage.toFixed(0)}%</span>
                                                                <span className="text-gray-500 ml-1">({k3Stats.attended}/{k3Stats.total} sesi)</span>
                                                            </p>
                                                            <div className="h-1 bg-black/30 rounded-full overflow-hidden mt-1 mb-1">
                                                                <div className="h-full bg-blue-400" style={{ width: `${Math.min(100, k3Stats.percentage)}%` }} />
                                                            </div>
                                                            <p className="text-[9px] text-gray-500 mb-2">
                                                                → Score: {k3Stats.percentage > 80 ? '5' : k3Stats.percentage > 60 ? '4' : k3Stats.percentage > 40 ? '3' : k3Stats.percentage > 20 ? '2' : '1'}
                                                                {' '}({k3Stats.percentage > 80 ? 'Sangat disiplin' : k3Stats.percentage > 60 ? 'Disiplin' : k3Stats.percentage > 40 ? 'Cukup' : k3Stats.percentage > 20 ? 'Kurang' : 'Sangat kurang'})
                                                            </p>

                                                            <button
                                                                onClick={() => setExpandedSysRec(p => ({ ...p, K3: !p.K3 }))}
                                                                className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
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
                                                </td>
                                                <td className="px-6 py-4 text-center text-[var(--text-secondary)]">
                                                    {metric.weight}%
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="inline-block relative">
                                                        {/* Visual score bar background */}
                                                        <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700/50 rounded-full mb-1">
                                                            <div
                                                                className={`h-full rounded-full ${metric.score >= 4 ? 'bg-emerald-500' :
                                                                    metric.score >= 3 ? 'bg-amber-500' :
                                                                        metric.score > 0 ? 'bg-rose-500' : 'bg-gray-400'
                                                                    }`}
                                                                style={{ width: `${(metric.score / 5) * 100}%` }}
                                                            />
                                                        </div>
                                                        <span className={`font-bold ${metric.score >= 4 ? 'text-emerald-600 dark:text-emerald-400' :
                                                            metric.score >= 3 ? 'text-amber-600 dark:text-amber-400' :
                                                                metric.score > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-[var(--text-muted)]'
                                                            }`}>
                                                            {metric.score || '-'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 align-top">
                                                    <div className="relative">
                                                        <textarea
                                                            value={currentNote}
                                                            onChange={(e) => handleNoteChange(metric.id, e.target.value)}
                                                            placeholder="Add your note/justification here..."
                                                            className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-xs text-gray-300 focus:border-blue-500 outline-none transition-all resize-none h-[80px]"
                                                            disabled={kpiData.status === 'final'}
                                                        />
                                                        {isEditing && (
                                                            <div className="flex items-center gap-2 mt-2 justify-end">
                                                                <button
                                                                    onClick={() => cancelNoteChange(metric.id)}
                                                                    className="p-1 rounded bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors"
                                                                    title="Cancel"
                                                                    disabled={savingNoteId === metric.id}
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => saveSingleNote(metric.id)}
                                                                    className="p-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                                                                    title="Save"
                                                                    disabled={savingNoteId === metric.id}
                                                                >
                                                                    {savingNoteId === metric.id ? (
                                                                        <div className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                                                                    ) : (
                                                                        <Check className="w-4 h-4" />
                                                                    )}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-[var(--text-muted)] text-xs italic align-top">
                                                    {metric.ceo_note || metric.note || '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>

            {/* Calculation Note */}
            <div className="glass-panel p-4 rounded-xl text-xs text-gray-500">
                <p className="font-bold mb-1">💡 Catatan Perhitungan:</p>
                <p>Total Score adalah akumulasi dari (Skor Sub-Aspek × Bobot Sub-Aspek). Setiap sub-aspek memiliki bobot spesifik sesuai role Anda.</p>
            </div>
        </div>
    );
}
