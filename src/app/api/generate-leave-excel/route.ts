import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import XlsxPopulate from "xlsx-populate";
import path from "path";

// Leave type labels for display
const LEAVE_TYPE_LABELS: Record<string, string> = {
    annual_leave: "Cuti Tahunan",
    other_permission: "Izin Lainnya",
    menstrual_leave: "Cuti Haid",
    maternity: "Cuti Melahirkan",
    miscarriage: "Cuti Keguguran",
    self_marriage: "Pernikahan Sendiri",
    child_marriage: "Pernikahan Anak",
    paternity: "Istri Melahirkan",
    wife_miscarriage: "Istri Keguguran",
    child_event: "Khitanan/Baptis Anak",
    family_death: "Keluarga Inti Meninggal",
    household_death: "Anggota Serumah Meninggal",
    sibling_death: "Saudara Kandung Meninggal",
    hajj: "Ibadah Haji",
    government: "Panggilan Pemerintah",
    disaster: "Musibah",
    extra_leave: "Cuti Khusus",
    sick_leave: "Sakit",
};

// Leave type categories for Excel row placement
const ANNUAL_LEAVE_TYPES = ["annual_leave", "other_permission", "extra_leave"];
const SPECIAL_LEAVE_TYPES = ["menstrual_leave", "maternity", "miscarriage", "paternity", "wife_miscarriage"];
const PERMISSION_TYPES = ["self_marriage", "child_marriage", "child_event", "family_death", "household_death", "sibling_death", "hajj", "government", "disaster"];

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const leaveRequestId = searchParams.get("id");

        if (!leaveRequestId) {
            return NextResponse.json({ error: "Leave request ID is required" }, { status: 400 });
        }

        const supabase = await createClient();

        // Fetch leave request with profile data
        const { data: leaveRequest, error } = await supabase
            .from("leave_requests")
            .select(`
                id,
                leave_type,
                start_date,
                end_date,
                reason,
                status,
                created_at,
                profile:profiles!leave_requests_profile_id_fkey (
                    full_name,
                    job_title
                )
            `)
            .eq("id", leaveRequestId)
            .single();

        if (error || !leaveRequest) {
            return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
        }

        // Load the Excel template
        const templatePath = path.join(process.cwd(), "public", "template_form_request.xlsx");
        const workbook = await XlsxPopulate.fromFileAsync(templatePath);
        const sheet = workbook.sheet("Cuti");

        if (!sheet) {
            return NextResponse.json({ error: "Template sheet 'Cuti' not found" }, { status: 500 });
        }

        // Get profile data (handle both array and object response)
        const profile = Array.isArray(leaveRequest.profile) 
            ? leaveRequest.profile[0] 
            : leaveRequest.profile;

        // Calculate duration
        const startDate = new Date(leaveRequest.start_date);
        const endDate = new Date(leaveRequest.end_date);
        const durationMs = endDate.getTime() - startDate.getTime();
        const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24)) + 1;

        // Format dates for display
        const formatDate = (dateStr: string) => {
            const date = new Date(dateStr);
            return date.toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            });
        };

        // Get leave type label
        const leaveTypeLabel = LEAVE_TYPE_LABELS[leaveRequest.leave_type] || leaveRequest.leave_type;

        // Fill the template cells
        sheet.cell("E10").value(formatDate(leaveRequest.created_at)); // Tanggal Pengajuan
        sheet.cell("E11").value(profile?.full_name || "-"); // Nama
        sheet.cell("E12").value(profile?.job_title || "-"); // Jabatan
        sheet.cell("B15").value(formatDate(leaveRequest.start_date)); // Dari Tanggal
        sheet.cell("E15").value(formatDate(leaveRequest.end_date)); // Sampai Tanggal
        sheet.cell("H15").value(`${durationDays} Hari`); // Lamanya
        sheet.cell("E17").value(`${leaveTypeLabel} - ${leaveRequest.reason}`); // Alasan

        // Fill leave type category rows (H21, H22, H23)
        if (ANNUAL_LEAVE_TYPES.includes(leaveRequest.leave_type)) {
            sheet.cell("H21").value(durationDays);
        } else if (SPECIAL_LEAVE_TYPES.includes(leaveRequest.leave_type)) {
            sheet.cell("H22").value(durationDays);
        } else if (PERMISSION_TYPES.includes(leaveRequest.leave_type)) {
            sheet.cell("H23").value(durationDays);
        }

        // Generate the Excel buffer
        const buffer = await workbook.outputAsync();

        // Create filename with sanitized name and date
        const safeName = (profile?.full_name || "unknown").replace(/[^a-zA-Z0-9]/g, "_");
        const dateStr = leaveRequest.start_date.replace(/-/g, "");
        const filename = `Form_Cuti_${safeName}_${dateStr}.xlsx`;

        // Return as downloadable Excel file
        return new NextResponse(new Uint8Array(buffer), {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (err) {
        console.error("Error generating Excel:", err);
        return NextResponse.json({ error: "Failed to generate Excel file" }, { status: 500 });
    }
}
