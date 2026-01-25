# WSC IMS - Konteks Pengembangan

## 📋 Ringkasan Proyek
**Nama Proyek:** WSC IMS (Internal Management System)  
**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 4, Supabase  
**Tujuan:** Membangun platform Internal Management System modern dengan fitur check-in, leave request, team management, knowledge hub, dan lainnya.

> **Note:** Proyek ini awalnya dinamakan "HRIS Command Center" namun sekarang telah berkembang menjadi "Internal Management System" yang mencakup lebih banyak fitur manajemen internal perusahaan.

---

## ✅ Fitur yang Sudah Diimplementasi

### 1. Clock-in System (`/dashboard`)
- **Fungsi Utama**: Absensi untuk karyawan yang melakukan WFH atau WFA
- **Perizinan H/H-1**: Jika sakit atau izin di hari H atau H-1, bisa langsung melalui clock-in
- **Status types**: WFH, WFA, Sakit (H/H-1), Izin (H/H-1)
- **Daily Plan**: Mandatory input untuk setiap clock-in WFH/WFA

> **Special Case - Eksternal Konsultan:**
> Untuk user dengan role "Eksternal Konsultan", fitur clock-in hanya berupa absensi murni (pure attendance) tanpa pilihan status lainnya.

### 2. Hybrid Attendance Logic (Planned)
**Workflow Logika 3 Layer:**
1.  **Level 1: Auto-Request (Highest Priority)**
    *   Jika ada Approved Request (Sakit/Izin/Dinas), sistem otomatis mencatat kehadiran di database.
    *   User **TIDAK PERLU** clock-in manual.

2.  **Level 2: Full-Online Employee (Scenario: Rega)**
    *   Karyawan dengan flag `is_full_online = true`.
    *   Fitur Clock-in di web **SELALU MENYALA** (kecuali sedang cuti/sakit).
    *   Prioritas utama absensi mereka adalah via Website/App.

3.  **Level 3: Machine / Fingerprint (Office Default)**
    *   Untuk karyawan regular (non-remote).
    *   Fitur Clock-in di web **MATI (Disabled)**.
    *   Absensi mengandalkan scan mesin fingerprint (First In, Last Out).
    *   Data mesin akan disync ke database `daily_attendance`.

**Schema Data yang Direncanakan:**
*   `raw_attendance_logs`: Menyimpan data mentah sesuai format mesin (`cloud_id`, `id`, `nama`, `tanggal_absensi`, `jam_absensi`, `verifikasi`, `tipe_absensi`, `jabatan`, `kantor`).
*   `daily_attendance`: Tabel master hasil olahan (Single Source of Truth).

### 2. Leave Requests (`/dashboard/leave-requests`)
- **Removed lead time**: Tidak ada lagi minimum H-X untuk pengajuan
- **WFH single day only**: WFH hanya bisa 1 hari
- **Request types**: Cuti Tahunan, Sakit, WFH, Izin

### 3. Knowledge Hub (`/dashboard/knowledge`)
- **Access Levels**: Intern, Staff, Senior, Owner
- **Tab Navigation**: All, Documents, Videos, SOPs
- **Coursera-style Video Cards**: Thumbnail, progress, duration badges
- **Role Filters**: Business Development, Marketing & Sales, Analyst

### 4. Weekly Board (`/dashboard/board`)
- **Team attendance tracker**: Lihat status tim per minggu
- **Fast navigation**: Menggunakan Next.js Link untuk soft navigation

### 5. Theme System (Light/Dark Mode)
#### CSS Variables di `globals.css`:
| Variable | Dark Mode | Light Mode |
|----------|-----------|------------|
| `--sidebar-bg` | `#171611` | `#5f788e` (biru) |
| `--sidebar-text` | `rgba(255,255,255,0.7)` | `#ffffff` |
| `--primary` | `#e8c559` (emas) | `#3f545f` (biru-abu) |

### 6. Sidebar Navigation
- Cleaned up: Team Reports dan SOP Database dihapus
- SOPs dimerge ke Knowledge Hub
- Logo baru: `logo_WSC_IMS.png`

---

## 📁 File-file Penting

| File | Fungsi |
|------|--------|
| `src/app/globals.css` | CSS variables, utility classes, theme colors |
| `src/components/layout/Sidebar.tsx` | Sidebar navigation dengan logo |
| `src/components/layout/Header.tsx` | Header dengan theme toggle |
| `src/app/(dashboard)/dashboard/page.tsx` | Dashboard home |
| `src/app/(dashboard)/dashboard/knowledge/page.tsx` | Knowledge Hub |
| `src/app/(dashboard)/dashboard/board/page.tsx` | Weekly Board |

---

## 🎨 Color Palette Reference

### Primary Accents:
| Context | Light Mode | Dark Mode |
|---------|------------|-----------|
| Buttons, highlights | `#3f545f` | `#e8c559` |
| Hover state | `#4a6575` | `#f0d77a` |

### Sidebar:
| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Background | `#5f788e` | `#171611` |
| Text | `#ffffff` | `rgba(255,255,255,0.7)` |
| Active item | `#e8c559` | `#e8c559` |

---

## ⚠️ Known Issues

### 1. Tailwind `dark:` prefix TIDAK BERFUNGSI
**Solusi yang digunakan:**
```tsx
// Option 1: CSS Variables (RECOMMENDED)
<p style={{ color: 'var(--primary)' }}>Text</p>

// Option 2: JavaScript Conditional
<p style={{ color: theme === "dark" ? "#e8c559" : "#5f788e" }}>Text</p>
```

### 2. `@theme` CSS Warning
- CSS linter tidak mengenali Tailwind v4 `@theme inline`
- **TIDAK mempengaruhi runtime**

---

## 📝 Catatan Teknis

### Navigation Performance:
- Gunakan `<Link>` dari Next.js untuk soft navigation (cepat)
- Hindari `<a href>` yang menyebabkan hard refresh (lambat)

### Theme Context:
Theme dikelola oleh `ThemeContext` di `/contexts/ThemeContext.tsx`. 
Class `.light` atau `.dark` ditambahkan ke `<html>` element.

---

## 🔄 Next Steps

1. **Backend Integration**: Connect check-in dan leave request ke Supabase
2. **User Authentication**: Role-based access control
3. **Testing**: Test menyeluruh di kedua mode (light/dark)

---

*Dokumen ini di-update: 15 Januari 2026*
