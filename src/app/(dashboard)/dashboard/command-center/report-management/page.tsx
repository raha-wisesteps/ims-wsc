"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
    LayoutDashboard, 
    ChevronRight, 
    MessageSquare, 
    Search, 
    Filter, 
    Eye, 
    CheckCircle, 
    XCircle, 
    AlertCircle, 
    Shield, 
    Clock, 
    User, 
    Send,
    X,
    Trash2
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function ReportManagementPage() {
    const { profile } = useAuth();
    const supabase = createClient();

    const [reports, setReports] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");

    // Detail Modal State
    const [selectedReport, setSelectedReport] = useState<any>(null);
    const [adminResponse, setAdminResponse] = useState("");
    const [newStatus, setNewStatus] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('user_reports')
                .select(`
                    *,
                    profiles:user_id (
                        full_name,
                        job_title,
                        email
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setReports(data || []);
        } catch (error) {
            console.error("Error fetching reports:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenDetail = (report: any) => {
        setSelectedReport(report);
        setAdminResponse(report.admin_response || "");
        setNewStatus(report.status);
    };

    const handleUpdateReport = async () => {
        if (!selectedReport) return;
        setIsUpdating(true);

        try {
            const updates: any = {
                status: newStatus,
                admin_response: adminResponse,
                responded_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('user_reports')
                .update(updates)
                .eq('id', selectedReport.id);

            if (error) throw error;

            // Update local state
            setReports(reports.map(r => r.id === selectedReport.id ? { ...r, ...updates } : r));
            setSelectedReport(null);
            
            // Optional: Show success toast/message here
            
        } catch (error) {
            console.error("Error updating report:", error);
            alert("Failed to update report");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteReport = async (id: string) => {
        if (!confirm("Are you sure you want to delete this report? This action cannot be undone.")) return;

        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from('user_reports')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Remove from local state
            setReports(reports.filter(r => r.id !== id));
            // Close modal if open and matches deleted report
            if (selectedReport && selectedReport.id === id) {
                setSelectedReport(null);
            }
        } catch (error) {
            console.error("Error deleting report:", error);
            alert("Failed to delete report");
        } finally {
            setIsDeleting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">Pending</span>;
            case 'reviewed':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">Reviewed</span>;
            case 'resolved':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20">Resolved</span>;
            case 'rejected':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20">Rejected</span>;
            default:
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-500/10 text-gray-500 border border-gray-500/20">{status}</span>;
        }
    };

    // Filter Logic
    const filteredReports = reports.filter(report => {
        const matchesSearch = 
            report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            report.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (!report.is_anonymous && report.profiles?.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
        
        
        const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
        const matchesType = typeFilter === 'all' || report.type === typeFilter;
        const matchesCategory = categoryFilter === 'all' || report.category === categoryFilter;

        return matchesSearch && matchesStatus && matchesType && matchesCategory;
    });

    if (!profile || !['ceo', 'super_admin', 'owner', 'hr'].includes(profile.role)) {
         return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <div className="p-4 rounded-full bg-rose-500/10">
                    <Shield className="w-12 h-12 text-rose-500" />
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Access Denied</h2>
                <Link href="/dashboard" className="px-4 py-2 bg-[#e8c559] text-[#171611] rounded-lg font-bold">
                    Back to Dashboard
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20 fade-in">
             {/* Header */}
             <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-end justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 shadow-lg border border-red-500/20">
                            <MessageSquare className="w-6 h-6 text-red-500" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1 text-sm text-[var(--text-secondary)]">
                                <Link href="/dashboard" className="hover:text-[var(--text-primary)] transition-colors">Dashboard</Link>
                                <ChevronRight className="h-4 w-4" />
                                <Link href="/dashboard/command-center" className="hover:text-[var(--text-primary)] transition-colors">Command Center</Link>
                                <ChevronRight className="h-4 w-4" />
                                <span className="text-[var(--text-primary)]">Report Management</span>
                            </div>
                            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Report Management</h1>
                            <p className="text-sm text-[var(--text-secondary)]">Manage, track, and respond to user reports.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                    <input 
                        type="text" 
                        placeholder="Search reports..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl pl-10 pr-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[#e8c559] transition-colors"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Filter className="w-4 h-4 text-[var(--text-secondary)] mr-2" />
                    
                    {/* Status Filter */}
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[#e8c559] transition-colors appearance-none cursor-pointer text-sm font-medium"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="resolved">Resolved</option>
                        <option value="rejected">Rejected</option>
                    </select>

                    {/* Type Filter */}
                    <select 
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[#e8c559] transition-colors appearance-none cursor-pointer text-sm font-medium"
                    >
                        <option value="all">All Types</option>
                        <option value="system">System Report</option>
                        <option value="operational">Operational / Whistleblowing</option>
                    </select>

                    {/* Category Filter */}
                    <select 
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[#e8c559] transition-colors appearance-none cursor-pointer text-sm font-medium"
                    >
                        <option value="all">All Categories</option>
                        {/* System Categories */}
                        <option value="Bug / Error Aplikasi">Bug / Error Aplikasi</option>
                        <option value="Kendala Akses / Login">Kendala Akses / Login</option>
                        <option value="Saran Fitur">Saran Fitur</option>
                        <option value="Kritik Sistem">Kritik Sistem</option>
                        {/* Operational Categories */}
                        <option value="Whistleblower System">Whistleblower System</option>
                        <option value="Saran Masukan Kantor">Saran Masukan Kantor</option>
                        <option value="Laporan Pungutan Liar">Laporan Pungutan Liar</option>
                        <option value="Laporan Gratifikasi">Laporan Gratifikasi</option>
                        <option value="Laporan Korupsi">Laporan Korupsi</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="glass-panel overflow-hidden rounded-2xl border border-[var(--glass-border)]">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[var(--glass-border)] bg-[var(--glass-bg)]/50">
                                <th className="px-6 py-4 text-left text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Type</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Reporter</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Category</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--glass-border)]">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center">
                                        <div className="flex justify-center">
                                            <div className="w-6 h-6 border-2 border-[#e8c559] border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredReports.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-[var(--text-secondary)] italic">
                                        No reports found.
                                    </td>
                                </tr>
                            ) : (
                                filteredReports.map((report) => (
                                    <tr key={report.id} className="hover:bg-[var(--glass-bg)]/50 transition-colors group">
                                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)] whitespace-nowrap">
                                            {new Date(report.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className={`flex items-center gap-2 px-2 py-1 rounded-lg w-fit text-xs font-bold ${report.type === 'system' ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                                {report.type === 'system' ? <Shield className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                                <span className="capitalize">{report.type}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-[var(--text-primary)]">
                                            {report.is_anonymous ? (
                                                <div className="flex items-center gap-2 text-gray-500 italic">
                                                    <User className="w-4 h-4" />
                                                    Anonymous
                                                </div>
                                            ) : (
                                                <div className="font-medium">
                                                    {report.profiles?.full_name || 'Unknown User'}
                                                    <div className="text-xs text-[var(--text-secondary)]">{report.profiles?.job_title}</div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-[var(--text-primary)]">
                                            {report.category}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(report.status)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => handleOpenDetail(report)}
                                                    className="p-2 rounded-lg bg-[var(--glass-border)] hover:bg-[#e8c559] hover:text-black text-[var(--text-secondary)] transition-all"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteReport(report.id)}
                                                    className="p-2 rounded-lg bg-[var(--glass-border)] hover:bg-red-500 hover:text-white text-[var(--text-secondary)] transition-all"
                                                    title="Delete Report"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedReport(null)}>
                    <div className="w-full max-w-2xl bg-white dark:bg-[#1c2120] rounded-2xl shadow-2xl border border-[var(--glass-border)] flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-[var(--glass-border)]">
                            <div>
                                <h2 className="text-lg font-bold text-[var(--text-primary)]">Report Details</h2>
                                <p className="text-xs text-[var(--text-secondary)]">ID: {selectedReport.id}</p>
                            </div>
                            <button onClick={() => setSelectedReport(null)} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                <X className="w-5 h-5 text-[var(--text-secondary)]" />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto space-y-6 flex-1">
                            {/* Header Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-[var(--glass-border)]">
                                    <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-bold mb-1">Reporter</p>
                                    {selectedReport.is_anonymous ? (
                                        <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-[var(--text-primary)]">
                                            <User className="w-4 h-4" /> Anonymous
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-[var(--text-primary)]">{selectedReport.profiles?.full_name}</p>
                                            <p className="text-xs text-gray-500 dark:text-[var(--text-secondary)]">{selectedReport.profiles?.job_title}</p>
                                            <p className="text-xs text-gray-500 dark:text-[var(--text-secondary)]">{selectedReport.profiles?.email}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-[var(--glass-border)]">
                                    <p className="text-xs text-gray-500 dark:text-[var(--text-secondary)] uppercase tracking-wider font-bold mb-1">Details</p>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Clock className="w-3 h-3 text-gray-500 dark:text-[var(--text-secondary)]" />
                                        <span className="text-sm font-medium text-gray-900 dark:text-[var(--text-primary)]">{new Date(selectedReport.created_at).toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mb-1">
                                        {selectedReport.type === 'system' ? <Shield className="w-3 h-3 text-blue-600 dark:text-blue-500" /> : <AlertCircle className="w-3 h-3 text-orange-600 dark:text-orange-500" />}
                                        <span className="text-sm capitalize text-gray-900 dark:text-[var(--text-primary)]">{selectedReport.type}</span>
                                    </div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-[var(--text-primary)]">{selectedReport.category}</p>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-[var(--glass-border)]">
                                <h4 className="text-sm font-bold text-gray-900 dark:text-[var(--text-primary)] mb-2">Report Description</h4>
                                <p className="text-sm text-gray-700 dark:text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                                    {selectedReport.description}
                                </p>
                            </div>

                            {/* Admin Action Section */}
                            <div className="pt-6 border-t border-[var(--glass-border)] space-y-4">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-[var(--text-primary)] flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-[#e8c559]" />
                                    Admin Action
                                </h3>
                                
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-[var(--text-primary)]">Update Status</label>
                                    <div className="flex gap-2">
                                        {['pending', 'reviewed', 'resolved', 'rejected'].map(status => (
                                            <button
                                                key={status}
                                                onClick={() => setNewStatus(status)}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-bold border capitalize transition-all ${
                                                    newStatus === status 
                                                    ? 'bg-[#e8c559] text-black border-[#e8c559]' 
                                                    : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-[var(--glass-border)] hover:bg-[var(--glass-border)]'
                                                }`}
                                            >
                                                {status}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-[var(--text-primary)]">Response / Feedback</label>
                                    <textarea
                                        value={adminResponse}
                                        onChange={(e) => setAdminResponse(e.target.value)}
                                        placeholder="Write a response to the user..."
                                        rows={4}
                                        className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[#e8c559] transition-colors placeholder:text-[var(--text-muted)] resize-none"
                                    />
                                    <p className="text-xs text-[var(--text-secondary)]">This response will be visible to the user.</p>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-5 border-t border-[var(--glass-border)] flex justify-between gap-3 bg-[var(--glass-bg)]/50 rounded-b-2xl">
                             <button
                                onClick={() => handleDeleteReport(selectedReport.id)}
                                disabled={isDeleting}
                                className="px-4 py-2 rounded-xl text-sm font-bold text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete
                            </button>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSelectedReport(null)}
                                    className="px-4 py-2 rounded-xl text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--glass-border)] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdateReport}
                                    disabled={isUpdating}
                                    className="px-6 py-2 rounded-xl bg-[#e8c559] text-black font-bold hover:bg-[#d6b54e] shadow-lg shadow-[#e8c559]/20 flex items-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isUpdating ? 'Saving...' : 'Save & Update'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
