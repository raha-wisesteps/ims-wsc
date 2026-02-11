"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
    Building2,
    ArrowRight,
    Video,
    ChevronRight,
    ChevronLeft,
    Edit3,
    Trash2,
    X,
    Plus,
    Calendar,
    MessageSquare,
    Tag,
    Clock,
    User,
    Mail,
    Phone,
    MapPin,
    Link as LinkIcon,
    FileText,
    Pin,
    Users,
    Star,
    TrendingUp,
    AlertCircle,
    StickyNote,
    Dot,
    DollarSign,
    List,
    Sparkles,
    Key,
    AlertTriangle,
    ThumbsUp,
    Smile,
    Meh,
    Frown,
    Trophy,
    Angry,
    LayoutGrid,
    History,
    ChevronDown,
    Check,
} from "lucide-react";

// Configs
const CATEGORY_CONFIG = {
    government: { label: "Government", color: "bg-blue-500" },
    ngo: { label: "NGO", color: "bg-green-500" },
    media: { label: "Media", color: "bg-purple-500" },
    accommodation: { label: "Accommodation", color: "bg-amber-500" },
    tour_operator: { label: "Tour Operator", color: "bg-cyan-500" },
    bumn: { label: "BUMN", color: "bg-red-500" },
    transportation: { label: "Transportation", color: "bg-indigo-500" },
    fnb: { label: "F&B", color: "bg-orange-500" },
    attraction: { label: "Attraction", color: "bg-pink-500" },
    tourism_village: { label: "Tourism Village", color: "bg-emerald-500" },
    hospitality_suppliers: { label: "Hospitality Suppliers", color: "bg-teal-500" },
    supporting_organizations: { label: "Supporting Orgs", color: "bg-violet-500" },
    others: { label: "Others", color: "bg-gray-500" },
};

const STAGE_CONFIG = {
    prospect: { label: "Prospect", color: "bg-blue-100 text-blue-700", order: 1 },
    proposal: { label: "Proposal", color: "bg-purple-100 text-purple-700", order: 2 },
    leads: { label: "Leads", color: "bg-orange-100 text-orange-700", order: 3 },
    sales: { label: "Sales", color: "bg-emerald-100 text-emerald-700", order: 4 },
    closed_won: { label: "Won", color: "bg-green-600", order: 5 },
    closed_lost: { label: "Lost", color: "bg-rose-500", order: 6 },
};

const TAG_CONFIG = {
    new: { label: "New", color: "bg-blue-500", icon: <Sparkles className="h-4 w-4 text-blue-500 fill-blue-500" /> },
    key_account: { label: "Key Account", color: "bg-amber-500", icon: <Key className="h-4 w-4 text-amber-500 fill-amber-500" /> },
    problematic: { label: "Problematic", color: "bg-red-500", icon: <AlertTriangle className="h-4 w-4 text-red-500 fill-red-500" /> },
    recommended: { label: "Recommended", color: "bg-green-500", icon: <ThumbsUp className="h-4 w-4 text-green-500 fill-green-500" /> },
};

const MEETING_TYPES = {
    online: { label: "Online Meeting", icon: <Calendar className="h-4 w-4" /> },
    onsite: { label: "Onsite Meeting", icon: <Building2 className="h-4 w-4" /> },
    call: { label: "Phone Call", icon: <Phone className="h-4 w-4" /> },
    chat: { label: "Chat / WA", icon: <MessageSquare className="h-4 w-4" /> },
    email: { label: "Email", icon: <Mail className="h-4 w-4" /> },
    other: { label: "Other", icon: <Dot className="h-4 w-4" /> },
};

// Mood Config
const MOOD_CONFIG = {
    bad: { label: "Bad", icon: <Frown className="h-5 w-5" />, color: "bg-red-100 text-red-600" },
    tense: { label: "Tense", icon: <Angry className="h-5 w-5" />, color: "bg-orange-100 text-orange-600" },
    neutral: { label: "Neutral", icon: <Meh className="h-5 w-5" />, color: "bg-gray-100 text-gray-600" },
    good: { label: "Good", icon: <Smile className="h-5 w-5" />, color: "bg-blue-100 text-blue-600" },
    excellent: { label: "Excellent", icon: <Trophy className="h-5 w-5" />, color: "bg-green-100 text-green-600" },
};

const MONTHS = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const NOTE_TYPES = {
    general: { label: "General", color: "bg-gray-500" },
    issue: { label: "Issue", color: "bg-red-500" },
    opportunity: { label: "Opportunity", color: "bg-green-500" },
    requirement: { label: "Requirement", color: "bg-blue-500" },
};

type CRMCategory = keyof typeof CATEGORY_CONFIG;
type CRMStage = keyof typeof STAGE_CONFIG;
type CRMTag = keyof typeof TAG_CONFIG;
type MeetingType = keyof typeof MEETING_TYPES;
type NoteType = keyof typeof NOTE_TYPES;
type MoodType = keyof typeof MOOD_CONFIG;

interface CRMClient {
    id: string;
    company_name: string;
    category: CRMCategory;
    current_stage: CRMStage;
    description: string | null;
    source: string | null;
    notes: string | null;
    client_type?: 'company' | 'individual'; // Added client_type
    created_at: string;
    updated_at: string;
    assigned_profile?: { full_name: string } | null;
}

interface Contact {
    id: string;
    name: string;
    position: string | null;
    email: string | null;
    phone: string | null;
    is_primary: boolean;
    birth_date: string | null; // Added birth_date
    notes: string | null;
    created_at: string;
}

interface JourneyEntry {
    id: string;
    from_stage: string | null;
    to_stage: string;
    source_table: string | null;
    notes: string | null;
    created_at: string;
    created_by_profile?: { name: string } | null;
}

interface Meeting {
    id: string;
    meeting_date: string;
    meeting_type: MeetingType;
    attendees: string | null;
    agenda: string | null;
    mom_content: string | null;
    mom_link: string | null;
    next_action: string | null;
    created_at: string;
}

interface Note {
    id: string;
    note_type: NoteType;
    content: string;
    is_pinned: boolean;
    created_at: string;
    created_by_profile?: { name: string } | null;
}

interface ClientTag {
    id: string;
    tag: CRMTag;
    notes: string | null;
}

interface Employee {
    id: string;
    full_name: string;
    role: string;
    job_type: string;
}

type TabType = "overview" | "opportunities" | "logbook" | "contacts" | "tags";

export default function ClientDetailPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const clientId = params.clientId as string;
    const initialTab = searchParams.get("tab") as TabType;

    const supabase = createClient();
    const { profile, canAccessBisdev, isLoading: authLoading } = useAuth();

    const [client, setClient] = useState<CRMClient | null>(null);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [opportunities, setOpportunities] = useState<any[]>([]); // Use any for now or import Opportunity type
    const [logbook, setLogbook] = useState<any[]>([]); // Combined Log
    const [journeyHistory, setJourneyHistory] = useState<any[]>([]); // Added for strict conversion logic
    const [tags, setTags] = useState<ClientTag[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>(initialTab || "overview");
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null); // For accordion
    const [selectedLogFilter, setSelectedLogFilter] = useState<string>("all");
    const [hideStageUpdates, setHideStageUpdates] = useState(true);

    // Form states
    const [showMeetingForm, setShowMeetingForm] = useState(false);
    const [showContactForm, setShowContactForm] = useState(false);
    const [showTagForm, setShowTagForm] = useState(false);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);

    const [editingOpportunity, setEditingOpportunity] = useState<any | null>(null);

    // Opportunity Form State
    const [showOpportunityForm, setShowOpportunityForm] = useState(false);
    const [opportunityForm, setOpportunityForm] = useState({
        title: "",
        stage: "prospect" as CRMStage,
        status: "on_going",
        value: 0,
        priority: "medium",
        opportunity_type: "" as "" | "customer_based" | "product_based",
        cash_in: 0,
        notes: "",

        created_at: "", // Added for custom date
        has_proposal: false,
    });

    // Opportunity Status Config
    const OPPORTUNITY_STATUSES = {
        prospect: ['pending', 'on_going', 'sent', 'follow_up'],
        proposal: ['pending', 'on_going', 'sent'],
        leads: ['pending', 'low', 'moderate', 'hot'],
        sales: ['pending', 'down_payment', 'account_receivable', 'full_payment', 'won'],
        closed_won: ["won"],
        closed_lost: ["lost"]
    };

    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [tempDescription, setTempDescription] = useState("");

    // Source editing state
    const [isEditingSource, setIsEditingSource] = useState(false);
    const [tempSource, setTempSource] = useState("");

    // Date editing state
    const [isEditingDate, setIsEditingDate] = useState(false);
    const [tempDate, setTempDate] = useState("");
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [tempNotes, setTempNotes] = useState("");

    // Meeting form with opportunity selection
    const [meetingForm, setMeetingForm] = useState({
        id: null as string | null,
        meeting_date: "",
        meeting_time: "",
        meeting_type: "online" as MeetingType | "chat" | "call" | "email" | "other" | "whatsapp",
        attendees: "",
        internal_attendees: [] as string[],
        agenda: "",
        mom_content: "",
        mom_link: "",
        next_action: "",
        opportunity_id: "",
        mood: "neutral" as MoodType
    });

    const [selectedTag, setSelectedTag] = useState<CRMTag>("new");

    // State for MOM expansion
    const [expandedMomLogs, setExpandedMomLogs] = useState<Set<string>>(new Set());
    const toggleMomExpansion = (id: string) => {
        const newSet = new Set(expandedMomLogs);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedMomLogs(newSet);
    };

    const [contactForm, setContactForm] = useState({
        name: "",
        position: "",
        email: "",
        phone: "",
        is_primary: false,
        birth_date: "", // Added birth_date
        notes: "",
    });

    const hasFullAccess = profile?.job_type === "bisdev" || ["ceo", "super_admin"].includes(profile?.role || "");

    useEffect(() => {
        if (canAccessBisdev && clientId) {
            fetchAllData();
            // Trigger inactivity check (fire and forget)
            supabase.rpc('check_and_notify_inactivity').then(({ error }: { error: any }) => {
                if (error) console.error("Inactivity check error:", JSON.stringify(error, null, 2));
            });
            supabase.rpc('check_and_notify_birthdays').then(({ error }: { error: any }) => {
                if (error) console.error("Birthday check error:", JSON.stringify(error, null, 2));
            });
        }
    }, [canAccessBisdev, clientId]);

    const fetchAllData = async () => {
        try {
            // Fetch client
            const { data: clientData } = await supabase
                .from("crm_clients")
                .select("*, assigned_profile:profiles!crm_clients_assigned_to_fkey(full_name)")
                .eq("id", clientId)
                .single();

            if (clientData) {
                setClient(clientData);
                setTempDescription(clientData.description || "");
                setTempSource(clientData.source || "");
                setTempDate(clientData.created_at ? new Date(clientData.created_at).toISOString().slice(0, 10) : "");
                setTempNotes(clientData.notes || "");
            }

            // Fetch contacts
            const { data: contactsData } = await supabase
                .from("crm_client_contacts")
                .select("*")
                .eq("client_id", clientId)
                .order("is_primary", { ascending: false })
                .order("created_at", { ascending: true });

            setContacts(contactsData || []);

            // Fetch Opportunities with Revenue
            const { data: opportunitiesData } = await supabase
                .from("crm_opportunities")
                .select("*, revenue:crm_revenue(*)")
                .eq("client_id", clientId)
                .order("updated_at", { ascending: false });

            setOpportunities(opportunitiesData || []);

            // Fetch Logbook Data (Journey, Meetings)
            const { data: journeyData, error: journeyError } = await supabase
                .from("crm_journey")
                .select("*, created_by_profile:profiles!crm_journey_created_by_fkey(full_name), opportunity:crm_opportunities(title)")
                .eq("client_id", clientId)
                .order("created_at", { ascending: false });

            const { data: meetingsData, error: meetingsError } = await supabase
                .from("crm_meetings")
                .select("*, created_by_profile:profiles!crm_meetings_created_by_fkey(full_name), opportunity:crm_opportunities(title)")
                .eq("client_id", clientId)
                .order("meeting_date", { ascending: false });

            if (journeyError) console.error("Journey fetch error:", journeyError);
            if (meetingsError) console.error("Meetings fetch error:", meetingsError);

            const combinedLogs = [
                ...(journeyData || []).map((j: any) => ({
                    ...j,
                    type: 'journey',
                    date: j.created_at,
                    title: j.opportunity?.title,
                    opportunity_id: j.opportunity_id
                })),
                ...(meetingsData || []).map((m: any) => ({
                    ...m,
                    type: 'meeting',
                    date: m.meeting_date || m.created_at, // Fallback
                    title: m.opportunity?.title,
                    opportunity_id: m.opportunity_id
                })),
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            setLogbook(combinedLogs);
            setJourneyHistory(journeyData || []);

            // Fetch tags
            const { data: tagsData } = await supabase
                .from("crm_client_tags")
                .select("*")
                .eq("client_id", clientId);

            setTags(tagsData || []);

            // Fetch Employees (PICs) - Exclude HR
            const { data: empData, error: empError } = await supabase
                .from("profiles")
                .select("id, full_name, role, job_type")
                .neq("role", "hr")
                .order("full_name");

            if (empError) console.error("Error fetching employees:", empError);
            else setEmployees(empData || []);

        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveDescription = async () => {
        try {
            const { error } = await supabase
                .from("crm_clients")
                .update({ description: tempDescription })
                .eq("id", clientId);

            if (error) throw error;

            setClient(prev => prev ? { ...prev, description: tempDescription } : null);
            setIsEditingDescription(false);
        } catch (error) {
            console.error("Error updating description:", error);
            alert("Failed to update description");
        }
    };

    const handleSaveSource = async () => {
        try {
            const { error } = await supabase
                .from("crm_clients")
                .update({ source: tempSource })
                .eq("id", clientId);

            if (error) throw error;

            setClient(prev => prev ? { ...prev, source: tempSource } : null);
            setIsEditingSource(false);
        } catch (error) {
            console.error("Error updating source:", error);
            alert("Failed to update source");
        }
    };

    const handleSaveDate = async () => {
        try {
            const { error } = await supabase
                .from("crm_clients")
                .update({ created_at: new Date(tempDate).toISOString() })
                .eq("id", clientId);

            if (error) throw error;

            setClient(prev => prev ? { ...prev, created_at: new Date(tempDate).toISOString() } : null);
            setIsEditingDate(false);
        } catch (error) {
            console.error("Error updating date:", error);
            alert("Failed to update date");
        }
    };

    const handleSaveNotes = async () => {
        try {
            const { error } = await supabase
                .from("crm_clients")
                .update({ notes: tempNotes })
                .eq("id", clientId);

            if (error) throw error;

            setClient(prev => prev ? { ...prev, notes: tempNotes } : null);
            setIsEditingNotes(false);
        } catch (error) {
            console.error("Error updating notes:", error);
            alert("Failed to update notes");
        }
    };


    const tabs: { key: TabType; label: string; count?: number }[] = [
        { key: "overview", label: "Overview" },
        { key: "opportunities", label: "Opportunities", count: opportunities.length },
        { key: "logbook", label: "Log Book", count: logbook.length },
        { key: "contacts", label: "Contacts", count: contacts.length },
    ];

    const getLogIcon = (type: string, subtype?: string) => {
        switch (type) {
            case 'journey': return <div className="p-2 rounded-full bg-blue-100 text-blue-600"><TrendingUp className="h-4 w-4" /></div>;
            case 'meeting':
                if (subtype === 'call') return <div className="p-2 rounded-full bg-green-100 text-green-600"><Phone className="h-4 w-4" /></div>;
                if (subtype === 'chat' || subtype === 'whatsapp') return <div className="p-2 rounded-full bg-emerald-100 text-emerald-600"><MessageSquare className="h-4 w-4" /></div>;
                if (subtype === 'email') return <div className="p-2 rounded-full bg-indigo-100 text-indigo-600"><Mail className="h-4 w-4" /></div>;
                return <div className="p-2 rounded-full bg-purple-100 text-purple-600"><Calendar className="h-4 w-4" /></div>;
            case 'note':
                if (subtype === 'issue') return <div className="p-2 rounded-full bg-red-100 text-red-600"><AlertCircle className="h-4 w-4" /></div>;
                return <div className="p-2 rounded-full bg-amber-100 text-amber-600"><StickyNote className="h-4 w-4" /></div>;
            default: return <div className="p-2 rounded-full bg-gray-100 text-gray-600"><Dot className="h-4 w-4" /></div>;
        }
    };

    const handleDeleteStageLog = async (logId: string) => {
        if (!confirm("Delete this stage update log?")) return;
        try {
            const { error } = await supabase.from("crm_journey").delete().eq("id", logId);
            if (error) throw error;
            fetchAllData();
        } catch (error) {
            console.error("Error deleting stage log:", error);
            alert("Failed to delete stage log");
        }
    };

    const handleAddMeeting = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;

        try {
            // Combine Date and Time
            let finalDate = new Date().toISOString();
            if (meetingForm.meeting_date) {
                const timeStr = meetingForm.meeting_time || "09:00";
                const dateStr = meetingForm.meeting_date; // YYYY-MM-DD
                finalDate = new Date(`${dateStr}T${timeStr}:00`).toISOString();
            }

            const meetingPayload: any = {
                client_id: clientId,
                meeting_date: finalDate, // Save as ISO
                meeting_type: meetingForm.meeting_type,
                attendees: meetingForm.attendees || null, // External
                internal_attendees: meetingForm.internal_attendees?.length ? meetingForm.internal_attendees : [], // Internal
                agenda: meetingForm.agenda || null,
                mom_content: meetingForm.mom_content || null,
                mom_link: meetingForm.mom_link || null,
                next_action: meetingForm.next_action || null,
                opportunity_id: meetingForm.opportunity_id || null, // null if empty string
                mood: meetingForm.mood, // Added mood
                created_by: profile.id,
            };

            if (meetingForm.id) {
                // Update
                const { error } = await supabase.from("crm_meetings").update(meetingPayload).eq("id", meetingForm.id);
                if (error) throw error;
            } else {
                // Insert
                const { error } = await supabase.from("crm_meetings").insert(meetingPayload);
                if (error) throw error;
            }

            setShowMeetingForm(false);
            setMeetingForm({
                id: null,
                meeting_date: "",
                meeting_time: "",
                meeting_type: "online",
                attendees: "",
                internal_attendees: [],
                agenda: "",
                mom_content: "",
                mom_link: "",
                next_action: "",
                opportunity_id: "",
                mood: "neutral" // Reset mood
            });
            fetchAllData();
        } catch (error) {
            console.error("Error saving meeting:", error);
            alert("Failed to save interaction. Please check inputs.");
        }
    };

    const handleAddTag = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;

        try {
            // Enforce single tag policy: Delete existing tags first
            await supabase.from("crm_client_tags").delete().eq("client_id", clientId);

            const { error } = await supabase.from("crm_client_tags").insert({
                client_id: clientId,
                tag: selectedTag,
                notes: null,
                created_by: profile.id,
            });

            if (error) {
                if (error.code === '23505') { // Unique constraint violation
                    alert("This tag has already been added to this client.");
                    return;
                }
                throw error;
            }

            setShowTagForm(false);
            fetchAllData(); // Refresh to update UI
        } catch (error) {
            console.error("Error adding tag:", error);
            alert("Failed to add tag");
        }
    };

    // Revenue Management
    const [revenueForm, setRevenueForm] = useState({
        amount: 0,
        payment_date: new Date().toISOString().split('T')[0],
        notes: ''
    });
    const [pendingRevenue, setPendingRevenue] = useState<{ amount: number; payment_date: string; notes: string; _tempId: string }[]>([]);

    const handleAddRevenue = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!revenueForm.amount || revenueForm.amount <= 0) return;

        // Add to local pending list instead of DB
        setPendingRevenue(prev => [
            ...prev,
            {
                amount: revenueForm.amount,
                payment_date: revenueForm.payment_date,
                notes: revenueForm.notes,
                _tempId: crypto.randomUUID()
            }
        ]);

        // Reset form
        setRevenueForm({
            amount: 0,
            payment_date: new Date().toISOString().split('T')[0],
            notes: ''
        });
    };

    const handleDeletePendingRevenue = (tempId: string) => {
        setPendingRevenue(prev => prev.filter(r => r._tempId !== tempId));
    };

    const handleDeleteRevenue = async (revenueId: string) => {
        if (!confirm("Are you sure you want to delete this payment record?")) return;
        try {
            const { error } = await supabase.from('crm_revenue').delete().eq('id', revenueId);
            if (error) throw error;

            // Refresh detailed view
            const { data: updatedOpp } = await supabase
                .from('crm_opportunities')
                .select('*, revenue:crm_revenue(*)')
                .eq('id', editingOpportunity.id)
                .single();

            if (updatedOpp) {
                setEditingOpportunity(updatedOpp);
            }

            fetchAllData();
        } catch (error) {
            console.error("Error deleting revenue:", error);
            alert("Failed to delete payment record.");
        }
    };



    const handleDeleteTag = async (tagId: string) => {
        if (!confirm("Remove this tag?")) return;
        try {
            await supabase.from("crm_client_tags").delete().eq("id", tagId);
            fetchAllData();
        } catch (error) {
            console.error("Error deleting tag:", error);
        }
    };

    const handleDeleteMeeting = async (meetingId: string) => {
        if (!confirm("Delete this interaction?")) return;
        try {
            await supabase.from("crm_meetings").delete().eq("id", meetingId);
            fetchAllData();
        } catch (error) {
            console.error("Error deleting meeting:", error);
        }
    };

    const handleEditMeeting = (log: any) => {
        setMeetingForm({
            id: log.id,
            meeting_date: log.date ? new Date(log.date).toISOString().split('T')[0] : "",
            meeting_time: log.date ? new Date(log.date).toTimeString().slice(0, 5) : "",
            meeting_type: log.meeting_type as MeetingType,
            attendees: log.attendees || "",
            internal_attendees: log.internal_attendees || [],
            agenda: log.agenda || "",
            mom_content: log.mom_content || "",
            mom_link: log.mom_link || "",
            next_action: log.next_action || "",
            opportunity_id: log.opportunity_id || "",
            mood: (log.mood as MoodType) || "neutral"
        });
        setShowMeetingForm(true);
    };

    const handleAddContact = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;

        try {
            // If setting as primary, unset others first
            if (contactForm.is_primary) {
                await supabase
                    .from("crm_client_contacts")
                    .update({ is_primary: false })
                    .eq("client_id", clientId);
            }

            if (editingContact) {
                const { error } = await supabase
                    .from("crm_client_contacts")
                    .update({
                        name: contactForm.name,
                        position: contactForm.position || null,
                        email: contactForm.email || null,
                        phone: contactForm.phone || null,
                        is_primary: contactForm.is_primary,
                        birth_date: contactForm.birth_date || null, // Added birth_date
                        notes: contactForm.notes || null,
                    })
                    .eq("id", editingContact.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("crm_client_contacts").insert({
                    client_id: clientId,
                    name: contactForm.name,
                    position: contactForm.position || null,
                    email: contactForm.email || null,
                    phone: contactForm.phone || null,
                    is_primary: contactForm.is_primary,
                    birth_date: contactForm.birth_date || null, // Added birth_date
                    notes: contactForm.notes || null,
                    created_by: profile.id,
                });
                if (error) throw error;
            }

            setShowContactForm(false);
            setEditingContact(null);
            setShowContactForm(false);
            setEditingContact(null);
            setContactForm({ name: "", position: "", email: "", phone: "", is_primary: false, birth_date: "", notes: "" });
            fetchAllData();
        } catch (error) {
            console.error("Error saving contact:", error);
        }
    };

    const handleDeleteContact = async (contactId: string) => {
        if (!confirm("Delete this contact?")) return;
        try {
            await supabase.from("crm_client_contacts").delete().eq("id", contactId);
            fetchAllData();
        } catch (error) {
            console.error("Error deleting contact:", error);
        }
    };

    const openEditContact = (contact: Contact) => {
        setEditingContact(contact);
        setContactForm({
            name: contact.name,
            position: contact.position || "",
            email: contact.email || "",
            phone: contact.phone || "",
            is_primary: contact.is_primary,
            birth_date: contact.birth_date || "",
            notes: contact.notes || "",
        });
        setShowContactForm(true);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    const formatDateTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const handleDeleteOpportunity = async (oppId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent opening edit modal
        if (!confirm("Delete this opportunity?")) return;

        try {
            const { error } = await supabase.from("crm_opportunities").delete().eq("id", oppId);
            if (error) throw error;
            fetchAllData();
        } catch (error) {
            console.error("Error deleting opportunity:", error);
            alert("Failed to delete opportunity");
        }
    };

    const handleSaveOpportunity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;

        if (!opportunityForm.title?.trim()) {
            alert("Opportunity Title is required!");
            return;
        }

        if (!opportunityForm.opportunity_type) {
            alert("Opportunity Type is required!");
            return;
        }

        try {
            let finalDate = new Date().toISOString();
            if (opportunityForm.created_at) {
                const now = new Date();
                // Create date from input (YYYY-MM-DD) but use current time
                const [year, month, day] = opportunityForm.created_at.split('-').map(Number);
                const dateWithTime = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
                finalDate = dateWithTime.toISOString();
            }

            if (editingOpportunity) {
                // Update
                const { error } = await supabase
                    .from("crm_opportunities")
                    .update({
                        title: opportunityForm.title,
                        stage: opportunityForm.stage,
                        status: opportunityForm.status,
                        value: opportunityForm.value,
                        opportunity_type: opportunityForm.opportunity_type || null,
                        notes: opportunityForm.notes || null,
                        created_at: finalDate, // Allow updating created_at
                        updated_at: new Date().toISOString(),
                        has_proposal: opportunityForm.has_proposal,
                    })
                    .eq("id", editingOpportunity.id);

                if (error) throw error;

                // Log Update in Journey if changed
                if (editingOpportunity.stage !== opportunityForm.stage || editingOpportunity.status !== opportunityForm.status) {
                    await supabase.from("crm_journey").insert({
                        client_id: clientId,
                        opportunity_id: editingOpportunity.id,
                        from_stage: editingOpportunity.stage,
                        to_stage: opportunityForm.stage,
                        status: opportunityForm.status,
                        notes: `Updated opportunity: ${opportunityForm.title} (${editingOpportunity.status} -> ${opportunityForm.status})`,
                        created_by: profile.id,
                    });
                }

                // Auto-create "Proposal Sent" log if has_proposal is checked and log doesn't exist
                if (opportunityForm.stage === 'sales' && opportunityForm.has_proposal) {
                    const { data: existingLog } = await supabase
                        .from('crm_journey')
                        .select('id')
                        .eq('opportunity_id', editingOpportunity.id)
                        .eq('to_stage', 'proposal')
                        .eq('status', 'sent')
                        .single();

                    if (!existingLog) {
                        await supabase.from("crm_journey").insert({
                            client_id: clientId,
                            opportunity_id: editingOpportunity.id,
                            from_stage: 'prospect', // Assumed previous stage
                            to_stage: 'proposal',
                            status: 'sent',
                            notes: 'System Generated: Marked as "Through Proposal" manually.',
                            created_by: profile.id,
                            created_at: editingOpportunity.created_at || new Date().toISOString() // Backdate log
                        });
                    }
                }

                // Save pending revenue entries to DB
                if (pendingRevenue.length > 0) {
                    const revenueEntries = pendingRevenue.map(r => ({
                        opportunity_id: editingOpportunity.id,
                        amount: r.amount,
                        payment_date: r.payment_date,
                        notes: r.notes,
                        created_by: profile.id
                    }));
                    const { error: revError } = await supabase.from('crm_revenue').insert(revenueEntries);
                    if (revError) console.error('Error saving pending revenue:', revError);
                }

                setShowOpportunityForm(false);
                setEditingOpportunity(null);
                setPendingRevenue([]);
                setOpportunityForm({
                    title: "",
                    stage: "prospect",
                    status: "on_going",
                    value: 0,
                    priority: "medium",
                    opportunity_type: "",
                    cash_in: 0,
                    notes: "",
                    created_at: "",
                    has_proposal: false,
                });
                fetchAllData();
            } else {
                // Insert New
                const newOpp = {
                    client_id: clientId,
                    title: opportunityForm.title, // Title is NOT NULL
                    stage: opportunityForm.stage, // Stage is NOT NULL, check allowed values
                    status: opportunityForm.status, // Status is NOT NULL
                    value: opportunityForm.value,
                    priority: opportunityForm.priority,
                    opportunity_type: opportunityForm.opportunity_type,
                    notes: opportunityForm.notes || null,
                    created_at: finalDate, // Set custom date
                    created_by: profile.id,
                    has_proposal: opportunityForm.has_proposal,
                };

                const { data: opp, error } = await supabase
                    .from("crm_opportunities")
                    .insert(newOpp)
                    .select()
                    .single();

                if (error) {
                    console.error("Supabase Insert Error:", error);
                    throw error;
                }

                // Log Journey for Creation
                await supabase.from("crm_journey").insert({
                    client_id: clientId,
                    opportunity_id: opp.id,
                    from_stage: null,
                    to_stage: opportunityForm.stage,
                    status: opportunityForm.status,
                    notes: `Created new opportunity: ${opportunityForm.title}`,
                    created_at: finalDate, // Sync journey log with custom date
                    created_by: profile.id,
                });

                // Auto-create "Proposal Sent" log if has_proposal is checked
                if (opportunityForm.stage === 'sales' && opportunityForm.has_proposal) {
                    await supabase.from("crm_journey").insert({
                        client_id: clientId,
                        opportunity_id: opp.id,
                        from_stage: 'prospect',
                        to_stage: 'proposal',
                        status: 'sent',
                        notes: 'System Generated: Marked as "Through Proposal" manually.',
                        created_by: profile.id,
                        created_at: finalDate // Backdate log to creation time
                    });
                }

                // Save pending revenue entries for new opportunity
                if (pendingRevenue.length > 0) {
                    const revenueEntries = pendingRevenue.map(r => ({
                        opportunity_id: opp.id,
                        amount: r.amount,
                        payment_date: r.payment_date,
                        notes: r.notes,
                        created_by: profile.id
                    }));
                    const { error: revError } = await supabase.from('crm_revenue').insert(revenueEntries);
                    if (revError) console.error('Error saving pending revenue:', revError);
                }

                setShowOpportunityForm(false);
                setEditingOpportunity(null);
                setPendingRevenue([]);
                setOpportunityForm({
                    title: "",
                    stage: "prospect",
                    status: "on_going",
                    value: 0,
                    priority: "medium",
                    opportunity_type: "",
                    cash_in: 0,
                    notes: "",
                    created_at: "",
                    has_proposal: false,
                });
                fetchAllData();
            }
        } catch (error: any) {
            console.error("Error saving opportunity:", error);
            alert(`Failed to save opportunity. Error: ${error.message || JSON.stringify(error)}`);
        }
    };

    const openEditOpportunity = (opp: any) => {
        setEditingOpportunity(opp);
        setPendingRevenue([]);
        setOpportunityForm({
            title: opp.title,
            stage: opp.stage,
            status: opp.status,
            value: opp.value,
            priority: opp.priority,
            opportunity_type: opp.opportunity_type || "",
            cash_in: opp.cash_in || 0,
            notes: opp.notes || "",
            created_at: opp.created_at ? new Date(opp.created_at).toISOString().split('T')[0] : "",
            has_proposal: opp.has_proposal || false,
        });
        setShowOpportunityForm(true);
    };



    // Loading states
    if (authLoading || isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e8c559]"></div>
            </div>
        );
    }

    if (!canAccessBisdev) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="text-6xl mb-4">🔒</div>
                <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Access Denied</h2>
            </div>
        );
    }

    if (!client) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="text-6xl mb-4">❓</div>
                <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Client Not Found</h2>
                <Link href="/dashboard/bisdev/crm" className="text-[#e8c559] hover:underline">
                    Back to CRM
                </Link>
            </div>
        );
    }



    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/bisdev/crm"
                        className="p-2 rounded-lg border border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)]"
                    >
                        <ChevronLeft className="h-5 w-5 text-[var(--text-secondary)]" />
                    </Link>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg">
                        <Building2 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-[var(--text-secondary)]">
                            <Link href="/dashboard" className="hover:text-[var(--text-primary)]">Dashboard</Link>
                            <ChevronRight className="h-4 w-4" />
                            <Link href="/dashboard/bisdev" className="hover:text-[var(--text-primary)]">Bisdev</Link>
                            <ChevronRight className="h-4 w-4" />
                            <Link href="/dashboard/bisdev/crm" className="hover:text-[var(--text-primary)]">CRM</Link>
                            <ChevronRight className="h-4 w-4" />
                            <span className="text-[var(--text-primary)]">Detail</span>
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{client.company_name}</h1>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {client.client_type && (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${client.client_type === 'company'
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                    : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                                    }`}>
                                    {client.client_type}
                                </span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${CATEGORY_CONFIG[client.category as CRMCategory]?.color}`}>
                                {CATEGORY_CONFIG[client.category as CRMCategory]?.label}
                            </span>
                            {tags.map((t) => (
                                <div
                                    key={t.id}
                                    className="group relative flex items-center cursor-default"
                                >
                                    <span className="text-xl">
                                        {TAG_CONFIG[t.tag]?.icon}
                                    </span>
                                    <button
                                        onClick={() => handleDeleteTag(t.id)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-3 h-3 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Remove tag"
                                    >
                                        <X className="w-2 h-2" />
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={() => setShowTagForm(true)}
                                className="ml-1 w-5 h-5 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center hover:bg-[#e8c559] hover:text-black transition-colors"
                                title="Add Tag"
                            >
                                <Plus className="h-3 w-3" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stage Progress - REMOVED per user request */}

            {/* Tabs */}
            <div className="flex gap-1 mb-4 overflow-x-auto pb-2">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.key
                            ? "bg-[#e8c559] text-[#171611]"
                            : "bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] hover:bg-black/10"
                            }`}
                    >
                        {tab.label}
                        {tab.count !== undefined && tab.count > 0 && (
                            <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-black/10">{tab.count}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
                {/* Overview Tab */}
                {/* Dashboard Metrics */}
                {/* Dashboard Metrics */}
                {activeTab === "overview" && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {(() => {
                            // --- Logic aligned with Main Dashboard (src/app/(dashboard)/dashboard/bisdev/page.tsx) ---

                            // 1. Sales Count: Stage == 'sales'
                            const salesOpps = opportunities.filter(o => o.stage === 'sales');
                            const salesCount = salesOpps.length;

                            // 2. Proposals Sent: Status == 'sent' OR Stage > 'proposal'
                            // Logic: Journey logs (history) OR Current State OR Manual Flag
                            const oppIds = opportunities.map(o => o.id);
                            let proposalCount = 0;
                            const journeyIds = new Set<string>();

                            // a) Check Journey History
                            if (journeyHistory && journeyHistory.length > 0) {
                                journeyHistory.forEach((j: any) => {
                                    if (j.to_stage === 'proposal' && ['sent', 'follow_up'].includes(j.status)) {
                                        journeyIds.add(j.opportunity_id);
                                    }
                                });
                            }

                            // b) Check Current State & Manual Flag
                            opportunities.forEach(o => {
                                if (o.stage === 'proposal' && ['sent', 'follow_up'].includes(o.status)) {
                                    journeyIds.add(o.id);
                                }
                                if (o.has_proposal) {
                                    journeyIds.add(o.id);
                                }
                            });
                            proposalCount = journeyIds.size;

                            // 3. Sales Conversion: (Qualified Sales / Proposals Sent) * 100
                            let qualifiedSalesCount = 0;
                            const salesOppIds = salesOpps.map(o => o.id);
                            const qualifiedSalesJourneyIds = new Set<string>();

                            if (journeyHistory && journeyHistory.length > 0) {
                                journeyHistory.forEach((j: any) => {
                                    if (salesOppIds.includes(j.opportunity_id) && ['leads', 'proposal'].includes(j.from_stage)) {
                                        qualifiedSalesJourneyIds.add(j.opportunity_id);
                                    }
                                });
                            }

                            salesOpps.forEach(o => {
                                if (o.has_proposal || qualifiedSalesJourneyIds.has(o.id)) {
                                    qualifiedSalesCount++;
                                }
                            });

                            const conversionRate = proposalCount > 0
                                ? ((qualifiedSalesCount / proposalCount) * 100).toFixed(1)
                                : '0.0';

                            // 4. Financials
                            // Cash In: Sum of payments (revenue) from ALL opportunities
                            const cashIn = opportunities.reduce((sum, o) => {
                                const oppRevenue = o.revenue?.reduce((rSum: number, r: any) => rSum + (r.amount || 0), 0) || 0;
                                return sum + oppRevenue;
                            }, 0);

                            // Sales Booking: Sum of Value in 'sales' stage
                            const salesBooking = salesOpps.reduce((sum, o) => sum + (o.value || 0), 0);

                            // Leads Value: Sum of value in 'leads' stage only (Snapshot view)
                            const leadsValue = opportunities
                                .filter(o => o.stage === 'leads')
                                .reduce((sum, o) => sum + (o.value || 0), 0);

                            return (
                                <>
                                    {/* Sales Booking (Value) */}
                                    <div className="p-4 rounded-xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] flex flex-col items-center justify-center text-center">
                                        <p className="text-xs text-[var(--text-muted)] uppercase font-bold tracking-wider mb-1">Sales Booking</p>
                                        <p className="text-xl font-bold text-blue-600">
                                            Rp {salesBooking.toLocaleString('id-ID')}
                                        </p>
                                        <p className="text-[10px] text-[var(--text-muted)]">Total Contract Value</p>
                                    </div>

                                    {/* Cash In (Revenue) */}
                                    <div className="p-4 rounded-xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] flex flex-col items-center justify-center text-center">
                                        <p className="text-xs text-[var(--text-muted)] uppercase font-bold tracking-wider mb-1">Cash In</p>
                                        <p className="text-xl font-bold text-emerald-600">
                                            Rp {cashIn.toLocaleString('id-ID')}
                                        </p>
                                        <p className="text-[10px] text-[var(--text-muted)]">Actual Paid Amount</p>
                                    </div>

                                    {/* Leads Value */}
                                    <div className="p-4 rounded-xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] flex flex-col items-center justify-center text-center">
                                        <p className="text-xs text-[var(--text-muted)] uppercase font-bold tracking-wider mb-1">Leads Value</p>
                                        <p className="text-xl font-bold text-indigo-500">
                                            Rp {leadsValue.toLocaleString('id-ID')}
                                        </p>
                                        <p className="text-[10px] text-[var(--text-muted)]">Stage: Leads</p>
                                    </div>

                                    {/* Conversion Rate */}
                                    <div className="p-4 rounded-xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] flex flex-col items-center justify-center text-center">
                                        <p className="text-xs text-[var(--text-muted)] uppercase font-bold tracking-wider mb-1">Conversion Rate</p>
                                        <p className="text-xl font-bold text-amber-500">
                                            {conversionRate}%
                                        </p>
                                        <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                                            <span>{salesCount} Sales</span>
                                            <span>/</span>
                                            <span>{proposalCount} Proposals</span>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                )}

                {/* Overview Tab */}
                {activeTab === "overview" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Reminders Card (Birthdays & Inactivity) */}


                        <div className="p-4 rounded-xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)]">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                                    <Users className="h-4 w-4" /> Contacts ({contacts.length})
                                </h3>
                                {contacts.length > 0 && (
                                    <button
                                        onClick={() => {
                                            setContactForm({ name: "", email: "", phone: "", position: "", is_primary: false, birth_date: "", notes: "" });
                                            setShowContactForm(true);
                                        }}
                                        className="px-3 py-1 text-xs font-bold rounded-lg bg-[#e8c559] text-[#171611] hover:bg-[#d4b44e] transition-colors flex items-center gap-1"
                                    >
                                        <Plus className="h-3 w-3" /> Add
                                    </button>
                                )}
                            </div>
                            {contacts.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="w-12 h-12 bg-gray-50 dark:bg-indigo-900/20 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-3 border border-gray-100 dark:border-none">
                                        <User className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">No Contacts Yet</h3>
                                    <p className="text-xs text-[var(--text-secondary)] mb-4 max-w-[200px] mx-auto">
                                        Add key stakeholders for this client.
                                    </p>
                                    <button
                                        onClick={() => {
                                            setContactForm({ name: "", email: "", phone: "", position: "", is_primary: false, birth_date: "", notes: "" });
                                            setShowContactForm(true);
                                        }}
                                        className="px-4 py-2 bg-[#e8c559] text-[#171611] font-bold rounded-lg hover:bg-[#d4b44e] transition-colors text-xs flex items-center justify-center gap-2 mx-auto shadow-sm"
                                    >
                                        <Plus className="h-3.5 w-3.5" /> Add First Contact
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {contacts.slice(0, 3).map((c) => (
                                        <div key={c.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer group" onClick={() => setActiveTab("contacts")}>
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center border border-indigo-200 dark:border-transparent">
                                                <User className="h-4 w-4 text-indigo-600 dark:text-indigo-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-indigo-600 transition-colors">{c.name}</p>
                                                    {c.is_primary && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                                                </div>
                                                <p className="text-xs text-[var(--text-muted)] truncate">{c.position || "-"}</p>
                                                {c.phone && <p className="text-xs text-[var(--text-secondary)]">{c.phone}</p>}
                                                {c.birth_date && (
                                                    <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1 mt-0.5">
                                                        <Sparkles className="h-3 w-3 text-pink-400" />
                                                        {new Date(c.birth_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {contacts.length > 3 && (
                                        <button onClick={() => setActiveTab("contacts")} className="text-xs text-[#e8c559] hover:underline px-2">
                                            View all {contacts.length} contacts
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Last Interaction Card */}
                        <div className="p-4 rounded-xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)]">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                                    <History className="h-4 w-4" /> Last Interaction
                                </h3>
                                {logbook.length > 0 && (
                                    <button
                                        onClick={() => {
                                            setMeetingForm(prev => ({ ...prev, opportunity_id: "", meeting_type: "online" }));
                                            setShowMeetingForm(true);
                                        }}
                                        className="px-3 py-1 text-xs font-bold rounded-lg bg-[#e8c559] text-[#171611] hover:bg-[#d4b44e] transition-colors flex items-center gap-1"
                                    >
                                        <Plus className="h-3 w-3" /> Add
                                    </button>
                                )}
                            </div>

                            {logbook.length > 0 ? (
                                (() => {
                                    const latestLog = [...logbook].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                                    return (
                                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-[var(--glass-border)] space-y-3">
                                            {/* Header: Type, Mood, Date */}
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${latestLog.type === 'journey' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                                        {latestLog.type === 'journey' ? <ArrowRight className="h-4 w-4" /> :
                                                            (latestLog.meeting_type === 'call' ? <Phone className="h-4 w-4" /> :
                                                                latestLog.meeting_type === 'video' ? <Video className="h-4 w-4" /> :
                                                                    latestLog.meeting_type === 'offline' ? <Users className="h-4 w-4" /> :
                                                                        <MessageSquare className="h-4 w-4" />)}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-xs font-bold text-[var(--text-primary)] capitalize">
                                                                {latestLog.meeting_type ? (MEETING_TYPES[latestLog.meeting_type as MeetingType]?.label || latestLog.meeting_type) : 'Interaction'}
                                                            </p>
                                                            {latestLog.mood && MOOD_CONFIG[latestLog.mood as MoodType] && (
                                                                <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${MOOD_CONFIG[latestLog.mood as MoodType].color}`} title={MOOD_CONFIG[latestLog.mood as MoodType].label}>
                                                                    {MOOD_CONFIG[latestLog.mood as MoodType].icon}
                                                                    <span className="font-medium">{MOOD_CONFIG[latestLog.mood as MoodType].label}</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            {new Date(latestLog.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                                {latestLog.opportunity?.title && (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 max-w-[100px] truncate">
                                                        {latestLog.opportunity.title}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Details Grid */}
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div className="col-span-2 sm:col-span-1">
                                                    <p className="text-[10px] text-[var(--text-muted)] font-semibold mb-0.5">Internal PIC</p>
                                                    <div className="flex items-center gap-1.5 p-1.5 bg-white dark:bg-black/20 rounded border border-[var(--glass-border)] min-h-[32px]">
                                                        <User className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
                                                        <span className="truncate text-[var(--text-secondary)]">
                                                            {latestLog.internal_attendees?.length > 0
                                                                ? latestLog.internal_attendees.map((id: string) => employees.find(e => e.id === id)?.full_name).filter(Boolean).join(", ")
                                                                : latestLog.created_by_profile?.full_name || 'Unknown'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="col-span-2 sm:col-span-1">
                                                    <p className="text-[10px] text-[var(--text-muted)] font-semibold mb-0.5">External</p>
                                                    <div className="flex items-center gap-1.5 p-1.5 bg-white dark:bg-black/20 rounded border border-[var(--glass-border)] min-h-[32px] truncate">
                                                        <Users className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
                                                        <span className="truncate text-[var(--text-secondary)]">{latestLog.attendees || '-'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Content: Agenda, MOM, Link */}
                                            <div className="space-y-2 bg-white dark:bg-black/20 p-2 rounded border border-[var(--glass-border)]">
                                                {latestLog.agenda && (
                                                    <div>
                                                        <p className="text-[10px] text-[var(--text-muted)] font-semibold">Agenda</p>
                                                        <p className="text-xs text-[var(--text-primary)]">{latestLog.agenda}</p>
                                                    </div>
                                                )}
                                                {latestLog.mom_content && (
                                                    <div>
                                                        <p className="text-[10px] text-[var(--text-muted)] font-semibold">MOM</p>
                                                        <p className="text-xs text-[var(--text-secondary)] line-clamp-3 italic">"{latestLog.mom_content}"</p>
                                                    </div>
                                                )}
                                                {latestLog.mom_link && (
                                                    <div className="pt-1">
                                                        <a href={latestLog.mom_link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                                            <LinkIcon className="h-3 w-3" /> View Document
                                                        </a>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Next Action */}
                                            {latestLog.next_action && (
                                                <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/10 rounded border border-amber-100 dark:border-amber-900/20">
                                                    <ArrowRight className="h-3 w-3 text-amber-600 mt-0.5" />
                                                    <div>
                                                        <p className="text-[10px] font-bold text-amber-700 dark:text-amber-500">Next Action</p>
                                                        <p className="text-xs text-amber-800 dark:text-amber-400">{latestLog.next_action}</p>
                                                    </div>
                                                </div>
                                            )}

                                            <button
                                                onClick={() => setActiveTab("logbook")}
                                                className="w-full text-center text-xs text-indigo-600 hover:underline pt-1 border-t border-[var(--glass-border)] mt-1"
                                            >
                                                View Full History
                                            </button>
                                        </div>
                                    );
                                })()
                            ) : (
                                <div className="text-center py-8">
                                    <div className="w-12 h-12 bg-gray-50 dark:bg-indigo-900/20 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-3 border border-gray-100 dark:border-none">
                                        <MessageSquare className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">No Interactions Yet</h3>
                                    <p className="text-xs text-[var(--text-secondary)] mb-4 max-w-[200px] mx-auto">
                                        Record meetings, calls, or notes for this client.
                                    </p>
                                    <button
                                        onClick={() => {
                                            setMeetingForm(prev => ({ ...prev, opportunity_id: "", meeting_type: "online" }));
                                            setShowMeetingForm(true);
                                        }}
                                        className="px-4 py-2 bg-[#e8c559] text-[#171611] font-bold rounded-lg hover:bg-[#d4b44e] transition-colors text-xs flex items-center justify-center gap-2 mx-auto shadow-sm"
                                    >
                                        <Plus className="h-3.5 w-3.5" /> Add First Interaction
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Reminders Card (Birthdays & Inactivity) */}
                        <div className="p-4 rounded-xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)]">
                            <h3 className="font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                                <Clock className="h-4 w-4" /> Reminders & Alerts
                            </h3>
                            <div className="space-y-4">
                                {/* Birthdays */}
                                <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-[var(--glass-border)]">
                                    <h4 className="text-sm font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                                        <Sparkles className="h-4 w-4 text-pink-500" /> Upcoming Birthdays (30 Days)
                                    </h4>
                                    {(() => {
                                        const upcomingBirthdays = contacts.filter(c => {
                                            if (!c.birth_date) return false;
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);
                                            const birthDate = new Date(c.birth_date);
                                            const nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
                                            if (nextBirthday < today) nextBirthday.setFullYear(today.getFullYear() + 1);
                                            const diffDays = Math.ceil((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                            return diffDays <= 30;
                                        }).sort((a, b) => {
                                            const getNextBirthday = (d: string) => {
                                                const today = new Date();
                                                today.setHours(0, 0, 0, 0);
                                                const bd = new Date(d);
                                                const next = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
                                                if (next < today) next.setFullYear(today.getFullYear() + 1);
                                                return next;
                                            };
                                            return getNextBirthday(a.birth_date!).getTime() - getNextBirthday(b.birth_date!).getTime();
                                        });

                                        if (upcomingBirthdays.length === 0) return <p className="text-xs text-[var(--text-muted)] italic">No upcoming birthdays.</p>;

                                        return (
                                            <ul className="space-y-2">
                                                {upcomingBirthdays.map(c => {
                                                    const bdate = new Date(c.birth_date!);
                                                    const today = new Date();
                                                    const nextBirthday = new Date(today.getFullYear(), bdate.getMonth(), bdate.getDate());
                                                    if (nextBirthday < today) nextBirthday.setFullYear(today.getFullYear() + 1);
                                                    const dayDiff = Math.ceil((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                                                    return (
                                                        <li key={c.id} className="text-xs flex justify-between items-center text-[var(--text-secondary)]">
                                                            <span>{c.name} ({c.position || '-'})</span>
                                                            <span className="font-bold text-pink-600 bg-pink-50 dark:bg-pink-900/20 px-2 py-0.5 rounded-full">
                                                                {dayDiff === 0 ? "Today!" : `${bdate.getDate()} ${bdate.toLocaleString('default', { month: 'short' })}`}
                                                            </span>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        );
                                    })()}
                                </div>

                                {/* Inactivity Alert */}
                                <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-[var(--glass-border)]">
                                    <h4 className="text-sm font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                                        <History className="h-4 w-4 text-blue-500" /> Inactivity Status
                                    </h4>
                                    {(() => {
                                        const lastInteraction = logbook.length > 0 ? new Date(logbook[0].date) : (client?.created_at ? new Date(client.created_at) : null);
                                        if (!lastInteraction) return <p className="text-xs text-[var(--text-muted)]">No data.</p>;

                                        const daysInactive = Math.floor((new Date().getTime() - lastInteraction.getTime()) / (1000 * 60 * 60 * 24));

                                        let alertColor = "text-green-600 bg-green-50 dark:bg-green-900/20";
                                        let message = "Active";
                                        if (daysInactive > 90) { alertColor = "text-red-600 bg-red-50 dark:bg-red-900/20"; message = "Critical Inactivity"; }
                                        else if (daysInactive > 30) { alertColor = "text-amber-600 bg-amber-50 dark:bg-amber-900/20"; message = "Needs Attention"; }
                                        else if (daysInactive > 14) { alertColor = "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20"; message = "Slowing Down"; }

                                        return (
                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-[var(--text-muted)]">Days since last interaction</span>
                                                    <span className="text-2xl font-bold text-[var(--text-primary)]">{daysInactive}</span>
                                                </div>
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${alertColor}`}>
                                                    {message}
                                                </span>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)]">
                            <h3 className="font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                                <FileText className="h-4 w-4" /> Details
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-xs text-[var(--text-muted)]">Description</p>
                                        {!isEditingDescription && (
                                            <button
                                                onClick={() => setIsEditingDescription(true)}
                                                className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-[#e8c559]"
                                                title="Edit Description"
                                            >
                                                <Edit3 className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>
                                    {isEditingDescription ? (
                                        <div className="space-y-2">
                                            <textarea
                                                value={tempDescription}
                                                onChange={(e) => setTempDescription(e.target.value)}
                                                className="w-full text-sm p-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] focus:outline-none focus:ring-1 focus:ring-[#e8c559]"
                                                rows={3}
                                                placeholder="Enter description..."
                                            />
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setIsEditingDescription(false);
                                                        setTempDescription(client.description || "");
                                                    }}
                                                    className="px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleSaveDescription}
                                                    className="px-2 py-1 text-xs rounded bg-[#e8c559] text-[#171611] font-bold hover:bg-[#d4b44e]"
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm font-medium text-[var(--text-primary)] whitespace-pre-wrap">
                                            {client.description || <span className="text-[var(--text-muted)] italic">No description</span>}
                                        </p>
                                    )}
                                </div>
                                <hr className="border-[var(--glass-border)]" />
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-xs text-[var(--text-muted)]">Source</p>
                                        {!isEditingSource && (
                                            <button
                                                onClick={() => setIsEditingSource(true)}
                                                className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-[#e8c559]"
                                                title="Edit Source"
                                            >
                                                <Edit3 className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>
                                    {isEditingSource ? (
                                        <div className="space-y-2">
                                            <input
                                                type="text"
                                                value={tempSource}
                                                onChange={(e) => setTempSource(e.target.value)}
                                                className="w-full text-sm p-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] focus:outline-none focus:ring-1 focus:ring-[#e8c559]"
                                                placeholder="Enter source..."
                                            />
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setIsEditingSource(false);
                                                        setTempSource(client.source || "");
                                                    }}
                                                    className="px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleSaveSource}
                                                    className="px-2 py-1 text-xs rounded bg-[#e8c559] text-[#171611] font-bold hover:bg-[#d4b44e]"
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm font-medium text-[var(--text-primary)]">
                                            {client.source || <span className="text-[var(--text-muted)] italic">-</span>}
                                        </p>
                                    )}

                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-xs text-[var(--text-muted)]">Tanggal Pertama Kali Kenal</p>
                                        {!isEditingDate && (
                                            <button
                                                onClick={() => setIsEditingDate(true)}
                                                className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-[#e8c559]"
                                                title="Edit Date"
                                            >
                                                <Edit3 className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>
                                    {isEditingDate ? (
                                        <div className="space-y-2">
                                            <input
                                                type="date"
                                                value={tempDate}
                                                onChange={(e) => setTempDate(e.target.value)}
                                                className="w-full text-sm p-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] focus:outline-none focus:ring-1 focus:ring-[#e8c559]"
                                            />
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setIsEditingDate(false);
                                                        setTempDate(client.created_at ? new Date(client.created_at).toISOString().slice(0, 10) : "");
                                                    }}
                                                    className="px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleSaveDate}
                                                    className="px-2 py-1 text-xs rounded bg-[#e8c559] text-[#171611] font-bold hover:bg-[#d4b44e]"
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm font-medium text-[var(--text-primary)]">{formatDate(client.created_at)}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Notes Section - Editable */}
                        <div className="md:col-span-2 p-4 rounded-xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)]">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-[var(--text-primary)]">Notes</h3>
                                {!isEditingNotes && (
                                    <button
                                        onClick={() => setIsEditingNotes(true)}
                                        className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-[#e8c559]"
                                        title="Edit Notes"
                                    >
                                        <Edit3 className="h-3 w-3" />
                                    </button>
                                )}
                            </div>

                            {isEditingNotes ? (
                                <div className="space-y-2">
                                    <textarea
                                        value={tempNotes}
                                        onChange={(e) => setTempNotes(e.target.value)}
                                        className="w-full text-sm p-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] focus:outline-none focus:ring-1 focus:ring-[#e8c559]"
                                        rows={4}
                                        placeholder="Enter notes..."
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => {
                                                setIsEditingNotes(false);
                                                setTempNotes(client.notes || "");
                                            }}
                                            className="px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSaveNotes}
                                            className="px-2 py-1 text-xs rounded bg-[#e8c559] text-[#171611] font-bold hover:bg-[#d4b44e]"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                                    {client.notes || <span className="text-[var(--text-muted)] italic">No notes added.</span>}
                                </p>
                            )}
                        </div>
                    </div>
                )
                }

                {/* Opportunities Tab */}
                {
                    activeTab === "opportunities" && (
                        <div className="space-y-4">
                            {opportunities.length > 0 && (
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => {
                                            setEditingOpportunity(null);
                                            setOpportunityForm({ title: "", stage: "prospect", status: "on_going", value: 0, priority: "medium", opportunity_type: "", cash_in: 0, notes: "", created_at: "", has_proposal: false });
                                            setShowOpportunityForm(true);
                                        }}
                                        className="px-4 py-2 bg-[#e8c559] text-white font-bold rounded-xl hover:bg-[#d4b44e] transition-colors flex items-center gap-2"
                                    >
                                        <Plus className="h-4 w-4" /> Add Opportunity
                                    </button>
                                </div>
                            )}

                            {opportunities.length === 0 ? (
                                <div className="text-center py-12 bg-white dark:bg-[#1c2120] rounded-xl border border-[var(--glass-border)]">
                                    <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <DollarSign className="h-8 w-8" />
                                    </div>
                                    <h3 className="text-lg font-bold text-[var(--text-primary)]">No Opportunities Yet</h3>
                                    <p className="text-[var(--text-secondary)] mb-6">Start tracking opportunities for this client.</p>
                                    <button
                                        onClick={() => setShowOpportunityForm(true)}
                                        className="px-6 py-2 bg-amber-400 text-black font-bold rounded-lg hover:bg-amber-500 transition-colors"
                                    >
                                        Create Opportunity
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {opportunities.map(opp => (
                                        <div
                                            key={opp.id}
                                            onClick={() => openEditOpportunity(opp)}
                                            className="text-left w-full p-4 rounded-xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] hover:border-amber-400/50 hover:shadow-md transition-all group cursor-pointer"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-[var(--text-primary)] line-clamp-1">{opp.title}</h4>
                                                <div className="flex gap-1">
                                                    {/* Stage Badge */}
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${opp.stage === 'prospect' ? 'bg-blue-100 text-blue-700' :
                                                        opp.stage === 'proposal' ? 'bg-purple-100 text-purple-700' :
                                                            opp.stage === 'leads' ? 'bg-orange-100 text-orange-700' :
                                                                'bg-emerald-100 text-emerald-700'
                                                        }`}>
                                                        {opp.stage}
                                                    </span>
                                                    {/* Status Badge */}
                                                    <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                                        {opp.status.replace('_', ' ')}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-3">
                                                <span className="font-mono text-emerald-600 font-bold">
                                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumSignificantDigits: 3 }).format(opp.value)}
                                                </span>
                                                <span>•</span>
                                                <span>Updated: {new Date(opp.updated_at).toLocaleDateString()}</span>
                                            </div>

                                            {/* Notes Display */}
                                            {opp.notes && (
                                                <p className="text-xs text-[var(--text-secondary)] mb-3 line-clamp-2 italic">
                                                    "{opp.notes}"
                                                </p>
                                            )}

                                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-[var(--glass-border)]">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${opp.priority === 'high' ? 'bg-red-100 text-red-600' :
                                                        opp.priority === 'medium' ? 'bg-amber-100 text-amber-600' :
                                                            'bg-green-100 text-green-600'
                                                        } capitalize`}>
                                                        {opp.priority}
                                                    </span>
                                                    {opp.opportunity_type && (
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${opp.opportunity_type === 'customer_based'
                                                            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
                                                            : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800'
                                                            }`}>
                                                            {opp.opportunity_type === 'customer_based' ? 'Customer' : 'Product'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <div
                                                        onClick={(e) => e.stopPropagation()}
                                                        title="Go to Board"
                                                    >
                                                        <Link
                                                            href={`/dashboard/bisdev/opportunities?stage=${opp.stage}`}
                                                            className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-secondary)] hover:text-amber-500 transition-colors block"
                                                        >
                                                            <LayoutGrid className="h-4 w-4" />
                                                        </Link>
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); openEditOpportunity(opp); }}
                                                        className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-secondary)] hover:text-blue-500 transition-colors"
                                                        title="Edit Details"
                                                    >
                                                        <Edit3 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDeleteOpportunity(opp.id, e)}
                                                        className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-[var(--text-secondary)] hover:text-red-500 transition-colors"
                                                        title="Delete Opportunity"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                }

                {/* Log Book Tab */}
                {
                    activeTab === "logbook" && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-bold text-[var(--text-primary)]">Logbook</h3>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={selectedLogFilter}
                                        onChange={(e) => setSelectedLogFilter(e.target.value)}
                                        className="px-3 py-1.5 rounded-lg border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                    >
                                        <option value="all">All Interactions</option>
                                        <option value="general">General Only</option>
                                        {opportunities.map(opp => (
                                            <option key={opp.id} value={opp.id}>{opp.title}</option>
                                        ))}
                                    </select>
                                    <Link
                                        href="/dashboard/bisdev/opportunities"
                                        className="px-3 py-1.5 rounded-lg border border-[var(--glass-border)] text-xs font-medium hover:bg-amber-50 dark:hover:bg-amber-900/20 text-[var(--text-secondary)] hover:text-amber-600 transition-colors flex items-center gap-2"
                                    >
                                        <LayoutGrid className="h-3.5 w-3.5" />
                                        Board
                                    </Link>
                                    <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={hideStageUpdates}
                                            onChange={(e) => setHideStageUpdates(e.target.checked)}
                                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-xs font-medium text-[var(--text-secondary)]">Hide Updates</span>
                                    </label>
                                </div>
                            </div>
                            {/* Filtered Timeline Style */}
                            <div className="space-y-4">
                                {(() => {
                                    const filteredLogs = logbook.filter(log => {
                                        if (hideStageUpdates && log.type === 'journey') return false;
                                        if (selectedLogFilter === 'all') return true;
                                        if (selectedLogFilter === 'general') return !log.opportunity_id;
                                        return log.opportunity_id === selectedLogFilter;
                                    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                                    if (filteredLogs.length === 0) {
                                        return (
                                            <div className="text-center py-12 bg-white dark:bg-[#1c2120] rounded-xl border border-[var(--glass-border)] text-[var(--text-muted)]">
                                                <History className="h-8 w-8 mx-auto mb-3 opacity-20" />
                                                <p>No interactions found for this filter.</p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="relative border-l-2 border-[var(--glass-border)] ml-4 space-y-6 pt-2 pb-2">
                                            {filteredLogs.map((log) => (
                                                <div key={`${log.type}-${log.id}`} className="relative pl-8">
                                                    {/* Icon Line */}
                                                    <div className="absolute -left-[9px] top-0 bg-white dark:bg-[#1c2120] p-1 rounded-full border border-[var(--glass-border)] z-10">
                                                        {getLogIcon(log.type, log.meeting_type || log.note_type)}
                                                    </div>

                                                    {/* Content Card */}
                                                    <div className="p-3 rounded-xl bg-white dark:bg-[#1c2120] border border-[var(--glass-border)] shadow-sm hover:border-[#e8c559]/30 transition-colors">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-[var(--text-primary)] capitalize text-sm">
                                                                        {log.type === 'journey'
                                                                            ? `Stage Updated: ${STAGE_CONFIG[log.to_stage as CRMStage]?.label || log.to_stage}`
                                                                            : (MEETING_TYPES[log.meeting_type as MeetingType]?.label || log.meeting_type || 'Interaction')}
                                                                    </span>
                                                                    {/* Mood Display */}
                                                                    {log.type === 'meeting' && log.mood && MOOD_CONFIG[log.mood as MoodType] && (
                                                                        <span className="text-lg" title={`Mood: ${MOOD_CONFIG[log.mood as MoodType].label}`}>
                                                                            {MOOD_CONFIG[log.mood as MoodType].icon}
                                                                        </span>
                                                                    )}
                                                                    <span className="text-[10px] text-[var(--text-muted)]">• {formatDateTime(log.date)}</span>
                                                                </div>
                                                                {/* Opportunity Badge if in "All" view */}
                                                                {selectedLogFilter === 'all' && log.opportunity?.title && (
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center gap-1 max-w-fit">
                                                                            <TrendingUp className="h-3 w-3" />
                                                                            {log.opportunity.title}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex gap-1">
                                                                {(log.type === 'meeting') && hasFullAccess && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => handleEditMeeting(log)}
                                                                            className="text-[var(--text-muted)] hover:text-blue-500 transition-colors"
                                                                            title="Edit"
                                                                        >
                                                                            <Edit3 className="h-3 w-3" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteMeeting(log.id)}
                                                                            className="text-[var(--text-muted)] hover:text-red-500 transition-colors"
                                                                            title="Delete"
                                                                        >
                                                                            <Trash2 className="h-3 w-3" />
                                                                        </button>
                                                                    </>
                                                                )}
                                                                {(log.type === 'journey') && hasFullAccess && (
                                                                    <button
                                                                        onClick={() => handleDeleteStageLog(log.id)}
                                                                        className="text-[var(--text-muted)] hover:text-red-500 transition-colors"
                                                                        title="Delete Stage Log"
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="text-sm text-[var(--text-secondary)]">
                                                            {log.type === 'journey' && (
                                                                <div className="flex flex-col gap-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="bg-gray-100 px-2 py-0.5 rounded text-xs line-through text-gray-500">{STAGE_CONFIG[log.from_stage as CRMStage]?.label || 'Unknown'}</span>
                                                                        <ChevronRight className="h-3 w-3 text-gray-400" />
                                                                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs font-bold">{STAGE_CONFIG[log.to_stage as CRMStage]?.label}</span>
                                                                    </div>
                                                                    {log.notes && <p className="mt-2 italic">"{log.notes}"</p>}
                                                                </div>
                                                            )}

                                                            {log.type === 'meeting' && (
                                                                <div className="space-y-2 mt-2">
                                                                    {/* Agenda */}
                                                                    {log.agenda && (
                                                                        <div className="flex items-start gap-2 text-[13px]">
                                                                            <FileText className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                                                                            <span className="font-medium">Agenda: {log.agenda}</span>
                                                                        </div>
                                                                    )}

                                                                    {/* Attendees */}
                                                                    <div className="flex flex-wrap gap-y-1 gap-x-4 text-xs text-[var(--text-secondary)]">
                                                                        {log.attendees && (
                                                                            <div className="flex items-center gap-1.5" title="External Attendees">
                                                                                <Users className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                                                                                <span>{log.attendees}</span>
                                                                            </div>
                                                                        )}
                                                                        {log.internal_attendees?.length > 0 && (
                                                                            <div className="flex items-center gap-1.5" title="Internal PIC">
                                                                                <User className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                                                                                <span>
                                                                                    {log.internal_attendees.map((id: string) =>
                                                                                        employees.find(e => e.id === id)?.full_name
                                                                                    ).filter(Boolean).join(", ")}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* MOM Link & Content */}
                                                                    {(log.mom_link || log.mom_content) && (
                                                                        <div className="flex flex-col gap-1 text-xs mt-1">
                                                                            {log.mom_link && (
                                                                                <a
                                                                                    href={log.mom_link}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="flex items-center gap-1 text-blue-500 hover:underline w-fit mb-1"
                                                                                    title="Open MOM Link"
                                                                                >
                                                                                    <LinkIcon className="h-3 w-3" />
                                                                                    <span>MOM Document</span>
                                                                                </a>
                                                                            )}
                                                                            {log.mom_content && (
                                                                                <div className="relative">
                                                                                    <p className={`text-[var(--text-secondary)] italic whitespace-pre-wrap ${expandedMomLogs.has(log.id) ? '' : 'line-clamp-2'}`}>
                                                                                        "{log.mom_content}"
                                                                                    </p>
                                                                                    {log.mom_content.length > 100 && (
                                                                                        <button
                                                                                            onClick={() => toggleMomExpansion(log.id)}
                                                                                            className="text-[10px] text-blue-500 hover:underline mt-0.5 font-medium"
                                                                                        >
                                                                                            {expandedMomLogs.has(log.id) ? 'Show Less' : 'View More'}
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {/* Next Action */}
                                                                    {log.next_action && (
                                                                        <div className="flex items-center gap-2 text-xs bg-amber-500/10 text-amber-600 px-2 py-1 rounded w-fit mt-1">
                                                                            <ChevronRight className="h-3 w-3" />
                                                                            <span className="font-medium">Next: {log.next_action}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Author */}
                                                        <div className="mt-2 pt-2 border-t border-[var(--glass-border)] flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                                                            <User className="h-3 w-3" />
                                                            <span>
                                                                {employees.find(e => e.id === log.created_by)?.full_name || 'Unknown User'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )
                }

                {/* Contacts Tab */}
                {
                    activeTab === "contacts" && (
                        <div className="space-y-4">
                            <button
                                onClick={() => { setEditingContact(null); setContactForm({ name: "", position: "", email: "", phone: "", is_primary: false, birth_date: "", notes: "" }); setShowContactForm(true); }}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#e8c559] text-[#171611] font-bold hover:bg-[#d4b44e]"
                            >
                                <Plus className="h-4 w-4" /> Add Contact
                            </button>

                            {contacts.length === 0 ? (
                                <div className="text-center py-8 text-[var(--text-muted)]">No contacts added yet</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {contacts.map((c) => (
                                        <div key={c.id} className={`p-4 rounded-xl bg-white dark:bg-[#1c2120] border ${c.is_primary ? "border-amber-500" : "border-[var(--glass-border)]"}`}>
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                                                        <User className="h-5 w-5 text-indigo-500" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-bold text-[var(--text-primary)]">{c.name}</p>
                                                            {c.is_primary && (
                                                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 text-xs font-bold">
                                                                    <Star className="h-3 w-3 fill-current" /> Primary
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-[var(--text-muted)]">{c.position || "-"}</p>
                                                        {c.birth_date && (
                                                            <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1 mt-1">
                                                                <Sparkles className="h-3 w-3 text-pink-400" />
                                                                {new Date(c.birth_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => openEditContact(c)} className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5">
                                                        <Edit3 className="h-4 w-4 text-[var(--text-secondary)]" />
                                                    </button>
                                                    {hasFullAccess && (
                                                        <button onClick={() => handleDeleteContact(c.id)} className="p-1.5 rounded hover:bg-red-500/10">
                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                {c.email && (
                                                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                                        <Mail className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                                                        <span>{c.email}</span>
                                                    </div>
                                                )}
                                                {c.phone && (
                                                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                                        <Phone className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                                                        <span>{c.phone}</span>
                                                    </div>
                                                )}
                                                {c.notes && (
                                                    <p className="text-xs text-[var(--text-secondary)] mt-2">{c.notes}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                }



                {/* Tags Tab */}

            </div >

            {/* Opportunity Form Modal */}
            {
                showOpportunityForm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="w-full max-w-md bg-white dark:bg-[#1c2120] rounded-2xl shadow-2xl overflow-hidden border border-[var(--glass-border)] flex flex-col max-h-[90vh]">
                            <div className="flex items-center justify-between p-6 border-b border-[var(--glass-border)] shrink-0">
                                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                                    {editingOpportunity ? "Edit Opportunity" : "New Opportunity"}
                                </h2>
                                <button onClick={() => setShowOpportunityForm(false)} className="p-2 rounded-lg hover:bg-black/10 text-[var(--text-secondary)]">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <form onSubmit={handleSaveOpportunity} className="p-6 space-y-4 overflow-y-auto">
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Title *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Website Redesign Project"
                                        value={opportunityForm.title}
                                        onChange={(e) => setOpportunityForm({ ...opportunityForm, title: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Opportunity Type</label>
                                    <select
                                        value={opportunityForm.opportunity_type || ""}
                                        onChange={(e) => setOpportunityForm({ ...opportunityForm, opportunity_type: e.target.value as any })}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)]"
                                    >
                                        <option value="">-- Select Type --</option>
                                        <option value="customer_based">Customer Based</option>
                                        <option value="product_based">Product Based</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Created Date</label>
                                    <input
                                        type="date"
                                        value={opportunityForm.created_at ? new Date(opportunityForm.created_at).toISOString().split('T')[0] : ""}
                                        onChange={(e) => setOpportunityForm({ ...opportunityForm, created_at: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)]"
                                    />
                                    <p className="text-xs text-[var(--text-muted)] mt-1">Leave empty to use current date/time.</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Stage</label>
                                        <select
                                            value={opportunityForm.stage}
                                            onChange={(e) => {
                                                const newStage = e.target.value as CRMStage;
                                                // Reset status to first available status for this stage
                                                const defaultStatus = OPPORTUNITY_STATUSES[newStage as keyof typeof OPPORTUNITY_STATUSES]?.[0] || "";
                                                setOpportunityForm({ ...opportunityForm, stage: newStage, status: defaultStatus });
                                            }}
                                            className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)] uppercase"
                                        >
                                            <option value="prospect">Prospect</option>
                                            <option value="proposal">Proposal</option>
                                            <option value="leads">Lead</option>
                                            <option value="sales">Sales</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Status</label>
                                        <select
                                            value={opportunityForm.status}
                                            onChange={(e) => setOpportunityForm({ ...opportunityForm, status: e.target.value })}
                                            className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)] capitalize"
                                        >
                                            {OPPORTUNITY_STATUSES[opportunityForm.stage as keyof typeof OPPORTUNITY_STATUSES]?.map((status) => (
                                                <option key={status} value={status}>{status.replace('_', ' ')}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className={opportunityForm.stage === 'sales' ? "" : "col-span-2"}>
                                        <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Value (IDR)</label>
                                        <div className="space-y-1">
                                            <input
                                                type="text"
                                                value={opportunityForm.value}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                                    setOpportunityForm({ ...opportunityForm, value: val ? parseFloat(val) : 0 });
                                                }}
                                                onFocus={(e) => e.target.select()}
                                                className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)]"
                                            />
                                            {opportunityForm.value > 0 && (
                                                <p className="text-xs text-[var(--text-muted)]">
                                                    Rp {opportunityForm.value.toLocaleString('id-ID')}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {opportunityForm.stage === 'sales' && (
                                        <div className="col-span-2 mt-4 border-t border-[var(--glass-border)] pt-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="block text-sm font-bold text-[var(--text-primary)]">
                                                    Revenue & Payments (Cash In)
                                                </label>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-emerald-600">
                                                        Total: Rp {((editingOpportunity?.revenue?.reduce((sum: number, r: any) => sum + r.amount, 0) || 0) + pendingRevenue.reduce((sum, r) => sum + r.amount, 0)).toLocaleString('id-ID')}
                                                    </p>
                                                    <p className="text-[10px] text-[var(--text-muted)]">
                                                        Target: Rp {opportunityForm.value.toLocaleString('id-ID')}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* List of Payments */}
                                            <div className="space-y-2 mb-4">
                                                {editingOpportunity?.revenue && editingOpportunity.revenue.length > 0 ? (
                                                    editingOpportunity.revenue.map((rev: any) => (
                                                        <div key={rev.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-[var(--glass-border)] text-sm">
                                                            <div>
                                                                <p className="font-bold text-[var(--text-primary)]">
                                                                    Rp {rev.amount.toLocaleString('id-ID')}
                                                                </p>
                                                                <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)]">
                                                                    <span>{new Date(rev.payment_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                                    {rev.notes && <span>• {rev.notes}</span>}
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteRevenue(rev.id)}
                                                                className="p-1.5 text-red-500 hover:bg-red-500/10 rounded"
                                                                title="Delete Payment"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    ))
                                                ) : pendingRevenue.length === 0 ? (
                                                    <p className="text-xs text-[var(--text-muted)] italic text-center py-2">No payments recorded yet.</p>
                                                ) : null}
                                                {/* Pending Revenue (not yet saved) */}
                                                {pendingRevenue.map((rev) => (
                                                    <div key={rev._tempId} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-[var(--glass-border)] text-sm">
                                                        <div>
                                                            <p className="font-bold text-[var(--text-primary)]">
                                                                Rp {rev.amount.toLocaleString('id-ID')}
                                                            </p>
                                                            <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)]">
                                                                <span>{new Date(rev.payment_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                                {rev.notes && <span>• {rev.notes}</span>}
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeletePendingRevenue(rev._tempId)}
                                                            className="p-1.5 text-red-500 hover:bg-red-500/10 rounded"
                                                            title="Remove Payment"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Add Payment Form */}
                                            <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
                                                <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-2">Add New Payment</p>
                                                <div className="grid grid-cols-2 gap-2 mb-2">
                                                    <div>
                                                        <label className="block text-[10px] uppercase font-bold text-[var(--text-muted)] mb-1">Amount</label>
                                                        <input
                                                            type="text"
                                                            placeholder="0"
                                                            value={revenueForm.amount}
                                                            onChange={(e) => {
                                                                const val = e.target.value.replace(/[^0-9]/g, '');
                                                                setRevenueForm({ ...revenueForm, amount: val ? parseFloat(val) : 0 });
                                                            }}
                                                            className="w-full px-2 py-1.5 rounded-lg border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] text-sm"
                                                        />
                                                        {revenueForm.amount > 0 && (
                                                            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Rp {revenueForm.amount.toLocaleString('id-ID')}</p>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] uppercase font-bold text-[var(--text-muted)] mb-1">Date</label>
                                                        <input
                                                            type="date"
                                                            value={revenueForm.payment_date}
                                                            onChange={(e) => setRevenueForm({ ...revenueForm, payment_date: e.target.value })}
                                                            className="w-full px-2 py-1.5 rounded-lg border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] text-sm"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Notes (Optional)"
                                                        value={revenueForm.notes}
                                                        onChange={(e) => setRevenueForm({ ...revenueForm, notes: e.target.value })}
                                                        className="flex-1 px-2 py-1.5 rounded-lg border border-[var(--glass-border)] bg-white dark:bg-[#1c2120] text-sm"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={handleAddRevenue}
                                                        disabled={!revenueForm.amount || revenueForm.amount <= 0}
                                                        className="px-3 py-1.5 rounded-lg bg-[#e8c559] text-[#171611] text-xs font-bold hover:bg-[#d4b44e] disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        Add
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {opportunityForm.stage === 'sales' && (
                                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-[var(--glass-border)]">
                                        <input
                                            type="checkbox"
                                            id="has_proposal"
                                            checked={opportunityForm.has_proposal || false}
                                            onChange={(e) => setOpportunityForm({ ...opportunityForm, has_proposal: e.target.checked })}
                                            className="w-4 h-4 rounded border-gray-300 text-[#e8c559] focus:ring-[#e8c559]"
                                        />
                                        <label htmlFor="has_proposal" className="text-sm font-bold text-[var(--text-primary)] cursor-pointer">
                                            Melalui Proposal?
                                        </label>
                                        <span className="text-xs text-[var(--text-muted)] ml-1">(Centang jika penjualan ini diawali dengan proposal)</span>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Priority</label>
                                    <select
                                        value={opportunityForm.priority}
                                        onChange={(e) => setOpportunityForm({ ...opportunityForm, priority: e.target.value as any })}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)]"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Notes</label>
                                    <textarea
                                        rows={3}
                                        value={opportunityForm.notes}
                                        onChange={(e) => setOpportunityForm({ ...opportunityForm, notes: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)]"
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-4 mt-auto border-t border-[var(--glass-border)] shrink-0">
                                    <button type="button" onClick={() => setShowOpportunityForm(false)} className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                                        Cancel
                                    </button>
                                    <div className="flex flex-col items-end gap-2">
                                        {(() => {
                                            const currentRevenue = (editingOpportunity?.revenue?.reduce((sum: number, r: any) => sum + r.amount, 0) || 0) + pendingRevenue.reduce((sum: any, r: any) => sum + r.amount, 0);
                                            const isWonStage = opportunityForm.stage === 'sales' && opportunityForm.status === 'won';
                                            const isRevenueMismatch = isWonStage && (currentRevenue !== opportunityForm.value);

                                            return (
                                                <>
                                                    {isRevenueMismatch && (
                                                        <p className="text-xs text-red-500 font-bold text-right max-w-[200px]">
                                                            Mohon pastikan kembali nilai cash in sama dengan nilai sales
                                                        </p>
                                                    )}
                                                    <button
                                                        type="submit"
                                                        disabled={isRevenueMismatch}
                                                        className={`px-6 py-2 rounded-xl font-bold transition-colors ${isRevenueMismatch
                                                            ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                                                            : 'bg-[#e8c559] text-[#171611] hover:bg-[#d4b44e]'
                                                            }`}
                                                    >
                                                        {editingOpportunity ? "Save Changes" : "Create Opportunity"}
                                                    </button>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div >
                )
            }

            {/* Meeting Form Modal */}
            {
                showMeetingForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="w-full max-w-xl bg-white dark:bg-[#1c2120] rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between p-6 border-b border-[var(--glass-border)]">
                                <h2 className="text-xl font-bold text-[var(--text-primary)]">Add Interaction</h2>
                                <button onClick={() => setShowMeetingForm(false)} className="p-2 rounded-lg hover:bg-black/10">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <form onSubmit={handleAddMeeting} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Link to Opportunity (Optional)</label>
                                    <select
                                        value={meetingForm.opportunity_id}
                                        onChange={(e) => setMeetingForm({ ...meetingForm, opportunity_id: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)]"
                                    >
                                        <option value="">-- General / No Opportunity --</option>
                                        {opportunities.map((opp) => (
                                            <option key={opp.id} value={opp.id}>
                                                {opp.title} ({opp.stage})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Date *</label>
                                        <input
                                            type="date"
                                            required
                                            value={meetingForm.meeting_date}
                                            onChange={(e) => setMeetingForm({ ...meetingForm, meeting_date: e.target.value })}
                                            className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Time (24H) *</label>
                                        <div className="flex gap-2">
                                            {/* Hours */}
                                            <select
                                                value={meetingForm.meeting_time ? meetingForm.meeting_time.split(':')[0] : "09"}
                                                onChange={(e) => {
                                                    const minutes = meetingForm.meeting_time ? meetingForm.meeting_time.split(':')[1] : "00";
                                                    setMeetingForm({ ...meetingForm, meeting_time: `${e.target.value}:${minutes}` });
                                                }}
                                                className="w-1/2 px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)] appearance-none"
                                            >
                                                {Array.from({ length: 24 }).map((_, i) => (
                                                    <option key={i} value={i.toString().padStart(2, '0')}>
                                                        {i.toString().padStart(2, '0')}
                                                    </option>
                                                ))}
                                            </select>
                                            <span className="self-center font-bold px-1">:</span>
                                            {/* Minutes */}
                                            <select
                                                value={meetingForm.meeting_time ? meetingForm.meeting_time.split(':')[1] : "00"}
                                                onChange={(e) => {
                                                    const hours = meetingForm.meeting_time ? meetingForm.meeting_time.split(':')[0] : "09";
                                                    setMeetingForm({ ...meetingForm, meeting_time: `${hours}:${e.target.value}` });
                                                }}
                                                className="w-1/2 px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)] appearance-none"
                                            >
                                                {Array.from({ length: 12 }).map((_, i) => (
                                                    <option key={i} value={(i * 5).toString().padStart(2, '0')}>
                                                        {(i * 5).toString().padStart(2, '0')}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Type</label>
                                        <select
                                            value={meetingForm.meeting_type}
                                            onChange={(e) => setMeetingForm({ ...meetingForm, meeting_type: e.target.value as MeetingType })}
                                            className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)]"
                                        >
                                            {Object.entries(MEETING_TYPES).map(([key, { label }]) => (
                                                <option key={key} value={key}>{label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Internal PIC (Staff)</label>
                                        <div className="h-32 overflow-y-auto border border-[var(--glass-border)] rounded-xl p-2 bg-white dark:bg-[#232b2a]">
                                            {employees.map((emp) => (
                                                <label key={emp.id} className="flex items-center gap-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={meetingForm.internal_attendees?.includes(emp.id)}
                                                        onChange={(e) => {
                                                            const newInternal = e.target.checked
                                                                ? [...(meetingForm.internal_attendees || []), emp.id]
                                                                : (meetingForm.internal_attendees || []).filter(id => id !== emp.id);
                                                            setMeetingForm({ ...meetingForm, internal_attendees: newInternal });
                                                        }}
                                                        className="rounded border-gray-300"
                                                    />
                                                    <span className="text-sm truncate" title={emp.role}>{emp.full_name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Interaction Mood</label>
                                    <div className="flex gap-2">
                                        {Object.entries(MOOD_CONFIG).map(([key, config]) => (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => setMeetingForm({ ...meetingForm, mood: key as MoodType })}
                                                className={`p-2 rounded-lg border transition-all ${meetingForm.mood === key
                                                    ? `border-transparent ${config.color} ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#1c2120] ring-blue-400`
                                                    : "border-[var(--glass-border)] text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                                                    }`}
                                                title={config.label}
                                            >
                                                {config.icon}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">External Attendees (Names/Emails)</label>
                                    <input
                                        type="text"
                                        placeholder="John Doe, Jane Smith..."
                                        value={meetingForm.attendees || ""}
                                        onChange={(e) => setMeetingForm({ ...meetingForm, attendees: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Agenda</label>
                                    <input
                                        type="text"
                                        value={meetingForm.agenda}
                                        onChange={(e) => setMeetingForm({ ...meetingForm, agenda: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">MOM (Minutes of Meeting)</label>
                                    <textarea
                                        rows={4}
                                        value={meetingForm.mom_content}
                                        onChange={(e) => setMeetingForm({ ...meetingForm, mom_content: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">MOM Link (optional)</label>
                                    <input
                                        type="url"
                                        placeholder="https://..."
                                        value={meetingForm.mom_link}
                                        onChange={(e) => setMeetingForm({ ...meetingForm, mom_link: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Next Action</label>
                                    <input
                                        type="text"
                                        value={meetingForm.next_action}
                                        onChange={(e) => setMeetingForm({ ...meetingForm, next_action: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-[var(--glass-border)] bg-white dark:bg-[#232b2a] text-[var(--text-primary)]"
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <button type="button" onClick={() => setShowMeetingForm(false)} className="px-4 py-2 rounded-xl border border-[var(--glass-border)] text-[var(--text-secondary)]">
                                        Cancel
                                    </button>
                                    <button type="submit" className="px-6 py-2 rounded-xl bg-[#e8c559] text-[#171611] font-bold">
                                        Save
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }



            {/* Tag Form Modal */}
            {
                showTagForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="w-full max-w-md bg-white dark:bg-[#1c2120] rounded-2xl shadow-2xl">
                            <div className="flex items-center justify-between p-6 border-b border-[var(--glass-border)]">
                                <h2 className="text-xl font-bold text-[var(--text-primary)]">Add Tag</h2>
                                <button onClick={() => setShowTagForm(false)} className="p-2 rounded-lg hover:bg-black/10">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <form onSubmit={handleAddTag} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-2">Select Tag</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {Object.entries(TAG_CONFIG).map(([key, config]) => {
                                            const isSelected = selectedTag === key;
                                            const alreadyHas = tags.some((t) => t.tag === key);
                                            return (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    disabled={alreadyHas}
                                                    onClick={() => setSelectedTag(key as CRMTag)}
                                                    className={`p-2 rounded-xl flex items-center gap-2 ${isSelected ? config.color + " text-white" : "bg-black/5 dark:bg-white/5"} ${alreadyHas ? "opacity-50 cursor-not-allowed" : ""}`}
                                                >
                                                    <span>{config.icon}</span>
                                                    <span className="text-sm font-medium">{config.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button type="button" onClick={() => setShowTagForm(false)} className="px-4 py-2 rounded-xl border border-[var(--glass-border)] text-[var(--text-secondary)]">
                                        Cancel
                                    </button>
                                    <button type="submit" className="px-6 py-2 rounded-xl bg-[#e8c559] text-[#171611] font-bold">
                                        Add Tag
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
            {/* Contact Form Modal */}
            {
                showContactForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="w-full max-w-md bg-white dark:bg-[#1c2120] rounded-2xl shadow-2xl">
                            <div className="flex items-center justify-between p-6 border-b border-[var(--glass-border)] bg-gray-50/50 dark:bg-white/5 rounded-t-2xl">
                                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                                    {editingContact ? "Edit Contact" : "Add Contact"}
                                </h2>
                                <button onClick={() => { setShowContactForm(false); setEditingContact(null); }} className="p-2 rounded-lg hover:bg-black/10 transition-colors">
                                    <X className="h-5 w-5 text-[var(--text-secondary)]" />
                                </button>
                            </div>
                            <form onSubmit={handleAddContact} className="p-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. John Doe"
                                        value={contactForm.name}
                                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--glass-border)] bg-gray-50 dark:bg-[#232b2a] text-[var(--text-primary)] focus:ring-2 focus:ring-[#e8c559] focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">Position</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Manager"
                                            value={contactForm.position}
                                            onChange={(e) => setContactForm({ ...contactForm, position: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-[var(--glass-border)] bg-gray-50 dark:bg-[#232b2a] text-[var(--text-primary)] focus:ring-2 focus:ring-[#e8c559] focus:border-transparent outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">Birth Date</label>
                                        <div className="flex gap-2">
                                            <div className="relative w-24">
                                                <select
                                                    value={contactForm.birth_date ? new Date(contactForm.birth_date).getDate() : ""}
                                                    onChange={(e) => {
                                                        const day = parseInt(e.target.value);
                                                        const currentDate = contactForm.birth_date ? new Date(contactForm.birth_date) : new Date(2000, 0, 1);
                                                        currentDate.setDate(day);
                                                        currentDate.setFullYear(2000);
                                                        const newDate = new Date(Date.UTC(2000, currentDate.getMonth(), day));
                                                        setContactForm({ ...contactForm, birth_date: newDate.toISOString().split('T')[0] });
                                                    }}
                                                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--glass-border)] bg-gray-50 dark:bg-[#232b2a] text-[var(--text-primary)] appearance-none focus:ring-2 focus:ring-[#e8c559] focus:border-transparent outline-none transition-all cursor-pointer"
                                                >
                                                    <option value="">Day</option>
                                                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                                        <option key={d} value={d}>{d}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[var(--text-muted)]">
                                                    <ChevronDown className="h-4 w-4" />
                                                </div>
                                            </div>
                                            <div className="relative flex-1">
                                                <select
                                                    value={contactForm.birth_date ? new Date(contactForm.birth_date).getMonth() : ""}
                                                    onChange={(e) => {
                                                        const month = parseInt(e.target.value);
                                                        const currentDate = contactForm.birth_date ? new Date(contactForm.birth_date) : new Date(2000, 0, 1);
                                                        currentDate.setMonth(month);
                                                        currentDate.setFullYear(2000);
                                                        const currentDay = currentDate.getDate();
                                                        const newDate = new Date(Date.UTC(2000, month, currentDay));
                                                        setContactForm({ ...contactForm, birth_date: newDate.toISOString().split('T')[0] });
                                                    }}
                                                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--glass-border)] bg-gray-50 dark:bg-[#232b2a] text-[var(--text-primary)] appearance-none focus:ring-2 focus:ring-[#e8c559] focus:border-transparent outline-none transition-all cursor-pointer"
                                                >
                                                    <option value="">Month</option>
                                                    {MONTHS.map((m, i) => (
                                                        <option key={i} value={i}>{m}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[var(--text-muted)]">
                                                    <ChevronDown className="h-4 w-4" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">Email</label>
                                        <input
                                            type="email"
                                            placeholder="email@example.com"
                                            value={contactForm.email}
                                            onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-[var(--glass-border)] bg-gray-50 dark:bg-[#232b2a] text-[var(--text-primary)] focus:ring-2 focus:ring-[#e8c559] focus:border-transparent outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">Phone</label>
                                        <input
                                            type="text"
                                            placeholder="+62..."
                                            value={contactForm.phone}
                                            onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-[var(--glass-border)] bg-gray-50 dark:bg-[#232b2a] text-[var(--text-primary)] focus:ring-2 focus:ring-[#e8c559] focus:border-transparent outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">Notes</label>
                                    <textarea
                                        rows={3}
                                        placeholder="Additional notes about this contact..."
                                        value={contactForm.notes}
                                        onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--glass-border)] bg-gray-50 dark:bg-[#232b2a] text-[var(--text-primary)] focus:ring-2 focus:ring-[#e8c559] focus:border-transparent outline-none transition-all resize-none"
                                    />
                                </div>

                                <label className="flex items-center gap-3 p-3 rounded-xl border border-[var(--glass-border)] hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors group">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${contactForm.is_primary ? "bg-[#e8c559] border-[#e8c559]" : "border-gray-300 dark:border-gray-600 group-hover:border-[#e8c559]"}`}>
                                        {contactForm.is_primary && <Check className="h-3.5 w-3.5 text-black" />}
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={contactForm.is_primary}
                                        onChange={(e) => setContactForm({ ...contactForm, is_primary: e.target.checked })}
                                        className="hidden"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-[var(--text-primary)]">Primary Contact</span>
                                        <span className="text-xs text-[var(--text-secondary)]">Set this person as the main point of contact</span>
                                    </div>
                                </label>

                                <div className="flex justify-end gap-3 pt-4 border-t border-[var(--glass-border)]">
                                    <button
                                        type="button"
                                        onClick={() => { setShowContactForm(false); setEditingContact(null); }}
                                        className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2.5 rounded-xl bg-[#e8c559] text-[#171611] font-bold hover:bg-[#d4b44e] shadow-lg shadow-[#e8c559]/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        {editingContact ? "Save Changes" : "Add Contact"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
