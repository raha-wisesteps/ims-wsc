"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    LayoutList,
    LayoutGrid,
    Filter,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useCompanyHolidays } from "@/hooks/useCompanyHolidays";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// --- Types & Config ---

type StatusType = "office" | "remote" | "wfh" | "wfa" | "sick" | "sakit" | "leave" | "cuti" | "izin" | "dinas" | "lembur" | "overtime" | "away" | "pending" | "alpha" | "holiday";

const STATUS_CONFIG: Record<string, { label: string; icon: string; bgClass: string; textClass: string; borderClass: string; dotClass: string }> = {
    office: {
        label: "Office",
        icon: "🏢",
        bgClass: "bg-emerald-500/10",
        textClass: "text-emerald-600 dark:text-emerald-400",
        borderClass: "border-emerald-500/20",
        dotClass: "bg-emerald-500"
    },
    remote: {
        label: "Remote",
        icon: "🌍",
        bgClass: "bg-indigo-500/10",
        textClass: "text-indigo-600 dark:text-indigo-400",
        borderClass: "border-indigo-500/20",
        dotClass: "bg-indigo-500"
    },
    wfh: {
        label: "WFH",
        icon: "🏠",
        bgClass: "bg-[#e8c559]/10",
        textClass: "text-[#b89530] dark:text-[#e8c559]",
        borderClass: "border-[#e8c559]/20",
        dotClass: "bg-[#e8c559]"
    },
    wfa: {
        label: "WFA",
        icon: "🌎",
        bgClass: "bg-purple-500/10",
        textClass: "text-purple-600 dark:text-purple-400",
        borderClass: "border-purple-500/20",
        dotClass: "bg-purple-500"
    },
    sick: {
        label: "Sakit",
        icon: "🏥",
        bgClass: "bg-rose-500/10",
        textClass: "text-rose-600 dark:text-rose-400",
        borderClass: "border-rose-500/20",
        dotClass: "bg-rose-500"
    },
    sakit: {
        label: "Sakit",
        icon: "🏥",
        bgClass: "bg-rose-500/10",
        textClass: "text-rose-600 dark:text-rose-400",
        borderClass: "border-rose-500/20",
        dotClass: "bg-rose-500"
    },
    leave: {
        label: "Cuti",
        icon: "✈️",
        bgClass: "bg-pink-500/10",
        textClass: "text-pink-600 dark:text-pink-400",
        borderClass: "border-pink-500/20",
        dotClass: "bg-pink-500"
    },
    cuti: {
        label: "Cuti",
        icon: "✈️",
        bgClass: "bg-sky-500/10",
        textClass: "text-sky-600 dark:text-sky-400",
        borderClass: "border-sky-500/20",
        dotClass: "bg-sky-500"
    },
    izin: {
        label: "Izin",
        icon: "📋",
        bgClass: "bg-amber-500/10",
        textClass: "text-amber-600 dark:text-amber-400",
        borderClass: "border-amber-500/20",
        dotClass: "bg-amber-500"
    },
    dinas: {
        label: "Dinas",
        icon: "🚗",
        bgClass: "bg-blue-500/10",
        textClass: "text-blue-600 dark:text-blue-400",
        borderClass: "border-blue-500/20",
        dotClass: "bg-blue-500"
    },
    lembur: {
        label: "Lembur",
        icon: "⚡",
        bgClass: "bg-orange-500/10",
        textClass: "text-orange-600 dark:text-orange-400",
        borderClass: "border-orange-500/20",
        dotClass: "bg-orange-500"
    },
    overtime: {
        label: "Lembur",
        icon: "⚡",
        bgClass: "bg-indigo-500/10",
        textClass: "text-indigo-600 dark:text-indigo-400",
        borderClass: "border-indigo-500/20",
        dotClass: "bg-indigo-500"
    },
    away: {
        label: "Away",
        icon: "🌙",
        bgClass: "bg-gray-500/10",
        textClass: "text-gray-600 dark:text-gray-400",
        borderClass: "border-gray-500/20",
        dotClass: "bg-gray-500"
    },
    pending: {
        label: "Pending",
        icon: "⏳",
        bgClass: "bg-gray-500/10",
        textClass: "text-gray-600 dark:text-gray-400",
        borderClass: "border-gray-500/20",
        dotClass: "bg-gray-500"
    },
    alpha: {
        label: "Alpha",
        icon: "❌",
        bgClass: "bg-red-500/10",
        textClass: "text-red-600 dark:text-red-400",
        borderClass: "border-red-500/20",
        dotClass: "bg-red-500"
    },
};




// --- Components ---

const StatusBadge = ({ status }: { status: StatusType | null | undefined }) => {
    if (!status || status === 'office' || status === 'remote') return null; // Hide office and remote status in cells

    const config = STATUS_CONFIG[status];
    if (!config) return null;

    return (
        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${config.bgClass} ${config.textClass} border ${config.borderClass} text-xs md:text-sm shadow-sm scale-90 origin-left`}>
            <span>{config.icon}</span>
            <span className="hidden md:inline font-medium">{config.label}</span>
        </div>
    );
};

export default function WeeklyBoardPage() {
    const supabase = createClient();
    const { holidayMap } = useCompanyHolidays();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

    // Data State
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [requestsMap, setRequestsMap] = useState<Record<string, Record<string, StatusType>>>({});

    // Filtered Employees
    const filteredEmployees = employees.filter((emp) =>
        emp.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Fetch Data
    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Employees
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('id, full_name, role, job_type, employee_type, job_level, is_active, avatar_url')
                .eq('is_active', true)
                .order('full_name');

            if (profileError) throw profileError;

            // 2. Fetch Requests (Leave & Others) for the current VIEW window? 
            // For simplicity, we fetch *all* active requests or a wide range. 
            // Ideally, filter by Range. Let's fetch current month +/- 1 month roughly.

            // Start/End of current view (roughly)
            const startStr = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1).toISOString();
            const endStr = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 1).toISOString();

            // Leaves
            const { data: leaves, error: leaveError } = await supabase
                .from('leave_requests')
                .select('*')
                .or('status.eq.approved,status.eq.pending') // Show approved and pending
                .gte('end_date', startStr) // Overlapping logic simpl
                .lte('start_date', endStr);

            // Other Requests (WFH etc)
            const { data: others, error: otherError } = await supabase
                .from('other_requests')
                .select('*')
                .or('status.eq.approved,status.eq.pending')
                .gte('request_date', startStr)
                .lte('request_date', endStr);

            // 3. Fetch ALL daily_checkins (CEO schedule plans, web check-ins, quick-sets, system auto)
            const viewStartStr = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1).toISOString().split('T')[0];
            const viewEndStr = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 1).toISOString().split('T')[0];
            const { data: checkins } = await supabase
                .from('daily_checkins')
                .select('profile_id, checkin_date, status, source')
                .gte('checkin_date', viewStartStr)
                .lte('checkin_date', viewEndStr);

            // Process Requests into a Lookup Map: { [userId]: { [dateStr]: 'status' } }
            const newMap: Record<string, Record<string, StatusType>> = {};

            // Helper to fill map
            const setStatus = (uid: string, dateStr: string, status: StatusType) => {
                if (!newMap[uid]) newMap[uid] = {};
                // Priority logic: Leave > WFH > Office
                // If already set, maybe overwrite or keep? 
                // Let's assume Leave overwrites others.
                newMap[uid][dateStr] = status;
            };

            // 0. Map ALL daily_checkins first (lowest priority — will be overwritten by leave/other)
            checkins?.forEach((c: any) => {
                const dStr = c.checkin_date; // YYYY-MM-DD
                const status = (c.status as StatusType) || 'office';
                setStatus(c.profile_id, dStr, status);
            });

            // 1. Map Leaves (Range) — skip holidays & weekends
            leaves?.forEach((l: any) => {
                let curr = new Date(l.start_date);
                const end = new Date(l.end_date);
                while (curr <= end) {
                    const dayOfWeek = curr.getDay();
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    const dStr = curr.toISOString().split('T')[0];
                    const isHoliday = !!holidayMap[dStr];

                    // Skip weekends & holidays — cuti should not overlap
                    if (!isWeekend && !isHoliday) {
                        let status: StatusType = 'office';
                        const type = l.leave_type?.toLowerCase() || 'annual';

                        if (type.includes('sakit') || type.includes('sick')) status = 'sick';
                        else if (type.includes('cuti') || type.includes('annual') || type.includes('maternity')) status = 'cuti';
                        else if (type.includes('izin') || type.includes('permission')) status = 'izin';
                        else if (type.includes('dinas') || type.includes('trip')) status = 'dinas';
                        else if (type.includes('wfh')) status = 'wfh';
                        else if (type.includes('wfa')) status = 'wfa';

                        if (l.status === 'pending') status = 'pending';

                        setStatus(l.profile_id, dStr, status);
                    }
                    curr.setDate(curr.getDate() + 1);
                }
            });

            // 2. Map Others (Single Date usually)
            others?.forEach((o: any) => {
                const dStr = o.request_date; // string YYYY-MM-DD
                let status: StatusType = 'office';
                const type = o.request_type?.toLowerCase() || '';

                if (type === 'wfh') status = 'wfh';
                else if (type === 'wfa') status = 'wfa';
                else if (type === 'remote') status = 'remote';
                else if (type === 'overtime' || type === 'lembur') status = 'lembur';
                else if (type === 'dinas' || type === 'business_trip') status = 'dinas';

                if (o.status === 'pending') status = 'pending';

                // Only set if not already 'cuti' or 'sakit' (leaves take precedence)
                const existing = newMap[o.profile_id]?.[dStr];
                if (existing !== 'cuti' && existing !== 'sakit' && existing !== 'izin') {
                    setStatus(o.profile_id, dStr, status);
                }
            });

            setRequestsMap(newMap);

            // Set Employees
            const mapped = (profiles || [])
                .filter((p: any) => {
                    // EXCLUDE HR: Check role string (case-insensitive) or is_hr flag
                    const role = (p.role || '').toLowerCase();
                    const isHR = role.includes('hr') || p.is_hr === true;
                    return !isHR;
                })
                .map((p: any) => ({
                    id: p.id,
                    name: p.full_name,
                    role: p.job_title || p.role,
                    avatar: p.avatar_url,
                    job_type: p.job_type,
                    employee_type: p.employee_type,
                    isOnline: false
                }));
            setEmployees(mapped);

        } catch (e) {
            console.error("Fetch Board Error:", e);
        } finally {
            setLoading(false);
        }
    };

    // Load initial data
    useState(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    });

    // Refresh when changing months significantly? For now just fetch once or on mount.
    // In production, we should refetch when currentDate changes month.

    // --- Navigation Handlers ---

    const handlePrev = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'week') {
            newDate.setDate(currentDate.getDate() - 7);
        } else {
            newDate.setMonth(currentDate.getMonth() - 1);
        }
        setCurrentDate(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'week') {
            newDate.setDate(currentDate.getDate() + 7);
        } else {
            newDate.setMonth(currentDate.getMonth() + 1);
        }
        setCurrentDate(newDate);
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    // --- Date Generation Logic ---

    // Generate days for Weekly View (Current Week)
    const weekDays = useMemo(() => {
        const startOfWeek = new Date(currentDate);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
        startOfWeek.setDate(diff);

        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            return d;
        });
    }, [currentDate]);

    // Generate days for Monthly Calendar View
    const monthDays = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        // Start from Monday of the first week
        const startOffset = (firstDay.getDay() + 6) % 7; // Mon=0
        const calStart = new Date(firstDay);
        calStart.setDate(calStart.getDate() - startOffset);
        // 6 weeks grid
        const days: Date[] = [];
        for (let i = 0; i < 42; i++) {
            const d = new Date(calStart);
            d.setDate(calStart.getDate() + i);
            days.push(d);
        }
        return { days, month, year };
    }, [currentDate]);

    const formatDateRange = () => {
        if (viewMode === 'month') {
            return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        }
        const start = weekDays[0];
        const end = weekDays[6]; // Sunday
        return `${start.getDate()} ${start.toLocaleString('default', { month: 'short' })} - ${end.getDate()} ${end.toLocaleString('default', { month: 'short' })} ${end.getFullYear()}`;
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    // Helper to get holiday name from map
    const getHolidayForDate = (d: Date): string | null => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return holidayMap[`${y}-${m}-${dd}`] || null;
    };

    // REAL STATUS GETTER
    const getRealStatus = (emp: any, date: Date): StatusType | null => {
        const dStr = date.toISOString().split('T')[0];
        const holiday = getHolidayForDate(date);
        const day = date.getDay();
        const isWeekend = day === 0 || day === 6;

        // 1. Holidays & weekends always take priority — hide all perizinan on tanggal merah
        if (isWeekend || holiday) return null;

        // 2. Check Requests Map
        if (requestsMap[emp.id] && requestsMap[emp.id][dStr]) {
            return requestsMap[emp.id][dStr];
        }

        // 3. Fallback to default status based on employee type
        if (emp.employee_type && emp.employee_type.toLowerCase() === 'remote_employee') {
            return 'remote';
        }

        return 'office'; // Default to Office
    };

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] space-y-4">
            {/* --- Header & Controls --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                        <CalendarIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-muted-foreground">
                            <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
                            <ChevronRight className="h-4 w-4" />
                            <span>Team Schedule</span>
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-foreground">Team Schedule</h1>
                        <p className="text-sm text-muted-foreground">Monitor team schedules and availability to coordinate with colleagues.</p>
                    </div>
                </div>
            </div>

            {/* --- Filters & Search Row --- */}
            <div className="flex flex-col md:flex-row justify-between gap-4">
                {/* Date Navigator */}
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="glass-panel p-1 rounded-xl border border-white/10 flex items-center gap-2 w-fit">
                        <button onClick={handlePrev} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="px-4 font-bold min-w-[200px] text-center">
                            {formatDateRange()}
                        </div>
                        <button onClick={handleNext} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                        <Button onClick={handleToday} variant="secondary" size="sm" className="ml-2">
                            Today
                        </Button>
                    </div>
                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-1 p-1 rounded-lg border bg-muted/30">
                        <button
                            onClick={() => setViewMode('week')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                viewMode === 'week' ? 'bg-background text-foreground shadow-sm border' : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <LayoutList className="w-3.5 h-3.5" />
                            Mingguan
                        </button>
                        <button
                            onClick={() => setViewMode('month')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                viewMode === 'month' ? 'bg-background text-foreground shadow-sm border' : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            Bulanan
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative w-full md:w-64">
                    <input
                        type="text"
                        placeholder="Search team member..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-10 pl-4 pr-10 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm"
                    />
                    <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
            </div>

            {/* --- MAIN CONTENT AREA --- */}
            {viewMode === 'week' ? (
            <Card className="flex-1 overflow-hidden flex flex-col shadow-sm border-border/50">
                <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-auto relative">
                        <Table>
                            <TableHeader className="sticky top-0 z-20 bg-background shadow-sm">
                                <TableRow>
                                    <TableHead className="min-w-[200px] w-[250px] sticky left-0 z-30 bg-background border-r">
                                        <div className="px-2">Employee Name</div>
                                    </TableHead>
                                    {weekDays.map((day, i) => {
                                        const holiday = getHolidayForDate(day);
                                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                        return (
                                            <TableHead key={i} className={`text-center min-w-[140px] ${isToday(day) ? "bg-muted/50" : ""} ${isWeekend || holiday ? "bg-muted/20" : ""}`}>
                                                <div className="flex flex-col items-center justify-center h-full py-3 space-y-1">
                                                    <span className={`text-xs font-semibold uppercase tracking-wider ${isToday(day) ? "text-primary" : "text-muted-foreground"}`}>
                                                        {day.toLocaleDateString('en-US', { weekday: 'short' })}
                                                    </span>
                                                    <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold shadow-sm border ${isToday(day) ? "bg-primary text-primary-foreground border-primary" : (isWeekend || holiday ? "bg-background text-red-500 border-red-200" : "bg-background border-border")}`}>
                                                        {day.getDate()}
                                                    </div>
                                                    {holiday && (
                                                        <span className="text-[10px] text-red-500 font-medium leading-tight max-w-[120px] line-clamp-2 px-2" title={holiday}>
                                                            {holiday}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableHead>
                                        )
                                    })}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredEmployees.map((emp) => (
                                    <TableRow key={emp.id} className="hover:bg-muted/5">
                                        <TableCell className="font-medium sticky left-0 z-10 bg-background border-r group p-0">
                                            <div className="flex items-center gap-3 p-4 h-full w-full hover:bg-muted/5 transition-colors">
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs bg-muted border overflow-hidden`}>
                                                    {emp.avatar ? (
                                                        <img src={emp.avatar} alt={emp.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        emp.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-sm">{emp.name}</span>
                                                    <span className="text-xs text-muted-foreground">{emp.role}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        {(() => {
                                            const cells = [];
                                            let i = 0;
                                            while (i < weekDays.length) {
                                                const day = weekDays[i];
                                                const holiday = getHolidayForDate(day);
                                                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                                const status = getRealStatus(emp, day);
                                                const isSpecial = status && status !== 'office' && status !== 'remote' && status !== 'pending';

                                                let span = 1;

                                                // Calculate span — break at holidays/weekends
                                                if (isSpecial && !isWeekend && !holiday) {
                                                    for (let j = i + 1; j < weekDays.length; j++) {
                                                        const nextDay = weekDays[j];
                                                        const nextHoliday = getHolidayForDate(nextDay);
                                                        const nextWeekend = nextDay.getDay() === 0 || nextDay.getDay() === 6;
                                                        if (nextHoliday || nextWeekend) break; // Stop at holiday/weekend
                                                        const nextStatus = getRealStatus(emp, nextDay);
                                                        if (nextStatus === status) {
                                                            span++;
                                                        } else {
                                                            break;
                                                        }
                                                    }
                                                }

                                                const config = status ? STATUS_CONFIG[status] : null;

                                                if (isSpecial && config && span > 1 && !isWeekend && !holiday) {
                                                    cells.push(
                                                        <TableCell key={i} colSpan={span} className="p-1 align-middle h-[60px] border-r last:border-0 relative">
                                                            <div
                                                                className={`
                                                                    absolute inset-y-2 inset-x-1 rounded-md border flex items-center justify-center gap-2 shadow-sm
                                                                    ${config.bgClass} ${config.textClass} ${config.borderClass}
                                                                `}
                                                            >
                                                                <span className="text-lg">{config.icon}</span>
                                                                <span className="font-semibold text-sm truncate">{config.label} ({span} hari)</span>
                                                            </div>
                                                        </TableCell>
                                                    );
                                                } else {
                                                    cells.push(
                                                        <TableCell key={i} className={`text-center p-2 h-[60px] border-r last:border-0 align-middle ${isToday(day) ? "bg-muted/30" : ""} ${isWeekend || holiday ? "bg-muted/10" : ""}`}>
                                                            <div className="flex justify-center min-h-[24px]">
                                                                <StatusBadge status={status} />
                                                            </div>
                                                        </TableCell>
                                                    );
                                                }

                                                i += span;
                                            }
                                            return cells;
                                        })()}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
            ) : (
            /* --- MONTHLY CALENDAR VIEW --- */
            <Card className="flex-1 overflow-hidden flex flex-col shadow-sm border-border/50">
                <CardContent className="p-4 flex-1 overflow-auto">
                    {/* Calendar Header */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((d) => (
                            <div key={d} className="text-center text-xs font-bold uppercase tracking-wider text-muted-foreground py-2">
                                {d}
                            </div>
                        ))}
                    </div>
                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {monthDays.days.map((day, idx) => {
                            const isCurrentMonth = day.getMonth() === monthDays.month;
                            const holiday = getHolidayForDate(day);
                            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                            const today = isToday(day);
                            const dStr = day.toISOString().split('T')[0];

                            // Collect statuses for all employees on this day
                            const dayStatuses: { status: StatusType; count: number }[] = [];
                            const statusCounts: Record<string, number> = {};
                            filteredEmployees.forEach((emp) => {
                                const st = getRealStatus(emp, day);
                                if (st && st !== 'office' && st !== 'remote') {
                                    statusCounts[st] = (statusCounts[st] || 0) + 1;
                                }
                            });
                            Object.entries(statusCounts).forEach(([s, c]) => {
                                dayStatuses.push({ status: s as StatusType, count: c });
                            });
                            dayStatuses.sort((a, b) => b.count - a.count);

                            return (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedDate(day)}
                                    className={`
                                        relative flex flex-col items-center rounded-lg p-1.5 min-h-[80px] text-left transition-all border
                                        hover:bg-muted/40 hover:border-primary/30 cursor-pointer
                                        ${!isCurrentMonth ? 'opacity-30' : ''}
                                        ${today ? 'bg-primary/5 border-primary/40 ring-1 ring-primary/20' : 'border-border/30'}
                                        ${(isWeekend || holiday) && isCurrentMonth ? 'bg-red-500/5 border-red-200/30' : ''}
                                    `}
                                >
                                    {/* Date Number */}
                                    <div className={`text-sm font-bold w-full text-center ${
                                        today ? 'text-primary' :
                                        (isWeekend || holiday) ? 'text-red-500' :
                                        'text-foreground'
                                    }`}>
                                        {day.getDate()}
                                    </div>

                                    {/* Holiday Label */}
                                    {holiday && isCurrentMonth && (
                                        <div className="text-[9px] text-red-500 font-medium leading-tight text-center line-clamp-1 w-full mt-0.5" title={holiday}>
                                            {holiday}
                                        </div>
                                    )}

                                    {/* Status Dots */}
                                    {isCurrentMonth && dayStatuses.length > 0 && (
                                        <div className="flex flex-wrap gap-0.5 justify-center mt-auto pt-1">
                                            {dayStatuses.slice(0, 4).map(({ status, count }) => {
                                                const cfg = STATUS_CONFIG[status];
                                                if (!cfg) return null;
                                                return (
                                                    <div
                                                        key={status}
                                                        className={`flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium ${cfg.bgClass} ${cfg.textClass} border ${cfg.borderClass}`}
                                                        title={`${cfg.label}: ${count} orang`}
                                                    >
                                                        <span>{cfg.icon}</span>
                                                        <span>{count}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
            )}

            {/* Day Detail Modal */}
            {selectedDate && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedDate(null)}>
                    <Card className="w-full max-w-lg shadow-lg animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                </CardTitle>
                                {(() => {
                                    const selHoliday = getHolidayForDate(selectedDate);
                                    return selHoliday ? (
                                        <p className="text-sm text-red-500 font-medium mt-1">{selHoliday}</p>
                                    ) : null;
                                })()}
                                <CardDescription className="mt-1">Daily Attendance Summary</CardDescription>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedDate(null)}>
                                <span className="text-lg">×</span>
                            </Button>
                        </CardHeader>

                        <CardContent className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                            {(() => {
                                const dayStatuses = filteredEmployees.map(e => ({
                                    ...e,
                                    status: getRealStatus(e, selectedDate)
                                }));

                                // Dynamically group by ALL actual status types
                                const displayOrder: { key: StatusType; title: string }[] = [
                                    { key: 'lembur', title: 'Lembur (Overtime)' },
                                    { key: 'cuti', title: 'Cuti (Leave)' },
                                    { key: 'sakit', title: 'Sakit (Sick)' },
                                    { key: 'izin', title: 'Izin (Permission)' },
                                    { key: 'dinas', title: 'Dinas Luar (Business Trip)' },
                                    { key: 'wfh', title: 'Work From Home' },
                                    { key: 'wfa', title: 'Work From Anywhere' },
                                    { key: 'remote', title: 'Remote' },
                                    { key: 'pending', title: 'Pending Approval' },
                                    { key: 'office', title: 'Di Kantor (In Office)' },
                                ];

                                const groups = displayOrder
                                    .map(({ key, title }) => ({
                                        key,
                                        title,
                                        items: dayStatuses.filter(s => s.status === key),
                                    }))
                                    .filter(g => g.items.length > 0);

                                const totalWithStatus = groups.reduce((sum, g) => sum + g.items.length, 0);

                                // Also count employees with null status (no record)
                                const noRecord = dayStatuses.filter(s => s.status === null);

                                return (
                                    <>
                                        {groups.map(({ key, title, items }) => (
                                            <StatusGroup key={key} title={title} items={items} type={key} />
                                        ))}

                                        {noRecord.length > 0 && (
                                            <div>
                                                <div className="flex items-center gap-2 mb-3 text-muted-foreground">
                                                    <span className="text-lg">—</span>
                                                    <h3 className="font-bold text-sm uppercase tracking-wider">Libur / Tidak Ada Data ({noRecord.length})</h3>
                                                </div>
                                                <div className="space-y-2 ml-7">
                                                    {noRecord.map((emp) => (
                                                        <div key={emp.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold overflow-hidden">
                                                                {emp.avatar ? (
                                                                    <img src={emp.avatar} alt={emp.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    emp.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)
                                                                )}
                                                            </div>
                                                            <span>{emp.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {totalWithStatus === 0 && noRecord.length === 0 && (
                                            <p className="text-center text-muted-foreground py-4">Tidak ada data absensi untuk tanggal ini.</p>
                                        )}
                                    </>
                                );
                            })()}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

// Helper Component for Modal
const StatusGroup = ({ title, items, type }: { title: string, items: any[], type: StatusType }) => {
    // Determine color based on status type
    const config = STATUS_CONFIG[type] || STATUS_CONFIG['office']; // Fallback

    return (
        <div>
            <div className={`flex items-center gap-2 mb-3 ${config.textClass}`}>
                <span className="text-lg">{config.icon}</span>
                <h3 className="font-bold text-sm uppercase tracking-wider">{title} ({items.length})</h3>
            </div>
            <div className="grid gap-2">
                {items.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/40">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-background border flex items-center justify-center font-bold text-xs uppercase">
                                {user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                                <p className="text-sm font-medium">{user.name}</p>
                                <p className="text-xs text-muted-foreground">{user.role}</p>
                            </div>
                        </div>
                        {/* Status Badge in Modal */}
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${config.bgClass} ${config.textClass} border ${config.borderClass} text-xs md:text-sm shadow-sm`}>
                            <span>{config.icon}</span>
                            <span className="font-medium">{config.label}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
