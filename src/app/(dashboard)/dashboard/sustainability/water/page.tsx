"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Droplets, Camera, CheckCircle2, History } from "lucide-react";

export default function WaterReportPage() {
    const [stats] = useState({
        lastReading: 1250, // m3
        lastReadingDate: "2026-01-05",
        currentUsage: 45, // m3 this month
    });

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split("T")[0],
        meterReading: "",
        notes: ""
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Mock history
    const history = [
        { date: "2026-01-05", reading: 1250, usage: 12, reporter: "Andi (GA)" },
        { date: "2025-12-29", reading: 1238, usage: 15, reporter: "Budi (Security)" },
        { date: "2025-12-22", reading: 1223, usage: 10, reporter: "Andi (GA)" },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Mock API call
        setTimeout(() => {
            setIsSubmitting(false);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
            setFormData({ ...formData, meterReading: "" });
        }, 1500);
    };

    const calculatedUsage = formData.meterReading
        ? Math.max(0, parseInt(formData.meterReading) - stats.lastReading)
        : 0;

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <header>
                <Link
                    href="/dashboard/sustainability"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-2 transition-colors group"
                >
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Dashboard
                </Link>
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-500/20 text-blue-500">
                        <Droplets className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-white">Water Report</h1>
                        <p className="text-gray-400">Log konsumsi air PDAM (Meteran Air)</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Input Form */}
                <div className="lg:col-span-2">
                    <div className="glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden">
                        {showSuccess && (
                            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-10 animate-in fade-in">
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle2 className="w-8 h-8 text-white" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-1">Data Saved!</h3>
                                    <p className="text-gray-400">Laporan air berhasil disimpan.</p>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Last Reading Info */}
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Last Meter Reading</p>
                                    <p className="text-2xl font-black text-white">{stats.lastReading.toLocaleString()} <span className="text-sm font-normal text-gray-500">m³</span></p>
                                    <p className="text-xs text-gray-500 mt-1">Recorded on {stats.lastReadingDate}</p>
                                </div>

                                {/* Current Usage Estimation */}
                                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                    <p className="text-xs text-blue-500/80 uppercase tracking-wider mb-1">Estimated Usage</p>
                                    <p className="text-2xl font-black text-blue-500">
                                        {calculatedUsage > 0 ? `+${calculatedUsage.toLocaleString()}` : "-"} <span className="text-sm font-normal text-blue-500/70">m³</span>
                                    </p>
                                    <p className="text-xs text-blue-500/60 mt-1">Since last reading</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-300 mb-2">Tanggal Pencatatan</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full h-12 rounded-xl bg-black/40 border border-white/10 text-white px-4 focus:border-blue-500 outline-none transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-300 mb-2">Angka Meteran Saat Ini (m³)</label>
                                    <input
                                        type="number"
                                        required
                                        min={stats.lastReading}
                                        placeholder={`Masukan angka diatas ${stats.lastReading}`}
                                        value={formData.meterReading}
                                        onChange={(e) => setFormData({ ...formData, meterReading: e.target.value })}
                                        className="w-full h-12 rounded-xl bg-black/40 border border-white/10 text-white px-4 focus:border-blue-500 outline-none transition-colors font-mono text-lg"
                                    />
                                    <p className="text-xs text-gray-500 mt-2">Masukan angka total yang tertera di meteran air.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-300 mb-2">Bukti Foto (Opsional)</label>
                                    <div className="h-32 rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-gray-500 hover:border-blue-500/50 hover:bg-white/5 transition-all cursor-pointer">
                                        <Camera className="w-8 h-8 mb-2" />
                                        <span className="text-sm">Click to upload photo</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-300 mb-2">Catatan Tambahan</label>
                                    <textarea
                                        rows={2}
                                        placeholder="Ada kebocoran atau masalah?"
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        className="w-full rounded-xl bg-black/40 border border-white/10 text-white p-4 focus:border-blue-500 outline-none transition-colors resize-none"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting || !formData.meterReading}
                                className="w-full py-4 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? "Saving..." : "Simpan Laporan"}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Sidebar: History */}
                <div className="space-y-6">
                    <div className="glass-panel p-6 rounded-2xl border border-white/10">
                        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                            <History className="w-5 h-5 text-gray-400" /> Recent History
                        </h3>
                        <div className="space-y-4">
                            {history.map((item, idx) => (
                                <div key={idx} className="relative pl-4 border-l-2 border-white/10 py-1">
                                    <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-blue-500" />
                                    <p className="text-sm font-bold text-white">{item.reading.toLocaleString()} m³</p>
                                    <p className="text-xs text-blue-500 font-medium mb-1">+{item.usage} usage</p>
                                    <p className="text-xs text-gray-500">{new Date(item.date).toLocaleDateString()} • {item.reporter}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
