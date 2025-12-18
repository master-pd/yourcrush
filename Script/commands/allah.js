const axios = require('axios');

module.exports = {
    config: {
        name: "allah",
        version: "2.0",
        author: "RANA",
        countDown: 5,
        role: 0,
        shortDescription: {
            en: "Allah's names and Islamic reminders",
            bn: "আল্লাহর নাম এবং ইসলামিক অনুস্মারক"
        },
        longDescription: {
            en: "Get Allah's 99 names, Islamic reminders and blessings",
            bn: "আল্লাহর ৯৯টি নাম, ইসলামিক অনুস্মারক এবং বারাকাহ পান"
        },
        category: "islamic",
        guide: {
            en: "{pn} [names/reminder/blessing/ayat]",
            bn: "{pn} [names/reminder/blessing/ayat]"
        }
    },

    onStart: async function ({ api, event, args, message, getLang }) {
        const action = args[0] || 'names';

        try {
            switch (action.toLowerCase()) {
                case 'names':
                    return await showAllahNames(message, getLang);
                
                case 'reminder':
                    return await showIslamicReminder(message, getLang);
                
                case 'blessing':
                    return await showBlessing(message, getLang);
                
                case 'ayat':
                    return await showRandomAyat(message, getLang);
                
                case 'dua':
                    return await showDailyDua(message, getLang);
                
                default:
                    return message.reply(getLang("menu"));
            }
        } catch (error) {
            return message.reply(getLang("error", { error: error.message }));
        }
    },

    langs: {
        en: {
            menu: "🕌 Allah Commands:\n\n• {pn} names - 99 Names of Allah\n• {pn} reminder - Islamic reminder\n• {pn} blessing - Allah's blessings\n• {pn} ayat - Random Quran verse\n• {pn} dua - Daily dua",
            namesTitle: "🕌 99 Names of Allah (Asma ul Husna):\n\n",
            reminder: "📿 Islamic Reminder:\n\n{reminder}\n\n─\nMay Allah guide us all. Ameen.",
            blessing: "🕋 Allah's Blessings:\n\n{blessing}\n\n─\nMay Allah shower His blessings upon you.",
            ayat: "📖 Quran Ayat:\n\n{arabic}\n\nTranslation:\n{translation}\n\n─\nSurah: {surah} ({verse})",
            dua: "🤲 Daily Dua:\n\nArabic: {arabic}\n\nTranslation: {translation}\n\nMeaning: {meaning}",
            error: "❌ Error: {error}"
        },
        bn: {
            menu: "🕌 আল্লাহ কমান্ড:\n\n• {pn} names - আল্লাহর ৯৯টি নাম\n• {pn} reminder - ইসলামিক অনুস্মারক\n• {pn} blessing - আল্লাহর বারাকাহ\n• {pn} ayat - কুরআনের আয়াত\n• {pn} dua - দৈনিক দোয়া",
            namesTitle: "🕌 আল্লাহর ৯৯টি নাম (আসমাউল হুসনা):\n\n",
            reminder: "📿 ইসলামিক অনুস্মারক:\n\n{reminder}\n\n─\nআল্লাহ আমাদের সবাইকে হিদায়াত দান করুন। আমিন।",
            blessing: "🕋 আল্লাহর বারাকাহ:\n\n{blessing}\n\n─\nআল্লাহ আপনাকে তাঁর বারাকাহ দান করুন।",
            ayat: "📖 কুরআনের আয়াত:\n\n{arabic}\n\nঅনুবাদ:\n{translation}\n\n─\nসূরা: {surah} ({verse})",
            dua: "🤲 দৈনিক দোয়া:\n\nআরবি: {arabic}\n\nঅনুবাদ: {translation}\n\nঅর্থ: {meaning}",
            error: "❌ ত্রুটি: {error}"
        }
    }
};

async function showAllahNames(message, getLang) {
    const names = [
        "1. Ar-Rahman (The Most Gracious)",
        "2. Ar-Rahim (The Most Merciful)",
        "3. Al-Malik (The King)",
        "4. Al-Quddus (The Most Holy)",
        "5. As-Salam (The Source of Peace)",
        "6. Al-Mu'min (The Guardian of Faith)",
        "7. Al-Muhaymin (The Protector)",
        "8. Al-Aziz (The Almighty)",
        "9. Al-Jabbar (The Compeller)",
        "10. Al-Mutakabbir (The Supreme)"
    ];
    
    let response = getLang("namesTitle");
    names.forEach(name => {
        response += `• ${name}\n`;
    });
    
    response += `\n📚 Total shown: ${names.length}/99`;
    response += `\n💫 Use: {pn} names for more names`;
    
    return message.reply(response);
}

async function showIslamicReminder(message, getLang) {
    const reminders = [
        "Remember Allah in your prosperity, and He will remember you in your adversity.",
        "The best among you are those who have the best manners and character.",
        "When you are in prayer, you are conversing with Allah.",
        "Patience is of two kinds: patience over what pains you, and patience against what you covet.",
        "The strongest among you is the one who controls his anger.",
        "A Muslim is the one from whose tongue and hand other Muslims are safe.",
        "Allah does not look at your appearance or wealth, but He looks at your hearts and deeds.",
        "The world is a prison for the believer and a paradise for the disbeliever.",
        "Speak good or remain silent.",
        "The best of people are those that bring most benefit to the rest of mankind."
    ];
    
    const randomReminder = reminders[Math.floor(Math.random() * reminders.length)];
    
    return message.reply(getLang("reminder", { reminder: randomReminder }));
}

async function showBlessing(message, getLang) {
    const blessings = [
        "May Allah grant you success in this life and the hereafter.",
        "May Allah shower His mercy upon you and your family.",
        "May Allah accept your good deeds and forgive your shortcomings.",
        "May Allah protect you from all harm and evil.",
        "May Allah grant you peace, happiness, and prosperity.",
        "May Allah make you among the righteous and successful.",
        "May Allah bless you with good health and strong faith.",
        "May Allah guide you to the straight path.",
        "May Allah increase you in knowledge and wisdom.",
        "May Allah make you a means of benefit for others."
    ];
    
    const randomBlessing = blessings[Math.floor(Math.random() * blessings.length)];
    
    return message.reply(getLang("blessing", { blessing: randomBlessing }));
}

async function showRandomAyat(message, getLang) {
    const ayats = [
        {
            arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
            translation: "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
            surah: "Al-Fatihah",
            verse: "1:1"
        },
        {
            arabic: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
            translation: "All praise is due to Allah, Lord of the worlds.",
            surah: "Al-Fatihah",
            verse: "1:2"
        },
        {
            arabic: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
            translation: "It is You we worship and You we ask for help.",
            surah: "Al-Fatihah",
            verse: "1:5"
        }
    ];
    
    const randomAyat = ayats[Math.floor(Math.random() * ayats.length)];
    
    return message.reply(getLang("ayat", randomAyat));
}

async function showDailyDua(message, getLang) {
    const duas = [
        {
            arabic: "رَبِّ زِدْنِي عِلْمًا",
            translation: "My Lord, increase me in knowledge",
            meaning: "A dua for seeking knowledge and wisdom"
        },
        {
            arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
            translation: "Our Lord, give us in this world good and in the Hereafter good and protect us from the punishment of the Fire",
            meaning: "A comprehensive dua for good in both worlds"
        }
    ];
    
    const randomDua = duas[Math.floor(Math.random() * duas.length)];
    
    return message.reply(getLang("dua", randomDua));
}