import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ============================================
// CONFIGURATION
// ============================================
const SENDER_EMAIL = "IMS WiseSteps <noreply@wisestepsconsulting.web.id>";
const IMS_CEO_URL = "https://ims.wisestepsconsulting.web.id/dashboard/command-center";
const IMS_HR_URL = "https://ims.wisestepsconsulting.web.id/dashboard/hr";
const IMS_MY_REQUEST_URL = "https://ims.wisestepsconsulting.web.id/dashboard/my-request";

const LEAVE_TYPE_LABELS: Record<string, string> = {
  wfh: "WFH (Work From Home)",
  wfa: "WFA (Work From Anywhere)",
  annual_leave: "Cuti Tahunan",
  sick_leave: "Sakit",
  menstrual_leave: "Cuti Haid",
  maternity: "Cuti Melahirkan",
  miscarriage: "Cuti Keguguran",
  self_marriage: "Izin Pernikahan Sendiri",
  child_marriage: "Izin Pernikahan Anak",
  paternity: "Izin Istri Melahirkan",
  wife_miscarriage: "Izin Istri Keguguran",
  child_event: "Izin Khitanan/Baptis Anak",
  family_death: "Izin Keluarga Inti Meninggal",
  household_death: "Izin Anggota Serumah Meninggal",
  sibling_death: "Izin Saudara Kandung Meninggal",
  hajj: "Izin Ibadah Haji",
  government: "Izin Panggilan Pemerintah",
  disaster: "Izin Bencana",
  other_permission: "Izin Lainnya",
  overtime: "Lembur",
  business_trip: "Perjalanan Dinas",
  training: "Training",
  extra_leave: "Cuti Khusus (Bonus)",
};

const HR_NOTIFY_TYPES = [
  "sick_leave", "self_marriage", "child_marriage", "paternity",
  "wife_miscarriage", "child_event", "family_death", "household_death",
  "sibling_death", "hajj", "government", "disaster", "other_permission",
  "menstrual_leave", "maternity", "miscarriage",
];

// ============================================
// EMAIL TEMPLATES
// ============================================

function buildCeoEmailHtml(
  requesterName: string, leaveType: string,
  startDate: string, endDate: string, reason: string
): string {
  const typeLabel = LEAVE_TYPE_LABELS[leaveType] || leaveType;
  const fmtStart = new Date(startDate).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const fmtEnd = new Date(endDate).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:32px 16px;"><tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <tr><td style="background:linear-gradient(135deg,#3f545f 0%,#2d3e47 100%);padding:28px 32px;text-align:center;">
        <h1 style="color:#e8c559;margin:0;font-size:22px;font-weight:700;">📋 Permintaan Baru</h1>
        <p style="color:#ffffffcc;margin:8px 0 0;font-size:14px;">IMS WiseSteps Consulting</p>
      </td></tr>
      <tr><td style="padding:32px;">
        <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 20px;">Halo, ada permintaan baru yang membutuhkan perhatian Anda:</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fb;border-radius:8px;border:1px solid #e8eaed;margin-bottom:24px;">
          <tr><td style="padding:20px;"><table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:6px 0;color:#666;font-size:13px;width:120px;">Pengaju</td><td style="padding:6px 0;color:#333;font-size:14px;font-weight:600;">${requesterName}</td></tr>
            <tr><td style="padding:6px 0;color:#666;font-size:13px;">Jenis</td><td style="padding:6px 0;"><span style="background-color:#3f545f;color:#e8c559;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;">${typeLabel}</span></td></tr>
            <tr><td style="padding:6px 0;color:#666;font-size:13px;">Tanggal</td><td style="padding:6px 0;color:#333;font-size:14px;">${fmtStart}${startDate !== endDate ? ` — ${fmtEnd}` : ""}</td></tr>
            <tr><td style="padding:6px 0;color:#666;font-size:13px;">Alasan</td><td style="padding:6px 0;color:#333;font-size:14px;">${reason || "-"}</td></tr>
          </table></td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
          <a href="${IMS_CEO_URL}" style="display:inline-block;background:linear-gradient(135deg,#3f545f 0%,#2d3e47 100%);color:#e8c559;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:700;">Buka IMS Sekarang →</a>
        </td></tr></table>
      </td></tr>
      <tr><td style="background-color:#f8f9fb;padding:20px 32px;border-top:1px solid #e8eaed;text-align:center;">
        <p style="color:#999;font-size:12px;margin:0;">Email ini dikirim otomatis oleh sistem IMS WiseSteps Consulting.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

function buildHrEmailHtml(
  requesterName: string, leaveType: string,
  startDate: string, endDate: string, reason: string
): string {
  const typeLabel = LEAVE_TYPE_LABELS[leaveType] || leaveType;
  const fmtStart = new Date(startDate).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const fmtEnd = new Date(endDate).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:32px 16px;"><tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <tr><td style="background:linear-gradient(135deg,#0d9488 0%,#0f766e 100%);padding:28px 32px;text-align:center;">
        <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">✅ Izin/Sakit Telah Disetujui</h1>
        <p style="color:#ffffffcc;margin:8px 0 0;font-size:14px;">Perlu Administrasi HR</p>
      </td></tr>
      <tr><td style="padding:32px;">
        <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 20px;">Halo HR, permintaan berikut telah <strong>disetujui oleh CEO</strong> dan memerlukan tindak lanjut:</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdfa;border-radius:8px;border:1px solid #99f6e4;margin-bottom:24px;">
          <tr><td style="padding:20px;"><table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:6px 0;color:#666;font-size:13px;width:120px;">Karyawan</td><td style="padding:6px 0;color:#333;font-size:14px;font-weight:600;">${requesterName}</td></tr>
            <tr><td style="padding:6px 0;color:#666;font-size:13px;">Jenis</td><td style="padding:6px 0;"><span style="background-color:#0d9488;color:#ffffff;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;">${typeLabel}</span></td></tr>
            <tr><td style="padding:6px 0;color:#666;font-size:13px;">Tanggal</td><td style="padding:6px 0;color:#333;font-size:14px;">${fmtStart}${startDate !== endDate ? ` — ${fmtEnd}` : ""}</td></tr>
            <tr><td style="padding:6px 0;color:#666;font-size:13px;">Alasan</td><td style="padding:6px 0;color:#333;font-size:14px;">${reason || "-"}</td></tr>
          </table></td></tr>
        </table>
        <p style="color:#666;font-size:13px;line-height:1.5;margin:0 0 24px;padding:12px;background:#fffbeb;border-radius:6px;border:1px solid #fde68a;">⚠️ Mohon segera proses administrasi terkait izin/sakit ini.</p>
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
          <a href="${IMS_HR_URL}" style="display:inline-block;background:linear-gradient(135deg,#0d9488 0%,#0f766e 100%);color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:700;">Buka IMS Sekarang →</a>
        </td></tr></table>
      </td></tr>
      <tr><td style="background-color:#f8f9fb;padding:20px 32px;border-top:1px solid #e8eaed;text-align:center;">
        <p style="color:#999;font-size:12px;margin:0;">Email ini dikirim otomatis oleh sistem IMS WiseSteps Consulting.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

function buildUserApprovalEmailHtml(
  requesterName: string, leaveType: string,
  startDate: string, endDate: string
): string {
  const typeLabel = LEAVE_TYPE_LABELS[leaveType] || leaveType;
  const fmtStart = new Date(startDate).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const fmtEnd = new Date(endDate).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:32px 16px;"><tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <tr><td style="background:linear-gradient(135deg,#16a34a 0%,#15803d 100%);padding:28px 32px;text-align:center;">
        <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">🎉 Permintaan Disetujui!</h1>
        <p style="color:#ffffffcc;margin:8px 0 0;font-size:14px;">IMS WiseSteps Consulting</p>
      </td></tr>
      <tr><td style="padding:32px;">
        <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 20px;">Halo <strong>${requesterName}</strong>, permintaan Anda telah <strong style="color:#16a34a;">disetujui</strong>! Berikut detailnya:</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;margin-bottom:24px;">
          <tr><td style="padding:20px;"><table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:6px 0;color:#666;font-size:13px;width:120px;">Jenis</td><td style="padding:6px 0;"><span style="background-color:#16a34a;color:#ffffff;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;">${typeLabel}</span></td></tr>
            <tr><td style="padding:6px 0;color:#666;font-size:13px;">Tanggal</td><td style="padding:6px 0;color:#333;font-size:14px;">${fmtStart}${startDate !== endDate ? ` — ${fmtEnd}` : ""}</td></tr>
            <tr><td style="padding:6px 0;color:#666;font-size:13px;">Status</td><td style="padding:6px 0;"><span style="color:#16a34a;font-weight:700;">✅ Disetujui</span></td></tr>
          </table></td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
          <a href="${IMS_MY_REQUEST_URL}" style="display:inline-block;background:linear-gradient(135deg,#16a34a 0%,#15803d 100%);color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:700;">Lihat My Request →</a>
        </td></tr></table>
      </td></tr>
      <tr><td style="background-color:#f8f9fb;padding:20px 32px;border-top:1px solid #e8eaed;text-align:center;">
        <p style="color:#999;font-size:12px;margin:0;">Email ini dikirim otomatis oleh sistem IMS WiseSteps Consulting.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

function buildUserRejectionEmailHtml(
  requesterName: string, leaveType: string,
  startDate: string, endDate: string, rejectReason: string
): string {
  const typeLabel = LEAVE_TYPE_LABELS[leaveType] || leaveType;
  const fmtStart = new Date(startDate).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const fmtEnd = new Date(endDate).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:32px 16px;"><tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <tr><td style="background:linear-gradient(135deg,#dc2626 0%,#b91c1c 100%);padding:28px 32px;text-align:center;">
        <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">❌ Permintaan Ditolak</h1>
        <p style="color:#ffffffcc;margin:8px 0 0;font-size:14px;">IMS WiseSteps Consulting</p>
      </td></tr>
      <tr><td style="padding:32px;">
        <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 20px;">Halo <strong>${requesterName}</strong>, mohon maaf permintaan Anda <strong style="color:#dc2626;">tidak disetujui</strong>. Berikut detailnya:</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef2f2;border-radius:8px;border:1px solid #fecaca;margin-bottom:24px;">
          <tr><td style="padding:20px;"><table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:6px 0;color:#666;font-size:13px;width:120px;">Jenis</td><td style="padding:6px 0;"><span style="background-color:#dc2626;color:#ffffff;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;">${typeLabel}</span></td></tr>
            <tr><td style="padding:6px 0;color:#666;font-size:13px;">Tanggal</td><td style="padding:6px 0;color:#333;font-size:14px;">${fmtStart}${startDate !== endDate ? ` — ${fmtEnd}` : ""}</td></tr>
            <tr><td style="padding:6px 0;color:#666;font-size:13px;">Status</td><td style="padding:6px 0;"><span style="color:#dc2626;font-weight:700;">❌ Ditolak</span></td></tr>
            ${rejectReason ? `<tr><td style="padding:6px 0;color:#666;font-size:13px;">Alasan Penolakan</td><td style="padding:6px 0;color:#333;font-size:14px;">${rejectReason}</td></tr>` : ""}
          </table></td></tr>
        </table>
        <p style="color:#666;font-size:13px;line-height:1.5;margin:0 0 24px;padding:12px;background:#f8f9fb;border-radius:6px;border:1px solid #e8eaed;">Jika ada pertanyaan, silakan hubungi atasan Anda untuk informasi lebih lanjut.</p>
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
          <a href="${IMS_MY_REQUEST_URL}" style="display:inline-block;background:linear-gradient(135deg,#3f545f 0%,#2d3e47 100%);color:#e8c559;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:700;">Lihat My Request →</a>
        </td></tr></table>
      </td></tr>
      <tr><td style="background-color:#f8f9fb;padding:20px 32px;border-top:1px solid #e8eaed;text-align:center;">
        <p style="color:#999;font-size:12px;margin:0;">Email ini dikirim otomatis oleh sistem IMS WiseSteps Consulting.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

// ============================================
// RESEND EMAIL SENDER
// ============================================

async function sendEmail(to: string | string[], subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not configured");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: SENDER_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Resend API error: ${res.status} - ${errorText}`);
  }

  return res.json();
}

// ============================================
// API ROUTE HANDLER
// ============================================

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const { type, leave_type, requester_name, start_date, end_date, reason } = payload;

    // Create Supabase admin client to look up emails
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const typeLabel = LEAVE_TYPE_LABELS[leave_type] || leave_type;

    if (type === "new_request") {
      // Get CEO emails
      const { data: ceoProfiles } = await supabase
        .from("profiles").select("id").eq("role", "ceo");

      if (ceoProfiles?.length) {
        for (const ceo of ceoProfiles) {
          const { data: { user } } = await supabase.auth.admin.getUserById(ceo.id);
          if (user?.email) {
            await sendEmail(
              user.email,
              `[IMS] Permintaan Baru: ${typeLabel} dari ${requester_name}`,
              buildCeoEmailHtml(requester_name, leave_type, start_date, end_date, reason)
            );
          }
        }
      }
    } else if (type === "approved_leave") {
      if (!HR_NOTIFY_TYPES.includes(leave_type)) {
        return NextResponse.json({ success: true, message: "No HR notification needed" });
      }

      const { data: hrProfiles } = await supabase
        .from("profiles").select("id, role").or("role.eq.hr,is_hr.eq.true");

      if (hrProfiles?.length) {
        for (const hr of hrProfiles) {
          const { data: { user } } = await supabase.auth.admin.getUserById(hr.id);
          if (user?.email) {
            await sendEmail(
              user.email,
              `[IMS] Izin/Sakit Disetujui: ${requester_name} - Perlu Administrasi`,
              buildHrEmailHtml(requester_name, leave_type, start_date, end_date, reason)
            );
          }
        }
      }
    } else if (type === "request_approved_user") {
      // Send confirmation email to the requester
      const { profile_id } = payload;
      const { data: { user } } = await supabase.auth.admin.getUserById(profile_id);
      if (user?.email) {
        await sendEmail(
          user.email,
          `[IMS] Permintaan ${typeLabel} Anda Disetujui ✅`,
          buildUserApprovalEmailHtml(requester_name, leave_type, start_date, end_date)
        );
      }
    } else if (type === "request_rejected_user") {
      // Send rejection email to the requester
      const { profile_id, reject_reason } = payload;
      const { data: { user } } = await supabase.auth.admin.getUserById(profile_id);
      if (user?.email) {
        await sendEmail(
          user.email,
          `[IMS] Permintaan ${typeLabel} Ditolak`,
          buildUserRejectionEmailHtml(requester_name, leave_type, start_date, end_date, reject_reason || "")
        );
      }
    } else {
      return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Send notification error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
