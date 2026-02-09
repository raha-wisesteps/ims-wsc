"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    LayoutDashboard,
    FileText,
    TrendingUp,
    Target,
    ArrowRight,
    Bell,
    ShieldAlert,
    Users,
    Calendar,
    ChevronRight,
    PieChart,
    DollarSign,
    Briefcase,
    XCircle,
    Percent,
    Wallet,
    CreditCard
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
};

import { Opportunity } from "@/lib/services/opportunity.service";

// Colors for charts
const COLORS = ['#e8c559', '#171611', '#9ca3af', '#f87171', '#34d399', '#60a5fa', '#818cf8'];

export default function BisDevDashboardPage() {
    const { canAccessBisdev, isLoading, profile } = useAuth();
    const supabase = createClient();

    const [stats, setStats] = useState({
        salesCount: 0,
        proposalCount: 0,
        salesConversion: 0,
        lostCount: 0,
        lossRate: 0,
        cashIn: 0,
        remainingTargetCashIn: 0,
        salesBooking: 0,
        remainingTargetContract: 0,
        annualTarget: 4000000000,
    });

    const [chartData, setChartData] = useState({
        targetVsCashIn: [] as any[],
        salesByProduct: [] as any[],
        salesByCustomer: [] as any[],
        targetVsBooking: [] as any[],
    });

    const [recentActivity, setRecentActivity] = useState<Array<{ type: string; title: string; subtitle: string; date: string }>>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);

    // Edit Target State
    const [isEditingTarget, setIsEditingTarget] = useState(false);
    const [newTarget, setNewTarget] = useState(0);

    const handleUpdateTarget = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Check permissions (redundant with RLS but good for UI feedback)
            if (profile?.role !== 'ceo' && profile?.role !== 'super_admin') {
                alert("Only CEO or Super Admin can update the target.");
                return;
            }

            const { error } = await supabase
                .from('bisdev_config')
                .update({
                    annual_target: newTarget,
                    updated_by: profile.id,
                    updated_at: new Date().toISOString()
                })
                .gt('annual_target', -1); // Dummy filter to update all rows (since there's only 1 row usually, or we should use ID if known)

            // Better: Fetch ID first or just update based on some condition. 
            // Since we don't have ID in state, we can use a query that matches everything or fetch ID earlier.
            // Let's rely on the fetchAllData to refresh.
            // Actually RLS policy allows update if role is correct. 
            // To be safe, let's fetch the ID in fetchAllData and store it, or just use a broad update if there's only one row.
            // A safer way without ID:
            const { data: config } = await supabase.from('bisdev_config').select('id').single();
            if (config) {
                const { error: updateError } = await supabase
                    .from('bisdev_config')
                    .update({
                        annual_target: newTarget,
                        updated_by: profile.id,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', config.id);
                if (updateError) throw updateError;
            }

            setIsEditingTarget(false);
            setStats(prev => ({ ...prev, annualTarget: newTarget }));
            // Recalculate remaining would require re-fetching or duplicate logic. 
            // Let's just reload page or refetch.
            window.location.reload();
        } catch (error: any) {
            console.error("Error updating target:", error);
            alert("Failed to update target.");
        }
    };

    useEffect(() => {
        const fetchAllData = async () => {
            if (!canAccessBisdev) return;

            try {
                // 1. Fetch Configuration (Annual Target)
                const { data: configData } = await supabase.from('bisdev_config').select('annual_target').single();
                const annualTarget = configData?.annual_target || 4000000000;
                setNewTarget(annualTarget); // meaningful default for edit

                // 2. Fetch All Opportunities
                const { data: rawOpportunities, error } = await supabase
                    .from('crm_opportunities')
                    .select('*')
                    .order('updated_at', { ascending: false });

                if (error) throw error;
                const opportunities = (rawOpportunities || []) as Opportunity[];

                // 3. Calculate Metrics
                const wonOpps = opportunities.filter((o: Opportunity) => o.status === 'closed_won');
                const lostOpps = opportunities.filter((o: Opportunity) => o.status === 'closed_lost');
                const proposalOpps = opportunities.filter((o: Opportunity) => o.stage === 'proposal');

                // Counts
                const salesCount = wonOpps.length;
                const proposalCount = proposalOpps.length;
                const lostCount = lostOpps.length;

                // Rates
                const totalClosed = salesCount + lostCount;
                const salesConversion = totalClosed > 0 ? (salesCount / totalClosed) * 100 : 0;
                const lossRate = totalClosed > 0 ? (lostCount / totalClosed) * 100 : 0;

                // Financials
                const cashIn = opportunities.reduce((sum: number, o: Opportunity) => sum + (o.cash_in || 0), 0);
                const salesBooking = wonOpps.reduce((sum: number, o: Opportunity) => sum + (o.value || 0), 0);

                const remainingTargetCashIn = Math.max(0, annualTarget - cashIn);
                const remainingTargetContract = Math.max(0, annualTarget - salesBooking);

                setStats({
                    salesCount,
                    proposalCount,
                    salesConversion,
                    lostCount,
                    lossRate,
                    cashIn,
                    remainingTargetCashIn,
                    salesBooking,
                    remainingTargetContract,
                    annualTarget,
                });

                // 4. Prepare Chart Data

                // Target vs Cash In
                const targetVsCashIn = [
                    { name: 'Cash In', value: cashIn },
                    { name: 'Remaining', value: remainingTargetCashIn },
                ];

                // Target vs Booking
                const targetVsBooking = [
                    { name: 'Booking', value: salesBooking },
                    { name: 'Remaining', value: remainingTargetContract },
                ];

                // Sales by Product (from Won Opps)
                const productSales = wonOpps.reduce((acc: any, curr: Opportunity) => {
                    const type = curr.opportunity_type === 'product_based' ? 'Product' : 'Service/Customer';
                    acc[type] = (acc[type] || 0) + curr.value;
                    return acc;
                }, {});

                const salesByProduct = Object.keys(productSales).map(key => ({ name: key, value: productSales[key] }));

                // Sales by Customer (Top 5)
                // We need to fetch client names. 
                // Since I selected '*', I might not have client name. 
                // I need client name.
                // Let's refetch or just fetch client names separately or modify the query.
                // Modifying the query above to include client.
                const { data: oppsWithClient } = await supabase
                    .from('crm_opportunities')
                    .select('*, client:crm_clients(company_name)')
                    .eq('status', 'closed_won');

                const customerSales = (oppsWithClient || []).reduce((acc: any, curr: any) => {
                    const name = curr.client?.company_name || 'Unknown';
                    acc[name] = (acc[name] || 0) + curr.value;
                    return acc;
                }, {});

                const salesByCustomer = Object.keys(customerSales)
                    .map(key => ({ name: key, value: customerSales[key] }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 5); // Top 5

                setChartData({
                    targetVsCashIn,
                    targetVsBooking,
                    salesByProduct: salesByProduct.length ? salesByProduct : [{ name: 'No Data', value: 1 }],
                    salesByCustomer: salesByCustomer.length ? salesByCustomer : [{ name: 'No Data', value: 1 }],
                });

                // 5. Recent Activity (Latest 5 Opportunities)
                const recent = opportunities.slice(0, 5).map((o: Opportunity) => ({
                    type: o.status === 'closed_won' ? 'sales' : o.stage === 'proposal' ? 'proposal' : 'opportunity',
                    title: o.title,
                    subtitle: o.status,
                    date: o.updated_at
                }));
                setRecentActivity(recent);

            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchAllData();
    }, [canAccessBisdev]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!canAccessBisdev) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <div className="p-4 rounded-full bg-rose-500/10">
                    <ShieldAlert className="w-12 h-12 text-rose-500" />
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Access Denied</h2>
                <Link href="/dashboard" className="px-4 py-2 bg-[#e8c559] text-black rounded-lg font-bold">
                    Back to Dashboard
                </Link>
            </div>
        );
    }

    // Config render helpers
    const MetricCard = ({ title, value, subtext, icon: Icon, colorClass, borderClass }: any) => (
        <div className={`p-5 rounded-2xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] border-l-4 ${borderClass}`}>
            <div className="flex justify-between items-start mb-2">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-bold">{title}</p>
                <Icon className={`w-4 h-4 ${colorClass}`} />
            </div>
            <p className="text-2xl font-black text-[var(--text-primary)] truncate" title={String(value)}>
                {isLoadingData ? '...' : value}
            </p>
            {subtext && <p className={`text-xs mt-1 ${colorClass} opacity-80`}>{subtext}</p>}
        </div>
    );

    const CustomPieChart = ({ title, data }: any) => (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] flex flex-col items-center">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 w-full text-center uppercase tracking-wider">{title}</h3>
            <div className="w-full h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                        <Pie
                            data={data}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry: any, index: any) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Value']}
                            contentStyle={{ backgroundColor: '#1c2120', borderColor: '#333', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </RePieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <header className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#e8c559] to-[#d4b44a] flex items-center justify-center shadow-lg shadow-[#e8c559]/20">
                        <TrendingUp className="w-6 h-6 text-[#171611]" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-[var(--text-secondary)]">
                            <Link href="/dashboard" className="hover:text-[var(--text-primary)] transition-colors">Dashboard</Link>
                            <ChevronRight className="h-4 w-4" />
                            <span className="text-[var(--text-primary)]">Bisdev</span>
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Business Development</h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-bold bg-white dark:bg-[#1c2120] px-4 py-2 rounded-lg border border-[var(--glass-border)]">
                        Target: {formatCurrency(stats.annualTarget)}
                    </span>
                    {(profile?.role === 'ceo' || profile?.role === 'super_admin') && (
                        <button
                            onClick={() => setIsEditingTarget(true)}
                            className="p-2 rounded-lg bg-[#e8c559] text-[#171611] hover:bg-[#d4b44e] transition-colors"
                            title="Edit Target"
                        >
                            <Target className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </header>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {/* Row 1 */}
                <MetricCard
                    title="Number of Sales"
                    value={stats.salesCount}
                    icon={Briefcase}
                    colorClass="text-emerald-500"
                    borderClass="border-l-emerald-500"
                />
                <MetricCard
                    title="Proposals Sent"
                    value={stats.proposalCount}
                    icon={FileText}
                    colorClass="text-blue-500"
                    borderClass="border-l-blue-500"
                />
                <MetricCard
                    title="Sales Conversion"
                    value={`${stats.salesConversion.toFixed(1)}%`}
                    icon={Percent}
                    colorClass="text-amber-500"
                    borderClass="border-l-amber-500"
                />
                <MetricCard
                    title="Lost Projects"
                    value={stats.lostCount}
                    icon={XCircle}
                    colorClass="text-rose-500"
                    borderClass="border-l-rose-500"
                />
                <MetricCard
                    title="Loss Rate"
                    value={`${stats.lossRate.toFixed(1)}%`}
                    icon={TrendingUp}
                    colorClass="text-rose-400"
                    borderClass="border-l-rose-400"
                />

                {/* Row 2 - Financials */}
                <MetricCard
                    title="Cash In (Revenue)"
                    value={formatCurrency(stats.cashIn)}
                    icon={Wallet}
                    colorClass="text-emerald-600"
                    borderClass="border-l-emerald-600"
                    subtext="Actual Paid Amount"
                />
                <MetricCard
                    title="Rem. Target (Cash)"
                    value={formatCurrency(stats.remainingTargetCashIn)}
                    icon={Target}
                    colorClass="text-gray-500"
                    borderClass="border-l-gray-500"
                    subtext="vs Cash In"
                />
                <MetricCard
                    title="Sales Booking"
                    value={formatCurrency(stats.salesBooking)}
                    icon={CreditCard}
                    colorClass="text-blue-600"
                    borderClass="border-l-blue-600"
                    subtext="Total Contract Value"
                />
                <MetricCard
                    title="Rem. Target (Booking)"
                    value={formatCurrency(stats.remainingTargetContract)}
                    icon={Target}
                    colorClass="text-gray-500"
                    borderClass="border-l-gray-500"
                    subtext="vs Contract Value"
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <CustomPieChart title="Target vs Cash In" data={chartData.targetVsCashIn} />
                <CustomPieChart title="Target vs Sales Booking" data={chartData.targetVsBooking} />
                <CustomPieChart title="Sales by Product/Type" data={chartData.salesByProduct} />
                <CustomPieChart title="Sales by Customer (Top 5)" data={chartData.salesByCustomer} />
            </div>

            {/* Quick Actions & Recent */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <div className="p-6 rounded-2xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)]">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                                <Bell className="w-5 h-5 text-[#e8c559]" /> Recent Updates
                            </h2>
                            <Link href="/dashboard/bisdev/opportunities" className="text-sm text-[#e8c559] hover:underline">View All</Link>
                        </div>
                        <div className="space-y-4">
                            {isLoadingData ? (
                                <div className="text-center text-[var(--text-muted)]">Loading...</div>
                            ) : recentActivity.length === 0 ? (
                                <div className="text-center text-[var(--text-muted)]">No recent activity</div>
                            ) : (
                                recentActivity.map((activity, idx) => (
                                    <div key={idx} className="relative pl-6 border-l-2 border-[var(--glass-border)] py-1">
                                        <div className={`absolute -left-[5px] top-2.5 w-2 h-2 rounded-full ${activity.type === 'sales' ? 'bg-emerald-500' :
                                            activity.type === 'proposal' ? 'bg-blue-500' :
                                                'bg-amber-500'
                                            }`}></div>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-sm font-bold text-[var(--text-primary)]">{activity.title}</p>
                                                <p className="text-xs text-[var(--text-secondary)] capitalize">{activity.subtitle.replace('_', ' ')}</p>
                                            </div>
                                            <span className="text-xs text-[var(--text-muted)]">{new Date(activity.date).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <Link
                        href="/dashboard/bisdev/opportunities"
                        className="block p-6 rounded-2xl bg-[#e8c559] text-[#171611] font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
                    >
                        <div className="flex justify-between items-center mb-2">
                            <LayoutDashboard className="h-6 w-6" />
                            <ArrowRight className="h-5 w-5" />
                        </div>
                        <p className="text-lg">Open Opportunity Board</p>
                        <p className="text-xs opacity-80 font-normal">Manage your pipeline</p>
                    </Link>

                    <Link
                        href="/dashboard/bisdev/crm"
                        className="block p-6 rounded-2xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] hover:border-blue-500 group transition-all"
                    >
                        <div className="flex justify-between items-center mb-2">
                            <Users className="h-6 w-6 text-blue-500" />
                            <ArrowRight className="h-5 w-5 text-[var(--text-muted)] group-hover:text-blue-500" />
                        </div>
                        <p className="text-lg font-bold text-[var(--text-primary)]">CRM Database</p>
                        <p className="text-xs text-[var(--text-secondary)]">Client directory and history</p>
                    </Link>
                </div>
            </div>


            {/* Edit Target Modal */}
            {
                isEditingTarget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="w-full max-w-md bg-white dark:bg-[#1c2120] rounded-2xl shadow-2xl p-6 border border-[var(--glass-border)]">
                            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Update Annual Target</h2>
                            <form onSubmit={handleUpdateTarget} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Target Amount (IDR)</label>
                                    <input
                                        type="text"
                                        value={newTarget}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/[^0-9]/g, '');
                                            setNewTarget(val ? parseFloat(val) : 0);
                                        }}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)]"
                                    />
                                    <p className="text-xs text-[var(--text-muted)] mt-1">{formatCurrency(newTarget)}</p>
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditingTarget(false)}
                                        className="px-4 py-2 rounded-xl border border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-black/5"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 rounded-xl bg-[#e8c559] text-[#171611] font-bold"
                                    >
                                        Save
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
