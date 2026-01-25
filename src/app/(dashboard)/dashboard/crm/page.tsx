"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldAlert } from "lucide-react";

// Types
type ClientStatus = "active" | "inactive" | "prospect";
type PaymentStatus = "paid" | "pending" | "overdue";

interface ClientRecord {
    id: string;
    name: string;
    industry: string;
    pic: string;
    email: string;
    phone: string;
    status: ClientStatus;
    contractValue: number;
    paymentStatus: PaymentStatus;
    lastProject: string;
    lastProjectDate: string;
    notes: string;
}

const CLIENT_STATUS_CONFIG = {
    active: { label: "Active", bgClass: "bg-emerald-500/10", textClass: "text-emerald-500", borderClass: "border-emerald-500/20" },
    inactive: { label: "Inactive", bgClass: "bg-gray-500/10", textClass: "text-gray-400", borderClass: "border-gray-500/20" },
    prospect: { label: "Prospect", bgClass: "bg-blue-500/10", textClass: "text-blue-500", borderClass: "border-blue-500/20" },
};

const PAYMENT_STATUS_CONFIG = {
    paid: { label: "Paid", bgClass: "bg-emerald-500/10", textClass: "text-emerald-500" },
    pending: { label: "Pending", bgClass: "bg-amber-500/10", textClass: "text-amber-500" },
    overdue: { label: "Overdue", bgClass: "bg-rose-500/10", textClass: "text-rose-500" },
};

// Mock data
const mockClients: ClientRecord[] = [
    { id: "1", name: "PT Maju Jaya", industry: "Manufacturing", pic: "Budi Santoso", email: "budi@majujaya.com", phone: "+62 812 3456 7890", status: "active", contractValue: 150000000, paymentStatus: "paid", lastProject: "Annual Audit 2024", lastProjectDate: "2024-10-15", notes: "Long-term client since 2019" },
    { id: "2", name: "CV Sukses Bersama", industry: "Retail", pic: "Dewi Lestari", email: "dewi@suksesbersama.co.id", phone: "+62 821 9876 5432", status: "active", contractValue: 75000000, paymentStatus: "pending", lastProject: "Tax Compliance Review", lastProjectDate: "2024-09-20", notes: "Potential for expansion" },
    { id: "3", name: "PT Teknologi Nusantara", industry: "Technology", pic: "Andi Wijaya", email: "andi@teknusantara.id", phone: "+62 857 1234 5678", status: "active", contractValue: 200000000, paymentStatus: "paid", lastProject: "IT Audit Q3", lastProjectDate: "2024-11-05", notes: "Premium client" },
    { id: "4", name: "Koperasi Makmur", industry: "Finance", pic: "Siti Rahayu", email: "siti@koperasimakmur.org", phone: "+62 813 5678 9012", status: "inactive", contractValue: 50000000, paymentStatus: "paid", lastProject: "Financial Statement 2023", lastProjectDate: "2024-03-10", notes: "Contract ended" },
    { id: "5", name: "PT Global Trading", industry: "Trading", pic: "Rudi Hartono", email: "rudi@globaltrading.com", phone: "+62 878 2345 6789", status: "prospect", contractValue: 120000000, paymentStatus: "pending", lastProject: "-", lastProjectDate: "-", notes: "Initial meeting scheduled" },
    { id: "6", name: "Yayasan Pendidikan Cerdas", industry: "Education", pic: "Rina Sari", email: "rina@ypcerdas.org", phone: "+62 856 7890 1234", status: "active", contractValue: 80000000, paymentStatus: "overdue", lastProject: "Grant Audit 2024", lastProjectDate: "2024-08-25", notes: "Payment reminder sent" },
];

export default function CRMDatabasePage() {
    const router = useRouter();
    const { profile, isLoading } = useAuth();
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<"all" | ClientStatus>("all");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    // RBAC: Check access
    const hasAccess = profile?.is_busdev || profile?.job_type === 'bisdev' || profile?.job_type === 'sales' ||
        profile?.role === 'ceo' || profile?.role === 'super_admin' || profile?.role === 'owner';

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <div className="p-4 rounded-full bg-rose-500/10">
                    <ShieldAlert className="w-12 h-12 text-rose-500" />
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Access Denied</h2>
                <p className="text-[var(--text-secondary)] text-center max-w-md">
                    Anda tidak memiliki akses ke halaman CRM Database. Hubungi HR atau Admin untuk mendapatkan akses Busdev.
                </p>
                <Link href="/dashboard" className="px-4 py-2 bg-[#e8c559] text-black rounded-lg font-bold hover:bg-[#d6b54e] transition-colors">
                    Kembali ke Dashboard
                </Link>
            </div>
        );
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
    };

    const filteredClients = mockClients.filter((client) => {
        const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            client.pic.toLowerCase().includes(searchQuery.toLowerCase()) ||
            client.industry.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterStatus === "all" || client.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    const handleClientClick = (id: string) => {
        router.push(`/dashboard/crm/${id}`);
    };

    // Stats
    const totalClients = mockClients.length;
    const activeClients = mockClients.filter(c => c.status === "active").length;
    const totalContractValue = mockClients.filter(c => c.status === "active").reduce((sum, c) => sum + c.contractValue, 0);
    const overduePayments = mockClients.filter(c => c.paymentStatus === "overdue").length;

    return (
        <div className="flex flex-col gap-8 pb-10">
            {/* Page Header */}
            <header className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3f545f] to-[#5f788e] dark:from-[#e8c559] dark:to-[#dcb33e] flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white dark:text-[#171611]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">CRM Database</h1>
                        <p className="text-sm text-[var(--text-secondary)]">Historical client records and relationship management</p>
                    </div>
                </div>
                <Link
                    href="/dashboard/crm/add"
                    className="group relative flex items-center justify-center gap-2 rounded-xl bg-[#e8c559] px-6 py-3 text-sm font-bold text-[#171611] shadow-[0_0_20px_rgba(232,197,89,0.2)] transition-all hover:bg-[#ebd07a] hover:shadow-[0_0_30px_rgba(232,197,89,0.4)] active:scale-95"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                    </svg>
                    Add Client
                </Link>
            </header>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-panel p-5 rounded-2xl border border-border bg-card shadow-sm">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Clients</p>
                    <p className="text-2xl font-bold text-foreground">{totalClients}</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border border-border bg-card shadow-sm">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Active Clients</p>
                    <p className="text-2xl font-bold text-emerald-500">{activeClients}</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border border-border bg-card shadow-sm">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Contract Value</p>
                    <p className="text-2xl font-bold text-[#e8c559]">{formatCurrency(totalContractValue)}</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border border-border bg-card shadow-sm">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Overdue Payments</p>
                    <p className="text-2xl font-bold text-rose-500">{overduePayments}</p>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Search & Filter */}
                <div className="flex flex-1 items-center gap-3 w-full">
                    <div className="relative flex-1 min-w-[200px]">
                        <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search clients..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-11 w-full rounded-xl border border-border bg-card/50 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#e8c559]/50 outline-none transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-1 bg-card/50 border border-border rounded-xl p-1">
                        {(["all", "active", "inactive", "prospect"] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${filterStatus === status
                                    ? "bg-[#e8c559] text-[#171611] shadow-sm"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    }`}
                            >
                                {status === "all" ? "All" : status}
                            </button>
                        ))}
                    </div>
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-1 bg-card/50 border border-border rounded-xl p-1 shrink-0">
                    <button
                        onClick={() => setViewMode("grid")}
                        className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                            }`}
                        title="Grid View"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M4 11h5V5H4v6zm0 7h5v-6H4v6zm6 0h5v-6h-5v6zm6 0h5v-6h-5v6zm-6-7h5V5h-5v6zm6-6v6h5V5h-5z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => setViewMode("list")}
                        className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                            }`}
                        title="List View"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Content */}
            {viewMode === "list" ? (
                <div className="glass-panel rounded-2xl overflow-hidden border border-border bg-card shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-muted/50 border-b border-white/5">
                                <tr className="text-xs text-muted-foreground uppercase tracking-wider">
                                    <th className="p-4 font-semibold">Client</th>
                                    <th className="p-4 font-semibold">Industry</th>
                                    <th className="p-4 font-semibold">Status</th>
                                    <th className="p-4 font-semibold">Contract Value</th>
                                    <th className="p-4 font-semibold">PIC</th>
                                    <th className="p-4 font-semibold">Last Project</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredClients.map((client) => (
                                    <tr
                                        key={client.id}
                                        className="hover:bg-muted/50 transition-colors cursor-pointer group"
                                        onClick={() => handleClientClick(client.id)}
                                    >
                                        <td className="p-4">
                                            <div className="font-bold text-foreground group-hover:text-[#e8c559] transition-colors">{client.name}</div>
                                            <div className="text-xs text-muted-foreground">{client.email}</div>
                                        </td>
                                        <td className="p-4 text-sm text-muted-foreground">{client.industry}</td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${CLIENT_STATUS_CONFIG[client.status].bgClass} ${CLIENT_STATUS_CONFIG[client.status].textClass} ${CLIENT_STATUS_CONFIG[client.status].borderClass}`}>
                                                {CLIENT_STATUS_CONFIG[client.status].label}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm font-medium text-foreground">{formatCurrency(client.contractValue)}</td>
                                        <td className="p-4">
                                            <div className="text-sm font-medium text-foreground">{client.pic}</div>
                                            <div className="text-xs text-muted-foreground">{client.phone}</div>
                                        </td>
                                        <td className="p-4 text-xs text-muted-foreground">
                                            {client.lastProject}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClients.map((client) => (
                        <div
                            key={client.id}
                            onClick={() => handleClientClick(client.id)}
                            className="group relative bg-card hover:bg-muted/30 border border-border hover:border-[#e8c559]/50 rounded-2xl p-6 transition-all cursor-pointer shadow-sm hover:shadow-lg hover:-translate-y-1 block"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-xl font-bold text-foreground group-hover:text-[#e8c559] transition-colors">
                                    {client.name.substring(0, 2).toUpperCase()}
                                </div>
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${CLIENT_STATUS_CONFIG[client.status].bgClass} ${CLIENT_STATUS_CONFIG[client.status].textClass} ${CLIENT_STATUS_CONFIG[client.status].borderClass}`}>
                                    {CLIENT_STATUS_CONFIG[client.status].label}
                                </span>
                            </div>

                            <h3 className="text-lg font-bold text-foreground mb-1 group-hover:text-[#e8c559] transition-colors line-clamp-1">{client.name}</h3>
                            <p className="text-sm text-muted-foreground mb-4">{client.industry}</p>

                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-transparent group-hover:border-[#e8c559]/20 transition-all">
                                    <span className="text-lg">👤</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-foreground truncate">{client.pic}</p>
                                        <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Value</span>
                                    <span className="font-bold text-[#e8c559]">{formatCurrency(client.contractValue)}</span>
                                </div>
                            </div>

                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="p-2 rounded-full bg-[#e8c559] text-[#171611]">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M5 12h14"></path>
                                        <path d="M12 5l7 7-7 7"></path>
                                    </svg>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
