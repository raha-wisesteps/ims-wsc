"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Mail, Lock, Loader2, ArrowLeft, X } from "lucide-react";

interface LoginFormProps {
    error?: string;
}

export default function LoginForm({ error: initialError }: LoginFormProps) {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(initialError || null);

    // State for Contact Modal
    const [showContactModal, setShowContactModal] = useState(false);

    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setIsLoading(false);
        } else {
            router.push("/dashboard");
            router.refresh();
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center p-4">
            {/* Full Background Image */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/jason-cooper-XEhchWQuWyM-unsplash.jpg"
                    alt="Background"
                    fill
                    className="object-cover"
                    priority
                />
                {/* Minimal Dark Overlay for Contrast */}
                <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
            </div>

            {/* Content Container */}
            <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12">

                {/* Left Side: Brand/Welcome (Hidden on mobile) */}
                <div className="hidden md:flex flex-col text-white flex-1 p-8">
                    <Link href="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-24 w-fit group">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        Kembali ke Website
                    </Link>

                    <div className="mb-8 mt-auto">
                        <h1 className="text-5xl font-bold leading-tight mb-4">
                            Welcome<br />Back.
                        </h1>
                        <p className="text-xl text-white/80 leading-relaxed max-w-md">
                            Masuk untuk mengakses dashboard operasional, manajemen SDM, dan laporan kinerja.
                        </p>
                    </div>

                    <div className="mt-12">
                        <p className="text-sm text-white/50">© {new Date().getFullYear()} WiseSteps Consulting</p>
                    </div>
                </div>

                {/* Right Side: Login Form Card */}
                <div className="w-full md:w-[480px] bg-white rounded-3xl shadow-2xl p-8 md:p-12 animate-fade-in-up relative">
                    {/* Logo on Card (Always Visible) - Colored - Large 2x */}
                    <div className="flex justify-center mb-10">
                        <div className="relative w-80 h-24">
                            <Image
                                src="/logo_fix.svg"
                                alt="WiseSteps Logo"
                                fill
                                className="object-contain"
                            />
                        </div>
                    </div>

                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Sign In</h2>
                        <p className="text-slate-500 text-sm">Masukan kredensial akun Anda</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
                            <div className="mt-0.5 text-red-500">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                    <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <p className="text-sm text-red-600 font-medium">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 ml-1">Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#3f545f] transition-colors" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="nama@perusahaan.com"
                                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#3f545f] focus:ring-4 focus:ring-[#3f545f]/10 outline-none transition-all font-medium"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#3f545f] transition-colors" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#3f545f] focus:ring-4 focus:ring-[#3f545f]/10 outline-none transition-all font-medium"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <div className="relative flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="peer w-5 h-5 cursor-pointer appearance-none rounded-md border-2 border-slate-300 transition-all checked:border-[#3f545f] checked:bg-[#3f545f]"
                                    />
                                    <svg className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                </div>
                                <span className="text-sm font-medium text-slate-600">Remember me</span>
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowContactModal(true)}
                                className="text-sm font-bold text-[#3f545f] hover:underline"
                            >
                                Lupa Password?
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 rounded-xl bg-[#3f545f] text-white font-bold text-lg shadow-xl shadow-[#3f545f]/20 hover:bg-[#2c3b42] hover:shadow-2xl hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                "Masuk"
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                        <p className="text-sm text-slate-500">
                            Belum punya akun?{" "}
                            <button
                                type="button"
                                onClick={() => setShowContactModal(true)}
                                className="font-bold text-[#3f545f] hover:underline"
                            >
                                Hubungi Admin HR
                            </button>
                        </p>
                    </div>

                    {/* Contact Modal Popup */}
                    {showContactModal && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
                            {/* Backdrop/Overlay over the card */}
                            <div
                                className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-3xl animate-in fade-in duration-200"
                                onClick={() => setShowContactModal(false)}
                            />

                            {/* Modal Content */}
                            <div className="relative bg-white border border-slate-200 shadow-xl rounded-2xl p-6 w-full max-w-sm text-center animate-in zoom-in-95 duration-200">
                                <button
                                    onClick={() => setShowContactModal(false)}
                                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                <div className="w-12 h-12 bg-[#3f545f]/10 text-[#3f545f] rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Mail className="w-6 h-6" />
                                </div>

                                <h3 className="text-lg font-bold text-slate-900 mb-2">Hubungi Admin</h3>
                                <p className="text-slate-500 text-sm mb-6">
                                    Silahkan hubungi administrator untuk bantuan akses akun.
                                </p>

                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                                    <p className="text-[#3f545f] font-semibold text-lg">
                                        raha@wisesteps.id
                                    </p>
                                </div>

                                <button
                                    onClick={() => setShowContactModal(false)}
                                    className="w-full py-2.5 rounded-lg bg-[#3f545f] text-white font-medium hover:bg-[#2c3b42] transition-colors"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
