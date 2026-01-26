"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Activity, ArrowLeft, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// --- Types & Config ---

type Intensity = "High" | "Medium" | "Low" | "Fixed" | "Custom";
type Category = "Project" | "Proposal" | "Presentation" | "Support" | "Etc";

interface WorkloadItem {
    id: string;
    profile_id: string;
    name: string;
    category: Category;
    intensity: Intensity;
    slots: number;
    color?: string;
    created_at?: string;
}

interface Employee {
    id: string; // profile_id
    name: string;
    role: string;
    level: string; // "Intern" | "Analyst L1" | "Analyst L2" | "Senior Analyst" | "Consultant" | "Manager"
    avatar: string;
    items: WorkloadItem[];
}

const getCapacity = (level: string): number => {
    // 0. C-Level
    if (level.toUpperCase().includes("CEO")) return 14;

    // 1. Interns (Global)
    if (level.includes("Intern")) return 8;

    // 2. Analyst / Consultant / Manager Track
    if (level.includes("Analyst")) return 10;
    if (level.includes("Consultant")) return 12;
    if (level.includes("Manager") && !level.includes("Business")) return 14;

    // 3. Bisdev Track
    if (level.includes("Sales Executive")) return 10;
    if (level.includes("Business Dev")) return 12;
    if (level.includes("Business Manager")) return 14;

    // Fallback
    return 10;
};

// Updated Weights
const WEIGHT_CONFIG = {
    Project: {
        High: 4,
        Medium: 3,
        Low: 2
    },
    Proposal: 2,
    Presentation: 2,
    Support: 2,
    Etc: 1
};

const CATEGORY_COLORS: Record<Category, string> = {
    "Project": "bg-purple-500",
    "Proposal": "bg-amber-500",
    "Presentation": "bg-pink-500",
    "Support": "bg-emerald-500",
    "Etc": "bg-slate-500",
};

// --- Helper: Status Logic ---
function getStatus(total: number, max: number) {
    const percent = max > 0 ? (total / max) * 100 : 0;

    if (percent > 100) return { label: "Overload", color: "bg-rose-500", text: "text-rose-500", border: "border-rose-500/50", bgSoft: "bg-rose-500/10" };
    if (percent >= 80) return { label: "Heavy", color: "bg-orange-500", text: "text-orange-500", border: "border-orange-500/50", bgSoft: "bg-orange-500/10" };
    if (percent >= 70) return { label: "Safe", color: "bg-emerald-500", text: "text-emerald-500", border: "border-emerald-500/50", bgSoft: "bg-emerald-500/10" };
    return { label: "Idle", color: "bg-blue-400", text: "text-blue-400", border: "border-blue-400/50", bgSoft: "bg-blue-400/10" };
}

export default function WorkloadPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

    const supabase = createClient();
    const today = new Date();
    const formattedDate = today.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    // Permission Logic
    const { profile: currentUserProfile } = useAuth();
    const isIntern = currentUserProfile?.job_type === 'intern' || currentUserProfile?.job_level === 'Intern';

    // Fetch Data from Supabase
    const fetchData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch active profiles
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('id, full_name, role, job_type, job_level, avatar_url, is_hr')
                .eq('is_active', true)
                .order('full_name');

            if (profileError) throw profileError;

            // 2. Fetch all workload items
            const { data: items, error: itemsError } = await supabase
                .from('workload_items')
                .select('*');

            if (itemsError) throw itemsError;

            // 3. Map to Employee format
            // Define privileged roles (who can see HR)
            const isPrivileged = currentUserProfile?.role === 'super_admin' ||
                currentUserProfile?.role === 'ceo' ||
                currentUserProfile?.role === 'hr' ||
                currentUserProfile?.is_hr;

            const mappedEmployees: Employee[] = (profiles || [])
                .filter((p: any) => {
                    // Filter out HR if user is not privileged
                    const isTargetHR = p.role === 'hr' || p.job_type === 'hr' || p.is_hr;
                    if (isTargetHR && !isPrivileged) return false;
                    return true;
                })
                .map((p: any) => {
                    const empItems = (items || []).filter((i: any) => i.profile_id === p.id).map((i: any) => ({
                        ...i,
                        color: CATEGORY_COLORS[i.category as Category] || 'bg-slate-500'
                    }));

                    // Determine level from job_type/level or default
                    let level = p.job_level || "Analyst L1";
                    if (p.job_type === 'intern') level = "Intern";
                    // Normalize some legacy values if needed

                    return {
                        id: p.id,
                        name: p.full_name,
                        role: p.role === 'employee' ? (p.job_type === 'intern' ? 'Intern' : 'Analyst') : p.role, // Simple fallback
                        level: level,
                        avatar: p.avatar_url ? p.avatar_url : p.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2),
                        items: empItems
                    };
                });

            setEmployees(mappedEmployees);

        } catch (error) {
            console.error("Error fetching workload data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (currentUserProfile) {
            fetchData();
        }
    }, [currentUserProfile]);

    const handleOpenEdit = (empId: string) => {
        setSelectedEmployeeId(empId);
        setIsEditModalOpen(true);
    };

    const handleCloseEdit = () => {
        setIsEditModalOpen(false);
        setSelectedEmployeeId(null);
    };

    const handleUpdateComplete = () => {
        fetchData(); // Refresh data after update
    };

    const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

    return (
        <div className="p-6 max-w-[1600px] mx-auto min-h-screen pb-20">
            {/* Header & Controls */}
            <div className="flex flex-col gap-6 mb-8">
                {/* Top Section: Title & Back Button */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20">
                            <Activity className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">Team Workload</h1>
                            <p className="text-sm text-muted-foreground">
                                Monitor team capacity. <span className="text-amber-500 font-medium">{formattedDate}</span>
                            </p>
                        </div>
                    </div>

                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-secondary/50 transition-colors text-sm text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>
                </div>

                {/* Controls Section (Toggle & Legend) */}
                <div className="flex justify-end">
                    <div className="flex items-center gap-4">
                        {/* View Toggle */}
                        <div className="flex bg-secondary/30 p-1 rounded-lg border border-white/5">
                            <button
                                onClick={() => setViewMode("grid")}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'grid' ? 'bg-amber-500 text-black shadow-md' : 'text-muted-foreground hover:text-white'}`}
                            >
                                <span className="flex items-center gap-2">⊞ Board</span>
                            </button>
                            <button
                                onClick={() => setViewMode("table")}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'table' ? 'bg-amber-500 text-black shadow-md' : 'text-muted-foreground hover:text-white'}`}
                            >
                                <span className="flex items-center gap-2">☰ Table</span>
                            </button>
                        </div>

                        {/* Legend */}
                        <div className="hidden lg:flex items-center gap-2 text-xs bg-card p-2 rounded-lg border shadow-sm">
                            <div className="flex items-center gap-1.5 px-2">
                                <div className="w-2 h-2 rounded-full bg-blue-400" />
                                <span className="text-muted-foreground">Idle {'(<70%)'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2 border-l">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-muted-foreground">Safe {'(70-80%)'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2 border-l">
                                <div className="w-2 h-2 rounded-full bg-orange-500" />
                                <span className="text-muted-foreground">Heavy {'(80-100%)'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2 border-l">
                                <div className="w-2 h-2 rounded-full bg-rose-500" />
                                <span className="text-muted-foreground">Overload {'(>100%)'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                    <span className="ml-2 text-muted-foreground">Loading workload data...</span>
                </div>
            ) : (
                <>
                    {/* View Switching */}
                    {viewMode === "grid" ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {employees.map((emp) => (
                                <EmployeeWorkloadCard
                                    key={emp.id}
                                    employee={emp}
                                    onManage={() => handleOpenEdit(emp.id)}
                                    canEdit={!isIntern || currentUserProfile?.id === emp.id}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full text-left bg-slate-100 p-2 dark:bg-[#1c2120]/50">
                                <thead className="bg-muted/50 border-b text-sm font-medium text-muted-foreground">
                                    <tr>
                                        <th className="px-6 py-4">Employee</th>
                                        <th className="px-6 py-4 w-[40%]">Capacity Load</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {employees.map(emp => (
                                        <EmployeeWorkloadRow
                                            key={emp.id}
                                            employee={emp}
                                            onManage={() => handleOpenEdit(emp.id)}
                                            canEdit={!isIntern || currentUserProfile?.id === emp.id}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && selectedEmployee && (
                <WorkloadEditModal
                    employee={selectedEmployee}
                    onClose={handleCloseEdit}
                    onUpdate={handleUpdateComplete}
                />
            )}
        </div>
    );
}

// --- Components ---

function EmployeeWorkloadRow({ employee, onManage, canEdit = false }: { employee: Employee; onManage: () => void; canEdit?: boolean }) {
    const maxCapacity = getCapacity(employee.level);
    const totalSlots = employee.items.reduce((sum, item) => sum + item.slots, 0);
    const usagePercent = maxCapacity > 0 ? Math.min((totalSlots / maxCapacity) * 100, 100) : 0;
    const status = getStatus(totalSlots, maxCapacity);

    // Initial avatar rendering check
    const renderAvatar = () => {
        if (employee.avatar && (employee.avatar.startsWith('http') || employee.avatar.startsWith('/'))) {
            return (
                <div className="w-9 h-9 rounded-full overflow-hidden">
                    <img src={employee.avatar} alt={employee.name} className="w-full h-full object-cover" />
                </div>
            );
        }
        return (
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${status.bgSoft} ${status.text}`}>
                {employee.avatar}
            </div>
        );
    }

    return (
        <tr className="hover:bg-white/5 transition-colors">
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    {renderAvatar()}
                    <div>
                        <p className="font-bold text-sm">{employee.name}</p>
                        <p className="text-xs text-muted-foreground">{employee.level}</p>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4">
                <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{totalSlots} / {maxCapacity} Slots</span>
                        <span className={`font-bold ${status.text}`}>{Math.round((totalSlots / maxCapacity) * 100)}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-secondary/30 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${status.color} ${totalSlots > maxCapacity ? 'animate-pulse' : ''}`}
                            style={{ width: `${usagePercent}%` }}
                        />
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 text-center">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${status.bgSoft} ${status.text} ${status.border}`}>
                    {status.label}
                </span>
            </td>
            <td className="px-6 py-4 text-right">
                {canEdit && (
                    <Button variant="ghost" size="icon" onClick={onManage} className="h-8 w-8 hover:text-amber-500 hover:bg-amber-500/10">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                        </svg>
                    </Button>
                )}
            </td>
        </tr>
    );
}

function EmployeeWorkloadCard({ employee, onManage, canEdit = false }: { employee: Employee; onManage: () => void; canEdit?: boolean }) {
    const maxCapacity = getCapacity(employee.level);
    const totalSlots = employee.items.reduce((sum, item) => sum + item.slots, 0);
    const usagePercent = maxCapacity > 0 ? Math.min((totalSlots / maxCapacity) * 100, 100) : 0;
    const status = getStatus(totalSlots, maxCapacity);

    const renderAvatar = () => {
        if (employee.avatar && (employee.avatar.startsWith('http') || employee.avatar.startsWith('/'))) {
            return (
                <div className="w-12 h-12 rounded-full overflow-hidden border border-white/5 shadow-inner">
                    <img src={employee.avatar} alt={employee.name} className="w-full h-full object-cover" />
                </div>
            );
        }
        return (
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-inner border border-white/5 ${status.bgSoft} ${status.text}`}>
                {employee.avatar}
            </div>
        );
    }

    return (
        <Card className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg border ${totalSlots > maxCapacity ? 'border-rose-500/50' : 'hover:border-amber-500/50'}`}>
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        {renderAvatar()}
                        <div>
                            <CardTitle className="text-base font-bold">{employee.name}</CardTitle>
                            <CardDescription className="mt-0.5">
                                {employee.level}
                            </CardDescription>
                        </div>
                    </div>
                    {canEdit && (
                        <Button variant="ghost" size="icon" onClick={onManage} className="h-8 w-8 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                            </svg>
                        </Button>
                    )}
                </div>
            </CardHeader>

            <CardContent>
                {/* Capacity Bar */}
                <div className="mb-6">
                    <div className="flex justify-between items-end mb-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${status.bgSoft} ${status.border} ${status.text}`}>
                            {status.label}
                        </span>
                        <div className={`flex items-baseline gap-1 ${status.text}`}>
                            <span className="text-2xl font-bold">{totalSlots}</span>
                            <span className="text-xs font-medium opacity-70">/ {maxCapacity} Slots</span>
                        </div>
                    </div>
                    <div className="h-3 w-full bg-secondary/30 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${status.color} ${totalSlots > maxCapacity ? 'animate-pulse' : ''}`}
                            style={{ width: `${usagePercent}%` }}
                        />
                    </div>
                </div>

                {/* Items Preview */}
                <div className="space-y-2">
                    {employee.items.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic text-center py-2">No active workload</p>
                    ) : (
                        employee.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/20 border border-transparent hover:border-border transition-colors group">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.color}`} />
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-medium truncate pr-2">{item.name}</span>
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            {item.category} {item.intensity !== 'Fixed' && item.intensity !== 'Custom' ? `• ${item.intensity}` : ''}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-xs font-bold opacity-70 group-hover:opacity-100 transition-opacity whitespace-nowrap px-2">
                                    {item.slots}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function WorkloadEditModal({ employee, onClose, onUpdate }: { employee: Employee; onClose: () => void; onUpdate: () => void }) {
    const [newItemName, setNewItemName] = useState("");
    const [newItemCategory, setNewItemCategory] = useState<Category>("Project");
    const [newItemIntensity, setNewItemIntensity] = useState<Intensity>("Medium");
    const [customSlots, setCustomSlots] = useState(1);
    const [isSaving, setIsSaving] = useState(false);
    const supabase = createClient();

    const calculateSlots = (cat: Category, int: Intensity) => {
        if (cat === "Project") return WEIGHT_CONFIG.Project[int as "High" | "Medium" | "Low"] || 2;
        if (cat === "Proposal") return WEIGHT_CONFIG.Proposal;
        if (cat === "Presentation") return WEIGHT_CONFIG.Presentation;
        if (cat === "Support") return WEIGHT_CONFIG.Support;
        return customSlots;
    };

    const handleAddItem = async () => {
        if (!newItemName.trim()) return;
        setIsSaving(true);

        const slots = (newItemCategory === "Etc") ? customSlots : calculateSlots(newItemCategory, newItemIntensity);
        const autoIntensity = (newItemCategory === "Project") ? newItemIntensity : (newItemCategory === "Etc" ? "Custom" : "Fixed");

        try {
            const { error } = await supabase.from('workload_items').insert({
                profile_id: employee.id,
                name: newItemName,
                category: newItemCategory,
                intensity: autoIntensity,
                slots: slots
            });

            if (error) {
                console.error("Error adding workload:", error);
                alert("Failed to add workload item. Check console.");
            } else {
                setNewItemName("");
                onUpdate(); // Refresh parent data
            }
        } catch (err) {
            console.error("Exception adding workload:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!confirm("Are you sure you want to delete this item?")) return;

        try {
            const { error } = await supabase.from('workload_items').delete().eq('id', itemId);
            if (error) {
                console.error("Error deleting workload:", error);
                alert("Failed to delete item.");
            } else {
                onUpdate();
            }
        } catch (err) {
            console.error("Exception deleting workload:", err);
        }
    };

    const maxCapacity = getCapacity(employee.level);
    const currentSlots = employee.items.reduce((sum, item) => sum + item.slots, 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-lg shadow-2xl border-amber-500/20 animate-in fade-in zoom-in-95 duration-200">
                <CardHeader className="border-b bg-muted/30 pb-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Manage Workload</CardTitle>
                            <CardDescription>for {employee.name} ({employee.level})</CardDescription>
                        </div>
                        <div className="text-right">
                            <span className={`text-2xl font-bold ${currentSlots > maxCapacity ? 'text-rose-500' : 'text-emerald-500'}`}>
                                {currentSlots}
                            </span>
                            <span className="text-sm text-muted-foreground"> / {maxCapacity} Slots</span>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="p-4 space-y-4">
                        <div className="bg-secondary/20 p-4 rounded-xl border border-border space-y-3">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-xs">＋</span>
                                Add New Activity
                            </h4>

                            <div className="space-y-2">
                                <input
                                    placeholder="Activity or Project Name..."
                                    className="w-full bg-background border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500/50 outline-none"
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                    disabled={isSaving}
                                />

                                <div className="grid grid-cols-2 gap-2">
                                    <select
                                        className="bg-background border rounded-lg px-3 py-2 text-sm outline-none"
                                        value={newItemCategory}
                                        onChange={(e) => setNewItemCategory(e.target.value as Category)}
                                        disabled={isSaving}
                                    >
                                        <option value="Project">Project</option>
                                        <option value="Proposal">Proposal</option>
                                        <option value="Presentation">Presentation</option>
                                        <option value="Support">Support</option>
                                        <option value="Etc">Etc (Custom)</option>
                                    </select>

                                    {newItemCategory === "Project" ? (
                                        <select
                                            className="bg-background border rounded-lg px-3 py-2 text-sm outline-none"
                                            value={newItemIntensity}
                                            onChange={(e) => setNewItemIntensity(e.target.value as Intensity)}
                                            disabled={isSaving}
                                        >
                                            <option value="High">🔥 High (4)</option>
                                            <option value="Medium">⚡ Medium (3)</option>
                                            <option value="Low">💧 Low (2)</option>
                                        </select>
                                    ) : newItemCategory === "Etc" ? (
                                        <div className="flex items-center gap-2 bg-background border rounded-lg px-2">
                                            <span className="text-xs text-muted-foreground whitespace-nowrap">Slots:</span>
                                            <input
                                                type="number"
                                                min="1"
                                                max="12"
                                                className="w-full bg-transparent py-2 text-sm outline-none"
                                                value={customSlots}
                                                onChange={(e) => setCustomSlots(parseInt(e.target.value) || 1)}
                                                disabled={isSaving}
                                            />
                                        </div>
                                    ) : (
                                        <div className="px-3 py-2 text-sm text-muted-foreground bg-secondary/50 rounded-lg">
                                            Fixed: 2 Slots
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Button
                                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
                                onClick={handleAddItem}
                                disabled={isSaving}
                            >
                                {isSaving ? "Adding..." : "Add to Workload"}
                            </Button>
                        </div>

                        {/* List */}
                        <div className="space-y-1 max-h-[250px] overflow-y-auto pr-1">
                            {employee.items.map(item => (
                                <div key={item.id} className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg border hover:bg-secondary/20 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${item.color || 'bg-slate-500'}`} />
                                        <div>
                                            <p className="text-sm font-medium">{item.name}</p>
                                            <p className="text-xs text-muted-foreground">{item.category} • {item.intensity === 'Fixed' || item.intensity === 'Custom' ? `${item.slots} slots` : item.intensity}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-bold px-2 py-1 rounded-full bg-secondary/50 min-w-[30px] text-center">{item.slots}</span>
                                        <button
                                            onClick={() => handleDeleteItem(item.id)}
                                            className="text-muted-foreground hover:text-rose-500 transition-colors p-1"
                                        >
                                            <Loader2 className={`h-4 w-4 animate-spin hidden`} /> {/* Placeholder logic if specific item deleting */}
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
                <div className="p-4 border-t bg-muted/10 flex justify-end">
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>Close</Button>
                </div>
            </Card>
        </div>
    );
}
