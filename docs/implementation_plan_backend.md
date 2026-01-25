# 🗄️ Backend Implementation Plan: WSC IMS Supabase Integration

> **Focus Area:** Database Schema, RLS Policies, Business Logic, & API Design

---

## I. Business Rules Summary

### 1.1 Employment Types & Entitlements

| Status | Nama | WFH/Minggu | WFA/Tahun | Cuti/Tahun |
|--------|------|:----------:|:---------:|:----------:|
| **PKWTT** | Karyawan Tetap | 1x | 30 hari | 15 hari |
| **PKWT** | Karyawan Kontrak | 1x | ❌ Tidak ada | 1 hari/bulan kerja |
| **Intern** | Magang | 2x | ❌ Tidak ada | ❌ Tidak ada |

### 1.2 Clock In/Clock Out Rules (UPDATED - 29 Dec 2024)

> [!NOTE]
> **Terminologi diubah dari "Check-in/Check-out" menjadi "Clock In/Clock Out"**

| Rule | Value | Notes |
|------|-------|-------|
| **Clock In Window** | 07:45 - 08:30 WIB | Late jika > 08:30 |
| **Clock Out Start** | 17:00 WIB | Minimal jam pulang |
| **Wajib Clock In** | Senin - Jumat | Kecuali approved leave/sick |
| **Business Trip (Field)** | Bebas jam | Tidak dianggap late |
| **Force Majeure** | Same-day sick/leave | Tidak dianggap late |

### 1.2.1 History Tracking (NEW - 29 Dec 2024)

| Aspect | Description |
|--------|-------------|
| **Data Stored** | clock_in_time, clock_out_time, status, is_late, location |
| **User Access** | View own history in profile/attendance page |
| **Owner Access** | View all employees' clock in/out history |
| **HR Access** | View all employees' history (read-only) |

**Database Function for History:**

```sql
-- Get clock in/out history for user or all employees (owner/HR)
CREATE OR REPLACE FUNCTION get_clockin_history(
  p_user_id uuid DEFAULT NULL,  -- NULL = all employees (owner/HR only)
  p_start_date date DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  user_id uuid,
  user_name text,
  checkin_date date,
  status text,
  clock_in_time time,
  clock_out_time time,
  is_late boolean,
  work_hours interval
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.user_id,
    p.full_name,
    dc.checkin_date,
    dc.status,
    dc.clock_in_time,
    dc.clock_out_time,
    dc.is_late,
    (dc.clock_out_time - dc.clock_in_time) as work_hours
  FROM public.daily_checkins dc
  JOIN public.profiles p ON dc.user_id = p.id
  WHERE 
    (p_user_id IS NULL OR dc.user_id = p_user_id)
    AND dc.checkin_date BETWEEN p_start_date AND p_end_date
  ORDER BY dc.checkin_date DESC, p.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 1.3 Status Types & Clock In/Out Requirement

| Status | Perlu Clock In | Perlu Clock Out | Pre-approval? |
|--------|:--------------:|:---------------:|:-------------:|
| **Office (WFO)** | ✅ | ✅ | ❌ |
| **WFH** | ✅ | ✅ | ✅ (auto-lock status) |
| **WFA** | ✅ | ✅ | ✅ (auto-lock status) |
| **Field (Dinas)** | ✅ (bebas jam) | ✅ | ⚠️ Optional |
| **Sick** | ❌ | ❌ | ✅ atau same-day |
| **Leave (Cuti)** | ❌ | ❌ | ✅ |

### 1.3.1 Smart Check-in Auto-Fill Logic (NEW - 29 Dec 2024)

> [!IMPORTANT]
> **Backend harus mengecek approved requests sebelum user check-in.**

| Kondisi | Backend Behavior |
|---------|------------------|
| **Approved WFH hari ini** | Lock status ke WFH only, user tetap check-in manual |
| **Approved WFA hari ini** | Lock status ke WFA only, user tetap check-in manual |
| **Approved Sick hari ini** | AUTO-INSERT daily_checkins record (no user action) |
| **Approved Leave hari ini** | AUTO-INSERT daily_checkins record (no user action) |
| **Approved Business Trip** | AUTO-INSERT daily_checkins record (no user action) |

**Database Function Required:**

```sql
-- Cron job atau trigger untuk auto-fill checkins pada 07:45 WIB
CREATE OR REPLACE FUNCTION auto_fill_checkins_from_requests()
RETURNS void AS $$
BEGIN
  -- Insert checkin records untuk approved sick/leave/field requests
  INSERT INTO public.daily_checkins (user_id, checkin_date, status, is_late, request_id)
  SELECT 
    ar.user_id,
    CURRENT_DATE,
    ar.request_type,
    false,  -- Never late for auto-fill
    ar.id
  FROM public.attendance_requests ar
  WHERE 
    ar.status = 'approved'
    AND CURRENT_DATE BETWEEN ar.start_date AND ar.end_date
    AND ar.request_type IN ('sick', 'leave', 'field')
    AND NOT EXISTS (
      SELECT 1 FROM public.daily_checkins dc 
      WHERE dc.user_id = ar.user_id AND dc.checkin_date = CURRENT_DATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get approved request for today (untuk frontend check)
CREATE OR REPLACE FUNCTION get_today_approved_request(p_user_id uuid)
RETURNS TABLE (
  request_type text,
  is_auto_fill boolean,
  request_id uuid
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ar.request_type,
    ar.request_type IN ('sick', 'leave', 'field') as is_auto_fill,
    ar.id
  FROM public.attendance_requests ar
  WHERE 
    ar.user_id = p_user_id
    AND ar.status = 'approved'
    AND CURRENT_DATE BETWEEN ar.start_date AND ar.end_date
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 1.3.2 Dynamic Feedback Message Logic (NEW - 29 Dec 2024)

> [!TIP]
> **Backend function untuk generate pesan feedback berdasarkan konteks check-in.**

```sql
-- Get appropriate feedback message after check-in
CREATE OR REPLACE FUNCTION get_checkin_feedback_message(
  p_user_id uuid,
  p_status text,
  p_is_late boolean,
  p_is_force_majeure boolean DEFAULT false
)
RETURNS jsonb AS $$
DECLARE
  v_message_pool jsonb;
  v_selected_message text;
  v_emoji text;
  v_reminder text;
BEGIN
  -- Message pools based on scenario
  CASE 
    -- WFO On-time
    WHEN p_status = 'office' AND NOT p_is_late THEN
      v_message_pool := '["Mantap! Kamu datang tepat waktu hari ini! 🎯", "Good job! Semangat kerja hari ini! 💪", "Pagi yang produktif dimulai dari tepat waktu! ☀️"]'::jsonb;
      v_emoji := '🏢';
      v_reminder := NULL;
      
    -- WFO Late
    WHEN p_status = 'office' AND p_is_late THEN
      v_message_pool := '["Oops, telat ya hari ini. Yuk besok lebih pagi! 😅", "Tidak apa-apa, yang penting sekarang sudah hadir! 💪", "Semoga macetnya tidak terlalu menyebalkan 🚗"]'::jsonb;
      v_emoji := '⚠️';
      v_reminder := NULL;
      
    -- WFH On-time
    WHEN p_status = 'wfh' AND NOT p_is_late THEN
      v_message_pool := '["Nice! WFH tapi tetap on-time, mantap! 🏠✨", "Sudah siap kerja dari rumah! 💻", "WFH mode ON! Pastikan tetap produktif ya! 🎯"]'::jsonb;
      v_emoji := '🏠';
      v_reminder := 'Ingat: Pastikan HP selalu aktif dan mudah dihubungi. Jangan diemin chat/call lebih dari 30 menit ya! 📱';
      
    -- WFH Late
    WHEN p_status = 'wfh' AND p_is_late THEN
      v_message_pool := '["Hayo ngaku, tadi snooze alarm berapa kali? 😴💤", "Jangan tidur lagi ya! Kasurnya menggoda memang 🛏️", "Oke sudah check-in, sekarang jangan hibernasi lagi 😄"]'::jsonb;
      v_emoji := '⏰';
      v_reminder := 'Ingat: Pastikan HP selalu aktif dan mudah dihubungi. Jangan diemin chat/call lebih dari 30 menit ya! 📱';
      
    -- Pre-approved Sick
    WHEN p_status = 'sick' AND NOT p_is_force_majeure THEN
      v_message_pool := '["Eh, ngapain buka ini? 😅 Tenang, ga perlu absen kok. Kamu sudah tercatat izin sakit. Istirahatlah yang cukup ya! Get well soon! 💚🩹"]'::jsonb;
      v_emoji := '🏥';
      v_reminder := NULL;
      
    -- Force Majeure Sick
    WHEN p_status = 'sick' AND p_is_force_majeure THEN
      v_message_pool := '["Waduh, sakit ya? 😢 Semoga lekas pulih! Get well soon! 💪🩹 Fokus istirahat dulu, kerjaan bisa ditangani nanti."]'::jsonb;
      v_emoji := '🏥';
      v_reminder := NULL;
      
    -- Pre-approved Leave
    WHEN p_status = 'leave' AND NOT p_is_force_majeure THEN
      v_message_pool := '["Kamu lagi izin/cuti loh! 🏖️ Ga perlu absen, santai aja. Status kamu sudah tercatat. Semoga urusannya cepat selesai ya! 🙌"]'::jsonb;
      v_emoji := '📅';
      v_reminder := NULL;
      
    -- Force Majeure Leave
    WHEN p_status = 'leave' AND p_is_force_majeure THEN
      v_message_pool := '["Izin mendadak ya? Tidak apa-apa! 🙏 Semoga urusannya bisa cepat selesai. Take care dan kabari kalau sudah beres ya!"]'::jsonb;
      v_emoji := '📅';
      v_reminder := NULL;
      
    -- Business Trip / Field
    WHEN p_status = 'field' THEN
      v_message_pool := '["Semangat di lapangan! 💼🚗 Hati-hati di jalan dan sukses dengan tugasnya ya!"]'::jsonb;
      v_emoji := '🚗';
      v_reminder := NULL;
      
    ELSE
      v_message_pool := '["Selamat bekerja! 💪"]'::jsonb;
      v_emoji := '👋';
      v_reminder := NULL;
  END CASE;
  
  -- Random select from pool
  v_selected_message := v_message_pool->(floor(random() * jsonb_array_length(v_message_pool))::int)::text;
  
  RETURN jsonb_build_object(
    'message', v_selected_message,
    'emoji', v_emoji,
    'reminder', v_reminder,
    'status', p_status,
    'is_late', p_is_late
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 1.4 Approval Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    REQUEST SUBMISSION                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  📧 NOTIFICATION                                             │
│  • Owner: Email (via Resend) + In-app                       │
│  • HR: In-app only (viewer)                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  ✅ APPROVAL                                                 │
│  • ONLY Owner can approve/reject                            │
│  • HR can view all requests (read-only)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## II. Updated Database Schema

### 2.1 Profiles Table (Updated)

```sql
-- Drop existing table if needed and recreate with new fields
CREATE TABLE public.profiles (
  id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  full_name text,
  avatar_url text,
  
  -- Role & Access
  role text NOT NULL DEFAULT 'employee'::text 
    CHECK (role IN ('owner', 'hr', 'employee')),
  
  -- Job Information
  job_type text DEFAULT 'analyst'::text 
    CHECK (job_type IN ('analyst', 'bisdev', 'sales', 'intern', 'hr')),
  job_level text DEFAULT 'L1'::text,
  department text,
  
  -- Employment Status (NEW)
  employment_type text NOT NULL DEFAULT 'pkwt'::text 
    CHECK (employment_type IN ('pkwtt', 'pkwt', 'intern')),
  contract_start_date date,
  contract_end_date date,  -- NULL for PKWTT
  
  -- Tenure
  join_date date,
  tenure_months integer DEFAULT 0,
  
  -- Quota Balances (calculated or cached)
  wfh_used_this_week integer DEFAULT 0,
  wfa_used_this_year integer DEFAULT 0,
  leave_balance integer DEFAULT 0,  -- Calculated based on employment_type
  
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

-- Trigger to auto-calculate leave balance
CREATE OR REPLACE FUNCTION calculate_leave_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.employment_type = 'pkwtt' THEN
    NEW.leave_balance := 15;
  ELSIF NEW.employment_type = 'pkwt' THEN
    -- 1 day per month worked
    NEW.leave_balance := GREATEST(0, EXTRACT(MONTH FROM AGE(CURRENT_DATE, NEW.join_date))::integer);
  ELSE
    NEW.leave_balance := 0;  -- Intern
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_leave_balance
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION calculate_leave_balance();
```

### 2.2 Daily Check-ins Table (Updated)

```sql
CREATE TABLE public.daily_checkins (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Date & Time
  checkin_date date NOT NULL DEFAULT CURRENT_DATE,
  checkin_time time without time zone,
  checkout_time time without time zone,
  
  -- Status
  status text NOT NULL 
    CHECK (status IN ('office', 'wfh', 'wfa', 'field', 'sick', 'leave', 'alpha')),
  is_late boolean DEFAULT false,
  late_reason text,  -- Force majeure explanation
  
  -- Location (for WFA/Field)
  location text,
  
  -- Daily Plan (JSONB array)
  daily_plan jsonb DEFAULT '[]'::jsonb,
  
  -- Link to approved request (auto-lock)
  request_id uuid REFERENCES public.attendance_requests(id),
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT daily_checkins_pkey PRIMARY KEY (id),
  CONSTRAINT unique_user_date UNIQUE (user_id, checkin_date)
);

-- Index for fast lookups
CREATE INDEX idx_checkins_user_date ON daily_checkins(user_id, checkin_date DESC);
CREATE INDEX idx_checkins_date ON daily_checkins(checkin_date);
```

### 2.3 Daily Tasks Table (NEW - Normalized)

```sql
-- Separate table for better tracking of carried-over tasks
CREATE TABLE public.daily_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Task Content
  text text NOT NULL,
  project text,  -- Optional project name
  priority text DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  
  -- Status
  completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  
  -- Date Tracking (for carry-over)
  created_date date NOT NULL DEFAULT CURRENT_DATE,  -- Original creation
  target_date date NOT NULL DEFAULT CURRENT_DATE,   -- Current target
  carried_count integer DEFAULT 0,  -- How many times carried over
  
  -- Link to check-in
  checkin_id uuid REFERENCES public.daily_checkins(id),
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT daily_tasks_pkey PRIMARY KEY (id)
);

-- Index for fetching today's tasks + incomplete from past
CREATE INDEX idx_tasks_user_incomplete ON daily_tasks(user_id, completed, target_date);
```

### 2.4 Attendance Requests Table (Updated)

```sql
CREATE TABLE public.attendance_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Request Details
  request_type text NOT NULL 
    CHECK (request_type IN ('wfh', 'wfa', 'sick', 'leave', 'field')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  
  -- For sick/leave - supporting document
  attachment_url text,
  
  -- Approval
  status text NOT NULL DEFAULT 'pending'::text 
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamp with time zone,
  rejection_reason text,
  
  -- Notifications sent
  notification_sent boolean DEFAULT false,
  email_sent_at timestamp with time zone,
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT attendance_requests_pkey PRIMARY KEY (id),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Index for pending requests
CREATE INDEX idx_requests_pending ON attendance_requests(status) WHERE status = 'pending';
CREATE INDEX idx_requests_user ON attendance_requests(user_id, created_at DESC);
```

### 2.5 Notifications Table (NEW)

```sql
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  
  -- Target
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Content
  type text NOT NULL 
    CHECK (type IN ('request_submitted', 'request_approved', 'request_rejected', 
                    'reminder_checkin', 'task_overdue', 'system')),
  title text NOT NULL,
  message text NOT NULL,
  
  -- Related entity
  reference_type text,  -- 'attendance_request', 'daily_checkin', etc.
  reference_id uuid,
  
  -- Status
  is_read boolean DEFAULT false,
  read_at timestamp with time zone,
  
  -- Email status (for owner notifications)
  email_sent boolean DEFAULT false,
  email_sent_at timestamp with time zone,
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT notifications_pkey PRIMARY KEY (id)
);

-- Index for unread notifications
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
```

### 2.6 Quota History Table (NEW - For Tracking)

```sql
CREATE TABLE public.quota_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Quota Type
  quota_type text NOT NULL 
    CHECK (quota_type IN ('wfh', 'wfa', 'leave', 'sick')),
  
  -- Period
  year integer NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  week_number integer,  -- For WFH weekly tracking
  
  -- Usage
  used_days integer DEFAULT 0,
  
  -- Related request
  request_id uuid REFERENCES public.attendance_requests(id),
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT quota_usage_pkey PRIMARY KEY (id)
);

-- Index for quota checks
CREATE INDEX idx_quota_user_year ON quota_usage(user_id, year, quota_type);
```

### 2.7 Announcements Table (NEW - For Owner Messages)

```sql
-- Owner broadcast messages to all users
CREATE TABLE public.announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  
  -- Content
  title text,
  message text NOT NULL,
  
  -- Visibility
  is_pinned boolean DEFAULT false,
  expires_at timestamp with time zone,  -- NULL = never expires
  
  -- Metadata
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT announcements_pkey PRIMARY KEY (id)
);

-- Index for active announcements
CREATE INDEX idx_announcements_active ON announcements(created_at DESC) 
  WHERE expires_at IS NULL OR expires_at > now();

-- RLS: All can view, only Owner can manage
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All users can view announcements"
  ON public.announcements FOR SELECT
  USING (expires_at IS NULL OR expires_at > now());

CREATE POLICY "Owner can manage announcements"
  ON public.announcements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );
```

---

## III. Row Level Security (RLS) Policies

### 3.1 Profiles RLS

```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Everyone can view active profiles (for team views)
CREATE POLICY "View active profiles"
  ON public.profiles FOR SELECT
  USING (is_active = true);

-- Users can update their own profile (limited fields)
CREATE POLICY "Update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Owner can update any profile
CREATE POLICY "Owner can update all"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Owner can insert new profiles
CREATE POLICY "Owner can insert"
  ON public.profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );
```

### 3.2 Daily Checkins RLS

```sql
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

-- Users can view their own check-ins
CREATE POLICY "View own checkins"
  ON public.daily_checkins FOR SELECT
  USING (auth.uid() = user_id);

-- HR & Owner can view all check-ins
CREATE POLICY "HR/Owner view all"
  ON public.daily_checkins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'hr')
    )
  );

-- Users can insert their own check-in
CREATE POLICY "Insert own checkin"
  ON public.daily_checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own check-in (same day only)
CREATE POLICY "Update own checkin today"
  ON public.daily_checkins FOR UPDATE
  USING (auth.uid() = user_id AND checkin_date = CURRENT_DATE);
```

### 3.3 Attendance Requests RLS

```sql
ALTER TABLE public.attendance_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "View own requests"
  ON public.attendance_requests FOR SELECT
  USING (auth.uid() = user_id);

-- HR & Owner can view all requests
CREATE POLICY "HR/Owner view all requests"
  ON public.attendance_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'hr')
    )
  );

-- Users can insert their own requests
CREATE POLICY "Insert own request"
  ON public.attendance_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ONLY Owner can approve/reject (update status)
CREATE POLICY "Owner can approve"
  ON public.attendance_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Users can cancel their own pending requests
CREATE POLICY "Cancel own pending"
  ON public.attendance_requests FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (status = 'cancelled');
```

---

## IV. Database Functions

### 4.1 Get Today's Tasks (Including Carried Over)

```sql
CREATE OR REPLACE FUNCTION get_todays_tasks(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  text text,
  project text,
  priority text,
  completed boolean,
  completed_at timestamp with time zone,
  created_date date,
  carried_count integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.text,
    t.project,
    t.priority,
    t.completed,
    t.completed_at,
    t.created_date,
    t.carried_count
  FROM public.daily_tasks t
  WHERE t.user_id = p_user_id
    AND (
      -- Today's tasks
      t.target_date = CURRENT_DATE
      -- OR incomplete tasks from past days
      OR (t.completed = false AND t.target_date < CURRENT_DATE)
    )
  ORDER BY 
    t.completed ASC,  -- Incomplete first
    CASE t.priority 
      WHEN 'high' THEN 1 
      WHEN 'medium' THEN 2 
      ELSE 3 
    END,
    t.created_date ASC;  -- Oldest first
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4.2 Check-in Validation Function

```sql
CREATE OR REPLACE FUNCTION validate_checkin(
  p_user_id uuid,
  p_status text,
  p_checkin_time time
)
RETURNS jsonb AS $$
DECLARE
  v_employment_type text;
  v_wfh_used integer;
  v_wfa_used integer;
  v_leave_balance integer;
  v_has_approved_request boolean;
  v_is_late boolean;
  v_result jsonb;
BEGIN
  -- Get user info
  SELECT 
    employment_type, 
    wfh_used_this_week,
    wfa_used_this_year,
    leave_balance
  INTO v_employment_type, v_wfh_used, v_wfa_used, v_leave_balance
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Check for approved request today
  SELECT EXISTS (
    SELECT 1 FROM public.attendance_requests
    WHERE user_id = p_user_id
      AND status = 'approved'
      AND CURRENT_DATE BETWEEN start_date AND end_date
      AND request_type = p_status
  ) INTO v_has_approved_request;
  
  -- Calculate late status
  v_is_late := CASE
    WHEN p_status IN ('field', 'sick', 'leave') THEN false
    WHEN p_checkin_time > '08:30:00'::time THEN true
    ELSE false
  END;
  
  -- Validate based on status
  v_result := jsonb_build_object(
    'valid', true,
    'is_late', v_is_late,
    'has_approved_request', v_has_approved_request,
    'message', null
  );
  
  -- WFH validation
  IF p_status = 'wfh' THEN
    IF v_employment_type = 'intern' AND v_wfh_used >= 2 THEN
      v_result := jsonb_build_object(
        'valid', false,
        'message', 'Quota WFH minggu ini sudah habis (max 2x untuk intern)'
      );
    ELSIF v_employment_type != 'intern' AND v_wfh_used >= 1 THEN
      v_result := jsonb_build_object(
        'valid', false,
        'message', 'Quota WFH minggu ini sudah habis (max 1x)'
      );
    ELSIF NOT v_has_approved_request THEN
      v_result := jsonb_build_object(
        'valid', false,
        'message', 'WFH memerlukan approval terlebih dahulu'
      );
    END IF;
  END IF;
  
  -- WFA validation
  IF p_status = 'wfa' THEN
    IF v_employment_type != 'pkwtt' THEN
      v_result := jsonb_build_object(
        'valid', false,
        'message', 'WFA hanya tersedia untuk karyawan tetap (PKWTT)'
      );
    ELSIF v_wfa_used >= 30 THEN
      v_result := jsonb_build_object(
        'valid', false,
        'message', 'Quota WFA tahun ini sudah habis (max 30 hari)'
      );
    ELSIF NOT v_has_approved_request THEN
      v_result := jsonb_build_object(
        'valid', false,
        'message', 'WFA memerlukan approval terlebih dahulu'
      );
    END IF;
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4.3 Carry Over Incomplete Tasks (Daily Cron)

```sql
CREATE OR REPLACE FUNCTION carry_over_incomplete_tasks()
RETURNS void AS $$
BEGIN
  UPDATE public.daily_tasks
  SET 
    target_date = CURRENT_DATE,
    carried_count = carried_count + 1,
    updated_at = now()
  WHERE 
    completed = false 
    AND target_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule with pg_cron (run daily at 00:00 WIB / 17:00 UTC)
-- SELECT cron.schedule('carry-over-tasks', '0 17 * * *', 'SELECT carry_over_incomplete_tasks()');
```

### 4.4 Reset Weekly WFH Counter (Weekly Cron)

```sql
CREATE OR REPLACE FUNCTION reset_weekly_wfh()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET wfh_used_this_week = 0
  WHERE wfh_used_this_week > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule with pg_cron (run every Monday at 00:00 WIB)
-- SELECT cron.schedule('reset-wfh-weekly', '0 17 * * 0', 'SELECT reset_weekly_wfh()');
```

---

## V. Edge Functions (Supabase)

### 5.1 Send Notification on Request Submit

```typescript
// supabase/functions/notify-request/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

serve(async (req) => {
  const { record, type } = await req.json()
  
  if (type !== 'INSERT') return new Response('OK')
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  // Get requester info
  const { data: requester } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', record.user_id)
    .single()
  
  // Get owner info
  const { data: owner } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('role', 'owner')
    .single()
  
  // Get all HR users
  const { data: hrUsers } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'hr')
  
  const requestTypeLabel = {
    wfh: 'Work From Home',
    wfa: 'Work From Anywhere',
    sick: 'Sakit',
    leave: 'Cuti',
    field: 'Tugas Lapangan'
  }[record.request_type]
  
  // Create in-app notification for Owner
  await supabase.from('notifications').insert({
    user_id: owner.id,
    type: 'request_submitted',
    title: 'New Request Pending',
    message: `${requester.full_name} mengajukan ${requestTypeLabel} untuk ${record.start_date}`,
    reference_type: 'attendance_request',
    reference_id: record.id
  })
  
  // Create in-app notification for HR (view only)
  for (const hr of hrUsers || []) {
    await supabase.from('notifications').insert({
      user_id: hr.id,
      type: 'request_submitted',
      title: 'New Request Submitted',
      message: `${requester.full_name} mengajukan ${requestTypeLabel}`,
      reference_type: 'attendance_request',
      reference_id: record.id
    })
  }
  
  // Send email to Owner via Resend
  if (owner.email) {
    await resend.emails.send({
      from: 'HRIS <noreply@wsc-hris.com>',
      to: owner.email,
      subject: `[Action Required] ${requestTypeLabel} Request from ${requester.full_name}`,
      html: `
        <h2>New Attendance Request</h2>
        <p><strong>${requester.full_name}</strong> has submitted a request:</p>
        <ul>
          <li><strong>Type:</strong> ${requestTypeLabel}</li>
          <li><strong>Date:</strong> ${record.start_date} - ${record.end_date}</li>
          <li><strong>Reason:</strong> ${record.reason || 'Not provided'}</li>
        </ul>
        <p><a href="${Deno.env.get('APP_URL')}/dashboard/request-approval">Review Request</a></p>
      `
    })
    
    // Mark email as sent
    await supabase
      .from('attendance_requests')
      .update({ notification_sent: true, email_sent_at: new Date().toISOString() })
      .eq('id', record.id)
  }
  
  return new Response('OK')
})
```

### 5.2 Database Trigger for Edge Function

```sql
-- Trigger to call edge function on new request
CREATE OR REPLACE FUNCTION notify_on_request()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/notify-request',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'type', TG_OP,
      'record', row_to_json(NEW)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_request_submitted
  AFTER INSERT ON public.attendance_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_request();
```

---

## VI. API Patterns (Frontend Usage)

### 6.1 Check-in Flow

```typescript
// lib/supabase/checkin.ts
export async function performCheckin(
  status: AttendanceStatus,
  dailyPlan: Task[]
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const now = new Date()
  const checkinTime = now.toTimeString().slice(0, 8)
  
  // Validate check-in
  const { data: validation } = await supabase
    .rpc('validate_checkin', {
      p_user_id: user.id,
      p_status: status,
      p_checkin_time: checkinTime
    })
  
  if (!validation.valid) {
    throw new Error(validation.message)
  }
  
  // Create check-in record
  const { data: checkin, error } = await supabase
    .from('daily_checkins')
    .insert({
      user_id: user.id,
      status,
      checkin_time: checkinTime,
      is_late: validation.is_late,
      request_id: validation.request_id || null
    })
    .select()
    .single()
  
  if (error) throw error
  
  // Insert tasks
  if (dailyPlan.length > 0) {
    await supabase.from('daily_tasks').insert(
      dailyPlan.map(task => ({
        user_id: user.id,
        text: task.text,
        project: task.project,
        priority: task.priority,
        checkin_id: checkin.id
      }))
    )
  }
  
  return checkin
}
```

### 6.2 Fetch Today's Tasks (Including Carried Over)

```typescript
// lib/supabase/tasks.ts
export async function getTodaysTasks() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .rpc('get_todays_tasks', { p_user_id: user.id })
  
  if (error) throw error
  return data
}
```

---

## VII. Verification Plan

### 7.1 Database Tests

1. **Schema Validation**
   - Run all CREATE TABLE statements in Supabase SQL Editor
   - Verify constraints work (invalid employment_type, etc.)

2. **RLS Policy Tests**
   - Test as employee: can only see own data
   - Test as HR: can view all, cannot approve
   - Test as owner: can approve requests

3. **Function Tests**
   - `validate_checkin`: Test with various scenarios
   - `get_todays_tasks`: Test carry-over logic
   - `carry_over_incomplete_tasks`: Manual test

### 7.2 Integration Tests

1. **Check-in Flow**
   - Check-in as WFO → success
   - Check-in as WFH without approval → fail
   - Check-in as WFH with approval → success (status locked)
   - Late check-in detection

2. **Request Flow**
   - Submit request → notification created
   - Owner approves → status updated
   - Email sent via Resend

### 7.3 Manual Testing Checklist

- [ ] Create user with PKWTT → gets 15 days leave
- [ ] Create user with PKWT → gets 1 day/month leave
- [ ] Submit WFH request → Owner gets email
- [ ] Approve WFH → User can check-in with WFH status
- [ ] Check-in at 08:35 → marked as late
- [ ] Check-in as Field at 14:00 → NOT marked as late
- [ ] Incomplete task from yesterday → appears today with carried_count = 1

---

## VIII. Implementation Order

### Phase 1: Core Tables
1. Update `profiles` with employment_type
2. Update `daily_checkins` schema
3. Create `daily_tasks` table
4. Create `notifications` table

### Phase 2: RLS & Functions
1. Apply RLS policies
2. Create validation functions
3. Create cron job functions

### Phase 3: Edge Functions
1. Setup Resend integration
2. Deploy notification edge function
3. Create database triggers

### Phase 4: Frontend Integration
1. Update check-in page
2. Update request forms
3. Implement real-time notifications

---

*Document created: 27 Desember 2024*

---

## IX. Future Implementation: Hybrid Attendance 2.0 (Planned Jan 2026)

Based on new requirements for Hybrid Workflow (Machine + Manual + Requests).

### 9.1 New Tables

#### `raw_attendance_logs` (Machine Raw Data)
Stores raw data exactly as received from Fingerspot machine CSV/API.
*   Columns: `cloud_id`, `id` (Employee ID), `nama`, `tanggal_absensi`, `jam_absensi`, `verifikasi`, `tipe_absensi`, `jabatan`, `kantor`.

#### `daily_attendance` (Master Table)
Single Source of Truth for Dashboard & KPI.
*   Logic: **First In, Last Out**.
*   Populated by:
    1.  **Machine**: Auto-process from `raw_attendance_logs` (Earliest scan = In, Latest scan = Out).
    2.  **Requests**: Auto-insert upon approval (Sick/Leave/Trip).
    3.  **Manual App**: Only for WFH/WFA or Full-Online employees.

### 9.2 Full-Online Employee Logic
*   **Flag**: `profiles.is_full_online` (Boolean).
*   **Behavior**:
    *   If `true`: Frontend Clock-In button is **ALWAYS ENABLED** (ignoring machine data).
    *   If `false` (Regular): Frontend Clock-In button is **DISABLED** if machine data exists OR if in Office.

