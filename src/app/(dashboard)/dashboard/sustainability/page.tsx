"use client";

import { useState } from "react";
import Link from "next/link";
import {
    LayoutDashboard,
    Zap,
    Droplets,
    Trash2,
    Plane,
    TrendingUp,
    Users,
    ArrowRight
} from "lucide-react";

// Transport emission factors (kg CO2 per km)
const EMISSION_FACTORS = {
    plane: 0.255, // kg CO2/km
    car: 0.171,
    train: 0.041,
    bus: 0.089,
    motorcycle: 0.103,
};

// Mock data for dashboard
const mockStats = {
    totalTravelDistance: 12450, // km
    totalCarbonEmission: 2890, // kg CO2
    totalWaste: 156, // kg
    staffParticipation: 85, // %
    monthlyTrend: [
        { month: "Jul", travel: 980, waste: 12 },
        { month: "Aug", travel: 1120, waste: 14 },
        { month: "Sep", travel: 890, waste: 11 },
        { month: "Oct", travel: 1450, waste: 15 },
        { month: "Nov", travel: 1230, waste: 13 },
        { month: "Dec", travel: 1100, waste: 12 },
    ],
    topTravelers: [
        { name: "Andi Pratama", distance: 3200, mode: "plane", emission: 816 },
        { name: "Citra Lestari", distance: 2100, mode: "plane", emission: 536 },
        { name: "David Chen", distance: 1800, mode: "car", emission: 308 },
    ],
    wasteByType: [
        { type: "Organic", amount: 45, percentage: 29 },
        { type: "Paper", amount: 38, percentage: 24 },
        { type: "Plastic", amount: 32, percentage: 21 },
        { type: "Electronic", amount: 18, percentage: 12 },
        { type: "Others", amount: 23, percentage: 14 },
    ],
};

export default function SustainabilityDashboard() {
    const [selectedPeriod, setSelectedPeriod] = useState("year");

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <header className="flex flex-col gap-4 md:flex-row md:items-end justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 dark:from-emerald-500 dark:to-green-600 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 22c4.97 0 9-4.03 9-9-4.97 0-9 4.03-9 9zM5.6 10.25c0 1.38 1.12 2.5 2.5 2.5.53 0 1.01-.16 1.42-.44l-.02.19c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5l-.02-.19c.4.28.89.44 1.42.44 1.38 0 2.5-1.12 2.5-2.5 0-1-.59-1.85-1.43-2.25.84-.4 1.43-1.25 1.43-2.25 0-1.38-1.12-2.5-2.5-2.5-.53 0-1.01.16-1.42.44l.02-.19C14.5 2.12 13.38 1 12 1S9.5 2.12 9.5 3.5l.02.19c-.4-.28-.89-.44-1.42-.44-1.38 0-2.5 1.12-2.5 2.5 0 1 .59 1.85 1.43 2.25-.84.4-1.43 1.25-1.43 2.25zM12 5.5c1.38 0 2.5 1.12 2.5 2.5s-1.12 2.5-2.5 2.5S9.5 9.38 9.5 8s1.12-2.5 2.5-2.5zM3 13c0 4.97 4.03 9 9 9 0-4.97-4.03-9-9-9z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Sustainability</h1>
                        <p className="text-sm text-[var(--text-secondary)]">Green Initiatives & Environmental Impact</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-[#22c55e] outline-none"
                    >
                        <option value="month">This Month</option>
                        <option value="quarter">This Quarter</option>
                        <option value="year">This Year</option>
                    </select>
                </div>
            </header>

            {/* Overview Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-panel p-5 rounded-xl border-l-4 border-emerald-500">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Travel Distance</p>
                        <Plane className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-3xl font-black text-white">{mockStats.totalTravelDistance.toLocaleString()}</p>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <span className="text-emerald-400 font-bold">-12%</span> vs last month
                    </p>
                </div>

                <div className="glass-panel p-5 rounded-xl border-l-4 border-rose-500">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Total CO₂ Emission</p>
                        <TrendingUp className="w-4 h-4 text-rose-500" />
                    </div>
                    <p className="text-3xl font-black text-white">{mockStats.totalCarbonEmission.toLocaleString()}</p>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <span className="text-rose-400 font-bold">+5%</span> vs last month
                    </p>
                </div>

                <div className="glass-panel p-5 rounded-xl border-l-4 border-amber-500">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Waste Produced</p>
                        <Trash2 className="w-4 h-4 text-amber-500" />
                    </div>
                    <p className="text-3xl font-black text-white">{mockStats.totalWaste}</p>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <span className="text-emerald-400 font-bold">-8%</span> reduction
                    </p>
                </div>

                <div className="glass-panel p-5 rounded-xl border-l-4 border-blue-500">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Staff Participation</p>
                        <Users className="w-4 h-4 text-blue-500" />
                    </div>
                    <p className="text-3xl font-black text-white">{mockStats.staffParticipation}%</p>
                    <p className="text-xs text-gray-400 mt-1">Active contributors</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content: Quick Actions & Charts */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Quick Actions Group */}
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <LayoutDashboard className="w-5 h-5 text-[#22c55e]" /> Quick Actions
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Link
                            href="/dashboard/sustainability/electricity"
                            className="glass-panel p-6 rounded-xl border border-white/10 hover:border-yellow-500 group transition-all"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 rounded-full bg-yellow-500/20 text-yellow-500">
                                    <Zap className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-white group-hover:text-yellow-500 transition-colors">Electricity Report</h3>
                                    <p className="text-sm text-gray-400">Log Power (KwH)</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-yellow-500 font-medium">
                                Input Meter <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>

                        <Link
                            href="/dashboard/sustainability/water"
                            className="glass-panel p-6 rounded-xl border border-white/10 hover:border-blue-500 group transition-all"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 rounded-full bg-blue-500/20 text-blue-500">
                                    <Droplets className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-white group-hover:text-blue-500 transition-colors">Water Report</h3>
                                    <p className="text-sm text-gray-400">Log Water (m³)</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-blue-500 font-medium">
                                Input Meter <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>

                        <Link
                            href="/dashboard/sustainability/travel"
                            className="glass-panel p-6 rounded-xl border border-white/10 hover:border-sky-500 group transition-all"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 rounded-full bg-sky-500/20 text-sky-500">
                                    <Plane className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-white group-hover:text-sky-500 transition-colors">Travel Log</h3>
                                    <p className="text-sm text-gray-400">Record Business Trip</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-sky-500 font-medium">
                                Add Trip <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>

                        <Link
                            href="/dashboard/sustainability/waste"
                            className="glass-panel p-6 rounded-xl border border-white/10 hover:border-amber-500 group transition-all"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 rounded-full bg-amber-500/20 text-amber-500">
                                    <Trash2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-white group-hover:text-amber-500 transition-colors">Waste Log</h3>
                                    <p className="text-sm text-gray-400">Track Waste (kg)</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-amber-500 font-medium">
                                Input Data <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>
                    </div>

                    {/* Detailed Charts */}
                    <div className="glass-panel p-6 rounded-xl border border-white/10">
                        <h3 className="font-bold text-white mb-6">Emissions & Waste Trends</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Monthly Trend */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Monthly CO₂ Emission</h4>
                                <div className="space-y-3">
                                    {mockStats.monthlyTrend.map((item) => (
                                        <div key={item.month} className="flex items-center gap-4">
                                            <span className="w-8 text-xs text-gray-500">{item.month}</span>
                                            <div className="flex-1 flex items-center gap-2">
                                                <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-sky-500 to-sky-400 rounded-full"
                                                        style={{ width: `${(item.travel / 1500) * 100}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-gray-400 w-16 text-right">{item.travel} kg</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Waste Composition */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Waste Composition</h4>
                                <div className="space-y-3">
                                    {mockStats.wasteByType.map((item) => (
                                        <div key={item.type} className="flex items-center gap-4">
                                            <span className="w-20 text-sm text-gray-400">{item.type}</span>
                                            <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${item.type === "Organic" ? "bg-emerald-500" :
                                                        item.type === "Paper" ? "bg-amber-500" :
                                                            item.type === "Plastic" ? "bg-rose-500" :
                                                                item.type === "Electronic" ? "bg-purple-500" :
                                                                    "bg-gray-500"
                                                        }`}
                                                    style={{ width: `${item.percentage}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-gray-400 w-12 text-right">{item.percentage}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-500" /> Insights
                    </h2>

                    {/* Top Travelers */}
                    <div className="glass-panel p-6 rounded-xl border border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-white">Top Travelers</h3>
                            <Link href="/dashboard/sustainability/travel" className="text-xs text-[#22c55e] hover:underline">
                                View All →
                            </Link>
                        </div>
                        <div className="space-y-4">
                            {mockStats.topTravelers.map((traveler, idx) => (
                                <div key={idx} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#22c55e]/30 to-[#16a34a]/30 flex items-center justify-center text-[#22c55e] font-bold text-xs">
                                            {traveler.name.split(" ").map(n => n[0]).join("")}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">{traveler.name}</p>
                                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                                {traveler.mode === "plane" ? "✈️ Plane" : traveler.mode === "car" ? "🚗 Car" : "🚂 Train"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-white">{traveler.distance.toLocaleString()} km</p>
                                        <p className="text-xs text-gray-500">{traveler.emission} kg CO₂</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Tips */}
                    <div className="glass-panel p-6 rounded-xl bg-gradient-to-b from-[#22c55e]/10 to-transparent border border-[#22c55e]/20">
                        <h3 className="font-bold text-[#22c55e] mb-4">💡 Weekly Tips</h3>
                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <div className="mt-1"><span className="text-xl">🚂</span></div>
                                <div>
                                    <p className="text-sm text-white font-bold">Use Trains More</p>
                                    <p className="text-xs text-gray-400">Emisi kereta 84% lebih rendah dari pesawat.</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="mt-1"><span className="text-xl">♻️</span></div>
                                <div>
                                    <p className="text-sm text-white font-bold">Reduce & Reuse</p>
                                    <p className="text-xs text-gray-400">Kurangi kemasan sekali pakai di kantor.</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="mt-1"><span className="text-xl">🌿</span></div>
                                <div>
                                    <p className="text-sm text-white font-bold">Plant a Tree</p>
                                    <p className="text-xs text-gray-400">Ikuti program carbon offset bulanan.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
