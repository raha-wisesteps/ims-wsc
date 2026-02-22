"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BookOpen, ArrowLeft, Loader2, ChevronRight, Plus, ExternalLink, Calendar, Clock, User, Users, Trash2, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SharingSessionModal from "./_components/SharingSessionModal";

interface Participant {
    id: string; // sharing_session_participants.id
    profile_id: string;
    name: string;
    participation_status: 'full' | 'half' | 'none';
}

interface SharingSession {
    id: string;
    title: string;
    session_date: string;
    session_time: string;
    session_end_time: string | null;
    speaker_notes: string | null;
    recording_link: string | null;
    speaker_id: string | null;
    speaker_name?: string;
    created_by: string;
    participants: Participant[];
}

interface Profile {
    id: string;
    full_name: string;
    role: string;
    is_hr: boolean;
    job_type: string;
}

export default function SharingSessionPage() {
    const [sessions, setSessions] = useState<SharingSession[]>([]);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSessionToEdit, setSelectedSessionToEdit] = useState<SharingSession | null>(null);
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

    const supabase = createClient();
    const { profile: currentUserProfile } = useAuth();

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch profiles for speaker names and participant list
            // We need active profiles, filtering out HR
            const { data: profilesData, error: profileError } = await supabase
                .from('profiles')
                .select('id, full_name, role, job_type, is_hr')
                .eq('is_active', true)
                .order('full_name');

            if (profileError) throw profileError;

            // Prepare profiles state (We need all for reference)
            setProfiles(profilesData || []);

            // 2. Fetch Sessions
            const { data: sessionsData, error: sessionsError } = await supabase
                .from('sharing_sessions')
                .select('*')
                .order('session_date', { ascending: false })
                .order('session_time', { ascending: false });

            if (sessionsError) throw sessionsError;

            // 3. Fetch Participants (for all fetched sessions)
            const sessionIds = sessionsData?.map((s: any) => s.id) || [];
            let allParticipants: any[] = [];

            if (sessionIds.length > 0) {
                const { data: participantsData, error: participantsError } = await supabase
                    .from('sharing_session_participants')
                    .select('*')
                    .in('session_id', sessionIds);

                if (participantsError) throw participantsError;
                allParticipants = participantsData || [];
            }

            // Map it all together
            const mappedSessions: SharingSession[] = (sessionsData || []).map((s: any) => {
                const speakerProfile = profilesData?.find((p: any) => p.id === s.speaker_id);

                const sessionParticipants = allParticipants.filter((p: any) => p.session_id === s.id).map((p: any) => {
                    const participantProfile = profilesData?.find((prof: any) => prof.id === p.profile_id);
                    return {
                        id: p.id,
                        profile_id: p.profile_id,
                        name: participantProfile?.full_name || 'Unknown',
                        participation_status: p.participation_status
                    };
                });

                return {
                    ...s,
                    speaker_name: speakerProfile?.full_name || 'Unassigned',
                    participants: sessionParticipants
                };
            });

            setSessions(mappedSessions);

        } catch (error) {
            console.error("Error fetching sharing sessions:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (currentUserProfile) {
            fetchData();
        }
    }, [currentUserProfile]);

    const handleOpenCreateModal = () => {
        setSelectedSessionToEdit(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (session: SharingSession) => {
        setSelectedSessionToEdit(session);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedSessionToEdit(null);
    };

    const handleUpdateComplete = () => {
        fetchData();
        handleCloseModal();
    };

    const handleDeleteSession = async (session: SharingSession) => {
        if (!confirm(`Apakah Anda yakin ingin menghapus sesi "${session.title}"?`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('sharing_sessions')
                .delete()
                .eq('id', session.id);

            if (error) throw error;
            fetchData();
        } catch (error: any) {
            console.error("Error deleting sharing session:", error);
            alert("Gagal menghapus sesi.");
        }
    };

    // View calculations
    const today = new Date();
    const formattedDate = today.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    // Determine permissions
    const canManageSession = (session: SharingSession) => {
        if (!currentUserProfile) return false;
        if (session.created_by === currentUserProfile.id) return true;
        if (session.speaker_id === currentUserProfile.id) return true;
        if (currentUserProfile.role === 'ceo' || currentUserProfile.role === 'hr' || currentUserProfile.role === 'super_admin' || currentUserProfile.is_hr) return true;
        return false;
    };

    const canDeleteSession = (session: SharingSession) => {
        if (!currentUserProfile) return false;
        if (session.created_by === currentUserProfile.id) return true;
        if (currentUserProfile.role === 'ceo' || currentUserProfile.role === 'hr' || currentUserProfile.role === 'super_admin' || currentUserProfile.is_hr) return true;
        return false;
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto min-h-screen pb-20">
            {/* Header & Controls */}
            <div className="flex flex-col gap-6 mb-8">
                {/* Top Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20">
                            <BookOpen className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-1">
                                <Link href="/dashboard" className="hover:text-[#3f545f] dark:hover:text-[#e8c559]">Dashboard</Link>
                                <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                                <span className="text-[var(--text-primary)]">Sharing Session</span>
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">Sharing Sessions</h1>
                            <p className="text-sm text-muted-foreground">
                                Jadwal sharing knowledge team. <span className="text-amber-500 font-medium">{formattedDate}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            className="flex items-center gap-2 bg-[#e8c559] hover:bg-[#d4b44e] text-[#171611] font-bold border-none"
                            onClick={handleOpenCreateModal}
                        >
                            <Plus className="w-4 h-4" />
                            Add Sharing Session
                        </Button>
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-secondary/50 transition-colors text-sm text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back
                        </Link>
                    </div>
                </div>

                {/* View Controls & Fast Links */}
                <div className="flex justify-between items-center border-t pt-4">
                    <div className="flex items-center">
                        <a
                            href="https://meet.google.com/icq-krif-vug?pli=1"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#e8c559] hover:bg-[#d4b44e] transition-colors text-sm font-bold text-[#171611] shadow-sm"
                        >
                            <span>Join Sharing session</span>
                        </a>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex bg-secondary/30 p-1 rounded-lg border border-white/5">
                            <button
                                onClick={() => setViewMode("grid")}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'grid' ? 'bg-[#e8c559] text-[var(--text-primary)] shadow-md' : 'text-muted-foreground hover:text-white'}`}
                            >
                                <span className="flex items-center gap-2">⊞ Board</span>
                            </button>
                            <button
                                onClick={() => setViewMode("table")}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'table' ? 'bg-[#e8c559] text-[var(--text-primary)] shadow-md' : 'text-muted-foreground hover:text-white'}`}
                            >
                                <span className="flex items-center gap-2">☰ Table</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Body */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                    <span className="ml-2 text-muted-foreground">Memuat jadwal...</span>
                </div>
            ) : sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 bg-secondary/10 rounded-xl border border-dashed border-border/50">
                    <BookOpen className="w-12 h-12 text-muted-foreground opacity-50 mb-3" />
                    <p className="text-muted-foreground text-sm font-medium">Belum ada Sharing Session terjadwal.</p>
                </div>
            ) : (
                <>
                    {viewMode === "grid" ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {sessions.map((session) => (
                                <SessionCard
                                    key={session.id}
                                    session={session}
                                    onManage={() => handleOpenEditModal(session)}
                                    canManage={canManageSession(session)}
                                    onDelete={() => handleDeleteSession(session)}
                                    canDelete={canDeleteSession(session)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full text-left bg-slate-100 p-2 dark:bg-[#1c2120]/50">
                                <thead className="bg-muted/50 border-b text-sm font-medium text-muted-foreground">
                                    <tr>
                                        <th className="px-6 py-4">Title</th>
                                        <th className="px-6 py-4">When</th>
                                        <th className="px-6 py-4">Speaker</th>
                                        <th className="px-6 py-4 text-center">Participants</th>
                                        <th className="px-6 py-4">Recording</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {sessions.map(session => (
                                        <SessionRow
                                            key={session.id}
                                            session={session}
                                            onManage={() => handleOpenEditModal(session)}
                                            canManage={canManageSession(session)}
                                            onDelete={() => handleDeleteSession(session)}
                                            canDelete={canDeleteSession(session)}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {isModalOpen && currentUserProfile && (
                <SharingSessionModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onUpdate={handleUpdateComplete}
                    sessionToEdit={selectedSessionToEdit}
                    profiles={profiles}
                    currentUser={currentUserProfile}
                />
            )}
        </div>
    );
}

// --- Components ---

function SessionCard({ session, onManage, canManage, onDelete, canDelete }: { session: SharingSession; onManage: () => void; canManage: boolean; onDelete: () => void; canDelete: boolean; }) {
    // Determine status (Upcoming, Past)
    const sessionDateTime = new Date(`${session.session_date}T${session.session_time}`);
    const isPast = sessionDateTime < new Date();

    // Check participant counts
    const fullCount = session.participants.filter(p => p.participation_status === 'full').length;
    const halfCount = session.participants.filter(p => p.participation_status === 'half').length;
    const totalParticipants = session.participants.length;

    return (
        <Card className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg border hover:border-amber-500/50 ${isPast ? 'opacity-80' : ''}`}>
            <CardHeader className="pb-3 border-b border-white/5">
                <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                        <CardTitle className="text-base font-bold truncate text-[var(--text-primary)]" title={session.title}>
                            {session.title}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isPast ? 'bg-secondary text-muted-foreground' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                                {isPast ? 'Selesai' : 'Akan Datang'}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {canManage && (
                            <Button variant="ghost" size="icon" onClick={onManage} className="h-8 w-8 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 flex-shrink-0" title="Edit Session">
                                <span className="sr-only">Edit Session</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                                </svg>
                            </Button>
                        )}
                        {canDelete && (
                            <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 flex-shrink-0" title="Delete Session">
                                <span className="sr-only">Delete Session</span>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                    {/* Speaker */}
                    <div className="flex items-center gap-2 text-[var(--text-muted)]">
                        <User className="h-4 w-4 shrink-0 text-amber-500" />
                        <span className="font-medium text-[var(--text-primary)] truncate" title={session.speaker_name}>{session.speaker_name}</span>
                    </div>

                    {/* Participants Summary */}
                    <div className="flex items-center gap-2 text-[var(--text-muted)]">
                        <Users className="h-4 w-4 shrink-0 text-indigo-400" />
                        <span className="font-medium text-[var(--text-primary)]">{fullCount} Full / {halfCount} Half</span>
                    </div>

                    {/* DateTime */}
                    <div className="flex items-center gap-2 text-[var(--text-muted)] w-full col-span-2 bg-secondary/20 p-2 rounded-lg">
                        <Calendar className="h-4 w-4 shrink-0" />
                        <span className="truncate">{new Date(session.session_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span className="mx-1 text-xs opacity-50">•</span>
                        <Clock className="h-4 w-4 shrink-0" />
                        <span className="truncate">
                            {session.session_time.substring(0, 5)} {session.session_end_time ? `- ${session.session_end_time.substring(0, 5)}` : ''} WIB
                        </span>
                    </div>

                    {/* Speaker Notes Summary */}
                    {session.speaker_notes && (
                        <div className="flex items-start gap-2 text-[var(--text-muted)] w-full col-span-2 bg-amber-500/5 p-3 rounded-lg border border-amber-500/10">
                            <FileText className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                            <p className="text-xs italic line-clamp-3 text-[var(--text-secondary)] whitespace-pre-wrap">
                                {session.speaker_notes}
                            </p>
                        </div>
                    )}
                </div>

                {/* Recording Link */}
                <div className="mt-4 pt-3 border-t border-dashed border-border/50">
                    {session.recording_link && (
                        <a
                            href={session.recording_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between gap-2 p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-colors group"
                        >
                            <span className="truncate flex-1 text-center">Lihat Rekaman</span>
                            <ExternalLink className="w-3 h-3 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                        </a>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function SessionRow({ session, onManage, canManage, onDelete, canDelete }: { session: SharingSession; onManage: () => void; canManage: boolean; onDelete: () => void; canDelete: boolean; }) {
    const sessionDateTime = new Date(`${session.session_date}T${session.session_time}`);
    const isPast = sessionDateTime < new Date();

    const fullCount = session.participants.filter(p => p.participation_status === 'full').length;
    const halfCount = session.participants.filter(p => p.participation_status === 'half').length;

    return (
        <tr className={`hover:bg-white/5 transition-colors ${isPast ? 'opacity-80' : ''}`}>
            <td className="px-6 py-4">
                <div>
                    <p className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                        {session.title}
                        {session.speaker_notes && (
                            <span title="Catatan Pembicara tersedia" className="flex">
                                <FileText className="h-3.5 w-3.5 text-amber-500" />
                            </span>
                        )}
                    </p>
                    <span className={`inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${isPast ? 'bg-secondary text-muted-foreground' : 'bg-emerald-500/10 text-emerald-500'}`}>
                        {isPast ? 'Selesai' : 'Akan Datang'}
                    </span>
                </div>
            </td>
            <td className="px-6 py-4">
                <div className="flex flex-col text-sm text-[var(--text-secondary)]">
                    <span className="font-medium">{new Date(session.session_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <span className="text-xs text-muted-foreground">
                        {session.session_time.substring(0, 5)} {session.session_end_time ? `- ${session.session_end_time.substring(0, 5)}` : ''} WIB
                    </span>
                </div>
            </td>
            <td className="px-6 py-4 text-sm font-medium">
                {session.speaker_name}
            </td>
            <td className="px-6 py-4 text-center">
                <div className="flex justify-center gap-3 text-xs font-medium">
                    <span title="Full Participation" className="flex items-center gap-1 text-emerald-500"><div className="w-2 h-2 rounded-full bg-emerald-500" /> {fullCount}</span>
                    <span title="Half Participation" className="flex items-center gap-1 text-amber-500"><div className="w-2 h-2 rounded-full bg-amber-500" /> {halfCount}</span>
                </div>
            </td>
            <td className="px-6 py-4">
                {session.recording_link ? (
                    <a href={session.recording_link} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline text-xs font-medium inline-flex items-center gap-1">
                        <ExternalLink className="w-4 h-4" />
                    </a>
                ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                )}
            </td>
            <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-1">
                    {canManage && (
                        <Button variant="ghost" size="sm" onClick={onManage} className="h-8 hover:text-amber-500 hover:bg-amber-500/10" title="Edit Session">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                            </svg>
                            Edit
                        </Button>
                    )}
                    {canDelete && (
                        <Button variant="ghost" size="sm" onClick={onDelete} className="h-8 w-8 px-0 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10" title="Delete Session">
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </td>
        </tr>
    );
}
