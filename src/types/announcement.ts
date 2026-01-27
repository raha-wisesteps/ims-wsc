export type AnnouncementAudience = 'broadcast' | 'department' | 'individual';

export interface Announcement {
    id: string;
    title: string;
    content: string;
    category: string;
    audience_type: AnnouncementAudience;
    target_departments?: string[] | null;
    target_users?: string[] | null;
    author_id: string;
    created_at: string;
    updated_at: string;
    is_active: boolean;
    // Joins
    author?: {
        full_name: string;
        avatar_url: string | null;
        role: string;
    };
}

export interface CreateAnnouncementDTO {
    title: string;
    content: string;
    category?: string;
    audience_type: AnnouncementAudience;
    target_departments?: string[];
    target_users?: string[];
    author_id: string;
}
