"use client";

import { useParams } from "next/navigation";
import Link from "next/link";

// Import shared data and utilities from parent page
// Note: In production, this would come from API/database

// Role types for WSC Team
type StaffRole = "analyst_staff" | "analyst_supervisor" | "sales_staff" | "bisdev";

// Role display names
const ROLE_NAMES: Record<StaffRole, string> = {
    analyst_staff: "Analyst I-II (Staff)",
    analyst_supervisor: "Analyst III - Consultant III (Supervisor)",
    sales_staff: "Sales Executive I-III (Staff)",
    bisdev: "Business Development I-III",
};

// Weighting per role per pillar
const ROLE_WEIGHTS: Record<StaffRole, Record<string, number>> = {
    analyst_staff: {
        knowledge: 0.40,
        people: 0.30,
        service: 0.20,
        business: 0.10,
        leadership: 0,
    },
    analyst_supervisor: {
        knowledge: 0.30,
        people: 0.20,
        service: 0.20,
        business: 0.15,
        leadership: 0.15,
    },
    sales_staff: {
        knowledge: 0.20,
        people: 0.20,
        service: 0.20,
        business: 0.40,
        leadership: 0,
    },
    bisdev: {
        knowledge: 0.20,
        people: 0.20,
        service: 0.20,
        business: 0.35,
        leadership: 0.05,
    },
};

// Score levels - using colors that work in both light and dark modes
const SCORE_LEVELS = [
    { min: 0, max: 1.5, label: "Poor", color: "text-rose-500 dark:text-rose-400", bg: "bg-rose-500", bgLight: "bg-rose-100 dark:bg-rose-500/20" },
    { min: 1.5, max: 2.5, label: "Need Improvement", color: "text-orange-500 dark:text-orange-400", bg: "bg-orange-500", bgLight: "bg-orange-100 dark:bg-orange-500/20" },
    { min: 2.5, max: 3.5, label: "Good", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500", bgLight: "bg-amber-100 dark:bg-amber-500/20" },
    { min: 3.5, max: 4.5, label: "Very Good", color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-500", bgLight: "bg-teal-100 dark:bg-teal-500/20" },
    { min: 4.5, max: 5.1, label: "Excellent", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500", bgLight: "bg-blue-100 dark:bg-blue-500/20" },
];

// KPI Metrics definitions
const KPI_PILLARS = {
    knowledge: {
        title: "Passion for Knowledge",
        icon: "📚",
        metrics: [
            { id: "blog", name: "Penulisan Blog/News", description: "Konsistensi dalam menghasilkan artikel berkualitas" },
            { id: "sharing", name: "Mempelajari Knowledge/Skill Baru", description: "Sharing session per 6 bulan" },
            { id: "training", name: "Kehadiran Pelatihan Internal", description: "Kehadiran dalam pelatihan atau sharing session" },
        ],
    },
    people: {
        title: "Passion for People & Environment",
        icon: "🤝",
        metrics: [
            { id: "k3", name: "Keselamatan dan Kesehatan Kerja", description: "Menaati peraturan keselamatan, kerapihan, dan kesehatan" },
            { id: "teamwork", name: "Team Work", description: "Kemauan bekerja sama dalam tim" },
            { id: "sustainability", name: "Sustainability Initiatives", description: "Aksi nyata dalam menjaga lingkungan dan kegiatan sosial" },
        ],
    },
    service: {
        title: "Passion for Service",
        icon: "⭐",
        metrics: [
            { id: "responsive", name: "Responsive & Solutif terhadap Klien", description: "Kecepatan respon dan solusi untuk kebutuhan klien" },
            { id: "quality", name: "Kualitas Kerja", description: "Pencapaian standar kualitas dan harapan client" },
            { id: "satisfaction", name: "Indeks Kepuasan Klien", description: "Rata-rata nilai kepuasan klien terhadap layanan" },
            { id: "appearance", name: "Penampilan", description: "Rapi, bersih, dan menggunakan atribut kantor" },
        ],
    },
    business: {
        title: "Passion for Business",
        icon: "📊",
        metrics: [
            { id: "sales", name: "Sales Target", description: "Pencapaian target pendapatan proyek" },
            { id: "prospect", name: "New Database/Prospect", description: "Kemampuan menghasilkan prospek baru yang relevan" },
            { id: "conversion", name: "Proposal Conversion Rate", description: "Efektivitas proposal dalam memenangkan proyek" },
            { id: "attendance", name: "Kehadiran & Kedisiplinan", description: "Tingkat kehadiran dan keterlambatan" },
        ],
    },
    leadership: {
        title: "Leadership & Supervisory Skills",
        icon: "👑",
        metrics: [
            { id: "leadership", name: "Kemampuan Kepemimpinan", description: "People Development, Project Management, Direction & Decision Making" },
        ],
    },
};

interface StaffKPI {
    id: string;
    name: string;
    role: StaffRole;
    department: string;
    scores: {
        knowledge: number;
        people: number;
        service: number;
        business: number;
        leadership: number;
    };
    // Detailed metric scores
    metricScores: {
        [key: string]: number;
    };
    trend: "up" | "down" | "stable";
}

// Mock staff data with detailed metric scores
const mockStaffKPIs: StaffKPI[] = [
    {
        id: "1",
        name: "Nadia Putri",
        role: "analyst_staff",
        department: "Research & Analysis",
        scores: { knowledge: 4.2, people: 4.0, service: 3.8, business: 3.5, leadership: 0 },
        metricScores: {
            blog: 4.0, sharing: 5.0, training: 3.5,
            k3: 4.0, teamwork: 4.0, sustainability: 4.0,
            responsive: 3.5, quality: 4.0, satisfaction: 4.0, appearance: 4.0,
            sales: 3.0, prospect: 3.5, conversion: 4.0, attendance: 4.0,
        },
        trend: "up",
    },
    {
        id: "2",
        name: "Rizky Aditya",
        role: "analyst_supervisor",
        department: "Research & Analysis",
        scores: { knowledge: 4.5, people: 4.2, service: 4.0, business: 3.8, leadership: 4.0 },
        metricScores: {
            blog: 4.5, sharing: 5.0, training: 4.0,
            k3: 4.5, teamwork: 4.0, sustainability: 4.0,
            responsive: 4.0, quality: 4.0, satisfaction: 4.0, appearance: 4.0,
            sales: 3.5, prospect: 4.0, conversion: 4.0, attendance: 4.0,
            leadership: 4.0,
        },
        trend: "up",
    },
    {
        id: "3",
        name: "Dewi Anggraini",
        role: "sales_staff",
        department: "Sales & Marketing",
        scores: { knowledge: 3.5, people: 4.0, service: 4.2, business: 4.8, leadership: 0 },
        metricScores: {
            blog: 3.0, sharing: 4.0, training: 3.5,
            k3: 4.0, teamwork: 4.0, sustainability: 4.0,
            responsive: 4.5, quality: 4.0, satisfaction: 4.0, appearance: 4.5,
            sales: 5.0, prospect: 5.0, conversion: 4.5, attendance: 4.5,
        },
        trend: "stable",
    },
    {
        id: "4",
        name: "Bima Sakti",
        role: "bisdev",
        department: "Business Development",
        scores: { knowledge: 4.0, people: 4.2, service: 4.0, business: 4.5, leadership: 3.8 },
        metricScores: {
            blog: 4.0, sharing: 4.0, training: 4.0,
            k3: 4.5, teamwork: 4.0, sustainability: 4.0,
            responsive: 4.0, quality: 4.0, satisfaction: 4.0, appearance: 4.0,
            sales: 4.5, prospect: 5.0, conversion: 4.0, attendance: 4.5,
            leadership: 3.8,
        },
        trend: "up",
    },
    {
        id: "5",
        name: "Sari Wulandari",
        role: "analyst_staff",
        department: "Research & Analysis",
        scores: { knowledge: 4.8, people: 4.5, service: 4.2, business: 3.5, leadership: 0 },
        metricScores: {
            blog: 5.0, sharing: 5.0, training: 4.5,
            k3: 4.5, teamwork: 4.5, sustainability: 4.5,
            responsive: 4.0, quality: 4.5, satisfaction: 4.0, appearance: 4.5,
            sales: 3.0, prospect: 3.5, conversion: 4.0, attendance: 4.0,
        },
        trend: "up",
    },
    {
        id: "6",
        name: "Andi Firmansyah",
        role: "sales_staff",
        department: "Sales & Marketing",
        scores: { knowledge: 3.2, people: 3.5, service: 3.8, business: 4.0, leadership: 0 },
        metricScores: {
            blog: 3.0, sharing: 3.5, training: 3.0,
            k3: 3.5, teamwork: 3.5, sustainability: 3.5,
            responsive: 4.0, quality: 3.5, satisfaction: 4.0, appearance: 4.0,
            sales: 4.0, prospect: 4.0, conversion: 4.0, attendance: 4.0,
        },
        trend: "down",
    },
    {
        id: "7",
        name: "Maya Sanjaya",
        role: "analyst_supervisor",
        department: "Consulting",
        scores: { knowledge: 4.2, people: 4.5, service: 4.3, business: 4.0, leadership: 4.2 },
        metricScores: {
            blog: 4.0, sharing: 4.5, training: 4.0,
            k3: 4.5, teamwork: 4.5, sustainability: 4.5,
            responsive: 4.5, quality: 4.5, satisfaction: 4.0, appearance: 4.0,
            sales: 4.0, prospect: 4.0, conversion: 4.0, attendance: 4.0,
            leadership: 4.2,
        },
        trend: "stable",
    },
    {
        id: "8",
        name: "Fajar Rahman",
        role: "bisdev",
        department: "Business Development",
        scores: { knowledge: 3.8, people: 4.0, service: 3.8, business: 4.2, leadership: 3.5 },
        metricScores: {
            blog: 3.5, sharing: 4.0, training: 4.0,
            k3: 4.0, teamwork: 4.0, sustainability: 4.0,
            responsive: 3.5, quality: 4.0, satisfaction: 4.0, appearance: 4.0,
            sales: 4.5, prospect: 4.0, conversion: 4.0, attendance: 4.5,
            leadership: 3.5,
        },
        trend: "up",
    },
];

const getScoreLevel = (score: number) => {
    return SCORE_LEVELS.find((level) => score >= level.min && score < level.max) || SCORE_LEVELS[2];
};

export default function KPIDetailPage() {
    const params = useParams();
    const staffId = params.id as string;

    const staff = mockStaffKPIs.find(s => s.id === staffId);

    if (!staff) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <p className="text-xl text-gray-400">Karyawan tidak ditemukan</p>
                <Link href="/dashboard/kpi" className="text-[#e8c559] hover:underline">
                    ← Kembali ke Overview
                </Link>
            </div>
        );
    }

    const weights = ROLE_WEIGHTS[staff.role];

    // Calculate weighted score
    const calculateWeightedScore = () => {
        const weightedSum =
            staff.scores.knowledge * weights.knowledge +
            staff.scores.people * weights.people +
            staff.scores.service * weights.service +
            staff.scores.business * weights.business +
            staff.scores.leadership * weights.leadership;
        return (weightedSum / 5) * 100;
    };

    const overallScore = calculateWeightedScore();
    const overallScoreLevel = getScoreLevel(overallScore / 20);

    // Get focus areas (pillars below target)
    const focusAreas = Object.entries(staff.scores)
        .filter(([key, score]) => weights[key] > 0 && score < 4)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 2);

    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto">
            {/* Back Button */}
            <Link href="/dashboard/kpi" className="flex items-center gap-2 text-gray-400 hover:text-[#e8c559] transition-colors w-fit">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                <span>Kembali ke Overview</span>
            </Link>

            {/* Header Card */}
            <div className="glass-panel rounded-xl p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="size-20 rounded-full bg-gradient-to-br from-[#e8c559]/30 to-[#b89530]/30 flex items-center justify-center text-[#e8c559] font-bold text-2xl border-2 border-[#e8c559]/30">
                            {staff.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white">{staff.name}</h1>
                            <p className="text-[#e8c559] font-medium">{ROLE_NAMES[staff.role]}</p>
                            <p className="text-gray-500">{staff.department} • Q1 2026</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className={`relative size-24 rounded-full ${overallScoreLevel.bgLight} flex items-center justify-center`}>
                            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 96 96">
                                <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="6" className="text-gray-200 dark:text-white/10" />
                                <circle
                                    cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="6"
                                    className={overallScoreLevel.color}
                                    strokeDasharray={`${(overallScore / 100) * 251} 251`}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="text-center z-10">
                                <span className={`text-2xl font-black ${overallScoreLevel.color}`}>{overallScore.toFixed(0)}%</span>
                            </div>
                        </div>
                        <div className="text-left">
                            <p className={`text-lg font-bold ${overallScoreLevel.color}`}>{overallScoreLevel.label}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Overall Score</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Role Weighting Visualization */}
            <div className="glass-panel rounded-xl p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    📊 Bobot KPI untuk Role Anda
                    <span className="text-sm font-normal text-gray-500">({ROLE_NAMES[staff.role].split(" ")[0]})</span>
                </h2>
                <div className="space-y-3">
                    {Object.entries(KPI_PILLARS).map(([key, pillar]) => {
                        const weight = weights[key];
                        if (weight === 0) return null;

                        return (
                            <div key={key} className="flex items-center gap-4">
                                <span className="text-xl w-8">{pillar.icon}</span>
                                <span className="text-gray-800 dark:text-white font-medium w-56 text-sm">{pillar.title}</span>
                                <div className="flex-1 h-5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-[#e8c559] to-[#b89530] rounded-full transition-all"
                                        style={{ width: `${weight * 100}%` }}
                                    />
                                </div>
                                <span className="text-sm font-bold text-[#b89530] dark:text-[#e8c559] w-12 text-right">{(weight * 100).toFixed(0)}%</span>
                            </div>
                        );
                    })}
                </div>
                <p className="text-xs text-gray-500 mt-4">
                    💡 Bobot menentukan seberapa besar kontribusi setiap pillar terhadap skor keseluruhan Anda.
                </p>
            </div>

            {/* Detailed Pillar Breakdown */}
            <div className="space-y-4">
                <h2 className="text-lg font-bold text-white">📋 Detail Penilaian per Pillar</h2>

                {Object.entries(KPI_PILLARS).map(([pillarKey, pillar]) => {
                    const weight = weights[pillarKey];
                    if (weight === 0) return null;

                    const pillarScore = staff.scores[pillarKey as keyof typeof staff.scores];
                    const pillarScoreLevel = getScoreLevel(pillarScore);
                    const contribution = (pillarScore * weight / 5) * 100;

                    return (
                        <div key={pillarKey} className="glass-panel rounded-xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{pillar.icon}</span>
                                    <div>
                                        <h3 className="text-white font-bold">{pillar.title}</h3>
                                        <p className="text-xs text-gray-500">Bobot: {(weight * 100).toFixed(0)}%</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-2xl font-bold ${pillarScoreLevel.color}`}>{pillarScore.toFixed(1)}/5</p>
                                    <p className={`text-xs ${pillarScoreLevel.color}`}>{pillarScoreLevel.label}</p>
                                </div>
                            </div>

                            {/* Individual Metrics */}
                            <div className="space-y-3 mb-4">
                                {pillar.metrics.map((metric) => {
                                    const metricScore = staff.metricScores[metric.id] || 0;
                                    const metricLevel = getScoreLevel(metricScore);
                                    const percentage = (metricScore / 5) * 100;

                                    return (
                                        <div key={metric.id} className="border-l-2 border-white/10 pl-4">
                                            <div className="flex items-center justify-between mb-1">
                                                <div>
                                                    <p className="text-sm text-white font-medium">{metric.name}</p>
                                                    <p className="text-xs text-gray-500">{metric.description}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`font-bold ${metricLevel.color}`}>{metricScore.toFixed(1)}/5</span>
                                                    <span className="text-gray-500 text-xs ml-2">({percentage.toFixed(0)}%)</span>
                                                </div>
                                            </div>
                                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${metricLevel.bg}`}
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Subtotal */}
                            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                                <span className="text-sm text-gray-400">Kontribusi ke skor keseluruhan:</span>
                                <span className="font-bold text-[#e8c559]">{contribution.toFixed(1)}%</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Calculation Breakdown */}
            <div className="glass-panel rounded-xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">📈 Perhitungan Skor</h2>
                <div className="bg-black/20 rounded-lg p-4 font-mono text-sm space-y-2">
                    {Object.entries(KPI_PILLARS).map(([key, pillar]) => {
                        const weight = weights[key];
                        if (weight === 0) return null;
                        const score = staff.scores[key as keyof typeof staff.scores];
                        const contribution = score * weight;

                        return (
                            <div key={key} className="flex items-center justify-between text-gray-300">
                                <span>{pillar.title.split(" ").slice(-1)[0]}:</span>
                                <span>
                                    <span className="text-white">{score.toFixed(1)}</span>
                                    <span className="text-gray-500"> × </span>
                                    <span className="text-[#e8c559]">{(weight * 100).toFixed(0)}%</span>
                                    <span className="text-gray-500"> = </span>
                                    <span className="text-emerald-400">{contribution.toFixed(2)}</span>
                                </span>
                            </div>
                        );
                    })}
                    <div className="border-t border-white/10 pt-2 mt-2 flex items-center justify-between font-bold">
                        <span className="text-white">Total:</span>
                        <span>
                            <span className="text-[#e8c559]">{(overallScore / 20).toFixed(2)}/5</span>
                            <span className="text-gray-500"> = </span>
                            <span className="text-emerald-400">{overallScore.toFixed(1)}%</span>
                        </span>
                    </div>
                </div>
            </div>

            {/* Focus Areas */}
            {focusAreas.length > 0 && (
                <div className="glass-panel rounded-xl p-6 border-l-4 border-amber-500">
                    <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                        🎯 Area yang Perlu Ditingkatkan
                    </h2>
                    <div className="space-y-3">
                        {focusAreas.map(([key, score]) => {
                            const pillar = KPI_PILLARS[key as keyof typeof KPI_PILLARS];
                            const weight = weights[key];
                            return (
                                <div key={key} className="flex items-center gap-3">
                                    <span className="text-xl">{pillar.icon}</span>
                                    <div>
                                        <p className="text-white font-medium">{pillar.title}</p>
                                        <p className="text-sm text-gray-500">
                                            Skor saat ini: <span className="text-amber-400">{score.toFixed(1)}/5</span>
                                            {" • "}Target: <span className="text-emerald-400">4.0+</span>
                                            {" • "}Bobot: <span className="text-[#e8c559]">{(weight * 100).toFixed(0)}%</span>
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <p className="text-xs text-gray-500 mt-4">
                        💡 Tingkatkan skor di area ini untuk meningkatkan overall score Anda secara signifikan.
                    </p>
                </div>
            )}

            {/* Score Legend */}
            <div className="glass-panel rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Panduan Skala Penilaian</p>
                <div className="flex flex-wrap gap-4">
                    {SCORE_LEVELS.map((level) => (
                        <div key={level.label} className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded ${level.bg}`} />
                            <span className={`text-sm ${level.color}`}>
                                {level.min.toFixed(0)}-{level.max.toFixed(0)}: {level.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
