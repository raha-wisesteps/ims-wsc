# Wise Steps Consulting - Integrated ERP & HRIS (v1.0)

**The Definitive One-Stop Solution for Tourism Consulting Management**

This platform represents a paradigm shift in organizational management, unifying **Internal Management Systems (IMS)**, **Enterprise Resource Planning (ERP)**, and **Sustainability Information Systems (SIS)** into a single, cohesive ecosystem. By eliminating data silos, Wise Steps Consulting empowers decision-makers with real-time insights across every operational vertical.

![Dashboard Preview](public\preview.png)

---

## 🌟 Why a "One-Stop Solution"?

In the modern consulting landscape, efficiency is paramount. This system replaces fragmented tools (spreadsheets, separate HR apps, finance tools) with a centralized brain:

1.  **Unified Data Architecture**: Employee performance data (HRIS) directly influences Project Resource Allocation (ERP).
2.  **Seamless Workflows**: A "Business Trip" request in HR automatically:
    *   Deducts from the travel budget (Finance).
    *   Calculates carbon footprint based on distance (Sustainability).
    *   Updates the employee's status to "Business Trip" (Attendance).
3.  **Holistic Decision Making**: The **Command Center** synthesizes data from all modules—Finance, HR, and Operations—to give Executives a true 360-degree view of company health.

---

## 🏛 Internal Management Systems (IMS)

The backbone of organizational efficiency, ensuring precise administration and workforce empowerment.

### 1. Human Resource Information System (HRIS)
A complete suite for managing the employee lifecycle with precision and empathy.

*   **Smart Attendance & Tracking**:
    *   **GPS Validation**: Ensures field staff checks in from authorized locations (Office/Client Site).
    *   **Dynamic Status**: Live tracking of **WFO** (Office), **WFH** (Home), **Remote**, or **Business Trip**.
    *   **Auto-Away Logic**: Automatically marks users as "Away" if they fail to check in, ensuring accurate availability data.
*   **Leave & Permit Management**:
    *   **Automated Quotas**: Real-time calculation of Annual Leave, WFH (Weekly Limit), and WFA (Yearly Limit) balances.
    *   **Comprehensive Request Types**:
        *   *Standard*: Annual Leave, Sick Leave (with certificate upload).
        *   *Special*: Menstrual Leave, Maternity/Paternity, Hajj, Marriage, Grief (Family Death).
    *   **Overtime Conversion**: A unique feature allowing employees to convert extra hours worked into either **Paid Overtime** or **Additional Leave Quota**.
*   **My Request Portal**:
    *   **Self-Service**: Employees can submit requests for WFH, Overtime, Training, or Reimbursement via a unified carousel interface.
    *   **Real-time Tracking**: "Pending", "Approved", and "Rejected" status updates with visual indicators.
*   **Performance & Talent**:
    *   **KPI Monitoring**: Semester-based performance reviews with quantitative scoring.
    *   **Talent Pool**: A dedicated database for managing potential candidates and external experts.
    *   **Spotlight**: Automated recognition of top performers on the Command Center dashboard.

### 2. Workload Management
data-driven capacity planning to prevent burnout and optimize resource allocation.

*   **Capacity Logic**: Automatically assigns "Slot" limits based on role (e.g., Interns = 8 slots, Managers = 14 slots).
*   **Weighted Activities**:
    *   **Projects**: High (4 slots), Medium (3 slots), Low (2 slots).
    *   **Routine**: Proposals, Presentations, Support.
*   **Visual Status Indicators**:
    *   🔵 **Idle** (<70% capacity)
    *   🟢 **Safe** (70-80% capacity)
    *   🟠 **Heavy** (80-100% capacity)
    *   🔴 **Overload** (>100% capacity)

### 3. Knowledge Hub
A digital repository designed to democratize access to organizational wisdom.
*   **Centralized Library**: Categorized storage for Standard Operating Procedures (SOPs), Templates, E-books, and Policy Documents.
*   **Smart Tagging**: Find resources instantly using intelligent metadata tags.
*   **Role-Based Visibility**: Confidential documents are automatically hidden from Interns, ensuring robust data security while maintaining transparency for full-time staff.

---

## ⚙️ Enterprise Resource Planning (ERP)

The engine of business growth, managing tangible assets, financial flows, and client relationships.

### 4. Business Development (CRM)
A powerful tool to drive revenue and manage client relationships.
*   **Customer Journey Mapping**: Detailed tracking of every interaction, from initial lead to long-term partnership.
*   **Opportunity Kanban Board**: Visual pipeline management for proposals:
    *   *Columns*: Proposal, Negotiation, On Progress, Invoiced, Paid, Lost.
    *   *Drag & Drop*: Intuitive interface to move opportunities through stages.
*   **Revenue Intelligence**:
    *   Real-time tracking of Invoiced vs. Paid amounts.
    *   **"Terbilang" Feature**: Automatic conversion of numeric values into text (Indonesian Rupiah) for generated invoices and contracts.
*   **Meeting Logs**: Centralized notes ensuring no critical client detail is ever lost.

### 5. Operational Excellence
Tools to manage physical assets and day-to-day logistics.
*   **Asset Management**:
    *   **Digital Registry**: Tracking of Laptops, Vehicles, Cameras, and Office Equipment.
    *   **Asset Lifecycle**: Monitoring of Purchase Value vs. Current Depreciated Value.
    *   **Custody Tracking**: Clear records of which employee is responsible for which asset.
*   **Maintenance System**: Scheduled alerts for vehicle servicing, AC maintenance, and facility repairs.
*   **Inventory Control**: Monitoring of office supplies (Stationery, Pantry) to prevent stockouts.

### 6. Financial Controls
*   **Petty Cash System**:
    *   Digital recording of daily operational expenses.
    *   Real-time balance monitoring with "Low Funds" alerts.
    *   Digital receipt archiving for effortless auditing.
*   **Reimbursement**: Streamlined workflows for employees to claim business expenses.

---

## 🌱 Sustainability Information System (SIS)

Wise Steps Consulting leads by example, embedding environmental accountability into daily operations.

### 7. Environmental Impact Tracking
*   **Carbon "Buttprint" Calculator**:
    *   **Business Travel Integration**: Automatically calculates CO2 emissions based on travel distance and mode (Plane/Train/Car).
    *   **Commuting Logs**: Tracking the environmental impact of daily employee commutes.
*   **Resource Monitoring**:
    *   **Utility Audits**: Monthly logs of Electricity and Water consumption compared against reduction targets.
    *   **Waste Management**: Weekly reporting on waste generation, categorized by **Organic** vs. **Anorganic** to drive recycling efforts.
*   **Community Forum**: A dedicated internal social space for sharing sustainability tips, success stories, and green initiatives.

---

## 🔔 Intelligent Notifications

A robust realtime notification system ensures users never miss an update.

*   **Realtime Channels**: Uses Supabase Realtime to push alerts instantly without page refreshes.
*   **Notification Types**:
    *   ✅ **Success**: Request approved.
    *   ❌ **Rejected**: Request denied (with reason).
    *   📩 **Request New**: Approval needed (for Managers/HR).
    *   ⏰ **Warning**: Approaching deadlines or low quotas.
    *   ⚙️ **System**: Maintenance or system-wide announcements.

---

## 🛠 Technical Architecture

Built on a robust, modern stack designed for scalability and performance.

- **Frontend Core**: [Next.js 16](https://nextjs.org/) (App Router) ensuring SEO friendliness and rapid page loads.
- **UI System**: [Tailwind CSS 4](https://tailwindcss.com/) combined with [Shadcn/ui](https://ui.shadcn.com/) for a reliable, accessible design system.
- **Backend Infrastructure**: [Supabase](https://supabase.com/) providing:
    - **PostgreSQL**: An enterprise-grade relational database.
    - **Row Level Security (RLS)**: Bank-grade security policies ensuring precise data access control.
    - **Realtime Subscriptions**: Providing live updates for dashboard notifications and chat features.
- **Utilities**: `date-fns` (Time), `recharts` (Analytics), `zod` (Validation), `framer-motion` (Animations).

## 🔐 Role-Based Access Control (RBAC) Matrix

A strict permission model ensures data integrity and security across the organization.

| Function | Owner/CEO | Super Admin | HR | BisDev | Office Mgr | Employee | Intern |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Command Center** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **HR Mgmt** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Workload View** | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ (Self) | ⚠️ (Self) |
| **CRM & Revenue** | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Operations** | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Sustainability** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Knowledge Hub** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ (Limited) |
| **My Request** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 📦 Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-repo/wsc-hris-new.git
    cd wsc-hris-new
    ```

2.  **Install dependencies**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Environment Setup**
    Create a `.env.local` file in the root directory:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.

---
© 2026 Wise Steps Consulting. All Rights Reserved.