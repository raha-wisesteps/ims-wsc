import {
    Building2, Home, MapPin, Globe, Umbrella,
    ClipboardList, Briefcase, Clock, Stethoscope, Moon,
} from "lucide-react";
import type { AttendanceStatus, StatusConfigItem, StatusOption, CeoStatusOption } from "../_types/dashboard.types";

// ============================================
// STATUS CONFIGURATION
// White text for ALL modes since hero section has dark background
// ============================================
export const STATUS_CONFIG: Record<string, { label: string; bgClass: string; textClass: string; description: string }> = {
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

// ============================================
// TEAM ACTIVITY STATUS OPTIONS
// Using Lucide icons instead of emoji for cleaner UI
// ============================================
export const statusOptions: { id: string; label: string; Icon: typeof Building2; color: string; gradient: string }[] = [
    { id: "office", label: "OFFICE", Icon: Building2, color: "bg-emerald-500", gradient: "from-emerald-400 to-emerald-600" },
    { id: "remote", label: "REMOTE", Icon: Globe, color: "bg-indigo-500", gradient: "from-indigo-400 to-indigo-600" },
    { id: "wfh", label: "WFH", Icon: Home, color: "bg-purple-500", gradient: "from-purple-400 to-purple-600" },
    { id: "wfa", label: "WFA", Icon: MapPin, color: "bg-sky-500", gradient: "from-sky-400 to-sky-600" },
    { id: "cuti", label: "CUTI", Icon: Umbrella, color: "bg-amber-500", gradient: "from-amber-400 to-amber-600" },
    { id: "izin", label: "IZIN", Icon: ClipboardList, color: "bg-rose-500", gradient: "from-rose-400 to-rose-600" },
    { id: "dinas", label: "DINAS", Icon: Briefcase, color: "bg-blue-500", gradient: "from-blue-400 to-blue-600" },
    { id: "lembur", label: "LEMBUR", Icon: Clock, color: "bg-orange-500", gradient: "from-orange-400 to-orange-600" },
    { id: "sakit", label: "SAKIT", Icon: Stethoscope, color: "bg-pink-500", gradient: "from-pink-400 to-pink-600" },
    { id: "away", label: "AWAY", Icon: Moon, color: "bg-gray-500", gradient: "from-gray-400 to-gray-600" },
];

// ============================================
// TASK PRIORITY COLORS
// ============================================
export const taskPriorityColors: Record<string, string> = {
    high: "bg-pink-500/20 text-pink-600 dark:text-pink-400 border border-pink-500/30",
    medium: "bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30",
    low: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
};

// ============================================
// WORKLOAD CONFIGURATION
// ============================================
export const WORKLOAD_CONFIG = {
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

// ============================================
// INITIAL CHECKIN STATE
// ============================================
export const initialCheckinState = {
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

// ============================================
// DYNAMIC FEEDBACK MESSAGES BASED ON CONTEXT
// ============================================
export const FEEDBACK_MESSAGES = {
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

// ============================================
// CEO STATUS OPTIONS
// ============================================
export const ceoStatusOptions: CeoStatusOption[] = [
    { id: 'office', label: 'Office', Icon: Building2, color: 'bg-emerald-500' },
    { id: 'wfh', label: 'WFH', Icon: Home, color: 'bg-purple-500' },
    { id: 'wfa', label: 'WFA', Icon: MapPin, color: 'bg-sky-500' },
    { id: 'dinas', label: 'Dinas', Icon: Briefcase, color: 'bg-blue-500' },
    { id: 'cuti', label: 'Cuti', Icon: Umbrella, color: 'bg-amber-500' },
    { id: 'izin', label: 'Izin', Icon: ClipboardList, color: 'bg-rose-500' },
    { id: 'sakit', label: 'Sakit', Icon: Stethoscope, color: 'bg-pink-500' },
    { id: 'lembur', label: 'Lembur', Icon: Clock, color: 'bg-orange-500' },
];
