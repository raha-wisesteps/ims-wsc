"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AddClientPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        router.push("/dashboard/crm");
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Link href="/dashboard/crm" className="hover:text-foreground transition-colors">CRM Database</Link>
                    <span>/</span>
                    <span className="text-foreground">Add New Client</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Add New Client</h1>
                <p className="text-muted-foreground">Enter the details of the new client to add them to the database.</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="glass-panel border border-border bg-card p-6 rounded-2xl shadow-sm space-y-8">

                {/* Company Info */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold border-b border-border pb-2 text-foreground">Company Information</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Company Name <span className="text-rose-500">*</span></label>
                            <input type="text" required placeholder="e.g. PT Maju Jaya" className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2.5 text-sm focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Industry</label>
                            <select className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2.5 text-sm focus:ring-1 focus:ring-[#e8c559] outline-none transition-all">
                                <option value="">Select Industry...</option>
                                <option value="Technology">Technology</option>
                                <option value="Finance">Finance</option>
                                <option value="Retail">Retail</option>
                                <option value="Manufacturing">Manufacturing</option>
                                <option value="Healthcare">Healthcare</option>
                                <option value="Education">Education</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Address</label>
                        <textarea rows={2} placeholder="Full office address..." className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2.5 text-sm focus:ring-1 focus:ring-[#e8c559] outline-none transition-all resize-none" />
                    </div>
                </div>

                {/* Contact Person */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold border-b border-border pb-2 text-foreground">Key Contact Person (PIC)</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Full Name <span className="text-rose-500">*</span></label>
                            <input type="text" required placeholder="e.g. Budi Santoso" className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2.5 text-sm focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Job Title</label>
                            <input type="text" placeholder="e.g. Operations Manager" className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2.5 text-sm focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Email Address <span className="text-rose-500">*</span></label>
                            <input type="email" required placeholder="e.g. budi@company.com" className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2.5 text-sm focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Phone / WhatsApp <span className="text-rose-500">*</span></label>
                            <input type="tel" required placeholder="e.g. 08123456789" className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2.5 text-sm focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                        </div>
                    </div>
                </div>

                {/* Business Info */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold border-b border-border pb-2 text-foreground">Business Details</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Client Status</label>
                            <select className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2.5 text-sm focus:ring-1 focus:ring-[#e8c559] outline-none transition-all">
                                <option value="prospect">Prospect</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Est. Contract Value (IDR)</label>
                            <input type="number" placeholder="0" className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2.5 text-sm focus:ring-1 focus:ring-[#e8c559] outline-none transition-all" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Initial Notes / Strategy</label>
                        <textarea rows={3} placeholder="Add any important context or notes here..." className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2.5 text-sm focus:ring-1 focus:ring-[#e8c559] outline-none transition-all resize-none" />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4 pt-4 border-t border-border">
                    <Link href="/dashboard/crm" className="flex-1 py-3 bg-muted border border-border rounded-xl text-center text-muted-foreground font-medium hover:bg-muted/80 transition-colors">
                        Cancel
                    </Link>
                    <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-[#e8c559] hover:bg-[#d4a843] text-[#171611] rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2">
                        {isLoading ? (
                            <>Processing...</>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                </svg>
                                Save Client
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
