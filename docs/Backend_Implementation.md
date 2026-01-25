# 🛠️ Backend Implementation Fix: WSC IMS with Context Update

> **Document Status**: `UPDATED` (January 2026)
> **Goal**: Update backend implementation strategy based on latest user feedbacks and requirements.

---

## I. Core Logic Updates

### 1.1 Departments & Roles Structure

| Department | Roles | Access / Features | Notes |
| :--- | :--- | :--- | :--- |
| **Analyst** | Analyst I-III, Consultant I-III | **Standard Dashboard** | KPI weighted (Knowledge > People > Service). |
| **Busdev** | Sales Exec, BizDev I-III | **Bisdev/CRM Page** (Write Access) | KPI weighted (Business focus). Exclusive "Add Project/Client" button access. |
| **HR** | HR Staff | **Human Resource Page** (Future) | Non-KPI evaluation. |
| **Intern** | Intern | **Standard Dashboard** | non-weighted Score (1-5) on all Core Values. |
| **Office** | **Office Manager** | **Operational Page** | **Add-on Layer**: Can be assigned to any role (e.g., Analyst + Office Mgr). Unique access to `/operational`. |
| **Management**| **CEO, Super Admin** | **FULL ACCESS** | Only roles with access to **Command Center**. |

### 1.2 Access Control & Permissions (RBAC)

> **Principle**: Default Deny. Explicit Allow for Roles.

| Page / Feature | Allowed Roles | Behavior for Others |
| :--- | :--- | :--- |
| **Command Center** (`/command-center/*`) | **CEO, Super Admin** | **403 Forbidden** (Redirect to Dashboard) |
| **Operational** (`/operational`) | **Office Manager (Flag)**, CEO, Super Admin | Hidden from sidebar / 403 Forbidden |
| **Human Resource** (`/hr`) | HR, CEO, Super Admin, `is_hr` flag | Hidden / 403 |
| **Bisdev Dashboard** (CRM/Projects) | **Busdev**, `is_busdev` flag | **"Add Client/Project" Button Hidden** for non-Busdevs. |
| **Attendance Upload** | CEO, Super Admin | Hidden / Disabled |

### 1.3 User Flags in `profiles` Table

| Flag | Purpose |
|------|---------|
| `is_office_manager` | Access to Operational page |
| `is_hr` | Read access to HR page |
| `is_busdev` | Read access to CRM/Bisdev page |
| `is_female` | Eligibility for Menstrual & Maternity leave |

---

## II. Quota Management & Resets

### 2.1 Flexible Work Quotas

| Entitlement | Quota | Reset Rule | Notes |
|-------------|-------|------------|-------|
| **WFH** | **1x / week** (Regular), **2x / week** (Intern) | **Weekly (Monday 00:00)** | Based on `wfh_weekly_limit` per user |
| **WFA** | **30 days / year** | **Annual (March 1st)** | Work From Anywhere (travel) |

### 2.2 Leave Quotas

| Entitlement | Quota | Eligibility | Reset Rule |
|-------------|-------|-------------|------------|
| **Cuti Tahunan** | **18 days / year** | **Full-time only** (Intern excluded) | Annual (March 1st) |
| **Libur Ekstra** | **Manual** | All | No Expiry |

### 2.3 Gender-Specific Leave (requires `is_female = true`)

| Entitlement | Quota | Reset Rule |
|-------------|-------|------------|
| **Cuti Haid** | 2 days (day 1 & 2) | Monthly |
| **Cuti Melahirkan** | 3 months | Per event |

### 2.4 Special Paid Leave (Izin Khusus)

| Event | Duration | Notes |
|-------|----------|-------|
| Self Marriage | 3 days | |
| Child's Marriage | 2 days | |
| Wife Giving Birth | 10 days | Paternity |
| Wife Miscarriage | 3 days | |
| Child Circumcision/Baptism | 2 days | |
| Core Family Death (spouse/parent/child) | 2 days | |
| Household Member Death | 1 day | |
| Sibling Death | 1 day | |
| Hajj (first time) | Per Depag schedule | >1yr tenure |
| Government Summons | Per summons | |
| Disaster | Company discretion | |

---

## III. Leave Request Types

### `leave_requests.leave_type` allowed values:

```sql
CHECK (leave_type IN (
  -- Flexible Work
  'wfh', 'wfa',
  -- Annual & Unpaid
  'annual_leave', 'unpaid_leave',
  -- Medical (is_female required for some)
  'sick_leave', 'menstrual_leave', 'maternity', 'miscarriage',
  -- Family Events
  'paternity', 'self_marriage', 'child_marriage', 
  'child_event', 'family_death', 'sibling_death',
  -- Other
  'hajj', 'government', 'disaster',
  -- Non-leave requests
  'overtime', 'training', 'asset', 'reimburse', 'meeting'
))
```

---

## IV. Data Flow & Integration (Hero Slides)

#### **Hero Slide 1: Attendance & Quota**
*   **Source**: `profiles` (quotas), `daily_checkins` (today's status).
*   **Action**: Clock In/Out (connects to Attendance System).

#### **Hero Slide 2: Status & Daily Plan**
*   **Concept**: User inputs status/plan here -> Feeds into **Team Activity**.
*   **Source/Dest**: `daily_tasks`, `profiles.status_message` tables.

#### **Hero Slide 3: KPI Overview**
*   **Source**: `kpi_scores`.
*   **Logic**: 
    *   **Analyst/Busdev**: Calculate Weighted Score.
    *   **Intern**: Calculate Average Score.
    *   **HR**: Show "Performance Review" placeholder or hide.

---

## V. KPI Logic & Weighting

**KPI Scoring Formula:**
`Final Score = Σ (Score Category * Weight Category)`

#### **A. Analyst (Knowledge & People Focus)**
| Core Value | Weight (Staff) | Weight (Supervisor/Consultant) |
| :--- | :---: | :---: |
| Passion for Knowledge | **40%** | **30%** |
| Passion for People | **30%** | **20%** |
| Passion for Service | **20%** | **20%** |
| Passion for Business | **10%** | **15%** |
| Leadership | **0%** | **15%** |

#### **B. Busdev (Business Focus)**
| Core Value | Weight (Sales Exec) | Weight (BizDev) |
| :--- | :---: | :---: |
| Passion for Knowledge | **20%** | **20%** |
| Passion for People | **20%** | **20%** |
| Passion for Service | **20%** | **20%** |
| Passion for Business | **40%** | **35%** |
| Leadership | **0%** | **5%** |

#### **C. Intern (Direct Scoring)**
*   **Method**: Direct Score (1-5) on 5 Core Values.
*   **Formula**: `Average(Scores)` (No weights).

#### **D. HR**
*   **Method**: Non-KPI (Watcher Role).
*   **UI Behavior**: **Hero Slide 3 (KPI) is Hidden**.
