"use client";

import { useState } from "react";

// Types
type LeadStatus = "Hot" | "Warm" | "Cold" | "Qualified";

interface LeadData {
    id: number;
    no: number;
    tanggalMasuk: string;
    sumberLead: string;
    namaPerusahaan: string;
    industri: string;
    pic: string;
    jabatan: string;
    kontak: string;
    kebutuhan: string;
    estimasiValue: number;
    status: LeadStatus;
    notes: string;
    wscSales: string;
}

const mockLeadsData: LeadData[] = [
    {
        id: 1,
        no: 1,
        tanggalMasuk: "2024-01-10",
        sumberLead: "LinkedIn",
        namaPerusahaan: "PT Digital Solusi",
        industri: "IT Services",
        pic: "Andi Wijaya",
        jabatan: "CEO",
        kontak: "081234556677",
        kebutuhan: "Konsultasi IT Security",
        estimasiValue: 50000000,
        status: "Hot",
        notes: "Butuh urgent minggu depan",
        wscSales: "Rega"
    },
    {
        id: 2,
        no: 2,
        tanggalMasuk: "2024-01-12",
        sumberLead: "Referral",
        namaPerusahaan: "CV Mandiri Jaya",
        industri: "Retail",
        pic: "Budi Santoso",
        jabatan: "Owner",
        kontak: "081987654321",
        kebutuhan: "Pembuatan Website E-commerce",
        estimasiValue: 25000000,
        status: "Warm",
        notes: "Masih membandingkan harga",
        wscSales: "Rahadian"
    },
    {
        id: 3,
        no: 3,
        tanggalMasuk: "2024-01-15",
        sumberLead: "Website Contact Form",
        namaPerusahaan: "PT Logistik Nasional",
        industri: "Logistics",
        pic: "Citra Lestari",
        jabatan: "Ops Manager",
        kontak: "085678901234",
        kebutuhan: "Sistem Tracking Armada",
        estimasiValue: 150000000,
        status: "Qualified",
        notes: "Sudah meeting pertama, minta proposal",
        wscSales: "Rega"
    },
    {
        id: 4,
        no: 4,
        tanggalMasuk: "2024-01-18",
        sumberLead: "Event Networking",
        namaPerusahaan: "Yayasan Pendidikan Mulia",
        industri: "Education",
        pic: "Dr. Setiawan",
        jabatan: "Kepala Yayasan",
        kontak: "081223344556",
        kebutuhan: "Training Staff",
        estimasiValue: 15000000,
        status: "Cold",
        notes: "Follow up bulan depan",
        wscSales: "Rahadian"
    }
];

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
};

export default function LeadsPage() {
    const [data, setData] = useState<LeadData[]>(mockLeadsData);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState<Partial<LeadData>>({});

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleStatusChange = (id: number, newStatus: LeadStatus) => {
        setData(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newEntry: LeadData = {
            id: Date.now(),
            no: data.length + 1,
            tanggalMasuk: formData.tanggalMasuk || "",
            sumberLead: formData.sumberLead || "",
            namaPerusahaan: formData.namaPerusahaan || "",
            industri: formData.industri || "",
            pic: formData.pic || "",
            jabatan: formData.jabatan || "",
            kontak: formData.kontak || "",
            kebutuhan: formData.kebutuhan || "",
            estimasiValue: Number(formData.estimasiValue) || 0,
            status: (formData.status as LeadStatus) || "Cold",
            notes: formData.notes || "",
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
                    <h1 className="text-2xl font-bold text-white">Leads Pipeline</h1>
                    <p className="text-sm text-gray-400">Track and manage potential clients</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-[#e8c559] hover:bg-[#d4a843] text-[#171611] px-4 py-2 rounded-lg font-bold transition-colors shadow-lg"
                >
                    + Add New Lead
                </button>
            </div>

            {/* Table */}
            <div className="glass-panel rounded-xl overflow-hidden overflow-x-auto shadow-xl border border-white/5">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-black/40 text-xs text-gray-400 uppercase border-b border-white/10">
                            <th className="p-4 text-center w-12 font-semibold">No</th>
                            <th className="p-4 font-semibold">Tgl Masuk</th>
                            <th className="p-4 font-semibold">Perusahaan</th>
                            <th className="p-4 font-semibold">Industri</th>
                            <th className="p-4 font-semibold">Kebutuhan</th>
                            <th className="p-4 font-semibold">PIC & Kontak</th>
                            <th className="p-4 text-right font-semibold">Est. Value</th>
                            <th className="p-4 font-semibold text-center">Status (Click to Change)</th>
                            <th className="p-4 font-semibold">Notes</th>
                            <th className="p-4 font-semibold">WSC Sales</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm bg-black/20">
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="p-8 text-center text-gray-500">
                                    No leads available. Click "Add New Lead" to insert data.
                                </td>
                            </tr>
                        ) : (
                            data.map((item) => (
                                <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="p-4 text-center text-gray-400 group-hover:text-white transition-colors">{item.no}</td>
                                    <td className="p-4 text-gray-300">{item.tanggalMasuk}</td>
                                    <td className="p-4 text-white font-bold">
                                        {item.namaPerusahaan}
                                        <div className="text-xs text-gray-500 font-normal mt-0.5">{item.sumberLead}</div>
                                    </td>
                                    <td className="p-4 text-gray-400">{item.industri}</td>
                                    <td className="p-4 text-gray-300 max-w-xs truncate" title={item.kebutuhan}>{item.kebutuhan}</td>
                                    <td className="p-4">
                                        <div className="text-white font-medium">{item.pic}</div>
                                        <div className="text-xs text-gray-500">{item.jabatan} • {item.kontak}</div>
                                    </td>
                                    <td className="p-4 text-right text-emerald-400 font-medium">{formatCurrency(item.estimasiValue)}</td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-1">
                                            {(['Hot', 'Warm', 'Cold', 'Qualified'] as LeadStatus[]).map((status) => (
                                                <button
                                                    key={status}
                                                    onClick={() => handleStatusChange(item.id, status)}
                                                    className={`w-2 h-6 rounded-full transition-all ${item.status === status
                                                            ? status === 'Hot' ? 'bg-rose-500 scale-125 shadow-[0_0_10px_rgba(244,63,94,0.5)]' :
                                                                status === 'Warm' ? 'bg-amber-500 scale-125 shadow-[0_0_10px_rgba(245,158,11,0.5)]' :
                                                                    status === 'Qualified' ? 'bg-emerald-500 scale-125 shadow-[0_0_10px_rgba(16,185,129,0.5)]' :
                                                                        'bg-sky-500 scale-125 shadow-[0_0_10px_rgba(14,165,233,0.5)]'
                                                            : 'bg-white/10 hover:bg-white/30'
                                                        }`}
                                                    title={status}
                                                />
                                            ))}
                                        </div>
                                        <div className={`text-xs mt-1 font-bold ${item.status === 'Hot' ? 'text-rose-400' :
                                                item.status === 'Warm' ? 'text-amber-400' :
                                                    item.status === 'Qualified' ? 'text-emerald-400' :
                                                        'text-sky-400'
                                            }`}>{item.status}</div>
                                    </td>
                                    <td className="p-4 text-gray-400 text-xs max-w-[200px] truncate" title={item.notes}>{item.notes}</td>
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
                            <h2 className="text-xl font-bold text-white">Add New Lead</h2>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Tanggal Masuk</label>
                                <input name="tanggalMasuk" type="date" required onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Sumber Lead</label>
                                <input name="sumberLead" type="text" onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Nama Perusahaan</label>
                                <input name="namaPerusahaan" type="text" required onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Industri</label>
                                <input name="industri" type="text" onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">PIC</label>
                                <input name="pic" type="text" onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Jabatan</label>
                                <input name="jabatan" type="text" onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Kontak (HP)</label>
                                <input name="kontak" type="text" onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Est. Value</label>
                                <input name="estimasiValue" type="number" onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Kebutuhan / Pain Point</label>
                                <textarea name="kebutuhan" rows={2} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Status</label>
                                <select name="status" onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all">
                                    <option value="Cold">Cold</option>
                                    <option value="Warm">Warm</option>
                                    <option value="Hot">Hot</option>
                                    <option value="Qualified">Qualified</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">WSC Sales</label>
                                <input name="wscSales" type="text" onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Notes</label>
                                <textarea name="notes" rows={2} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                            </div>
                            <div className="md:col-span-2 flex gap-3 mt-6 pt-4 border-t border-white/10">
                                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-gray-300 font-medium hover:bg-white/5 transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 py-3 rounded-xl bg-[#e8c559] text-[#171611] font-bold hover:bg-[#d4a843] transition-colors shadow-lg">Save Lead</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
