"use client";

import { useState, useEffect } from "react";
import { User, Mail, Lock, Camera, Save, Briefcase, Calendar, Shield, X, Check, ChevronDown, AlertCircle, Home, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import Cropper from "react-easy-crop";
import getCroppedImg from "@/lib/imageUtils";

const MONTHS = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export default function ProfilePage() {
    const { profile, session, user, isLoading: authLoading, refreshProfile } = useAuth();
    const router = useRouter();
    const supabase = createClient();
    const [isSaving, setIsSaving] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        fullName: "",
        bio: "",
        birthDate: "",
        jobTitle: "",
    });

    // Password state
    const [passwordData, setPasswordData] = useState({
        newPassword: "",
        confirmPassword: "",
    });

    // Cropper State
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [showCropper, setShowCropper] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Hero Image State
    const [heroImageSrc, setHeroImageSrc] = useState<string | null>(null);
    const [heroCrop, setHeroCrop] = useState({ x: 0, y: 0 });
    const [heroZoom, setHeroZoom] = useState(1);
    const [heroCroppedAreaPixels, setHeroCroppedAreaPixels] = useState<any>(null);
    const [showHeroCropper, setShowHeroCropper] = useState(false);
    const [isHeroUploading, setIsHeroUploading] = useState(false);

    // Sync form with profile data
    useEffect(() => {
        if (profile) {
            setFormData({
                fullName: profile.full_name || "",
                bio: "",
                birthDate: profile.birth_date || "",
                jobTitle: profile.job_title || "",
            });
        }
    }, [profile]);

    const handleSave = async () => {
        if (!profile) return;
        setIsSaving(true);
        setMessage(null);
        try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

            const response = await fetch(
                `${supabaseUrl}/rest/v1/profiles?id=eq.${profile.id}`,
                {
                    method: 'PATCH',
                    headers: {
                        'apikey': supabaseKey!,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        full_name: formData.fullName,
                        job_title: formData.jobTitle,
                        birth_date: formData.birthDate || null,
                        updated_at: new Date().toISOString()
                    })
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Update error:", errorText);
                throw new Error(`Update failed: ${response.status}`);
            }

            await refreshProfile();
            setMessage({ type: "success", text: "Profile updated successfully!" });
        } catch (err) {
            console.error("Error updating profile:", err);
            setMessage({ type: "error", text: "Failed to update profile. Please try again." });
        } finally {
            setIsSaving(false);
        }
    };

    const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (file.size > 2 * 1024 * 1024) {
                setMessage({ type: "error", text: "File size must be less than 2MB" });
                return;
            }
            const reader = new FileReader();
            reader.addEventListener("load", () => {
                setImageSrc(reader.result?.toString() || "");
                setShowCropper(true);
                setZoom(1);
            });
            reader.readAsDataURL(file);
            e.target.value = '';
        }
    };

    const performUpload = async (fileKey: Blob) => {
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
            console.error("Missing Supabase env vars");
            return;
        }

        const file = new File([fileKey], "avatar.jpg", { type: "image/jpeg" });
        setIsUploading(true);
        setMessage(null);

        try {
            const fileName = `${profile?.id}-${Math.random()}.jpg`;
            const filePath = `${fileName}`;
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

            const uploadResponse = await fetch(
                `${supabaseUrl}/storage/v1/object/avatars/${filePath}`,
                {
                    method: 'POST',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${session?.access_token || supabaseKey}`,
                        'Content-Type': file.type,
                        'x-upsert': 'true'
                    },
                    body: file
                }
            );

            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                throw new Error(`Upload failed: ${uploadResponse.status} ${errorText}`);
            }

            const publicUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${filePath}`;

            const updateResponse = await fetch(
                `${supabaseUrl}/rest/v1/profiles?id=eq.${profile?.id}`,
                {
                    method: 'PATCH',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${session?.access_token || supabaseKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        avatar_url: publicUrl,
                        updated_at: new Date().toISOString()
                    })
                }
            );

            if (!updateResponse.ok) {
                throw new Error(`Profile update failed: ${updateResponse.status}`);
            }

            await refreshProfile();
            setMessage({ type: "success", text: "Avatar uploaded successfully!" });
        } catch (error: any) {
            console.error("Error uploading avatar:", error);
            setMessage({ type: "error", text: error.message || "Failed to upload avatar" });
        } finally {
            setIsUploading(false);
            setShowCropper(false);
            setImageSrc(null);
        }
    };

    const handleSaveCroppedImage = async () => {
        if (!imageSrc || !croppedAreaPixels) return;
        try {
            const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
            if (croppedImage) {
                await performUpload(croppedImage);
            }
        } catch (e) {
            console.error(e);
            setMessage({ type: "error", text: "Failed to crop image" });
        }
    };

    const handlePasswordChange = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage({ type: "error", text: "Passwords do not match." });
            return;
        }
        if (passwordData.newPassword.length < 6) {
            setMessage({ type: "error", text: "Password must be at least 6 characters." });
            return;
        }

        setIsChangingPassword(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.updateUser({
                password: passwordData.newPassword
            });

            if (error) throw error;
            setPasswordData({ newPassword: "", confirmPassword: "" });
            setMessage({ type: "success", text: "Password changed successfully!" });
        } catch (err) {
            console.error("Error changing password:", err);
            setMessage({ type: "error", text: "Failed to change password. Please try again." });
        } finally {
            setIsChangingPassword(false);
        }
    };

    // Hero Image Functions
    const onHeroCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
        setHeroCroppedAreaPixels(croppedAreaPixels);
    };

    const handleHeroFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (file.size > 5 * 1024 * 1024) { // 5MB limit for Hero
                setMessage({ type: "error", text: "File size must be less than 5MB" });
                return;
            }
            const reader = new FileReader();
            reader.addEventListener("load", () => {
                setHeroImageSrc(reader.result?.toString() || "");
                setShowHeroCropper(true);
                setHeroZoom(1);
            });
            reader.readAsDataURL(file);
            e.target.value = '';
        }
    };

    const performHeroUpload = async (fileKey: Blob) => {
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
            console.error("Missing Supabase env vars");
            return;
        }

        const file = new File([fileKey], "hero.jpg", { type: "image/jpeg" });
        setIsHeroUploading(true);
        setMessage(null);

        try {
            const fileName = `hero-${profile?.id}-${Math.random()}.jpg`;
            const filePath = `${fileName}`;
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

            const uploadResponse = await fetch(
                `${supabaseUrl}/storage/v1/object/avatars/${filePath}`,
                {
                    method: 'POST',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${session?.access_token || supabaseKey}`,
                        'Content-Type': file.type,
                        'x-upsert': 'true'
                    },
                    body: file
                }
            );

            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                throw new Error(`Upload failed: ${uploadResponse.status} ${errorText}`);
            }

            const publicUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${filePath}`;

            const updateResponse = await fetch(
                `${supabaseUrl}/rest/v1/profiles?id=eq.${profile?.id}`,
                {
                    method: 'PATCH',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${session?.access_token || supabaseKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        url_hero: publicUrl,
                        updated_at: new Date().toISOString()
                    })
                }
            );

            if (!updateResponse.ok) {
                throw new Error(`Profile update failed: ${updateResponse.status}`);
            }

            await refreshProfile();
            setMessage({ type: "success", text: "Hero image updated successfully!" });
        } catch (error: any) {
            console.error("Error uploading hero image:", error);
            setMessage({ type: "error", text: error.message || "Failed to upload hero image" });
        } finally {
            setIsHeroUploading(false);
            setShowHeroCropper(false);
            setHeroImageSrc(null);
        }
    };

    const handleSaveHeroCroppedImage = async () => {
        if (!heroImageSrc || !heroCroppedAreaPixels) return;
        try {
            const croppedImage = await getCroppedImg(heroImageSrc, heroCroppedAreaPixels);
            if (croppedImage) {
                await performHeroUpload(croppedImage);
            }
        } catch (e) {
            console.error(e);
            setMessage({ type: "error", text: "Failed to crop image" });
        }
    };

    const handleResetHero = async () => {
        if (!profile) return;
        setIsHeroUploading(true);
        setMessage(null);
        try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

            const updateResponse = await fetch(
                `${supabaseUrl}/rest/v1/profiles?id=eq.${profile.id}`,
                {
                    method: 'PATCH',
                    headers: {
                        'apikey': supabaseKey!,
                        'Authorization': `Bearer ${session?.access_token || supabaseKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        url_hero: null,
                        updated_at: new Date().toISOString()
                    })
                }
            );

            if (!updateResponse.ok) {
                throw new Error(`Reset failed: ${updateResponse.status}`);
            }

            await refreshProfile();
            setMessage({ type: "success", text: "Hero image reset to default!" });
        } catch (err) {
            console.error("Error resetting hero:", err);
            setMessage({ type: "error", text: "Failed to reset hero image." });
        } finally {
            setIsHeroUploading(false);
        }
    };

    const getRoleDisplay = () => {
        if (!profile) return "";
        const jobType = profile.job_type ?
            profile.job_type.charAt(0).toUpperCase() + profile.job_type.slice(1) : "";
        const level = profile.job_level || "";
        return `${jobType} ${level}`.trim() || profile.role;
    };

    const getJoinDate = () => {
        if (!profile?.join_date) return "Not set";
        return new Date(profile.join_date).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    };

    if (authLoading && !profile) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="text-center py-12">
                <p className="text-[var(--text-secondary)]">Unable to load profile data.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Standard Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-end justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1 text-sm text-[var(--text-secondary)]">
                        <Link href="/dashboard" className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors">
                            <Home className="w-4 h-4" />
                            <span>Home</span>
                        </Link>
                        <ChevronRight className="h-4 w-4" />
                        <span className="text-[var(--text-primary)]">My Profile</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-lg shadow-blue-900/20">
                            <User className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">My Profile</h1>
                            <p className="text-[var(--text-secondary)]">Manage your account settings and preferences.</p>
                        </div>
                    </div>
                </div>
            </div>

            {message && (
                <div className={`p-4 rounded-xl ${message.type === "success" ? "bg-emerald-600 text-white" : "bg-red-500/20 text-red-500"}`}>
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col items-center text-center">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-full mb-4">
                                <div className="w-full h-full rounded-full bg-[var(--primary)] overflow-hidden flex items-center justify-center text-4xl font-bold text-[var(--primary-foreground)] relative">
                                    {profile.avatar_url ? (
                                        <img
                                            src={profile.avatar_url}
                                            alt={profile.full_name || "Avatar"}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        profile.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "?"
                                    )}

                                    <label
                                        htmlFor="avatar-upload"
                                        className={`absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${isUploading ? 'opacity-100' : ''}`}
                                    >
                                        {isUploading ? (
                                            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Camera className="w-8 h-8 text-white" />
                                        )}
                                    </label>
                                    <input
                                        type="file"
                                        id="avatar-upload"
                                        accept="image/*"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        disabled={isUploading}
                                    />
                                </div>
                            </div>
                            <label
                                htmlFor="avatar-upload"
                                className="absolute bottom-4 right-0 p-2 bg-[var(--primary)] rounded-full text-[var(--primary-foreground)] shadow-lg hover:brightness-110 transition-all cursor-pointer"
                            >
                                <Camera className="w-4 h-4" />
                            </label>
                        </div>

                        <h2 className="text-xl font-bold text-white">{profile.full_name || "Unknown"}</h2>
                        <p className="text-[#e8c559] font-medium">{profile.job_level || "-"}</p>

                        <div className="mt-6 w-full pt-6 border-t border-white/10 space-y-3">
                            <div className="flex items-center gap-3 text-left">
                                <div className="p-2 bg-[var(--primary)]/10 rounded-lg">
                                    <Mail className="w-4 h-4 text-[var(--primary)]" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Email</p>
                                    <p className="text-sm text-white">{profile.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-left">
                                <div className="p-2 bg-[var(--primary)]/10 rounded-lg">
                                    <Briefcase className="w-4 h-4 text-[var(--primary)]" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Department</p>
                                    <p className="text-sm text-white capitalize">{profile.job_type || "Not set"}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-left">
                                <div className="p-2 bg-[var(--primary)]/10 rounded-lg">
                                    <Calendar className="w-4 h-4 text-[var(--primary)]" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Join Date</p>
                                    <p className="text-sm text-white">{getJoinDate()}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-left">
                                <div className="p-2 bg-[var(--primary)]/10 rounded-lg">
                                    <Shield className="w-4 h-4 text-[var(--primary)]" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Status</p>
                                    <p className="text-sm text-white capitalize">{profile.role.replace("_", " ")}</p>
                                </div>
                            </div>
                        </div>
                    </div>


                    {/* Hero Image Section */}
                    <div className="glass-panel p-6 rounded-2xl border border-[var(--glass-border)] mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-indigo-500/10 rounded-lg">
                                <div className="w-5 h-5 flex items-center justify-center text-indigo-500 font-bold">H</div>
                            </div>
                            <h3 className="text-lg font-bold text-[var(--text-primary)]">Hero Image</h3>
                        </div>

                        <div className="space-y-4">
                            <p className="text-xs text-[var(--text-secondary)]">
                                Customize the background image of your dashboard's first slide.
                            </p>

                            <div className="relative group w-full h-32 rounded-xl overflow-hidden border border-[var(--glass-border)] bg-black/20">
                                <div
                                    className="absolute inset-0 bg-cover bg-center"
                                    style={{
                                        backgroundImage: `url('${profile.url_hero || '/pukpik-aB46yUmsMp0-unsplash.jpg'}')`,
                                    }}
                                />
                                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />

                                <div className="absolute inset-0 flex items-center justify-center gap-3">
                                    <label
                                        htmlFor="hero-upload"
                                        className="cursor-pointer px-3 py-1.5 rounded-lg bg-white hover:bg-gray-100 shadow-md border border-gray-200 text-black font-bold text-xs transition-all flex items-center gap-1"
                                    >
                                        <Camera className="w-3 h-3" />
                                        Change
                                    </label>
                                    <input
                                        type="file"
                                        id="hero-upload"
                                        accept="image/*"
                                        onChange={handleHeroFileSelect}
                                        className="hidden"
                                        disabled={isHeroUploading}
                                    />

                                    {profile.url_hero && (
                                        <button
                                            onClick={handleResetHero}
                                            disabled={isHeroUploading}
                                            className="px-3 py-1.5 rounded-lg bg-rose-500/80 hover:bg-rose-600/80 backdrop-blur-md text-white font-medium text-xs transition-all"
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                {/* Layanan Pengaduan Section - Moved directly below Profile Card */}
                <div className="glass-panel p-6 rounded-2xl border border-[var(--glass-border)]">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-yellow-500/10 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-yellow-500" />
                        </div>
                        <h3 className="text-lg font-bold text-[var(--text-primary)]">Layanan Pengaduan</h3>
                    </div>

                    <p className="text-sm text-[var(--text-secondary)] mb-6">
                        Jika Anda memiliki keluhan, kritik, saran, atau ingin melaporkan tindakan indikasi kecurangan/pelanggaran,
                        silakan sampaikan melalui formulir pengaduan.
                    </p>

                    <button
                        onClick={() => router.push('/dashboard/profile/report')}
                        className="px-6 py-2.5 rounded-xl bg-[#e8c559] text-black font-bold hover:bg-[#d6b54e] shadow-lg shadow-[#e8c559]/20 flex items-center gap-2 transition-all w-full justify-center"
                    >
                        <AlertCircle className="w-4 h-4" />
                        Buat Laporan
                    </button>
                </div>
            </div>

                {showCropper && imageSrc && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-background rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-white/10">
                            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                                <h3 className="font-bold text-foreground">Adjust Image</h3>
                                <button
                                    onClick={() => { setShowCropper(false); setImageSrc(null); }}
                                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="relative w-full h-80 bg-black">
                                <Cropper
                                    image={imageSrc}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={1}
                                    onCropChange={setCrop}
                                    onCropComplete={onCropComplete}
                                    onZoomChange={setZoom}
                                />
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-muted-foreground uppercase font-bold tracking-wider">
                                        <span>Zoom</span>
                                        <span>{Math.round(zoom * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={1}
                                        max={3}
                                        step={0.1}
                                        value={zoom}
                                        onChange={(e) => setZoom(Number(e.target.value))}
                                        className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-[var(--primary)]"
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => { setShowCropper(false); setImageSrc(null); }}
                                        className="flex-1 py-2.5 rounded-xl border border-input hover:bg-accent hover:text-accent-foreground font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveCroppedImage}
                                        disabled={isUploading}
                                        className="flex-1 py-2.5 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-110 font-bold transition-all flex items-center justify-center gap-2"
                                    >
                                        {isUploading ? (
                                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Check className="w-4 h-4" />
                                                Save Avatar
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showHeroCropper && heroImageSrc && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-background rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-white/10">
                            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                                <h3 className="font-bold text-foreground">Adjust Hero Image</h3>
                                <button
                                    onClick={() => { setShowHeroCropper(false); setHeroImageSrc(null); }}
                                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="relative w-full h-[300px] bg-black">
                                <Cropper
                                    image={heroImageSrc}
                                    crop={heroCrop}
                                    zoom={heroZoom}
                                    aspect={3 / 1}
                                    onCropChange={setHeroCrop}
                                    onCropComplete={onHeroCropComplete}
                                    onZoomChange={setHeroZoom}
                                />
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-muted-foreground uppercase font-bold tracking-wider">
                                        <span>Zoom</span>
                                        <span>{Math.round(heroZoom * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={1}
                                        max={3}
                                        step={0.1}
                                        value={heroZoom}
                                        onChange={(e) => setHeroZoom(Number(e.target.value))}
                                        className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-[var(--primary)]"
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => { setShowHeroCropper(false); setHeroImageSrc(null); }}
                                        className="flex-1 py-2.5 rounded-xl border border-input hover:bg-accent hover:text-accent-foreground font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveHeroCroppedImage}
                                        disabled={isHeroUploading}
                                        className="flex-1 py-2.5 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-110 font-bold transition-all flex items-center justify-center gap-2"
                                    >
                                        {isHeroUploading ? (
                                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Check className="w-4 h-4" />
                                                Save Hero
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-panel p-8 rounded-2xl border border-white/10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-[#e8c559]/10 rounded-lg">
                                <User className="w-5 h-5 text-[#e8c559]" />
                            </div>
                            <h3 className="text-lg font-bold text-white">Personal Information</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Full Name</label>
                                <input
                                    type="text"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#e8c559]/50 transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Job Title</label>
                                <input
                                    type="text"
                                    value={formData.jobTitle}
                                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#e8c559]/50 transition-colors"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="email"
                                        value={profile.email}
                                        readOnly
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-gray-400 cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Employee ID</label>
                                <input
                                    type="text"
                                    value={profile.employee_id || "Not assigned"}
                                    readOnly
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-gray-400 cursor-not-allowed"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date of Birth (Day/Month)</label>
                                <div className="flex gap-2">
                                    <div className="relative w-24">
                                        <select
                                            value={formData.birthDate ? new Date(formData.birthDate).getDate() : ""}
                                            onChange={(e) => {
                                                const day = parseInt(e.target.value);
                                                const currentDate = formData.birthDate ? new Date(formData.birthDate) : new Date(2000, 0, 1);
                                                currentDate.setDate(day);
                                                currentDate.setFullYear(2000); // Enforce year 2000
                                                const newDate = new Date(Date.UTC(2000, currentDate.getMonth(), day));
                                                setFormData({ ...formData, birthDate: newDate.toISOString().split('T')[0] });
                                            }}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none focus:outline-none focus:border-[#e8c559]/50 transition-colors cursor-pointer"
                                        >
                                            <option value="">Day</option>
                                            {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                                <option key={d} value={d}>{d}</option>
                                            ))}
                                        </select>
                                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                                            <ChevronDown className="h-4 w-4" />
                                        </div>
                                    </div>
                                    <div className="relative flex-1">
                                        <select
                                            value={formData.birthDate ? new Date(formData.birthDate).getMonth() : ""}
                                            onChange={(e) => {
                                                const month = parseInt(e.target.value);
                                                const currentDate = formData.birthDate ? new Date(formData.birthDate) : new Date(2000, 0, 1);
                                                currentDate.setMonth(month);
                                                currentDate.setFullYear(2000); // Enforce year 2000
                                                const currentDay = currentDate.getDate();
                                                const newDate = new Date(Date.UTC(2000, month, currentDay));
                                                setFormData({ ...formData, birthDate: newDate.toISOString().split('T')[0] });
                                            }}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none focus:outline-none focus:border-[#e8c559]/50 transition-colors cursor-pointer"
                                        >
                                            <option value="">Month</option>
                                            {MONTHS.map((m, i) => (
                                                <option key={i} value={i}>{m}</option>
                                            ))}
                                        </select>
                                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                                            <ChevronDown className="h-4 w-4" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel p-8 rounded-2xl border border-[var(--glass-border)]">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                                <Lock className="w-5 h-5 text-emerald-500" />
                            </div>
                            <h3 className="text-lg font-bold text-[var(--text-primary)]">Security & Password</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">New Password</label>
                                <input
                                    type="password"
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    placeholder="••••••••"
                                    className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/50 transition-colors placeholder:text-[var(--text-secondary)]"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Confirm Password</label>
                                <input
                                    type="password"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    placeholder="••••••••"
                                    className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/50 transition-colors placeholder:text-[var(--text-secondary)]"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handlePasswordChange}
                            disabled={isChangingPassword || !passwordData.newPassword || passwordData.newPassword !== passwordData.confirmPassword}
                            className="px-6 py-2.5 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isChangingPassword ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Changing...
                                </>
                            ) : (
                                <>
                                    <Lock className="w-4 h-4" />
                                    Change Password
                                </>
                            )}
                        </button>

                        {passwordData.newPassword && passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                            <p className="text-red-400 text-sm mt-2">Passwords do not match</p>
                        )}
                    </div>





                    <div className="flex justify-end gap-4 pt-4">
                        <button
                            onClick={() => setFormData({ fullName: profile.full_name || "", bio: "", birthDate: profile.birth_date || "", jobTitle: profile.job_title || "" })}
                            className="px-6 py-2.5 rounded-xl border border-white/10 text-gray-400 font-bold hover:bg-white/5 hover:text-white transition-all"
                        >
                            Reset
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-6 py-2.5 rounded-xl bg-[#e8c559] text-black font-bold hover:bg-[#d6b54e] shadow-lg shadow-[#e8c559]/20 flex items-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
