"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    LayoutList,
    Filter,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

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

const HOLIDAYS_2026: Record<string, string> = {
    "2026-01-16": "Isra Mikraj Nabi Muhammad S.A.W.",
    "2026-02-17": "Tahun Baru Imlek 2577 Kongzili",
    "2026-03-19": "Hari Suci Nyepi (Tahun Baru Saka 1948)",
    "2026-03-21": "Idul Fitri 1447 Hijriah",
    "2026-03-22": "Idul Fitri 1447 Hijriah",
    "2026-04-03": "Wafat Yesus Kristus",
    "2026-04-05": "Kebangkitan (Paskah) Yesus Kristus",
    "2026-05-01": "Hari Buruh Internasional",
    "2026-05-14": "Kenaikan Yesus Kristus",
    "2026-05-27": "Idul Adha 1447 Hijriah",
    "2026-05-31": "Hari Raya Waisak 2570 BE",
    "2026-06-01": "Hari Lahir Pancasila",
    "2026-06-16": "1 Muharam Tahun Baru Islam 1448 H",
    "2026-08-17": "Proklamasi Kemerdekaan",
    "2026-08-25": "Maulid Nabi Muhammad S.A.W.",
    "2026-12-25": "Kelahiran Yesus Kristus"
};

interface Employee {
    id: string;
    name: string;
    role: string;
    isOnline: boolean;
}

const mockEmployees: Employee[] = [
    { id: "1", name: "Rega Aditia", role: "Senior Analyst", isOnline: true },
    { id: "2", name: "Raha Pratama", role: "BisDev Lead", isOnline: true },
    { id: "3", name: "Mila Kartika", role: "HR Specialist", isOnline: false },
    { id: "4", name: "Rifqi Fauzan", role: "Sales Executive", isOnline: true },
    { id: "5", name: "Dwi Santoso", role: "Junior Analyst", isOnline: false },
    { id: "6", name: "Shafa Anindya", role: "UI/UX Designer", isOnline: true },
    { id: "7", name: "Sofyan", role: "Research Associate", isOnline: false },
    { id: "8", name: "Pak Ale", role: "CEO", isOnline: true },
];

const getHolidayName = (date: Date): string | null => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return HOLIDAYS_2026[`${y}-${m}-${d}`] || null;
};

// Helper to reliably get mock status for any date
const getMockStatus = (empId: string, date: Date): StatusType | null => {
    // SIMULATION: Block Leave for Mila Kartika (ID: 3) for 4 days
    // Week of Jan 12-18, 2026. Let's block Jan 13, 14, 15, 16 (Tue-Fri)
    if (empId === '3') {
        const year = date.getFullYear();
        const month = date.getMonth(); // 0-indexed
        const d = date.getDate();

        // Exact dates: Jan 13, 14, 15, 16 2026
        if (year === 2026 && month === 0 && (d >= 13 && d <= 16)) {
            return "leave";
        }
    }

    const holiday = getHolidayName(date);
    const day = date.getDay();
    const isWeekend = day === 0 || day === 6;

    // Deterministic random based on ID + Date
    const seed = empId.charCodeAt(0) + date.getDate() + date.getMonth();

    // Specific logic: 
    // 1. Weekends & Holidays -> Default Empty, unless Overtime
    if (isWeekend || holiday) {
        // 10% chance of overtime on weekends/holidays
        if (seed % 20 === 0) return "overtime";
        return null; // Empty means "Off" / "Holiday" / "Weekend"
    }

    // 2. Weekdays -> Default Office, with exceptions
    if (seed % 15 === 0) return "sick";
    if (seed % 12 === 0) return "leave";
    if (seed % 8 === 0) return "wfh";

    return "office";
};

// --- Components ---

const StatusBadge = ({ status }: { status: StatusType | null | undefined }) => {
    if (!status || status === 'office') return null; // Hide office status in cells

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
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

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
                .select('id, full_name, role, job_type, job_level, is_active, avatar_url')
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

            // 1. Map Leaves (Range)
            leaves?.forEach((l: any) => {
                let curr = new Date(l.start_date);
                const end = new Date(l.end_date);
                while (curr <= end) {
                    const dStr = curr.toISOString().split('T')[0];
                    // Map leave_type to StatusType
                    let status: StatusType = 'office'; // Default fallback temp
                    const type = l.leave_type?.toLowerCase() || 'annual';

                    if (type.includes('sakit') || type.includes('sick')) status = 'sick';
                    else if (type.includes('cuti') || type.includes('annual') || type.includes('maternity')) status = 'cuti';
                    else if (type.includes('izin') || type.includes('permission')) status = 'izin';
                    else if (type.includes('dinas') || type.includes('trip')) status = 'dinas';
                    else if (type.includes('wfh')) status = 'wfh';
                    else if (type.includes('wfa')) status = 'wfa';

                    if (l.status === 'pending') status = 'pending';

                    setStatus(l.profile_id, dStr, status);
                    curr.setDate(curr.getDate() + 1);
                }
            });

            // 2. Map Others (Single Date usually)
            others?.forEach((o: any) => {
                const dStr = o.request_date; // string YYYY-MM-DD
                let status: StatusType = 'office';
                const type = o.request_type?.toLowerCase() || '';

                if (type === 'wfh') status = 'wfh';
                if (type === 'wfa') status = 'wfa';
                if (type === 'overtime' || type === 'lembur') status = 'overtime';
                if (type === 'dinas' || type === 'business_trip') status = 'dinas';

                if (o.status === 'pending') status = 'pending';

                // Only set if not already 'leave' or 'sick' (leaves take precedence)
                const existing = newMap[o.profile_id]?.[dStr];
                if (existing !== 'leave' && existing !== 'sick') {
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
        newDate.setDate(currentDate.getDate() - 7);
        setCurrentDate(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + 7);
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

    const formatDateRange = () => {
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

    // REAL STATUS GETTER
    const getRealStatus = (empId: string, date: Date): StatusType | null => {
        const dStr = date.toISOString().split('T')[0];
        const holiday = getHolidayName(date);
        const day = date.getDay();
        const isWeekend = day === 0 || day === 6;

        // 1. Check Requests Map
        if (requestsMap[empId] && requestsMap[empId][dStr]) {
            return requestsMap[empId][dStr];
        }

        // 2. Fallbacks
        if (isWeekend || holiday) return null; // Off

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
                                        const holiday = getHolidayName(day);
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
                                                const status = getRealStatus(emp.id, day);
                                                const isSpecial = status && status !== 'office' && status !== 'pending'; // Statuses to merge

                                                let span = 1;

                                                // Calculate span if it's a special status
                                                if (isSpecial) {
                                                    for (let j = i + 1; j < weekDays.length; j++) {
                                                        const nextDay = weekDays[j];
                                                        const nextStatus = getRealStatus(emp.id, nextDay);
                                                        if (nextStatus === status) {
                                                            span++;
                                                        } else {
                                                            break;
                                                        }
                                                    }
                                                }

                                                // Render Cell
                                                const holiday = getHolidayName(day);
                                                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                                const config = status ? STATUS_CONFIG[status] : null;

                                                if (isSpecial && config && span > 1) {
                                                    // MERGED BLOCK RENDER
                                                    cells.push(
                                                        <TableCell key={i} colSpan={span} className="p-1 align-middle h-[60px] border-r last:border-0 relative">
                                                            <div
                                                                className={`
                                                                    absolute inset-y-2 inset-x-1 rounded-md border flex items-center justify-center gap-2 shadow-sm
                                                                    ${config.bgClass} ${config.textClass} ${config.borderClass}
                                                                `}
                                                            >
                                                                <span className="text-lg">{config.icon}</span>
                                                                <span className="font-semibold text-sm truncate">{config.label} ({span} days)</span>
                                                            </div>
                                                        </TableCell>
                                                    );
                                                } else {
                                                    // SINGLE CELL RENDER (Normal)
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

            {/* Day Detail Modal */}
            {selectedDate && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedDate(null)}>
                    <Card className="w-full max-w-lg shadow-lg animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                </CardTitle>
                                {getHolidayName(selectedDate) && (
                                    <p className="text-sm text-red-500 font-medium mt-1">{getHolidayName(selectedDate)}</p>
                                )}
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
                                    status: getRealStatus(e.id, selectedDate)
                                }));

                                const overtime = dayStatuses.filter(s => s.status === 'overtime');
                                const leaves = dayStatuses.filter(s => s.status === 'leave');
                                const sicks = dayStatuses.filter(s => s.status === 'sick');
                                const wfhs = dayStatuses.filter(s => s.status === 'wfh');
                                const office = dayStatuses.filter(s => s.status === 'office');

                                const hasAnyData = overtime.length + leaves.length + sicks.length + wfhs.length + office.length > 0;

                                return (
                                    <>
                                        {overtime.length > 0 && <StatusGroup title="Lembur (Overtime)" items={overtime} type="lembur" />}
                                        {leaves.length > 0 && <StatusGroup title="On Leave" items={leaves} type="cuti" />}
                                        {sicks.length > 0 && <StatusGroup title="Sick" items={sicks} type="sakit" />}
                                        {wfhs.length > 0 && <StatusGroup title="Working From Home" items={wfhs} type="wfh" />}

                                        {/* Show Office in detail view as strictly informational at the bottom */}
                                        {office.length > 0 && <StatusGroup title="In Office" items={office} type="office" />}

                                        {!hasAnyData && (
                                            <p className="text-center text-muted-foreground py-4">No specific attendance records for this date.</p>
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
