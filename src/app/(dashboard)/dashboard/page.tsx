"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
    Sun, CloudSun, Sunset, Moon,
    Rocket, Star, Diamond, Heart, Users, Lightbulb, Zap, Gift, Target, CalendarDays, GlassWater, Smile,
    Building2, Home, Plane, Building, Stethoscope, FileText, Clock, MapPin,
    Calendar, Briefcase, ChevronRight, ChevronLeft, Plus, Bell, Megaphone, Trash2, Pencil, Check, X,
    CloudRain, CloudDrizzle, CloudLightning, Snowflake, Cloud,
    ArrowRight, BookOpen, Globe, Umbrella, ClipboardList, LucideIcon, MessageSquare, GripVertical
} from "lucide-react";
import { Reorder } from "framer-motion";
import StatusEditor from "./_components/StatusEditor";
import TaskEditor from "./_components/TaskEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { announcementService } from "@/services/announcement";
import { Announcement } from "@/types/announcement";

// ============================================
// DYNAMIC GREETING & MOTIVATIONAL MESSAGES
// ============================================

const getGreetingByTime = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { text: "Good Morning", emoji: "☀️", period: "morning" };
    if (hour >= 12 && hour < 17) return { text: "Good Afternoon", emoji: "🌤️", period: "afternoon" };
    if (hour >= 17 && hour < 21) return { text: "Good Evening", emoji: "🌅", period: "evening" };
    return { text: "Good Night", emoji: "🌙", period: "night" };
};

// Motivational messages - changes daily based on date
const motivationalMessages = [
    { message: "Setiap langkah kecil hari ini adalah kemajuan besar untuk masa depan. Keep going! 💪", emoji: "🚀" },
    { message: "Hari ini adalah kesempatan baru untuk membuat perbedaan. You got this! ✨", emoji: "🌟" },
    { message: "Kerja keras hari ini adalah investasi untuk kesuksesan esok. Stay focused! 🎯", emoji: "💎" },
    { message: "Jangan lupa istirahat sejenak, kesehatan adalah aset terpenting! Take care! 💚", emoji: "🌿" },
    { message: "Kolaborasi tim yang solid adalah kunci keberhasilan. Together we achieve more! 🤝", emoji: "👥" },
    { message: "Tantangan hari ini adalah pelajaran untuk hari esok. Embrace it! 📚", emoji: "💡" },
    { message: "Produktivitas bukan tentang bekerja keras, tapi bekerja cerdas. Work smart! 🧠", emoji: "⚡" },
    { message: "Apresiasi kecil bisa memberikan dampak besar. Spread positivity! 🌈", emoji: "💝" },
    { message: "Fokus pada progress, bukan perfection. Every step counts! 👣", emoji: "🎯" },
    { message: "Hari Senin adalah awal yang segar untuk minggu produktif! Let's go! 🔥", emoji: "📅" },
    { message: "Sudah minum air putih hari ini? Stay hydrated, stay sharp! 💧", emoji: "🥤" },
    { message: "Senyum dan sapaan hangat bisa mencerahkan hari rekan kerja. Be kind! 😊", emoji: "✨" },
];

// Get motivational message based on day of year (consistent per day)
const getDailyMotivationalMessage = () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - startOfYear.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    return motivationalMessages[dayOfYear % motivationalMessages.length];
};

// ============================================
// DATA INTERFACES
// ============================================

export interface BirthdayPerson {
    full_name: string;
    avatar_url: string | null;
    birth_date: string;
    daysUntil: number; // 0 for today
}

export interface Task {
    id: number | string; // Allow UUID
    text: string;
    project: string;
    priority: "high" | "medium" | "low";
    completed: boolean;
    position?: number;
}

export interface TeamMember {
    id: string;
    name: string;
    role: string;
    avatar: string; // initial
    avatarUrl?: string | null; // real image
    status: string; // 'wfh', 'wfa', 'on_site', 'sick', 'leave', 'offline'
    personalNote: string;
    tasks?: { name: string; priority: string }[];
    job_type?: string;
}

// Helper to calculate days until birthday
const getDaysUntilBirthday = (birthDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const birthDate = new Date(birthDateStr);
    const currentYear = today.getFullYear();

    // Create birth date object for this year
    const nextBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());

    // If birthday has passed this year, look at next year
    if (nextBirthday < today) {
        nextBirthday.setFullYear(currentYear + 1);
    }

    const diffTime = nextBirthday.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

// ============================================
// LEAVE QUOTA & CALCULATIONS
// ============================================

// Calculate days until WFA expires (March 1st)
const calculateWfaExpiryDays = () => {
    const today = new Date();
    let expiryYear = today.getFullYear();

    // If we're past March 1st, expiry is next year
    const march1ThisYear = new Date(today.getFullYear(), 2, 1); // Month is 0-indexed
    if (today >= march1ThisYear) {
        expiryYear = today.getFullYear() + 1;
    }

    const expiryDate = new Date(expiryYear, 2, 1);
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return { expiryDate, daysRemaining: diffDays };
};


// Types - Clock-in is only for: WFH/WFA attendance, or H/H-1 sick/leave permissions
type AttendanceStatus = "office" | "remote" | "wfh" | "wfa" | "sick" | "leave" | "field" | "cuti" | "izin" | "sakit" | "dinas" | "lembur" | "away";
type TaskPriority = "high" | "medium" | "low";

// Task Interface is defined above


// Status config - WHITE color for ALL modes since hero section has dark background
// Clock-in is only for: WFH/WFA attendance, or H/H-1 sick/leave permissions
const STATUS_CONFIG: Record<string, { label: string; bgClass: string; textClass: string; description: string }> = {
    office: { label: "Office", bgClass: "bg-emerald-500/20", textClass: "text-white", description: "Bekerja di kantor" },
    remote: { label: "Remote", bgClass: "bg-indigo-500/20", textClass: "text-white", description: "Bekerja remote (Full Remote)" },
    wfh: { label: "WFH", bgClass: "bg-purple-500/20", textClass: "text-white", description: "Absensi WFH - kerja dari rumah" },
    wfa: { label: "WFA", bgClass: "bg-sky-500/20", textClass: "text-white", description: "Absensi WFA - kerja dari lokasi lain" },
    sick: { label: "Sakit", bgClass: "bg-rose-500/20", textClass: "text-white", description: "Perizinan sakit (H/H-1)" },
    sakit: { label: "Sakit", bgClass: "bg-rose-500/20", textClass: "text-white", description: "Sedang sakit" },
    leave: { label: "Izin", bgClass: "bg-amber-500/20", textClass: "text-white", description: "Perizinan izin (H/H-1)" },
    izin: { label: "Izin", bgClass: "bg-amber-500/20", textClass: "text-white", description: "Izin tidak masuk kerja" },
    dinas: { label: "Dinas Luar", bgClass: "bg-blue-500/20", textClass: "text-white", description: "Bekerja di lapangan/client" },
    cuti: { label: "Cuti", bgClass: "bg-pink-500/20", textClass: "text-white", description: "Cuti tahunan/besar" },
    field: { label: "Dinas Luar", bgClass: "bg-blue-500/20", textClass: "text-white", description: "Bekerja di lapangan/client" },
    lembur: { label: "Lembur", bgClass: "bg-orange-500/20", textClass: "text-white", description: "Sedang lembur" },
    away: { label: "Away", bgClass: "bg-gray-500/20", textClass: "text-white", description: "Diluar jam kerja" },
};

// Team Activity Config - Using Lucide icons instead of emoji for cleaner UI
const statusOptions: { id: string; label: string; Icon: LucideIcon; color: string; gradient: string }[] = [
    { id: "office", label: "OFFICE", Icon: Building2, color: "bg-emerald-500", gradient: "from-emerald-400 to-emerald-600" },
    { id: "remote", label: "REMOTE", Icon: Globe, color: "bg-indigo-500", gradient: "from-indigo-400 to-indigo-600" },
    { id: "wfh", label: "WFH", Icon: Home, color: "bg-purple-500", gradient: "from-purple-400 to-purple-600" },
    { id: "wfa", label: "WFA", Icon: MapPin, color: "bg-sky-500", gradient: "from-sky-400 to-sky-600" }, // Changed Icon to MapPin for WFA
    { id: "cuti", label: "CUTI", Icon: Umbrella, color: "bg-amber-500", gradient: "from-amber-400 to-amber-600" },
    { id: "izin", label: "IZIN", Icon: ClipboardList, color: "bg-rose-500", gradient: "from-rose-400 to-rose-600" },
    { id: "dinas", label: "DINAS", Icon: Briefcase, color: "bg-blue-500", gradient: "from-blue-400 to-blue-600" },
    { id: "lembur", label: "LEMBUR", Icon: Clock, color: "bg-orange-500", gradient: "from-orange-400 to-orange-600" },
    { id: "sakit", label: "SAKIT", Icon: Stethoscope, color: "bg-pink-500", gradient: "from-pink-400 to-pink-600" },
    { id: "away", label: "AWAY", Icon: Moon, color: "bg-gray-500", gradient: "from-gray-400 to-gray-600" },
];


const taskPriorityColors = {
    high: "bg-pink-500/20 text-pink-600 dark:text-pink-400 border border-pink-500/30",
    medium: "bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30",
    low: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
};

// Workload weighting config
const WORKLOAD_CONFIG = {
    maxCapacity: {
        "Intern": 8,
        "Analyst L1": 10,
        "Analyst L2": 10,
        "Senior Analyst": 12, // Analyst L3+
        "Consultant": 12,
    } as Record<string, number>,
    typeLabels: {
        project: { label: "Project", weight: 4 },
        proposal: { label: "Proposal", weight: 2 },
        presentation: { label: "Presentation", weight: 2 },
        support: { label: "Support", weight: 2 },
        etc: { label: "Etc", weight: 1 },
    },
};

// Initial check-in state - will be converted to useState in component
const initialCheckinState = {
    isClockedIn: false,
    isClockedOut: false,
    status: null as AttendanceStatus | null,
    clockInTime: null as string | null,
    clockOutTime: null as string | null,
    isLate: false,
    hasApprovedRequest: false,
    approvedRequestType: null as AttendanceStatus | null,
    isForceMajeure: false,
};

// Dynamic feedback messages based on context
const FEEDBACK_MESSAGES = {
    office_ontime: [
        { message: "Mantap! Kamu datang tepat waktu hari ini! 🎯", emoji: "🏢" },
        { message: "Good job! Semangat kerja hari ini! 💪", emoji: "✨" },
        { message: "Pagi yang produktif dimulai dari tepat waktu! ☀️", emoji: "🌟" },
    ],
    office_late: [
        { message: "Oops, telat ya hari ini. Yuk besok lebih pagi! 😅", emoji: "⚠️" },
        { message: "Tidak apa-apa, yang penting sekarang sudah hadir! 💪", emoji: "👍" },
        { message: "Semoga macetnya tidak terlalu menyebalkan 🚗", emoji: "🚓" },
    ],
    wfh_ontime: [
        { message: "Nice! WFH tapi tetap on-time, mantap! 🏠✨", emoji: "🏠" },
        { message: "Sudah siap kerja dari rumah! Jangan lupa bisa dihubungi ya! 📱", emoji: "💻" },
        { message: "WFH mode ON! Pastikan tetap produktif ya! 🎯", emoji: "💡" },
    ],
    wfh_late: [
        { message: "Hayo ngaku, tadi snooze alarm berapa kali? 😴💤", emoji: "⏰" },
        { message: "Jangan tidur lagi ya! Kasurnya menggoda memang 🛏️", emoji: "😄" },
        { message: "Oke sudah clock in, sekarang jangan hibernasi lagi 😄", emoji: "☕" },
    ],
    sick_preapproved: [
        { message: "Eh, ngapain buka ini? 😅 Tenang, ga perlu absen kok. Istirahatlah! Get well soon! 💚🩹", emoji: "🏥" },
    ],
    sick_forcemajeure: [
        { message: "Waduh, sakit ya? 😢 Semoga lekas pulih! Get well soon! 💪🩹", emoji: "🏥" },
    ],
    leave_preapproved: [
        { message: "Kamu lagi izin/cuti loh! 🏖️ Ga perlu absen, santai aja. Semoga urusannya cepat selesai! 🙌", emoji: "📅" },
    ],
    leave_forcemajeure: [
        { message: "Izin mendadak ya? Tidak apa-apa! 🙏 Semoga urusannya cepat selesai. Take care!", emoji: "📅" },
    ],
    field: [
        { message: "Semangat di lapangan! 💼🚗 Hati-hati di jalan dan sukses dengan tugasnya ya!", emoji: "🚗" },
    ],
    clockout: [
        { message: "Kerja keras hari ini! Selamat istirahat dan sampai jumpa besok! 👋", emoji: "🌙" },
        { message: "Great work today! Jangan lupa istirahat yang cukup ya! 💚", emoji: "🌟" },
    ],
};

// Get random feedback message based on context
const getFeedbackMessage = (status: AttendanceStatus, isLate: boolean, isForceMajeure: boolean, isClockedOut: boolean = false) => {
    if (isClockedOut) {
        const pool = FEEDBACK_MESSAGES.clockout;
        return pool[Math.floor(Math.random() * pool.length)];
    }

    let key: keyof typeof FEEDBACK_MESSAGES;
    switch (status) {
        case 'office':
            key = isLate ? 'office_late' : 'office_ontime';
            break;
        case 'wfh':
        case 'wfa':
            key = isLate ? 'wfh_late' : 'wfh_ontime';
            break;
        case 'sick':
        case 'sakit':
            key = isForceMajeure ? 'sick_forcemajeure' : 'sick_preapproved';
            break;
        case 'leave':
            key = isForceMajeure ? 'leave_forcemajeure' : 'leave_preapproved';
            break;
        case 'field':
            key = 'field';
            break;
        default:
            key = 'office_ontime';
    }
    const pool = FEEDBACK_MESSAGES[key];
    return pool[Math.floor(Math.random() * pool.length)];
};



const LoadingDots = () => {
    const [dots, setDots] = useState("");

    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? "" : prev + ".");
        }, 500);
        return () => clearInterval(interval);
    }, []);

    return <span>{dots}</span>;
};
export default function DashboardPage() {
    const { profile, leaveQuota, extraLeave, isLoading: authLoading } = useAuth();
    const supabase = createClient();

    // Birthday State
    const [todayBirthdays, setTodayBirthdays] = useState<BirthdayPerson[]>([]);
    const [upcomingBirthdays, setUpcomingBirthdays] = useState<BirthdayPerson[]>([]);

    // Fetch Birthdays
    useEffect(() => {
        const fetchBirthdays = async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('full_name, avatar_url, birth_date')
                .not('birth_date', 'is', null);

            if (error) {
                console.error("Error fetching birthdays:", error);
                return;
            }

            if (data) {
                console.log("Raw Birthday Data:", data);
                const today = new Date();
                const todayMonthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                console.log("Today's Date Code:", todayMonthDay);

                const todayList = data.filter((p: any) => {
                    if (!p.birth_date) return false;
                    const bdaySlice = p.birth_date.slice(5);
                    console.log(`Checking ${p.full_name}: ${p.birth_date} (slice: ${bdaySlice}) vs ${todayMonthDay} => ${bdaySlice === todayMonthDay}`);
                    return bdaySlice === todayMonthDay;
                }).map((p: any) => ({ ...p, daysUntil: 0 } as BirthdayPerson));

                console.log("Calculated Today List:", todayList);

                const upcomingList = data.map((p: any) => {
                    const days = getDaysUntilBirthday(p.birth_date);
                    return { ...p, daysUntil: days };
                }).filter((p: any) => p.daysUntil > 0 && p.daysUntil <= 7)
                    .sort((a: any, b: any) => a.daysUntil - b.daysUntil);

                setTodayBirthdays(todayList);
                setUpcomingBirthdays(upcomingList);
            }
        };

        fetchBirthdays();
    }, []);

    // Data Fetching for Team Activity & Daily Plan
    // Team Status State
    const [teamStatuses, setTeamStatuses] = useState<TeamMember[]>([]);
    const [isLoadingTeamData, setIsLoadingTeamData] = useState(true);

    // Data Fetching for Team Activity & Daily Plan
    useEffect(() => {
        const fetchAllTeamData = async () => {
            if (!profile) {
                console.log("Skipping fetchTeamData: No profile yet");
                return;
            }

            setIsLoadingTeamData(true);
            console.log("Fetching team data for profile:", profile.id);

            try {
                // 1. Fetch current user's Daily Tasks from daily_tasks table
                const { data: myTasks, error: tasksError } = await supabase
                    .from('daily_tasks')
                    .select('*')
                    .eq('profile_id', profile.id)
                    .order('position', { ascending: true })
                    .order('id', { ascending: false });

                if (tasksError) {
                    console.error("Error fetching tasks:", tasksError);
                    console.error("Error details:", JSON.stringify(tasksError, null, 2));
                }
                else {
                    setDailyPlan(myTasks?.map((t: any) => ({
                        id: t.id,
                        text: t.task_text,
                        project: "General",
                        priority: t.priority as "high" | "medium" | "low",
                        completed: t.completed || false
                    })) || []);
                }

                // 2. Fetch User's Status Message
                const { data: myProfile, error: profileError } = await supabase
                    .from('profiles')
                    .select('status_message')
                    .eq('id', profile.id)
                    .single();

                if (profileError) console.error("Error fetching profile status:", profileError);
                else if (myProfile?.status_message) {
                    setStatusMessage(myProfile.status_message);
                }

                // 3. Fetch All Team Profiles (Including new Status column)
                const { data: profiles, error: teamError } = await supabase
                    .from('profiles')
                    .select('id, full_name, role, job_type, avatar_url, status_message, employee_type, status, job_title')
                    .eq('is_active', true);

                if (teamError) {
                    console.error("Error fetching team profiles:", teamError);
                    return;
                }

                // Fetch ALL team's tasks for display
                const { data: allTeamTasks } = await supabase
                    .from('daily_tasks')
                    .select('profile_id, task_text, priority, completed');

                const teamData: TeamMember[] = profiles?.map((p: any) => {
                    // Normalize status to lowercase for frontend logic compatibility
                    let status = (p.status || 'office').toLowerCase();

                    // Map Backend Status to Frontend keys if needed (though we tried to match them)
                    // Backend: Office, Remote, WFH, WFA, Izin, Dinas, Cuti, Sakit
                    // Frontend Config keys: office, wfh, wfa, sick, leave, field, cuti, izin, remote?

                    // if (status === 'sakit') status = 'sick';
                    if (status === 'dinas') status = 'dinas'; // We might need to add 'dinas' to config or map to 'field'
                    // if (status === 'remote') status = 'wfh'; // Or keep distinct if we add 'remote' config

                    // Use daily_tasks for this user - Filter out completed tasks for team view
                    const pTasks = allTeamTasks?.filter((t: any) => t.profile_id === p.id && !t.completed).slice(0, 3).map((t: any) => ({
                        name: t.task_text,
                        priority: t.priority
                    })) || [];

                    return {
                        id: p.id,
                        name: p.full_name || 'Unknown',
                        role: p.job_title || 'Tourism Analyst',
                        avatar: (p.full_name || 'U').charAt(0),
                        avatarUrl: p.avatar_url,
                        status: status, // Now using the database column!
                        job_type: p.job_type, // Passing job_type for filtering
                        personalNote: p.status_message || "",
                        tasks: pTasks
                    };
                }) || [];

                setTeamStatuses(teamData);
                console.log("Team data updated with tasks");

            } catch (error) {
                console.error("Error fetching team data:", error);
            } finally {
                setIsLoadingTeamData(false);
            }
        };

        fetchAllTeamData();
    }, [profile]);

    const isIntern = profile?.job_type === 'intern';

    // CEO status override - for immediate UI updates when CEO changes status
    const [ceoStatusOverride, setCeoStatusOverride] = useState<string | null>(null);

    // Compute current user's status from teamStatuses (or CEO override)
    const currentUserStatus = useMemo(() => {
        // If CEO has set a local override, use that
        if (profile?.role === 'ceo' && ceoStatusOverride) {
            return ceoStatusOverride;
        }
        const currentUser = teamStatuses.find(m => m.id === profile?.id);
        return currentUser?.status || 'office';
    }, [teamStatuses, profile?.id, profile?.role, ceoStatusOverride]);

    // Announcements State
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);

    useEffect(() => {
        const loadAnnouncements = async () => {
            try {
                const data = await announcementService.fetchAnnouncements();
                setAnnouncements(data);
            } catch (err) {
                console.error("Failed to fetch announcements", err);
            }
        };
        loadAnnouncements();
    }, []);

    // Personal Status Message State
    const [statusMessage, setStatusMessage] = useState("Building the future of IMS! 💻");

    const [dailyPlan, setDailyPlan] = useState<Task[]>([]);

    const handleReorder = (newOrder: Task[]) => {
        setDailyPlan(newOrder);
    };

    const handleDragEnd = async () => {
        if (!profile) return;

        // Create updates array with new positions
        const updates = dailyPlan.map((task, index) => ({
            id: task.id,
            position: index,
            // We need to provide other required fields if upserting, 
            // but if we only update, we can use `upsert` with ignoreDuplicates? 
            // Or better, just update the changed rows.
            // Supabase upsert requires primary key.
            // But to avoid validation errors on other fields if they are missing?
            // "daily_tasks" usually allows partial updates via .update(), 
            // but we need to update MULTIPLE rows. 
            // Upsert is the way, but we must ensure we don't overwrite/erase other data if we don't pass it?
            // Actually, we should fetch current data? No, too expensive.
            // Best way: use RPC or map and promise.all update.
            // For < 20 tasks, Promise.all is fine.
        }));

        try {
            // Optimised: upsert with only id and position, assuming other fields are nullable or have defaults?
            // No, update will fail if we upsert partial data and it tries to insert new?
            // Since ID exists, it updates. But does it Nullify others?
            // Postgres UPSERT UPDATE SET ... usually keeps values if not specified? 
            // Supabase: "If the record exists, it will be updated." 
            // "If you don't mention a column, it won't be changed" -> verify this.
            // Actually, `upsert` REPLACES the row if not careful? No, it performs ON CONFLICT DO UPDATE.
            // In Supabase js: .upsert({ id: 1, position: 5 }) -> updates position, other columns preserved?
            // LET'S VERIFY: Standard SQL `INSERT ... ON CONFLICT DO UPDATE` requires specifying columns to update.
            // Supabase JS `upsert` handles this?
            // SAFEST OPTION: Promise.all with .update()

            await Promise.all(updates.map(u =>
                supabase.from('daily_tasks').update({ position: u.position }).eq('id', u.id)
            ));

            console.log("Order saved");
        } catch (err) {
            console.error("Failed to save order", err);
        }
    };


    // Workload Data State
    const [workloadItems, setWorkloadItems] = useState<any[]>([]);
    const [maxCapacity, setMaxCapacity] = useState(10); // Default

    const fetchProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch Profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('*') // Fetches all columns including job_title
                .eq('id', user.id)
                .single();

            if (profile) {
                // Update mockUser only with necessary fields if needed, 
                // but we should probably use a real state or 'profile' from useAuth
                // For now, keeping the logic simplified

                // Set Capacity based on level
                const level = profile.job_level || "Analyst L1";
                const capConfig: Record<string, number> = {
                    "Intern": 8,
                    "Analyst L1": 10,
                    "Analyst L2": 10,
                    "Senior Analyst": 12,
                    "Consultant": 12,
                    "Manager": 12,
                };
                if (profile.job_type === 'intern') setMaxCapacity(8);
                else setMaxCapacity(capConfig[level] || 10);

                // Fetch Workload Items
                const { data: items } = await supabase
                    .from('workload_items')
                    .select('*')
                    .eq('profile_id', user.id);

                if (items) {
                    setWorkloadItems(items);
                }
            }
        } catch (error) {
            console.error("Error fetching profile/workload:", error);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    // KPI & Attendance Data Fetching
    const [kpiStats, setKpiStats] = useState<any>(null);
    const [attendanceStats, setAttendanceStats] = useState<{ total: number; late: number; percent: number } | null>(null);

    useEffect(() => {
        const fetchKPIAndAttendance = async () => {
            if (!profile?.id) return;

            // 1. Fetch KPI Scores
            const { data: kpi } = await supabase
                .from('kpi_scores')
                .select('*, kpi_sub_aspect_scores(*)')
                .eq('profile_id', profile.id)
                .eq('period', '2026-S1')
                .single();

            if (kpi) setKpiStats(kpi);

            // 2. Fetch Attendance Stats
            const semesterStart = '2026-01-01';
            const { data: checkins } = await supabase
                .from('daily_checkins')
                .select('checkin_date, is_late')
                .eq('profile_id', profile.id)
                .gte('checkin_date', semesterStart);

            if (checkins) {
                const total = checkins.length;
                const late = checkins.filter((c: any) => c.is_late).length;
                const percent = total > 0 ? (late / total) * 100 : 0;
                setAttendanceStats({ total, late, percent });
            }
        };

        fetchKPIAndAttendance();
    }, [profile?.id]);

    // Weather & Location State
    const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null);
    const [locationName, setLocationName] = useState<string>("Detecting...");

    // Fetch Weather & Location
    useEffect(() => {
        const fetchWeather = async (lat: number, lon: number) => {
            try {
                // 1. Fetch Weather
                const weatherRes = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`
                );
                if (!weatherRes.ok) throw new Error("Weather API failed");
                const weatherData = await weatherRes.json();
                setWeather({
                    temp: Math.round(weatherData.current.temperature_2m),
                    code: weatherData.current.weather_code
                });

                // 2. Reverse Geocoding
                const geoRes = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`
                );
                if (!geoRes.ok) throw new Error("Geocoding API failed");
                const geoData = await geoRes.json();
                const city = geoData.address.city || geoData.address.town || geoData.address.county || "Jakarta";
                const country = geoData.address.country || "Indonesia";
                setLocationName(`${city}, ${country}`);
            } catch (error) {
                console.warn("Weather fetch failed, using default:", error);
                setWeather({ temp: 30, code: 1 }); // Default sunny/hot
                setLocationName("Jakarta, Indonesia");
            }
        };

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    fetchWeather(position.coords.latitude, position.coords.longitude);
                },
                (error) => {
                    console.warn("Geolocation denied/error:", error);
                    setWeather({ temp: 30, code: 1 });
                    setLocationName("Jakarta, Indonesia");
                }
            );
        } else {
            setWeather({ temp: 30, code: 1 });
            setLocationName("Jakarta, Indonesia");
        }
    }, []);


    const getWeatherIcon = (code: number) => {
        // WMO Weather interpretation codes (http://www.wmo.int/pages/prog/www/IMOP/publications/CIMO-Guide/CIMO_Guide-7th_Edition-2008/Part-I/Chapter-14.pdf)
        // 0: Clear sky
        // 1, 2, 3: Mainly clear, partly cloudy, and overcast
        // 45, 48: Fog and depositing rime fog
        // 51, 53, 55: Drizzle: Light, moderate, and dense intensity
        // 56, 57: Freezing Drizzle: Light and dense intensity
        // 61, 63, 65: Rain: Slight, moderate and heavy intensity
        // 66, 67: Freezing Rain: Light and heavy intensity
        // 71, 73, 75: Snow fall: Slight, moderate, and heavy intensity
        // 77: Snow grains
        // 80, 81, 82: Rain showers: Slight, moderate, and violent
        // 85, 86: Snow showers slight and heavy
        // 95: Thunderstorm: Slight or moderate
        // 96, 99: Thunderstorm with slight and heavy hail

        if (code === 0) return <Sun className="h-4 w-4 text-amber-400" />;
        if (code >= 1 && code <= 3) return <CloudSun className="h-4 w-4 text-orange-300" />;
        if (code >= 45 && code <= 48) return <Cloud className="h-4 w-4 text-gray-400" />;
        if (code >= 51 && code <= 67) return <CloudRain className="h-4 w-4 text-blue-400" />;
        if (code >= 71 && code <= 77) return <Snowflake className="h-4 w-4 text-sky-200" />;
        if (code >= 80 && code <= 82) return <CloudDrizzle className="h-4 w-4 text-blue-300" />;
        if (code >= 85 && code <= 86) return <Snowflake className="h-4 w-4 text-sky-200" />;
        if (code >= 95 && code <= 99) return <CloudLightning className="h-4 w-4 text-purple-400" />;

        return <Sun className="h-4 w-4 text-amber-400" />;
    };

    const getWeatherLabel = (code: number) => {
        if (code === 0) return "Cerah ☀️";
        if (code >= 1 && code <= 3) return "Berawan ☁️";
        if (code >= 45 && code <= 48) return "Berkabut 🌫️";
        if (code >= 51 && code <= 67) return "Hujan 🌧️";
        if (code >= 71 && code <= 77) return "Salju ❄️";
        if (code >= 80 && code <= 82) return "Hujan Deras ⛈️";
        if (code >= 85 && code <= 86) return "Salju Lebat 🌨️";
        if (code >= 95 && code <= 99) return "Badai Petir ⚡";
        return "Cerah";
    };
    const [currentStatus, setCurrentStatus] = useState<AttendanceStatus>("office");
    const [showUpdatePlanModal, setShowUpdatePlanModal] = useState(false);
    const [showChangeStatusModal, setShowChangeStatusModal] = useState(false);
    const [showCheckinModal, setShowCheckinModal] = useState(false);
    const [showClockOutModal, setShowClockOutModal] = useState(false);
    const [newTaskText, setNewTaskText] = useState("");
    const [newTaskProject, setNewTaskProject] = useState("General");
    const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>("medium");

    // Sidebar toggle state
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // ============================================
    // HERO CAROUSEL STATE & HANDLERS
    // ============================================
    const [activeSlide, setActiveSlide] = useState(0);
    const [touchStart, setTouchStart] = useState(0);
    const [touchEnd, setTouchEnd] = useState(0);
    const carouselRef = useRef<HTMLDivElement>(null);

    // Swipe threshold (min distance to trigger slide change)
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
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe && activeSlide < (isIntern || profile?.role === 'ceo' ? 1 : 2)) {
            setActiveSlide(activeSlide + 1);
        }
        if (isRightSwipe && activeSlide > 0) {
            setActiveSlide(activeSlide - 1);
        }
    };

    // Mouse drag support for desktop
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState(0);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart(e.clientX);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setTouchEnd(e.clientX);
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setIsDragging(false);
        const distance = dragStart - e.clientX;
        if (distance > minSwipeDistance && activeSlide < (isIntern || profile?.role === 'ceo' ? 1 : 2)) {
            setActiveSlide(activeSlide + 1);
        }
        if (distance < -minSwipeDistance && activeSlide > 0) {
            setActiveSlide(activeSlide - 1);
        }
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    // Dynamic greeting based on time of day
    const [currentTime, setCurrentTime] = useState(new Date());
    const greeting = useMemo(() => getGreetingByTime(), [currentTime]);

    // Motivational message - changes daily
    const motivationalMessage = useMemo(() => getDailyMotivationalMessage(), []);


    // Check-in state (dynamic)
    const [checkinState, setCheckinState] = useState(initialCheckinState);
    const [todayCheckinId, setTodayCheckinId] = useState<string | null>(null);
    const [approvedWfhWfaToday, setApprovedWfhWfaToday] = useState<{ type: 'wfh' | 'wfa' } | null>(null);

    // Handle Clock In with selected status
    // Handle Clock In (Directly for WFH/WFA based on approval)
    // Handle Clock In with selected status - NOW WITH DATABASE PERSISTENCE
    const handleClockIn = async (selectedStatus?: AttendanceStatus) => {
        if (!profile) return;

        // Determine status: passed status > approved request type > remote employee default
        let status: AttendanceStatus = selectedStatus || 'wfh';
        if (!selectedStatus && approvedWfhWfaToday) {
            status = approvedWfhWfaToday.type;
        } else if (!selectedStatus && profile.employee_type === 'remote_employee') {
            status = 'wfh'; // Default for remote employees
        }

        const now = new Date();

        // Get today's date in YYYY-MM-DD format
        const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }).split('T')[0];

        // Construct Local ISO String (YYYY-MM-DDTHH:mm:ss.sss) for Asia/Jakarta
        // We avoid toISOString() because it returns UTC.
        // We want the literal time "06:00" to be sent as "2026-01-27T06:00:00"
        const offsetDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
        const year = offsetDate.getFullYear();
        const month = String(offsetDate.getMonth() + 1).padStart(2, '0');
        const day = String(offsetDate.getDate()).padStart(2, '0');

        const hoursInt = offsetDate.getHours();
        const minutesInt = offsetDate.getMinutes();
        const hours = String(hoursInt).padStart(2, '0');
        const minutes = String(minutesInt).padStart(2, '0');

        const seconds = String(offsetDate.getSeconds()).padStart(2, '0');
        const ms = String(offsetDate.getMilliseconds()).padStart(3, '0');

        const clockInTimestamp = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}`;

        // Use Jakarta time for display to be consistent with system record
        const clockInTime = `${hours}:${minutes}`;

        // Consider late if clock in after 08:30 (Jakarta Time)
        const isLate = hoursInt > 8 || (hoursInt === 8 && minutesInt > 30);

        try {
            // Insert or update daily_checkins record
            const { data, error } = await supabase
                .from('daily_checkins')
                .upsert({
                    profile_id: profile.id,
                    employee_id: profile.employee_id,
                    checkin_date: today,
                    status: status,
                    clock_in_time: clockInTimestamp,
                    is_late: isLate,
                    source: 'web',
                    notes: `Clock in dari halaman home`,
                }, {
                    onConflict: 'profile_id,checkin_date',
                })
                .select('id')
                .single();

            if (error) {
                console.error('Failed to save clock in:', error);
                // Still update local state for UX
            } else if (data) {
                setTodayCheckinId(data.id);
                console.log('Clock in saved:', data.id);
            }
        } catch (err) {
            console.error('Clock in error:', err);
        }

        // Update local state
        setCheckinState({
            ...checkinState,
            isClockedIn: true,
            status: status,
            clockInTime,
            isLate: isLate,
            isForceMajeure: false,
        });
        setCurrentStatus(status);
        setShowClockInFeedback(true);
    };

    // Handle Clock Out Trigger
    const handleClockOut = () => {
        setShowClockOutModal(true);
    };

    // Execute Clock Out - NOW WITH DATABASE PERSISTENCE
    const executeClockOut = async () => {
        setShowClockOutModal(false);
        if (!profile) return;

        const now = new Date();

        // Use standard consistent formatting for Local Time (Jakarta)
        const offsetDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
        const year = offsetDate.getFullYear();
        const month = String(offsetDate.getMonth() + 1).padStart(2, '0');
        const day = String(offsetDate.getDate()).padStart(2, '0');
        const hours = String(offsetDate.getHours()).padStart(2, '0');
        const minutes = String(offsetDate.getMinutes()).padStart(2, '0');
        const seconds = String(offsetDate.getSeconds()).padStart(2, '0');
        const ms = String(offsetDate.getMilliseconds()).padStart(3, '0');

        const clockOutTimeStr = `${hours}:${minutes}`;

        const clockOutTimestamp = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}`;
        const today = `${year}-${month}-${day}`;

        try {
            // Update the daily_checkins record with clock out time
            const { error } = await supabase
                .from('daily_checkins')
                .update({
                    clock_out_time: clockOutTimestamp,
                })
                .eq('profile_id', profile.id)
                .eq('checkin_date', today);

            if (error) {
                console.error('Failed to save clock out:', error);
            } else {
                console.log('Clock out saved');
            }
        } catch (err) {
            console.error('Clock out error:', err);
        }

        // Update local state
        setCheckinState({
            ...checkinState,
            isClockedOut: true,
            clockOutTime: clockOutTimeStr,
        });
    };

    // ===============================================================
    // CEO STATUS QUICK CHANGE HANDLER
    // ===============================================================
    const [showCeoStatusDropdown, setShowCeoStatusDropdown] = useState(false);
    const [isUpdatingCeoStatus, setIsUpdatingCeoStatus] = useState(false);

    // CEO-only status options (excluding office since they can just clock in for that)
    const ceoStatusOptions = [
        { id: 'office', label: 'Office', Icon: Building2, color: 'bg-emerald-500' },
        { id: 'wfh', label: 'WFH', Icon: Home, color: 'bg-purple-500' },
        { id: 'wfa', label: 'WFA', Icon: MapPin, color: 'bg-sky-500' },
        { id: 'dinas', label: 'Dinas', Icon: Briefcase, color: 'bg-blue-500' },
        { id: 'cuti', label: 'Cuti', Icon: Umbrella, color: 'bg-amber-500' },
        { id: 'izin', label: 'Izin', Icon: ClipboardList, color: 'bg-rose-500' },
        { id: 'sakit', label: 'Sakit', Icon: Stethoscope, color: 'bg-pink-500' },
    ];

    const handleCEOStatusChange = async (newStatus: string) => {
        if (!profile || isUpdatingCeoStatus) return;
        setIsUpdatingCeoStatus(true);
        setShowCeoStatusDropdown(false);

        // Use Local Date (WIB)
        const now = new Date();
        const offsetDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
        const year = offsetDate.getFullYear();
        const month = String(offsetDate.getMonth() + 1).padStart(2, '0');
        const day = String(offsetDate.getDate()).padStart(2, '0');
        const hours = String(offsetDate.getHours()).padStart(2, '0');
        const minutes = String(offsetDate.getMinutes()).padStart(2, '0');
        const seconds = String(offsetDate.getSeconds()).padStart(2, '0');

        const clockInTimestamp = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
        const today = `${year}-${month}-${day}`;

        try {
            console.log('[CEO Status] Starting status change to:', newStatus);
            console.log('[CEO Status] profile.id:', profile.id);
            console.log('[CEO Status] today:', today);

            // First check if a record exists for today
            const { data: existingRecord, error: selectError } = await supabase
                .from('daily_checkins')
                .select('id, profile_id, status')
                .eq('profile_id', profile.id)
                .eq('checkin_date', today)
                .maybeSingle();

            if (selectError) {
                console.error('[CEO Status] Error checking existing record:', selectError);
            }
            console.log('[CEO Status] Existing record:', existingRecord);
            console.log('[CEO Status] Does profile_id match?', existingRecord?.profile_id === profile.id);

            let recordId = existingRecord?.id;

            if (existingRecord) {
                // Update existing record - add .select() to see if any rows are actually updated
                const { data: updateData, error: updateError, count } = await supabase
                    .from('daily_checkins')
                    .update({
                        status: newStatus,
                        clock_in_time: clockInTimestamp,
                        source: 'ceo_quick_set',
                        notes: `Status set by CEO via quick edit`,
                    })
                    .eq('id', existingRecord.id)
                    .select();

                console.log('[CEO Status] Update result:', { updateData, updateError, count });

                if (updateError) {
                    console.error('Failed to update CEO status:', updateError);
                    return;
                }

                if (!updateData || updateData.length === 0) {
                    console.error('[CEO Status] Update returned no data - RLS may be blocking the update!');
                    console.log('[CEO Status] Trying alternative update with profile_id...');

                    // Try updating by profile_id and date instead
                    const { data: altUpdateData, error: altError } = await supabase
                        .from('daily_checkins')
                        .update({
                            status: newStatus,
                            clock_in_time: clockInTimestamp,
                            source: 'ceo_quick_set',
                            notes: `Status set by CEO via quick edit`,
                        })
                        .eq('profile_id', profile.id)
                        .eq('checkin_date', today)
                        .select();

                    console.log('[CEO Status] Alt update result:', { altUpdateData, altError });

                    if (altError || !altUpdateData || altUpdateData.length === 0) {
                        console.error('[CEO Status] All update attempts failed!');
                        return;
                    }
                }

                console.log('[CEO Status] Status successfully updated:', newStatus);
            } else {
                // Insert new record
                const { data: insertData, error: insertError } = await supabase
                    .from('daily_checkins')
                    .insert({
                        profile_id: profile.id,
                        employee_id: profile.employee_id,
                        checkin_date: today,
                        status: newStatus,
                        clock_in_time: clockInTimestamp,
                        is_late: false,
                        source: 'ceo_quick_set',
                        notes: `Status set by CEO via quick edit`,
                    })
                    .select('id')
                    .single();

                if (insertError) {
                    console.error('Failed to insert CEO status:', insertError);
                    return;
                }
                recordId = insertData?.id;
                console.log('CEO status created:', newStatus);
            }

            if (recordId) {
                setTodayCheckinId(recordId);
            }

            // IMPORTANT: Also update the profiles.status column since team data reads from there!
            const { error: profileUpdateError } = await supabase
                .from('profiles')
                .update({ status: newStatus })
                .eq('id', profile.id);

            if (profileUpdateError) {
                console.error('[CEO Status] Failed to update profiles.status:', profileUpdateError);
            } else {
                console.log('[CEO Status] profiles.status updated successfully');
            }

            // Update local state for checkin
            setCheckinState({
                ...checkinState,
                isClockedIn: true,
                status: newStatus as AttendanceStatus,
                clockInTime: `${hours}:${minutes}`,
                isLate: false,
                isForceMajeure: false,
            });

            // Update CEO status override for immediate UI update
            setCeoStatusOverride(newStatus);

            // Also update teamStatuses so Team Activity reflects the change
            setTeamStatuses(prev => prev.map(member =>
                member.id === profile.id
                    ? { ...member, status: newStatus }
                    : member
            ));

        } catch (err) {
            console.error('CEO status update error:', err);
        } finally {
            setIsUpdatingCeoStatus(false);
        }
    };

    // Click outside handler for CEO status dropdown
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (showCeoStatusDropdown) {
                const target = e.target as HTMLElement;
                if (!target.closest('[data-ceo-dropdown]')) {
                    setShowCeoStatusDropdown(false);
                }
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [showCeoStatusDropdown]);
    // ===============================================================

    // Fetch today's checkin status and approved WFH/WFA requests on mount
    useEffect(() => {
        const fetchTodayCheckinAndApprovals = async () => {
            if (!profile) return;

            // Use Local Date (WIB) to match what we save in handleClockIn
            const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }).split('T')[0];

            try {
                // 1. Fetch today's checkin record
                const { data: todayCheckin, error: checkinError } = await supabase
                    .from('daily_checkins')
                    .select('*')
                    .eq('profile_id', profile.id)
                    .eq('checkin_date', today)
                    .single();

                if (!checkinError && todayCheckin) {
                    // Restore checkin state from database
                    setTodayCheckinId(todayCheckin.id);
                    const clockInTime = todayCheckin.clock_in_time
                        ? new Date(todayCheckin.clock_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                        : null;
                    const clockOutTime = todayCheckin.clock_out_time
                        ? new Date(todayCheckin.clock_out_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                        : null;

                    setCheckinState({
                        isClockedIn: !!todayCheckin.clock_in_time,
                        isClockedOut: !!todayCheckin.clock_out_time,
                        status: todayCheckin.status as AttendanceStatus,
                        clockInTime,
                        clockOutTime,
                        isLate: todayCheckin.is_late || false,
                        hasApprovedRequest: false,
                        approvedRequestType: null,
                        isForceMajeure: false,
                    });

                    if (todayCheckin.status) {
                        setCurrentStatus(todayCheckin.status as AttendanceStatus);
                    }
                }

                // 2. Check for approved WFH/WFA requests for today
                const { data: approvedRequests, error: requestError } = await supabase
                    .from('leave_requests')
                    .select('leave_type')
                    .eq('profile_id', profile.id)
                    .eq('status', 'approved')
                    .in('leave_type', ['wfh', 'wfa'])
                    .lte('start_date', today)
                    .gte('end_date', today)
                    .limit(1);

                if (!requestError && approvedRequests && approvedRequests.length > 0) {
                    const leaveType = approvedRequests[0].leave_type as 'wfh' | 'wfa';
                    setApprovedWfhWfaToday({ type: leaveType });
                }

            } catch (err) {
                console.error('Error fetching today checkin:', err);
            }
        };

        fetchTodayCheckinAndApprovals();
    }, [profile]);

    // Computed: Can user clock in today?
    const canClockInToday = useMemo(() => {
        // Already clocked in for today
        if (checkinState.isClockedIn) return false;

        // Remote employee can always clock in
        if (profile?.employee_type === 'remote_employee') return true;

        // User has approved WFH/WFA for today
        if (approvedWfhWfaToday) return true;

        return false;
    }, [checkinState.isClockedIn, profile?.employee_type, approvedWfhWfaToday]);

    // Clock-in feedback message state (shows for 15 seconds after clock in)
    const [showClockInFeedback, setShowClockInFeedback] = useState(false);
    const clockInFeedback = useMemo(() => {
        if (checkinState.status) {
            return getFeedbackMessage(checkinState.status, checkinState.isLate, checkinState.isForceMajeure, checkinState.isClockedOut);
        }
        return null;
    }, [checkinState.status, checkinState.isLate, checkinState.isForceMajeure, checkinState.isClockedOut]);



    // Update time every minute for greeting changes
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);

    // Auto-hide clock-in feedback after 15 seconds
    useEffect(() => {
        if (showClockInFeedback && checkinState.isClockedIn) {
            const timer = setTimeout(() => {
                setShowClockInFeedback(false);
            }, 15000); // 15 seconds
            return () => clearTimeout(timer);
        }
    }, [showClockInFeedback]);

    // Reset to motivational message when tab becomes visible again
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && checkinState.isClockedIn) {
                setShowClockInFeedback(false); // Switch back to motivational
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    const handleToggleTask = async (id: number | string) => {
        // Find task
        const taskToToggle = dailyPlan.find(t => t.id === id);
        if (!taskToToggle) return;

        const newCompletedStatus = !taskToToggle.completed;

        // Optimistic update
        setDailyPlan(prev => prev.map(t =>
            t.id === id ? { ...t, completed: newCompletedStatus } : t
        ));

        // Sync with DB
        try {
            const { error } = await supabase
                .from('daily_tasks')
                .update({ completed: newCompletedStatus })
                .eq('id', id);

            if (error) throw error;

            // Sync with Team Activity (Local)
            if (profile) {
                setTeamStatuses(prev => prev.map(m => {
                    if (m.id === profile.id) {
                        // If completed, remove from visible list in team activity. If unchecked, add back.
                        // For simplicity, we just filter from current dailyPlan state which is already updated
                        // But dailyPlan state update is async/batched.
                        // Let's use the new status.
                        const updatedTasks = dailyPlan.map(t =>
                            t.id === id ? { ...t, completed: newCompletedStatus } : t
                        ).filter(t => !t.completed).map(t => ({ name: t.text, priority: t.priority }));

                        return {
                            ...m,
                            tasks: updatedTasks.slice(0, 3)
                        };
                    }
                    return m;
                }));
            }

        } catch (error) {
            console.error("Error toggling task:", error);
            // Revert state if error
            setDailyPlan(prev => prev.map(t =>
                t.id === id ? { ...t, completed: !taskToToggle.completed } : t
            ));
            alert("Failed to update task status");
        }
    };

    const handlePrevSlide = () => setActiveSlide(prev => Math.max(0, prev - 1));
    const handleNextSlide = () => setActiveSlide(prev => Math.min(2, prev + 1)); // Assuming 3 slides 0,1,2

    const addTask = async (text: string, priority: "high" | "medium" | "low") => {
        if (!profile) {
            alert("Error: User profile is not loaded. Cannot save task.");
            return;
        }

        if (text.trim()) {
            try {
                // Simple payload: text + priority
                const payload = {
                    profile_id: profile.id,
                    task_text: text.trim(),
                    priority: priority
                };

                const { data, error } = await supabase
                    .from('daily_tasks')
                    .insert(payload)
                    .select()
                    .single();

                if (error) {
                    console.error("Supabase Error adding task:", error);
                    alert(`Failed to add task: ${error.message} (${error.code})`);
                    throw error;
                }

                if (data) {
                    const newTask: Task = {
                        id: data.id,
                        text: data.task_text,
                        project: "General",
                        priority: data.priority as "high" | "medium" | "low",
                        completed: false
                    };

                    setDailyPlan(prev => [newTask, ...prev]);

                    // Sync with Team Activity (Local)
                    setTeamStatuses(prev => prev.map(m => {
                        if (m.id === profile.id) {
                            return {
                                ...m,
                                tasks: [
                                    { name: newTask.text, priority: newTask.priority },
                                    ...(m.tasks || [])
                                ].slice(0, 3)
                            };
                        }
                        return m;
                    }));

                    // setNewTaskText("");
                    // setNewTaskPriority("medium");
                }

            } catch (error) {
                console.error("Error adding task:", error);
            }
        }
    };

    const removeTask = async (id: number | string) => {
        // Clean delete logic
        const originalPlan = [...dailyPlan];
        const taskToRemove = dailyPlan.find(t => t.id === id);

        setDailyPlan(prev => prev.filter(task => task.id !== id));

        // Sync with Team Activity (Local)
        if (profile && taskToRemove) {
            setTeamStatuses(prev => prev.map(m => {
                if (m.id === profile.id) {
                    return {
                        ...m,
                        tasks: (m.tasks || []).filter(t => t.name !== taskToRemove.text)
                    };
                }
                return m;
            }));
        }

        try {
            await supabase
                .from('daily_tasks')
                .delete()
                .eq('id', id);
        } catch (error) {
            console.error("Error deleting task:", error);
            setDailyPlan(originalPlan); // Revert
            alert("Failed to delete task.");
        }
    };

    const handleStatusChange = async (status: AttendanceStatus) => {
        setCurrentStatus(status);
        setShowChangeStatusModal(false);

        // Sync with Team Activity (Optimistic)
        if (profile) {
            setTeamStatuses(prev => prev.map(m => {
                if (m.id === profile.id) {
                    let newStatus = status === 'office' ? 'wfo' : status;
                    if (status === 'sick') newStatus = 'izin';
                    if (status === 'leave') newStatus = 'cuti';
                    return { ...m, status: newStatus };
                }
                return m;
            }));
        }

        // Persist to DB
        if (profile) {
            try {
                const today = new Date().toISOString().split('T')[0];
                const { error } = await supabase
                    .from('daily_checkins')
                    .upsert({
                        profile_id: profile.id,
                        checkin_date: today,
                        status: status,
                        source: 'web'
                    }, { onConflict: 'profile_id, checkin_date' });

                if (error) {
                    console.error("Error updating status in DB:", error);
                    // Could revert state here if strict
                } else {
                    console.log("Status updated in DB:", status);
                }
            } catch (err) {
                console.error("Failed to save status:", err);
            }
        }
    };

    const saveStatusMessage = async (newMessage: string) => {
        if (!profile || !newMessage.trim()) return;

        console.log("Saving status message:", newMessage);

        try {
            const { data, error } = await supabase
                .from('profiles')
                .update({ status_message: newMessage.trim() })
                .eq('id', profile.id)
                .select(); // Select to verify return

            if (error) {
                console.error("Error updating status:", error);
                throw error;
            }

            console.log("Status updated successfully:", data);

            const finalMessage = newMessage.trim();
            setStatusMessage(finalMessage);
            // setIsEditingStatus(false);

            // Sync with Team Activity
            setTeamStatuses(prev => prev.map(m => {
                if (m.id === profile.id) {
                    return {
                        ...m,
                        personalNote: finalMessage
                    };
                }
                return m;
            }));

        } catch (error) {
            console.error("Failed to save status:", error);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "wfh":
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                    </svg>
                );
            case "wfa":
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                    </svg>
                );
            case "sick":
            case "sakit":
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-14h2v4h-2zm0 6h2v4h-2z" />
                    </svg>
                );
            case "leave":
            default:
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                    </svg>
                );
        }
    };

    const statusInfo = STATUS_CONFIG[currentStatus as AttendanceStatus];

    // Priority colors
    const getPriorityColor = (priority: TaskPriority) => {
        switch (priority) {
            case "high": return "text-rose-500 bg-rose-500/10";
            case "medium": return "text-amber-500 bg-amber-500/10";
            case "low": return "text-emerald-500 bg-emerald-500/10";
        }
    };

    const getPriorityLabel = (priority: TaskPriority) => {
        switch (priority) {
            case "high": return "High";
            case "medium": return "Medium";
            case "low": return "Low";
        }
    };

    // Workload calculations
    const totalWorkload = workloadItems.reduce((sum, item) => sum + item.slots, 0);
    // maxCapacity is valid from state
    const workloadPercentage = maxCapacity > 0 ? Math.round((totalWorkload / maxCapacity) * 100) : 0;

    return (
        <div className="flex flex-col gap-6">
            {/* Row 1: Hero Status Card with Integrated Dynamic Messages */}
            {/* Note: Using dedicated styling instead of glass-panel for consistent dark theme */}
            {/* Row 1: Hero Carousel - Swipeable */}
            <Card
                ref={carouselRef}
                className="overflow-hidden relative border-border bg-card select-none"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
            >
                {/* Carousel Container */}
                <div
                    className="flex transition-transform duration-500 ease-out"
                    style={{ transform: `translateX(-${activeSlide * 100}%)` }}
                >
                    {/* ==================== SLIDE 1: Original Hero Content ==================== */}
                    <div className="w-full flex-shrink-0 relative group min-h-[320px]">
                        {/* Background Image with Gradient */}
                        <div
                            className="absolute inset-0 bg-cover bg-center z-0 transition-transform duration-700 group-hover:scale-105"
                            style={{
                                backgroundImage: `url('${profile?.url_hero || '/pukpik-aB46yUmsMp0-unsplash.jpg'}')`,
                            }}
                        />
                        {/* Dark Overlay for text readability - using brand dark colors */}
                        <div className="absolute inset-0 bg-gradient-to-r from-[#1c2120]/80 via-[#1c2120]/40 to-transparent z-10" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1c2120]/80 via-transparent to-transparent z-10" />

                        {/* Birthday Festive Overlay */}
                        {todayBirthdays.length > 0 && (
                            <>
                                <div className="absolute top-4 right-4 text-3xl animate-bounce z-20">🎈</div>
                                <div className="absolute top-12 right-12 text-2xl animate-pulse z-20">🎊</div>
                            </>
                        )}

                        <div className="relative z-20 p-6 sm:p-8 flex flex-col h-full justify-between min-h-[320px]">
                            {/* Top Row: Status Badge + Time */}
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2 relative">
                                    {/* Dynamic Work Status Label */}
                                    {isLoadingTeamData ? (
                                        <Badge className="gap-2 px-4 py-2 backdrop-blur-md border bg-gray-500/20 border-white/30">
                                            <div className="w-2.5 h-2.5 rounded-full bg-gray-400 animate-pulse" />
                                            <span className="text-sm font-bold uppercase tracking-wider text-white w-[100px]">
                                                Loading<LoadingDots />
                                            </span>
                                        </Badge>
                                    ) : (
                                        (() => {
                                            const statusInfo = statusOptions.find(s => s.id === currentUserStatus) || statusOptions[0];
                                            const StatusIcon = statusInfo.Icon;
                                            return (
                                                <Badge className={cn("gap-2 px-4 py-2 backdrop-blur-md border", `${statusInfo.color}/20`, `border-${statusInfo.color.replace('bg-', '')}/30`)}>
                                                    <StatusIcon className="w-4 h-4 text-white" />
                                                    <span className="text-sm font-bold uppercase tracking-wider text-white">
                                                        {statusInfo.label}
                                                    </span>
                                                </Badge>
                                            );
                                        })()
                                    )}

                                    {/* CEO Quick Status Edit Button */}
                                    {profile?.role === 'ceo' && !isLoadingTeamData && (
                                        <div className="relative force-dark-mode" data-ceo-dropdown>
                                            <button
                                                onClick={() => setShowCeoStatusDropdown(!showCeoStatusDropdown)}
                                                disabled={isUpdatingCeoStatus}
                                                className="p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-all group"
                                                title="Change Status"
                                            >
                                                {isUpdatingCeoStatus ? (
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" style={{ borderTopColor: '#ffffff' }} />
                                                ) : (
                                                    <Pencil className="w-4 h-4 group-hover:text-[#f4d875] transition-colors" style={{ color: '#ffffff' }} />
                                                )}
                                            </button>

                                            {/* Dropdown Menu - Forced Dark Mode Style */}
                                            {showCeoStatusDropdown && (
                                                <div
                                                    className="force-dark-mode absolute top-full left-0 mt-2 w-48 bg-[#1a1a18] border border-white/20 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                                                >
                                                    {/* Injected style to force dark scrollbar in this specific dropdown regardless of global theme */}
                                                    <style jsx>{`
                                                        .ceo-status-scroll::-webkit-scrollbar {
                                                            width: 6px !important;
                                                            height: 6px !important;
                                                            background: #1a1a18 !important;
                                                        }
                                                        .ceo-status-scroll::-webkit-scrollbar-track {
                                                            background: #1a1a18 !important;
                                                        }
                                                        .ceo-status-scroll::-webkit-scrollbar-thumb {
                                                            background: #3f545f !important;
                                                            border-radius: 4px !important;
                                                        }
                                                        .ceo-status-scroll::-webkit-scrollbar-thumb:hover {
                                                            background: #5f788e !important;
                                                        }
                                                    `}</style>

                                                    <div className="p-2 border-b border-white/10">
                                                        <p className="text-xs text-white/60 font-medium px-2">Set Status</p>
                                                    </div>
                                                    <div className="p-1 max-h-[300px] overflow-y-auto ceo-status-scroll">
                                                        {ceoStatusOptions.map((option) => {
                                                            const OptionIcon = option.Icon;
                                                            const isActive = currentUserStatus === option.id;
                                                            return (
                                                                <button
                                                                    key={option.id}
                                                                    onClick={() => handleCEOStatusChange(option.id)}
                                                                    className={cn(
                                                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left",
                                                                        isActive
                                                                            ? "bg-[#e8c559]/20 text-[#f4d875]"
                                                                            : "text-white hover:bg-white/10 hover:text-white"
                                                                    )}
                                                                    style={{ color: isActive ? '#f4d875' : '#ffffff' }} // Inline style fallback for ultimate force
                                                                >
                                                                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", option.color + "/30")}>
                                                                        <OptionIcon className="w-4 h-4" />
                                                                    </div>
                                                                    <span className="font-medium">{option.label}</span>
                                                                    {isActive && <Check className="ml-auto w-4 h-4 text-[#e8c559]" />}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {/* Clock */}
                                <div className="text-right">
                                    <p className="text-4xl font-bold tracking-tighter text-white !text-white">
                                        {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} <span className="text-lg font-medium text-white !text-white">WIB</span>
                                    </p>
                                    {weather && (
                                        <div className="flex flex-col items-end mt-2 animate-in fade-in slide-in-from-right-2 duration-700">
                                            <div className="flex items-center gap-2">
                                                {/* Scaled up Icon */}
                                                <div className="scale-125 origin-right">
                                                    {getWeatherIcon(weather.code)}
                                                </div>
                                                <span className="text-xl font-bold text-white !text-white">
                                                    {weather.temp}°C
                                                </span>
                                            </div>
                                            <p className="text-xs font-medium text-white/80 !text-white/80 mt-0.5 capitalize">
                                                {getWeatherLabel(weather.code)}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Middle: Status Info + Leave Quotas */}
                            <div className="flex flex-col gap-4">
                                <div>
                                    {/* Dynamic Greeting */}
                                    <p className="text-lg mb-1 flex items-center gap-2 text-white font-medium">
                                        <span className="text-2xl">{greeting.emoji}</span> <span className="text-white !text-white">{greeting.text}, {(profile?.full_name || "User").split(' ')[0]}!</span>
                                    </p>
                                    <p className="flex items-center gap-2 text-white/80 text-sm !text-white/80">
                                        <MapPin className="h-4 w-4 text-[#f4d875]" />
                                        <span className="text-white/80 !text-white/80">{locationName}</span>
                                    </p>
                                </div>

                                {/* Leave Quota Grid */}
                                {/* Dark: amber/gold bg | Light: glassmorphism */}
                                {/* Leave Quota Grid - Using Shadcn/Tailwind Variables via glass-panel or generic classes */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    {/* WFH Weekly - Hidden for CEO */}
                                    {profile?.role !== 'ceo' && (
                                        <Card className="backdrop-blur-md transition-colors border bg-amber-500/10 border-amber-500/20 dark:bg-white/5 dark:border-white/10 shadow-none">
                                            <CardContent className="p-3">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Home className="h-4 w-4 text-purple-400" />
                                                    <span className="text-xs font-medium uppercase text-[#f4d875]">WFH Minggu Ini</span>
                                                </div>
                                                <p className="text-xl font-bold text-white !text-white">
                                                    {leaveQuota?.wfh_weekly_used || 0}/{leaveQuota?.wfh_weekly_limit || 1}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Annual Leave - Hidden for Interns and CEO */}
                                    {!isIntern && profile?.role !== 'ceo' && (
                                        <Card className="backdrop-blur-md transition-colors border bg-amber-500/10 border-amber-500/20 dark:bg-white/5 dark:border-white/10 shadow-none">
                                            <CardContent className="p-3">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Plane className="h-4 w-4 text-amber-400" />
                                                    <span className="text-xs font-medium uppercase text-[#f4d875]">Cuti Tahunan</span>
                                                </div>
                                                <p className="text-xl font-bold text-white !text-white">
                                                    {leaveQuota?.annual_leave_used || 0}/{leaveQuota?.annual_leave_total || 18}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* WFA with Expiry - Hidden for Interns and CEO */}
                                    {!isIntern && profile?.role !== 'ceo' && (
                                        <Card className="backdrop-blur-md transition-colors border bg-amber-500/10 border-amber-500/20 dark:bg-white/5 dark:border-white/10 shadow-none">
                                            <CardContent className="p-3">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Plane className="h-4 w-4 text-sky-400" />
                                                    <span className="text-xs font-medium uppercase text-[#f4d875]">WFA</span>
                                                </div>
                                                <p className="text-xl font-bold text-white !text-white">
                                                    {leaveQuota?.wfa_used || 0}/{leaveQuota?.wfa_total || 30}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Libur Ekstra - Hidden for Interns and CEO */}
                                    {!isIntern && profile?.role !== 'ceo' && (
                                        <Link href="/dashboard/extra-leave">
                                            <Card className="backdrop-blur-md transition-all border bg-amber-500/10 border-amber-500/20 dark:bg-white/5 dark:border-white/10 shadow-none hover:bg-amber-500/20 cursor-pointer group">
                                                <CardContent className="p-3">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Gift className="h-4 w-4 text-pink-400 group-hover:scale-110 transition-transform" />
                                                        <span className="text-xs font-medium uppercase text-[#f4d875]">Libur Ekstra</span>
                                                    </div>
                                                    <p className="text-xl font-bold text-white !text-white flex items-end gap-1">
                                                        {/* Calculate total remaining days from all active grants */}
                                                        {(extraLeave || []).reduce((sum, grant) => sum + grant.days_remaining, 0)}
                                                        <span className="text-xs font-normal opacity-80 text-white !text-white mb-1">hari</span>
                                                    </p>
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    )}
                                </div>

                                {/* Hero Config: Message + Quick Access Split */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Left: Dynamic Message Area */}
                                    <div className="p-4 rounded-xl backdrop-blur-md transition-colors border bg-amber-500/10 border-amber-500/20 dark:bg-white/5 dark:border-white/10 flex flex-col justify-center h-full">
                                        {todayBirthdays.length > 0 ? (
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-[#2d2d2d] border border-white/10 flex items-center justify-center text-xl shadow-lg flex-shrink-0">
                                                    🎂
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-medium" style={{ color: 'white' }}>
                                                        🎉 Selamat Ulang Tahun untuk <span className="font-bold text-pink-500 dark:text-pink-400">{todayBirthdays.map(p => p.full_name.split(' ')[0]).join(', ')}</span>!
                                                    </p>
                                                    <p className="text-xs" style={{ color: 'white' }}>Jangan lupa ucapkan selamat! 🎈</p>
                                                </div>
                                            </div>
                                        ) : showClockInFeedback && clockInFeedback && checkinState.isClockedIn ? (
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-[#2d2d2d] border border-white/10 flex items-center justify-center text-xl shadow-lg flex-shrink-0">
                                                    {clockInFeedback.emoji}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-medium text-sm leading-relaxed" style={{ color: 'white' }}>
                                                        {clockInFeedback.message}
                                                    </p>
                                                    {(checkinState.status === 'wfh' || checkinState.status === 'wfa') && !checkinState.isClockedOut && (
                                                        <p className="text-xs text-amber-500 mt-1 flex items-center gap-1 !text-amber-500">
                                                            📱 Ingat: Jangan anggurin HP lebih dari 30 menit ya!
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-[#2d2d2d] border border-white/10 flex items-center justify-center text-xl shadow-lg flex-shrink-0">
                                                    💡
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-medium text-sm leading-relaxed" style={{ color: 'white' }}>
                                                        {greeting.period === "morning" ? "Start your day with a clear plan!" : "Keep up the momentum, you're doing great!"}
                                                    </p>
                                                    <p className="text-xs opacity-70 mt-1" style={{ color: 'white' }}>Focus on your top priorities.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: Quick Access Grid */}
                                    <div className="flex flex-col gap-3 h-full">
                                        <div className="grid grid-cols-3 gap-3 flex-1">
                                            {/* My Request - Hidden for CEO */}
                                            {profile?.role !== 'ceo' && (
                                                <Link href="/dashboard/my-request" className="group flex flex-col items-center justify-center gap-2 p-2 rounded-xl backdrop-blur-md transition-all hover:scale-105 active:scale-95 border bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center group-hover:bg-indigo-500/30 transition-colors">
                                                        <FileText className="h-4 w-4 text-indigo-300" />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-white uppercase tracking-wider text-center">My Request</span>
                                                </Link>
                                            )}

                                            <Link href="/dashboard/projects" className="group flex flex-col items-center justify-center gap-2 p-2 rounded-xl backdrop-blur-md transition-all hover:scale-105 active:scale-95 border bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                                                    <Briefcase className="h-4 w-4 text-emerald-300" />
                                                </div>
                                                <span className="text-[10px] font-bold text-white uppercase tracking-wider text-center">Assignments</span>
                                            </Link>

                                            <Link href="/dashboard/board" className="group flex flex-col items-center justify-center gap-2 p-2 rounded-xl backdrop-blur-md transition-all hover:scale-105 active:scale-95 border bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10">
                                                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/30 transition-colors">
                                                    <Calendar className="h-4 w-4 text-amber-300" />
                                                </div>
                                                <span className="text-[10px] font-bold text-white uppercase tracking-wider text-center">Team Schedule</span>
                                            </Link>
                                        </div>

                                        {/* Jira Quick Link */}
                                        <div className="flex justify-end gap-2">
                                            {/* WSG Website Link */}
                                            <a
                                                href="https://wisestepsconsulting.id/"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all duration-300 group shadow-lg"
                                                title="Wise Steps Consulting"
                                            >
                                                <Image
                                                    src="/WSG_Masterfiles_Logo-02-1024x264 (1).png"
                                                    alt="WSG Website"
                                                    width={80}
                                                    height={24}
                                                    className="h-5 w-auto brightness-0 invert group-hover:scale-105 transition-transform"
                                                />
                                            </a>

                                            {/* WSG Logo 05 Quick Link */}
                                            <a
                                                href="https://meet.google.com/jut-vbss-vep"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all duration-300 group shadow-lg"
                                                title="WSG Meet"
                                            >
                                                <Image
                                                    src="/WSG_Masterfiles_Logo-05-1024x767.png"
                                                    alt="WSG Meet"
                                                    width={30}
                                                    height={24}
                                                    className="h-5 w-auto brightness-0 invert group-hover:scale-105 transition-transform"
                                                />
                                            </a>

                                            {/* Google Meet Quick Link */}
                                            <a
                                                href="https://meet.google.com/dxv-mkbt-nqm"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all duration-300 group shadow-lg"
                                                title="Open Google Meet"
                                            >
                                                <Image
                                                    src="/Google_Meet_text_logo_(2020).svg"
                                                    alt="Google Meet"
                                                    width={60}
                                                    height={24}
                                                    className="h-5 w-auto brightness-0 invert group-hover:scale-105 transition-transform"
                                                />
                                            </a>

                                            {/* Google Drive Quick Link */}
                                            <a
                                                href="https://drive.google.com/drive/folders/1qdNyMYgQBmlVnC09xwaNDBkLhXYC_g9Q?usp=sharing"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all duration-300 group shadow-lg"
                                                title="Open Google Drive"
                                            >
                                                <Image
                                                    src="/Google_Drive_icon_(2020).svg"
                                                    alt="Google Drive"
                                                    width={24}
                                                    height={24}
                                                    className="h-5 w-auto brightness-0 invert group-hover:scale-105 transition-transform"
                                                />
                                            </a>

                                            {/* Jira Quick Link */}
                                            <a
                                                href="https://wisestepsconsulting.atlassian.net/"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all duration-300 group shadow-lg"
                                                title="Open Jira"
                                            >
                                                <Image
                                                    src="/Jira_Logo.svg"
                                                    alt="Jira"
                                                    width={60}
                                                    height={24}
                                                    className="h-5 w-auto brightness-0 invert group-hover:scale-105 transition-transform"
                                                />
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons - Hidden for CEO (they use quick status editor instead) */}
                                {profile?.role !== 'ceo' && (
                                    <div className="flex flex-wrap gap-3 items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {!checkinState.isClockedIn ? (
                                                <div className="relative group/clockin">
                                                    <button
                                                        onClick={() => handleClockIn()}
                                                        disabled={!canClockInToday}
                                                        className={`flex items-center justify-center gap-2 px-6 h-12 rounded-xl text-sm tracking-wide transition-colors font-bold shadow-lg ${canClockInToday
                                                            ? "bg-[#e8c559] hover:bg-[#d4a843] text-[#171611] cursor-pointer"
                                                            : "bg-gray-500/20 text-gray-400 cursor-not-allowed border border-gray-500/30"
                                                            }`}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                                                        </svg>
                                                        Clock In
                                                    </button>
                                                    {!canClockInToday && (
                                                        <div className="absolute bottom-full mb-2 left-0 w-max max-w-[200px] p-3 bg-black !text-white text-xs font-medium rounded-xl text-center opacity-0 group-hover/clockin:opacity-100 transition-opacity pointer-events-none z-[100] shadow-2xl border border-white/20">
                                                            Setelah mengajukan WFH/WFA jangan lupa melakukan Absensi disini sesuai jam kerja
                                                        </div>
                                                    )}
                                                </div>
                                            ) : !checkinState.isClockedOut ? (
                                                <button
                                                    onClick={handleClockOut}
                                                    className="bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center gap-2 px-6 h-12 rounded-xl text-sm tracking-wide transition-colors font-bold shadow-lg"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                                                    </svg>
                                                    Clock Out
                                                </button>
                                            ) : (
                                                <div className="px-6 py-3 rounded-xl bg-gray-500/20 border border-gray-500/30 text-gray-400 text-sm font-bold flex items-center gap-2">
                                                    ✅ Selesai Hari Ini
                                                </div>
                                            )}

                                            {/* Clock Times Badge */}
                                            {checkinState.isClockedIn && (
                                                <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm font-medium flex items-center gap-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-green-400 text-xs">🟢</span>
                                                        <span style={{ color: 'white' }}>Clock In</span>
                                                        <span className="font-bold" style={{ color: 'white' }}>{checkinState.clockInTime}</span>
                                                        {checkinState.isLate && <span className="text-amber-400 text-xs">(Telat)</span>}
                                                    </div>
                                                    {checkinState.isClockedOut && (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-rose-400 text-xs">🔴</span>
                                                            <span style={{ color: 'white' }}>Clock Out</span>
                                                            <span className="font-bold" style={{ color: 'white' }}>{checkinState.clockOutTime}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ==================== SLIDE 2: Profile + Workload Preview ==================== */}
                    {/* ==================== SLIDE 2: Profile + Workload Preview ==================== */}
                    <div className="w-full flex-shrink-0 relative min-h-[360px] group">
                        {/* Background Image */}
                        <div
                            className="absolute inset-0 bg-cover bg-center z-0 transition-transform duration-700 group-hover:scale-105"
                            style={{
                                backgroundImage: `url('/rashel-o-m7eb02LR9eA-unsplash.jpg')`,
                            }}
                        />
                        {/* Dark Overlay for text readability */}
                        <div className="absolute inset-0 bg-gradient-to-r from-[#171611]/95 via-[#171611]/85 to-[#171611]/60 z-10" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#171611]/80 via-transparent to-transparent z-10" />

                        <div className="relative z-20 p-6 sm:p-8 h-full flex flex-col">
                            {/* Two Column Layout */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
                                {/* LEFT COLUMN: Profile + Workload (Combined in ONE frame) */}
                                {/* Dark: amber/gold bg | Light: glassmorphism */}
                                <Card className="bg-card border-border backdrop-blur-md flex flex-col h-full shadow-lg">
                                    <CardContent className="p-4 flex flex-col h-full">
                                        {/* Profile Section */}
                                        <div className="flex items-center gap-4 pb-3 border-b dark:border-[#3d3520] border-white/20">
                                            {profile?.avatar_url ? (
                                                <div className="w-12 h-12 rounded-full overflow-hidden shadow-lg ring-2 ring-white/10 flex-shrink-0">
                                                    <Image
                                                        src={profile.avatar_url}
                                                        alt="Avatar"
                                                        width={48}
                                                        height={48}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#e8c559] to-[#d4a843] flex items-center justify-center text-lg font-bold text-[#171611] shadow-lg ring-2 ring-white/10 flex-shrink-0">
                                                    {(profile?.full_name || 'User').charAt(0)}
                                                </div>
                                            )}

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-lg font-bold dark:text-white text-black truncate">{profile?.full_name || 'Loading...'}</h4>
                                                </div>
                                                <StatusEditor
                                                    initialStatus={statusMessage}
                                                    onSave={saveStatusMessage}
                                                />
                                            </div>
                                        </div>

                                        {/* Workload Section */}
                                        <div className="pt-3 flex-1">
                                            <div className="flex items-center justify-between mb-4">
                                                <span className={`text-[10px] font-bold px-3 py-1 rounded-md border bg-white/5 ${workloadPercentage > 100 ? 'text-rose-400 border-rose-400/30' :
                                                    workloadPercentage >= 80 ? 'text-orange-400 border-orange-400/30' :
                                                        workloadPercentage >= 70 ? 'text-emerald-400 border-emerald-400/30' :
                                                            'text-blue-400 border-blue-400/30'
                                                    }`}>
                                                    {workloadPercentage > 100 ? 'Overload' :
                                                        workloadPercentage >= 80 ? 'Heavy' :
                                                            workloadPercentage >= 70 ? 'Safe' : 'Idle'}
                                                </span>
                                                <div className={`flex items-baseline gap-1 ${workloadPercentage > 100 ? 'text-rose-400' :
                                                    workloadPercentage >= 80 ? 'text-orange-400' :
                                                        workloadPercentage >= 70 ? 'text-emerald-400' :
                                                            'text-blue-400'
                                                    }`}>
                                                    <span className="text-2xl font-bold">{totalWorkload}</span>
                                                    <span className="text-xs font-medium opacity-70">/ {maxCapacity} Slots</span>
                                                </div>
                                            </div>

                                            {/* Workload Bar */}
                                            <div className="mb-4">
                                                <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden flex">
                                                    {workloadItems.map((item, idx) => {
                                                        // Map category to color
                                                        const colorMap: Record<string, string> = {
                                                            "Project": "bg-purple-500",
                                                            "Proposal": "bg-amber-500",
                                                            "Presentation": "bg-pink-500",
                                                            "Support": "bg-emerald-500",
                                                            "Etc": "bg-slate-500",
                                                        };
                                                        const colorClass = colorMap[item.category] || "bg-slate-500";
                                                        return (
                                                            <div
                                                                key={item.id || idx}
                                                                className={`h-full transition-all ${colorClass}`}
                                                                style={{ flex: item.slots }} // Use slots as weight
                                                            />
                                                        );
                                                    })}
                                                    {totalWorkload < maxCapacity && (
                                                        <div
                                                            className="h-full bg-transparent"
                                                            style={{ flex: maxCapacity - totalWorkload }}
                                                        />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Project List - Expanded to fill space */}
                                            <div className="space-y-2 flex-1 overflow-y-auto min-h-[120px] pr-1">
                                                {workloadItems.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center h-full text-white/40">
                                                        <p className="text-sm italic">No active workload</p>
                                                    </div>
                                                ) : (
                                                    workloadItems.map((item, idx) => {
                                                        const colorMap: Record<string, string> = {
                                                            "Project": "bg-purple-500",
                                                            "Proposal": "bg-amber-500",
                                                            "Presentation": "bg-pink-500",
                                                            "Support": "bg-emerald-500",
                                                            "Etc": "bg-slate-500",
                                                        };
                                                        const colorClass = colorMap[item.category] || "bg-slate-500";

                                                        return (
                                                            <div key={item.id || idx} className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                                                                <div className="flex items-center gap-3 overflow-hidden">
                                                                    <div className={`w-2.5 h-2.5 flex-shrink-0 rounded-full ${colorClass}`} />
                                                                    <div className="flex flex-col min-w-0">
                                                                        <span className="text-sm font-bold text-white truncate">{item.name}</span>
                                                                        <span className="text-xs text-white/50">{item.category} • {item.intensity}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-1 bg-white/5 px-2.5 py-1.5 rounded text-xs font-bold text-white/80">
                                                                    {item.slots}
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>

                                            {/* Capacity */}
                                            {/* Capacity Footer (Hidden as it is now in Header) */}
                                            {/* <div className="mt-2 text-center text-[9px] text-white/20">Updated just now</div> */}

                                            {/* Quick Link to Team Workload */}
                                            <div className="mt-2 pt-2 border-t border-white/5 flex justify-center">
                                                <Link
                                                    href="/dashboard/workload"
                                                    className="inline-flex items-center gap-1 text-sm font-bold dark:text-[#e8c559] text-black hover:underline"
                                                >
                                                    View Team Workload
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </Link>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* RIGHT COLUMN: Daily Plan with Add Task */}
                                {/* Dark: amber/gold bg | Light: glassmorphism */}
                                <Card className="bg-card border-border backdrop-blur-md flex flex-col h-full shadow-lg">
                                    <CardContent className="p-4 flex flex-col h-full">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-base">📝</span>
                                                <h4 className="font-bold dark:text-white text-[#1a1a1a] text-base">Daily Plan</h4>
                                            </div>
                                            <span className="text-xs font-medium dark:text-white/60 text-[#1a1a1a]/60 px-2 py-0.5 rounded-full dark:bg-white/10 bg-black/10">
                                                {dailyPlan.filter(t => t.completed).length}/{dailyPlan.length} done
                                            </span>
                                        </div>

                                        {/* Add New Task Form - Neutral & Clean */}
                                        <TaskEditor onAddTask={addTask} />

                                        {/* Task List - Expanded & Larger - Fixed Height Scrollable */}
                                        <Reorder.Group
                                            axis="y"
                                            values={dailyPlan}
                                            onReorder={handleReorder}
                                            className="space-y-3 flex-1 overflow-y-auto h-[320px] max-h-[320px] pr-2 mt-4 custom-scrollbar"
                                        >
                                            {dailyPlan.length === 0 ? (
                                                <div className="text-center py-10 dark:text-white/30 text-black/30 flex flex-col items-center justify-center h-full">
                                                    <span className="text-4xl block mb-3 opacity-50">✨</span>
                                                    <p className="text-sm font-medium">Ready for a productive day!</p>
                                                </div>
                                            ) : (
                                                <>
                                                    {dailyPlan.map(task => (
                                                        <Reorder.Item
                                                            key={task.id}
                                                            value={task}
                                                            onDragEnd={handleDragEnd}
                                                            dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
                                                            whileDrag={{ scale: 1.02, boxShadow: "0 8px 20px rgba(0,0,0,0.15)", cursor: "grabbing" }}
                                                            layout
                                                            onClick={(e) => {
                                                                handleToggleTask(task.id);
                                                            }}
                                                            className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer group ${task.completed
                                                                ? 'bg-emerald-500/5 border-emerald-500/20 opacity-60 hover:opacity-100'
                                                                : 'dark:bg-white/5 bg-stone-50 border-stone-200 dark:border-white/5 hover:border-stone-300 dark:hover:border-white/20 shadow-sm'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${task.completed ? 'bg-emerald-500 border-emerald-500' : 'dark:border-white/30 border-stone-400 group-hover:border-stone-500 dark:group-hover:border-white/50'
                                                                    }`}>
                                                                    {task.completed && (
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                        </svg>
                                                                    )}
                                                                </div>
                                                                <span className={`text-base font-medium transition-all ${task.completed ? 'dark:text-white/40 text-black/40 line-through' : 'dark:text-white/90 text-stone-900'
                                                                    }`}>
                                                                    {task.text}
                                                                </span>
                                                            </div>

                                                            {task.priority === 'high' && !task.completed && (
                                                                <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30">HIGH</span>
                                                            )}
                                                            {task.priority === 'medium' && !task.completed && (
                                                                <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">MID</span>
                                                            )}

                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    removeTask(task.id);
                                                                }}
                                                                className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                                                                title="Delete Task"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </Reorder.Item>
                                                    ))}
                                                    {/* Filler div to ensure scroll for few items if height is fixed, but overflow-y-auto handles resizing automatically */}
                                                </>
                                            )}
                                        </Reorder.Group>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>

                    {/* ==================== SLIDE 3: Career Development ==================== */}
                    {
                        !isIntern && profile?.role !== 'ceo' && (
                            <div className="w-full flex-shrink-0 relative min-h-[400px] group">
                                {/* Background with darker overlay for better text contrast */}
                                <div
                                    className="absolute inset-0 bg-cover bg-center z-0"
                                    style={{
                                        backgroundImage: `url('/jason-cooper-XEhchWQuWyM-unsplash.jpg')`,
                                    }}
                                />
                                <div className="absolute inset-0 bg-[#0f0f0d]/90 z-10" />

                                {/* Content Container - Unified Single View */}
                                <div className="relative z-20 p-8 h-full flex flex-col min-h-[400px]">

                                    {/* 1. Header: Profile & Career Level */}
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-[#e8c559]/20 pb-6">
                                        <div className="flex items-center gap-5">
                                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#e8c559] to-[#d4a843] flex items-center justify-center text-2xl font-bold text-[#171611] shadow-lg ring-4 ring-[#e8c559]/20">
                                                {(profile?.full_name || 'User').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-bold !text-white tracking-tight">{profile?.full_name || 'Loading...'}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="!text-[#f4d875] font-bold">{profile?.job_title || 'Employee'}</span>
                                                    <span className="!text-white/30">•</span>
                                                    <span className="!text-white/60 text-sm">{profile?.job_level || 'Level 2 Analyst'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Spacer for layout - removed career progression bars */}
                                    </div>

                                    {/* 2. Main Content Grid */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">

                                        {/* Col 1: Performance Summary (KPI) */}
                                        <div className="lg:col-span-1 flex flex-col gap-4">
                                            <h4 className="text-sm font-bold !text-[#f4d875] uppercase tracking-wider flex items-center gap-2">
                                                <Target className="w-4 h-4" /> Performance
                                            </h4>
                                            <div className="bg-[#e8c559]/10 dark:bg-white/5 rounded-2xl p-6 border border-[#e8c559]/20 dark:border-white/10 flex-1 hover:bg-[#e8c559]/20 dark:hover:bg-white/10 transition-colors group/card shadow-lg dark:shadow-none">
                                                <div className="flex items-end gap-3 mb-6">
                                                    <span className="text-6xl font-black !text-white tracking-tighter drop-shadow-lg">
                                                        {kpiStats?.final_score ? Number(kpiStats.final_score).toFixed(1) : '—'}
                                                    </span>
                                                    <span className="text-lg !text-gray-300 font-medium mb-1.5">/ 5.0</span>
                                                </div>
                                                <div className="space-y-3 mb-6">
                                                    {[
                                                        { label: 'Knowledge', score: kpiStats?.score_knowledge, color: 'bg-blue-500', shadow: 'shadow-[0_0_10px_rgba(59,130,246,0.5)]' },
                                                        { label: 'People', score: kpiStats?.score_people, color: 'bg-emerald-500', shadow: 'shadow-[0_0_10px_rgba(16,185,129,0.5)]' },
                                                        { label: 'Service', score: kpiStats?.score_service, color: 'bg-indigo-500', shadow: 'shadow-[0_0_10px_rgba(99,102,241,0.5)]' },
                                                        { label: 'Business', score: kpiStats?.score_business, color: 'bg-purple-500', shadow: 'shadow-[0_0_10px_rgba(168,85,247,0.5)]' },
                                                        { label: 'Leadership', score: kpiStats?.score_leadership, color: 'bg-rose-500', shadow: 'shadow-[0_0_10px_rgba(244,63,94,0.5)]' },
                                                    ]
                                                        .filter(pillar => {
                                                            // Hide Leadership pillar for Analyst I-II (job_level contains 'Analyst I' or 'Analyst II' but not 'Analyst III')
                                                            if (pillar.label === 'Leadership') {
                                                                const jobLevel = profile?.job_level?.toLowerCase() || '';
                                                                const isAnalystI_II = (jobLevel.includes('analyst i') || jobLevel.includes('analyst ii')) && !jobLevel.includes('analyst iii');
                                                                return !isAnalystI_II; // Show only if NOT Analyst I-II
                                                            }
                                                            return true;
                                                        })
                                                        .map((pillar) => (
                                                            <div key={pillar.label} className="flex justify-between text-sm">
                                                                <span className="!text-gray-200 font-medium">{pillar.label}</span>
                                                                <div className="h-1.5 w-24 bg-gray-700/50 rounded-full overflow-hidden self-center border border-white/5">
                                                                    <div
                                                                        className={`h-full ${pillar.color} ${pillar.shadow}`}
                                                                        style={{ width: `${((pillar.score || 0) / 5) * 100}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                                <Link
                                                    href="/dashboard/my-kpi"
                                                    className="inline-flex items-center gap-2 !text-[#f4d875] text-sm font-bold hover:gap-3 transition-all"
                                                >
                                                    Full Report <ArrowRight className="h-4 w-4" />
                                                </Link>
                                            </div>
                                        </div>

                                        {/* Col 2: Attendance (NEW Replaces Learning) */}
                                        <div className="lg:col-span-1 flex flex-col gap-4">
                                            <h4 className="text-sm font-bold !text-[#f4d875] uppercase tracking-wider flex items-center gap-2">
                                                <Clock className="w-4 h-4" /> Attendance
                                            </h4>
                                            <div className="bg-[#e8c559]/10 dark:bg-white/5 rounded-2xl p-6 border border-[#e8c559]/20 dark:border-white/10 flex-1 flex flex-col justify-between hover:bg-[#e8c559]/20 dark:hover:bg-white/10 transition-colors shadow-lg dark:shadow-none">
                                                <div className="flex gap-4">
                                                    <div className="flex-1 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-center">
                                                        <div className="text-2xl font-bold text-blue-400">{attendanceStats?.total || 0}</div>
                                                        <div className="text-[10px] text-blue-200 uppercase tracking-wider">Total Days</div>
                                                    </div>
                                                    <div className="flex-1 p-3 bg-rose-500/10 rounded-xl border border-rose-500/20 text-center">
                                                        <div className="text-2xl font-bold text-rose-400">{attendanceStats?.late || 0}</div>
                                                        <div className="text-[10px] text-rose-200 uppercase tracking-wider">Late Days</div>
                                                    </div>
                                                </div>

                                                <div className="mt-4">
                                                    <div className="flex justify-between text-xs !text-gray-300 mb-2">
                                                        <span>Late Percentage</span>
                                                        <span className="!text-white font-bold">{attendanceStats?.percent.toFixed(1)}%</span>
                                                    </div>
                                                    <div className="h-2 w-full bg-gray-700/50 rounded-full overflow-hidden border border-white/5 relative">
                                                        <div
                                                            className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 transition-all duration-500"
                                                            style={{ width: `${Math.min((attendanceStats?.percent || 0) * 5, 100)}%` }}
                                                        />
                                                    </div>
                                                    <p className="text-[10px] !text-gray-400 mt-2 italic">
                                                        {(attendanceStats?.percent || 0) <= 2 ? "Excellent! On time." :
                                                            (attendanceStats?.percent || 0) <= 5 ? "Very Good." :
                                                                "Needs Improvement."}
                                                    </p>
                                                </div>

                                                <Link
                                                    href="/dashboard/my-request/attendance"
                                                    className="mt-4 w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 !text-white text-xs font-bold uppercase tracking-wider rounded-lg text-center transition-colors"
                                                >
                                                    Detailed History
                                                </Link>
                                            </div>
                                        </div>

                                        {/* Col 3: Quick Actions */}
                                        <div className="lg:col-span-1 flex flex-col gap-4">
                                            <h4 className="text-sm font-bold !text-[#f4d875] uppercase tracking-wider flex items-center gap-2">
                                                <Zap className="w-4 h-4" /> Quick Actions
                                            </h4>
                                            <div className="grid grid-rows-3 gap-3 flex-1">
                                                <Link
                                                    href="/dashboard/my-request/training"
                                                    className="flex items-center gap-4 p-4 rounded-xl bg-[#e8c559]/10 dark:bg-white/5 border border-[#e8c559]/20 dark:border-white/10 hover:bg-[#e8c559]/20 dark:hover:bg-white/10 hover:border-[#e8c559]/30 dark:hover:border-white/20 transition-all group"
                                                >
                                                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                                                        <Plus className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold !text-white text-sm">Request Training</div>
                                                        <div className="text-[10px] !text-gray-300">Ajukan pelatihan baru</div>
                                                    </div>
                                                    <ArrowRight className="ml-auto w-4 h-4 !text-white/50 group-hover:!text-white group-hover:translate-x-1 transition-all" />
                                                </Link>

                                                <Link
                                                    href="/dashboard/knowledge"
                                                    className="flex items-center gap-4 p-4 rounded-xl bg-[#e8c559]/10 dark:bg-white/5 border border-[#e8c559]/20 dark:border-white/10 hover:bg-[#e8c559]/20 dark:hover:bg-white/10 hover:border-[#e8c559]/30 dark:hover:border-white/20 transition-all group"
                                                >
                                                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                                                        <BookOpen className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold !text-white text-sm">Knowledge Hub</div>
                                                        <div className="text-[10px] !text-gray-300">Akses materi belajar</div>
                                                    </div>
                                                    <ArrowRight className="ml-auto w-4 h-4 !text-white/50 group-hover:!text-white group-hover:translate-x-1 transition-all" />
                                                </Link>

                                                <Link
                                                    href="/dashboard/my-request/one-on-one"
                                                    className="flex items-center gap-4 p-4 rounded-xl bg-[#e8c559]/10 dark:bg-white/5 border border-[#e8c559]/20 dark:border-white/10 hover:bg-[#e8c559]/20 dark:hover:bg-white/10 hover:border-[#e8c559]/30 dark:hover:border-white/20 transition-all group"
                                                >
                                                    <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform">
                                                        <Users className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold !text-white text-sm">Request 1-on-1</div>
                                                        <div className="text-[10px] !text-gray-300">Sesi diskusi karier</div>
                                                    </div>
                                                    <ArrowRight className="ml-auto w-4 h-4 !text-white/50 group-hover:!text-white group-hover:translate-x-1 transition-all" />
                                                </Link>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </div>
                        )
                    }
                </div >
                {/* End of Carousel Inner */}

                {/* Navigation Arrows */}
                <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between px-2 pointer-events-none z-40">
                    <button
                        onClick={handlePrevSlide}
                        className={`p-2 rounded-full bg-black/30 text-white backdrop-blur-md border border-white/10 hover:bg-black/50 transition-all pointer-events-auto ${activeSlide === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                        aria-label="Previous slide"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                        onClick={handleNextSlide}
                        className={`p-2 rounded-full bg-black/30 text-white backdrop-blur-md border border-white/10 hover:bg-black/50 transition-all pointer-events-auto ${activeSlide === 2 || (!isIntern && profile?.role !== 'ceo' && activeSlide === 2) || (isIntern && activeSlide === 1) ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                        aria-label="Next slide"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>

                {/* Dot Indicators - Inside Carousel Wrapper */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
                    <button
                        onClick={() => setActiveSlide(0)}
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${activeSlide === 0
                            ? 'bg-[#e8c559] w-6'
                            : 'bg-white/30 hover:bg-white/50'
                            }`}
                        aria-label="Go to slide 1"
                    />
                    <button
                        onClick={() => setActiveSlide(1)}
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${activeSlide === 1
                            ? 'bg-[#e8c559] w-6'
                            : 'bg-white/30 hover:bg-white/50'
                            }`}
                        aria-label="Go to slide 2"
                    />
                    {!isIntern && profile?.role !== 'ceo' && (
                        <button
                            onClick={() => setActiveSlide(2)}
                            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${activeSlide === 2
                                ? 'bg-[#e8c559] w-6'
                                : 'bg-white/30 hover:bg-white/50'
                                }`}
                            aria-label="Go to slide 3"
                        />
                    )}
                </div>
            </Card >
            {/* End of Carousel Wrapper */}


            {/* Row 2: Today's Team (LEFT) + Announcement (RIGHT) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Today's Team Status - Names with Status */}
                {/* Team Activity */}
                {/* Today's Team Status - Names with Status */}
                {/* Team Activity */}
                <Card className="rounded-3xl flex flex-col h-[600px] overflow-hidden bg-card border-border backdrop-blur-md shadow-xl">
                    <CardHeader className="p-5 border-b border-border flex flex-row items-center justify-between space-y-0 bg-inherit backdrop-blur-xl">
                        <div>
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                Team Activity
                                <Badge variant="secondary" className="text-xs font-normal px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20">
                                    {teamStatuses.length} Active
                                </Badge>
                            </CardTitle>
                            <CardDescription className="text-xs mt-0.5">Real-time team status updates</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            {/* Filter buttons could go here if needed */}
                        </div>
                    </CardHeader>

                    <div className="flex-1 overflow-hidden flex flex-col">
                        {/* Fixed User Section - Always Visible */}
                        <div className="p-4 pb-0">
                            {(() => {
                                const user = teamStatuses.find(m => m.id === profile?.id);
                                if (!user) return null;

                                const userWithTasks = {
                                    ...user,
                                    tasks: dailyPlan.filter(t => !t.completed).map(t => ({ name: t.text, priority: t.priority }))
                                };
                                const memberStatusInfo = statusOptions.find(s => s.id === userWithTasks.status);

                                const StatusIcon = memberStatusInfo?.Icon;
                                return (
                                    <div className="p-4 rounded-2xl bg-[var(--glass-bg)] border-2 border-[var(--primary)]/20 hover:border-[var(--primary)]/40 transition-all cursor-pointer group mb-3 shadow-md">
                                        <div className="flex items-center gap-4 mb-3">
                                            <div className="relative flex-shrink-0">
                                                {userWithTasks.avatarUrl ? (
                                                    <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-[var(--primary)]/30">
                                                        <Image
                                                            src={userWithTasks.avatarUrl}
                                                            alt={userWithTasks.name}
                                                            width={56}
                                                            height={56}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary)]/70 flex items-center justify-center text-base text-[var(--primary-foreground)] font-bold ring-2 ring-[var(--primary)]/30">
                                                        {userWithTasks.avatar}
                                                    </div>
                                                )}
                                                {/* Online indicator */}
                                                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-[var(--glass-bg)]" />
                                            </div>
                                            <div className="flex-1 min-w-0 flex items-start gap-3">
                                                <div className="flex flex-col min-w-[120px] max-w-[200px]">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-sm truncate text-[var(--text-primary)]">
                                                            {userWithTasks.name}
                                                        </span>
                                                        <span className="text-xs text-[var(--primary)] font-medium">(You)</span>
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold ${memberStatusInfo?.color} text-white shadow-sm`}>
                                                            {StatusIcon && <StatusIcon className="w-3 h-3" />}
                                                            {memberStatusInfo?.label}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{userWithTasks.role}</p>
                                                </div>

                                                {userWithTasks.personalNote && (
                                                    <div className="flex-1 min-w-0">
                                                        <div className="relative w-fit max-w-full bg-gray-100 dark:bg-white/10 px-3 py-2 rounded-2xl rounded-tl-none text-xs text-[var(--text-primary)] leading-snug break-words">
                                                            {userWithTasks.personalNote}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {userWithTasks.tasks && userWithTasks.tasks.length > 0 && (
                                            <div className="pl-[72px] flex flex-wrap gap-2">
                                                {userWithTasks.tasks.slice(0, 3).map((task, idx) => (
                                                    <span key={idx} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium ${taskPriorityColors[task.priority as keyof typeof taskPriorityColors] || taskPriorityColors.medium}`}>
                                                        {task.name}
                                                    </span>
                                                ))}
                                                {userWithTasks.tasks.length > 3 && (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-medium bg-[var(--glass-border)] text-[var(--text-muted)]">
                                                        +{userWithTasks.tasks.length - 3} more
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                            <div className="h-px bg-[var(--glass-border)] w-full mb-2"></div>
                        </div>

                        {/* Scrollable Other Members */}
                        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3 custom-scrollbar">
                            {teamStatuses
                                .filter(m => m.id !== profile?.id && m.job_type !== 'hr' && m.role?.toLowerCase() !== 'hr' && !m.role?.toLowerCase().includes('human resource'))
                                .map(member => {
                                    const memberStatusInfo = statusOptions.find(s => s.id === member.status);
                                    const StatusIcon = memberStatusInfo?.Icon;
                                    return (
                                        <div key={member.id} className="p-4 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-[var(--primary)]/30 transition-all cursor-pointer group">
                                            <div className="flex items-center gap-4 mb-3">
                                                <div className="relative flex-shrink-0">
                                                    {member.avatarUrl ? (
                                                        <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-[var(--glass-border)]">
                                                            <Image
                                                                src={member.avatarUrl}
                                                                alt={member.name}
                                                                width={48}
                                                                height={48}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary)]/70 flex items-center justify-center text-sm text-[var(--primary-foreground)] font-bold ring-2 ring-[var(--glass-border)]">
                                                            {member.avatar}
                                                        </div>
                                                    )}
                                                    {/* Online indicator */}
                                                    <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-[var(--glass-bg)] ${memberStatusInfo?.color.replace('bg-', 'bg-') || 'bg-gray-400'}`} />
                                                </div>
                                                <div className="flex-1 min-w-0 flex items-start gap-3">
                                                    <div className="flex flex-col min-w-[120px] max-w-[200px]">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-sm text-[var(--text-primary)] truncate">{member.name}</span>
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold ${memberStatusInfo?.color} text-white`}>
                                                                {StatusIcon && <StatusIcon className="w-2.5 h-2.5" />}
                                                                {memberStatusInfo?.label}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{member.role}</p>
                                                    </div>

                                                    {member.personalNote && (
                                                        <div className="flex-1 min-w-0">
                                                            <div className="relative w-fit max-w-full bg-gray-100 dark:bg-white/10 px-3 py-2 rounded-2xl rounded-tl-none text-xs text-[var(--text-primary)] leading-snug break-words">
                                                                {member.personalNote}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {
                                                member.tasks && member.tasks.length > 0 && (
                                                    <div className="pl-[64px] flex flex-wrap gap-1.5">
                                                        {member.tasks.map((task, idx) => (
                                                            <span key={idx} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-medium ${taskPriorityColors[task.priority as keyof typeof taskPriorityColors] || taskPriorityColors.medium}`}>
                                                                {task.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )
                                            }
                                        </div>
                                    );
                                })}
                        </div>
                    </div>

                    {/* Bottom spacer for aesthetics */}
                    <div className="p-3 border-t border-[var(--glass-border)] bg-black/5 dark:bg-white/5 backdrop-blur-sm">
                        <div className="flex items-center justify-center gap-2 text-xs font-bold text-transparent select-none py-1.5 pointer-events-none">
                            Spacer Content
                            <ChevronRight className="h-3 w-3 opacity-0" />
                        </div>
                    </div>
                </Card>

                {/* Announcements Section */}
                <Card className="rounded-3xl flex flex-col h-[600px] overflow-hidden bg-card border-border backdrop-blur-md shadow-xl">
                    <CardHeader className="p-5 border-b border-border flex flex-row items-center justify-between sticky top-0 bg-inherit backdrop-blur-xl z-20 space-y-0">
                        <div>
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                Company News
                                <Badge variant="secondary" className="text-xs font-normal px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20">
                                    Latest
                                </Badge>
                            </CardTitle>
                            <CardDescription className="text-xs mt-0.5">Official updates from Management</CardDescription>
                        </div>
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary ring-4 ring-primary/5">
                            <Megaphone className="h-4 w-4" />
                        </div>
                    </CardHeader>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {announcements.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground">
                                <p className="text-sm">No new announcements</p>
                            </div>
                        ) : (
                            announcements.slice(0, 5).map((announcement) => (
                                <div key={announcement.id} className="group flex gap-3 p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-border/50">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-sm bg-[var(--primary)] text-[var(--primary-foreground)]`}>
                                        {announcement.author?.full_name ? announcement.author.full_name[0].toUpperCase() : "A"}
                                    </div>

                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-primary transition-colors">{announcement.title}</h4>
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">{announcement.author?.role || "Management"}</p>
                                            </div>
                                            <span className="text-[10px] text-[var(--text-muted)] font-mono whitespace-nowrap ml-2 bg-secondary/50 px-1.5 py-0.5 rounded">
                                                {new Date(announcement.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all">
                                            {announcement.content}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-3 border-t border-[var(--glass-border)] bg-black/5 dark:bg-white/5 backdrop-blur-sm">
                        <Link href="/dashboard/announcements" className="flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors py-1.5">
                            View Announcement Archive
                            <ChevronRight className="h-3 w-3" />
                        </Link>
                    </div>
                </Card>
            </div >

            {/* Update Plan Modal */}
            {
                showUpdatePlanModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-card border-border border rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl relative">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#e8c559]" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                    </svg>
                                    Update Daily Plan
                                </h2>
                                <button
                                    onClick={() => setShowUpdatePlanModal(false)}
                                    className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[var(--text-secondary)]" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                    </svg>
                                </button>
                            </div>

                            {/* Add New Task */}
                            <div className="flex gap-2 mb-6">
                                <input
                                    type="text"
                                    placeholder="Add a new task..."
                                    value={newTaskText}
                                    onChange={(e) => setNewTaskText(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            addTask(newTaskText, newTaskPriority as "high" | "medium" | "low");
                                            setNewTaskText("");
                                        }
                                    }}
                                    className="flex-1 p-3 rounded-lg bg-black/10 dark:bg-black/30 border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none"
                                />
                                <select
                                    value={newTaskProject}
                                    onChange={(e) => setNewTaskProject(e.target.value)}
                                    className="px-3 rounded-lg bg-black/10 dark:bg-black/30 border border-[var(--glass-border)] text-[var(--text-primary)] focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none"
                                >
                                    <option value="General">General</option>
                                    <option value="Project ABC">Project ABC</option>
                                    <option value="Project XYZ">Project XYZ</option>
                                </select>
                                <button
                                    onClick={() => {
                                        addTask(newTaskText, newTaskPriority as "high" | "medium" | "low");
                                        setNewTaskText("");
                                    }}
                                    className="px-4 rounded-lg bg-[#e8c559] text-[#1c2120] font-bold hover:bg-[#ebd07a] transition-colors"
                                >
                                    Add
                                </button>
                            </div> {/* Close Add Task row */}
                            {/* Task List */}
                            <div className="space-y-3 mb-6">
                                {dailyPlan.map(task => (
                                    <div
                                        key={task.id}
                                        className="flex items-center gap-3 p-3 bg-black/10 dark:bg-black/20 rounded-lg border border-[var(--glass-border)]"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={task.completed}
                                            onChange={() => handleToggleTask(task.id)}
                                            className="h-5 w-5 rounded border-[var(--glass-border)] border-2 bg-transparent text-[#e8c559] checked:bg-[#e8c559] checked:border-[#e8c559] focus:ring-0"
                                        />
                                        <div className="flex-1">
                                            <p className={`text-[var(--text-primary)] font-medium ${task.completed ? 'line-through opacity-60' : ''}`}>
                                                {task.text}
                                            </p>
                                            <p className="text-xs text-[var(--text-secondary)]">{task.project}</p>
                                        </div>
                                        <button
                                            onClick={() => removeTask(task.id)}
                                            className="p-1 hover:bg-rose-500/20 rounded text-[var(--text-secondary)] hover:text-rose-400 transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowUpdatePlanModal(false)}
                                    className="flex-1 py-3 rounded-lg border border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => setShowUpdatePlanModal(false)}
                                    className="flex-1 py-3 rounded-lg bg-[#e8c559] text-[#1c2120] font-bold hover:bg-[#ebd07a] transition-colors"
                                >
                                    Save Plan
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }




            {/* Change Status Modal */}
            {
                showChangeStatusModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-card border-border border rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#e8c559]" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z" />
                                    </svg>
                                    Change Status
                                </h2>
                                <button
                                    onClick={() => setShowChangeStatusModal(false)}
                                    className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[var(--text-secondary)]" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                    </svg>
                                </button>
                            </div>

                            <p className="text-[var(--text-secondary)] text-sm mb-4">
                                Current status: <span className={`font-bold ${STATUS_CONFIG[currentStatus].textClass}`}>{STATUS_CONFIG[currentStatus].label}</span>
                            </p>

                            {/* Status Options */}
                            <div className="space-y-3">
                                {(Object.entries(STATUS_CONFIG) as [AttendanceStatus, typeof STATUS_CONFIG.office][]).map(([key, config]) => (
                                    <button
                                        key={key}
                                        onClick={() => handleStatusChange(key)}
                                        className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${currentStatus === key
                                            ? 'bg-[var(--primary-main)]/10 dark:bg-[var(--primary)]/10 border-[var(--primary-main)]/30 dark:border-[var(--primary)]/30'
                                            : 'bg-black/5 dark:bg-white/5 border-[var(--glass-border)] hover:border-[var(--primary-main)]/30 dark:hover:border-[var(--primary)]/30'
                                            }`}
                                    >
                                        <div className={`size-10 rounded-full flex items-center justify-center ${config.bgClass}`}>
                                            {getStatusIcon(key)}
                                        </div>
                                        <div className="text-left flex-1">
                                            <p className={`font-bold ${currentStatus === key ? 'text-[var(--primary-main)] dark:text-[var(--primary)]' : 'text-[var(--text-primary)]'}`}>
                                                {config.label}
                                            </p>
                                            <p className="text-xs text-[var(--text-secondary)]">{config.description}</p>
                                        </div>
                                        {currentStatus === key && (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--primary-main)] dark:text-[var(--primary)]" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                            </svg>
                                        )}
                                    </button>
                                ))}
                            </div>

                            <p className="text-xs text-[var(--text-secondary)] mt-4 text-center">
                                Note: Some statuses may require approval from HR
                            </p>
                        </div>
                    </div>
                )
            }

            {/* Check-in Modal */}
            {
                false && ( // showCheckinModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-card border-border border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl relative">
                            {/* Modal Header with Gradient */}
                            <div className="bg-gradient-to-r from-[var(--primary-main)] to-[#5f788e] dark:from-[#1c2120] dark:to-[#2a2f2e] p-6 text-center relative">
                                {/* Close button */}
                                <button
                                    onClick={() => setShowCheckinModal(false)}
                                    className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/20 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/80" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                    </svg>
                                </button>
                                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-bold text-white mb-1">Clock In</h2>
                                <p className="text-white/80 text-sm">
                                    {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                                </p>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6">
                                <p className="text-center text-sm text-[var(--text-secondary)] mb-4">
                                    Pilih status kehadiran (untuk WFH/WFA) atau perizinan (H/H-1):
                                </p>

                                {/* Status Options - WFH/WFA */}
                                <div className="mb-4">
                                    <p className="text-xs text-[var(--text-muted)] mb-3 text-center">📍 Absensi Remote:</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => handleClockIn("wfh")}
                                            className="p-4 rounded-xl bg-purple-500 font-medium flex flex-col items-center gap-2 hover:bg-purple-600 transition-colors shadow-lg text-white"
                                        >
                                            <span className="text-2xl">🏠</span>
                                            <span className="text-sm">Work From Home</span>
                                        </button>
                                        <button
                                            onClick={() => handleClockIn("wfa")}
                                            className="p-4 rounded-xl bg-sky-500 font-medium flex flex-col items-center gap-2 hover:bg-sky-600 transition-colors shadow-lg"
                                            style={{ color: 'white' }}
                                        >
                                            <span className="text-2xl">🌍</span>
                                            <span className="text-sm" style={{ color: 'white' }}>Work From Anywhere</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Perizinan H/H-1 Options */}
                                <div className="border-t border-[var(--glass-border)] pt-4">
                                    <p className="text-xs text-[var(--text-muted)] mb-3 text-center">🚨 Perizinan Hari Ini / H-1:</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => handleClockIn("sick")}
                                            className="px-4 py-3 rounded-xl bg-rose-500/10 border-2 border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm font-medium hover:bg-rose-500/20 hover:border-rose-500/50 transition-all flex items-center justify-center gap-2"
                                        >
                                            <span className="text-lg">🤒</span> Sakit
                                        </button>
                                        <button
                                            onClick={() => handleClockIn("leave")}
                                            className="px-4 py-3 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-600 dark:text-amber-400 text-sm font-medium hover:bg-amber-500/20 hover:border-amber-500/50 transition-all flex items-center justify-center gap-2"
                                        >
                                            <span className="text-lg">📝</span> Izin
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Clock Out Confirmation Modal */}
            {
                showClockOutModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Konfirmasi Clock Out</h3>
                                <p className="text-[var(--text-secondary)] text-sm mb-6">
                                    Apakah anda yakin ingin mengakhiri sesi kerja hari ini? Pastikan semua tugas sudah selesai.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowClockOutModal(false)}
                                        className="flex-1 py-3 rounded-xl border border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 font-bold transition-colors"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={executeClockOut}
                                        className="flex-1 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold transition-colors shadow-lg"
                                    >
                                        Ya, Clock Out
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
