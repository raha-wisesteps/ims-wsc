"use client";

import { useState } from "react";
import Link from "next/link";

// Transport modes with emission factors (kg CO2 per km)
const TRANSPORT_MODES = [
    { id: "plane", label: "Pesawat", icon: "✈️", emission: 0.255, color: "bg-sky-500" },
    { id: "car", label: "Mobil", icon: "🚗", emission: 0.171, color: "bg-amber-500" },
    { id: "train", label: "Kereta", icon: "🚂", emission: 0.041, color: "bg-emerald-500" },
    { id: "bus", label: "Bus", icon: "🚌", emission: 0.089, color: "bg-purple-500" },
    { id: "motorcycle", label: "Motor", icon: "🏍️", emission: 0.103, color: "bg-rose-500" },
    { id: "ferry", label: "Kapal", icon: "⛴️", emission: 0.115, color: "bg-cyan-500" },
];

interface TravelEntry {
    id: string;
    date: string;
    destination: string;
    origin: string;
    distance: number;
    transport: string;
    purpose: string;
    emission: number;
    staff: string;
}

// Mock travel data
const mockTravelEntries: TravelEntry[] = [
    {
        id: "1",
        date: "2024-12-20",
        destination: "Surabaya",
        origin: "Jakarta",
        distance: 780,
        transport: "plane",
        purpose: "Client Meeting - PT Maju Jaya",
        emission: 198.9,
        staff: "Andi Pratama",
    },
    {
        id: "2",
        date: "2024-12-18",
        destination: "Bogor",
        origin: "Jakarta",
        distance: 60,
        transport: "car",
        purpose: "Site Visit - Factory Audit",
        emission: 10.26,
        staff: "Budi Santoso",
    },
    {
        id: "3",
        date: "2024-12-15",
        destination: "Bandung",
        origin: "Jakarta",
        distance: 150,
        transport: "train",
        purpose: "Training Workshop",
        emission: 6.15,
        staff: "Citra Lestari",
    },
    {
        id: "4",
        date: "2024-12-12",
        destination: "Semarang",
        origin: "Jakarta",
        distance: 450,
        transport: "plane",
        purpose: "Annual Client Review",
        emission: 114.75,
        staff: "Andi Pratama",
    },
    {
        id: "5",
        date: "2024-12-10",
        destination: "Yogyakarta",
        origin: "Jakarta",
        distance: 520,
        transport: "train",
        purpose: "Team Building Event",
        emission: 21.32,
        staff: "Eva Wijaya",
    },
];

export default function TravelReportPage() {
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState("dec-2024");
    const [newEntry, setNewEntry] = useState({
        date: "",
        origin: "",
        destination: "",
        distance: "",
        transport: "car",
        purpose: "",
    });

    // Calculate stats
    const totalDistance = mockTravelEntries.reduce((sum, e) => sum + e.distance, 0);
    const totalEmission = mockTravelEntries.reduce((sum, e) => sum + e.emission, 0);
    const avgEmissionPerTrip = totalEmission / mockTravelEntries.length;

    const getTransportConfig = (id: string) => TRANSPORT_MODES.find(t => t.id === id);

    const handleAddEntry = () => {
        // In real app, this would save to database
        setShowAddModal(false);
        setNewEntry({
            date: "",
            origin: "",
            destination: "",
            distance: "",
            transport: "car",
            purpose: "",
        });
    };

    return (
        <div className="flex flex-col h-full overflow-auto">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-1">
                        <Link href="/dashboard/sustainability" className="hover:text-[#22c55e]">Sustainability</Link>
                        <span>/</span>
                        <span className="text-[var(--text-primary)]">Travel Report</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">✈️</span>
                        <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Travel Report</h2>
                    </div>
                    <p className="text-[var(--text-secondary)] text-sm mt-1">Log perjalanan dinas dan hitung jejak karbon.</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="h-10 px-4 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-sm text-[var(--text-primary)]"
                    >
                        <option value="dec-2024">December 2024</option>
                        <option value="nov-2024">November 2024</option>
                        <option value="oct-2024">October 2024</option>
                    </select>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="h-10 px-5 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] text-white text-sm font-bold transition-colors flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                        </svg>
                        Log Perjalanan
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="glass-panel p-5 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">🛣️</span>
                        <span className="text-xs text-[var(--text-muted)]">Total Jarak</span>
                    </div>
                    <p className="text-3xl font-bold text-[var(--text-primary)]">{totalDistance.toLocaleString()} <span className="text-lg font-normal">km</span></p>
                </div>
                <div className="glass-panel p-5 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">💨</span>
                        <span className="text-xs text-[var(--text-muted)]">Total Emisi CO₂</span>
                    </div>
                    <p className="text-3xl font-bold text-[var(--text-primary)]">{totalEmission.toFixed(1)} <span className="text-lg font-normal">kg</span></p>
                </div>
                <div className="glass-panel p-5 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">📊</span>
                        <span className="text-xs text-[var(--text-muted)]">Rata-rata per Trip</span>
                    </div>
                    <p className="text-3xl font-bold text-[var(--text-primary)]">{avgEmissionPerTrip.toFixed(1)} <span className="text-lg font-normal">kg CO₂</span></p>
                </div>
            </div>

            {/* Transport Mode Legend */}
            <div className="glass-panel p-4 rounded-xl mb-6">
                <p className="text-xs font-medium text-[var(--text-muted)] mb-3">EMISI KARBON PER MODA TRANSPORT (kg CO₂/km)</p>
                <div className="flex flex-wrap gap-4">
                    {TRANSPORT_MODES.map((mode) => (
                        <div key={mode.id} className="flex items-center gap-2">
                            <span className="text-lg">{mode.icon}</span>
                            <span className="text-sm text-[var(--text-secondary)]">{mode.label}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${mode.color}/10 text-[var(--text-muted)]`}>
                                {mode.emission}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Travel List */}
            <div className="glass-panel rounded-xl overflow-hidden flex-1">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[var(--text-muted)] border-b border-[var(--glass-border)] bg-[var(--glass-bg)]">
                                <th className="p-4 font-medium">Tanggal</th>
                                <th className="p-4 font-medium">Staff</th>
                                <th className="p-4 font-medium">Rute</th>
                                <th className="p-4 font-medium">Transport</th>
                                <th className="p-4 font-medium">Jarak</th>
                                <th className="p-4 font-medium">Emisi CO₂</th>
                                <th className="p-4 font-medium">Tujuan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--glass-border)]">
                            {mockTravelEntries.map((entry) => {
                                const transport = getTransportConfig(entry.transport);
                                return (
                                    <tr key={entry.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                        <td className="p-4 text-[var(--text-primary)]">
                                            {new Date(entry.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-[#22c55e]/20 flex items-center justify-center text-[#22c55e] text-xs font-bold">
                                                    {entry.staff.split(" ").map(n => n[0]).join("")}
                                                </div>
                                                <span className="text-[var(--text-primary)]">{entry.staff}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-[var(--text-secondary)]">
                                            {entry.origin} → {entry.destination}
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${transport?.color}/10`}>
                                                {transport?.icon} {transport?.label}
                                            </span>
                                        </td>
                                        <td className="p-4 text-[var(--text-primary)] font-medium">{entry.distance} km</td>
                                        <td className="p-4">
                                            <span className={`font-medium ${entry.emission > 100 ? "text-rose-500" : entry.emission > 50 ? "text-amber-500" : "text-emerald-500"}`}>
                                                {entry.emission.toFixed(1)} kg
                                            </span>
                                        </td>
                                        <td className="p-4 text-[var(--text-muted)] max-w-[200px] truncate">{entry.purpose}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Travel Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-panel w-full max-w-lg rounded-2xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">Log Perjalanan Dinas</h2>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-muted)]"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Tanggal</label>
                                <input
                                    type="date"
                                    value={newEntry.date}
                                    onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                                    className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Kota Asal</label>
                                    <input
                                        type="text"
                                        value={newEntry.origin}
                                        onChange={(e) => setNewEntry({ ...newEntry, origin: e.target.value })}
                                        className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)]"
                                        placeholder="Jakarta"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Kota Tujuan</label>
                                    <input
                                        type="text"
                                        value={newEntry.destination}
                                        onChange={(e) => setNewEntry({ ...newEntry, destination: e.target.value })}
                                        className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)]"
                                        placeholder="Surabaya"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Jarak (km)</label>
                                    <input
                                        type="number"
                                        value={newEntry.distance}
                                        onChange={(e) => setNewEntry({ ...newEntry, distance: e.target.value })}
                                        className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)]"
                                        placeholder="780"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Moda Transport</label>
                                    <select
                                        value={newEntry.transport}
                                        onChange={(e) => setNewEntry({ ...newEntry, transport: e.target.value })}
                                        className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)]"
                                    >
                                        {TRANSPORT_MODES.map((mode) => (
                                            <option key={mode.id} value={mode.id}>{mode.icon} {mode.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Tujuan Perjalanan</label>
                                <input
                                    type="text"
                                    value={newEntry.purpose}
                                    onChange={(e) => setNewEntry({ ...newEntry, purpose: e.target.value })}
                                    className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)]"
                                    placeholder="Client Meeting - PT ..."
                                />
                            </div>

                            {/* Emission Preview */}
                            {newEntry.distance && (
                                <div className="p-4 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20">
                                    <p className="text-sm text-[var(--text-secondary)]">Perkiraan Emisi CO₂:</p>
                                    <p className="text-2xl font-bold text-[#22c55e]">
                                        {(parseFloat(newEntry.distance) * (TRANSPORT_MODES.find(m => m.id === newEntry.transport)?.emission || 0)).toFixed(2)} kg
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-4 py-3 rounded-lg border border-[var(--glass-border)] text-[var(--text-secondary)] font-medium"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleAddEntry}
                                    className="flex-1 px-4 py-3 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold"
                                >
                                    Simpan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
