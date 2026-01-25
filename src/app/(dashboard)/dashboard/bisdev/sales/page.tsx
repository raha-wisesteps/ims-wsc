"use client";

import { useState } from "react";

interface SalesData {
    id: number;
    no: number;
    tahunBulan: string;
    perusahaan: string;
    namaProyek: string;
    tipe: string;
    nilaiKontrak: number;
    cashIn: number;
    totalAR: number;
    estimasiLunas: string;
    pic: string;
    posisi: string;
    kontak: string;
    status: string;
    wscSales: string;
}

const mockSalesData: SalesData[] = [
    {
        id: 1,
        no: 1,
        tahunBulan: "2024-01",
        perusahaan: "PT Maju Sejahtera",
        namaProyek: "Digital Transformation",
        tipe: "Project",
        nilaiKontrak: 250000000,
        cashIn: 100000000,
        totalAR: 150000000,
        estimasiLunas: "2024-03-31",
        pic: "Budi Santoso",
        posisi: "IT Manager",
        kontak: "08123456789",
        status: "Running",
        wscSales: "Rega"
    },
    {
        id: 2,
        no: 2,
        tahunBulan: "2024-02",
        perusahaan: "CV Berkah Abadi",
        namaProyek: "Website Redesign",
        tipe: "Project",
        nilaiKontrak: 75000000,
        cashIn: 75000000,
        totalAR: 0,
        estimasiLunas: "-",
        pic: "Siti Rahma",
        posisi: "Marketing Lead",
        kontak: "08198765432",
        status: "Paid",
        wscSales: "Rega"
    },
    {
        id: 3,
        no: 3,
        tahunBulan: "2024-02",
        perusahaan: "PT Global Tech",
        namaProyek: "IT Consultation",
        tipe: "Retainer",
        nilaiKontrak: 15000000,
        cashIn: 15000000,
        totalAR: 0,
        estimasiLunas: "-",
        pic: "John Doe",
        posisi: "CTO",
        kontak: "08122334455",
        status: "Paid",
        wscSales: "Rahadian"
    },
    {
        id: 4,
        no: 4,
        tahunBulan: "2024-03",
        perusahaan: "Koperasi Unit Desa",
        namaProyek: "System ERP",
        tipe: "Project",
        nilaiKontrak: 120000000,
        cashIn: 36000000,
        totalAR: 84000000,
        estimasiLunas: "2024-06-30",
        pic: "Haji Ahmad",
        posisi: "Ketua",
        kontak: "08567890123",
        status: "Partial",
        wscSales: "Rega"
    },
    {
        id: 5,
        no: 5,
        tahunBulan: "2024-03",
        perusahaan: "Startup Kita",
        namaProyek: "Mobile App Dev",
        tipe: "Project",
        nilaiKontrak: 180000000,
        cashIn: 54000000,
        totalAR: 126000000,
        estimasiLunas: "2024-05-15",
        pic: "Kevin",
        posisi: "Product Owner",
        kontak: "0811223344",
        status: "Running",
        wscSales: "Rahadian"
    }
];

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
};

export default function SalesPage() {
    const [data, setData] = useState<SalesData[]>(mockSalesData);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState<Partial<SalesData>>({});

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newEntry: SalesData = {
            id: Date.now(),
            no: data.length + 1,
            tahunBulan: formData.tahunBulan || "",
            perusahaan: formData.perusahaan || "",
            namaProyek: formData.namaProyek || "",
            tipe: formData.tipe || "",
            nilaiKontrak: Number(formData.nilaiKontrak) || 0,
            cashIn: Number(formData.cashIn) || 0,
            totalAR: Number(formData.totalAR) || 0,
            estimasiLunas: formData.estimasiLunas || "",
            pic: formData.pic || "",
            posisi: formData.posisi || "",
            kontak: formData.kontak || "",
            status: formData.status || "Pending",
            wscSales: formData.wscSales || "",
        };
        setData([...data, newEntry]);
        setShowForm(false);
        setFormData({});
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Sales Tracker</h1>
                    <p className="text-sm text-gray-400">Manage contracts and revenue tracking</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-[#e8c559] hover:bg-[#d4a843] text-[#171611] px-4 py-2 rounded-lg font-bold transition-colors shadow-lg"
                >
                    + Add New Sales
                </button>
            </div>

            {/* Table */}
            <div className="glass-panel rounded-xl overflow-hidden overflow-x-auto shadow-xl border border-white/5">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-black/40 text-xs text-gray-400 uppercase border-b border-white/10">
                            <th className="p-4 text-center w-12 font-semibold">No</th>
                            <th className="p-4 font-semibold">Tahun/Bulan</th>
                            <th className="p-4 font-semibold">Perusahaan</th>
                            <th className="p-4 font-semibold">Nama Proyek</th>
                            <th className="p-4 font-semibold">Tipe</th>
                            <th className="p-4 text-right font-semibold">Nilai Kontrak</th>
                            <th className="p-4 text-right font-semibold">Cash In</th>
                            <th className="p-4 text-right font-semibold">Total AR</th>
                            <th className="p-4 font-semibold">Est. Lunas</th>
                            <th className="p-4 font-semibold">PIC</th>
                            <th className="p-4 font-semibold">Posisi</th>
                            <th className="p-4 font-semibold">Kontak</th>
                            <th className="p-4 font-semibold">Status</th>
                            <th className="p-4 font-semibold">WSC Sales</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm bg-black/20">
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={14} className="p-8 text-center text-gray-500">
                                    No data available. Click "Add New Sales" to insert data.
                                </td>
                            </tr>
                        ) : (
                            data.map((item) => (
                                <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="p-4 text-center text-gray-400 group-hover:text-white transition-colors">{item.no}</td>
                                    <td className="p-4 text-gray-300 group-hover:text-white transition-colors">{item.tahunBulan}</td>
                                    <td className="p-4 text-white font-bold">{item.perusahaan}</td>
                                    <td className="p-4 text-gray-300">{item.namaProyek}</td>
                                    <td className="p-4 text-gray-400">
                                        <span className="px-2 py-0.5 rounded text-xs border border-white/10 bg-white/5">{item.tipe}</span>
                                    </td>
                                    <td className="p-4 text-right text-emerald-400 font-bold tracking-tight">{formatCurrency(item.nilaiKontrak)}</td>
                                    <td className="p-4 text-right text-sky-400 font-medium">{formatCurrency(item.cashIn)}</td>
                                    <td className="p-4 text-right text-rose-400 font-medium">{formatCurrency(item.totalAR)}</td>
                                    <td className="p-4 text-gray-400">{item.estimasiLunas}</td>
                                    <td className="p-4 text-white">{item.pic}</td>
                                    <td className="p-4 text-gray-400">{item.posisi}</td>
                                    <td className="p-4 text-gray-400">{item.kontak}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold border ${item.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                item.status === 'Partial' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                                                    item.status === 'Running' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                        'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                            }`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-[#e8c559] font-medium">{item.wscSales}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Form */}
            {showForm && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="glass-panel rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl">
                        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                            <h2 className="text-xl font-bold text-white">Add New Sales</h2>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Tahun/Bulan</label>
                                <input name="tahunBulan" type="month" required onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Perusahaan</label>
                                <input name="perusahaan" type="text" required onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Nama Proyek</label>
                                <input name="namaProyek" type="text" required onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Tipe</label>
                                <select name="tipe" onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all">
                                    <option value="">Select Type</option>
                                    <option value="Project">Project</option>
                                    <option value="Retainer">Retainer</option>
                                    <option value="Ad-hoc">Ad-hoc</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Nilai Kontrak</label>
                                <input name="nilaiKontrak" type="number" onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Cash In Revenue</label>
                                <input name="cashIn" type="number" onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total AR</label>
                                <input name="totalAR" type="number" onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Estimasi Lunas</label>
                                <input name="estimasiLunas" type="date" onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">PIC Client</label>
                                <input name="pic" type="text" onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Posisi</label>
                                <input name="posisi" type="text" onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Kontak (HP)</label>
                                <input name="kontak" type="text" onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Status</label>
                                <select name="status" onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all">
                                    <option value="Paid">Paid</option>
                                    <option value="Partial">Partial</option>
                                    <option value="Unpaid">Unpaid</option>
                                    <option value="Running">Running</option>
                                </select>
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">WSC Sales</label>
                                <input name="wscSales" type="text" onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                            </div>
                            <div className="md:col-span-2 flex gap-3 mt-6 pt-4 border-t border-white/10">
                                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-gray-300 font-medium hover:bg-white/5 transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 py-3 rounded-xl bg-[#e8c559] text-[#171611] font-bold hover:bg-[#d4a843] transition-colors shadow-lg">Save Sales Data</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
