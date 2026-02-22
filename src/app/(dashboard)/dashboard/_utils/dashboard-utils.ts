import type { AttendanceStatus } from "../_types/dashboard.types";
import { FEEDBACK_MESSAGES } from "../_constants/dashboard-config";

// ============================================
// MOTIVATIONAL MESSAGES — changes daily based on date
// ============================================
const motivationalMessages = [
    { message: "Setiap langkah kecil hari ini adalah kemajuan besar untuk masa depan. Keep going! 💪", emoji: "🚀" },
    { message: "Hari ini adalah kesempatan baru untuk membuat perbedaan. You got this! ✨", emoji: "🌟" },
    { message: "Kerja keras hari ini adalah investasi untuk kesuksesan esok. Stay focused! 🎯", emoji: "💎" },
    { message: "Jangan lupa istirahat sejenak, kesehatan adalah aset terpenting! Take care! 💚", emoji: "🌿" },
    { message: "Kolaborasi tim yang solid adalah kunci keberhasilan. Together we achieve more! 🤝", emoji: "👥" },
    { message: "Tantangan hari ini adalah pelajaran untuk hari esok. Embrace it! 📚", emoji: "💡" },
    { message: "Produktivitas bukan tentang bekerja keras, tapi bekerja cerdas. Work smart! 🧠", emoji: "⚡" },
    { message: "Apresiasi kecil bisa memberikan dampak besar. Spread positivity! 🌈", emoji: "💝" },
    { message: "Fokus pada progress, bukan perfection. Every step counts! 👣", emoji: "🎯" },
    { message: "Hari Senin adalah awal yang segar untuk minggu produktif! Let's go! 🔥", emoji: "📅" },
    { message: "Sudah minum air putih hari ini? Stay hydrated, stay sharp! 💧", emoji: "🥤" },
    { message: "Senyum dan sapaan hangat bisa mencerahkan hari rekan kerja. Be kind! 😊", emoji: "✨" },
];

// Get motivational message based on day of year (consistent per day)
export const getDailyMotivationalMessage = () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - startOfYear.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    return motivationalMessages[dayOfYear % motivationalMessages.length];
};

// ============================================
// GREETING UTILITY
// ============================================
export const getGreetingByTime = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { text: "Good Morning", emoji: "☀️", period: "morning" };
    if (hour >= 12 && hour < 17) return { text: "Good Afternoon", emoji: "🌤️", period: "afternoon" };
    if (hour >= 17 && hour < 21) return { text: "Good Evening", emoji: "🌅", period: "evening" };
    return { text: "Good Night", emoji: "🌙", period: "night" };
};

// ============================================
// BIRTHDAY UTILITY
// ============================================
export const getDaysUntilBirthday = (birthDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const birthDate = new Date(birthDateStr);
    const currentYear = today.getFullYear();

    // Create birth date object for this year
    const nextBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());

    // If birthday has passed this year, look at next year
    if (nextBirthday < today) {
        nextBirthday.setFullYear(currentYear + 1);
    }

    const diffTime = nextBirthday.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

// ============================================
// WFA EXPIRY UTILITY — Calculate days until WFA expires (March 1st)
// ============================================
export const calculateWfaExpiryDays = () => {
    const today = new Date();
    let expiryYear = today.getFullYear();

    // If we're past March 1st, expiry is next year
    const march1ThisYear = new Date(today.getFullYear(), 2, 1); // Month is 0-indexed
    if (today >= march1ThisYear) {
        expiryYear = today.getFullYear() + 1;
    }

    const expiryDate = new Date(expiryYear, 2, 1);
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return { expiryDate, daysRemaining: diffDays };
};

// ============================================
// FEEDBACK MESSAGE UTILITY
// ============================================
export const getFeedbackMessage = (status: AttendanceStatus, isLate: boolean, isForceMajeure: boolean, isClockedOut: boolean = false) => {
    if (isClockedOut) {
        const pool = FEEDBACK_MESSAGES.clockout;
        return pool[Math.floor(Math.random() * pool.length)];
    }

    let key: keyof typeof FEEDBACK_MESSAGES;
    switch (status) {
        case 'office':
            key = isLate ? 'office_late' : 'office_ontime';
            break;
        case 'wfh':
        case 'wfa':
            key = isLate ? 'wfh_late' : 'wfh_ontime';
            break;
        case 'sick':
        case 'sakit':
            key = isForceMajeure ? 'sick_forcemajeure' : 'sick_preapproved';
            break;
        case 'leave':
            key = isForceMajeure ? 'leave_forcemajeure' : 'leave_preapproved';
            break;
        case 'field':
            key = 'field';
            break;
        default:
            key = 'office_ontime';
    }
    const pool = FEEDBACK_MESSAGES[key];
    return pool[Math.floor(Math.random() * pool.length)];
};

// ============================================
// WEATHER LABEL UTILITY
// ============================================
export const getWeatherLabel = (code: number): string => {
    if (code === 0) return "Cerah ☀️";
    if (code >= 1 && code <= 3) return "Berawan ☁️";
    if (code >= 45 && code <= 48) return "Berkabut 🌫️";
    if (code >= 51 && code <= 67) return "Hujan 🌧️";
    if (code >= 71 && code <= 77) return "Salju ❄️";
    if (code >= 80 && code <= 82) return "Hujan Deras ⛈️";
    if (code >= 85 && code <= 86) return "Salju Lebat 🌨️";
    if (code >= 95 && code <= 99) return "Badai Petir ⚡";
    return "Cerah";
};

// ============================================
// PRIORITY HELPERS
// ============================================
export const getPriorityColor = (priority: string) => {
    switch (priority) {
        case "high": return "text-rose-500 bg-rose-500/10";
        case "medium": return "text-amber-500 bg-amber-500/10";
        case "low": return "text-emerald-500 bg-emerald-500/10";
        default: return "text-gray-500 bg-gray-500/10";
    }
};

export const getPriorityLabel = (priority: string) => {
    switch (priority) {
        case "high": return "High";
        case "medium": return "Medium";
        case "low": return "Low";
        default: return "Medium";
    }
};
