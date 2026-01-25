"use client";

import { useState } from "react";
import Link from "next/link";
import {
    mockStaffData,
    ROLE_NAMES,
    ROLE_WEIGHTS,
    SCORE_LEVELS,
    calculateStaffScore,
    StaffRole
} from "../kpi-data";
import {
    BookOpen,
    Users,
    Star,
    TrendingUp,
    Award
} from "lucide-react";

export default function KPIReportsPage() {
    const [selectedPeriod, setSelectedPeriod] = useState("Q1 2026");
    const [selectedRole, setSelectedRole] = useState<StaffRole | "all">("all");
    const [sortBy, setSortBy] = useState<"score" | "name">("score");

    const getTrendIcon = (trend: "up" | "down" | "stable" = "stable") => {
        switch (trend) {
            case "up": return <span className="text-emerald-400 text-lg">↗</span>;
            case "down": return <span className="text-rose-400 text-lg">↘</span>;
            default: return <span className="text-gray-400 text-lg">→</span>;
        }
    };

    const getPillarIcon = (key: string) => {
        switch (key) {
            case 'knowledge': return <BookOpen className="w-3 h-3" />;
            case 'people': return <Users className="w-3 h-3" />;
            case 'service': return <Star className="w-3 h-3" />;
            case 'business': return <TrendingUp className="w-3 h-3" />;
            case 'leadership': return <Award className="w-3 h-3" />;
            default: return <Star className="w-3 h-3" />;
        }
    };

    const filteredStaff = (selectedRole === "all"
        ? mockStaffData
        : mockStaffData.filter(staff => staff.role === selectedRole))
        .sort((a, b) => {
            if (sortBy === "score") {
                return calculateStaffScore(b) - calculateStaffScore(a);
            }
            return a.name.localeCompare(b.name);
        });

    // Calculate team stats
    const teamAverage = filteredStaff.length > 0
        ? (filteredStaff.reduce((sum, s) => sum + ((calculateStaffScore(s) / 5) * 100), 0) / filteredStaff.length)
        : 0;

    const topPerformer = [...filteredStaff].sort((a, b) => calculateStaffScore(b) - calculateStaffScore(a))[0];
    const needsAttention = [...filteredStaff].sort((a, b) => calculateStaffScore(a) - calculateStaffScore(b))[0];

    const getScorePercentage = (staff: any) => (calculateStaffScore(staff) / 5) * 100;

    return (
        <div className="flex flex-col gap-6 pb-20">
            {/* Page Header */}
            <header className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
                <div className="flex flex-col gap-2">
                    <h1 className="text-4xl font-black tracking-tight text-white">KPI Reports</h1>
                    <p className="text-lg text-gray-400">WSC Team 2026 - Overview kinerja seluruh karyawan</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <select
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-[#e8c559] outline-none"
                    >
                        <option value="Q1 2026">Q1 2026</option>
                        <option value="Q2 2026">Q2 2026</option>
                    </select>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as "score" | "name")}
                        className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-[#e8c559] outline-none"
                    >
                        <option value="score">Sort by Score</option>
                        <option value="name">Sort by Name</option>
                    </select>
                </div>
            </header>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel rounded-xl p-5 border-l-4 border-[#e8c559]">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Rata-rata Tim</p>
                    <p className="text-3xl font-black text-[#e8c559]">{teamAverage.toFixed(0)}%</p>
                    <p className="text-sm text-gray-400 mt-1">{filteredStaff.length} karyawan</p>
                </div>
                {topPerformer && (
                    <Link href={`/dashboard/command-center/kpi-assessment/${topPerformer.id}`} className="glass-panel rounded-xl p-5 border-l-4 border-emerald-500 hover:bg-white/5 transition-colors">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">🏆 Top Performer</p>
                        <p className="text-xl font-bold text-white">{topPerformer.name}</p>
                        <p className="text-sm text-emerald-400">{getScorePercentage(topPerformer).toFixed(0)}% - {ROLE_NAMES[topPerformer.role].split(" ")[0]}</p>
                    </Link>
                )}
                {needsAttention && (
                    <Link href={`/dashboard/command-center/kpi-assessment/${needsAttention.id}`} className="glass-panel rounded-xl p-5 border-l-4 border-amber-500 hover:bg-white/5 transition-colors">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">⚠️ Perlu Perhatian</p>
                        <p className="text-xl font-bold text-white">{needsAttention.name}</p>
                        <p className="text-sm text-amber-400">{getScorePercentage(needsAttention).toFixed(0)}% - {ROLE_NAMES[needsAttention.role].split(" ")[0]}</p>
                    </Link>
                )}
            </div>

            {/* Role Filter */}
            <div className="flex gap-2 flex-wrap">
                <button
                    onClick={() => setSelectedRole("all")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedRole === "all"
                        ? "bg-[#e8c559] text-black shadow-lg shadow-[#e8c559]/20"
                        : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"}`}
                >
                    Semua ({mockStaffData.length})
                </button>
                {Object.entries(ROLE_NAMES).map(([key, name]) => {
                    const count = mockStaffData.filter(s => s.role === key).length;
                    return (
                        <button
                            key={key}
                            onClick={() => setSelectedRole(key as StaffRole)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedRole === key
                                ? "bg-[#e8c559] text-black shadow-lg shadow-[#e8c559]/20"
                                : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"}`}
                        >
                            {name.split(" ")[0]} ({count})
                        </button>
                    );
                })}
            </div>

            {/* Staff Grid Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {filteredStaff.map((staff) => {
                    const weightedScore = calculateStaffScore(staff);
                    const percentageScore = (weightedScore / 5) * 100;
                    const scoreLevel = SCORE_LEVELS.find(l => weightedScore >= l.min && weightedScore < l.max) || SCORE_LEVELS[2];

                    return (
                        <Link
                            key={staff.id}
                            href={`/dashboard/command-center/kpi-assessment/${staff.id}`} // Linking to detail assessment page
                            className="glass-panel rounded-xl p-5 hover:border-[#e8c559]/50 hover:bg-white/5 transition-all group cursor-pointer"
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="size-12 rounded-full bg-gradient-to-br from-[#e8c559]/30 to-[#b89530]/30 flex items-center justify-center text-[#e8c559] font-bold text-lg border border-white/10 group-hover:border-[#e8c559]/50 transition-colors">
                                        {staff.name.split(" ").map(n => n[0]).join("")}
                                    </div>
                                    <div>
                                        <p className="font-bold text-white group-hover:text-[#e8c559] transition-colors">{staff.name}</p>
                                        <p className="text-xs text-gray-500">{ROLE_NAMES[staff.role].split(" ")[0]}</p>
                                    </div>
                                </div>
                                {getTrendIcon("stable")}
                            </div>

                            {/* Score Circle */}
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`relative size-16 rounded-full ${scoreLevel.bgLight} flex items-center justify-center`}>
                                    <svg className="absolute inset-0 -rotate-90" viewBox="0 0 64 64">
                                        <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-white/5" />
                                        <circle
                                            cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4"
                                            className={scoreLevel.color}
                                            strokeDasharray={`${(percentageScore / 100) * 176} 176`}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <span className={`text-lg font-black ${scoreLevel.color}`}>{percentageScore.toFixed(0)}%</span>
                                </div>
                                <div>
                                    <p className={`font-semibold ${scoreLevel.color}`}>{scoreLevel.label}</p>
                                    <p className="text-xs text-gray-500">{staff.department}</p>
                                </div>
                            </div>

                            {/* Mini Pillar Bars */}
                            <div className="space-y-1.5">
                                {Object.entries(staff.pillars).map(([key, pillar]: any) => {
                                    if (pillar.weight === 0) return null;
                                    const pScore = pillar.metrics.reduce((a: number, b: any) => a + b.score, 0) / (pillar.metrics.length || 1);

                                    return (
                                        <div key={key} className="flex items-center gap-2">
                                            <span className="text-[10px] text-gray-500 w-4 flex justify-center">{getPillarIcon(key)}</span>
                                            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${pScore >= 4 ? 'bg-teal-500' : pScore >= 3 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                                    style={{ width: `${(pScore / 5) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] text-gray-400 w-8">{(pillar.weight * 100).toFixed(0)}%</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* View Detail Link */}
                            <div className="mt-4 pt-3 border-t border-white/5 text-center">
                                <span className="text-xs text-[#e8c559] group-hover:underline">Lihat Detail KPI →</span>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Role Weighting Reference */}
            <div className="glass-panel rounded-xl p-6 mt-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">📊 Referensi Bobot KPI per Role</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-white/10 text-xs text-gray-600 dark:text-gray-400 uppercase">
                                <th className="text-left pb-3 pr-4">Pillar</th>
                                <th className="text-center pb-3 px-3 min-w-[140px]">Analyst I-II<br /><span className="font-normal normal-case">(Staff)</span></th>
                                <th className="text-center pb-3 px-3 min-w-[160px]">Analyst III - Consultant III<br /><span className="font-normal normal-case">(Supervisor)</span></th>
                                <th className="text-center pb-3 px-3 min-w-[140px]">Sales Executive I-III<br /><span className="font-normal normal-case">(Staff)</span></th>
                                <th className="text-center pb-3 px-3 min-w-[160px]">Business Development<br /><span className="font-normal normal-case">I-III</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {[
                                { key: "knowledge", icon: "📚", name: "Passion for Knowledge" },
                                { key: "people", icon: "🤝", name: "Passion for People & Environment" },
                                { key: "service", icon: "⭐", name: "Passion for Service" },
                                { key: "business", icon: "📊", name: "Passion for Business" },
                                { key: "leadership", icon: "👑", name: "Leadership & Supervisory" },
                            ].map((pillar) => (
                                <tr key={pillar.key}>
                                    <td className="py-3 pr-4 text-gray-800 dark:text-white font-medium">
                                        <span className="mr-2">{pillar.icon}</span>{pillar.name}
                                    </td>
                                    {(["analyst_staff", "analyst_supervisor", "sales_staff", "bisdev"] as StaffRole[]).map((role) => {
                                        const weight = ROLE_WEIGHTS[role][pillar.key];
                                        const isHighest = weight === Math.max(...Object.values(ROLE_WEIGHTS).map(w => w[pillar.key])) && weight > 0;
                                        return (
                                            <td key={role} className="text-center py-3 px-3">
                                                <span className={`font-medium px-2 py-1 rounded ${weight === 0
                                                    ? 'text-gray-400 dark:text-gray-600'
                                                    : isHighest
                                                        ? 'bg-[#e8c559]/20 text-[#b89530] dark:text-[#e8c559] font-bold'
                                                        : 'text-gray-700 dark:text-gray-300'}`}>
                                                    {(weight * 100).toFixed(0)}%
                                                </span>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                    💡 <span className="text-[#b89530] dark:text-[#e8c559]">Warna kuning</span> menunjukkan bobot tertinggi untuk pillar tersebut.
                    Klik card karyawan untuk melihat detail KPI dan perhitungan skor.
                </p>
            </div>
        </div>
    );
}
