export type TalentRating = "recommended" | "potential" | "avoid";
export type ProjectStatus = "completed" | "active" | "planned";

export interface ProjectHistory {
    id: string;
    name: string;
    role: string;
    status: ProjectStatus;
    period: string; // e.g. "Jan 2024 - Mar 2024"
    performance: string; // e.g. "Excellent delivery on..."
    rating: 1 | 2 | 3 | 4 | 5;
}

export interface TalentRecord {
    id: string;
    name: string;
    role: string;
    expertise: string[];
    email: string;
    phone: string;
    rating: TalentRating;
    projects: string[]; // Simple list for summary
    projectHistory: ProjectHistory[]; // Detailed history
    lastActive: string;
    feeRange: string;
    notes: string;
    avatarInitials: string;
    location: string;
    availability: "available" | "busy" | "unavailable";
}

export const RATING_CONFIG = {
    recommended: { label: "Recommended", bgClass: "bg-emerald-500/10", textClass: "text-emerald-500", borderClass: "border-emerald-500/20" },
    potential: { label: "Potential", bgClass: "bg-blue-500/10", textClass: "text-blue-500", borderClass: "border-blue-500/20" },
    avoid: { label: "Not Recommended", bgClass: "bg-rose-500/10", textClass: "text-rose-500", borderClass: "border-rose-500/20" },
};

export const mockTalents: TalentRecord[] = [
    {
        id: "1",
        name: "Dr. Budi Santoso",
        role: "Senior Urban Planner",
        expertise: ["Urban Design", "Sustainability", "Transport Planning"],
        email: "budi.s@expert.com",
        phone: "+62 812 3456 7890",
        rating: "recommended",
        projects: ["Smart City Blueprint 2024", "Transit Oriented Dev Study"],
        projectHistory: [
            { id: "p1", name: "Smart City Blueprint 2024", role: "Lead Planner", status: "completed", period: "Jan 2024 - Jun 2024", performance: "Exceptional leadership and strategic insight.", rating: 5 },
            { id: "p2", name: "Transit Oriented Dev Study", role: "Urban Expert", status: "completed", period: "Aug 2023 - Dec 2023", performance: "High quality deliverables, timely submission.", rating: 5 }
        ],
        lastActive: "2024-11-15",
        feeRange: "IDR 50-70jt/mo",
        notes: "Excellent strategic thinking, highly reliable.",
        avatarInitials: "BS",
        location: "Jakarta, Indonesia",
        availability: "available"
    },
    {
        id: "2",
        name: "Sarah Wijaya, MSc",
        role: "Environmental Analyst",
        expertise: ["EIA Assessment", "Waste Management"],
        email: "sarah.w@eco.id",
        phone: "+62 821 9876 5432",
        rating: "potential",
        projects: ["Green Port Feasibility"],
        projectHistory: [
            { id: "p3", name: "Green Port Feasibility", role: "Environmental Specialist", status: "completed", period: "Mar 2024 - May 2024", performance: "Strong technical knowledge, fast learner.", rating: 4 }
        ],
        lastActive: "2024-09-20",
        feeRange: "IDR 25-35jt/mo",
        notes: "Good technical skills, needs more leadership experience.",
        avatarInitials: "SW",
        location: "Bandung, Indonesia",
        availability: "busy"
    },
    {
        id: "3",
        name: "Ir. Joko Sutrisno",
        role: "Civil Engineer",
        expertise: ["Infrastructure", "Structural Analysis"],
        email: "joko.struct@gmail.com",
        phone: "+62 857 1234 5678",
        rating: "avoid",
        projects: ["Bridge Integrity Audit"],
        projectHistory: [
            { id: "p4", name: "Bridge Integrity Audit", role: "Senior Engineer", status: "completed", period: "Nov 2023 - Dec 2023", performance: "Late delivery of final report, communication issues.", rating: 2 }
        ],
        lastActive: "2023-12-05",
        feeRange: "IDR 40jt/mo",
        notes: "Communication issues, missed deadline on final report.",
        avatarInitials: "JS",
        location: "Surabaya, Indonesia",
        availability: "available"
    },
    {
        id: "4",
        name: "Anita Rahayu",
        role: "Social Specialist",
        expertise: ["Community Engagement", "Social Impact"],
        email: "anita.r@social.org",
        phone: "+62 813 5678 9012",
        rating: "recommended",
        projects: ["Village empowerment Program", "CSR Strategy 2024"],
        projectHistory: [
            { id: "p5", name: "Village empowerment Program", role: "Field Specialist", status: "active", period: "Jul 2024 - Present", performance: "Ongoing - excellent feedback from local leaders.", rating: 5 },
            { id: "p6", name: "CSR Strategy 2024", role: "Consultant", status: "completed", period: "Jan 2024 - Mar 2024", performance: "Precise and empathetic approach.", rating: 5 }
        ],
        lastActive: "2024-12-10",
        feeRange: "IDR 20-30jt/mo",
        notes: "Great with local communities, highly recommended for field work.",
        avatarInitials: "AR",
        location: "Yogyakarta, Indonesia",
        availability: "available"
    },
    {
        id: "5",
        name: "Michael Tan",
        role: "Financial Consultant",
        expertise: ["Financial Modeling", "Investment Analysis"],
        email: "m.tan@finance.co",
        phone: "+62 878 2345 6789",
        rating: "potential",
        projects: ["Tourism Revenue Projection"],
        projectHistory: [
            { id: "p7", name: "Tourism Revenue Projection", role: "Financial Analyst", status: "completed", period: "Sep 2024 - Oct 2024", performance: "Solid modeling, slightly passive in meetings.", rating: 4 }
        ],
        lastActive: "2024-10-01",
        feeRange: "IDR 45jt/mo",
        notes: "Solid work, but availability is sometimes limited.",
        avatarInitials: "MT",
        location: "Jakarta, Indonesia",
        availability: "busy"
    },
];
