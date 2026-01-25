"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { UploadCloud, FileText, ArrowLeft, CheckCircle, AlertCircle, Clock, Users, Calendar, Database, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Types
interface RawAttendanceData {
    "Cloud ID": string;
    "ID": string;
    "Nama": string;
    "Tanggal Absensi": string;
    "Jam Absensi": string;
    "Verifikasi": string;
    "Tipe Absensi": string;
    "Jabatan": string;
    "Kantor": string;
}

interface ProcessedAttendance {
    employeeId: string;
    name: string;
    date: string;
    clockIn: string | null;
    clockOut: string | null;
    duration: string;
    position: string;
    office: string;
    source: string;
}

// Helper functions
const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
};

const formatDuration = (clockIn: string | null, clockOut: string | null): string => {
    if (!clockIn || !clockOut) return "-";
    const inMinutes = parseTime(clockIn);
    const outMinutes = parseTime(clockOut);
    const diff = outMinutes - inMinutes;
    if (diff <= 0) return "-";
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    return `${hours}h ${minutes}m`;
};

export default function AttendanceUploadPage() {
    const supabase = createClient();

    const [isDragging, setIsDragging] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [rawData, setRawData] = useState<RawAttendanceData[]>([]);
    const [processedData, setProcessedData] = useState<ProcessedAttendance[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Upload states
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ success: number; failed: number; total: number } | null>(null);
    const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null);

    // Process raw data to get clock in/out per employee per day
    const processAttendanceData = useCallback((data: RawAttendanceData[]) => {
        // Group by employee ID and date
        const grouped: { [key: string]: RawAttendanceData[] } = {};

        data.forEach((record) => {
            // Only process "Absensi Masuk" and "Absensi Pulang"
            if (record["Tipe Absensi"] !== "Absensi Masuk" && record["Tipe Absensi"] !== "Absensi Pulang") {
                return;
            }

            const key = `${record["ID"]}_${record["Tanggal Absensi"]}`;
            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(record);
        });

        // Calculate clock in (earliest) and clock out (latest) for each group
        const processed: ProcessedAttendance[] = Object.entries(grouped).map(([, records]) => {
            const masukRecords = records.filter(r => r["Tipe Absensi"] === "Absensi Masuk");
            const pulangRecords = records.filter(r => r["Tipe Absensi"] === "Absensi Pulang");

            // Find earliest clock in (Absensi Masuk)
            let clockIn: string | null = null;
            if (masukRecords.length > 0) {
                masukRecords.sort((a, b) => parseTime(a["Jam Absensi"]) - parseTime(b["Jam Absensi"]));
                clockIn = masukRecords[0]["Jam Absensi"];
            }

            // Find latest clock out (Absensi Pulang)
            let clockOut: string | null = null;
            if (pulangRecords.length > 0) {
                pulangRecords.sort((a, b) => parseTime(b["Jam Absensi"]) - parseTime(a["Jam Absensi"]));
                clockOut = pulangRecords[0]["Jam Absensi"];
            }

            const firstRecord = records[0];
            return {
                employeeId: firstRecord["ID"],
                name: firstRecord["Nama"].trim(),
                date: firstRecord["Tanggal Absensi"],
                clockIn,
                clockOut,
                duration: formatDuration(clockIn, clockOut),
                position: firstRecord["Jabatan"],
                office: firstRecord["Kantor"],
                source: firstRecord["Verifikasi"],
            };
        });

        // Sort by date (desc) then by employee name
        processed.sort((a, b) => {
            const dateCompare = b.date.localeCompare(a.date);
            if (dateCompare !== 0) return dateCompare;
            return a.name.localeCompare(b.name);
        });

        return processed;
    }, []);

    // Handle file parsing
    const handleFile = useCallback((file: File) => {
        setError(null);
        setIsProcessing(true);
        setFileName(file.name);

        // Check file extension
        const extension = file.name.split(".").pop()?.toLowerCase();
        if (extension !== "csv" && extension !== "xlsx" && extension !== "xls") {
            setError("Format file tidak didukung. Gunakan file CSV atau Excel.");
            setIsProcessing(false);
            return;
        }

        // For now, only support CSV (Excel would need xlsx library)
        if (extension === "xlsx" || extension === "xls") {
            setError("Untuk saat ini, hanya format CSV yang didukung. Silakan export ke CSV terlebih dahulu.");
            setIsProcessing(false);
            return;
        }

        Papa.parse(file, {
            header: true,
            delimiter: ";",
            encoding: "UTF-8",
            skipEmptyLines: true,
            transformHeader: (header) => header.trim(), // Remove whitespace/BOM from headers
            transform: (value) => value.trim(), // Remove whitespace from cell values
            complete: (results) => {
                if (results.errors.length > 0) {
                    console.error("Parse errors:", results.errors);
                    // Continue if there is data, but warn? For now, just show error if fatal.
                    // Often CSVs have minor warnings. Only stop if no data.
                }

                const data = results.data as RawAttendanceData[];
                console.log("Parsed keys:", Object.keys(data[0] || {})); // For debugging (in browser console)

                // Filter out empty rows or rows with missing critical data
                // Note: Check for common misspellings or key variations if needed
                const validData = data.filter(row => {
                    const hasId = row["ID"] !== undefined && row["ID"] !== "";
                    const hasDate = row["Tanggal Absensi"] !== undefined;
                    return hasId && hasDate;
                });

                if (validData.length === 0) {
                    // Check if maybe headers parsed incorrectly (e.g. semicolon fail)
                    const firstRow = data[0] as any;
                    const keys = Object.keys(firstRow || {});
                    setError(`Tidak ada data valid ditemukan. Pastikan format CSV benar (Delimiter: titik koma). Header terbaca: ${keys.join(", ")}`);
                    setRawData([]);
                    setProcessedData([]);
                    setIsProcessing(false);
                    return;
                }

                setRawData(validData);
                const processed = processAttendanceData(validData);

                if (processed.length === 0) {
                    setError("Data ditemukan tapi tidak ada record 'Absensi Masuk' atau 'Absensi Pulang' yang valid.");
                }

                setProcessedData(processed);
                setIsProcessing(false);
            },
            error: (error) => {
                setError(`Error reading file: ${error.message}`);
                setIsProcessing(false);
            }
        });
    }, [processAttendanceData]);

    // Handle drag events
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }, [handleFile]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    }, [handleFile]);

    // Stats
    const uniqueEmployees = new Set(processedData.map(r => r.employeeId)).size;
    const uniqueDates = new Set(processedData.map(r => r.date)).size;
    const completeRecords = processedData.filter(r => r.clockIn && r.clockOut).length;

    // Upload to Database function
    const uploadToDatabase = useCallback(async () => {
        if (processedData.length === 0) return;

        setIsUploading(true);
        setUploadResult(null);
        setUploadProgress({ success: 0, failed: 0, total: processedData.length });
        setError(null);

        try {
            // 1. Get unique employee IDs from processed data
            const employeeIds = [...new Set(processedData.map(r => parseInt(r.employeeId)))];

            // 2. Fetch profile mappings (employee_id -> profile_id)
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('id, employee_id')
                .in('employee_id', employeeIds);

            if (profileError) {
                throw new Error(`Gagal mengambil data profil: ${profileError.message}`);
            }

            if (!profiles || profiles.length === 0) {
                throw new Error('Tidak ditemukan profil dengan employee_id yang cocok. Pastikan data karyawan sudah terdaftar.');
            }

            // Create mapping
            const profileMap = new Map<number, string>();
            profiles.forEach(p => {
                if (p.employee_id) profileMap.set(p.employee_id, p.id);
            });

            console.log('Profile mapping:', Object.fromEntries(profileMap));

            // 3. Prepare records for upsert
            let successCount = 0;
            let failedCount = 0;
            const unmappedEmployees: string[] = [];

            for (const record of processedData) {
                const employeeIdNum = parseInt(record.employeeId);
                const profileId = profileMap.get(employeeIdNum);

                if (!profileId) {
                    unmappedEmployees.push(`${record.name} (ID: ${record.employeeId})`);
                    failedCount++;
                    setUploadProgress({ success: successCount, failed: failedCount, total: processedData.length });
                    continue;
                }

                // Parse date and time
                const checkinDate = record.date; // Already in YYYY-MM-DD format

                // Convert clock times to timestamps with timezone
                let clockInTime: string | null = null;
                let clockOutTime: string | null = null;

                if (record.clockIn) {
                    clockInTime = `${checkinDate}T${record.clockIn}:00+07:00`;
                }
                if (record.clockOut) {
                    clockOutTime = `${checkinDate}T${record.clockOut}:00+07:00`;
                }

                // Determine if late (after 08:30)
                let isLate = false;
                if (record.clockIn) {
                    const [hours, minutes] = record.clockIn.split(':').map(Number);
                    isLate = hours > 8 || (hours === 8 && minutes > 30);
                }

                // 4. Upsert record
                const { error: upsertError } = await supabase
                    .from('daily_checkins')
                    .upsert({
                        profile_id: profileId,
                        employee_id: employeeIdNum,
                        checkin_date: checkinDate,
                        status: 'office',
                        clock_in_time: clockInTime,
                        clock_out_time: clockOutTime,
                        is_late: isLate,
                        source: 'fingerprint',
                        notes: `Uploaded from ${fileName}`,
                    }, {
                        onConflict: 'profile_id,checkin_date',
                    });

                if (upsertError) {
                    console.error('Upsert error:', upsertError);
                    failedCount++;
                } else {
                    successCount++;
                }

                setUploadProgress({ success: successCount, failed: failedCount, total: processedData.length });
            }

            // 5. Show result
            if (unmappedEmployees.length > 0) {
                const uniqueUnmapped = [...new Set(unmappedEmployees)];
                setError(`Beberapa karyawan tidak ditemukan di database: ${uniqueUnmapped.join(', ')}`);
            }

            if (successCount > 0) {
                setUploadResult({
                    success: true,
                    message: `Berhasil upload ${successCount} dari ${processedData.length} record ke database.`
                });
            } else {
                setUploadResult({
                    success: false,
                    message: 'Tidak ada record yang berhasil diupload.'
                });
            }

        } catch (err: any) {
            console.error('Upload error:', err);
            setError(err.message || 'Terjadi kesalahan saat upload ke database.');
            setUploadResult({
                success: false,
                message: err.message || 'Gagal upload ke database.'
            });
        } finally {
            setIsUploading(false);
        }
    }, [processedData, supabase, fileName]);

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <header className="flex flex-col gap-4 md:flex-row md:items-end justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3f545f] to-[#5f788e] dark:from-[#e8c559] dark:to-[#dcb33e] flex items-center justify-center">
                        <UploadCloud className="w-6 h-6 text-white dark:text-[#171611]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Attendance Upload</h1>
                        <p className="text-sm text-[var(--text-secondary)]">Import data absensi dari mesin fingerprint</p>
                    </div>
                </div>
                <Link
                    href="/dashboard/hr"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Human Resource
                </Link>
            </header>

            {/* Upload Area */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`glass-panel p-8 rounded-xl border-2 border-dashed transition-all ${isDragging
                    ? "border-[#e8c559] bg-[#e8c559]/10"
                    : "border-[var(--glass-border)] hover:border-[#e8c559]/50"
                    }`}
            >
                <div className="flex flex-col items-center justify-center text-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${isDragging ? "bg-[#e8c559]/20 text-[#e8c559]" : "bg-[var(--glass-border)] text-[var(--text-muted)]"
                        }`}>
                        <UploadCloud className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
                        {isDragging ? "Drop file here..." : "Upload Attendance File"}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] mb-4">
                        Drag & drop file CSV atau klik tombol di bawah
                    </p>
                    <label className="cursor-pointer">
                        <input
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            onChange={handleFileInput}
                            className="hidden"
                        />
                        <span className="px-6 py-2 rounded-lg bg-[#e8c559] hover:bg-[#dcb33e] text-[#171611] font-bold transition-colors inline-block">
                            Browse Files
                        </span>
                    </label>
                    <p className="text-xs text-[var(--text-muted)] mt-3">
                        Format yang didukung: CSV (dengan delimiter semicolon)
                    </p>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="glass-panel p-4 rounded-xl border-l-4 border-rose-500 bg-rose-500/10">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                        <p className="text-sm text-rose-500">{error}</p>
                    </div>
                </div>
            )}

            {/* Upload Result */}
            {uploadResult && (
                <div className={`glass-panel p-4 rounded-xl border-l-4 ${uploadResult.success
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-amber-500 bg-amber-500/10'
                    }`}>
                    <div className="flex items-center gap-3">
                        {uploadResult.success ? (
                            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                        ) : (
                            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                        )}
                        <p className={`text-sm ${uploadResult.success ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {uploadResult.message}
                        </p>
                    </div>
                </div>
            )}

            {/* Processing Indicator */}
            {isProcessing && (
                <div className="glass-panel p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-[#e8c559] border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-[var(--text-secondary)]">Memproses file...</p>
                    </div>
                </div>
            )}

            {/* File Info & Stats */}
            {fileName && processedData.length > 0 && (
                <>
                    <div className="glass-panel p-4 rounded-xl border-l-4 border-emerald-500 bg-emerald-500/10">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-emerald-500">File berhasil diproses</p>
                                <p className="text-xs text-[var(--text-muted)]">{fileName}</p>
                            </div>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="glass-panel p-4 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-[var(--text-primary)]">{rawData.length}</p>
                                    <p className="text-xs text-[var(--text-muted)]">Raw Records</p>
                                </div>
                            </div>
                        </div>
                        <div className="glass-panel p-4 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                                    <Users className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-[var(--text-primary)]">{uniqueEmployees}</p>
                                    <p className="text-xs text-[var(--text-muted)]">Karyawan</p>
                                </div>
                            </div>
                        </div>
                        <div className="glass-panel p-4 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-[var(--text-primary)]">{uniqueDates}</p>
                                    <p className="text-xs text-[var(--text-muted)]">Hari</p>
                                </div>
                            </div>
                        </div>
                        <div className="glass-panel p-4 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-[var(--text-primary)]">{completeRecords}</p>
                                    <p className="text-xs text-[var(--text-muted)]">Record Lengkap</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Preview Table */}
                    <div className="glass-panel rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-[var(--glass-border)] bg-black/5 dark:bg-white/5">
                            <h3 className="font-bold text-[var(--text-primary)]">Preview Data ({processedData.length} records)</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-[var(--text-muted)] border-b border-[var(--glass-border)]">
                                        <th className="p-3 font-medium">ID</th>
                                        <th className="p-3 font-medium">Nama</th>
                                        <th className="p-3 font-medium">Tanggal</th>
                                        <th className="p-3 font-medium">Clock In</th>
                                        <th className="p-3 font-medium">Clock Out</th>
                                        <th className="p-3 font-medium">Durasi</th>
                                        <th className="p-3 font-medium">Jabatan</th>
                                        <th className="p-3 font-medium">Source</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--glass-border)]">
                                    {processedData.map((record, idx) => (
                                        <tr key={idx} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                            <td className="p-3 font-mono text-[var(--text-secondary)]">{record.employeeId}</td>
                                            <td className="p-3 font-medium text-[var(--text-primary)]">{record.name}</td>
                                            <td className="p-3 text-[var(--text-secondary)]">{record.date}</td>
                                            <td className="p-3">
                                                {record.clockIn ? (
                                                    <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 font-medium">
                                                        {record.clockIn}
                                                    </span>
                                                ) : (
                                                    <span className="text-[var(--text-muted)]">-</span>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                {record.clockOut ? (
                                                    <span className="px-2 py-1 rounded bg-rose-500/10 text-rose-500 font-medium">
                                                        {record.clockOut}
                                                    </span>
                                                ) : (
                                                    <span className="text-[var(--text-muted)]">-</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-[var(--text-secondary)]">{record.duration}</td>
                                            <td className="p-3">
                                                <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-500 text-xs">
                                                    {record.position}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                <span className="px-2 py-1 rounded bg-[#e8c559]/10 text-[#b89530] text-xs">
                                                    {record.source}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 justify-end">
                        <button
                            onClick={() => {
                                setFileName(null);
                                setRawData([]);
                                setProcessedData([]);
                            }}
                            className="px-6 py-3 rounded-lg border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium transition-colors"
                        >
                            Clear Data
                        </button>
                        <button
                            onClick={uploadToDatabase}
                            disabled={isUploading || processedData.length === 0}
                            className={`px-6 py-3 rounded-lg font-bold transition-colors flex items-center gap-2 ${isUploading || processedData.length === 0
                                ? 'bg-[#e8c559]/50 text-[#171611]/50 cursor-not-allowed'
                                : 'bg-[#e8c559] hover:bg-[#dcb33e] text-[#171611]'
                                }`}
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Uploading... {uploadProgress && `(${uploadProgress.success + uploadProgress.failed}/${uploadProgress.total})`}
                                </>
                            ) : (
                                <>
                                    <Database className="w-4 h-4" />
                                    Upload ke Database
                                </>
                            )}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
