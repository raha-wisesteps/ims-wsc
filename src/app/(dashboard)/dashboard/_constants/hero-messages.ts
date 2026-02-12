export interface HeroMessage {
    text: string;
    subtext?: string;
    emoji: string;
}

export const HERO_MESSAGES = {
    // 1. Status: OFFICE
    office: [
        { text: "Fokus kerja kenceng, tapi jangan lupa minum air putih ya!", emoji: "💧", subtext: "Stay hydrated & focused!" },
        { text: "AC kantor dingin banget atau hati kamu yang dingin? Semangat!", emoji: "🥶", subtext: "Hangatnya kopi mungkin bantu." },
        { text: "Jangan lupa cek sisa cuti tahunanmu ya! Yakin nggak mau liburan?", emoji: "🏖️", subtext: "Rencanakan cuti dari sekarang!" },
        { text: "Rapat lagi, rapat lagi... semoga hasilnya produktif ya!", emoji: "📝", subtext: "Semangat meeting-nya!" },
        { text: "Jam makan siang masih lama? Cemilan di laci aman kan?", emoji: "🍪", subtext: "Emergency snack activated." },
        { text: "Deadline aman kan? Jangan mepet-mepet ya!", emoji: "⏳", subtext: "Procrastination is enemy." },
        { text: "Kerja cerdas, bukan cuma kerja keras. You got this!", emoji: "💡", subtext: "Work smart!" },
        { text: "Kalau mata lelah, istirahat sejenak liat yang hijau-hijau.", emoji: "🌿", subtext: "20-20-20 rule." },
        { text: "Sudah sapa teman di meja sebelah belum hari ini?", emoji: "👋", subtext: "Socialize a bit!" },
        { text: "Cuti besar masih ada? Kapan mau dipake keliling dunia?", emoji: "🌏", subtext: "Long holiday awaits?" },
    ],

    // 2. Status: WFH
    wfh: [
        { text: "WFH = Work From Happiness kan? Semangat!", emoji: "😄", subtext: "Enjoy your home office." },
        { text: "Awas kasur di belakang memanggil... Kuatkan iman!", emoji: "🛏️", subtext: "Resist the temptation!" },
        { text: "Sudah cek sisa kuota WFH minggu ini? Manfaatkan sebaiknya!", emoji: "🏠", subtext: "Remote work life." },
        { text: "Atas kemeja, bawah celana pendek? Kita rahasia-rahamiaan aja", emoji: "🤫", subtext: "Zoom meeting ready." },
        { text: "Pastikan internet stabil, biar nggak putus-putus pas meeting", emoji: "📶", subtext: "Check your ping!" },
        { text: "Sudah mandi belum? Biar makin segar ide-idenya!", emoji: "🚿", subtext: "Fresh mind, fresh ideas." },
        { text: "Enaknya WFH bisa sambil nyemil sepuasnya. Awas timbangan naik!", emoji: "⚖️", subtext: "Snack responsibly." },
        { text: "Tetap profesional walau kerja dari rumah ya!", emoji: "💼", subtext: "Keep it pro!" },
        { text: "Jangan lupa jam istirahat, mentang-mentang di rumah terus bablas.", emoji: "⏰", subtext: "Work-life balance." },
        { text: "Musik relaksasi boleh, tapi jangan sampai ketiduran!", emoji: "🎵", subtext: "Lofi beats to work to." },
    ],

    // 3. Status: WFA
    wfa: [
        { text: "Kerja dari cafe mana hari ini? Bagi rekomendasi dong!", emoji: "☕", subtext: "Cafe hunting mode." },
        { text: "Pemandangan baru, ide-ide baru. Semoga lancar hari ini!", emoji: "💡", subtext: "Inspiration everywhere." },
        { text: "Hati-hati di jalan kalau mau pindah lokasi ya!", emoji: "🛵", subtext: "Stay safe on the road." },
        { text: "WiFi aman? Jangan numpang WiFi tetangga ya", emoji: "🤭", subtext: "Secure connection please." },
        { text: "Sambil kerja sambil healing tipis-tipis. Nikmat mana lagi?", emoji: "🌴", subtext: "Workcleaning?" },
        { text: "Fokus kerja ya, jangan cuci mata terus", emoji: "👀", subtext: "Eyes on the screen!" },
        { text: "Masih ada jatah WFA? Manfaatkan buat mencari suasana baru!", emoji: "🚀", subtext: "Explore more spots." },
        { text: "Pastikan baterai laptop penuh sebelum jalan!", emoji: "🔋", subtext: "Power management." },
        { text: "Kerja rasa liburan, asal output tetap delivered!", emoji: "🏝️", subtext: "Deliver results." },
        { text: "Jangan lupa update status biar bos tau kamu kerja, bukan main.", emoji: "😜", subtext: "Visibility matters." },
    ],

    // 4. Status: AWAY / OFF (Default when not clocked in or clocked out)
    away: [
        { text: "Kerja mulu, istirahat gak sih? Kesehatan nomor 1!", emoji: "💚", subtext: "Health is wealth." },
        { text: "Belum jam kerja kok udah buka dashboard? Rajin amat!", emoji: "👏", subtext: "Too diligent?" },
        { text: "Waktunya recharge energi. Besok kita gas lagi!", emoji: "🔋", subtext: "Recharge mode." },
        { text: "Sudah waktunya istirahat. Mending tidur dulu.", emoji: "🌙", subtext: "Good night." },
        { text: "Dunia butuh kamu yang fresh besok, sekarang santai dulu aja.", emoji: "😴", subtext: "Rest well." },
        { text: "Kehidupan bukan cuma tentang kerjaan kok. Enjoy life!", emoji: "🌈", subtext: "Life is beautiful." },
        { text: "Laptopnya panas, orangnya juga butuh pendinginan.", emoji: "❄️", subtext: "Cool down." },
        { text: "Jangan lupa bahagia di luar jam kantor!", emoji: "😊", subtext: "Be happy!" },
        { text: "Notifikasi dimatiin dulu boleh lho, biar tenang.", emoji: "🔕", subtext: "Quiet mode." },
        { text: "Besok hari baru, semangat baru. Sekarang rileks dulu.", emoji: "🧘‍♂️", subtext: "Relax time." },
    ],

    // 5. Status: LEMBUR
    lembur: [
        { text: "Wah masih lembur? Semangat pejuang rupiah!", emoji: "💰", subtext: "Chasing dreams." },
        { text: "Jangan lupa makan malam, nanti sakit lambung siapa yang repot?", emoji: "🍲", subtext: "Eat first!" },
        { text: "Dedikasi tinggi nih! Tapi ingat istirahat ya.", emoji: "💪", subtext: "Respect the hustle." },
        { text: "Semoga lemburnya berkah dan cepat kelar!", emoji: "🙏", subtext: "Finish strong." },
        { text: "Mata udah 5 watt? Ngopi dikit boleh kali.", emoji: "☕", subtext: "Caffeine boost." },
    ],

    // 6. Status: IZIN / CUTI / SAKIT
    not_working: [
        { text: "Lagi cuti kok buka dashboard? Udah, nikmati liburannya!", emoji: "🏖️", subtext: "Enjoy your leave!" },
        { text: "Refresh otak dulu, biar balik kerja makin tokcer!", emoji: "🧠", subtext: "Mental reset." },
        { text: "Jangan mikirin kerjaan, fokus sama urusanmu dulu.", emoji: "👌", subtext: "Focus on you." },
        { text: "Kami tunggu kembalimu dengan energi full!", emoji: "⚡", subtext: "Comeback stronger." },
        // Khusus sakit logic akan di handle di component
        { text: "Semoga cepat sembuh! Kerjaan biar tim yang handle dulu.", emoji: "💊", subtext: "Get well soon!", specialized: 'sick' },
    ],

    // 7. TIME BASED: LUNCH BREAK (12:00 - 13:00)
    lunch_break: [
        { text: "Loh, jam istirahat gini masih buka laptop? Makan dulu gih!", emoji: "🍛", subtext: "It's lunch time!" },
        { text: "Sudah minum air putih? Jangan lupa rehidrasi biar fokus lagi.", emoji: "💧", subtext: "Drink water." },
        { text: "Kerjaan bisa nunggu, kesehatan lambung nggak bisa. Yuk makan!", emoji: "🍽️", subtext: "Health first." },
        { text: "Matikan notifikasi sejenak, nikmati makan siangmu dengan tenang.", emoji: "🔕", subtext: "Peaceful lunch." },
        { text: "Isi bensin dulu (makan), biar mesin (otak) nggak overheat!", emoji: "⛽", subtext: "Refuel time." },
        { text: "Sholat dan makan siang dulu, baru gaspol lagi!", emoji: "🕌", subtext: "Break & Pray." },
        { text: "Jangan lupa stretching dikit, badan kaku butuh gerak!", emoji: "🙆‍♂️", subtext: "Stretch it out." },
        { text: "Makan siang apa hari ini? Yang penting jangan telat makan ya!", emoji: "🍱", subtext: "Bon appetit." },
        { text: "Istirahat yang cukup bikin ide makin cemerlang nanti sore.", emoji: "💡", subtext: "Recharge creativity." },
        { text: "Laptop butuh istirahat, kamu juga. Sleep mode: ON!", emoji: "💤", subtext: "Take a break." },
    ],

    // 8. INTERACTIVE: ON CLICK
    interactive: [
        { text: "Kamu berharga, jangan lupa senyum hari ini!", emoji: "😊", subtext: "Smile! :)" },
        { text: "Kegagalan itu bumbu kesuksesan. Habiskan jatah gagalmu!", emoji: "🚀", subtext: "Keep growing." },
        { text: "Istirahat bentar gak dosa kok. Tarik napas... hembuskan...", emoji: "🍃", subtext: "Breathe in, breathe out." },
        { text: "Progress kecil tetaplah progress. Proud of you!", emoji: "🐢", subtext: "Small steps matter." },
        { text: "Jangan bandingkan chapter 1-mu dengan chapter 10 orang lain.", emoji: "📖", subtext: "Your own journey." },
        { text: "Cintai pekerjaanmu, tapi jangan lupa cintai dirimu sendiri lebih!", emoji: "💖", subtext: "Self love." },
        { text: "Kamu lebih kuat dari yang kamu bayangkan. Trust me!", emoji: "💪", subtext: "Stay strong." },
        { text: "Satu hal baik setiap hari. Hari ini apa hal baikmu?", emoji: "✨", subtext: "Find the good." },
        { text: "Badai pasti berlalu, tapi kalau lagi hujan, ya neduh dulu aja.", emoji: "☔", subtext: "This too shall pass." },
        { text: "Fokus pada apa yang bisa kamu kendalikan. Sisanya? Let it go.", emoji: "🎈", subtext: "Don't worry." },
    ],

    // 9. EASTER EGG (Rage Click)
    easter_egg: [
        { text: "Udah udah keasikan mainin ini, fokus kerja hey!", emoji: "🤨", subtext: "Back to work!" },
        { text: "Hey, Behave ya! No no.", emoji: "☝️", subtext: "Behave yourself." },
        { text: "Mouse-nya rusak nanti lho... pelan-pelan dong!", emoji: "🖱️", subtext: "Gentle please." },
        { text: "Gabut ya? Kerjaan udah beres emangnya?", emoji: "👀", subtext: "Are you done?" },
        { text: "Tombolnya pusing dipencet terus... kasih napas dikit napa!", emoji: "😵", subtext: "Dizzy button." },
    ],
};
