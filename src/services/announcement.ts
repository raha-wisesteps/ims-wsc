import { createClient } from "@/lib/supabase/client";
import { Announcement, CreateAnnouncementDTO } from "@/types/announcement";

const supabase = createClient();

export const announcementService = {
    /**
     * Fetch announcements visible to the current user.
     * RLS policies on the backend already filter for:
     * - Broadcast messages
     * - Messages for user's department
     * - Messages for the user specifically
     * - Messages authored by the user
     */
    async fetchAnnouncements(): Promise<Announcement[]> {
        const { data, error } = await supabase
            .from('announcements')
            .select(`
                *,
                author:author_id (
                    full_name,
                    avatar_url,
                    role
                )
            `)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching announcements:", error);
            throw error;
        }

        return (data as any[]) || [];
    },

    /**
     * Create a new announcement.
     * RLS ensures only authorized roles (HR, Admin, etc.) can perform this.
     */
    async createAnnouncement(payload: CreateAnnouncementDTO): Promise<Announcement> {
        const { data, error } = await supabase
            .from('announcements')
            .insert(payload)
            .select()
            .single();

        if (error) {
            console.error("Error creating announcement:", error);
            throw error;
        }

        return data as Announcement;
    },

    /**
     * Fetch announcements for the archive page with search/filter capabilities.
     * Currently client-side filtering is enough, but this could be expanded.
     */
    async fetchArchive(): Promise<Announcement[]> {
        // Can be same as fetchAnnouncements for now, maybe with pagination later
        return this.fetchAnnouncements();
    }
};
