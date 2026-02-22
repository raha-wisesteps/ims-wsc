import { LucideIcon } from "lucide-react";

// ============================================
// BIRTHDAY TYPES
// ============================================
export interface BirthdayPerson {
    full_name: string;
    avatar_url: string | null;
    birth_date: string;
    daysUntil: number; // 0 for today
}

// ============================================
// TASK TYPES
// ============================================
export type TaskPriority = "high" | "medium" | "low";

export interface Task {
    id: number | string; // Allow UUID
    text: string;
    project: string;
    priority: "high" | "medium" | "low";
    completed: boolean;
    position?: number;
}

// ============================================
// ATTENDANCE / STATUS TYPES
// ============================================
export type AttendanceStatus = "office" | "remote" | "wfh" | "wfa" | "sick" | "leave" | "field" | "cuti" | "izin" | "sakit" | "dinas" | "lembur" | "away";

export interface StatusConfigItem {
    label: string;
    bgClass: string;
    textClass: string;
    description: string;
}

export interface StatusOption {
    id: string;
    label: string;
    Icon: LucideIcon;
    color: string;
    gradient: string;
}

// ============================================
// TEAM MEMBER TYPES
// ============================================
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

// ============================================
// CHECKIN STATE
// ============================================
export interface CheckinState {
    isClockedIn: boolean;
    isClockedOut: boolean;
    status: AttendanceStatus | null;
    clockInTime: string | null;
    clockOutTime: string | null;
    isLate: boolean;
    hasApprovedRequest: boolean;
    approvedRequestType: AttendanceStatus | null;
    isForceMajeure: boolean;
}

// ============================================
// CEO STATUS OPTION
// ============================================
export interface CeoStatusOption {
    id: string;
    label: string;
    Icon: LucideIcon;
    color: string;
}
