"use client";

import { useMemo } from "react";
import {
    Briefcase,
    BookOpen,
    Users,
    Star,
    TrendingUp,
    Award,
    Target,
    Info
} from "lucide-react";

// ==========================================
// MOCK DATA & CONSTANTS
// ==========================================

// Bobot Role (Simulasi dari DB)
const ROLE_WEIGHTS = {
    "Analyst": {
        knowledge: 0.30,
        people: 0.20,
        service: 0.20,
        business: 0.20,
        leadership: 0.10,
    }
};

const SCORE_LEVELS = [
    { score: 1, label: "Poor", color: "text-rose-500", bg: "bg-rose-50" },
    { score: 2, label: "Fair", color: "text-orange-500", bg: "bg-orange-50" },
    { score: 3, label: "Good", color: "text-amber-500", bg: "bg-amber-50" },
    { score: 4, label: "Very Good", color: "text-emerald-500", bg: "bg-emerald-50" },
    { score: 5, label: "Excellent", color: "text-blue-500", bg: "bg-blue-50" },
];

const getScoreLevel = (score: number) => {
    const rounded = Math.round(score);
    return SCORE_LEVELS.find(l => l.score === rounded) || SCORE_LEVELS[2];
};

// Data KPI Personal (Mock untuk User yang Login)
const MY_KPI_DATA = {
    user: {
        name: "Rahadian Muhammad S.",
        role: "Analyst",
        avatar: "RM",
        period: "Semester 1 2026",
    },
    pillars: {
        knowledge: {
            id: "knowledge",
            label: "Passion for Knowledge",
            weight: 0.30,
            icon: BookOpen,
            color: "blue",
            metrics: [
                { name: "Artikel Blog/News", target: 4, actual: 4, score: 5.0, note: "Target tercapai (1 artikel/bulan)" },
                { name: "Sharing Session", target: 2, actual: 2, score: 5.0, note: "Mengisi 2 sesi internal" },
                { name: "Training Hours", target: 20, actual: 15, score: 3.0, note: "Baru tercapai 75%" },
            ]
        },
        people: {
            id: "people",
            label: "Passion for People",
            weight: 0.20,
            icon: Users,
            color: "emerald",
            metrics: [
                { name: "Team Feedback", target: 4.0, actual: 4.5, score: 4.5, note: "Rating dari peer review" },
                { name: "Attendance", target: 100, actual: 98, score: 4.0, note: "Absensi on-time > 98%" },
            ]
        },
        service: {
            id: "service",
            label: "Passion for Service",
            weight: 0.20,
            icon: Star,
            color: "amber",
            metrics: [
                { name: "Client Rating", target: 4.5, actual: 4.8, score: 5.0, note: "Sangat memuaskan klien" },
                { name: "Project Delivery", target: 100, actual: 100, score: 5.0, note: "Semua project on-schedule" },
            ]
        },
        business: {
            id: "business",
            label: "Passion for Business",
            weight: 0.20,
            icon: TrendingUp,
            color: "purple",
            metrics: [
                { name: "Utilization Rate", target: 80, actual: 85, score: 4.5, note: "Billable hours tinggi" },
                { name: "New Leads Support", target: 5, actual: 3, score: 3.0, note: "Perlu lebih aktif bantu presales" },
            ]
        },
        leadership: {
            id: "leadership",
            label: "Leadership (Self)",
            weight: 0.10,
            icon: Award,
            color: "pink",
            metrics: [
                { name: "Initiative", target: 4.0, actual: 4.0, score: 4.0, note: "Inisiatif baik dalam tim" },
            ]
        }
    }
};

export default function MyKPIPage() {
    // 1. Calculate weighted scores
    const calculatedScores = useMemo(() => {
        let totalWeightedScore = 0;
        const pillarSummary: any[] = [];

        Object.values(MY_KPI_DATA.pillars).forEach((pillar) => {
            // Rata-rata score metric dalam pillar
            const totalMetricScore = pillar.metrics.reduce((acc, curr) => acc + curr.score, 0);
            const avgPillarScore = totalMetricScore / pillar.metrics.length;

            // Hitung kontribusi ke total score (Score Pilar * Bobot)
            const weightedContribution = avgPillarScore * pillar.weight;
            totalWeightedScore += weightedContribution;

            pillarSummary.push({
                ...pillar,
                avgScore: avgPillarScore,
                contribution: weightedContribution
            });
        });

        return { totalWeightedScore, pillarSummary };
    }, []);

    const finalLevel = getScoreLevel(calculatedScores.totalWeightedScore);

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
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#e8c559] to-[#d4a843] flex items-center justify-center text-3xl font-bold text-[#171611] shadow-xl">
                        {MY_KPI_DATA.user.avatar}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-1">My Performance Report</h1>
                        <p className="text-[#e8c559] font-medium">{MY_KPI_DATA.user.role} • {MY_KPI_DATA.user.period}</p>
                    </div>
                </div>

                <div className="flex items-center gap-8 relative z-10 bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                    <div className="text-center px-4 border-r border-white/10">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Score</p>
                        <p className="text-4xl font-black text-white">{calculatedScores.totalWeightedScore.toFixed(2)}</p>
                    </div>
                    <div className="text-center px-4 border-r border-white/10">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Rating</p>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${finalLevel.bg} ${finalLevel.color.replace('text-', 'text-opacity-100 text-black ')}`}>
                            {finalLevel.label}
                        </span>
                    </div>
                    <div className="text-center px-4">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Status</p>
                        <p className="text-sm font-bold text-emerald-400">On Track</p>
                    </div>
                </div>
            </div>

            {/* Main Content: Detailed Tables per Pillar */}
            <div className="space-y-8">
                {calculatedScores.pillarSummary.map((pillar) => (
                    <div key={pillar.id} className="glass-panel rounded-xl overflow-hidden">
                        {/* Pillar Header */}
                        <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg bg-${pillar.color}-500/20 text-${pillar.color}-500`}>
                                    <pillar.icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">{pillar.label}</h3>
                                    <p className="text-xs text-gray-400">Bobot: {(pillar.weight * 100)}% dari Total Nilai</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-white">{pillar.avgScore.toFixed(1)}</p>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Pillar Score</p>
                            </div>
                        </div>

                        {/* Metrics Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-400 uppercase bg-white/5 border-b border-white/10">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Metric / Indikator</th>
                                        <th className="px-6 py-3 font-medium text-center">Target</th>
                                        <th className="px-6 py-3 font-medium text-center">Capaian (Actual)</th>
                                        <th className="px-6 py-3 font-medium text-center">Skor (1-5)</th>
                                        <th className="px-6 py-3 font-medium">Keterangan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {pillar.metrics.map((metric: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 font-medium text-white">
                                                {metric.name}
                                            </td>
                                            <td className="px-6 py-4 text-center text-gray-300">
                                                {metric.target}
                                            </td>
                                            <td className="px-6 py-4 text-center font-bold text-[#e8c559]">
                                                {metric.actual}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="inline-block relative">
                                                    {/* Visual score bar background */}
                                                    <div className="w-16 h-1.5 bg-gray-700 rounded-full mb-1">
                                                        <div
                                                            className={`h-full rounded-full ${metric.score >= 4 ? 'bg-emerald-500' :
                                                                    metric.score >= 3 ? 'bg-amber-500' : 'bg-rose-500'
                                                                }`}
                                                            style={{ width: `${(metric.score / 5) * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className={`font-bold ${metric.score >= 4 ? 'text-emerald-400' :
                                                            metric.score >= 3 ? 'text-amber-400' : 'text-rose-400'
                                                        }`}>
                                                        {metric.score}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-400 text-xs italic">
                                                {metric.note}
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
                <p>Total Score = Σ (Score Pilar × Bobot Pilar). Score Pilar adalah rata-rata dari semua metrik di dalamnya.</p>
            </div>
        </div>
    );
}
