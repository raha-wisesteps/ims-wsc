import Link from "next/link";
import Image from "next/image";
import {
  Users,
  CalendarCheck,
  ClipboardList,
  BookOpen,
  BarChart3,
  Building2,
  Leaf,
  Shield,
  ArrowRight,
  Check
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
    icon: Leaf,
    title: "Sustainability",
    description: "ESG reporting, carbon tracking, dan environmental compliance"
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
  { value: "Secure", label: "Data Protected" },
  { value: "Mobile", label: "Responsive" }
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-white overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/pukpik-aB46yUmsMp0-unsplash.jpg"
            alt="IMS Background"
            fill
            className="object-cover"
            priority
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0d1117]/80 via-[#0d1117]/60 to-[#0d1117]" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm text-white/80">Enterprise Management Platform</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-[#e8c559] via-[#f0d878] to-[#e8c559] bg-clip-text text-transparent">
              Internal Management
            </span>
            <br />
            <span className="text-white">System</span>
          </h1>

          <p className="text-xl md:text-2xl text-white/70 max-w-3xl mx-auto mb-10 leading-relaxed">
            Platform terintegrasi untuk mengelola SDM, operasional, dan bisnis development
            dalam satu ekosistem yang powerful dan mudah digunakan.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/login"
              className="group px-8 py-4 rounded-xl bg-gradient-to-r from-[#e8c559] to-[#dcb33e] text-[#171611] font-bold text-lg shadow-lg shadow-[#e8c559]/25 hover:shadow-xl hover:shadow-[#e8c559]/40 transition-all flex items-center gap-2"
            >
              Masuk ke Platform
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#features"
              className="px-8 py-4 rounded-xl border border-white/30 text-white font-medium text-lg hover:bg-white/10 transition-all"
            >
              Lihat Fitur
            </a>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-12">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-[#e8c559] mb-1">{stat.value}</div>
                <div className="text-sm text-white/60">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-white/60 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Fitur <span className="text-[#e8c559]">Lengkap</span> untuk Perusahaan Modern
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Dari pengelolaan SDM hingga sustainability reporting,
              semua dalam satu platform yang terintegrasi.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#e8c559]/50 hover:bg-white/10 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#e8c559]/20 to-[#e8c559]/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-[#e8c559]" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 px-6 bg-gradient-to-b from-transparent via-[#e8c559]/5 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Mengapa Memilih <span className="text-[#e8c559]">IMS</span>?
              </h2>
              <p className="text-white/60 mb-8 leading-relaxed">
                Dikembangkan khusus untuk kebutuhan perusahaan Indonesia dengan
                memperhatikan regulasi lokal dan best practice internasional.
              </p>

              <ul className="space-y-4">
                {[
                  "Antarmuka dalam Bahasa Indonesia",
                  "Terintegrasi dengan mesin fingerprint",
                  "Mendukung mobile browser",
                  "Laporan ESG sesuai standar",
                  "Keamanan data enterprise-grade"
                ].map((benefit, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-emerald-500" />
                    </div>
                    <span className="text-white/80">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right Visual */}
            <div className="relative">
              <div className="aspect-square rounded-3xl bg-gradient-to-br from-[#e8c559]/20 via-[#e8c559]/10 to-transparent p-8 border border-[#e8c559]/20">
                <div className="w-full h-full rounded-2xl bg-[#0d1117] border border-white/10 flex items-center justify-center overflow-hidden">
                  <div className="text-center p-8">
                    <div className="text-6xl mb-4">🏢</div>
                    <div className="text-2xl font-bold text-[#e8c559] mb-2">IMS</div>
                    <div className="text-sm text-white/60">Internal Management System</div>
                  </div>
                </div>
              </div>
              {/* Decorative Elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-[#e8c559]/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-12 rounded-3xl bg-gradient-to-br from-[#1a1f26] to-[#0d1117] border border-white/10 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#e8c559]/10 rounded-full blur-3xl" />

            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Siap Tingkatkan Produktivitas Tim?
              </h2>
              <p className="text-white/60 mb-8 max-w-2xl mx-auto">
                Akses platform sekarang dan rasakan kemudahan mengelola
                seluruh aspek operasional perusahaan dalam satu tempat.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-[#e8c559] to-[#dcb33e] text-[#171611] font-bold text-lg shadow-lg shadow-[#e8c559]/25 hover:shadow-xl hover:shadow-[#e8c559]/40 transition-all"
              >
                Masuk Sekarang
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#e8c559] to-[#dcb33e] flex items-center justify-center">
              <span className="text-[#171611] font-bold text-sm">IMS</span>
            </div>
            <span className="text-white/60 text-sm">Internal Management System</span>
          </div>
          <p className="text-white/40 text-sm">
            © {new Date().getFullYear()} WiseSteps Consulting. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
