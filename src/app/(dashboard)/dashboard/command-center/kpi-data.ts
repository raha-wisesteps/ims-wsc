
export type StaffRole = 'analyst_staff' | 'analyst_supervisor' | 'sales_staff' | 'bisdev';

export interface PeerReviewConfig {
    questions: string[];
    scale: Record<number, string>;
}

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
    isPeerReview?: boolean;
    isSystemCalculated?: boolean;
    peerReviewConfig?: PeerReviewConfig;
    /** For L1: only reviewable if reviewee role matches */
    peerReviewRoleLock?: StaffRole[];
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
            1: 'Hadir < 20% sharing session,\nTidak pernah jadi pemateri,\nSharing session tim terlaksana < 20%',
            2: 'Hadir 20–39% sharing session,\nTidak pernah jadi pemateri,\nSharing session tim terlaksana 20–39%',
            3: 'Hadir 60–79% sharing session,\nTidak pernah jadi pemateri,\nSharing session tim terlaksana 60–79%',
            4: 'Hadir ≥ 80% sharing session,\nBelum pernah jadi pemateri,\nSharing session tim terlaksana ≥ 80%',
            5: 'Hadir ≥ 80% sharing session,\nMinimal 1x jadi pemateri,\nSharing session tim terlaksana ≥ 80%'
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
        isPeerReview: true,
        scoring_criteria: {
            1: 'Tidak ada kemauan bekerjasama',
            2: 'Kurang membantu, berdalih, tidak mengambil peran',
            3: 'Terbatas dalam memberikan bantuan',
            4: 'Mau membantu dan kooperatif',
            5: 'Memegang peranan penting dalam tim'
        },
        peerReviewConfig: {
            questions: [
                'Apakah ybs menunjukkan kemauan untuk bekerja sama dengan anggota tim?',
                'Apakah ybs responsif dan mudah dihubungi selama project berlangsung?',
                'Apakah ybs terbuka terhadap masukan dan feedback?',
                'Apakah ybs aktif berkontribusi dalam diskusi dan penyelesaian masalah?',
                'Apakah ybs membantu anggota tim lain ketika dibutuhkan?',
                'Apakah ybs menyelesaikan tugas sesuai timeline yang disepakati?',
                'Apakah ybs dapat diandalkan dalam menjalankan tanggung jawabnya?',
                'Apakah ybs menunjukkan inisiatif ketika ada kendala dalam project?',
                'Apakah ybs menjaga komunikasi dan suasana kerja yang profesional?',
                'Secara keseluruhan, ybs berperan positif terhadap keberhasilan tim.',
            ],
            scale: {
                1: 'Tidak ada kemauan bekerjasama',
                2: 'Kurang membantu, berdalih, tidak mengambil peran',
                3: 'Terbatas dalam memberikan bantuan',
                4: 'Mau membantu dan kooperatif',
                5: 'Memegang peranan penting dalam tim'
            }
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
        isPeerReview: true,
        scoring_criteria: {
            1: 'Ceroboh, jarang memenuhi standar',
            2: 'Kadang-kadang masih perlu perbaikan',
            3: 'Memenuhi apa yang diharapkan',
            4: 'Hasil kerja memuaskan',
            5: 'Hasil kerja sangat memuaskan'
        },
        peerReviewConfig: {
            questions: [
                'Apakah ybs menghasilkan pekerjaan dengan tingkat akurasi data yang tinggi?',
                'Apakah ybs menunjukkan ketelitian dalam analisis dan pengolahan informasi?',
                'Apakah ybs minim kesalahan teknis maupun substansi?',
                'Apakah ybs mampu menyusun analisis yang logis dan sistematis?',
                'Insight atau rekomendasi yang diberikan relevan dengan kebutuhan project?',
                'Apakah ybs mampu memahami konteks project sebelum menyusun output?',
                'Apakah ybs menyelesaikan tugas sesuai timeline yang disepakati?',
                'Apakah ybs mampu mengelola beban kerja dengan baik selama project berlangsung?',
                'Output (laporan, presentasi, materi) tersusun rapi dan profesional?',
                'Secara keseluruhan, kualitas kerja Analyst memenuhi atau melampaui ekspektasi Anda sebagai rekan kerja.',
            ],
            scale: {
                1: 'Ceroboh, jarang memenuhi standar (Poor)',
                2: 'Kadang-kadang masih perlu perbaikan (Need Improvement)',
                3: 'Memenuhi apa yang diharapkan (Good)',
                4: 'Hasil kerja memuaskan (Very Good)',
                5: 'Hasil kerja sangat memuaskan (Excellent)'
            }
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
        method: 'Peer Review',
        weight: 0,
        criteria: 'Professional attire and grooming',
        isPeerReview: true,
        scoring_criteria: {
            1: 'Tidak memenuhi standar (tidak rapi/tidak profesional)',
            2: 'Kurang konsisten menjaga standar',
            3: 'Memenuhi standar minimum',
            4: 'Rapi dan profesional secara konsisten',
            5: 'Sangat profesional dan merepresentasikan perusahaan dengan sangat baik'
        },
        peerReviewConfig: {
            questions: [
                'Staff berpenampilan rapi dan bersih saat bertemu pihak eksternal.',
                'Staff menggunakan atribut resmi perusahaan (ID card, seragam, blazer, dll.) sesuai ketentuan.',
                'Staf menjaga kebersihan diri dan kerapihan secara konsisten selama project berlangsung.',
                'Penampilan Staf sesuai dengan konteks kegiatan (meeting formal, FGD, site visit, dll.).',
                'Staf menunjukkan sikap, bahasa tubuh, dan etika profesional saat mewakili perusahaan.',
                'Secara keseluruhan, penampilan Staf mencerminkan citra profesional perusahaan.',
            ],
            scale: {
                1: 'Tidak memenuhi standar (tidak rapi/tidak profesional)',
                2: 'Kurang konsisten menjaga standar',
                3: 'Memenuhi standar minimum',
                4: 'Rapi dan profesional secara konsisten',
                5: 'Sangat profesional dan merepresentasikan perusahaan dengan sangat baik'
            }
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
        isSystemCalculated: true,
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
        isSystemCalculated: true,
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
        method: 'Peer Review',
        weight: 0,
        criteria: 'Effectiveness in leading team',
        isPeerReview: true,
        peerReviewRoleLock: ['analyst_supervisor', 'bisdev'],
        scoring_criteria: {
            1: 'Ceroboh, jarang memenuhi standar (Poor)',
            2: 'Kadang-kadang masih perlu perbaikan (Need Improvement)',
            3: 'Memenuhi apa yang diharapkan (Good)',
            4: 'Hasil kerja memuaskan (Very Good)',
            5: 'Hasil kerja sangat memuaskan (Excellent)'
        },
        peerReviewConfig: {
            questions: [
                'Apakah ybs menghasilkan pekerjaan dengan tingkat akurasi data yang tinggi?',
                'Apakah ybs menunjukkan ketelitian dalam analisis dan pengolahan informasi?',
                'Apakah ybs minim kesalahan teknis maupun substansi?',
                'Apakah ybs mampu menyusun analisis yang logis dan sistematis?',
                'Insight atau rekomendasi yang diberikan relevan dengan kebutuhan project?',
                'Apakah ybs mampu memahami konteks project sebelum menyusun output?',
                'Apakah ybs menyelesaikan tugas sesuai timeline yang disepakati?',
                'Apakah ybs mampu mengelola beban kerja dengan baik selama project berlangsung?',
                'Output (laporan, presentasi, materi) tersusun rapi dan profesional?',
                'Secara keseluruhan, kualitas kerja memenuhi atau melampaui ekspektasi Anda sebagai Supervisor.',
            ],
            scale: {
                1: 'Ceroboh, jarang memenuhi standar (Poor)',
                2: 'Kadang-kadang masih perlu perbaikan (Need Improvement)',
                3: 'Memenuhi apa yang diharapkan (Good)',
                4: 'Hasil kerja memuaskan (Very Good)',
                5: 'Hasil kerja sangat memuaskan (Excellent)'
            }
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
