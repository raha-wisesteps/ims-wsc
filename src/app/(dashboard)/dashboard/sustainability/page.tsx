"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
    LayoutDashboard,
    Zap,
    Droplets,
    Trash2,
    Plane,
    TrendingUp,
    Leaf,
    ArrowRight,
    ChevronRight,
    Recycle,
    Info,
    Factory,
    MessageSquareQuote
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend
} from "recharts";
import { format, parseISO, startOfYear, endOfYear } from "date-fns";

export default function SustainabilityDashboard() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalCarbon: 0,
        activeProjects: 0,
        emissionsIntensity: 0,
        electricity: { totalKwh: 0, carbon: 0 },
        water: { totalLiters: 0, carbon: 0 },
        travel: { totalKm: 0, carbon: 0 },
        waste: { totalOrganic: 0, totalAnorganic: 0, carbon: 0 },
    });
    const [trendData, setTrendData] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState("carbon"); // carbon, electricity, water
    const [latestPost, setLatestPost] = useState<any>(null);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const yearStart = startOfYear(new Date()).toISOString();
            const yearEnd = endOfYear(new Date()).toISOString();

            // 1. Fetch Projects (Active Count for Intensity)
            const { count: projectCount, error: projectError } = await supabase
                .from("projects")
                .select("*", { count: "exact", head: true })
                .eq("category", "project")
                .neq("status", "completed") // Assuming active = not completed? Or strictly 'active'? User said "jumlah project". Let's count all non-archived or just 'active'/'planning'.
                // User said: "jumlah project bisa di lihat di bagian assignment yang tergolong sebagai ‘project’". 
                // Let's count all projects that are not archived.
                .is("is_archived", false);

            // 2. Fetch Electricity Logs (Yearly)
            const { data: elecLogs } = await supabase
                .from("electricity_logs")
                .select("period_start, company_consumption_kwh, carbon_emission")
                .gte("period_start", yearStart)
                .lte("period_start", yearEnd);

            // 3. Fetch Water Logs (Yearly)
            const { data: waterLogs } = await supabase
                .from("water_logs")
                .select("date, total_water_liters, carbon_emission")
                .gte("date", yearStart)
                .lte("date", yearEnd);

            // 4. Fetch Travel Logs (Yearly)
            const { data: travelLogs } = await supabase
                .from("travel_logs")
                .select("travel_date, distance_km, total_emission")
                .gte("travel_date", yearStart)
                .lte("travel_date", yearEnd);

            // 5. Fetch Waste Weekly Reports (Yearly)
            const { data: wasteLogs } = await supabase
                .from("waste_weekly_reports")
                .select("week_start, total_green_weight, total_yellow_weight, total_carbon")
                .gte("week_start", yearStart)
                .lte("week_start", yearEnd);

            // 6. Fetch Latest Community Post
            const { data: latestCommunityPost } = await supabase
                .from("sustainability_forum_posts")
                .select("content, created_at, author:profiles(full_name)")
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

            setLatestPost(latestCommunityPost);

            // --- Aggregation ---

            // Totals
            // Totals
            const totalElec = elecLogs?.reduce((acc: any, curr: any) => ({
                kwh: acc.kwh + (curr.company_consumption_kwh || 0),
                carbon: acc.carbon + (curr.carbon_emission || 0)
            }), { kwh: 0, carbon: 0 });

            const totalWater = waterLogs?.reduce((acc: any, curr: any) => ({
                liters: acc.liters + (curr.total_water_liters || 0),
                carbon: acc.carbon + (curr.carbon_emission || 0)
            }), { liters: 0, carbon: 0 });

            const totalTravel = travelLogs?.reduce((acc: any, curr: any) => ({
                km: acc.km + (curr.distance_km || 0),
                carbon: acc.carbon + (curr.total_emission || 0)
            }), { km: 0, carbon: 0 });

            const totalWaste = wasteLogs?.reduce((acc: any, curr: any) => ({
                organic: acc.organic + (curr.total_green_weight || 0),
                anorganic: acc.anorganic + (curr.total_yellow_weight || 0),
                carbon: acc.carbon + (curr.total_carbon || 0)
            }), { organic: 0, anorganic: 0, carbon: 0 });

            const grandTotalCarbon = (totalElec?.carbon || 0) + (totalWater?.carbon || 0) + (totalTravel?.carbon || 0) + (totalWaste?.carbon || 0);
            const activeProjects = projectCount || 1; // Avoid div by zero
            const intensity = activeProjects > 0 ? grandTotalCarbon / activeProjects : 0;

            setStats({
                totalCarbon: grandTotalCarbon,
                activeProjects: projectCount || 0,
                emissionsIntensity: intensity,
                electricity: { totalKwh: totalElec?.kwh || 0, carbon: totalElec?.carbon || 0 },
                water: { totalLiters: totalWater?.liters || 0, carbon: totalWater?.carbon || 0 },
                travel: { totalKm: totalTravel?.km || 0, carbon: totalTravel?.carbon || 0 },
                waste: {
                    totalOrganic: totalWaste?.organic || 0,
                    totalAnorganic: totalWaste?.anorganic || 0,
                    carbon: totalWaste?.carbon || 0
                }
            });

            // Trend Data Construction (Monthly)
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const trends = months.map((month, index) => {
                const monthIdx = index; // 0-11

                // Filter logs for this month
                const elecMonth = elecLogs?.filter((l: any) => new Date(l.period_start).getMonth() === monthIdx) || [];
                const waterMonth = waterLogs?.filter((l: any) => new Date(l.date).getMonth() === monthIdx) || [];
                const travelMonth = travelLogs?.filter((l: any) => new Date(l.travel_date).getMonth() === monthIdx) || [];
                const wasteMonth = wasteLogs?.filter((l: any) => new Date(l.week_start).getMonth() === monthIdx) || [];

                return {
                    name: month,
                    carbon: (
                        (elecMonth.reduce((sum: number, item: any) => sum + (item.carbon_emission || 0), 0)) +
                        (waterMonth.reduce((sum: number, item: any) => sum + (item.carbon_emission || 0), 0)) +
                        (travelMonth.reduce((sum: number, item: any) => sum + (item.total_emission || 0), 0)) +
                        (wasteMonth.reduce((sum: number, item: any) => sum + (item.total_carbon || 0), 0))
                    ),
                    electricity: elecMonth.reduce((sum: number, item: any) => sum + (item.company_consumption_kwh || 0), 0),
                    water: waterMonth.reduce((sum: number, item: any) => sum + (item.total_water_liters || 0), 0),
                    travel: travelMonth.reduce((sum: number, item: any) => sum + (item.distance_km || 0), 0),
                    waste: wasteMonth.reduce((sum: number, item: any) => sum + ((item.total_green_weight || 0) + (item.total_yellow_weight || 0)), 0),
                };
            });

            setTrendData(trends);

        } catch (error) {
            console.error("Error fetching sustainability data:", error);
        } finally {
            setLoading(false);
        }
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#1c2120] border border-white/10 p-3 rounded-lg shadow-xl">
                    <p className="text-gray-300 font-medium mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} className="text-sm" style={{ color: entry.color }}>
                            {entry.name === 'carbon' && 'Total Carbon: ' + entry.value.toFixed(1) + ' kgCO2e'}
                            {entry.name === 'electricity' && 'Electricity: ' + entry.value.toFixed(1) + ' kWh'}
                            {entry.name === 'water' && 'Water: ' + entry.value.toFixed(1) + ' L'}
                            {entry.name === 'travel' && 'Travel: ' + entry.value.toFixed(1) + ' km'}
                            {entry.name === 'waste' && 'Waste: ' + entry.value.toFixed(1) + ' kg'}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <header className="flex flex-col gap-4 md:flex-row md:items-end justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 dark:from-emerald-500 dark:to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Leaf className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-[var(--text-secondary)]">
                            <Link href="/dashboard" className="hover:text-[var(--text-primary)] transition-colors">Dashboard</Link>
                            <ChevronRight className="h-4 w-4" />
                            <span className="text-[var(--text-primary)]">Sustainability</span>
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Sustainability Overview</h1>
                        <p className="text-sm text-[var(--text-secondary)]">Environmental Impact & Resource Tracking</p>
                    </div>
                </div>
            </header>

            {/* Top Level Stats: Carbon & Intensity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Total Carbon */}
                <div className="lg:col-span-2 glass-panel p-8 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Leaf className="w-64 h-64 text-emerald-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-500">
                                <Factory className="w-5 h-5" />
                            </div>
                            <h2 className="text-emerald-500 font-bold uppercase tracking-wider text-sm">Total Carbon Emissions</h2>
                        </div>
                        <div className="flex items-baseline gap-3">
                            <span className="text-5xl md:text-6xl font-black text-[var(--text-primary)]">
                                {stats.totalCarbon.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                            <span className="text-xl text-[var(--text-secondary)] font-medium">kgCO2e</span>
                        </div>
                        <p className="text-[var(--text-secondary)] mt-4 max-w-md">
                            Accumulated carbon footprint from Electricity, Water, Travel, and Waste activities this year.
                        </p>
                    </div>
                </div>

                {/* Intensity & Projects */}
                <div className="flex flex-col gap-6">
                    {/* Intensity */}
                    <div className="flex-1 glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Emissions Intensity</h3>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-white">{stats.emissionsIntensity.toFixed(1)}</span>
                                <span className="text-xs text-gray-500 font-medium">kgCO2e / Project</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Average impact per active project</p>
                        </div>
                    </div>

                    {/* Active Projects */}
                    <div className="flex-1 glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <LayoutDashboard className="w-24 h-24 text-white" />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Active Projects</h3>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-white">{stats.activeProjects}</span>
                                <span className="text-xs text-gray-500 font-medium">Projects</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Currently being tracked</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Trends Chart */}
            <div className="glass-panel p-6 rounded-2xl border border-white/10">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-emerald-500" /> Emissions & Resource Trends
                        </h3>
                        <p className="text-sm text-gray-400">Monthly tracking of key sustainability metrics</p>
                    </div>
                    <div className="flex bg-white/5 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab("carbon")}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === "carbon" ? "bg-emerald-500 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                        >
                            Buttprint (CO2)
                        </button>
                        <button
                            onClick={() => setActiveTab("electricity")}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === "electricity" ? "bg-yellow-500 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                        >
                            Electricity
                        </button>
                        <button
                            onClick={() => setActiveTab("water")}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === "water" ? "bg-cyan-500 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                        >
                            Water
                        </button>
                        <button
                            onClick={() => setActiveTab("travel")}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === "travel" ? "bg-blue-500 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                        >
                            Travel
                        </button>
                        <button
                            onClick={() => setActiveTab("waste")}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === "waste" ? "bg-amber-500 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                        >
                            Waste
                        </button>
                    </div>
                </div>

                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData}>
                            <defs>
                                <linearGradient id="colorCarbon" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorElec" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorTravel" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorWaste" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis
                                dataKey="name"
                                stroke="#666"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#666"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => value.toLocaleString()}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />

                            {activeTab === "carbon" && (
                                <Area
                                    type="monotone"
                                    dataKey="carbon"
                                    stroke="#10b981"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorCarbon)"
                                    name="carbon"
                                    animationDuration={1000}
                                />
                            )}
                            {activeTab === "electricity" && (
                                <Area
                                    type="monotone"
                                    dataKey="electricity"
                                    stroke="#eab308"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorElec)"
                                    name="electricity"
                                    animationDuration={1000}
                                />
                            )}
                            {activeTab === "water" && (
                                <Area
                                    type="monotone"
                                    dataKey="water"
                                    stroke="#06b6d4"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorWater)"
                                    name="water"
                                    animationDuration={1000}
                                />
                            )}
                            {activeTab === "travel" && (
                                <Area
                                    type="monotone"
                                    dataKey="travel"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorTravel)"
                                    name="travel"
                                    animationDuration={1000}
                                />
                            )}
                            {activeTab === "waste" && (
                                <Area
                                    type="monotone"
                                    dataKey="waste"
                                    stroke="#f59e0b"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorWaste)"
                                    name="waste"
                                    animationDuration={1000}
                                />
                            )}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Resource Breakdown Grid */}
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5 text-emerald-500" /> Quick Access
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Electricity Card */}
                <Link href="/dashboard/sustainability/electricity" className="group">
                    <div className="glass-panel p-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 hover:border-yellow-500/50 transition-all relative overflow-hidden h-full">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Zap className="w-24 h-24 text-yellow-500" />
                        </div>
                        <div className="relative z-10">
                            <div className="p-2 w-fit rounded-lg bg-yellow-500/20 text-yellow-500 mb-4">
                                <Zap className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-1">Electricity</h3>
                            <p className="text-3xl font-black text-yellow-500 mb-2">
                                {stats.electricity.totalKwh.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                <span className="text-sm text-yellow-500/70 font-medium ml-1">kWh</span>
                            </p>
                            <p className="text-sm text-gray-400 flex items-center gap-1">
                                <Leaf className="w-3 h-3 text-emerald-500" />
                                {stats.electricity.carbon.toFixed(1)} kgCO2e
                            </p>
                        </div>
                    </div>
                </Link>

                {/* Water Card */}
                <Link href="/dashboard/sustainability/water" className="group">
                    <div className="glass-panel p-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 hover:border-cyan-500/50 transition-all relative overflow-hidden h-full">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Droplets className="w-24 h-24 text-cyan-500" />
                        </div>
                        <div className="relative z-10">
                            <div className="p-2 w-fit rounded-lg bg-cyan-500/20 text-cyan-500 mb-4">
                                <Droplets className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-1">Water</h3>
                            <p className="text-3xl font-black text-cyan-500 mb-2">
                                {stats.water.totalLiters.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                <span className="text-sm text-cyan-500/70 font-medium ml-1">L</span>
                            </p>
                            <p className="text-sm text-gray-400 flex items-center gap-1">
                                <Leaf className="w-3 h-3 text-emerald-500" />
                                {stats.water.carbon.toFixed(1)} kgCO2e
                            </p>
                        </div>
                    </div>
                </Link>

                {/* Travel Card */}
                <Link href="/dashboard/sustainability/travel" className="group">
                    <div className="glass-panel p-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 hover:border-blue-500/50 transition-all relative overflow-hidden h-full">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Plane className="w-24 h-24 text-blue-500" />
                        </div>
                        <div className="relative z-10">
                            <div className="p-2 w-fit rounded-lg bg-blue-500/20 text-blue-500 mb-4">
                                <Plane className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-1">Travel</h3>
                            <p className="text-3xl font-black text-blue-500 mb-2">
                                {stats.travel.totalKm.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                <span className="text-sm text-blue-500/70 font-medium ml-1">km</span>
                            </p>
                            <p className="text-sm text-gray-400 flex items-center gap-1">
                                <Leaf className="w-3 h-3 text-emerald-500" />
                                {stats.travel.carbon.toFixed(1)} kgCO2e
                            </p>
                        </div>
                    </div>
                </Link>

                {/* Waste Card - Split Organic/Anorganic */}
                <Link href="/dashboard/sustainability/waste" className="group">
                    <div className="glass-panel p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 hover:border-amber-500/50 transition-all relative overflow-hidden h-full">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Trash2 className="w-24 h-24 text-amber-500" />
                        </div>
                        <div className="relative z-10">
                            <div className="p-2 w-fit rounded-lg bg-amber-500/20 text-amber-500 mb-4">
                                <Recycle className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-1">Waste</h3>
                            <div className="flex flex-col gap-1 mb-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-400">Organic:</span>
                                    <span className="text-white font-bold">{stats.waste.totalOrganic.toFixed(1)} kg</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-400">Anorganic:</span>
                                    <span className="text-white font-bold">{stats.waste.totalAnorganic.toFixed(1)} kg</span>
                                </div>
                            </div>
                            <p className="text-sm text-gray-400 flex items-center gap-1 pt-2 border-t border-white/5">
                                <Leaf className="w-3 h-3 text-emerald-500" />
                                {stats.waste.carbon.toFixed(1)} kgCO2e
                            </p>
                        </div>
                    </div>
                </Link>
            </div>

            {/* Community Message */}
            {/* Community Message */}
            <div className="glass-panel p-6 rounded-2xl bg-gradient-to-r from-emerald-900/30 to-emerald-800/10 border border-emerald-500/20">
                <div className="flex items-start gap-4">
                    <div className="p-3 rounded-full bg-emerald-500/20 text-emerald-500 shrink-0">
                        <MessageSquareQuote className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <h3 className="text-lg font-bold text-emerald-400 mb-1">Community Message</h3>
                            <Link
                                href="/dashboard/sustainability/community"
                                className="flex items-center gap-1 text-xs px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-full transition-all group"
                            >
                                View Community <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                        {latestPost ? (
                            <>
                                <p className="text-gray-300 leading-relaxed italic">
                                    {latestPost.content}
                                </p>
                                <div className="mt-3 flex items-center gap-2 text-xs text-emerald-500/70 font-medium">
                                    <span>Posted by {latestPost.author?.full_name}</span>
                                    <span>•</span>
                                    <span>{new Date(latestPost.created_at).toLocaleDateString()}</span>
                                </div>
                            </>
                        ) : (
                            <p className="text-gray-400 italic">No community messages yet. Be the first to post!</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
