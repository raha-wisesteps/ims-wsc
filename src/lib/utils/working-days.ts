/**
 * Calculate the number of working days between two dates (inclusive).
 * Excludes weekends (Saturday & Sunday) and company holidays.
 *
 * @param startDate - Start date string in 'YYYY-MM-DD' format
 * @param endDate   - End date string in 'YYYY-MM-DD' format
 * @param holidays  - Array of holiday date strings in 'YYYY-MM-DD' format
 * @returns Number of working days
 */
export function calculateWorkingDays(
    startDate: string,
    endDate: string,
    holidays: string[]
): number {
    if (!startDate) return 0;

    const effectiveEnd = endDate || startDate;
    const start = new Date(startDate);
    const end = new Date(effectiveEnd);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    if (start > end) return 0;

    const holidaySet = new Set(holidays);
    let workingDays = 0;

    const current = new Date(start);
    while (current <= end) {
        const dayOfWeek = current.getDay(); // 0 = Sunday, 6 = Saturday
        const dateStr = formatDateStr(current);

        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = holidaySet.has(dateStr);

        if (!isWeekend && !isHoliday) {
            workingDays++;
        }

        current.setDate(current.getDate() + 1);
    }

    return workingDays;
}

/**
 * Get the list of excluded dates (weekends + holidays) within a date range.
 * Useful for showing which dates are excluded to the user.
 */
export function getExcludedDates(
    startDate: string,
    endDate: string,
    holidays: { date: string; name: string }[]
): { date: string; reason: string }[] {
    if (!startDate) return [];

    const effectiveEnd = endDate || startDate;
    const start = new Date(startDate);
    const end = new Date(effectiveEnd);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];
    if (start > end) return [];

    const holidayMap = new Map(holidays.map(h => [h.date, h.name]));
    const excluded: { date: string; reason: string }[] = [];

    const current = new Date(start);
    while (current <= end) {
        const dayOfWeek = current.getDay();
        const dateStr = formatDateStr(current);

        if (dayOfWeek === 0 || dayOfWeek === 6) {
            excluded.push({ date: dateStr, reason: dayOfWeek === 0 ? 'Minggu' : 'Sabtu' });
        } else if (holidayMap.has(dateStr)) {
            excluded.push({ date: dateStr, reason: holidayMap.get(dateStr)! });
        }

        current.setDate(current.getDate() + 1);
    }

    return excluded;
}

/** Format a Date object to 'YYYY-MM-DD' string */
function formatDateStr(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
