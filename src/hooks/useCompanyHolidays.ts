"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface CompanyHoliday {
    id: string;
    date: string;
    name: string;
    type: "national_holiday" | "collective_leave";
}

/**
 * Hook to fetch company holidays from the database.
 * Returns holiday dates as strings and full holiday objects.
 */
export function useCompanyHolidays() {
    const [holidays, setHolidays] = useState<CompanyHoliday[]>([]);
    const [holidayDates, setHolidayDates] = useState<string[]>([]);
    const [holidayMap, setHolidayMap] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchHolidays = async () => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("company_holidays")
                .select("id, date, name, type")
                .order("date", { ascending: true });

            if (error) {
                console.error("Failed to fetch company holidays:", error);
                setIsLoading(false);
                return;
            }

            const items = (data || []) as CompanyHoliday[];
            setHolidays(items);
            setHolidayDates(items.map((h) => h.date));

            // Build a map: { 'YYYY-MM-DD': 'Holiday Name' }
            const map: Record<string, string> = {};
            items.forEach((h) => {
                map[h.date] = h.name;
            });
            setHolidayMap(map);

            setIsLoading(false);
        };

        fetchHolidays();
    }, []);

    return { holidays, holidayDates, holidayMap, isLoading };
}
