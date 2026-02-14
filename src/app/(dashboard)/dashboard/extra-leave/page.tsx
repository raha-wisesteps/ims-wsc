"use strict";
"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Gift, Calendar, Clock, AlertCircle, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function ExtraLeavePage() {
    const { extraLeave, isLoading } = useAuth();
    const [selectedGrant, setSelectedGrant] = useState<string | null>(null);

    return (
        <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-8 min-h-screen font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300">

            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-1">
                        <Link href="/dashboard" className="hover:text-[var(--primary-main)] transition-colors flex items-center gap-1">
                            Dashboard
                        </Link>
                        <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" />
                        <span>Libur Ekstra</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
                            <Gift className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
                                Libur Ekstra
                            </h1>
                            <p className="text-[var(--text-secondary)] text-sm max-w-2xl">
                                Daftar cuti tambahan yang Anda miliki. Libur ekstra diberikan sebagai reward atau bonus.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Active Grants List */}
            <div className="grid grid-cols-1 gap-6">
                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="w-8 h-8 border-2 border-[var(--primary-main)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-[var(--text-secondary)]">Memuat data libur ekstra...</p>
                    </div>
                ) : extraLeave.length === 0 ? (
                    <Card className="bg-[var(--card)] border-[var(--border)]">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 rounded-full bg-[var(--surface-highlight)] flex items-center justify-center mb-4">
                                <Gift className="h-8 w-8 text-[var(--text-tertiary)]" />
                            </div>
                            <h3 className="text-lg font-medium text-[var(--foreground)] mb-1">Tidak Ada Libur Ekstra</h3>
                            <p className="text-[var(--text-secondary)] max-w-sm">
                                Anda belum memiliki libur ekstra yang aktif saat ini. Libur ekstra biasanya diberikan sebagai reward kinerja.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {extraLeave.map((grant) => {
                            const daysUntilExpiry = Math.ceil((new Date(grant.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                            const isExpiringSoon = daysUntilExpiry <= 7;

                            return (
                                <Card key={grant.id} className={cn(
                                    "group overflow-hidden relative border-[var(--border)] transition-all duration-300 hover:shadow-lg hover:border-pink-500/30",
                                    "bg-gradient-to-br from-[var(--card)] to-[var(--surface-highlight)]"
                                )}>
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <Gift className="h-24 w-24 transform rotate-12" />
                                    </div>

                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start mb-2">
                                            <Badge variant={isExpiringSoon ? "destructive" : "default"} className={cn(
                                                "uppercase tracking-wider font-bold text-[10px]",
                                                isExpiringSoon ? "bg-red-500/20 text-red-500 hover:bg-red-500/30" : "bg-pink-500/20 text-pink-500 hover:bg-pink-500/30"
                                            )}>
                                                {isExpiringSoon ? `Expires in ${daysUntilExpiry} days` : "Active"}
                                            </Badge>
                                        </div>
                                        <CardTitle className="text-4xl font-bold flex items-end gap-2 text-[var(--foreground)]">
                                            {grant.days_remaining}
                                            <span className="text-sm font-medium text-[var(--text-secondary)] pb-2 mb-0.5">hari tersisa</span>
                                        </CardTitle>
                                        <CardDescription className="text-sm text-[var(--text-secondary)] line-clamp-2 mt-2">
                                            {grant.reason}
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent className="pt-4 border-t border-[var(--border)]">
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                                                    <Calendar className="h-4 w-4" />
                                                    <span>Diberikan</span>
                                                </div>
                                                <span className="font-medium text-[var(--foreground)]">
                                                    {new Date(grant.granted_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                                                    <Clock className="h-4 w-4" />
                                                    <span>Expired</span>
                                                </div>
                                                <span className={cn(
                                                    "font-medium",
                                                    isExpiringSoon ? "text-red-500" : "text-[var(--foreground)]"
                                                )}>
                                                    {new Date(grant.expires_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </span>
                                            </div>

                                            {daysUntilExpiry > 0 && daysUntilExpiry <= 30 && (
                                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2 mt-2">
                                                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                                    <p className="text-xs text-amber-500/90 leading-relaxed">
                                                        Segera gunakan libur ekstra Anda sebelum hangus pada tanggal kedaluwarsa.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
