"use client";

import { useState } from "react";
import Link from "next/link";

// Asset categories with code prefixes
const ASSET_CATEGORIES = {
    F: { label: "Furniture", icon: "🪑", color: "bg-amber-500" },
    E: { label: "Electronics", icon: "💻", color: "bg-blue-500" },
    B: { label: "Books & Stationery", icon: "📚", color: "bg-emerald-500" },
    V: { label: "Vehicles", icon: "🚗", color: "bg-purple-500" },
    O: { label: "Office Supplies", icon: "📎", color: "bg-rose-500" },
};

type CategoryCode = keyof typeof ASSET_CATEGORIES;

// Asset conditions
const ASSET_CONDITIONS = {
    excellent: { label: "Excellent", color: "bg-emerald-500", textColor: "text-emerald-500" },
    good: { label: "Good", color: "bg-sky-500", textColor: "text-sky-500" },
    fair: { label: "Fair", color: "bg-amber-500", textColor: "text-amber-500" },
    poor: { label: "Poor", color: "bg-orange-500", textColor: "text-orange-500" },
    damaged: { label: "Damaged", color: "bg-rose-500", textColor: "text-rose-500" },
};

type ConditionType = keyof typeof ASSET_CONDITIONS;

interface Asset {
    id: string;
    code: string;
    name: string;
    category: CategoryCode;
    condition: ConditionType;
    location: string;
    acquisitionDate: string;
    purchasePrice?: number;
    lastMaintenanceDate?: string;
    assignedTo?: string;
    notes?: string;
}

// Mock asset data based on the image provided
const mockAssets: Asset[] = [
    // Furniture
    { id: "1", code: "F-001-23", name: "Meja Kerja", category: "F", condition: "good", location: "Ruang Kerja A", acquisitionDate: "2023-01-15", purchasePrice: 1500000 },
    { id: "2", code: "F-002-23", name: "Meja Kerja Kayu", category: "F", condition: "excellent", location: "Ruang Kerja B", acquisitionDate: "2023-02-10", purchasePrice: 2500000 },
    { id: "3", code: "F-003-23", name: "Meja Rapat", category: "F", condition: "good", location: "Ruang Meeting", acquisitionDate: "2023-03-05", purchasePrice: 5000000 },
    { id: "4", code: "F-004-23", name: "Kursi Putar", category: "F", condition: "fair", location: "Ruang Kerja A", acquisitionDate: "2023-01-15", purchasePrice: 800000 },
    { id: "5", code: "F-005-23", name: "Rak Kayu", category: "F", condition: "good", location: "Gudang", acquisitionDate: "2023-04-20", purchasePrice: 1200000 },
    { id: "6", code: "F-006-23", name: "Rak Piring", category: "F", condition: "excellent", location: "Pantry", acquisitionDate: "2023-05-12", purchasePrice: 600000 },
    { id: "7", code: "F-007-23", name: "Rak Besi", category: "F", condition: "good", location: "Gudang", acquisitionDate: "2023-06-01", purchasePrice: 1800000 },
    { id: "8", code: "F-008-23", name: "Box File", category: "F", condition: "excellent", location: "Ruang Arsip", acquisitionDate: "2023-07-15", purchasePrice: 150000 },

    // Electronics
    { id: "9", code: "E-001-23", name: "Printer", category: "E", condition: "good", location: "Ruang Kerja A", acquisitionDate: "2023-01-20", purchasePrice: 3500000, assignedTo: "IT Dept" },
    { id: "10", code: "E-002-23", name: "Laptop", category: "E", condition: "excellent", location: "Ruang Kerja B", acquisitionDate: "2023-02-15", purchasePrice: 15000000, assignedTo: "Andi Pratama" },
    { id: "11", code: "E-003-23", name: "AC", category: "E", condition: "good", location: "Ruang Meeting", acquisitionDate: "2023-03-10", purchasePrice: 8000000 },
    { id: "12", code: "E-004-23", name: "LED TV", category: "E", condition: "excellent", location: "Ruang Meeting", acquisitionDate: "2023-04-05", purchasePrice: 12000000 },
    { id: "13", code: "E-005-23", name: "Komputer", category: "E", condition: "fair", location: "Ruang Kerja A", acquisitionDate: "2023-05-20", purchasePrice: 10000000, assignedTo: "Budi Santoso" },
    { id: "14", code: "E-006-23", name: "Dispenser", category: "E", condition: "good", location: "Pantry", acquisitionDate: "2023-06-15", purchasePrice: 2500000 },
    { id: "15", code: "E-007-23", name: "Microphone", category: "E", condition: "excellent", location: "Ruang Meeting", acquisitionDate: "2023-07-01", purchasePrice: 1500000 },
    { id: "16", code: "E-008-23", name: "Wifi Router", category: "E", condition: "good", location: "Server Room", acquisitionDate: "2023-08-10", purchasePrice: 2000000 },

    // Books
    { id: "17", code: "B-001-23", name: "Buku Panduan HR", category: "B", condition: "excellent", location: "Ruang Arsip", acquisitionDate: "2023-01-05", purchasePrice: 250000 },
    { id: "18", code: "B-002-23", name: "Buku Akuntansi", category: "B", condition: "good", location: "Ruang Arsip", acquisitionDate: "2023-02-20", purchasePrice: 350000 },

    // Office Supplies
    { id: "19", code: "O-001-24", name: "Proyektor", category: "O", condition: "excellent", location: "Ruang Meeting", acquisitionDate: "2024-01-10", purchasePrice: 7500000 },
    { id: "20", code: "O-002-24", name: "Whiteboard", category: "O", condition: "good", location: "Ruang Meeting", acquisitionDate: "2024-02-05", purchasePrice: 1200000 },
];

export default function AssetManagementPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<CategoryCode | "all">("all");
    const [conditionFilter, setConditionFilter] = useState<ConditionType | "all">("all");
    const [yearFilter, setYearFilter] = useState<string>("all");
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

    // Get unique years from assets
    const years = [...new Set(mockAssets.map(a => a.code.split("-")[2]))].sort().reverse();

    // Filter assets
    const filteredAssets = mockAssets.filter(asset => {
        const matchesSearch =
            asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.location.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === "all" || asset.category === categoryFilter;
        const matchesCondition = conditionFilter === "all" || asset.condition === conditionFilter;
        const matchesYear = yearFilter === "all" || asset.code.split("-")[2] === yearFilter;
        return matchesSearch && matchesCategory && matchesCondition && matchesYear;
    });

    // Calculate stats
    const totalAssets = mockAssets.length;
    const totalValue = mockAssets.reduce((sum, a) => sum + (a.purchasePrice || 0), 0);
    const categoryStats = Object.entries(ASSET_CATEGORIES).map(([code, config]) => ({
        code,
        ...config,
        count: mockAssets.filter(a => a.category === code).length,
    }));

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
    };

    return (
        <div className="flex flex-col h-full overflow-auto">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-1">
                        <Link href="/dashboard" className="hover:text-[#e8c559]">Dashboard</Link>
                        <span>/</span>
                        <Link href="/dashboard/operational/asset-request" className="hover:text-[#e8c559]">Operational</Link>
                        <span>/</span>
                        <span className="text-[var(--text-primary)]">Asset Management</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">📦</span>
                        <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Asset Management</h2>
                    </div>
                    <p className="text-[var(--text-secondary)] text-sm mt-1">Kelola dan pantau semua aset kantor.</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="h-10 px-5 rounded-lg bg-[#e8c559] hover:bg-[#dcb33e] text-[#171611] text-sm font-bold transition-colors flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                    </svg>
                    Tambah Aset
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                <div className="glass-panel p-4 rounded-xl col-span-2">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">📊</span>
                        <span className="text-xs text-[var(--text-muted)]">Total Aset</span>
                    </div>
                    <p className="text-3xl font-bold text-[#e8c559]">{totalAssets}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">Nilai: {formatCurrency(totalValue)}</p>
                </div>
                {categoryStats.map((cat) => (
                    <div key={cat.code} className="glass-panel p-4 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">{cat.icon}</span>
                            <span className="text-xs text-[var(--text-muted)] truncate">{cat.label}</span>
                        </div>
                        <p className="text-2xl font-bold text-[var(--text-primary)]">{cat.count}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="glass-panel p-4 rounded-xl mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1">
                        <div className="relative">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Cari kode, nama, atau lokasi..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                            />
                        </div>
                    </div>

                    {/* Category Filter */}
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value as CategoryCode | "all")}
                        className="px-4 py-2.5 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)]"
                    >
                        <option value="all">Semua Kategori</option>
                        {Object.entries(ASSET_CATEGORIES).map(([code, config]) => (
                            <option key={code} value={code}>{config.icon} {config.label}</option>
                        ))}
                    </select>

                    {/* Condition Filter */}
                    <select
                        value={conditionFilter}
                        onChange={(e) => setConditionFilter(e.target.value as ConditionType | "all")}
                        className="px-4 py-2.5 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)]"
                    >
                        <option value="all">Semua Kondisi</option>
                        {Object.entries(ASSET_CONDITIONS).map(([key, config]) => (
                            <option key={key} value={key}>{config.label}</option>
                        ))}
                    </select>

                    {/* Year Filter */}
                    <select
                        value={yearFilter}
                        onChange={(e) => setYearFilter(e.target.value)}
                        className="px-4 py-2.5 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)]"
                    >
                        <option value="all">Semua Tahun</option>
                        {years.map(year => (
                            <option key={year} value={year}>20{year}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Asset Table */}
            <div className="glass-panel rounded-xl overflow-hidden flex-1">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-[var(--glass-border)] text-xs text-[var(--text-muted)] uppercase tracking-wider">
                                <th className="p-4 font-semibold">Kode</th>
                                <th className="p-4 font-semibold">Nama Aset</th>
                                <th className="p-4 font-semibold">Kategori</th>
                                <th className="p-4 font-semibold">Kondisi</th>
                                <th className="p-4 font-semibold">Lokasi</th>
                                <th className="p-4 font-semibold">Tgl Akuisisi</th>
                                <th className="p-4 font-semibold">Nilai</th>
                                <th className="p-4 font-semibold">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--glass-border)]">
                            {filteredAssets.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-[var(--text-muted)]">
                                        <span className="text-4xl block mb-2">📭</span>
                                        Tidak ada aset yang ditemukan
                                    </td>
                                </tr>
                            ) : (
                                filteredAssets.map((asset) => {
                                    const categoryConfig = ASSET_CATEGORIES[asset.category];
                                    const conditionConfig = ASSET_CONDITIONS[asset.condition];
                                    return (
                                        <tr key={asset.id} className="hover:bg-[var(--glass-bg)] transition-colors">
                                            <td className="p-4">
                                                <span className="font-mono font-bold text-[#e8c559]">{asset.code}</span>
                                            </td>
                                            <td className="p-4">
                                                <p className="font-medium text-[var(--text-primary)]">{asset.name}</p>
                                                {asset.assignedTo && (
                                                    <p className="text-xs text-[var(--text-muted)]">→ {asset.assignedTo}</p>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${categoryConfig.color} text-white`}>
                                                    {categoryConfig.icon} {categoryConfig.label}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${conditionConfig.color}/20 ${conditionConfig.textColor}`}>
                                                    {conditionConfig.label}
                                                </span>
                                            </td>
                                            <td className="p-4 text-[var(--text-secondary)] text-sm">
                                                {asset.location}
                                            </td>
                                            <td className="p-4 text-[var(--text-secondary)] text-sm">
                                                {new Date(asset.acquisitionDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                                            </td>
                                            <td className="p-4 text-[var(--text-secondary)] text-sm">
                                                {asset.purchasePrice ? formatCurrency(asset.purchasePrice) : "-"}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setSelectedAsset(asset)}
                                                        className="p-2 rounded-lg hover:bg-[var(--glass-border)] text-[var(--text-muted)] hover:text-[#e8c559] transition-colors"
                                                        title="Detail"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        className="p-2 rounded-lg hover:bg-[var(--glass-border)] text-[var(--text-muted)] hover:text-sky-500 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Results count */}
            <div className="mt-4 text-sm text-[var(--text-muted)]">
                Menampilkan {filteredAssets.length} dari {totalAssets} aset
            </div>

            {/* Asset Detail Modal */}
            {selectedAsset && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-panel w-full max-w-lg rounded-2xl p-6">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${ASSET_CATEGORIES[selectedAsset.category].color} text-white mb-2`}>
                                    {ASSET_CATEGORIES[selectedAsset.category].icon} {ASSET_CATEGORIES[selectedAsset.category].label}
                                </span>
                                <h2 className="text-xl font-bold text-[var(--text-primary)]">{selectedAsset.name}</h2>
                                <p className="text-[#e8c559] font-mono font-bold">{selectedAsset.code}</p>
                            </div>
                            <button
                                onClick={() => setSelectedAsset(null)}
                                className="p-2 rounded-lg hover:bg-[var(--glass-border)] text-[var(--text-muted)]"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 rounded-lg bg-[var(--glass-bg)]">
                                    <p className="text-xs text-[var(--text-muted)] mb-1">Kondisi</p>
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${ASSET_CONDITIONS[selectedAsset.condition].color}/20 ${ASSET_CONDITIONS[selectedAsset.condition].textColor}`}>
                                        {ASSET_CONDITIONS[selectedAsset.condition].label}
                                    </span>
                                </div>
                                <div className="p-3 rounded-lg bg-[var(--glass-bg)]">
                                    <p className="text-xs text-[var(--text-muted)] mb-1">Lokasi</p>
                                    <p className="text-sm font-medium text-[var(--text-primary)]">{selectedAsset.location}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 rounded-lg bg-[var(--glass-bg)]">
                                    <p className="text-xs text-[var(--text-muted)] mb-1">Tanggal Akuisisi</p>
                                    <p className="text-sm font-medium text-[var(--text-primary)]">
                                        {new Date(selectedAsset.acquisitionDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                                    </p>
                                </div>
                                <div className="p-3 rounded-lg bg-[var(--glass-bg)]">
                                    <p className="text-xs text-[var(--text-muted)] mb-1">Nilai Pembelian</p>
                                    <p className="text-sm font-medium text-[#e8c559]">
                                        {selectedAsset.purchasePrice ? formatCurrency(selectedAsset.purchasePrice) : "-"}
                                    </p>
                                </div>
                            </div>

                            {selectedAsset.assignedTo && (
                                <div className="p-3 rounded-lg bg-[var(--glass-bg)]">
                                    <p className="text-xs text-[var(--text-muted)] mb-1">Digunakan Oleh</p>
                                    <p className="text-sm font-medium text-[var(--text-primary)]">{selectedAsset.assignedTo}</p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setSelectedAsset(null)}
                                className="flex-1 px-4 py-3 rounded-lg border border-[var(--glass-border)] text-[var(--text-secondary)] font-medium"
                            >
                                Tutup
                            </button>
                            <button
                                className="flex-1 px-4 py-3 rounded-lg bg-[#e8c559] text-[#171611] font-bold"
                            >
                                Edit Aset
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Asset Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-panel w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">Tambah Aset Baru</h2>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-2 rounded-lg hover:bg-[var(--glass-border)] text-[var(--text-muted)]"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Nama Aset *</label>
                                <input
                                    type="text"
                                    placeholder="Contoh: Laptop Dell XPS 15"
                                    className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Kategori *</label>
                                    <select className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)]">
                                        {Object.entries(ASSET_CATEGORIES).map(([code, config]) => (
                                            <option key={code} value={code}>{config.icon} {config.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Kondisi *</label>
                                    <select className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)]">
                                        {Object.entries(ASSET_CONDITIONS).map(([key, config]) => (
                                            <option key={key} value={key}>{config.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Lokasi *</label>
                                <input
                                    type="text"
                                    placeholder="Contoh: Ruang Meeting A"
                                    className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Tanggal Akuisisi</label>
                                    <input
                                        type="date"
                                        className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Nilai Pembelian</label>
                                    <input
                                        type="number"
                                        placeholder="Rp"
                                        className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Digunakan Oleh (Opsional)</label>
                                <input
                                    type="text"
                                    placeholder="Nama karyawan atau departemen"
                                    className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Catatan (Opsional)</label>
                                <textarea
                                    rows={2}
                                    placeholder="Catatan tambahan..."
                                    className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--text-primary)] resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="flex-1 px-4 py-3 rounded-lg border border-[var(--glass-border)] text-[var(--text-secondary)] font-medium"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="flex-1 px-4 py-3 rounded-lg bg-[#e8c559] text-[#171611] font-bold"
                            >
                                Simpan Aset
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
