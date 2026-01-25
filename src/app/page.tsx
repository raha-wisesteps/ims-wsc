"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Users,
  CalendarCheck,
  ClipboardList,
  BookOpen,
  BarChart3,
  Building2,
  Shield,
  ArrowRight,
  Check,
  ExternalLink
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Human Resource",
    description: "Kelola data karyawan, attendance, dan dokumen HR dengan mudah"
  },
  {
    icon: CalendarCheck,
    title: "Smart Request",
    description: "Pengajuan WFH, cuti, lembur, training, dan reimburse dalam satu platform"
  },
  {
    icon: ClipboardList,
    title: "Command Center",
    description: "Dashboard approval terpusat untuk seluruh request karyawan"
  },
  {
    icon: BookOpen,
    title: "Knowledge Hub",
    description: "Perpustakaan digital untuk SOP, training materials, dan MoM"
  },
  {
    icon: BarChart3,
    title: "KPI & Workload",
    description: "Tracking performa dan beban kerja tim secara real-time"
  },
  {
    icon: Building2,
    title: "CRM & BisDev",
    description: "Manajemen prospek, project, dan business development"
  },
  {
    icon: Shield,
    title: "Assignment Board",
    description: "Project management dengan Kanban board dan task tracking"
  }
];

const stats = [
  { value: "100%", label: "Cloud-Based" },
  { value: "24/7", label: "Available" },
  { value: "🔒", label: "Protected" },
  { value: "📱", label: "Mobile Ready" }
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 overflow-x-hidden font-sans">
      {/* Navigation - Scroll Aware */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white py-4 shadow-md" : "bg-transparent py-6"}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo SVG - Double size (w-48 instead of w-32) */}
            <div className="relative w-48 h-14 transition-all duration-300">
              <Image
                src="/logo_fix.svg"
                alt="WiseSteps Logo"
                fill
                className={`object-contain transition-all duration-300 ${scrolled ? "" : "brightness-0 invert"}`}
              />
            </div>
          </div>
          <Link
            href="/login"
            className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all shadow-lg ${scrolled
              ? "bg-[#e8c559] text-slate-900 hover:bg-[#dcb33e]"
              : "bg-white text-slate-900 hover:bg-slate-100"
              }`}
          >
            Masuk Platform
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <Image
            src="/pukpik-aB46yUmsMp0-unsplash.jpg"
            alt="Gunung Bromo"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center text-white mt-10">


          <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight tracking-tight drop-shadow-lg">
            Internal Management<br />
            <span className="text-[#e8c559]">System</span>
          </h1>

          <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto mb-12 leading-relaxed font-light drop-shadow-md">
            Satu platform terintegrasi untuk seluruh operasional perusahaan.
            Efektif, efisien, dan transparan.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
            <Link
              href="/login"
              className="group px-8 py-4 rounded-full bg-[#e8c559] text-slate-900 font-bold text-lg hover:bg-[#dcb33e] transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(232,197,89,0.3)] hover:shadow-[0_0_30px_rgba(232,197,89,0.5)] hover:-translate-y-1"
            >
              Mulai Sekarang
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#features"
              className="px-8 py-4 rounded-full bg-white/10 backdrop-blur-md border border-white/30 text-white font-semibold text-lg hover:bg-white/20 transition-all"
            >
              Pelajari Fitur
            </a>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-white/50">
          <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-white rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-28 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-slate-900">
              Fitur Komprehensif
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              Dirancang untuk memenuhi kebutuhan manajemen modern.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="group p-8 rounded-3xl bg-slate-50 hover:bg-white border border-slate-100 hover:border-slate-200 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                  <feature.icon className="w-7 h-7 text-[#3f545f]" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose IMS - Parallax Background */}
      <section className="relative py-32 flex items-center bg-fixed bg-center bg-cover" style={{ backgroundImage: "url('/jason-cooper-XEhchWQuWyM-unsplash.jpg')" }}>
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/60" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-[#e8c559] font-bold tracking-wider uppercase mb-4 block">Keunggulan Platform</span>
              <h2 className="text-4xl md:text-6xl font-bold text-white mb-8 leading-tight">
                Mengapa Memilih<br />IMS?
              </h2>
              <p className="text-white/80 text-lg mb-10 leading-relaxed">
                Solusi yang tidak hanya mencatat, tetapi memberikan wawasan untuk pengambilan keputusan yang lebih baik.
              </p>

              <div className="flex flex-col gap-4">
                {/* Removed "Sistem Keamanan Berlapis" as requested */}
                {[
                  "Integrasi Data Real-time",
                  "Aksesibilitas Mobile & Web",
                  "Monitoring KPI Transparan"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 hover:bg-white/20 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-[#e8c559] flex items-center justify-center flex-shrink-0 text-slate-900">
                      <Check className="w-5 h-5" />
                    </div>
                    <span className="text-white font-medium text-lg">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right side stats/visual */}
            <div className="hidden md:grid grid-cols-2 gap-6">
              {stats.map((stat, idx) => (
                <div key={idx} className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl text-center hover:transform hover:-translate-y-2 transition-transform duration-300">
                  <div className="text-4xl font-bold text-white mb-2">{stat.value}</div>
                  <div className="text-white/60 text-sm tracking-widest uppercase">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* GSTC / Other Products Section */}
      <section className="py-32 bg-white text-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">

            {/* Left Side: Content */}
            <div className="order-2 md:order-1">
              {/* Removed "Ekosistem WiseSteps" text as requested */}
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900">
                Lihat Produk Kami Lainnya
              </h2>
              <p className="text-slate-500 text-lg mb-8 leading-relaxed">
                Temukan solusi digital lainnya yang kami kembangkan untuk mendukung keberlanjutan industri pariwisata dan efisiensi bisnis Anda.
              </p>

              <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 transition-all hover:shadow-lg group">
                <h3 className="text-2xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                  GSTC Certificate Assistant
                </h3>
                <p className="text-slate-500 mb-8 max-w-lg">
                  Asisten cerdas berbasis AI untuk memandu proses sertifikasi GSTC bagi konsultan dan klien dengan mudah dan efisien.
                </p>
                <a
                  href="https://gstc.wisestepsconsulting.web.id/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#e8c559] text-slate-900 font-bold hover:bg-[#dcb33e] hover:-translate-y-1 shadow-lg shadow-[#e8c559]/20 transition-all"
                >
                  Kunjungi Website
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Right Side: Image Visual */}
            <div className="order-1 md:order-2 relative h-[500px] w-full rounded-3xl overflow-hidden shadow-2xl">
              <Image
                src="/marvin-meyer-SYTO3xs06fU-unsplash.jpg"
                alt="GSTC Collaboration"
                fill
                className="object-cover hover:scale-105 transition-transform duration-700"
              />
              {/* Decorative Frame */}
              <div className="absolute inset-0 border-[12px] border-white/20 m-6 rounded-2xl pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Black Background */}
      <footer className="py-12 px-6 bg-[#5f788e] text-white border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="relative w-60 h-16">
              <Image
                src="/logo_fix.svg"
                alt="WiseSteps Logo"
                fill
                className="object-contain brightness-0 invert"
              />
            </div>
          </div>

          <div className="text-white font-bold text-sm text-center md:text-right">
            <p>© {new Date().getFullYear()} WiseSteps Consulting. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
