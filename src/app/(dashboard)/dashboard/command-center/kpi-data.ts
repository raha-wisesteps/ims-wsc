
export type StaffRole = 'analyst_staff' | 'analyst_supervisor' | 'sales_staff' | 'bisdev';

export interface KPIMetric {
    id: string; // e.g., "K1", "P1"
    name: string;
    description?: string;
    target?: number | string;
    actual?: number | string;
    score?: number;
    unit?: string;
    type: 'Quantitative' | 'Qualitative';
    method: string;
    weight: number; // Percent 0-100 based on role
    criteria?: string;
}

export interface KPIPillar {
    id: string;
    label: string;
    metrics: KPIMetric[];
    color: string;
}

export interface StaffKPI {
    id?: string;
    employeeName?: string;
    role: StaffRole;
    period?: string;
    pillars: Record<string, KPIPillar>;
}

export const KPI_CATEGORIES = {
    KNOWLEDGE: { id: 'knowledge', label: 'Knowledge', color: 'blue' },
    PEOPLE: { id: 'people', label: 'People', color: 'emerald' },
    SERVICE: { id: 'service', label: 'Service', color: 'indigo' },
    BUSINESS: { id: 'business', label: 'Business', color: 'purple' },
    LEADERSHIP: { id: 'leadership', label: 'Leadership', color: 'rose' }
};

// Helper to check if user has access to metric based on weight > 0
export const hasMetricAccess = (role: StaffRole, metricId: string): boolean => {
    // This will be implemented by checking if weight > 0 for that role
    return true; 
};

// Helper for label mapping
export const getRoleLabel = (role: StaffRole): string => {
    const labels: Record<StaffRole, string> = {
        analyst_staff: "Analyst Level I-II",
        analyst_supervisor: "Analyst Level III+ (Supervisor)",
        sales_staff: "Sales Staff",
        bisdev: "Business Development I-III"
    };
    return labels[role];
};

/**
 * Maps profile data (job_level, job_type) to StaffRole
 * Logic:
 * - job_type = 'hr' → exclude (return null)
 * - job_type = 'bisdev' → 'bisdev'
 * - job_type = 'sales' → 'sales_staff'
 * - job_type = 'analyst' + (Analyst I, Analyst II) → 'analyst_staff'
 * - job_type = 'analyst' + (Analyst III, Consultant I-III, Senior) → 'analyst_supervisor'
 */
export const mapProfileToStaffRole = (
    jobLevel: string | null,
    jobType: string | null
): StaffRole | null => {
    const type = (jobType || '').toLowerCase().trim();
    const level = (jobLevel || '').toLowerCase().trim();
    
    // Exclude HR users
    if (type === 'hr' || level === 'hr') {
        return null;
    }
    
    // Business Development
    if (type === 'bisdev' || type.includes('business') || level.includes('business dev')) {
        return 'bisdev';
    }
    
    // Sales
    if (type === 'sales' || level.includes('sales')) {
        return 'sales_staff';
    }
    
    // Analyst - check level for staff vs supervisor
    // Supervisor levels: Analyst III, Consultant I-III, Senior
    if (
        level.includes('analyst iii') ||
        level.includes('consultant') ||
        level.includes('senior') ||
        level.includes('supervisor') ||
        level.includes('manager')
    ) {
        return 'analyst_supervisor';
    }
    
    // Default to analyst_staff (Analyst I-II or unspecified)
    return 'analyst_staff';
};

/**
 * Get department display name with fallback
 */
export const getDepartmentLabel = (
    department: string | null,
    jobType: string | null
): string => {
    if (department && department.trim()) {
        return department.replace(/\\r\\n/g, '').trim();
    }
    
    // Fallback based on job_type
    const type = (jobType || '').toLowerCase();
    if (type === 'bisdev' || type.includes('business')) return 'Business & Marketing';
    if (type === 'sales') return 'Sales';
    if (type === 'analyst') return 'Analyst';
    
    return 'General';
};

export const ROLE_WEIGHTS: Record<StaffRole, Record<string, number>> = {
    analyst_staff: {
        knowledge: 0.40,
        people: 0.20,
        service: 0.20,
        business: 0.20,
        leadership: 0.00,
    },
    analyst_supervisor: {
        knowledge: 0.20,
        people: 0.20,
        service: 0.20,
        business: 0.20,
        leadership: 0.20,
    },
    sales_staff: {
        knowledge: 0.20,
        people: 0.20,
        service: 0.20,
        business: 0.40,
        leadership: 0.00,
    },
    bisdev: {
        knowledge: 0.20,
        people: 0.20,
        service: 0.20,
        business: 0.35,
        leadership: 0.05,
    }
};

// Full KPI Metrics Definition based on "KPI WSC Team 2026.csv"
export const KPI_METRICS_DEFINITION: KPIMetric[] = [
    // --- 1. KNOWLEDGE (K) ---
    {
        id: 'K1',
        name: 'Penulisan Blog / News',
        type: 'Quantitative',
        method: 'Website/IG/LinkedIn',
        weight: 0, // Dynamic based on role
        unit: 'articles',
        criteria: '1: 0 articles, 3: 1 article, 5: 2+ articles'
    },
    {
        id: 'K2',
        name: 'Mempelajari Knowledge / Skill Baru',
        type: 'Quantitative',
        method: 'IMS (Internal Management System)',
        weight: 0,
        unit: 'skills',
        criteria: 'Based on verified skill acquisition'
    },
    {
        id: 'K3',
        name: 'Kehadiran Pelatihan Internal',
        type: 'Quantitative',
        method: 'IMS',
        weight: 0,
        unit: '% attendance',
        criteria: 'Based on attendance logs'
    },

    // --- 2. PEOPLE (P) ---
    {
        id: 'P1',
        name: 'Keselamatan & Kesehatan Kerja',
        type: 'Quantitative',
        method: 'IMS/Form',
        weight: 0,
        criteria: 'Zero accidents / safety violations'
    },
    {
        id: 'P2',
        name: 'Team Work',
        type: 'Qualitative',
        method: 'Peer Review',
        weight: 0,
        criteria: 'Feedback from colleagues'
    },
    {
        id: 'P3',
        name: 'Sustainability Initiatives',
        type: 'Quantitative',
        method: 'IMS',
        weight: 0,
        unit: 'initiatives',
        criteria: 'Participation in eco-friendly programs'
    },

    // --- 3. SERVICE (S) ---
    {
        id: 'S1',
        name: 'Responsive & Solutif Klien',
        type: 'Qualitative',
        method: 'Feedback Client',
        weight: 0,
        criteria: 'Client testimonials & response time'
    },
    {
        id: 'S2',
        name: 'Kualitas Kerja',
        type: 'Qualitative',
        method: 'Spv Review',
        weight: 0,
        criteria: 'Accuracy and quality of deliverables'
    },
    {
        id: 'S3',
        name: 'Indeks Kepuasan Klien',
        type: 'Quantitative',
        method: 'Survey',
        weight: 0,
        unit: 'NPS',
        criteria: 'Net Promoter Score from clients'
    },
    {
        id: 'S4',
        name: 'Penampilan',
        type: 'Qualitative',
        method: 'Observation',
        weight: 0,
        criteria: 'Professional attire and grooming'
    },

    // --- 4. BUSINESS (B) ---
    {
        id: 'B1',
        name: 'Sales Target',
        type: 'Quantitative',
        method: 'IMS',
        weight: 0,
        unit: 'IDR',
        criteria: 'Achievement vs Target'
    },
    {
        id: 'B2',
        name: 'New Database / New Prospect',
        type: 'Quantitative',
        method: 'IMS',
        weight: 0,
        unit: 'prospects',
        criteria: 'Number of new qualified leads'
    },
    {
        id: 'B3',
        name: 'Proposal Conversion Rate',
        type: 'Quantitative',
        method: 'IMS',
        weight: 0,
        unit: '% conversion',
        criteria: 'Won deals / Submitted proposals'
    },
    {
        id: 'B4',
        name: 'Kehadiran & Kedisiplinan Waktu',
        type: 'Quantitative',
        method: 'Fingerspot (Rekomendasi + Override)',
        weight: 0,
        unit: '% late',
        criteria: 'Auto-calculated from attendance logs'
    },

    // --- 5. LEADERSHIP (L) ---
    {
        id: 'L1',
        name: 'Kemampuan Kepemimpinan dan Managerial',
        type: 'Qualitative',
        method: 'Supervisor & Team Review',
        weight: 0,
        criteria: 'Effectiveness in leading team'
    }
];

export const RAW_ROLE_WEIGHT_MAPPING: Record<string, Record<StaffRole, number>> = {
    // Knowledge
    'K1': { analyst_staff: 10, analyst_supervisor: 10, sales_staff: 0, bisdev: 0 },
    'K2': { analyst_staff: 15, analyst_supervisor: 10, sales_staff: 5, bisdev: 5 },
    'K3': { analyst_staff: 15, analyst_supervisor: 10, sales_staff: 15, bisdev: 15 },
    // People
    'P1': { analyst_staff: 5, analyst_supervisor: 5, sales_staff: 5, bisdev: 5 },
    'P2': { analyst_staff: 10, analyst_supervisor: 10, sales_staff: 10, bisdev: 10 },
    'P3': { analyst_staff: 5, analyst_supervisor: 5, sales_staff: 5, bisdev: 5 },
    // Service
    'S1': { analyst_staff: 5, analyst_supervisor: 5, sales_staff: 5, bisdev: 5 },
    'S2': { analyst_staff: 10, analyst_supervisor: 5, sales_staff: 5, bisdev: 5 },
    'S3': { analyst_staff: 0, analyst_supervisor: 5, sales_staff: 5, bisdev: 5 },
    'S4': { analyst_staff: 5, analyst_supervisor: 5, sales_staff: 5, bisdev: 5 },
    // Business
    'B1': { analyst_staff: 0, analyst_supervisor: 0, sales_staff: 25, bisdev: 25 },
    'B2': { analyst_staff: 0, analyst_supervisor: 0, sales_staff: 10, bisdev: 5 },
    'B3': { analyst_staff: 5, analyst_supervisor: 10, sales_staff: 0, bisdev: 0 },
    'B4': { analyst_staff: 5, analyst_supervisor: 5, sales_staff: 5, bisdev: 5 },
    // Leadership
    'L1': { analyst_staff: 0, analyst_supervisor: 15, sales_staff: 0, bisdev: 5 },
};

export const getMetricsForRole = (role: StaffRole): KPIMetric[] => {
    return KPI_METRICS_DEFINITION.map(metric => ({
        ...metric,
        weight: RAW_ROLE_WEIGHT_MAPPING[metric.id]?.[role] || 0
    })).filter(m => m.weight > 0);
};

// Helper to get grouped metrics
export const getGroupedMetrics = (role: StaffRole) => {
    const metrics = getMetricsForRole(role);
    return {
        knowledge: metrics.filter(m => m.id.startsWith('K')),
        people: metrics.filter(m => m.id.startsWith('P')),
        service: metrics.filter(m => m.id.startsWith('S')),
        business: metrics.filter(m => m.id.startsWith('B')),
        leadership: metrics.filter(m => m.id.startsWith('L')),
    };
};

// ROLE NAMES MAPPING
export const ROLE_NAMES: Record<StaffRole, string> = {
    analyst_staff: "Analyst Level I-II",
    analyst_supervisor: "Analyst Level III+ (Supervisor)",
    sales_staff: "Sales Staff",
    bisdev: "Business Development"
};

// SCORE LEVELS
export const SCORE_LEVELS = [
    { min: 0, max: 2, label: 'Need Improvement', color: 'text-rose-400', bgLight: 'bg-rose-100' },
    { min: 2, max: 3.5, label: 'Good', color: 'text-amber-400', bgLight: 'bg-amber-100' },
    { min: 3.5, max: 4.5, label: 'Very Good', color: 'text-emerald-400', bgLight: 'bg-emerald-100' },
    { min: 4.5, max: 6, label: 'Excellent', color: 'text-blue-400', bgLight: 'bg-blue-100' }
];

// MOCK DATA FOR DEVELOPMENT
export const mockStaffData: StaffKPI[] = [
    {
        id: "123",
        employeeName: "Aditya Rahad",
        role: "analyst_staff",
        period: "2026-S1",
        pillars: {
            knowledge: { ...KPI_CATEGORIES.KNOWLEDGE, metrics: [] },
            people: { ...KPI_CATEGORIES.PEOPLE, metrics: [] },
            service: { ...KPI_CATEGORIES.SERVICE, metrics: [] },
            business: { ...KPI_CATEGORIES.BUSINESS, metrics: [] },
            leadership: { ...KPI_CATEGORIES.LEADERSHIP, metrics: [] }
        }
    }
];
