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
    AlertCircle
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

            {/* Header / Summary Card */}
            <div className="glass-panel p-8 rounded-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#e8c559]/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />

                <div className="flex items-center gap-6 relative z-10">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#e8c559] to-[#d4a843] flex items-center justify-center text-2xl font-bold text-[#171611] shadow-xl">
                        {(profile?.full_name || 'User').charAt(0)}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-1">My Performance Report</h1>
                        <p className="text-[#e8c559] font-medium">{profile?.job_title} • {kpiData.period}</p>
                    </div>
                </div>

                <div className="flex items-center gap-8 relative z-10 bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                    <div className="text-center px-4 border-r border-white/10">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Score</p>
                        <p className="text-4xl font-black text-white">{Number(finalScore).toFixed(2)}</p>
                    </div>
                    <div className="text-center px-4 border-r border-white/10">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Rating</p>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${finalLevel.bgLight} ${finalLevel.color.replace('text-', 'text-opacity-100 text-black ')}`}>
                            {finalLevel.label}
                        </span>
                    </div>
                    <div className="text-center px-4">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Status</p>
                        <p className={`text-sm font-bold ${kpiData.status === 'final' ? 'text-emerald-400' :
                                kpiData.status === 'draft' ? 'text-amber-400' : 'text-gray-400'
                            }`}>
                            {kpiData.status === 'final' ? 'Finalized' :
                                kpiData.status === 'draft' ? 'In Review' : 'Pending'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content: Detailed Tables per Pillar */}
            <div className="space-y-8">
                {pillars.map((pillar) => (
                    <div key={pillar.id} className="glass-panel rounded-xl overflow-hidden">
                        {/* Pillar Header */}
                        <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg bg-${pillar.color}-500/20 text-${pillar.color}-500`}>
                                    <pillar.icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">{pillar.label}</h3>
                                    <p className="text-xs text-gray-400">
                                        Total Weights: {pillar.metrics.reduce((acc, m) => acc + m.weight, 0)}%
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-white">{pillar.pillarScore ? Number(pillar.pillarScore).toFixed(1) : '-'}</p>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Pillar Score</p>
                            </div>
                        </div>

                        {/* Metrics Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-400 uppercase bg-white/5 border-b border-white/10">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Metric / Indikator</th>
                                        <th className="px-6 py-3 font-medium text-center">Weight</th>
                                        <th className="px-6 py-3 font-medium text-center">Skor (1-5)</th>
                                        <th className="px-6 py-3 font-medium">CEO Note / Feedback</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {pillar.metrics.map((metric: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 font-medium text-white max-w-xs">
                                                <div>{metric.name}</div>
                                                <div className="text-[10px] text-gray-500 font-normal mt-1">{metric.criteria}</div>
                                                {metric.id === 'B4' && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] text-blue-400 mt-1">
                                                        <Info className="w-3 h-3" /> System Calculated
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center text-gray-300">
                                                {metric.weight}%
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="inline-block relative">
                                                    {/* Visual score bar background */}
                                                    <div className="w-16 h-1.5 bg-gray-700/50 rounded-full mb-1">
                                                        <div
                                                            className={`h-full rounded-full ${metric.score >= 4 ? 'bg-emerald-500' :
                                                                metric.score >= 3 ? 'bg-amber-500' :
                                                                    metric.score > 0 ? 'bg-rose-500' : 'bg-gray-600'
                                                                }`}
                                                            style={{ width: `${(metric.score / 5) * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className={`font-bold ${metric.score >= 4 ? 'text-emerald-400' :
                                                        metric.score >= 3 ? 'text-amber-400' :
                                                            metric.score > 0 ? 'text-rose-400' : 'text-gray-600'
                                                        }`}>
                                                        {metric.score || '-'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-400 text-xs italic">
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
