# WSC HRIS - Human Resource Information System
> **Modern HRIS Command Center** - Dashboard berbasis Next.js 15 untuk manajemen SDM perusahaan konsultan.
## 🚀 Tech Stack
| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 15.x | React Framework dengan App Router |
| **React** | 19.x | UI Library |
| **TypeScript** | 5.x | Type Safety |
| **Tailwind CSS** | 4.x | Styling dengan CSS Variables |
| **Supabase** | - | Backend as a Service (Auth + Database) |
## 📁 Project Structure
```
src/
├── app/
│   ├── (dashboard)/
│   │   └── dashboard/
│   │       ├── page.tsx          # Dashboard utama
│   │       ├── checkin/          # Daily check-in
│   │       ├── leave-requests/   # Leave request form
│   │       ├── request-approval/ # HR approval page
│   │       └── team/             # Team reports
│   └── globals.css               # CSS variables & themes
├── components/
│   └── layout/
│       ├── Sidebar.tsx           # Navigation sidebar
│       └── Header.tsx            # Top header dengan profile
└── contexts/
    └── ThemeContext.tsx          # Light/Dark mode handler
```
## 🎨 Design System
### Color Palette
| Context | Light Mode | Dark Mode |
|---------|------------|-----------|
| **Primary Accent** | `#3f545f` (Biru-abu) | `#e8c559` (Emas) |
| **Sidebar BG** | `#5f788e` (Biru) | `#171611` (Gelap) |
| **Background** | `#f5f6f8` | `#1c2120` |
| **Text Primary** | `#1c2120` | `#e9e9e9` |
### Theme Implementation
Theming menggunakan CSS variables di `globals.css`:
```css
:root, .dark { /* dark mode variables */ }
.light { /* light mode variables */ }
```
> ⚠️ **Note:** Tailwind `dark:` prefix tidak berfungsi di project ini. Gunakan CSS variables `var(--...)` atau JavaScript conditional `theme === "dark"`.
## ✅ Implemented Features
### 1. Dashboard Home (`/dashboard`)
- Hero status section dengan check-in button
- Daily Plan checklist dengan priority colors
- Career Milestone tracker dengan progress bar
- Project Workload dengan capacity system
- Weekly Board preview
### 2. Check-in System (`/dashboard/checkin`)
- Status: WFO, WFH, WFA, Sakit, Cuti, Tugas Lapangan
- WFH sebagai direct check-in (tanpa approval)
- Daily plan mandatory
### 3. Leave Requests (`/dashboard/leave-requests`)
- Request types: Cuti Tahunan, Sakit, WFH, Izin
- No lead time requirement
- WFH single day only
### 4. Request Approval (`/dashboard/request-approval`)
- HR Admin approval interface
- Pending/history tabs
- Approve/reject dengan notes
### 5. Team Reports (`/dashboard/team`)
- Attendance summary
- Performance insights
- Team status overview
### 6. Theme System
- Light/Dark mode toggle
- Persistent preference (localStorage)
- Adaptive colors per theme
## 🛠️ Getting Started
```bash
# Install dependencies
npm install
# Run development server
npm run dev
# Open browser
http://localhost:3000
```
## 📋 Documentation Files
| File | Description |
|------|-------------|
| `Konteks.md` | Ringkasan pengembangan dan perubahan terkini |
| `implementation_plan.md` | Detailed UI/UX specification |
## 🔧 Known Issues
1. **Tailwind `dark:` prefix** - Tidak berfungsi, gunakan CSS variables atau JS conditional
2. **TypeScript lint errors** - IDE warnings, tidak mempengaruhi runtime
3. **Module not found** - IDE environment issue, compile tetap berhasil
## 📝 Recent Updates (27 Des 2025)
- ✅ Header profile: Conditional colors (blue/gold per theme)
- ✅ Career Milestone: Gold accent colors
- ✅ Request Approval: Reverted to emoji style
- ✅ Sidebar: Cleaned up section headers
---
*Last Updated: 27 Desember 2025*