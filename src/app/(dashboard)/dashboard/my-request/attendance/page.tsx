"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MyRequestAttendancePage() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to the main attendance page (personal view)
        router.replace("/dashboard/attendance");
    }, [router]);

    return (
        <div className="p-10 text-white text-center">
            Redirecting to Attendance Log...
        </div>
    );
}
