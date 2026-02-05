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
    ArrowLeft
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import {
    StaffRole,
    getGroupedMetrics,
    KPI_CATEGORIES,
    KPIMetric,
    SCORE_LEVELS
} from "../command-center/kpi-data";

export default function MyKPIPage() {
    const { profile, isLoading: authLoading } = useAuth();
    const supabase = createClient();

    const [kpiData, setKpiData] = useState<any>(null); // Store raw DB data
    const [loading, setLoading] = useState(true);

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
                    .eq('period', '2026-S1') // Hardcoded period for now as per plan
                    .single();

                if (error && error.code !== 'PGRST116') { // PGRST116 is no rows
                    console.error("Error fetching KPI:", error);
                }

                setKpiData(data);
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
    const mapProfileToStaffRole = (p: any): StaffRole => {
        // Simple heuristic map
        const title = (p.job_title || '').toLowerCase();
        const level = (p.job_level || '').toLowerCase();

        if (title.includes('sales')) return 'sales_staff';
        if (title.includes('business') || title.includes('bisdev')) return 'bisdev';
        if (level.includes('supervisor') || level.includes('senior')) return 'analyst_supervisor';
        return 'analyst_staff';
    };

    const staffRole = mapProfileToStaffRole(profile);
    const groupedDefinitions = getGroupedMetrics(staffRole);

    // 2. Merge Definitions with Scores
    // kpiData.kpi_sub_aspect_scores is an array of { sub_aspect_id, score, note }
    const getScoreForMetric = (metricId: string) => {
        const scoreRec = kpiData.kpi_sub_aspect_scores?.find((s: any) => s.sub_aspect_id === metricId);
        return scoreRec || { score: 0, note: '-' };
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
            const { score, note } = getScoreForMetric(m.id);
            return { ...m, score, note };
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
                        <span>/</span>
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
                <Link
                    href="/dashboard"
                    className="px-4 py-2 rounded-lg bg-[var(--glass-bg)] hover:bg-[var(--glass-border)] text-[var(--text-secondary)] font-medium transition-colors flex items-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Kembali
                </Link>
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
                    <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20">
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
                                        <th className="px-6 py-3 font-medium">CEO Note / Feedback</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--glass-border)]">
                                    {pillar.metrics.map((metric: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-[var(--glass-bg-hover)] transition-colors">
                                            <td className="px-6 py-4 font-medium text-[var(--text-primary)] max-w-xs">
                                                <div>{metric.name}</div>
                                                <div className="text-[10px] text-[var(--text-muted)] font-normal mt-1">{metric.criteria}</div>
                                                {metric.id === 'B4' && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] text-blue-500 dark:text-blue-400 mt-1">
                                                        <Info className="w-3 h-3" /> System Calculated
                                                    </span>
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
                                            <td className="px-6 py-4 text-[var(--text-muted)] text-xs italic">
                                                {metric.ceo_note || metric.note || '-'}
                                            </td>
                                        </tr>
                                    ))}
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
