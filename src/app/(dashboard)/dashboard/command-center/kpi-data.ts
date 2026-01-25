
import {
    BookOpen,
    Users,
    Star,
    TrendingUp,
    Award,
    LucideIcon
} from "lucide-react";

export type StaffRole = "analyst_staff" | "analyst_supervisor" | "sales_staff" | "bisdev";

export const ROLE_NAMES: Record<StaffRole, string> = {
    analyst_staff: "Analyst I-II (Staff)",
    analyst_supervisor: "Analyst III - Consultant III (Supervisor)",
    sales_staff: "Sales Executive I-III (Staff)",
    bisdev: "Business Development I-III",
};

export const ROLE_WEIGHTS: Record<StaffRole, Record<string, number>> = {
    analyst_staff: {
        knowledge: 0.30,
        people: 0.20,
        service: 0.20,
        business: 0.20,
        leadership: 0.10,
    },
    analyst_supervisor: {
        knowledge: 0.25,
        people: 0.20,
        service: 0.20,
        business: 0.20,
        leadership: 0.15,
    },
    sales_staff: {
        knowledge: 0.20,
        people: 0.20,
        service: 0.20,
        business: 0.40,
        leadership: 0,
    },
    bisdev: {
        knowledge: 0.20,
        people: 0.20,
        service: 0.20,
        business: 0.35,
        leadership: 0.05,
    },
};

export const SCORE_LEVELS = [
    { min: 0, max: 1.5, label: "Poor", color: "text-rose-500", bg: "bg-rose-500", bgLight: "bg-rose-100" },
    { min: 1.5, max: 2.5, label: "Fair", color: "text-orange-500", bg: "bg-orange-500", bgLight: "bg-orange-100" },
    { min: 2.5, max: 3.5, label: "Good", color: "text-amber-500", bg: "bg-amber-500", bgLight: "bg-amber-100" },
    { min: 3.5, max: 4.5, label: "Very Good", color: "text-teal-500", bg: "bg-teal-500", bgLight: "bg-teal-100" },
    { min: 4.5, max: 5.1, label: "Excellent", color: "text-blue-500", bg: "bg-blue-500", bgLight: "bg-blue-100" },
];

export interface KPIMetric {
    id: string;
    name: string;
    target: number;
    actual: number;
    score: number;
    note?: string;
    unit?: string; // e.g., "hours", "projects", "%"
}

export interface KPIPillar {
    id: string;
    label: string;
    weight: number;
    icon?: any; // We'll map icons in component
    color: string;
    metrics: KPIMetric[];
}

export interface StaffKPI {
    id: string;
    name: string;
    role: StaffRole;
    department: string;
    pillars: {
        knowledge: KPIPillar;
        people: KPIPillar;
        service: KPIPillar;
        business: KPIPillar;
        leadership: KPIPillar;
    };
    feedback?: string; // CEO Note
}

// Helper to create valid structure
const createPillars = (role: StaffRole): StaffKPI['pillars'] => {
    const weights = ROLE_WEIGHTS[role];
    return {
        knowledge: {
            id: "knowledge",
            label: "Passion for Knowledge",
            weight: weights.knowledge,
            color: "blue",
            metrics: [
                { id: "m1", name: "Training Hours", target: 20, actual: 15, score: 3.0, unit: "Hours", note: "On progress" },
                { id: "m2", name: "Knowledge Sharing", target: 2, actual: 2, score: 5.0, unit: "Session", note: "Completed Q1" },
            ]
        },
        people: {
            id: "people",
            label: "Passion for People",
            weight: weights.people,
            color: "emerald",
            metrics: [
                { id: "m3", name: "Attendance", target: 100, actual: 98, score: 4.0, unit: "%" },
                { id: "m4", name: "Team Collaboration", target: 5, actual: 4.5, score: 4.5, unit: "Rating" },
            ]
        },
        service: {
            id: "service",
            label: "Passion for Service",
            weight: weights.service,
            color: "amber",
            metrics: [
                { id: "m5", name: "Client Satisfaction", target: 4.5, actual: 4.5, score: 4.5, unit: "Rating" },
                { id: "m6", name: "Project Delivery", target: 100, actual: 95, score: 4.0, unit: "% On-Time" },
            ]
        },
        business: {
            id: "business",
            label: "Passion for Business",
            weight: weights.service, // Map correctly
            color: "purple",
            metrics: role.includes("sales") ? [
                { id: "m7", name: "Sales Target", target: 500, actual: 450, score: 4.0, unit: "Million IDR" },
            ] : [
                { id: "m8", name: "Utilization Rate", target: 80, actual: 75, score: 3.5, unit: "% Billable" },
            ]
        },
        leadership: {
            id: "leadership",
            label: "Leadership",
            weight: weights.leadership,
            color: "pink",
            metrics: [
                { id: "m9", name: "Initiative", target: 5, actual: 4, score: 4.0, unit: "Rating" },
            ]
        }
    }
}

export const mockStaffData: StaffKPI[] = [
    {
        id: "1",
        name: "Nadia Putri",
        role: "analyst_staff",
        department: "Research & Analysis",
        pillars: createPillars("analyst_staff")
    },
    {
        id: "2",
        name: "Rizky Aditya",
        role: "analyst_supervisor",
        department: "Research & Analysis",
        pillars: createPillars("analyst_supervisor")
    },
    {
        id: "3",
        name: "Dewi Anggraini",
        role: "sales_staff",
        department: "Sales & Marketing",
        pillars: createPillars("sales_staff")
    },
    {
        id: "4",
        name: "Bima Sakti",
        role: "bisdev",
        department: "Business Development",
        pillars: createPillars("bisdev")
    },
];

export const calculateStaffScore = (staff: StaffKPI): number => {
    let totalScore = 0;
    Object.values(staff.pillars).forEach((pillar) => {
        const metricSum = pillar.metrics.reduce((acc, m) => acc + m.score, 0);
        const metricAvg = pillar.metrics.length > 0 ? metricSum / pillar.metrics.length : 0;
        totalScore += metricAvg * pillar.weight;
    });
    return totalScore;
};
