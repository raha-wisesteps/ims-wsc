"use client";

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { User, Session, AuthChangeEvent } from "@supabase/supabase-js";

// ============================================
// Types
// ============================================

export interface Profile {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    role: "super_admin" | "ceo" | "hr" | "employee" | "owner";
    job_type: "analyst" | "bisdev" | "sales" | "intern" | "hr" | null;
    job_level: string | null;
    department: string | null;
    join_date: string | null;
    tenure_months: number;
    is_active: boolean;
    employee_id: number | null;
    is_office_manager: boolean;
    birth_date: string | null;
    status_message: string | null;
    // Access flags
    is_busdev: boolean;
    is_hr: boolean;
    employee_type: "employee" | "remote_employee";
    is_female: boolean;
    job_title: string | null;
    url_hero: string | null;
    is_intern: boolean;
}

export interface LeaveQuota {
    id: string;
    profile_id: string;
    wfh_weekly_used: number;
    wfh_weekly_limit: number;
    annual_leave_used: number;
    annual_leave_total: number;
    wfa_used: number;
    wfa_total: number;
    quota_period_start: string;
}

export interface ExtraLeaveGrant {
    id: string;
    profile_id: string;
    days_granted: number;
    days_remaining: number;
    reason: string;
    granted_at: string;
    expires_at: string;
    is_expired: boolean;
}

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: Profile | null;
    leaveQuota: LeaveQuota | null;
    extraLeave: ExtraLeaveGrant[];
    isLoading: boolean;
    error: string | null;
    isAdmin: boolean;
    isHROrAdmin: boolean;
    isBisdev: boolean;
    isOfficeManager: boolean;
    canAccessCommandCenter: boolean;
    canAccessHR: boolean;
    canAccessBisdev: boolean;
    canAccessOperational: boolean;
    refreshProfile: () => Promise<void>;
    refreshLeaveQuota: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const supabase = createClient();

    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [leaveQuota, setLeaveQuota] = useState<LeaveQuota | null>(null);
    const [extraLeave, setExtraLeave] = useState<ExtraLeaveGrant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch profile from Supabase using direct REST API
    const fetchProfile = async (userId: string, accessToken?: string): Promise<Profile | null> => {


        try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
            const authToken = accessToken || supabaseKey;

            if (!supabaseUrl) console.error("CRITICAL: NEXT_PUBLIC_SUPABASE_URL is missing in AuthContext");
            // console.log("Making REST API call to:", supabaseUrl);

            const response = await fetch(
                `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=*`,
                {
                    method: 'GET',
                    headers: {
                        'apikey': supabaseKey!,
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation',
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    },
                    cache: 'no-store'
                }
            );



            if (!response.ok) {
                const errorText = await response.text();
                console.error("REST API error:", errorText);
                setError(`Failed to load profile: ${response.status}`);
                return null;
            }

            const data = await response.json();


            if (data && data.length > 0) {
                return data[0] as Profile;
            } else {
                console.error("Profile not found for userId:", userId);
                setError("Profile not found");
                return null;
            }
        } catch (err) {
            console.error("fetchProfile exception:", err);
            setError("Profile fetch failed");
            return null;
        }
    };

    // Fetch leave quota from Supabase
    // Fetch leave quota from Supabase
    const fetchLeaveQuota = async (profileId: string, accessToken?: string): Promise<LeaveQuota | null> => {
        try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
            const authToken = accessToken || (await supabase.auth.getSession()).data.session?.access_token;

            if (!authToken) return null;

            const response = await fetch(
                `${supabaseUrl}/rest/v1/leave_quotas?profile_id=eq.${profileId}&select=*`,
                {
                    method: 'GET',
                    headers: {
                        'apikey': supabaseKey!,
                        'Authorization': `Bearer ${authToken}`
                    }
                }
            );

            if (!response.ok) {
                console.error("fetchLeaveQuota REST error:", response.status);
                return null;
            }

            const data = await response.json();


            if (data && data.length > 0) {
                return data[0] as LeaveQuota;
            }

            return null;
        } catch (err) {
            console.error("fetchLeaveQuota exception:", err);
            return null;
        }
    };

    // Fetch active extra leave grants
    const fetchExtraLeave = async (profileId: string, accessToken?: string): Promise<ExtraLeaveGrant[]> => {

        try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
            const authToken = accessToken || (await supabase.auth.getSession()).data.session?.access_token;

            if (!authToken) return [];

            // ?profile_id=eq.UUID&is_expired=eq.false&days_remaining=gt.0
            const response = await fetch(
                `${supabaseUrl}/rest/v1/extra_leave_grants?profile_id=eq.${profileId}&is_expired=eq.false&days_remaining=gt.0&select=*`,
                {
                    method: 'GET',
                    headers: {
                        'apikey': supabaseKey!,
                        'Authorization': `Bearer ${authToken}`
                    }
                }
            );

            if (!response.ok) {
                console.error("fetchExtraLeave REST error:", response.status);
                return [];
            }

            const data = await response.json();

            return (data as ExtraLeaveGrant[]) || [];
        } catch (err) {
            console.error("fetchExtraLeave exception:", err);
            return [];
        }
    };

    // Initialize auth state
    useEffect(() => {
        let isMounted = true;

        const loadProfile = async (userId: string, accessToken?: string) => {
            // Fetch profile with retry
            let retries = 3;
            let profileData: Profile | null = null;

            while (retries > 0 && !profileData) {
                profileData = await fetchProfile(userId, accessToken);
                if (!profileData && retries > 1) {

                    await new Promise(r => setTimeout(r, 500));
                }
                retries--;
            }

            if (profileData) {
                setProfile(profileData);
                // Fetch quotas in parallel
                const [quota, extra] = await Promise.all([
                    fetchLeaveQuota(profileData.id, accessToken),
                    fetchExtraLeave(profileData.id, accessToken)
                ]);
                if (isMounted) { // Added isMounted check back for state updates
                    setLeaveQuota(quota);
                    setExtraLeave(extra);
                }
            } else {
                if (isMounted) { // Added isMounted check back for state updates
                    setProfile(null);
                    setLeaveQuota(null);
                    setExtraLeave([]);
                }
            }
        };

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event: AuthChangeEvent, session: Session | null) => {


                if (!isMounted) return;

                if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
                    setSession(session);
                    if (session?.user) {
                        setUser(session.user);
                        await loadProfile(session.user.id, session.access_token);
                    }
                    setIsLoading(false);
                } else if (event === "SIGNED_OUT") {
                    setUser(null);
                    setProfile(null);
                    setLeaveQuota(null);
                    setExtraLeave([]); // Added this line
                    setIsLoading(false);
                } else if (event === "TOKEN_REFRESHED" && session?.user) {
                    if (!profile) {
                        await loadProfile(session.user.id, session.access_token);
                    }
                }
            }
        );

        // FALLBACK: If onAuthStateChange doesn't fire within 2 seconds, try getSession
        // Use a flag to track if profile was already loaded
        let profileLoaded = false;

        const fallbackTimeout = setTimeout(async () => {
            // Check both the flag and if we have a profile state
            if (isMounted && !profileLoaded) {

                const { data: { session } } = await supabase.auth.getSession();
                setSession(session);
                if (session?.user && isMounted) {
                    setUser(session.user);
                    await loadProfile(session.user.id, session.access_token);
                }
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }, 2000);

        // Mark profile as loaded when auth event fires
        supabase.auth.getSession().then(({ data: { session: s } }: { data: { session: Session | null } }) => {
            if (s?.user) {
                profileLoaded = true;
            }
        });

        return () => {
            isMounted = false;
            clearTimeout(fallbackTimeout);
            subscription.unsubscribe();
        };
    }, []);

    // Refresh functions
    const refreshProfile = useCallback(async () => {
        if (user) {
            const profileData = await fetchProfile(user.id);
            if (profileData) {
                setProfile(profileData);
                const accessToken = (await supabase.auth.getSession()).data.session?.access_token;
                const [quota, extra] = await Promise.all([
                    fetchLeaveQuota(profileData.id, accessToken),
                    fetchExtraLeave(profileData.id, accessToken)
                ]);
                setLeaveQuota(quota);
                setExtraLeave(extra);
            }
        }
    }, [user]);

    const refreshLeaveQuota = useCallback(async () => {
        if (profile) {
            const quotaData = await fetchLeaveQuota(profile.id);
            setLeaveQuota(quotaData);
        }
    }, [profile]);

    // Computed permission helpers
    const isAdmin = useMemo(() => {
        if (!profile) return false;
        return ["super_admin", "ceo", "owner"].includes(profile.role);
    }, [profile]);

    const isHROrAdmin = useMemo(() => {
        if (!profile) return false;
        return ["super_admin", "ceo", "owner", "hr"].includes(profile.role);
    }, [profile]);

    const isBisdev = useMemo(() => {
        if (!profile) return false;
        return profile.job_type === "bisdev" || isAdmin || profile.is_busdev;
    }, [profile, isAdmin]);

    const isOfficeManager = useMemo(() => {
        if (!profile) return false;
        return profile.is_office_manager || isAdmin;
    }, [profile, isAdmin]);

    const canAccessCommandCenter = useMemo(() => {
        if (!profile) return false;
        return ["super_admin", "ceo", "owner"].includes(profile.role);
    }, [profile]);

    const canAccessHR = useMemo(() => {
        if (!profile) return false;
        return ["super_admin", "ceo", "owner", "hr"].includes(profile.role) || profile.is_hr;
    }, [profile]);

    const canAccessBisdev = useMemo(() => {
        if (!profile) return false;
        return profile.job_type === "bisdev" || isAdmin || profile.is_busdev;
    }, [profile, isAdmin]);

    const canAccessOperational = useMemo(() => {
        if (!profile) return false;
        return profile.is_office_manager || isAdmin;
    }, [profile, isAdmin]);

    const value = useMemo<AuthContextType>(() => ({
        user,
        session,
        profile,
        leaveQuota,
        extraLeave,
        isLoading,
        error,
        isAdmin,
        isHROrAdmin,
        isBisdev,
        isOfficeManager,
        canAccessCommandCenter,
        canAccessHR,
        canAccessBisdev,
        canAccessOperational,
        refreshProfile,
        refreshLeaveQuota,
    }), [user, session, profile, leaveQuota, extraLeave, isLoading, error,
        isAdmin, isHROrAdmin, isBisdev, isOfficeManager,
        canAccessCommandCenter, canAccessHR, canAccessBisdev, canAccessOperational,
        refreshProfile, refreshLeaveQuota]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
