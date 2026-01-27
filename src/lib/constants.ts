import { Megaphone, AlertCircle, FileText, Calendar, Wrench, LucideIcon } from "lucide-react";

export const ANNOUNCEMENT_CATEGORIES = [
    { id: "General", label: "General", icon: Megaphone, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    { id: "Urgent", label: "Urgent", icon: AlertCircle, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20" },
    { id: "Policy", label: "Policy Update", icon: FileText, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20" },
    { id: "Event", label: "Event", icon: Calendar, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
    { id: "Maintenance", label: "Maintenance", icon: Wrench, color: "text-slate-500", bg: "bg-slate-500/10", border: "border-slate-500/20" },
];

export const ANNOUNCEMENT_TEMPLATES = [
    {
        title: "General Announcement",
        category: "General",
        subject: "Important Update: [Topic]",
        body: "Hi Team,\n\nWe would like to share an important update regarding [Topic].\n\nPlease verify the details and let us know if you have any questions.\n\nBest Regards,\nHR Team"
    },
    {
        title: "Meeting Reminder",
        category: "General",
        subject: "Reminder: All Hands Meeting Tomorrow",
        body: "Hi Team,\n\nJust a quick reminder about our All Hands meeting scheduled for tomorrow at [Time].\n\nPlease ensure you join on time.\n\nSee you there!"
    },
    {
        title: "Policy Update",
        category: "Policy",
        subject: "Update to Company Policy: [Policy Name]",
        body: "Dear Employees,\n\nWe have updated our [Policy Name] effective [Date].\n\nKey changes include:\n- [Change 1]\n- [Change 2]\n\nPlease review the full document in the Knowledge Hub.\n\nRegards,\nManagement"
    },
    {
        title: "System Maintenance",
        category: "Maintenance",
        subject: "Scheduled System Maintenance",
        body: "Attention Everyone,\n\nThe system will be undergoing scheduled maintenance on [Date] from [Start Time] to [End Time].\n\nDuring this period, access may be intermittent.\n\nThank you for your patience."
    }
];
