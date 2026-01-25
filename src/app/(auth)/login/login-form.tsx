"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/contexts/ThemeContext";

interface LoginFormProps {
    error?: string;
}

export default function LoginForm({ error: initialError }: LoginFormProps) {
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(initialError || null);

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
        <div className="min-h-screen flex flex-col overflow-hidden relative bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300">
            {/* Theme Toggle */}
            <button
                onClick={toggleTheme}
                className="fixed top-4 right-4 z-50 p-2 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] transition-colors"
                title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
                {theme === "dark" ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#e8c559]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#3f545f]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9.37,5.51C9.19,6.15,9.1,6.82,9.1,7.5c0,4.08,3.32,7.4,7.4,7.4c0.68,0,1.35-0.09,1.99-0.27C17.45,17.19,14.93,19,12,19 c-3.86,0-7-3.14-7-7C5,9.07,6.81,6.55,9.37,5.51z M12,3c-4.97,0-9,4.03-9,9s4.03,9,9,9s9-4.03,9-9c0-0.46-0.04-0.92-0.1-1.36 c-0.98,1.37-2.58,2.26-4.4,2.26c-2.98,0-5.4-2.42-5.4-5.4c0-1.81,0.89-3.42,2.26-4.4C12.92,3.04,12.46,3,12,3L12,3z" />
                    </svg>
                )}
            </button>

            {/* Ambient Animated Background - Only visible in dark mode */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden dark:opacity-100 opacity-0 transition-opacity duration-300">
                <div className="absolute -top-[20%] -right-[10%] w-[800px] h-[800px] bg-[#e8c559]/10 rounded-full blur-[120px] animate-float opacity-40 mix-blend-screen" />
                <div className="absolute -bottom-[20%] -left-[10%] w-[600px] h-[600px] bg-blue-900/20 rounded-full blur-[100px] animate-float-delayed opacity-30 mix-blend-screen" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.01)_0%,transparent_100%)]" />
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8 w-full">
                {/* Glass Login Card */}
                <div className="glass-panel w-full max-w-[480px] rounded-2xl p-8 sm:p-10 flex flex-col gap-8 transition-all duration-500 hover:border-[var(--glass-border-hover)]">
                    {/* Header Section */}
                    <div className="flex flex-col items-center text-center space-y-4">
                        <img
                            src={theme === "light" ? "/logo_fix_login.svg" : "/logo_fix.svg"}
                            alt="Company Logo"
                            className="h-[98px] w-auto object-contain mb-2 transition-all duration-300"
                        />
                        <div className="space-y-1">
                            <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Welcome back</h2>
                            <p className="text-[var(--text-secondary)] text-sm font-medium">Please enter your details to sign in.</p>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-500 dark:text-red-400 text-sm text-center">
                            {error}
                        </div>
                    )}

                    {/* Form Section */}
                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        {/* Email Field */}
                        <div className="relative group">
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder=" "
                                className="peer w-full h-14 px-4 pt-5 pb-1 rounded-lg text-[var(--text-primary)] placeholder-transparent input-glass outline-none transition-all duration-200"
                                required
                            />
                            <label
                                htmlFor="email"
                                className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-200 ease-out text-[var(--text-secondary)] font-medium z-10 bg-[var(--card-bg)] px-1 peer-focus:top-3 peer-focus:text-xs peer-focus:text-[#e8c559] peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-[var(--card-bg)]"
                            >
                                Email address
                            </label>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] opacity-0 peer-focus:opacity-100 transition-opacity">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                    <polyline points="22,6 12,13 2,6" />
                                </svg>
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="flex flex-col gap-2">
                            <div className="relative group">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder=" "
                                    className="peer w-full h-14 px-4 pt-5 pb-1 rounded-lg text-[var(--text-primary)] placeholder-transparent input-glass outline-none transition-all duration-200 pr-12"
                                    required
                                />
                                <label
                                    htmlFor="password"
                                    className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-200 ease-out text-[var(--text-secondary)] font-medium z-10 bg-[var(--card-bg)] px-1 peer-focus:top-3 peer-focus:text-xs peer-focus:text-[#e8c559] peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-[var(--card-bg)]"
                                >
                                    Password
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-0 top-0 h-full w-12 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors focus:outline-none"
                                >
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                            <line x1="1" y1="1" x2="23" y2="23" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            <div className="flex justify-between items-center px-1">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="w-4 h-4 rounded border-[var(--glass-border)] bg-transparent text-[#e8c559] focus:ring-[#e8c559]/20 focus:ring-offset-0 checked:bg-[#e8c559] transition-all"
                                    />
                                    <span className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">Remember me</span>
                                </label>
                                <a href="#" className="text-xs font-medium text-[#e8c559] hover:text-[#f0d47a] transition-colors">
                                    Forgot password?
                                </a>
                            </div>
                        </div>

                        {/* Primary Action */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="relative w-full h-12 bg-gradient-to-r from-[#e8c559] to-[#dcb33e] hover:to-[#e8c559] text-[#1c2120] font-bold rounded-lg shadow-[0_0_20px_rgba(232,197,89,0.2)] hover:shadow-[0_0_30px_rgba(232,197,89,0.4)] transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 mt-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            ) : (
                                <>
                                    <span>Sign In</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                        <polyline points="12 5 19 12 12 19" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="text-center">
                        <p className="text-sm text-[var(--text-secondary)]">
                            Need an account?{" "}
                            <a href="#" className="text-[#e8c559] hover:text-[#f0d47a] font-medium transition-colors hover:underline">
                                Contact Admin
                            </a>
                        </p>
                    </div>
                </div>

                {/* Bottom branding */}
                <div className="mt-8 text-center text-xs text-[var(--text-secondary)] opacity-50">
                    <p>© 2025 Wise Steps Consulting Smart Tourism Team. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
}
