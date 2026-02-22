"use client";

import React, { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TeamMember, Task, StatusOption } from "../_types/dashboard.types";

interface TeamActivityCardProps {
    teamStatuses: TeamMember[];
    currentUserId: string | undefined;
    dailyPlan: Task[];
    statusOptions: StatusOption[];
    taskPriorityColors: Record<string, string>;
}

const TeamActivityCard = memo(function TeamActivityCard({
    teamStatuses,
    currentUserId,
    dailyPlan,
    statusOptions,
    taskPriorityColors,
}: TeamActivityCardProps) {
    return (
        <Card className="rounded-3xl flex flex-col h-[440px] xl:h-[600px] overflow-hidden bg-card border-border backdrop-blur-md shadow-xl">
            <CardHeader className="p-5 border-b border-border flex flex-row items-center justify-between space-y-0 bg-inherit backdrop-blur-xl">
                <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        Team Activity
                        <Badge variant="secondary" className="text-xs font-normal px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20">
                            {teamStatuses.length} Active
                        </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">Real-time team status updates</CardDescription>
                </div>
                <div className="flex gap-2">
                    {/* Filter buttons could go here if needed */}
                </div>
            </CardHeader>

            <div className="flex-1 overflow-hidden flex flex-col">
                {/* Fixed User Section - Always Visible */}
                <div className="p-4 pb-0">
                    {(() => {
                        const user = teamStatuses.find(m => m.id === currentUserId);
                        if (!user) return null;

                        const userWithTasks = {
                            ...user,
                            tasks: dailyPlan.filter(t => !t.completed).map(t => ({ name: t.text, priority: t.priority }))
                        };
                        const memberStatusInfo = statusOptions.find(s => s.id === userWithTasks.status);
                        const StatusIcon = memberStatusInfo?.Icon;

                        return (
                            <div className="p-4 rounded-2xl bg-[var(--glass-bg)] border-2 border-[var(--primary)]/20 hover:border-[var(--primary)]/40 transition-all cursor-pointer group mb-3 shadow-md">
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="relative flex-shrink-0">
                                        {userWithTasks.avatarUrl ? (
                                            <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-[var(--primary)]/30">
                                                <Image
                                                    src={userWithTasks.avatarUrl}
                                                    alt={userWithTasks.name}
                                                    width={56}
                                                    height={56}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary)]/70 flex items-center justify-center text-base text-[var(--primary-foreground)] font-bold ring-2 ring-[var(--primary)]/30">
                                                {userWithTasks.avatar}
                                            </div>
                                        )}
                                        <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-[var(--glass-bg)] ${memberStatusInfo?.color || 'bg-emerald-500'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0 flex items-start gap-3">
                                        <div className="flex flex-col min-w-[120px] max-w-[200px]">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm truncate text-[var(--text-primary)]">
                                                    {userWithTasks.name}
                                                </span>
                                                <span className="text-xs text-[var(--primary)] font-medium">(You)</span>
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold ${memberStatusInfo?.color} text-white shadow-sm`}>
                                                    {StatusIcon && <StatusIcon className="w-3 h-3" />}
                                                    {memberStatusInfo?.label}
                                                </span>
                                            </div>
                                            <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{userWithTasks.role}</p>
                                        </div>

                                        {userWithTasks.personalNote && (
                                            <div className="flex-1 min-w-0">
                                                <div className="relative w-fit max-w-full bg-gray-100 dark:bg-white/10 px-3 py-2 rounded-2xl rounded-tl-none text-xs text-[var(--text-primary)] leading-snug break-words">
                                                    {userWithTasks.personalNote}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {userWithTasks.tasks && userWithTasks.tasks.length > 0 && (
                                    <div className="pl-[72px] flex flex-wrap gap-2">
                                        {userWithTasks.tasks.slice(0, 3).map((task, idx) => (
                                            <span key={idx} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium ${taskPriorityColors[task.priority as keyof typeof taskPriorityColors] || taskPriorityColors.medium}`}>
                                                {task.name}
                                            </span>
                                        ))}
                                        {userWithTasks.tasks.length > 3 && (
                                            <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-medium bg-[var(--glass-border)] text-[var(--text-muted)]">
                                                +{userWithTasks.tasks.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                    <div className="h-px bg-[var(--glass-border)] w-full mb-2"></div>
                </div>

                {/* Scrollable Other Members */}
                <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3 custom-scrollbar">
                    {teamStatuses
                        .filter(m => m.id !== currentUserId && m.job_type !== 'hr' && m.role?.toLowerCase() !== 'hr' && !m.role?.toLowerCase().includes('human resource'))
                        .map(member => {
                            const memberStatusInfo = statusOptions.find(s => s.id === member.status);
                            const StatusIcon = memberStatusInfo?.Icon;
                            return (
                                <div key={member.id} className="p-4 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-[var(--primary)]/30 transition-all cursor-pointer group">
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="relative flex-shrink-0">
                                            {member.avatarUrl ? (
                                                <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-[var(--glass-border)]">
                                                    <Image
                                                        src={member.avatarUrl}
                                                        alt={member.name}
                                                        width={48}
                                                        height={48}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary)]/70 flex items-center justify-center text-sm text-[var(--primary-foreground)] font-bold ring-2 ring-[var(--glass-border)]">
                                                    {member.avatar}
                                                </div>
                                            )}
                                            <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-[var(--glass-bg)] ${memberStatusInfo?.color.replace('bg-', 'bg-') || 'bg-gray-400'}`} />
                                        </div>
                                        <div className="flex-1 min-w-0 flex items-start gap-3">
                                            <div className="flex flex-col min-w-[120px] max-w-[200px]">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-sm text-[var(--text-primary)] truncate">{member.name}</span>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold ${memberStatusInfo?.color} text-white`}>
                                                        {StatusIcon && <StatusIcon className="w-2.5 h-2.5" />}
                                                        {memberStatusInfo?.label}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{member.role}</p>
                                            </div>

                                            {member.personalNote && (
                                                <div className="flex-1 min-w-0">
                                                    <div className="relative w-fit max-w-full bg-gray-100 dark:bg-white/10 px-3 py-2 rounded-2xl rounded-tl-none text-xs text-[var(--text-primary)] leading-snug break-words">
                                                        {member.personalNote}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {member.tasks && member.tasks.length > 0 && (
                                        <div className="pl-[64px] flex flex-wrap gap-1.5">
                                            {member.tasks.map((task, idx) => (
                                                <span key={idx} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-medium ${taskPriorityColors[task.priority as keyof typeof taskPriorityColors] || taskPriorityColors.medium}`}>
                                                    {task.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                </div>
            </div>

            {/* Bottom Link */}
            <div className="p-3 border-t border-[var(--glass-border)] bg-black/5 dark:bg-white/5 backdrop-blur-sm">
                <Link href="/dashboard/board" className="flex items-center justify-center gap-2 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors py-1.5">
                    View Team Schedule
                    <ChevronRight className="h-3 w-3" />
                </Link>
            </div>
        </Card>
    );
});

export default TeamActivityCard;
