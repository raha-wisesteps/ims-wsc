"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ChevronLeft,
    Star,
    Briefcase,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Award
} from "lucide-react";
import { mockTalents, RATING_CONFIG, TalentRecord } from "../data";

export default function TalentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const [talent, setTalent] = useState<TalentRecord | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Unwrap params using React.use()
    const resolvedParams = use(params);

    useEffect(() => {
        // Simulate API fetch delay
        setIsLoading(true);
        setTimeout(() => {
            const foundTalent = mockTalents.find(t => t.id === resolvedParams.id);
            setTalent(foundTalent || null);
            setIsLoading(false);
        }, 500);
    }, [resolvedParams.id]);

    if (isLoading) {
        return <div className="p-10 text-center text-gray-500">Loading talent details...</div>;
    }

    if (!talent) {
        return (
            <div className="p-10 text-center space-y-4">
                <h2 className="text-xl font-bold">Talent Not Found</h2>
                <Link href="/dashboard/talent-pool" className="text-blue-500 hover:underline">
                    Back to Talent Pool
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20">
            {/* Header / Navigation */}
            <div>
                <Link
                    href="/dashboard/talent-pool"
                    className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-4"
                >
                    <ChevronLeft className="w-4 h-4" /> Back to Directory
                </Link>

                <div className="glass-panel p-8 rounded-2xl border border-white/10 relative overflow-hidden">
                    {/* Background Gradient Accent */}
                    <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] opacity-20 pointer-events-none ${talent.rating === 'recommended' ? 'bg-emerald-500' :
                            talent.rating === 'potential' ? 'bg-blue-500' : 'bg-rose-500'
                        }`} />

                    <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-3xl font-bold text-white shadow-xl">
                            {talent.avatarInitials}
                        </div>

                        <div className="flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="text-3xl font-black tracking-tight text-white">{talent.name}</h1>
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${RATING_CONFIG[talent.rating].bgClass} ${RATING_CONFIG[talent.rating].textClass} ${RATING_CONFIG[talent.rating].borderClass}`}>
                                    {RATING_CONFIG[talent.rating].label}
                                </span>
                            </div>
                            <p className="text-xl text-gray-300 font-medium">{talent.role}</p>

                            <div className="flex flex-wrap gap-4 text-sm text-gray-400 pt-2">
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-gray-500" />
                                    {talent.location}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-gray-500" />
                                    Est. Fee: <span className="text-white">{talent.feeRange}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-gray-500" />
                                    Last Active: {talent.lastActive}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 min-w-[200px]">
                            <button className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm transition-colors">
                                <Mail className="w-4 h-4" /> Contact Talent
                            </button>
                            <button className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg font-bold text-sm border border-white/10 transition-colors">
                                Edit Profile
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content: Overview & History */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Skills & Bio */}
                    <div className="glass-panel p-6 rounded-xl border border-white/10">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Award className="w-5 h-5 text-yellow-500" /> Expertise & Evaluation
                        </h3>
                        <div className="space-y-6">
                            <div>
                                <p className="text-sm text-gray-400 mb-2 font-medium uppercase tracking-wider">Core Compentencies</p>
                                <div className="flex flex-wrap gap-2">
                                    {talent.expertise.map((skill, i) => (
                                        <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                <p className="text-sm text-gray-400 mb-2 font-medium uppercase tracking-wider">Performance Notes</p>
                                <p className="text-gray-300 italic leading-relaxed">"{talent.notes}"</p>
                            </div>
                        </div>
                    </div>

                    {/* Project History */}
                    <div className="glass-panel p-6 rounded-xl border border-white/10">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-blue-500" /> Project History
                        </h3>

                        <div className="space-y-6">
                            {talent.projectHistory.length > 0 ? (
                                <div className="relative border-l border-white/10 ml-3 space-y-8">
                                    {talent.projectHistory.map((project) => (
                                        <div key={project.id} className="relative pl-8">
                                            {/* Timeline Dot */}
                                            <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-black/50" />

                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 bg-white/[0.02] p-4 rounded-xl border border-white/5 hover:bg-white/5 transition-colors">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-white text-lg">{project.name}</h4>
                                                        {project.status === 'active' && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-wide">Active</span>}
                                                    </div>
                                                    <p className="text-sm text-blue-400 font-medium">{project.role} • <span className="text-gray-500">{project.period}</span></p>
                                                    <p className="text-sm text-gray-400 leading-relaxed max-w-lg">{project.performance}</p>
                                                </div>

                                                <div className="flex items-center gap-1 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 self-start">
                                                    <span className="text-xs text-gray-500 font-medium uppercase mr-1">Rating</span>
                                                    <span className="font-bold text-white">{project.rating}.0</span>
                                                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-sm">No historical project data available.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Sidebar: Contact & Status */}
                <div className="space-y-6">
                    <div className="glass-panel p-6 rounded-xl border border-white/10">
                        <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Contact Details</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/5 rounded-lg text-gray-400">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Email Address</p>
                                    <p className="text-sm text-white font-medium hover:text-blue-400 cursor-pointer">{talent.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/5 rounded-lg text-gray-400">
                                    <Phone className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Phone Number</p>
                                    <p className="text-sm text-white font-medium">{talent.phone}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
