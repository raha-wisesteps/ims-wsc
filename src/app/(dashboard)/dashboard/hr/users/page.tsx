"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronRight, Loader2, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "react-hot-toast";

type UserRole = "owner" | "super_admin" | "ceo" | "hr" | "employee" | "intern";
type Department = "analyst" | "bisdev" | "sales" | "intern" | "hr";
type EmployeeType = "employee" | "remote_employee";

interface User {
    id: string;
    full_name: string;
    email: string;
    role: UserRole;
    job_type: Department;
    job_level: string;
    join_date: string;
    is_active: boolean;
    is_office_manager: boolean;
    is_busdev: boolean;
    is_hr: boolean;
    is_female: boolean;
    employee_type: EmployeeType;
}

const ROLE_CONFIG: Record<string, { label: string; bgClass: string; textClass: string }> = {
    owner: { label: "Owner", bgClass: "bg-[#e8c559]/10", textClass: "text-[#e8c559]" },
    super_admin: { label: "Super Admin", bgClass: "bg-[#e8c559]/10", textClass: "text-[#e8c559]" },
    ceo: { label: "CEO", bgClass: "bg-amber-500/10", textClass: "text-amber-400" },
    hr: { label: "HR Admin", bgClass: "bg-purple-500/10", textClass: "text-purple-400" },
    employee: { label: "Employee", bgClass: "bg-blue-500/10", textClass: "text-blue-400" },
    intern: { label: "Intern", bgClass: "bg-sky-500/10", textClass: "text-sky-400" },
};

const DEPT_CONFIG: Record<string, { label: string; bgClass: string; textClass: string }> = {
    analyst: { label: "Analyst", bgClass: "bg-emerald-500/10", textClass: "text-emerald-400" },
    bisdev: { label: "Bisdev", bgClass: "bg-amber-500/10", textClass: "text-amber-400" },
    sales: { label: "Sales", bgClass: "bg-orange-500/10", textClass: "text-orange-400" },
    hr: { label: "HR", bgClass: "bg-purple-500/10", textClass: "text-purple-400" },
    intern: { label: "Intern", bgClass: "bg-sky-500/10", textClass: "text-sky-400" },
};

const LEVEL_OPTIONS: Record<string, string[]> = {
    analyst: [
        "Intern",
        "Analyst I", "Analyst II", "Analyst III",
        "Consultant I", "Consultant II", "Consultant III",
        "Manager I", "Manager II", "Manager III"
    ],
    bisdev: [
        "Intern",
        "Sales Executive I", "Sales Executive II", "Sales Executive III",
        "Business Dev I", "Business Dev II", "Business Dev III",
        "Business Manager I", "Business Manager II", "Business Manager III"
    ],
    sales: ["Intern"],
    hr: ["Intern"],
    intern: ["Intern"],
};

export default function UserManagementPage() {
    const supabase = createClient();
    const { profile: currentUser } = useAuth();

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterRole, setFilterRole] = useState<"all" | UserRole>("all");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isAddMode, setIsAddMode] = useState(false);

    // Form state for editing/adding
    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        password: "",
        role: "employee" as UserRole,
        job_type: "analyst" as Department,
        job_level: "",
        employee_type: "employee" as EmployeeType,
        is_office_manager: false,
        is_busdev: false,
        is_hr: false,
        is_female: false,
    });

    // Check if current user can manage users
    const canManage = currentUser?.role === 'ceo' || currentUser?.role === 'super_admin' || currentUser?.role === 'owner' || currentUser?.job_type === 'hr';

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, email, role, job_type, job_level, join_date, is_active, is_office_manager, is_busdev, is_hr, is_female, employee_type')
            .order('full_name');

        if (error) {
            console.error("Error fetching users:", error);
        } else {
            setUsers(data || []);
        }
        setLoading(false);
    };

    const handleEdit = (user: User) => {
        setSelectedUser(user);
        setIsAddMode(false);
        setFormData({
            full_name: user.full_name || "",
            email: user.email || "",
            password: "",
            role: user.role || "employee",
            job_type: user.job_type || "analyst",
            job_level: user.job_level || "",
            employee_type: user.employee_type || "employee",
            is_office_manager: user.is_office_manager || false,
            is_busdev: user.is_busdev || false,
            is_hr: user.is_hr || false,
            is_female: user.is_female || false,
        });
    };

    const handleAdd = () => {
        setSelectedUser({} as User); // Dummy user to open modal
        setIsAddMode(true);
        setFormData({
            full_name: "",
            email: "",
            password: "",
            role: "employee",
            job_type: "analyst",
            job_level: "Intern",
            employee_type: "employee",
            is_office_manager: false,
            is_busdev: false,
            is_hr: false,
            is_female: false,
        });
    }

    const handleSave = async () => {
        if (!selectedUser) return;
        setSaving(true);

        if (isAddMode) {
            try {
                const response = await fetch('/api/create-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || 'Failed to create user');
                }

                toast.success("User successfully created!");
                await fetchUsers();
                setSelectedUser(null);
                setIsAddMode(false);
            } catch (error: any) {
                console.error("Error creating user:", error);
                toast.error(error.message || "Failed to create user");
            } finally {
                setSaving(false);
            }
            return;
        }
        const { error } = await supabase
            .from('profiles')
            .update({
                role: formData.role,
                job_type: formData.job_type,
                job_level: formData.job_level,
                employee_type: formData.employee_type,
                is_office_manager: formData.is_office_manager,
                is_busdev: formData.is_busdev,
                is_hr: formData.is_hr,
                is_female: formData.is_female,
            })
            .eq('id', selectedUser.id);

        if (error) {
            console.error("Error updating user:", error);
            alert("Gagal menyimpan perubahan");
        } else {
            toast.success("User updated successfully!");
            await fetchUsers();
            setSelectedUser(null);
        }
        setSaving(false);
    };

    // Derived state for lock status
    const isDeptLocked = formData.role === 'hr' || formData.role === 'intern';
    const isLevelLocked = formData.role === 'hr' || formData.role === 'intern';

    const filteredUsers = users.filter((user) => {
        const matchesSearch = user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = filterRole === "all" || user.role === filterRole;
        return matchesSearch && matchesRole;
    });

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "-";
        return new Date(dateStr).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    return (
        <div className="flex flex-col gap-8 pb-20">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-[var(--text-secondary)]">
                            <Link href="/dashboard" className="hover:text-[var(--text-primary)] transition-colors">Dashboard</Link>
                            <ChevronRight className="h-4 w-4" />
                            <Link href="/dashboard/hr" className="hover:text-[var(--text-primary)] transition-colors">Human Resource</Link>
                            <ChevronRight className="h-4 w-4" />
                            <span>User Management</span>
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">User Management</h1>
                        <p className="text-sm text-[var(--text-secondary)]">Manage employee accounts, roles, and access permissions.</p>
                    </div>
                </div>
                {canManage && (
                    <button
                        onClick={handleAdd}
                        className="px-4 py-2.5 rounded-xl bg-[#e8c559] hover:bg-[#ebd07a] text-[#171611] font-bold transition-colors flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Add User
                    </button>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-panel rounded-xl p-5">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Users</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{users.length}</p>
                </div>
                <div className="glass-panel rounded-xl p-5">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Active</p>
                    <p className="text-2xl font-bold text-emerald-400">{users.filter(u => u.is_active).length}</p>
                </div>
                <div className="glass-panel rounded-xl p-5">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Remote Employees</p>
                    <p className="text-2xl font-bold text-sky-400">{users.filter(u => u.employee_type === "remote_employee").length}</p>
                </div>
                <div className="glass-panel rounded-xl p-5">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">With Busdev Access</p>
                    <p className="text-2xl font-bold text-amber-400">{users.filter(u => u.is_busdev).length}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[250px]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-11 w-full rounded-xl border-none bg-white/5 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder-gray-500 focus:ring-2 focus:ring-[#e8c559]/50 transition-all"
                    />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {(["all", "employee", "hr", "ceo"] as const).map((role) => (
                        <button
                            key={role}
                            onClick={() => setFilterRole(role)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${filterRole === role
                                ? "bg-[#e8c559]/20 text-[#e8c559] border border-[#e8c559]/30"
                                : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                                }`}
                        >
                            {role === "all" ? "All" : ROLE_CONFIG[role]?.label || role}
                        </button>
                    ))}
                </div>
            </div>

            {/* User Table */}
            <div className="glass-panel rounded-xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-[#e8c559]" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-white/10 text-xs text-gray-500 uppercase tracking-wider">
                                    <th className="p-4 font-semibold">User</th>
                                    <th className="p-4 font-semibold">Role & Access</th>
                                    <th className="p-4 font-semibold">Department</th>
                                    <th className="p-4 font-semibold">Level</th>
                                    <th className="p-4 font-semibold">Join Date</th>
                                    <th className="p-4 font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-full bg-gradient-to-br from-[#e8c559]/30 to-[#b89530]/30 flex items-center justify-center text-[#e8c559] font-bold text-sm border border-white/10">
                                                    {user.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "?"}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-[var(--text-primary)]">{user.full_name || "No Name"}</p>
                                                    <p className="text-xs text-gray-500">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1 items-start">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${ROLE_CONFIG[user.role]?.bgClass || 'bg-gray-500/10'} ${ROLE_CONFIG[user.role]?.textClass || 'text-gray-400'}`}>
                                                    {ROLE_CONFIG[user.role]?.label || user.role}
                                                </span>
                                                <div className="flex flex-wrap gap-1">
                                                    {user.is_office_manager && (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                                            Office Mgr
                                                        </span>
                                                    )}
                                                    {user.is_busdev && (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                            Busdev
                                                        </span>
                                                    )}
                                                    {user.is_hr && (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                            HR
                                                        </span>
                                                    )}
                                                    {user.is_female && (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20">
                                                            Female
                                                        </span>
                                                    )}
                                                    {user.employee_type === "remote_employee" && (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                                            Remote
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${DEPT_CONFIG[user.job_type]?.bgClass || 'bg-gray-500/10'} ${DEPT_CONFIG[user.job_type]?.textClass || 'text-gray-400'}`}>
                                                {DEPT_CONFIG[user.job_type]?.label || user.job_type || "-"}
                                            </span>
                                        </td>
                                        <td className="p-4 text-[var(--text-primary)] font-medium">{user.job_level || "-"}</td>
                                        <td className="p-4 text-gray-400 text-sm">{formatDate(user.join_date)}</td>
                                        <td className="p-4">
                                            {canManage && user.role !== 'ceo' && user.role !== 'super_admin' && (
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                                    title="Edit Access"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                                                    </svg>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Edit User Modal */}
            {
                selectedUser && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="glass-panel rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                                    {isAddMode ? 'Add New User' : `Edit Access: ${selectedUser.full_name}`}
                                </h2>
                                <button
                                    onClick={() => { setSelectedUser(null); setIsAddMode(false); }}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-4">
                                {isAddMode && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-2">Full Name *</label>
                                            <input
                                                type="text"
                                                value={formData.full_name}
                                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                                placeholder="Enter full name..."
                                                className="w-full p-3 rounded-lg bg-black/30 border border-white/10 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-2">Email *</label>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="Enter email address..."
                                                className="w-full p-3 rounded-lg bg-black/30 border border-white/10 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-2">Password *</label>
                                            <input
                                                type="text"
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                placeholder="Enter strong password..."
                                                className="w-full p-3 rounded-lg bg-black/30 border border-white/10 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none"
                                                required
                                                minLength={6}
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Role Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Role System</label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => {
                                            const newRole = e.target.value as UserRole;
                                            setFormData(prev => {
                                                const updates = { ...prev, role: newRole };

                                                // Auto-lock logic for specific roles
                                                if (newRole === 'hr') {
                                                    updates.job_type = 'hr';
                                                    updates.job_level = 'HR';
                                                } else if (newRole === 'intern') {
                                                    updates.job_type = 'intern';
                                                    updates.job_level = 'Intern';
                                                }

                                                return updates;
                                            });
                                        }}
                                        className="w-full p-3 rounded-lg bg-black/30 border border-white/10 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none"
                                    >
                                        <option value="employee">Employee</option>
                                        <option value="hr">HR Admin</option>
                                        <option value="intern">Intern</option>
                                        {(currentUser?.role === 'super_admin' || currentUser?.role === 'ceo' || currentUser?.role === 'owner') && (
                                            <>
                                                <option value="super_admin">Super Admin</option>
                                                <option value="ceo">CEO</option>
                                                <option value="owner">Owner</option>
                                            </>
                                        )}
                                    </select>
                                </div>

                                {/* Department (Job Type) - MOVED UP TO BE PROMINENT */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Department {isDeptLocked && "(Locked by Role)"}</label>
                                    <select
                                        value={formData.job_type}
                                        disabled={isDeptLocked}
                                        onChange={(e) => {
                                            const newType = e.target.value as Department;
                                            setFormData({
                                                ...formData,
                                                job_type: newType,
                                                // Reset level if switching to a dept with options
                                                job_level: LEVEL_OPTIONS[newType]?.[0] || ""
                                            });
                                        }}
                                        className={`w-full p-3 rounded-lg border border-white/10 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none ${isDeptLocked ? 'bg-black/50 opacity-70 cursor-not-allowed' : 'bg-black/30'}`}
                                    >
                                        <option value="analyst">Analyst</option>
                                        <option value="bisdev">Bisdev</option>
                                        <option value="sales">Sales</option>
                                        <option value="hr">HR</option>
                                        <option value="intern">Intern</option>
                                    </select>
                                </div>

                                {/* Job Level - Conditional */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Level / Position {isLevelLocked && "(Locked by Role)"}</label>
                                    {LEVEL_OPTIONS[formData.job_type] && !isLevelLocked ? (
                                        <select
                                            value={formData.job_level}
                                            onChange={(e) => setFormData({ ...formData, job_level: e.target.value })}
                                            className="w-full p-3 rounded-lg bg-black/30 border border-white/10 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none"
                                        >
                                            <option value="">Select Level...</option>
                                            {LEVEL_OPTIONS[formData.job_type].map((opt) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            value={formData.job_level || ""}
                                            disabled={isLevelLocked}
                                            onChange={(e) => setFormData({ ...formData, job_level: e.target.value })}
                                            placeholder="Enter job level..."
                                            className={`w-full p-3 rounded-lg border border-white/10 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none ${isLevelLocked ? 'bg-black/50 opacity-70 cursor-not-allowed' : 'bg-black/30'}`}
                                        />
                                    )}
                                </div>

                                {/* Employee Type */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Employee Type</label>
                                    <select
                                        value={formData.employee_type}
                                        onChange={(e) => setFormData({ ...formData, employee_type: e.target.value as EmployeeType })}
                                        className="w-full p-3 rounded-lg bg-black/30 border border-white/10 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none"
                                    >
                                        <option value="employee">Office Employee</option>
                                        <option value="remote_employee">Remote Employee</option>
                                    </select>
                                </div>

                                {/* Access Flags */}
                                <div className="space-y-3">
                                    <p className="text-sm font-medium text-gray-400">Access Flags</p>

                                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                                        <div>
                                            <span className="block text-sm font-medium text-white">Office Manager</span>
                                            <span className="text-xs text-gray-400">Access to /operational</span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={formData.is_office_manager}
                                            onChange={(e) => setFormData({ ...formData, is_office_manager: e.target.checked })}
                                            className="w-5 h-5 rounded border-gray-600 text-[#e8c559] focus:ring-[#e8c559] bg-black/30"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                                        <div>
                                            <span className="block text-sm font-medium text-white">Busdev Access</span>
                                            <span className="text-xs text-gray-400">Access to CRM Database</span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={formData.is_busdev}
                                            onChange={(e) => setFormData({ ...formData, is_busdev: e.target.checked })}
                                            className="w-5 h-5 rounded border-gray-600 text-amber-500 focus:ring-amber-500 bg-black/30"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                                        <div>
                                            <span className="block text-sm font-medium text-white">HR Access</span>
                                            <span className="text-xs text-gray-400">Limited HR page access</span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={formData.is_hr}
                                            onChange={(e) => setFormData({ ...formData, is_hr: e.target.checked })}
                                            className="w-5 h-5 rounded border-gray-600 text-purple-500 focus:ring-purple-500 bg-black/30"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                                        <div>
                                            <span className="block text-sm font-medium text-white">Gender: Female</span>
                                            <span className="text-xs text-gray-400">Enable female-specific leaves (e.g. Maternity)</span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={formData.is_female}
                                            onChange={(e) => setFormData({ ...formData, is_female: e.target.checked })}
                                            className="w-5 h-5 rounded border-gray-600 text-pink-500 focus:ring-pink-500 bg-black/30"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => { setSelectedUser(null); setIsAddMode(false); }}
                                        className="flex-1 py-3 rounded-lg border border-white/10 text-gray-400 hover:bg-white/5 font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex-1 py-3 rounded-lg bg-[#e8c559] text-[#171611] font-bold hover:bg-[#ebd07a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
