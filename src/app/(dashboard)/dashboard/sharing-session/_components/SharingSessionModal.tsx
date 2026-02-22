"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // textarea imported from shadcn
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Participant {
    id: string;
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

interface SharingSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
    sessionToEdit: SharingSession | null;
    profiles: Profile[]; // Active profiles
    currentUser: any; // User from AuthContext
}

export default function SharingSessionModal({
    isOpen,
    onClose,
    onUpdate,
    sessionToEdit,
    profiles,
    currentUser
}: SharingSessionModalProps) {
    const supabase = createClient();
    const isEditing = !!sessionToEdit;

    // Form State
    const [title, setTitle] = useState("");
    const [sessionDate, setSessionDate] = useState("");
    const [sessionTime, setSessionTime] = useState("");
    const [sessionEndTime, setSessionEndTime] = useState("");
    const [speakerNotes, setSpeakerNotes] = useState("");
    const [recordingLink, setRecordingLink] = useState("");
    const [speakerId, setSpeakerId] = useState<string>("");

    // Participant State - Array of { profile_id, status }
    const [participantStatuses, setParticipantStatuses] = useState<Record<string, 'full' | 'half' | 'none'>>({});

    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Permission checks
    const isAdmin = currentUser.role === 'ceo' || currentUser.role === 'super_admin' || currentUser.role === 'hr' || currentUser.is_hr === true;
    const isCreator = sessionToEdit?.created_by === currentUser.id;
    const isAssignedSpeaker = sessionToEdit?.speaker_id === currentUser.id;

    // Users can edit if they are creating a new one, or if they have permission to edit an existing one
    const canEdit = !isEditing || isAdmin || isCreator || isAssignedSpeaker;

    // Filtered lists
    // Speaker list: Admins see everyone (except maybe HR, but generally everyone can speak). Regular users only see themselves.
    const speakerOptions = isAdmin ? profiles : profiles.filter(p => p.id === currentUser.id);

    // Participants list: Everyone EXCEPT HR AND EXCEPT the currently selected speaker
    const participantOptions = profiles.filter(p => p.role !== 'hr' && p.job_type !== 'hr' && p.is_hr !== true && p.id !== speakerId);

    useEffect(() => {
        if (isOpen) {
            setErrorMsg(null);

            if (isEditing && sessionToEdit) {
                setTitle(sessionToEdit.title);
                setSessionDate(sessionToEdit.session_date);
                setSessionTime(sessionToEdit.session_time.substring(0, 5)); // HH:MM
                setSessionEndTime(sessionToEdit.session_end_time ? sessionToEdit.session_end_time.substring(0, 5) : "");
                setSpeakerNotes(sessionToEdit.speaker_notes || "");
                setRecordingLink(sessionToEdit.recording_link || "");
                setSpeakerId(sessionToEdit.speaker_id || "");

                // Initialize participant statuses
                const initialStatuses: Record<string, 'full' | 'half' | 'none'> = {};

                // Set default 'none' for all eligible participants
                participantOptions.forEach(p => {
                    initialStatuses[p.id] = 'none';
                });

                // Override with actual data
                sessionToEdit.participants.forEach(p => {
                    initialStatuses[p.profile_id] = p.participation_status;
                });

                setParticipantStatuses(initialStatuses);
            } else {
                // New Session Defaults
                setTitle("");
                // Set default date to today, time to current hour
                const now = new Date();
                // Adjust for Jakarta time assuming local is already correct or offset needed
                setSessionDate(now.toISOString().split('T')[0]);
                const nextHour = String((now.getHours() + 1) % 24).padStart(2, '0');
                const nextTwoHour = String((now.getHours() + 2) % 24).padStart(2, '0');
                setSessionTime(`${nextHour}:00`);
                setSessionEndTime(`${nextTwoHour}:00`);
                setSpeakerNotes("");
                setRecordingLink("");

                // Default speaker depends on role
                setSpeakerId(isAdmin ? "" : currentUser.id);

                // Initialize participants to 'none'
                const initialStatuses: Record<string, 'full' | 'half' | 'none'> = {};
                participantOptions.forEach(p => {
                    initialStatuses[p.id] = 'none';
                });
                setParticipantStatuses(initialStatuses);
            }
        }
    }, [isOpen, sessionToEdit, profiles, currentUser]);

    // Helper for rendering time select
    const renderTimeInput = (value: string, onChange: (val: string) => void, disabled: boolean, id: string) => {
        const [h, m] = (value || "00:00").split(":");
        return (
            <div className="flex items-center gap-1">
                <select
                    id={id + "-hour"}
                    value={h || "00"}
                    onChange={(e) => onChange(`${e.target.value}:${m || "00"}`)}
                    disabled={disabled}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 text-center appearance-none"
                >
                    {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(hour => (
                        <option key={hour} value={hour}>{hour}</option>
                    ))}
                </select>
                <span className="font-bold">:</span>
                <select
                    id={id + "-minute"}
                    value={m || "00"}
                    onChange={(e) => onChange(`${h || "00"}:${e.target.value}`)}
                    disabled={disabled}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 text-center appearance-none"
                >
                    {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(minute => (
                        <option key={minute} value={minute}>{minute}</option>
                    ))}
                </select>
            </div>
        );
    };

    const handleParticipantChange = (profileId: string, status: 'full' | 'half' | 'none') => {
        if (!canEdit) return;
        setParticipantStatuses(prev => ({
            ...prev,
            [profileId]: status
        }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) {
            setErrorMsg("Judul acara wajb diisi");
            return;
        }
        if (!sessionDate || !sessionTime || !sessionEndTime) {
            setErrorMsg("Tanggal, jam mulai, dan jam selesai wajib diisi");
            return;
        }

        // Validation: end time must be after start time
        if (sessionEndTime <= sessionTime) {
            setErrorMsg("Jam selesai harus setelah jam mulai");
            return;
        }

        setIsSaving(true);
        setErrorMsg(null);

        try {
            let sessionId = sessionToEdit?.id;

            if (isEditing && sessionId) {
                // Update Session
                const { error: sessionError } = await supabase
                    .from('sharing_sessions')
                    .update({
                        title: title.trim(),
                        session_date: sessionDate,
                        session_time: sessionTime + ':00', // ensure time format
                        session_end_time: sessionEndTime + ':00',
                        speaker_notes: speakerNotes.trim() || null,
                        recording_link: recordingLink.trim() || null,
                        speaker_id: speakerId || null,
                    })
                    .eq('id', sessionId);

                if (sessionError) throw sessionError;

            } else {
                // Insert Session
                const { data: newSession, error: sessionError } = await supabase
                    .from('sharing_sessions')
                    .insert({
                        title: title.trim(),
                        session_date: sessionDate,
                        session_time: sessionTime + ':00',
                        session_end_time: sessionEndTime + ':00',
                        speaker_notes: speakerNotes.trim() || null,
                        recording_link: recordingLink.trim() || null,
                        speaker_id: speakerId || null,
                        created_by: currentUser.id
                    })
                    .select('id')
                    .single();

                if (sessionError) throw sessionError;
                if (!newSession) throw new Error("Failed to capture new session ID");

                sessionId = newSession.id;
            }

            // Sync Participants
            // Simplest way: Delete all existing for this session, then insert the new ones
            // Only insert participants whose status is NOT 'none' to save space
            if (sessionId) {
                // Delete existing
                await supabase
                    .from('sharing_session_participants')
                    .delete()
                    .eq('session_id', sessionId);

                // Insert new statuses (only full or half)
                const participantsToInsert = Object.entries(participantStatuses)
                    .filter(([_, status]) => status !== 'none')
                    .map(([profileId, status]) => ({
                        session_id: sessionId,
                        profile_id: profileId,
                        participation_status: status
                    }));

                if (participantsToInsert.length > 0) {
                    const { error: partsError } = await supabase
                        .from('sharing_session_participants')
                        .insert(participantsToInsert);

                    if (partsError) throw partsError;
                }
            }

            onUpdate();
        } catch (error: any) {
            console.error("Error saving sharing session:", error);
            setErrorMsg(error.message || "Terjadi kesalahan saat menyimpan data.");
        } finally {
            setIsSaving(false);
        }
    };



    // Calculate totals for UI
    const totalFull = Object.values(participantStatuses).filter(s => s === 'full').length;
    const totalHalf = Object.values(participantStatuses).filter(s => s === 'half').length;

    return (
        <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
            <DialogContent className="sm:max-w-[700px] bg-card border-[var(--glass-border)] p-0 overflow-hidden flex flex-col max-h-[90vh]">
                <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
                    <DialogTitle className="text-xl text-[var(--text-primary)] font-bold">
                        {isEditing ? "Edit Sharing Session" : "Add Sharing Session"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing ? "Perbarui detail sesi dan partisipasi kehadiran." : "Buat jadwal Sharing Session baru."}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <form id="session-form" onSubmit={handleSave} className="space-y-6">

                        {errorMsg && (
                            <div className="bg-rose-500/10 border border-rose-500/50 text-rose-500 p-3 rounded-lg text-sm text-center font-medium">
                                {errorMsg}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left Column: Core Info */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Judul Acara *</Label>
                                    <Input
                                        id="title"
                                        placeholder="Judul Sharing Session..."
                                        value={title}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                                        disabled={!canEdit || isSaving}
                                        className="bg-background"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="date" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tanggal *</Label>
                                        <Input
                                            id="date"
                                            type="date"
                                            value={sessionDate}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSessionDate(e.target.value)}
                                            disabled={!canEdit || isSaving}
                                            className="bg-background block w-full"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="time-hour" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mulai WIB *</Label>
                                        {renderTimeInput(sessionTime, setSessionTime, !canEdit || isSaving, "time")}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="endTime-hour" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Selesai WIB *</Label>
                                        {renderTimeInput(sessionEndTime, setSessionEndTime, !canEdit || isSaving, "endTime")}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="speaker" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pembicara</Label>
                                    <select
                                        id="speaker"
                                        value={speakerId}
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSpeakerId(e.target.value)}
                                        disabled={!canEdit || isSaving || (!isAdmin && !isEditing)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="">Pilih Pembicara</option>
                                        {speakerOptions.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.full_name} {p.id === currentUser.id ? '(Anda)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {!isAdmin && !isEditing && (
                                        <p className="text-[10px] text-muted-foreground mt-1">Sebagai staff, Anda hanya bisa menunjuk diri sendiri sebagai pembicara untuk sesi baru.</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="link" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Link Rekaman (Opsional)</Label>
                                    <Input
                                        id="link"
                                        type="url"
                                        placeholder="https://..."
                                        value={recordingLink}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRecordingLink(e.target.value)}
                                        disabled={!canEdit || isSaving}
                                        className="bg-background"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="notes" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Catatan Pembicara (Opsional)</Label>
                                    <Textarea
                                        id="notes"
                                        placeholder="Tulis ringkasan atau topik yang akan dibahas..."
                                        value={speakerNotes}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSpeakerNotes(e.target.value)}
                                        disabled={!canEdit || isSaving}
                                        className="bg-background min-h-[100px] resize-y"
                                    />
                                </div>
                            </div>

                            {/* Right Column: Participants */}
                            <div className="space-y-2 flex flex-col h-full">
                                <div className="flex justify-between items-center mb-1">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Partisipasi Staff</Label>
                                    <div className="text-[10px] space-x-2 font-bold bg-secondary/30 px-2 py-1 rounded">
                                        <span className="text-emerald-500">{totalFull} Full</span>
                                        <span className="text-amber-500">{totalHalf} Half</span>
                                    </div>
                                </div>

                                <ScrollArea className="flex-1 min-h-[250px] border rounded-lg bg-background/50 p-2">
                                    <div className="space-y-1 pr-3">
                                        {participantOptions.length === 0 ? (
                                            <p className="text-sm text-center text-muted-foreground py-4">Tidak ada data staff.</p>
                                        ) : (
                                            participantOptions.map(p => {
                                                const currentStatus = participantStatuses[p.id] || 'none';

                                                return (
                                                    <div key={p.id} className="flex items-center justify-between p-2 rounded-md hover:bg-secondary/20 transition-colors">
                                                        <span className="text-sm font-medium truncate pr-2" title={p.full_name}>
                                                            {p.full_name}
                                                        </span>
                                                        <div className="flex bg-secondary/30 rounded-full border border-border p-0.5 overflow-hidden shrink-0">
                                                            <button
                                                                type="button"
                                                                disabled={!canEdit}
                                                                onClick={() => handleParticipantChange(p.id, 'none')}
                                                                className={`px-2 py-0.5 text-[10px] rounded-full font-medium transition-colors ${currentStatus === 'none' ? 'bg-muted text-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/50'} ${!canEdit && 'cursor-not-allowed opacity-70'}`}
                                                            >
                                                                None
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={!canEdit}
                                                                onClick={() => handleParticipantChange(p.id, 'half')}
                                                                className={`px-2 py-0.5 text-[10px] rounded-full font-medium transition-colors ${currentStatus === 'half' ? 'bg-amber-500 text-black shadow-sm' : 'text-muted-foreground hover:bg-muted/50'} ${!canEdit && 'cursor-not-allowed opacity-70'}`}
                                                            >
                                                                Half
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={!canEdit}
                                                                onClick={() => handleParticipantChange(p.id, 'full')}
                                                                className={`px-2 py-0.5 text-[10px] rounded-full font-medium transition-colors ${currentStatus === 'full' ? 'bg-emerald-500 text-black shadow-sm' : 'text-muted-foreground hover:bg-muted/50'} ${!canEdit && 'cursor-not-allowed opacity-70'}`}
                                                            >
                                                                Full
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </ScrollArea>
                                {!canEdit && (
                                    <p className="text-[10px] text-amber-500 mt-2 text-center bg-amber-500/10 py-1 rounded">
                                        Anda tidak memiliki akses untuk mengubah sesi ini.
                                    </p>
                                )}
                            </div>
                        </div>
                    </form>
                </div>

                <div className="p-4 border-t bg-muted/10 flex justify-end items-center">
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                            Batal
                        </Button>
                        {canEdit && (
                            <Button
                                type="submit"
                                form="session-form"
                                className="bg-[#e8c559] hover:bg-[#d4b44e] text-[#171611] font-bold border-none min-w-[100px]"
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</>
                                ) : (
                                    "Simpan"
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
