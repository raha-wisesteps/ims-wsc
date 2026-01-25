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
    CheckCircle2
} from "lucide-react";
import {
    mockStaffData,
    StaffKPI,
    ROLE_NAMES,
    SCORE_LEVELS,
    KPIPillar,
    KPIMetric
} from "../../kpi-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function VariableAssessmentPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [staff, setStaff] = useState<StaffKPI | null>(null);
    const [loading, setLoading] = useState(true);
    const [unsavedChanges, setUnsavedChanges] = useState(false);

    // Initial Load
    useEffect(() => {
        // Simulate API fetch
        const found = mockStaffData.find((s) => s.id === id);
        if (found) {
            // Deep copy to allow editing without affecting original mock immediately
            setStaff(JSON.parse(JSON.stringify(found)));
        }
        setLoading(false);
    }, [id]);

    // Derived Calculation
    const calculations = useMemo(() => {
        if (!staff) return { totalScore: 0, level: SCORE_LEVELS[0] };

        let totalScore = 0;

        Object.values(staff.pillars).forEach((pillar: any) => {
            // Average of metrics
            const metricSum = pillar.metrics.reduce((acc: number, m: KPIMetric) => acc + m.score, 0);
            const metricAvg = pillar.metrics.length > 0 ? metricSum / pillar.metrics.length : 0;

            // Weighted contribution
            totalScore += metricAvg * pillar.weight;
        });

        // Find Score Level
        // Scale 1-5 maps to percentage or level? Assuming 1-5 scale for now based on data
        const level = SCORE_LEVELS.find(l => totalScore >= l.min && totalScore < l.max) || SCORE_LEVELS[2];

        return { totalScore, level };
    }, [staff]);

    const handleMetricChange = (pillarKey: keyof StaffKPI['pillars'], metricId: string, field: 'actual' | 'score' | 'note', value: any) => {
        if (!staff) return;

        setStaff(prev => {
            if (!prev) return null;
            const newStaff = { ...prev };
            const pillar = newStaff.pillars[pillarKey];
            const metricIndex = pillar.metrics.findIndex(m => m.id === metricId);

            if (metricIndex !== -1) {
                pillar.metrics[metricIndex] = {
                    ...pillar.metrics[metricIndex],
                    [field]: value
                };
            }
            return newStaff;
        });
        setUnsavedChanges(true);
    };

    const handleFeedbackChange = (text: string) => {
        setStaff(prev => prev ? { ...prev, feedback: text } : null);
        setUnsavedChanges(true);
    };

    const handleSave = () => {
        // In real app, API call here
        alert("Assessment saved successfully!");
        setUnsavedChanges(false);
        router.push("/dashboard/command-center/kpi-management");
    };

    if (loading) return <div className="p-10 text-white">Loading staff data...</div>;
    if (!staff) return <div className="p-10 text-white">Staff not found.</div>;

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

    return (
        <div className="pb-20 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link
                    href="/dashboard/command-center/kpi-management"
                    className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-3xl font-black text-white">Assessment Form</h1>
                    <p className="text-gray-400">Detailed Grading for <span className="text-[#e8c559] font-bold">{staff.name}</span></p>
                </div>
                <div className="ml-auto flex items-center gap-4">
                    {unsavedChanges && (
                        <span className="text-amber-400 text-sm font-medium flex items-center gap-2 animate-pulse">
                            <AlertCircle className="w-4 h-4" /> Unsaved Changes
                        </span>
                    )}
                    <Button
                        onClick={handleSave}
                        className="bg-[#e8c559] text-black hover:bg-[#d4a843] font-bold"
                    >
                        <Save className="w-4 h-4 mr-2" /> Save Assessment
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
                        <p className="text-white font-bold text-lg">{ROLE_NAMES[staff.role]}</p>
                    </div>
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-gray-400 text-xs mb-1">Department</p>
                        <p className="text-white font-bold text-lg">{staff.department}</p>
                    </div>
                    <div className="col-span-2 p-5 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-gray-400 text-xs mb-2">CEO Note / Feedback</p>
                        <textarea
                            className="w-full bg-transparent border-none outline-none text-white resize-none text-sm min-h-[60px] placeholder:text-gray-600"
                            placeholder="Add overall feedback here..."
                            value={staff.feedback || ""}
                            onChange={(e) => handleFeedbackChange(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Detailed Form */}
            <div className="space-y-8">
                {Object.entries(staff.pillars).map(([key, pillar]: [string, KPIPillar]) => {
                    if (pillar.weight === 0) return null; // Skip irrelevant pillars
                    const Icon = getIcon(key);

                    return (
                        <div key={key} className="glass-panel p-6 rounded-2xl border border-white/10">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                                <div className={`p-2 rounded-lg bg-${pillar.color}-500/20 text-${pillar.color}-500`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">{pillar.label}</h3>
                                    <p className="text-xs text-gray-400">Weight: {(pillar.weight * 100).toFixed(0)}%</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {pillar.metrics.map((metric) => (
                                    <div key={metric.id} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                        <div className="md:col-span-4">
                                            <p className="font-bold text-white mb-1">{metric.name}</p>
                                            <p className="text-xs text-gray-500">Target: {metric.target} {metric.unit}</p>
                                        </div>

                                        {/* Inputs */}
                                        <div className="md:col-span-8 grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Actual ({metric.unit})</label>
                                                <input
                                                    type="number"
                                                    value={metric.actual}
                                                    onChange={(e) => handleMetricChange(key as any, metric.id, 'actual', parseFloat(e.target.value))}
                                                    className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-white text-sm focus:border-[#e8c559] outline-none transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Score (1-5)</label>
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="range"
                                                        min="1" max="5" step="0.5"
                                                        value={metric.score}
                                                        onChange={(e) => handleMetricChange(key as any, metric.id, 'score', parseFloat(e.target.value))}
                                                        className="flex-1 accent-[#e8c559] h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                                    />
                                                    <span className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg border border-white/10 bg-black/20 ${metric.score >= 4 ? 'text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.2)]' :
                                                            metric.score >= 3 ? 'text-amber-400' : 'text-rose-400'
                                                        }`}>
                                                        {metric.score}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="col-span-2 mt-2">
                                                <input
                                                    type="text"
                                                    value={metric.note || ""}
                                                    onChange={(e) => handleMetricChange(key as any, metric.id, 'note', e.target.value)}
                                                    placeholder="Add note for this metric..."
                                                    className="w-full bg-transparent border-b border-white/10 focus:border-[#e8c559] outline-none text-xs text-gray-400 py-1 transition-colors"
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
        </div>
    );
}
