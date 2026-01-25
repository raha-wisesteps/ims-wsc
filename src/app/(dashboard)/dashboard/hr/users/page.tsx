"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type UserRole = "owner" | "super_admin" | "ceo" | "hr" | "employee";
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
};

const DEPT_CONFIG: Record<string, { label: string; bgClass: string; textClass: string }> = {
    analyst: { label: "Analyst", bgClass: "bg-emerald-500/10", textClass: "text-emerald-400" },
    bisdev: { label: "Bisdev", bgClass: "bg-amber-500/10", textClass: "text-amber-400" },
    sales: { label: "Sales", bgClass: "bg-orange-500/10", textClass: "text-orange-400" },
    hr: { label: "HR", bgClass: "bg-purple-500/10", textClass: "text-purple-400" },
    intern: { label: "Intern", bgClass: "bg-sky-500/10", textClass: "text-sky-400" },
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

    // Form state for editing
    const [formData, setFormData] = useState({
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
        setFormData({
            employee_type: user.employee_type || "employee",
            is_office_manager: user.is_office_manager || false,
            is_busdev: user.is_busdev || false,
            is_hr: user.is_hr || false,
            is_female: user.is_female || false,
        });
    };

    const handleSave = async () => {
        if (!selectedUser) return;

        setSaving(true);
        const { error } = await supabase
            .from('profiles')
            .update({
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
            await fetchUsers();
            setSelectedUser(null);
        }
        setSaving(false);
    };

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
            <header className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
                <div className="flex flex-col gap-2">
                    <Link
                        href="/dashboard/hr"
                        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-2 transition-colors group"
                    >
                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Human Resource
                    </Link>
                    <h1 className="text-4xl font-black tracking-tight text-[var(--text-primary)]">User Management</h1>
                    <p className="text-lg text-[var(--text-secondary)]">Manage employee accounts, roles, and access permissions.</p>
                </div>
            </header>

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
                                            {canManage && (
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
            {selectedUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel rounded-2xl p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">Edit Access: {selectedUser.full_name}</h2>
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
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
                                    onClick={() => setSelectedUser(null)}
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
            )}
        </div>
    );
}
