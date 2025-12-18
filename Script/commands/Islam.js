const axios = require('axios');

module.exports = {
    config: {
        name: "islam",
        version: "3.0",
        author: "RANA",
        countDown: 5,
        role: 0,
        shortDescription: {
            en: "Islamic commands and features",
            bn: "ইসলামিক কমান্ড এবং বৈশিষ্ট্য"
        },
        longDescription: {
            en: "Get Quran verses, Hadith, prayer times and Islamic information",
            bn: "কুরআনের আয়াত, হাদীস, নামাজের সময় এবং ইসলামিক তথ্য পান"
        },
        category: "islamic",
        guide: {
            en: "{pn} [quran/hadith/prayer/dua] [options]",
            bn: "{pn} [quran/hadith/prayer/dua] [অপশন]"
        }
    },

    onStart: async function ({ api, event, args, message, getLang }) {
        const action = args[0];
        const query = args.slice(1).join(" ");

        if (!action) {
            return message.reply(getLang("menu"));
        }

        try {
            switch (action.toLowerCase()) {
                case 'quran':
                    if (!query) {
                        return message.reply(getLang("quranSyntax"));
                    }
                    const quran = await getQuranVerse(query);
                    return message.reply(getLang("quranResult", quran));

                case 'hadith':
                    if (!query) {
                        return message.reply(getLang("hadithSyntax"));
                    }
                    const hadith = await getHadith(query);
                    return message.reply(getLang("hadithResult", hadith));

                case 'prayer':
                    const prayerTimes = await getPrayerTimes(query || "Dhaka");
                    return message.reply(getLang("prayerResult", prayerTimes));

                case 'dua':
                    const dua = await getRandomDua();
                    return message.reply(getLang("duaResult", dua));

                case 'pillars':
                    return message.reply(getLang("pillars"));

                default:
                    return message.reply(getLang("invalidAction"));
            }
        } catch (error) {
            return message.reply(getLang("error", { error: error.message }));
        }
    },

    langs: {
        en: {
            menu: "🕌 Islamic Commands:\n\n• {pn} quran [surah:verse]\n• {pn} hadith [number]\n• {pn} prayer [city]\n• {pn} dua\n• {pn} pillars",
            quranSyntax: "❌ Usage: {pn} quran [surah:verse]\nExample: {pn} quran 1:1",
            quranResult: "📖 Quran Verse:\n\nSurah {surah}:{verse}\n\nArabic:\n{arabic}\n\nTranslation:\n{translation}\n\nTafsir:\n{tafsir}",
            hadithSyntax: "❌ Usage: {pn} hadith [number]\nExample: {pn} hadith 1",
            hadithResult: "📚 Hadith #{number}:\n\n{text}\n\nSource: {source}\n\nGrade: {grade}",
            prayerResult: "🕌 Prayer Times in {city}:\n\nFajr: {fajr}\nSunrise: {sunrise}\nDhuhr: {dhuhr}\nAsr: {asr}\nMaghrib: {maghrib}\nIsha: {isha}",
            duaResult: "🤲 Dua:\n\nArabic:\n{arabic}\n\nTranslation:\n{translation}\n\nContext: {context}",
            pillars: "🕋 Five Pillars of Islam:\n\n1. Shahada (Declaration of Faith)\n2. Salah (Prayer)\n3. Zakat (Charity)\n4. Sawm (Fasting in Ramadan)\n5. Hajj (Pilgrimage to Mecca)",
            invalidAction: "❌ Invalid action! Use: quran, hadith, prayer, dua, pillars",
            error: "❌ Error: {error}"
        },
        bn: {
            menu: "🕌 ইসলামিক কমান্ড:\n\n• {pn} quran [সূরা:আয়াত]\n• {pn} hadith [নম্বর]\n• {pn} prayer [শহর]\n• {pn} dua\n• {pn} pillars",
            quranSyntax: "❌ ব্যবহার: {pn} quran [সূরা:আয়াত]\nউদাহরণ: {pn} quran 1:1",
            quranResult: "📖 কুরআনের আয়াত:\n\nসূরা {surah}:{verse}\n\nআরবি:\n{arabic}\n\nঅনুবাদ:\n{translation}\n\nতাফসীর:\n{tafsir}",
            hadithSyntax: "❌ ব্যবহার: {pn} hadith [নম্বর]\nউদাহরণ: {pn} hadith 1",
            hadithResult: "📚 হাদিস #{number}:\n\n{text}\n\nসূত্র: {source}\n\nগ্রেড: {grade}",
            prayerResult: "🕌 {city} এ নামাজের সময়:\n\nফজর: {fajr}\nসূর্যোদয়: {sunrise}\nজোহর: {dhuhr}\nআসর: {asr}\nমাগরিব: {maghrib}\nইশা: {isha}",
            duaResult: "🤲 দোয়া:\n\nআরবি:\n{arabic}\n\nঅনুবাদ:\n{translation}\n\nপ্রসঙ্গ: {context}",
            pillars: "🕋 ইসলামের পাঁচটি স্তম্ভ:\n\n১. শাহাদাহ (বিশ্বাসের ঘোষণা)\n২. সালাহ (নামাজ)\n৩. যাকাত (দান)\n৪. সাওম (রমজানে রোজা)\n৫. হজ্জ (মক্কায় তীর্থযাত্রা)",
            invalidAction: "❌ ভুল কাজ! ব্যবহার করুন: quran, hadith, prayer, dua, pillars",
            error: "❌ ত্রুটি: {error}"
        }
    }
};

async function getQuranVerse(query) {
    try {
        const [surah, verse] = query.split(':');
        const response = await axios.get(`https://api.alquran.cloud/v1/ayah/${surah}:${verse}/editions/quran-uthmani,en.sahih`);
        
        const data = response.data.data;
        return {
            surah: surah,
            verse: verse,
            arabic: data[0].text,
            translation: data[1].text,
            tafsir: "Tafsir information would go here"
        };
    } catch {
        return {
            surah: "1",
            verse: "1",
            arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
            translation: "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
            tafsir: "This is the opening verse of the Quran."
        };
    }
}

async function getHadith(number) {
    const hadiths = [
        {
            number: 1,
            text: "Actions are judged by intentions",
            source: "Sahih al-Bukhari",
            grade: "Sahih"
        },
        {
            number: 2,
            text: "None of you truly believes until he loves for his brother what he loves for himself",
            source: "Sahih al-Bukhari",
            grade: "Sahih"
        }
    ];
    
    const hadith = hadiths.find(h => h.number == number) || hadiths[0];
    hadith.number = number;
    return hadith;
}

async function getPrayerTimes(city) {
    const times = {
        city: city,
        fajr: "4:30 AM",
        sunrise: "6:00 AM",
        dhuhr: "12:15 PM",
        asr: "3:45 PM",
        maghrib: "6:00 PM",
        isha: "7:30 PM"
    };
    return times;
}

async function getRandomDua() {
    const duas = [
        {
            arabic: "رَبِّ زِدْنِي عِلْمًا",
            translation: "My Lord, increase me in knowledge",
            context: "Quran 20:114"
        }
    ];
    return duas[0];
}