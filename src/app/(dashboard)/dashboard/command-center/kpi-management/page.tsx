"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
    ROLE_NAMES,
    SCORE_LEVELS,
    ROLE_WEIGHTS,
    RAW_ROLE_WEIGHT_MAPPING,
    StaffRole,
    mapProfileToStaffRole,
    getDepartmentLabel
} from "../kpi-data";
import {
    Search,
    LayoutGrid,
    List,
    ArrowRight,
    Edit3,
    ChevronLeft
} from "lucide-react";

export default function AssessmentCenterPage() {
    const { isLoading, canAccessCommandCenter } = useAuth();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
    const [staffList, setStaffList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const supabase = createClient();

    // Access Control
    useEffect(() => {
        if (!isLoading && !canAccessCommandCenter) {
            router.replace("/dashboard");
        }
    }, [isLoading, canAccessCommandCenter, router]);

    if (isLoading || (!canAccessCommandCenter && loading)) {
        return <div className="p-10 text-white text-center">Checking access...</div>;
    }

    useEffect(() => {
        const fetchStaff = async () => {
            // 1. Fetch profiles (excluding interns AND HR)
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, job_title, job_level, job_type, department')
                .neq('job_type', 'intern')
                .neq('job_type', 'hr');

            if (!profiles) return;

            // 2. Fetch KPI Scores for current period
            const { data: scores } = await supabase
                .from('kpi_scores')
                .select('*')
                .eq('period', '2026-S1');

            const merged = profiles
                .map((p: any) => {
                    // Use new helper for role mapping
                    const role = mapProfileToStaffRole(p.job_level, p.job_type);

                    // If role is null (e.g., HR), skip this user
                    if (!role) return null;

                    const scoreRec = scores?.find((s: any) => s.profile_id === p.id);

                    return {
                        id: p.id,
                        name: p.full_name || 'Unknown',
                        avatar_url: p.avatar_url || null,
                        role: role,
                        jobLevel: p.job_level || '',
                        department: getDepartmentLabel(p.department, p.job_type),
                        score: scoreRec ? scoreRec.final_score : 0,
                        pillars: scoreRec ? {
                            knowledge: scoreRec.score_knowledge,
                            people: scoreRec.score_people,
                            service: scoreRec.score_service,
                            business: scoreRec.score_business,
                            leadership: scoreRec.score_leadership
                        } : null
                    };
                })
                .filter(Boolean); // Remove null entries (HR users filtered out by mapProfileToStaffRole)

            setStaffList(merged);
            setLoading(false);
        };

        fetchStaff();
    }, []);

    const filteredStaff = staffList.filter(staff => {
        return staff.name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    if (loading) return <div className="p-10 text-white">Loading staff list...</div>;

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <header className="flex flex-col gap-4 md:flex-row md:items-end justify-between">
                <div>
                    <Link
                        href="/dashboard/command-center"
                        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-2 transition-colors group"
                    >
                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Command Center
                    </Link>
                    <h1 className="text-3xl font-black tracking-tight text-white">Assessment Center</h1>
                    <p className="text-gray-400">Input & Update KPI Scores for WSC Team.</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search employee..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-10 w-[200px] rounded-xl border border-white/10 bg-white/5 pl-9 pr-4 text-sm text-white focus:border-[#e8c559] outline-none transition-colors"
                        />
                    </div>

                    {/* View Toggle */}
                    <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 shrink-0">
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-white/10 text-white shadow-sm" : "text-gray-500 hover:text-white"}`}
                            title="Grid View"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("table")}
                            className={`p-2 rounded-lg transition-all ${viewMode === "table" ? "bg-white/10 text-white shadow-sm" : "text-gray-500 hover:text-white"}`}
                            title="Table View"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            {viewMode === "grid" ? (
                /* GRID VIEW */
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredStaff.map(staff => {
                        const score = staff.score || 0;
                        const scoreLevel = SCORE_LEVELS.find(l => score >= l.min && score < l.max) || SCORE_LEVELS[2];

                        return (
                            <div key={staff.id} className="glass-panel p-6 rounded-2xl border border-white/10 hover:border-[#e8c559]/50 transition-all group">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-3">
                                        {staff.avatar_url ? (
                                            <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 group-hover:border-[#e8c559] transition-colors">
                                                <Image
                                                    src={staff.avatar_url}
                                                    alt={staff.name}
                                                    width={48}
                                                    height={48}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-lg font-bold text-white border border-white/10 group-hover:border-[#e8c559] transition-colors">
                                                {staff.name.substring(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                        <div>
                                            <h3 className="font-bold text-lg text-white group-hover:text-[#e8c559] transition-colors">{staff.name}</h3>
                                            <p className="text-xs text-gray-500">{ROLE_NAMES[staff.role as StaffRole]?.split('(')[0]}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-2xl font-black ${scoreLevel.color}`}>
                                            {score.toFixed(1)}
                                        </div>
                                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${scoreLevel.bgLight} ${scoreLevel.color} inline-block`}>
                                            {scoreLevel.label}
                                        </div>
                                    </div>
                                </div>

                                {/* Pillar Preview (Mini Bars) */}
                                <div className="space-y-3 mb-6">
                                    {staff.pillars && Object.entries(staff.pillars).map(([key, pScore]: any) => {
                                        // Hide pillars with 0% weight for this role
                                        const pillarWeight = ROLE_WEIGHTS[staff.role as StaffRole]?.[key] || 0;
                                        if (pillarWeight === 0) return null;
                                        if (typeof pScore !== 'number') return null;

                                        return (
                                            <div key={key} className="flex items-center gap-3 text-xs">
                                                <span className="w-20 text-gray-500 capitalize">{key}</span>
                                                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${pScore >= 4 ? 'bg-emerald-500' : pScore >= 3 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                                        style={{ width: `${(pScore / 5) * 100}%` }}
                                                    />
                                                </div>
                                                <span className="w-4 text-right text-white font-mono">{pScore.toFixed(1)}</span>
                                            </div>
                                        )
                                    })}
                                    {!staff.pillars && <div className="text-xs text-gray-500 italic text-center py-4">No assessment data yet</div>}
                                </div>

                                <Link
                                    href={`/dashboard/command-center/kpi-assessment/${staff.id}`}
                                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#e8c559] text-black font-bold text-sm hover:bg-[#d4a843] transition-colors shadow-lg shadow-[#e8c559]/10"
                                >
                                    <Edit3 className="w-4 h-4" /> {staff.score > 0 ? 'Update Assessment' : 'Start Assessment'}
                                </Link>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* TABLE VIEW */
                <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-white/5 border-b border-white/10">
                                <tr className="text-xs text-gray-500 uppercase tracking-wider text-left">
                                    <th className="p-4 font-semibold text-white">Employee</th>
                                    <th className="p-4 font-semibold text-white text-center">Score</th>
                                    <th className="p-4 font-semibold text-white text-center">Department</th>
                                    <th className="p-4 font-semibold text-white text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {filteredStaff.map(staff => {
                                    const score = staff.score || 0;
                                    const scoreLevel = SCORE_LEVELS.find(l => score >= l.min && score < l.max) || SCORE_LEVELS[2];

                                    return (
                                        <tr key={staff.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-4">
                                                <div className="font-bold text-white">{staff.name}</div>
                                                <div className="text-xs text-gray-500">{ROLE_NAMES[staff.role as StaffRole]?.split('(')[0]}</div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className={`font-bold ${scoreLevel.color}`}>{score.toFixed(2)}</div>
                                                <div className="text-[10px] text-gray-500">{scoreLevel.label}</div>
                                            </td>
                                            <td className="p-4 text-center text-gray-400">
                                                {staff.department}
                                            </td>
                                            <td className="p-4 text-right">
                                                <Link
                                                    href={`/dashboard/command-center/kpi-assessment/${staff.id}`}
                                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 hover:bg-[#e8c559] hover:text-black hover:border-[#e8c559] transition-all text-xs font-bold text-gray-300"
                                                >
                                                    Assess <ArrowRight className="w-3 h-3" />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Role Weighting Reference */}
            <div className="glass-panel rounded-xl p-6 mt-8 border-t border-white/10">
                <h3 className="text-lg font-bold text-white mb-4">📊 Referensi Bobot KPI per Role</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/10 text-xs text-gray-400 uppercase">
                                <th className="text-left pb-3 pr-4">Pillar</th>
                                <th className="text-center pb-3 px-3 min-w-[140px]">Analyst I-II<br /><span className="font-normal normal-case">(Staff)</span></th>
                                <th className="text-center pb-3 px-3 min-w-[160px]">Analyst III - Consultant III<br /><span className="font-normal normal-case">(Supervisor)</span></th>
                                <th className="text-center pb-3 px-3 min-w-[140px]">Sales Executive I-III<br /><span className="font-normal normal-case">(Staff)</span></th>
                                <th className="text-center pb-3 px-3 min-w-[160px]">Business Development<br /><span className="font-normal normal-case">I-III</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {[
                                { key: "knowledge", icon: "📚", name: "Passion for Knowledge", prefix: 'K' },
                                { key: "people", icon: "🤝", name: "Passion for People & Environment", prefix: 'P' },
                                { key: "service", icon: "⭐", name: "Passion for Service", prefix: 'S' },
                                { key: "business", icon: "📊", name: "Passion for Business", prefix: 'B' },
                                { key: "leadership", icon: "👑", name: "Leadership & Supervisory", prefix: 'L' },
                            ].map((pillar) => {
                                // Calculate total weight per pillar per role from RAW_ROLE_WEIGHT_MAPPING
                                const calculatePillarWeight = (role: StaffRole): number => {
                                    return Object.entries(RAW_ROLE_WEIGHT_MAPPING)
                                        .filter(([metricId]) => metricId.startsWith(pillar.prefix))
                                        .reduce((sum, [, weights]) => sum + (weights[role] || 0), 0);
                                };

                                return (
                                    <tr key={pillar.key}>
                                        <td className="py-3 pr-4 text-white font-medium">
                                            <span className="mr-2">{pillar.icon}</span>{pillar.name}
                                        </td>
                                        {(["analyst_staff", "analyst_supervisor", "sales_staff", "bisdev"] as StaffRole[]).map((role) => {
                                            const weight = calculatePillarWeight(role);
                                            const maxWeight = Math.max(
                                                ...(["analyst_staff", "analyst_supervisor", "sales_staff", "bisdev"] as StaffRole[]).map(r => calculatePillarWeight(r))
                                            );
                                            const isHighest = weight === maxWeight && weight > 0;
                                            return (
                                                <td key={role} className="text-center py-3 px-3">
                                                    <span className={`font-medium px-2 py-1 rounded ${weight === 0
                                                        ? 'text-gray-600'
                                                        : isHighest
                                                            ? 'bg-[#e8c559]/20 text-[#e8c559] font-bold'
                                                            : 'text-gray-300'}`}>
                                                        {weight}%
                                                    </span>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
