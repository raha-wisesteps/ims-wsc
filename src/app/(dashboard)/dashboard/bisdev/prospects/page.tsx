"use client";

import { useState } from "react";

// Types
type ProspectStatus = "Identified" | "Contacted" | "Meeting Scheduled" | "Not Interested";

interface ProspectData {
    id: number;
    no: number;
    perusahaan: string;
    industri: string;
    sumberData: string;
    keyPerson: string;
    jabatan: string;
    kontak: string;
    status: ProspectStatus;
    rencanaPendekatan: string;
    wscSales: string;
}

const mockProspectsData: ProspectData[] = [
    {
        id: 1,
        no: 1,
        perusahaan: "PT Finansial Terpadu",
        industri: "Finance",
        sumberData: "LinkedIn Research",
        keyPerson: "Robert Lie",
        jabatan: "Director",
        kontak: "08111111222",
        status: "Identified",
        rencanaPendekatan: "Kirim email intro minggu depan",
        wscSales: "Rega"
    },
    {
        id: 2,
        no: 2,
        perusahaan: "RS Sehat Selalu",
        industri: "Healthcare",
        sumberData: "News Article",
        keyPerson: "Dr. Amanda",
        jabatan: "Kepala RS",
        kontak: "08122223333",
        status: "Contacted",
        rencanaPendekatan: "Follow up WA 3 hari lagi",
        wscSales: "Rahadian"
    },
    {
        id: 3,
        no: 3,
        perusahaan: "Green Energy Corp",
        industri: "Energy",
        sumberData: "Conference",
        keyPerson: "Ir. Basuki",
        jabatan: "Project Manager",
        kontak: "08133334444",
        status: "Meeting Scheduled",
        rencanaPendekatan: "Siapkan deck presentasi sustainability",
        wscSales: "Rega"
    }
];

export default function ProspectsPage() {
    const [data, setData] = useState<ProspectData[]>(mockProspectsData);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState<Partial<ProspectData>>({});

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newEntry: ProspectData = {
            id: Date.now(),
            no: data.length + 1,
            perusahaan: formData.perusahaan || "",
            industri: formData.industri || "",
            sumberData: formData.sumberData || "",
            keyPerson: formData.keyPerson || "",
            jabatan: formData.jabatan || "",
            kontak: formData.kontak || "",
            status: (formData.status as ProspectStatus) || "Identified",
            rencanaPendekatan: formData.rencanaPendekatan || "",
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
                    <h1 className="text-2xl font-bold text-white">Prospects List</h1>
                    <p className="text-sm text-gray-400">Target market and strategic approach</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-[#e8c559] hover:bg-[#d4a843] text-[#171611] px-4 py-2 rounded-lg font-bold transition-colors shadow-lg"
                >
                    + Add New Prospect
                </button>
            </div>

            {/* Table */}
            <div className="glass-panel rounded-xl overflow-hidden overflow-x-auto shadow-xl border border-white/5">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-black/40 text-xs text-gray-400 uppercase border-b border-white/10">
                            <th className="p-4 text-center w-12 font-semibold">No</th>
                            <th className="p-4 font-semibold">Perusahaan</th>
                            <th className="p-4 font-semibold">Industri</th>
                            <th className="p-4 font-semibold">Sumber Data</th>
                            <th className="p-4 font-semibold">Key Person</th>
                            <th className="p-4 font-semibold">Kontak</th>
                            <th className="p-4 font-semibold">Status</th>
                            <th className="p-4 font-semibold">Rencana Pendekatan</th>
                            <th className="p-4 font-semibold">WSC Sales</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm bg-black/20">
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="p-8 text-center text-gray-500">
                                    No prospects available. Click "Add New Prospect" to insert.
                                </td>
                            </tr>
                        ) : (
                            data.map((item) => (
                                <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="p-4 text-center text-gray-400 group-hover:text-white transition-colors">{item.no}</td>
                                    <td className="p-4 text-white font-bold">{item.perusahaan}</td>
                                    <td className="p-4 text-gray-400">{item.industri}</td>
                                    <td className="p-4 text-gray-400">{item.sumberData}</td>
                                    <td className="p-4">
                                        <div className="text-white font-medium">{item.keyPerson}</div>
                                        <div className="text-xs text-gray-500">{item.jabatan}</div>
                                    </td>
                                    <td className="p-4 text-gray-400">{item.kontak}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold border ${item.status === 'Meeting Scheduled' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                item.status === 'Contacted' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                    item.status === 'Not Interested' ? 'bg-gray-500/10 text-gray-400 border-gray-500/20' :
                                                        'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                            }`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-300 italic">{item.rencanaPendekatan}</td>
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
                            <h2 className="text-xl font-bold text-white">Add New Prospect</h2>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Perusahaan</label>
                                <input name="perusahaan" type="text" required onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Industri</label>
                                <input name="industri" type="text" onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Sumber Data</label>
                                <input name="sumberData" type="text" onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Key Person</label>
                                <input name="keyPerson" type="text" required onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Jabatan</label>
                                <input name="jabatan" type="text" onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Kontak</label>
                                <input name="kontak" type="text" onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Status</label>
                                <select name="status" onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all">
                                    <option value="Identified">Identified</option>
                                    <option value="Contacted">Contacted</option>
                                    <option value="Meeting Scheduled">Meeting Scheduled</option>
                                    <option value="Not Interested">Not Interested</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">WSC Sales</label>
                                <input name="wscSales" type="text" onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Rencana Pendekatan</label>
                                <textarea name="rencanaPendekatan" rows={2} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:border-[#e8c559] focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                            </div>
                            <div className="md:col-span-2 flex gap-3 mt-6 pt-4 border-t border-white/10">
                                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-gray-300 font-medium hover:bg-white/5 transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 py-3 rounded-xl bg-[#e8c559] text-[#171611] font-bold hover:bg-[#d4a843] transition-colors shadow-lg">Save Prospect</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
