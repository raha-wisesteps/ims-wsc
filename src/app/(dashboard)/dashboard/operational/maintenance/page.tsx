"use client";

import { useState } from "react";
import {
    Calendar,
    CheckCircle2,
    Clock,
    Plus,
    Search,
    Wrench,
    Filter
} from "lucide-react";

// Mock Data
interface MaintenanceRecord {
    id: string;
    activity: string;
    category: "Cleaning" | "Repair" | "Service" | "Inspection";
    date: string;
    performedBy: string; // Vendor or Staff Name
    status: "Completed" | "Scheduled" | "Pending";
    cost?: string;
    notes?: string;
}

const MOCK_RECORDS: MaintenanceRecord[] = [
    {
        id: "1",
        activity: "AC Maintenance (All Units)",
        category: "Service",
        date: "2026-01-10",
        performedBy: "Mitra Teknik AC",
        status: "Completed",
        cost: "Rp 1.500.000",
        notes: "Regular 3-month service. Replaced freon for unit in Meeting Room A."
    },
    {
        id: "2",
        activity: "Deep Cleaning Carpet",
        category: "Cleaning",
        date: "2026-01-05",
        performedBy: "CleanPro Services",
        status: "Completed",
        cost: "Rp 2.000.000",
        notes: "Weekend deep cleaning schedule."
    },
    {
        id: "3",
        activity: "Internet Network Inspection",
        category: "Inspection",
        date: "2026-01-15",
        performedBy: "IT Internal (Budi)",
        status: "Scheduled",
        notes: "Routine checkup for cabling and router firmware."
    },
    {
        id: "4",
        activity: "Pest Control",
        category: "Cleaning",
        date: "2026-01-20",
        performedBy: "Terminix",
        status: "Scheduled",
        cost: "Rp 800.000",
        notes: "Monthly regular visit."
    }
];

export default function MaintenancePage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [records, setRecords] = useState(MOCK_RECORDS);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Completed": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
            case "Scheduled": return "text-blue-400 bg-blue-400/10 border-blue-400/20";
            case "Pending": return "text-amber-400 bg-amber-400/10 border-amber-400/20";
            default: return "text-gray-400 bg-gray-400/10";
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case "Cleaning": return "✨";
            case "Repair": return "🔧";
            case "Service": return "⚙️";
            case "Inspection": return "🔍";
            default: return "📋";
        }
    };

    const filteredRecords = records.filter(record =>
        record.activity.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.performedBy.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <header className="flex flex-col gap-4 md:flex-row md:items-end justify-between">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-white flex items-center gap-3">
                        <Wrench className="w-8 h-8 text-[#e8c559]" />
                        Office Maintenance
                    </h1>
                    <p className="text-lg text-gray-400">Log book pemeliharaan & kebersihan kantor.</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-[#e8c559] text-black font-bold rounded-xl hover:bg-[#d4b34d] transition-colors">
                    <Plus className="w-5 h-5" />
                    Catat Maintenance
                </button>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel p-5 rounded-xl border-l-4 border-emerald-500">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Last Maintenance</p>
                    <p className="text-lg font-bold text-white">10 Jan 2026</p>
                    <p className="text-sm text-emerald-400">AC Service</p>
                </div>
                <div className="glass-panel p-5 rounded-xl border-l-4 border-blue-500">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Next Scheduled</p>
                    <p className="text-lg font-bold text-white">15 Jan 2026</p>
                    <p className="text-sm text-blue-400">Network Inspection</p>
                </div>
                <div className="glass-panel p-5 rounded-xl border-l-4 border-orange-500">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Expenses (Jan)</p>
                    <p className="text-lg font-bold text-white">Rp 4.300.000</p>
                    <p className="text-sm text-orange-400">Est. Monthly Budget</p>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Cari aktivitas maintenance..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#e8c559]"
                    />
                </div>
                <button className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    <span className="hidden md:inline">Filter</span>
                </button>
            </div>

            {/* Records List */}
            <div className="space-y-4">
                {filteredRecords.map((record) => (
                    <div key={record.id} className="glass-panel p-6 rounded-xl border border-white/5 hover:border-[#e8c559]/30 transition-all group">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-2xl border border-white/10">
                                    {getCategoryIcon(record.category)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="font-bold text-lg text-white group-hover:text-[#e8c559] transition-colors">
                                            {record.activity}
                                        </h3>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusColor(record.status)}`}>
                                            {record.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-400 flex items-center gap-2">
                                        <Calendar className="w-3 h-3" /> {record.date}
                                        <span className="w-1 h-1 rounded-full bg-gray-600" />
                                        <Wrench className="w-3 h-3" /> By: {record.performedBy}
                                    </p>
                                    {record.notes && (
                                        <p className="text-sm text-gray-500 mt-2 bg-white/5 p-2 rounded-lg italic">
                                            "{record.notes}"
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-1 min-w-[120px]">
                                {record.cost && (
                                    <p className="font-bold text-white text-lg">{record.cost}</p>
                                )}
                                <p className="text-xs text-gray-500 uppercase tracking-wider">{record.category}</p>
                            </div>
                        </div>
                    </div>
                ))}

                {filteredRecords.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Tidak ada data maintenance ditemukan.</p>
                    </div>
                )}
            </div>
        </div >
    );
}
