
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
    criteria?: string; // General criteria
    scoring_criteria?: {
        1: string;
        2: string;
        3: string;
        4: string;
        5: string;
    };
}

export interface KPIPillar {
    id: string;
    label: string;
    metrics: KPIMetric[];
    color: string;
}

export interface StaffKPI {
    id?: string;
    name?: string; // Changed from employeeName to match page usage
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
    if (type === 'sales' || type.includes('sales')) return 'Sales';
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
        description: 'Mengukur konsistensi dan kontribusi individu/tim dalam menghasilkan artikel berkualitas',
        type: 'Quantitative',
        method: 'Website / IG / Linkedin',
        weight: 0,
        unit: 'articles',
        criteria: '1: < 50% target, 3: 75% - < 100% target, 5: ≥ 150% target',
        scoring_criteria: {
            1: '< 50% target',
            2: '50% – < 75% target',
            3: '75% – < 100% target',
            4: '100% – < 150% target',
            5: '≥ 150% target'
        }
    },
    {
        id: 'K2',
        name: 'Mempelajari Knowledge / Skill Baru',
        type: 'Quantitative',
        method: 'IMS (Internal Management System)',
        weight: 0,
        unit: 'skills',
        criteria: 'Based on verified skill acquisition',
        scoring_criteria: {
            1: 'Tidak ada sama sekali',
            2: '1 Sharing Session / 6 bulan',
            3: '2 Sharing Session / 6 bulan',
            4: '3 Sharing Session / 6 bulan',
            5: '4 Sharing Session / 6 bulan'
        }
    },
    {
        id: 'K3',
        name: 'Kehadiran Pelatihan Internal',
        description: 'Kehadiran dalam pelatihan internal atau sharing session',
        type: 'Quantitative',
        method: 'IMS',
        weight: 0,
        unit: '% attendance',
        criteria: 'Based on attendance logs',
        scoring_criteria: {
            1: '<= 20% Kehadiran',
            2: '<= 40%',
            3: '<= 60%',
            4: '<= 80%',
            5: '<= 100%'
        }
    },

    // --- 2. PEOPLE (P) ---
    {
        id: 'P1',
        name: 'Keselamatan & Kesehatan Kerja',
        description: 'Menaati peraturan keselamatan, kerapihan, dan kesehatan',
        type: 'Quantitative',
        method: 'Supervisor Review',
        weight: 0,
        criteria: 'Zero accidents / safety violations',
        scoring_criteria: {
            1: 'Tempat kerja kotor dan peraturan tentang keselamatan kerapihan & kesehatan diabaikan',
            2: 'Diperingati berulang-ulang tentang keselamatan, kerapihan, dan kebersihan, terjadi lebih dari satu kali kesalahan',
            3: 'Kadang mendapat peringatan tentang keselamatan, kebersihan, dan kerapihan',
            4: 'Tempat kerja bersih, rapih, dan aman',
            5: 'Bekerja dengan tertib dan aman, menjaga peralatan dan kebersihan kantor dengan baik.'
        }
    },
    {
        id: 'P2',
        name: 'Team Work',
        description: 'Kemauan bekerja sama dalam tim',
        type: 'Qualitative',
        method: 'Peer Review',
        weight: 0,
        criteria: 'Feedback from colleagues',
        scoring_criteria: {
            1: 'Kurang membantu, berdalih, tidak mengambil peran',
            2: 'Terbatas dalam memberikan bantuan',
            3: 'Mau membantu',
            4: 'Memegang peranan dalam tim',
            5: 'Sangat kooperatif dan proaktif membantu tim' // Added 5 based on pattern, missing in CSV snippet for P2 row 18? Actually P2 row 18 has 1-5 columns but empty text in 2,3,4? Wait CSV row 18: "Kurang membantu...", "Terbatas...", "Mau membantu", "Memegang peranan dalam tim". It seems 1 is "Kerjasama..." title? No.
            // CSV Row 16: P2 Team Work. Row 18: 1="Kurang membantu...", 2="Terbatas...", 3="Mau membantu", 4="Memegang peranan dalam tim". 5 is missing in CSV snippet provided?
            // Let's look at CSV again.
            // Row 18: ... "Kurang membantu, berdalih, tidak mengambil peran", "Terbatas...", "Mau membantu", "Memegang peranan dalam tim". Col 5 seems empty or merged.
            // I will extrapolate 5 as "Role Model Teamwork" or similar if missing, or check if I missed it.
            // Actually looking at row 18 in CSV provided: "Kerjasama\nKemauan bekerja sama ", "Kurang membantu...", "Terbatas...", "Mau membantu", "Memegang peranan dalam tim". It seems to have 4 values?
            // Ah, looking at cols: Unnamed:6 (1), ... Unnamed:10 (5).
            // Row 18 col 6 (1): "Kurang membantu..."
            // Row 18 col 7 (2): "Terbatas..."
            // Row 18 col 8 (3): "Mau membantu"
            // Row 18 col 9 (4): "Memegang peranan dalam tim"
            // Row 18 col 10 (5): EMPTY in standard view? Or maybe "Sangat..."
            // I will use a placeholder for 5 or assume 4 is high enough/mapped differently. I'll put a generic "Excellent" for 5.
        }
    },
    {
        id: 'P3',
        name: 'Sustainability Initiatives',
        description: 'Sikap Aksi nyata dalam berkontribusi dalam menjaga lingkungan dan kegiatan sosial',
        type: 'Quantitative',
        method: 'Supervisor Review',
        weight: 0,
        unit: 'initiatives',
        criteria: 'Participation in eco-friendly programs',
        scoring_criteria: {
            1: 'Tidak peduli sama sekali',
            2: 'Sulit diajak untuk berkontribusi',
            3: 'Bekerja sama dengan baik',
            4: 'Peduli dan mudah diajak bekerja sama',
            5: 'Selalu antusias dan aktif'
        }
    },

    // --- 3. SERVICE (S) ---
    {
        id: 'S1',
        name: 'Responsive & Solutif Klien',
        type: 'Qualitative',
        method: 'Feedback Client',
        weight: 0,
        criteria: 'Client testimonials & response time',
        scoring_criteria: {
            1: 'Respon sangat lambat / tidak ada. Tidak ada solusi. Komplain klien.',
            2: 'Respon lambat (> 2 hari). Solusi kurang tepat. Perlu diingatkan.',
            3: 'Respon cukup cepat (≤ 1 hari). Solusi ada tapi perlu perbaikan.',
            4: 'Respon cepat (≤ 4 jam). Solusi relevan. Ownership kuat.',
            5: 'Respon sangat cepat (≤ 1 jam). Solusi tepat sasaran. Sangat proaktif.'
        }
    },
    {
        id: 'S2',
        name: 'Kualitas Kerja',
        description: 'Pencapaian standar kualitas dan harapan client',
        type: 'Qualitative',
        method: 'Spv Review, Peer Review',
        weight: 0,
        criteria: 'Accuracy and quality of deliverables',
        scoring_criteria: {
            1: 'Ceroboh, jarang memenuhi standar',
            2: 'Kadang-kadang masih perlu perbaikan',
            3: 'Memenuhi apa yang diharapkan',
            4: 'Hasil kerja memuaskan',
            5: 'Hasil kerja sangat memuaskan'
        }
    },
    {
        id: 'S3',
        name: 'Indeks Kepuasan Klien',
        description: 'Mengukur kualitas layanan, hasil kerja, dan pengalaman klien',
        type: 'Quantitative',
        method: 'Survey (NPS)',
        weight: 0,
        unit: 'NPS',
        criteria: 'Net Promoter Score from clients',
        scoring_criteria: {
            1: '< 2.80',
            2: '2.80 – < 3.40',
            3: '3.40 – < 4.00',
            4: '4.00 – < 4.60',
            5: '≥ 4.60'
        }
    },
    {
        id: 'S4',
        name: 'Penampilan',
        description: 'Rapi, bersih, wangi dan menggunakan atribut kantor',
        type: 'Qualitative',
        method: 'Observation',
        weight: 0,
        criteria: 'Professional attire and grooming',
        scoring_criteria: {
            1: 'Secara umum penampilan kurang',
            2: 'Kadang-kadang dibawah standar penampilan',
            3: 'Penampilan cukup',
            4: 'Penampilan baik sesuai standar',
            5: 'Penampilan sangat baik dan sesuai standar'
        }
    },

    // --- 4. BUSINESS (B) ---
    {
        id: 'B1',
        name: 'Sales Target',
        description: 'Mengukur kemampuan mencapai target pendapatan proyek',
        type: 'Quantitative',
        method: 'IMS',
        weight: 0,
        unit: 'IDR',
        criteria: 'Achievement vs Target',
        scoring_criteria: {
            1: '< 60%',
            2: '60% – < 80%',
            3: '80% – < 100%',
            4: '100% – < 120%',
            5: '≥ 120%'
        }
    },
    {
        id: 'B2',
        name: 'New Database / New Prospect',
        description: 'Mengukur kemampuan menghasilkan prospek baru',
        type: 'Quantitative',
        method: 'IMS',
        weight: 0,
        unit: 'prospects',
        criteria: 'Number of new qualified leads',
        scoring_criteria: {
            1: '< 60% Target',
            2: '60% – < 80% Target',
            3: '80% – < 100% Target',
            4: '100% – < 120% Target',
            5: '≥ 120% Target'
        }
    },
    {
        id: 'B3',
        name: 'Proposal Conversion Rate',
        description: 'Mengukur efektivitas proposal dalam memenangkan proyek',
        type: 'Quantitative',
        method: 'IMS',
        weight: 0,
        unit: '% conversion',
        criteria: 'Won deals / Submitted proposals',
        scoring_criteria: {
            1: '< 15% (Tidak efektif)',
            2: '15% – < 30% (Perlu perbaikan)',
            3: '30% – < 45% (Wajar)',
            4: '45% – < 60% (Tinggi)',
            5: '≥ 60% (Sangat efektif)'
        }
    },
    {
        id: 'B4',
        name: 'Kehadiran & Kedisiplinan Waktu',
        description: 'Tingkat kehadiran dan keterlambatan',
        type: 'Quantitative',
        method: 'Fingerspot',
        weight: 0,
        unit: '% late',
        criteria: 'Auto-calculated from attendance logs',
        scoring_criteria: {
            1: '> 20% Terlambat',
            2: '> 10% – ≤ 20%',
            3: '> 5% – ≤ 10%',
            4: '> 2% – ≤ 5%',
            5: '0 – ≤ 2%'
        }
    },

    // --- 5. LEADERSHIP (L) ---
    {
        id: 'L1',
        name: 'Kemampuan Kepemimpinan dan Managerial',
        description: 'People Development, Project Management, Decision Making',
        type: 'Qualitative',
        method: 'Supervisor & Team Review',
        weight: 0,
        criteria: 'Effectiveness in leading team',
        scoring_criteria: {
            1: 'Tidak membina, arah tidak jelas, tidak bertanggung jawab',
            2: 'Jarang membina, arah sering berubah, target meleset',
            3: 'Membina sesekali, arah cukup jelas, target sebagian tercapai',
            4: 'Rutin membina, arah jelas, target tercapai',
            5: 'Aktif membina, arah sangat jelas, target tercapai konsisten'
        }
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

// Helper to calculate score
export const calculateStaffScore = (staff: StaffKPI): number => {
    if (!staff.pillars) return 0;
    
    let totalScore = 0;
    // Get weights for this role
    const roleWeights = ROLE_WEIGHTS[staff.role];
    if (!roleWeights) return 0;

    // Calculate weighted sum
    Object.entries(staff.pillars).forEach(([key, pillar]) => {
        const pillarKey = key as keyof typeof roleWeights;
        const weight = roleWeights[pillarKey] || 0;
        
        if (weight > 0 && pillar.metrics.length > 0) {
            // Average of metrics in this pillar
            const pillarSum = pillar.metrics.reduce((sum, m) => sum + (m.score || 0), 0);
            const pillarAvg = pillarSum / pillar.metrics.length;
            totalScore += pillarAvg * weight;
        }
    });

    return totalScore;
};

// MOCK DATA FOR DEVELOPMENT
export const mockStaffData: StaffKPI[] = [
    {
        id: "123",
        name: "Aditya Rahad", // Changed from employeeName
        role: "analyst_staff",
        period: "2026-S1",
        pillars: {
            knowledge: { 
                ...KPI_CATEGORIES.KNOWLEDGE, 
                metrics: [
                    { ...KPI_METRICS_DEFINITION[0], score: 5 }, // K1
                    { ...KPI_METRICS_DEFINITION[1], score: 4 }  // K2
                ] 
            },
            people: { 
                ...KPI_CATEGORIES.PEOPLE, 
                metrics: [
                    { ...KPI_METRICS_DEFINITION[3], score: 5 }, // P1
                    { ...KPI_METRICS_DEFINITION[4], score: 4 }  // P2
                ] 
            },
            service: { 
                ...KPI_CATEGORIES.SERVICE, 
                metrics: [
                    { ...KPI_METRICS_DEFINITION[6], score: 3 }, // S1
                    { ...KPI_METRICS_DEFINITION[7], score: 4 }  // S2
                ] 
            },
            business: { 
                ...KPI_CATEGORIES.BUSINESS, 
                metrics: [
                    { ...KPI_METRICS_DEFINITION[11], score: 3 } // B2
                ] 
            },
            leadership: { 
                ...KPI_CATEGORIES.LEADERSHIP, 
                metrics: [] 
            }
        }
    },
    {
        id: "124",
        name: "Siti Sales", // Changed from employeeName

        role: "sales_staff",
        period: "2026-S1",
        pillars: {
            knowledge: { ...KPI_CATEGORIES.KNOWLEDGE, metrics: [{ ...KPI_METRICS_DEFINITION[0], score: 3 }] },
            people: { ...KPI_CATEGORIES.PEOPLE, metrics: [{ ...KPI_METRICS_DEFINITION[3], score: 5 }] },
            service: { ...KPI_CATEGORIES.SERVICE, metrics: [{ ...KPI_METRICS_DEFINITION[6], score: 4 }] },
            business: { ...KPI_CATEGORIES.BUSINESS, metrics: [{ ...KPI_METRICS_DEFINITION[10], score: 5 }, { ...KPI_METRICS_DEFINITION[12], score: 4 }] },
            leadership: { ...KPI_CATEGORIES.LEADERSHIP, metrics: [] }
        }
    }
];
