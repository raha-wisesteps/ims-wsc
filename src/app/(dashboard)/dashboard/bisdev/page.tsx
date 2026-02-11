"use client";

import { useState, useEffect, useRef } from "react";
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
    ChevronRight,
    ChevronLeft,
    ChevronDown,
    DollarSign,
    Briefcase,
    XCircle,
    Percent,
    Wallet,
    CreditCard,
    X,
    Eye,
    Trophy,
    Medal,
    Crown,
    Star,
    Award,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
};

import { Opportunity } from "@/lib/services/opportunity.service";

// Theme-aware chart colors — vibrant but legible in both modes
const COLORS = ['#e8c559', '#6366f1', '#22c55e', '#f87171', '#06b6d4', '#a855f7', '#f59e0b'];

// Slide titles
const SLIDE_TITLES = ['Pipeline Overview', 'Financial Performance'];

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

        totalLeadsValue: 0,
        prospectValue: 0,
        proposalValue: 0,
    });

    const [topClients, setTopClients] = useState<Array<{ name: string; value: number }>>([]);

    const [chartData, setChartData] = useState({
        targetVsCashIn: [] as any[],
        salesByProduct: [] as any[],
        targetVsBooking: [] as any[],
    });

    const [activePipelineTab, setActivePipelineTab] = useState<'leads' | 'prospect' | 'proposal' | 'sales'>('prospect');

    const [recentActivity, setRecentActivity] = useState<Array<{ type: string; title: string; subtitle: string; date: string }>>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);

    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const availableYears = [2024, 2025, 2026];

    // Edit Target State
    const [isEditingTarget, setIsEditingTarget] = useState(false);
    const [newTarget, setNewTarget] = useState(0);

    // ============================================
    // CAROUSEL STATE & HANDLERS (2 slides only)
    // ============================================
    const [activeSlide, setActiveSlide] = useState(0);
    const totalSlides = 2;
    const [touchStart, setTouchStart] = useState(0);
    const [touchEnd, setTouchEnd] = useState(0);
    const carouselRef = useRef<HTMLDivElement>(null);
    const minSwipeDistance = 50;

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart(e.touches[0].clientX);
        setTouchEnd(e.touches[0].clientX);
    };
    const handleTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.touches[0].clientX);
    };
    const handleTouchEnd = () => {
        const distance = touchStart - touchEnd;
        if (distance > minSwipeDistance && activeSlide < totalSlides - 1) setActiveSlide(activeSlide + 1);
        if (distance < -minSwipeDistance && activeSlide > 0) setActiveSlide(activeSlide - 1);
    };

    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState(0);
    const handleMouseDown = (e: React.MouseEvent) => { setIsDragging(true); setDragStart(e.clientX); };
    const handleMouseMove = (e: React.MouseEvent) => { if (isDragging) setTouchEnd(e.clientX); };
    const handleMouseUp = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setIsDragging(false);
        const distance = dragStart - e.clientX;
        if (distance > minSwipeDistance && activeSlide < totalSlides - 1) setActiveSlide(activeSlide + 1);
        if (distance < -minSwipeDistance && activeSlide > 0) setActiveSlide(activeSlide - 1);
    };
    const handleMouseLeave = () => setIsDragging(false);

    // ============================================
    // DETAIL MODAL STATE
    // ============================================
    const [detailModal, setDetailModal] = useState<{ type: string; title: string; data: any[] } | null>(null);

    // Cached data for detail drill-downs
    const [cachedOpportunities, setCachedOpportunities] = useState<Opportunity[]>([]);
    const [cachedAllOpportunities, setCachedAllOpportunities] = useState<Opportunity[]>([]);
    const [clientMap, setClientMap] = useState<Map<string, string>>(new Map());

    // ============================================
    // DETAIL BUILDERS
    // ============================================
    const openDetail = (type: string, title: string) => {
        const opportunities = cachedOpportunities;
        const allOpportunities = cachedAllOpportunities;

        let data: any[] = [];

        switch (type) {
            case 'sales': {
                data = opportunities
                    .filter(o => o.stage === 'sales')
                    .map(o => ({
                        title: o.title,
                        client: clientMap.get(o.client_id) || 'Unknown',
                        value: o.value,
                        status: o.status,
                    }));
                break;
            }
            case 'proposals': {
                data = opportunities
                    .filter(o =>
                        o.has_proposal ||
                        (o.stage === 'proposal' && ['sent', 'follow_up'].includes(o.status))
                    )
                    .map(o => ({
                        title: o.title,
                        client: clientMap.get(o.client_id) || 'Unknown',
                        value: o.value,
                        status: o.status,
                        stage: o.stage,
                    }));
                break;
            }
            case 'lost': {
                data = opportunities
                    .filter(o => o.stage === 'leads' && ['closed_lost', 'lost'].includes(o.status))
                    .map(o => ({
                        title: o.title,
                        client: clientMap.get(o.client_id) || 'Unknown',
                        value: o.value,
                        notes: o.notes || '-',
                    }));
                break;
            }
            case 'prospect_value': {
                data = opportunities
                    .filter(o => o.stage === 'prospect')
                    .map(o => ({
                        title: o.title,
                        client: clientMap.get(o.client_id) || 'Unknown',
                        value: o.value,
                        status: o.status,
                    }));
                break;
            }
            case 'proposal_value': {
                data = opportunities
                    .filter(o => o.stage === 'proposal')
                    .map(o => ({
                        title: o.title,
                        client: clientMap.get(o.client_id) || 'Unknown',
                        value: o.value,
                        status: o.status,
                    }));
                break;
            }
            case 'leads_value': {
                data = opportunities
                    .filter(o => o.stage === 'leads')
                    .map(o => ({
                        title: o.title,
                        client: clientMap.get(o.client_id) || 'Unknown',
                        value: o.value,
                        status: o.status,
                    }));
                break;
            }
            case 'cash_in': {
                data = [];
                allOpportunities.forEach(o => {
                    if (o.revenue && Array.isArray(o.revenue)) {
                        o.revenue.forEach((r: any) => {
                            const paymentYear = new Date(r.payment_date).getFullYear();
                            if (paymentYear === selectedYear) {
                                data.push({
                                    title: o.title,
                                    client: clientMap.get(o.client_id) || 'Unknown',
                                    amount: r.amount,
                                    payment_date: r.payment_date,
                                    notes: r.notes || '-',
                                });
                            }
                        });
                    }
                });
                data.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
                break;
            }
            case 'remaining_cash': {
                data = [];
                allOpportunities.forEach(o => {
                    if (o.revenue && Array.isArray(o.revenue)) {
                        o.revenue.forEach((r: any) => {
                            const paymentYear = new Date(r.payment_date).getFullYear();
                            if (paymentYear === selectedYear) {
                                data.push({
                                    title: o.title,
                                    client: clientMap.get(o.client_id) || 'Unknown',
                                    amount: r.amount,
                                    payment_date: r.payment_date,
                                });
                            }
                        });
                    }
                });
                data.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
                break;
            }
            case 'sales_booking': {
                data = opportunities
                    .filter(o => o.stage === 'sales')
                    .map(o => ({
                        title: o.title,
                        client: clientMap.get(o.client_id) || 'Unknown',
                        value: o.value,
                        status: o.status,
                        created_at: o.created_at,
                    }));
                break;
            }
            case 'remaining_booking': {
                data = opportunities
                    .filter(o => o.stage === 'sales')
                    .map(o => ({
                        title: o.title,
                        client: clientMap.get(o.client_id) || 'Unknown',
                        value: o.value,
                        status: o.status,
                    }));
                break;
            }
            case 'conversion': {
                const salesOpps = opportunities.filter(o => o.stage === 'sales');
                data = salesOpps.map(o => ({
                    title: o.title,
                    client: clientMap.get(o.client_id) || 'Unknown',
                    value: o.value,
                    has_proposal: o.has_proposal ? 'Yes' : 'No',
                    status: o.status,
                }));
                break;
            }
            case 'loss_rate': {
                data = opportunities
                    .filter(o => o.stage === 'leads' && ['closed_lost', 'lost'].includes(o.status))
                    .map(o => ({
                        title: o.title,
                        client: clientMap.get(o.client_id) || 'Unknown',
                        value: o.value,
                        notes: o.notes || '-',
                    }));
                break;
            }
        }

        setDetailModal({ type, title, data });
    };

    // ============================================
    // DATA FETCHING
    // ============================================
    const handleUpdateTarget = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (profile?.role !== 'ceo' && profile?.role !== 'super_admin') {
                alert("Only CEO or Super Admin can update the target.");
                return;
            }

            const { data: config } = await supabase
                .from('bisdev_config')
                .select('id')
                .eq('year', selectedYear)
                .single();

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
            } else {
                const { error: insertError } = await supabase
                    .from('bisdev_config')
                    .insert({
                        year: selectedYear,
                        annual_target: newTarget,
                        updated_by: profile.id,
                    });
                if (insertError) throw insertError;
            }

            setIsEditingTarget(false);
            setStats(prev => ({ ...prev, annualTarget: newTarget }));
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
                // 1. Fetch Configuration (Annual Target) for Selected Year
                const { data: configData } = await supabase
                    .from('bisdev_config')
                    .select('annual_target')
                    .eq('year', selectedYear)
                    .single();

                const annualTarget = configData?.annual_target || 4000000000;
                setNewTarget(annualTarget);

                // 2. Fetch All Opportunities
                const { data: rawOpportunities, error } = await supabase
                    .from('crm_opportunities')
                    .select('*, has_proposal, revenue:crm_revenue(*)')
                    .order('updated_at', { ascending: false });

                if (error) throw error;

                // Filter by Selected Year (Created At)
                const allOpportunities = (rawOpportunities || []) as Opportunity[];
                const opportunities = allOpportunities.filter(o => {
                    const year = new Date(o.created_at).getFullYear();
                    return year === selectedYear;
                });

                // Cache for detail drill-downs
                setCachedOpportunities(opportunities);
                setCachedAllOpportunities(allOpportunities);

                // Fetch Clients for Leaderboard
                const { data: clientsData } = await supabase.from('crm_clients').select('id, company_name');
                const cMap = new Map<string, string>((clientsData || []).map((c: any) => [c.id, c.company_name]));
                setClientMap(cMap);

                // 3. Calculate Metrics

                // Sales Count: Stage == 'sales'
                const salesOpps = opportunities.filter((o: Opportunity) => o.stage === 'sales');
                const salesCount = salesOpps.length;

                // Proposals Sent
                const oppIds = opportunities.map(o => o.id);
                let proposalCount = 0;

                if (oppIds.length > 0) {
                    const { data: journeys } = await supabase
                        .from('crm_journey')
                        .select('opportunity_id')
                        .in('opportunity_id', oppIds)
                        .eq('to_stage', 'proposal')
                        .in('status', ['sent', 'follow_up']);

                    const journeyIds = new Set((journeys || []).map((j: { opportunity_id: string }) => j.opportunity_id));

                    opportunities.forEach((o: Opportunity) => {
                        if (o.stage === 'proposal' && ['sent', 'follow_up'].includes(o.status)) {
                            journeyIds.add(o.id);
                        }
                        if (o.has_proposal) {
                            journeyIds.add(o.id);
                        }
                    });

                    proposalCount = journeyIds.size;
                }

                // Lost Projects
                const lostOpps = opportunities.filter((o: Opportunity) =>
                    o.stage === 'leads' && ['closed_lost', 'lost'].includes(o.status)
                );
                const lostCount = lostOpps.length;

                // Sales Conversion
                let qualifiedSalesCount = 0;
                if (salesOpps.length > 0) {
                    const salesOppIds = salesOpps.map(o => o.id);
                    const { data: salesJourneys } = await supabase
                        .from('crm_journey')
                        .select('opportunity_id')
                        .in('opportunity_id', salesOppIds)
                        .in('from_stage', ['leads', 'proposal']);

                    const qualifiedJourneyIds = new Set((salesJourneys || []).map((j: { opportunity_id: string }) => j.opportunity_id));

                    salesOpps.forEach(o => {
                        if (o.has_proposal || qualifiedJourneyIds.has(o.id)) {
                            qualifiedSalesCount++;
                        }
                    });
                }

                const salesConversion = proposalCount > 0 ? (qualifiedSalesCount / proposalCount) * 100 : 0;
                const lossRate = proposalCount > 0 ? (lostCount / proposalCount) * 100 : 0;

                // Financials
                // Cash In: Sum of payments filtered by payment_date year (NOT opportunity created_at)
                const cashIn = allOpportunities.reduce((sum: number, o: Opportunity) => {
                    const oppRevenue = o.revenue?.reduce((rSum: number, r: any) => {
                        const paymentYear = new Date(r.payment_date).getFullYear();
                        return paymentYear === selectedYear ? rSum + (r.amount || 0) : rSum;
                    }, 0) || 0;
                    return sum + oppRevenue;
                }, 0);

                // Sales Booking: Sum of Value in 'sales' stage
                const salesBooking = salesOpps.reduce((sum: number, o: Opportunity) => sum + (o.value || 0), 0);

                const remainingTargetCashIn = Math.max(0, annualTarget - cashIn);
                const remainingTargetContract = Math.max(0, annualTarget - salesBooking);

                // Pipeline Values
                const prospectValue = opportunities
                    .filter(o => o.stage === 'prospect')
                    .reduce((sum, o) => sum + (o.value || 0), 0);

                const proposalValue = opportunities
                    .filter(o => o.stage === 'proposal')
                    .reduce((sum, o) => sum + (o.value || 0), 0);

                const leadsValue = opportunities
                    .filter(o => o.stage === 'leads')
                    .reduce((sum, o) => sum + (o.value || 0), 0);

                // Top Clients (ALL TIME)
                const clientSales: Record<string, number> = {};
                const topClientsSource = allOpportunities.length > 0 ? allOpportunities : opportunities;

                topClientsSource.forEach(o => {
                    const isWon = o.stage === 'sales' || ['won', 'closed_won', 'full_payment'].includes(o.status);
                    if (isWon && o.client_id) {
                        const val = Number(o.value) || 0;
                        clientSales[o.client_id] = (clientSales[o.client_id] || 0) + val;
                    }
                });

                const topClientsList = Object.entries(clientSales)
                    .map(([clientId, value]) => ({
                        name: cMap.get(clientId) || 'Unknown Client',
                        value: value
                    }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 10);
                setTopClients(topClientsList);

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
                    totalLeadsValue: leadsValue,
                    prospectValue,
                    proposalValue,
                });

                // 4. Prepare Chart Data
                const targetVsCashIn = [
                    { name: 'Cash In', value: cashIn },
                    { name: 'Remaining', value: remainingTargetCashIn },
                ];

                const targetVsBooking = [
                    { name: 'Booking', value: salesBooking },
                    { name: 'Remaining', value: remainingTargetContract },
                ];

                const productSales = salesOpps.reduce((acc: any, curr: Opportunity) => {
                    const type = curr.opportunity_type === 'product_based' ? 'Product Based' : 'Customer Based';
                    acc[type] = (acc[type] || 0) + curr.value;
                    return acc;
                }, {});

                const salesByProduct = Object.keys(productSales).map(key => ({ name: key, value: productSales[key] }));

                // Helper for monthly trend
                const getMonthlyTrend = (items: Opportunity[], dateField: 'created_at' | 'updated_at' = 'created_at') => {
                    const monthly = new Array(12).fill(0);
                    items.forEach(o => {
                        const date = new Date(o[dateField]);
                        if (date.getFullYear() === selectedYear) {
                            monthly[date.getMonth()] += o.value || 0;
                        }
                    });
                    return monthly.map((val, idx) => ({
                        name: new Date(selectedYear, idx).toLocaleString('default', { month: 'short' }),
                        value: val
                    }));
                };

                const leadsTrend = getMonthlyTrend(opportunities.filter(o => o.stage === 'leads'), 'created_at');
                const prospectTrend = getMonthlyTrend(opportunities.filter(o => o.stage === 'prospect'), 'created_at');
                const salesTrend = getMonthlyTrend(salesOpps, 'updated_at');

                setChartData({
                    targetVsCashIn,
                    targetVsBooking,
                    salesByProduct: salesByProduct.length ? salesByProduct : [{ name: 'No Data', value: 1 }],
                });

                // 5. Recent Activity
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
    }, [canAccessBisdev, selectedYear]);

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
                <Link href="/dashboard" className="px-4 py-2 bg-[#e8c559] text-[#171611] rounded-lg font-bold">
                    Back to Dashboard
                </Link>
            </div>
        );
    }

    // ============================================
    // RENDER HELPERS
    // ============================================



    // MetricCard — clickable
    const MetricCard = ({ title, value, subtext, icon: Icon, colorClass, borderClass, detailType }: any) => (
        <div
            onClick={() => detailType && openDetail(detailType, title)}
            className={`p-5 rounded-xl glass-panel border-l-4 ${borderClass} ${detailType ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all group' : ''}`}
        >
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

    // CustomPieChart — theme-aware tooltip & legend
    const CustomPieChart = ({ title, data }: any) => (
        <div className="p-6 rounded-xl glass-panel flex flex-col items-center">
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
                            {data.map((_entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Value']}
                            contentStyle={{
                                backgroundColor: 'var(--tooltip-bg)',
                                borderColor: 'var(--glass-border)',
                                borderRadius: '12px',
                                color: 'var(--tooltip-text)',
                            }}
                            itemStyle={{ color: 'var(--tooltip-text)' }}
                            labelStyle={{ color: 'var(--tooltip-text)' }}
                        />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                            formatter={(value: string) => (
                                <span style={{ color: 'var(--text-secondary)' }}>{value}</span>
                            )}
                        />
                    </RePieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );

    // Detail Modal renderer
    const renderDetailModal = () => {
        if (!detailModal) return null;
        const { title, data } = detailModal;

        const totalValue = data.reduce((sum: number, d: any) => sum + (d.value || d.amount || 0), 0);

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setDetailModal(null)}>
                <div
                    className="w-full max-w-2xl max-h-[80vh] bg-white dark:bg-[#1c2120] rounded-2xl shadow-2xl border border-[var(--glass-border)] flex flex-col"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-[var(--glass-border)]">
                        <div>
                            <h2 className="text-lg font-bold text-[var(--text-primary)]">{title}</h2>
                            <p className="text-xs text-[var(--text-muted)]">
                                {data.length} item{data.length !== 1 ? 's' : ''} • Total: {formatCurrency(totalValue)}
                            </p>
                        </div>
                        <button
                            onClick={() => setDetailModal(null)}
                            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[var(--text-secondary)]"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="overflow-y-auto flex-1 p-5">
                        {data.length === 0 ? (
                            <p className="text-center text-[var(--text-muted)] py-8 italic">No data for this period.</p>
                        ) : (
                            <div className="space-y-2">
                                {data.map((item: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-[var(--glass-border)]">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-[var(--text-primary)] truncate">{item.title}</p>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--text-secondary)]">
                                                <span>{item.client}</span>
                                                {item.status && (
                                                    <span className="px-1.5 py-0.5 rounded bg-[var(--glass-border)] text-[var(--text-secondary)] capitalize">
                                                        {item.status.replace('_', ' ')}
                                                    </span>
                                                )}
                                                {item.stage && <span className="capitalize">Stage: {item.stage}</span>}
                                                {item.has_proposal && <span>Proposal: {item.has_proposal}</span>}
                                                {item.notes && item.notes !== '-' && <span className="truncate max-w-[200px]">📝 {item.notes}</span>}
                                                {item.payment_date && (
                                                    <span>
                                                        📅 {new Date(item.payment_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                )}
                                                {item.created_at && (
                                                    <span>
                                                        Created: {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-sm font-bold text-[var(--text-primary)] whitespace-nowrap ml-3">
                                            {formatCurrency(item.value || item.amount || 0)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <header className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3f545f] to-[#5f788e] dark:from-[#e8c559] dark:to-[#d4b44a] flex items-center justify-center shadow-lg">
                        <TrendingUp className="w-6 h-6 text-white dark:text-[#171611]" />
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
                    <div className="flex glass-panel rounded-lg p-1">
                        {availableYears.map(year => (
                            <button
                                key={year}
                                onClick={() => setSelectedYear(year)}
                                className={`px-3 py-1 text-sm font-bold rounded-md transition-colors ${selectedYear === year
                                    ? 'bg-[#e8c559] text-[#171611]'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--glass-border)]'
                                    }`}
                            >
                                {year}
                            </button>
                        ))}
                    </div>

                    <span className="text-sm font-bold glass-panel px-4 py-2 rounded-lg text-[var(--text-primary)]">
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

            {/* ============================================ */}
            {/* SWIPEABLE SLIDES (2 slides) */}
            {/* ============================================ */}
            <div className="relative">
                {/* Slide title + dot indicators */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                        {SLIDE_TITLES[activeSlide]}
                        <span className="text-xs text-[var(--text-muted)] font-normal">
                            {activeSlide + 1}/{totalSlides}
                        </span>
                    </h2>
                    <div className="flex items-center gap-2">
                        {/* Dot indicators */}
                        <div className="flex gap-1.5">
                            {SLIDE_TITLES.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveSlide(idx)}
                                    className={`w-2.5 h-2.5 rounded-full transition-all ${idx === activeSlide
                                        ? 'bg-[#e8c559] w-6'
                                        : 'bg-[var(--glass-border)] hover:bg-[var(--text-muted)]'
                                        }`}
                                />
                            ))}
                        </div>
                        {/* Nav arrows */}
                        <button
                            onClick={() => activeSlide > 0 && setActiveSlide(activeSlide - 1)}
                            disabled={activeSlide === 0}
                            className="p-1.5 rounded-lg glass-panel text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => activeSlide < totalSlides - 1 && setActiveSlide(activeSlide + 1)}
                            disabled={activeSlide === totalSlides - 1}
                            className="p-1.5 rounded-lg glass-panel text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Carousel viewport */}
                <div
                    ref={carouselRef}
                    className="overflow-hidden rounded-2xl"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                    style={{ userSelect: isDragging ? 'none' : 'auto' }}
                >
                    <div
                        className="flex transition-transform duration-500 ease-out"
                        style={{ transform: `translateX(-${activeSlide * 100}%)` }}
                    >
                        {/* ==================== SLIDE 1: Pipeline Overview ==================== */}
                        <div className="w-full flex-shrink-0 px-1">
                            {/* Row 1: Count metrics */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
                                <MetricCard
                                    title="Number of Sales"
                                    value={stats.salesCount}
                                    icon={Briefcase}
                                    colorClass="text-emerald-500"
                                    borderClass="border-l-emerald-500"
                                    detailType="sales"
                                />
                                <MetricCard
                                    title="Proposals Sent"
                                    value={stats.proposalCount}
                                    icon={FileText}
                                    colorClass="text-sky-500"
                                    borderClass="border-l-sky-500"
                                    detailType="proposals"
                                />
                                <MetricCard
                                    title="Sales Conversion"
                                    value={`${stats.salesConversion.toFixed(1)}%`}
                                    icon={Percent}
                                    colorClass="text-amber-500"
                                    borderClass="border-l-amber-500"
                                    detailType="conversion"
                                />
                                <MetricCard
                                    title="Lost Projects"
                                    value={stats.lostCount}
                                    icon={XCircle}
                                    colorClass="text-rose-500"
                                    borderClass="border-l-rose-500"
                                    detailType="lost"
                                />
                                <MetricCard
                                    title="Loss Rate"
                                    value={`${stats.lossRate.toFixed(1)}%`}
                                    icon={TrendingUp}
                                    colorClass="text-rose-400"
                                    borderClass="border-l-rose-400"
                                    detailType="loss_rate"
                                />
                            </div>

                            {/* Row 2: Master-Detail Pipeline View */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Left: Metrics Tabs */}
                                <div className="flex flex-col gap-4">
                                    {[
                                        { id: 'prospect', label: 'Prospect Value', value: stats.prospectValue, icon: Target, color: 'text-violet-500', border: 'border-l-violet-500', bg: 'bg-violet-500/10' },
                                        { id: 'proposal', label: 'Proposal Value', value: stats.proposalValue, icon: FileText, color: 'text-sky-500', border: 'border-l-sky-500', bg: 'bg-sky-500/10' },
                                        { id: 'leads', label: 'Leads Value', value: stats.totalLeadsValue, icon: DollarSign, color: 'text-indigo-500', border: 'border-l-indigo-500', bg: 'bg-indigo-500/10' },
                                        { id: 'sales', label: 'Sales Booking', value: stats.salesBooking, icon: Briefcase, color: 'text-emerald-500', border: 'border-l-emerald-500', bg: 'bg-emerald-500/10' },
                                    ].map((tab) => (
                                        <div
                                            key={tab.id}
                                            onClick={() => setActivePipelineTab(tab.id as any)}
                                            className={`p-4 rounded-xl glass-panel border-l-4 cursor-pointer transition-all ${tab.border} ${activePipelineTab === tab.id ? 'bg-white/5 shadow-lg scale-[1.02]' : 'hover:bg-white/5 opacity-70 hover:opacity-100'}`}
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className={`p-2 rounded-lg ${tab.bg}`}>
                                                    <tab.icon className={`w-4 h-4 ${tab.color}`} />
                                                </div>
                                                <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{tab.label}</p>
                                            </div>
                                            <p className="text-xl font-black text-[var(--text-primary)]">{formatCurrency(tab.value)}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Right: Detailed List */}
                                <div className="md:col-span-2 glass-panel rounded-xl p-0 overflow-hidden flex flex-col h-[500px]">
                                    <div className="p-4 border-b border-[var(--glass-border)] bg-black/5 dark:bg-white/5 flex items-center justify-between">
                                        <h3 className="font-bold text-[var(--text-primary)] capitalize">{activePipelineTab.replace('_', ' ')} Details</h3>
                                    </div>
                                    <div className="overflow-y-auto flex-1 custom-scrollbar">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-[var(--text-muted)] uppercase bg-black/5 dark:bg-white/5 sticky top-0 z-10 backdrop-blur-md">
                                                <tr>
                                                    <th className="px-4 py-3 font-semibold">Client</th>
                                                    <th className="px-4 py-3 font-semibold">Status</th>
                                                    <th className="px-4 py-3 font-semibold">Opportunity</th>
                                                    <th className="px-4 py-3 font-semibold text-right">Value</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--glass-border)]">
                                                {(() => {
                                                    let items: Opportunity[] = [];
                                                    if (activePipelineTab === 'leads') items = cachedOpportunities.filter(o => o.stage === 'leads');
                                                    else if (activePipelineTab === 'prospect') items = cachedOpportunities.filter(o => o.stage === 'prospect');
                                                    else if (activePipelineTab === 'proposal') items = cachedOpportunities.filter(o => o.stage === 'proposal');
                                                    else if (activePipelineTab === 'sales') items = cachedOpportunities.filter(o => o.stage === 'sales');

                                                    const pipelineData = items.map(o => ({
                                                        client: clientMap.get(o.client_id) || 'Unknown',
                                                        title: o.title,
                                                        value: o.value,
                                                        status: o.status
                                                    })).sort((a, b) => b.value - a.value);

                                                    if (pipelineData.length === 0) return (
                                                        <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--text-muted)]">No items in this stage.</td></tr>
                                                    );

                                                    const getStatusColor = (status: string) => {
                                                        const s = status?.toLowerCase() || '';
                                                        if (['hot', 'won', 'closed_won', 'full_payment'].includes(s)) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
                                                        if (['mid', 'sent', 'on_going', 'proposal'].includes(s)) return 'bg-sky-500/10 text-sky-500 border-sky-500/20';
                                                        if (['low', 'pending', 'lead'].includes(s)) return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
                                                        if (['follow_up'].includes(s)) return 'bg-violet-500/10 text-violet-500 border-violet-500/20';
                                                        if (['lost', 'closed_lost'].includes(s)) return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
                                                        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
                                                    };

                                                    return pipelineData.map((item, i) => (
                                                        <tr key={i} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                                            <td className="px-4 py-3 text-[var(--text-primary)] font-medium truncate max-w-[150px]">{item.client}</td>
                                                            <td className="px-4 py-3">
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusColor(item.status)}`}>
                                                                    {item.status?.replace('_', ' ') || '-'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-[var(--text-secondary)] truncate max-w-[200px]">{item.title}</td>
                                                            <td className="px-4 py-3 text-[var(--text-primary)] text-right font-mono">{formatCurrency(item.value)}</td>
                                                        </tr>
                                                    ));
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ==================== SLIDE 2: Financial Performance ==================== */}
                        <div className="w-full flex-shrink-0 px-1">
                            {/* Financial metrics */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                <MetricCard
                                    title="Cash In (Revenue)"
                                    value={formatCurrency(stats.cashIn)}
                                    icon={Wallet}
                                    colorClass="text-emerald-500"
                                    borderClass="border-l-emerald-500"
                                    subtext="Actual Paid Amount"
                                    detailType="cash_in"
                                />
                                <MetricCard
                                    title="Rem. Target (Cash)"
                                    value={formatCurrency(stats.remainingTargetCashIn)}
                                    icon={Target}
                                    colorClass="text-gray-500 dark:text-gray-400"
                                    borderClass="border-l-gray-400"
                                    subtext="vs Cash In"
                                    detailType="remaining_cash"
                                />
                                <MetricCard
                                    title="Sales Booking"
                                    value={formatCurrency(stats.salesBooking)}
                                    icon={CreditCard}
                                    colorClass="text-sky-500"
                                    borderClass="border-l-sky-500"
                                    subtext="Total Contract Value"
                                    detailType="sales_booking"
                                />
                                <MetricCard
                                    title="Rem. Target (Booking)"
                                    value={formatCurrency(stats.remainingTargetContract)}
                                    icon={Target}
                                    colorClass="text-gray-500 dark:text-gray-400"
                                    borderClass="border-l-gray-400"
                                    subtext="vs Contract Value"
                                    detailType="remaining_booking"
                                />
                            </div>

                            {/* Charts */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                <CustomPieChart title="Target vs Cash In" data={chartData.targetVsCashIn} />
                                <CustomPieChart title="Target vs Sales Booking" data={chartData.targetVsBooking} />
                                <CustomPieChart title="Sales by Product Type" data={chartData.salesByProduct} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ============================================ */}
            {/* ALWAYS VISIBLE: Quick Access + Activity */}
            {/* Layout matches sustainability/operational pattern */}
            {/* ============================================ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column (2 cols): Quick Actions + Recent Updates */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Quick Access Section */}
                    <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <LayoutDashboard className="w-5 h-5 text-[#e8c559]" /> Quick Access
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Link
                            href="/dashboard/bisdev/opportunities"
                            className="glass-panel p-6 rounded-xl hover:border-[#e8c559] group transition-all"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 rounded-full bg-[#e8c559]/20 text-[#e8c559]">
                                    <LayoutDashboard className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-[var(--text-primary)] group-hover:text-[#e8c559] transition-colors">Opportunity Board</h3>
                                    <p className="text-sm text-[var(--text-secondary)]">Manage your pipeline</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-[#e8c559] font-medium">
                                Open Board <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>

                        <Link
                            href="/dashboard/bisdev/crm"
                            className="glass-panel p-6 rounded-xl hover:border-sky-500 group transition-all"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 rounded-full bg-sky-500/20 text-sky-500">
                                    <Users className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-[var(--text-primary)] group-hover:text-sky-500 transition-colors">CRM Database</h3>
                                    <p className="text-sm text-[var(--text-secondary)]">Client directory & history</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-sky-500 font-medium">
                                Manage Clients <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>
                    </div>

                    {/* Recent Updates */}
                    <div className="glass-panel p-6 rounded-xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                                <Bell className="w-5 h-5 text-[#e8c559]" /> Recent Updates
                            </h3>
                            <Link href="/dashboard/bisdev/opportunities" className="text-xs text-[#e8c559] hover:underline">
                                View All →
                            </Link>
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
                                            activity.type === 'proposal' ? 'bg-sky-500' :
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

                {/* Right Sidebar: Top Clients (Redesigned) */}
                <div className="space-y-6">
                    <div className="p-6 rounded-xl glass-panel h-full border-t-4 border-t-[#e8c559]">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 bg-[#e8c559]/10 rounded-lg">
                                <Trophy className="w-6 h-6 text-[#e8c559]" />
                            </div>
                            <h3 className="text-lg font-bold text-[var(--text-primary)]">Top Clients</h3>
                        </div>

                        <div className="space-y-4">
                            {topClients.map((client, index) => {
                                const isTop3 = index < 3;
                                const RankIcon = index === 0 ? Crown : index === 1 ? Medal : index === 2 ? Award : Star;
                                const rankColor = index === 0 ? 'text-amber-400' : index === 1 ? 'text-slate-400' : index === 2 ? 'text-orange-400' : 'text-slate-500';

                                return (
                                    <div key={index} className="flex items-center gap-4 group">
                                        <div className={`
                                            w-10 h-10 flex-shrink-0 flex items-center justify-center 
                                            rounded-tr-xl rounded-bl-xl rounded-tl-md rounded-br-md 
                                            font-bold text-sm shadow-sm transition-all group-hover:scale-110
                                            ${index === 0 ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-white' :
                                                index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-white' :
                                                    index === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-500 text-white' :
                                                        'bg-[var(--glass-border)] text-[var(--text-secondary)]'}
                                        `}>
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-bold truncate text-sm ${isTop3 ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                                                {client.name}
                                            </p>
                                            <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                                                {formatCurrency(client.value)}
                                            </p>
                                        </div>
                                        {isTop3 && <RankIcon className={`w-4 h-4 ${rankColor}`} />}
                                    </div>
                                );
                            })}
                            {topClients.length === 0 && (
                                <p className="text-center text-sm text-[var(--text-muted)] italic">No clients yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ============================================ */}
            {/* DETAIL MODAL */}
            {/* ============================================ */}
            {renderDetailModal()}

            {/* ============================================ */}
            {/* EDIT TARGET MODAL */}
            {/* ============================================ */}
            {isEditingTarget && (
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
                                    className="px-4 py-2 rounded-xl border border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 rounded-xl bg-[#e8c559] text-[#171611] font-bold hover:bg-[#d4b44e]"
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
