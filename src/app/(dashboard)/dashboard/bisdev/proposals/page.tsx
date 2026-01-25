"use client";

import { useState } from "react";

// Types
type ProposalStatus = "Draft" | "Sent" | "Negotiation" | "Approved" | "Rejected";

interface ProposalData {
    id: number;
    no: number;
    noProposal: string;
    tanggalKirim: string;
    perusahaan: string;
    judulProposal: string;
    tipeLayanan: string;
    nilaiPenawaran: number;
    status: ProposalStatus;
    lastFollowUp: string;
    wscSales: string;
}

const mockProposalsData: ProposalData[] = [
    {
        id: 1,
        no: 1,
        noProposal: "PROP/WSC/2024/01/001",
        tanggalKirim: "2024-01-20",
        perusahaan: "PT Sumber Makmur",
        judulProposal: "Implementasi ISO 9001",
        tipeLayanan: "Consulting",
        nilaiPenawaran: 120000000,
        status: "Sent",
        lastFollowUp: "2024-01-22",
        wscSales: "Rega"
    },
    {
        id: 2,
        no: 2,
        noProposal: "PROP/WSC/2024/01/002",
        tanggalKirim: "2024-01-22",
        perusahaan: "CV Tech Inovasi",
        judulProposal: "System Development - E-Learning",
        tipeLayanan: "Technology",
        nilaiPenawaran: 200000000,
        status: "Negotiation",
        lastFollowUp: "2024-01-25",
        wscSales: "Rahadian"
    },
    {
        id: 3,
        no: 3,
        noProposal: "PROP/WSC/2024/01/003",
        tanggalKirim: "2024-01-25",
        perusahaan: "Universitas Merdeka",
        judulProposal: "Digital Marketing Training",
        tipeLayanan: "Training",
        nilaiPenawaran: 35000000,
        status: "Draft",
        lastFollowUp: "-",
        wscSales: "Rega"
    },
    {
        id: 4,
        no: 4,
        noProposal: "PROP/WSC/2024/01/004",
        tanggalKirim: "2024-01-26",
        perusahaan: "PT Konstruksi Utama",
        judulProposal: "Safety Management System",
        tipeLayanan: "Consulting",
        nilaiPenawaran: 150000000,
        status: "Approved",
        lastFollowUp: "2024-01-28",
        wscSales: "Rahadian"
    }
];

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
};

export default function ProposalsPage() {
    const [data, setData] = useState<ProposalData[]>(mockProposalsData);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState<Partial<ProposalData>>({});

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newEntry: ProposalData = {
            id: Date.now(),
            no: data.length + 1,
            noProposal: formData.noProposal || `PROP/WSC/2024/02/${String(data.length + 1).padStart(3, '0')}`,
            tanggalKirim: formData.tanggalKirim || "",
            perusahaan: formData.perusahaan || "",
            judulProposal: formData.judulProposal || "",
            tipeLayanan: formData.tipeLayanan || "",
            nilaiPenawaran: Number(formData.nilaiPenawaran) || 0,
            status: (formData.status as ProposalStatus) || "Draft",
            lastFollowUp: formData.lastFollowUp || "",
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
                    <h1 className="text-2xl font-bold text-white">Proposal Tracker</h1>
                    <p className="text-sm text-gray-400">Manage sent proposals and negotiations</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-[#e8c559] hover:bg-[#d4a843] text-[#171611] px-4 py-2 rounded-lg font-bold transition-colors shadow-lg"
                >
                    + Create Proposal
                </button>
            </div>

            {/* Table */}
            <div className="glass-panel rounded-xl overflow-hidden overflow-x-auto shadow-xl border border-white/5">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-black/40 text-xs text-gray-400 uppercase border-b border-white/10">
                            <th className="p-4 text-center w-12 font-semibold">No</th>
                            <th className="p-4 font-semibold">No. Proposal</th>
                            <th className="p-4 font-semibold">Tgl Kirim</th>
                            <th className="p-4 font-semibold">Perusahaan</th>
                            <th className="p-4 font-semibold">Judul Proposal</th>
                            <th className="p-4 font-semibold">Tipe Layanan</th>
                            <th className="p-4 text-right font-semibold">Nilai Penawaran</th>
                            <th className="p-4 font-semibold">Status</th>
                            <th className="p-4 font-semibold">Last Follow Up</th>
                            <th className="p-4 font-semibold">WSC Sales</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm bg-black/20">
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="p-8 text-center text-gray-500">
                                    No proposal data. Click "Create Proposal" to insert.
                                </td>
                            </tr>
                        ) : (
                            data.map((item) => (
                                <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="p-4 text-center text-gray-400 group-hover:text-white transition-colors">{item.no}</td>
                                    <td className="p-4 text-gray-300 font-mono text-xs">{item.noProposal}</td>
                                    <td className="p-4 text-gray-300">{item.tanggalKirim}</td>
                                    <td className="p-4 text-white font-bold">{item.perusahaan}</td>
                                    <td className="p-4 text-gray-300">{item.judulProposal}</td>
                                    <td className="p-4 text-gray-400">
                                        <span className="px-2 py-0.5 rounded text-xs border border-white/10 bg-white/5">{item.tipeLayanan}</span>
                                    </td>
                                    <td className="p-4 text-right text-emerald-400 font-medium">{formatCurrency(item.nilaiPenawaran)}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold border ${item.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                item.status === 'Negotiation' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                    item.status === 'Rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                            }`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-400 text-xs">{item.lastFollowUp}</td>
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
                            <h2 className="text-xl font-bold text-white">Create Proposal</h2>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Tanggal Kirim</label>
                                <input name="tanggalKirim" type="date" required onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Perusahaan</label>
                                <input name="perusahaan" type="text" required onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Judul Proposal</label>
                                <input name="judulProposal" type="text" required onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Tipe Layanan</label>
                                <input name="tipeLayanan" type="text" onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Nilai Penawaran</label>
                                <input name="nilaiPenawaran" type="number" onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Status</label>
                                <select name="status" onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all">
                                    <option value="Draft">Draft</option>
                                    <option value="Sent">Sent</option>
                                    <option value="Negotiation">Negotiation</option>
                                    <option value="Approved">Approved</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Last Follow Up</label>
                                <input name="lastFollowUp" type="date" onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">WSC Sales</label>
                                <input name="wscSales" type="text" onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                            </div>
                            <div className="md:col-span-2 flex gap-3 mt-6 pt-4 border-t border-white/10">
                                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-gray-300 font-medium hover:bg-white/5 transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 py-3 rounded-xl bg-[#e8c559] text-[#171611] font-bold hover:bg-[#d4a843] transition-colors shadow-lg">Save Proposal</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
