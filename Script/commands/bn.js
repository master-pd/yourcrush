const fs = require('fs-extra');
const path = require('path');

module.exports = {
    config: {
        name: "bn",
        version: "2.0",
        author: "RANA",
        countDown: 5,
        role: 0,
        shortDescription: {
            en: "Bangla language commands",
            bn: "বাংলা ভাষা কমান্ড"
        },
        longDescription: {
            en: "Bangla language tools, translation, and utilities",
            bn: "বাংলা ভাষার টুল, অনুবাদ এবং ইউটিলিটি"
        },
        category: "language",
        guide: {
            en: "{pn} [translate/typing/date/number/word]",
            bn: "{pn} [translate/typing/date/number/word]"
        }
    },

    onStart: async function ({ api, event, args, message, getLang }) {
        const action = args[0] || 'help';

        try {
            switch (action.toLowerCase()) {
                case 'translate':
                    const text = args.slice(1).join(" ");
                    return await translateToBangla(text, api, event, message, getLang);
                
                case 'typing':
                    const banglaText = args.slice(1).join(" ");
                    return await banglaTyping(banglaText, api, event, message, getLang);
                
                case 'date':
                    return await banglaDate(api, event, message, getLang);
                
                case 'number':
                    const number = args[1];
                    return await banglaNumber(number, api, event, message, getLang);
                
                case 'word':
                    return await randomBanglaWord(api, event, message, getLang);
                
                case 'alphabet':
                    return await banglaAlphabet(api, event, message, getLang);
                
                case 'poem':
                    return await banglaPoem(api, event, message, getLang);
                
                case 'quote':
                    return await banglaQuote(api, event, message, getLang);
                
                case 'font':
                    const fontText = args.slice(1).join(" ");
                    return await banglaFont(fontText, api, event, message, getLang);
                
                case 'help':
                    return message.reply(getLang("menu"));
                
                default:
                    return await translateToBangla(args.join(" "), api, event, message, getLang);
            }
        } catch (error) {
            console.error('Bangla system error:', error);
            return message.reply(getLang("error", { error: error.message }));
        }
    },

    langs: {
        en: {
            menu: "🇧🇩 Bangla Language System:\n\n• {pn} translate [text] - Translate to Bangla\n• {pn} typing [text] - Bangla typing practice\n• {pn} date - Current date in Bangla\n• {pn} number [num] - Number in Bangla\n• {pn} word - Random Bangla word\n• {pn} alphabet - Bangla alphabet\n• {pn} poem - Random Bangla poem\n• {pn} quote - Bangla quote\n• {pn} font [text] - Stylish Bangla text",
            translated: "🔤 Translation:\n\nEnglish: {english}\nBangla: {bangla}",
            noText: "❌ Please provide text to translate",
            typing: "⌨️ Bangla Typing Practice:\n\nText: {text}\n\nType this in Bangla:",
            dateToday: "📅 Today's Date:\n\nEnglish: {english}\nBangla: {bangla}",
            numberText: "🔢 Number in Bangla:\n\nEnglish: {english}\nBangla: {bangla}",
            invalidNumber: "❌ Please provide a valid number",
            randomWord: "📝 Random Bangla Word:\n\nWord: {word}\nMeaning: {meaning}\nExample: {example}",
            alphabet: "🔤 Bangla Alphabet (বর্ণমালা):\n\n{letters}\n\nTotal: 50 letters",
            poem: "📜 Bangla Poem:\n\n{poem}\n\n- {poet}",
            quote: "💬 Bangla Quote:\n\n\"{quote}\"\n\n- {author}",
            fontText: "🎨 Stylish Bangla Text:\n\n{text}",
            noFontText: "❌ Please provide text for styling",
            error: "❌ Error: {error}"
        },
        bn: {
            menu: "🇧🇩 বাংলা ভাষা ব্যবস্থা:\n\n• {pn} translate [টেক্সট] - বাংলায় অনুবাদ করুন\n• {pn} typing [টেক্সট] - বাংলা টাইপিং অনুশীলন\n• {pn} date - বাংলায় বর্তমান তারিখ\n• {pn} number [সংখ্যা] - বাংলায় সংখ্যা\n• {pn} word - এলোমেলো বাংলা শব্দ\n• {pn} alphabet - বাংলা বর্ণমালা\n• {pn} poem - বাংলা কবিতা\n• {pn} quote - বাংলা উক্তি\n• {pn} font [টেক্সট] - স্টাইলিশ বাংলা টেক্সট",
            translated: "🔤 অনুবাদ:\n\nইংরেজি: {english}\nবাংলা: {bangla}",
            noText: "❌ অনুবাদ করার জন্য টেক্সট দিন",
            typing: "⌨️ বাংলা টাইপিং অনুশীলন:\n\nটেক্সট: {text}\n\nএটি বাংলায় টাইপ করুন:",
            dateToday: "📅 আজকের তারিখ:\n\nইংরেজি: {english}\nবাংলা: {bangla}",
            numberText: "🔢 বাংলায় সংখ্যা:\n\nইংরেজি: {english}\nবাংলা: {bangla}",
            invalidNumber: "❌ দয়া করে একটি বৈধ সংখ্যা দিন",
            randomWord: "📝 এলোমেলো বাংলা শব্দ:\n\nশব্দ: {word}\nঅর্থ: {meaning}\nউদাহরণ: {example}",
            alphabet: "🔤 বাংলা বর্ণমালা:\n\n{letters}\n\nমোট: ৫০টি বর্ণ",
            poem: "📜 বাংলা কবিতা:\n\n{poem}\n\n- {poet}",
            quote: "💬 বাংলা উক্তি:\n\n\"{quote}\"\n\n- {author}",
            fontText: "🎨 স্টাইলিশ বাংলা টেক্সট:\n\n{text}",
            noFontText: "❌ স্টাইলিংয়ের জন্য টেক্সট দিন",
            error: "❌ ত্রুটি: {error}"
        }
    }
};

async function translateToBangla(text, api, event, message, getLang) {
    if (!text) {
        return message.reply(getLang("noText"));
    }

    const translations = {
        "hello": "হ্যালো",
        "how are you": "আপনি কেমন আছেন",
        "thank you": "ধন্যবাদ",
        "good morning": "সুপ্রভাত",
        "good night": "শুভ রাত্রি",
        "i love you": "আমি তোমাকে ভালোবাসি",
        "what is your name": "তোমার নাম কি",
        "where are you from": "তুমি কোথা থেকে আসছ",
        "how old are you": "তোমার বয়স কত",
        "nice to meet you": "তোমার সাথে পরিচয় হয়ে ভালো লাগলো",
        "please help me": "দয়া করে আমাকে সাহায্য করুন",
        "happy birthday": "শুভ জন্মদিন",
        "congratulations": "অভিনন্দন",
        "goodbye": "বিদায়",
        "see you later": "পরে দেখা হবে",
        "have a nice day": "আপনার দিনটি শুভ হোক",
        "i am fine": "আমি ভালো আছি",
        "what time is it": "কটা বাজে",
        "where is the bathroom": "বাথরুম কোথায়",
        "how much does it cost": "এটার দাম কত",
        "i don't understand": "আমি বুঝতে পারছি না"
    };

    let translated = text;
    
    // Try to translate common phrases
    for (const [english, bangla] of Object.entries(translations)) {
        if (text.toLowerCase().includes(english.toLowerCase())) {
            translated = text.replace(new RegExp(english, 'gi'), bangla);
            break;
        }
    }

    // If no translation found, use a simple transliteration
    if (translated === text) {
        translated = simpleTransliteration(text);
    }

    return message.reply(getLang("translated", {
        english: text,
        bangla: translated
    }));
}

async function banglaTyping(text, api, event, message, getLang) {
    if (!text) {
        text = "আমি বাংলায় গান গাই";
    }

    return message.reply(getLang("typing", { text: text }));
}

async function banglaDate(api, event, message, getLang) {
    const now = new Date();
    
    const englishDate = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const banglaMonths = {
        'January': 'জানুয়ারি',
        'February': 'ফেব্রুয়ারি',
        'March': 'মার্চ',
        'April': 'এপ্রিল',
        'May': 'মে',
        'June': 'জুন',
        'July': 'জুলাই',
        'August': 'আগস্ট',
        'September': 'সেপ্টেম্বর',
        'October': 'অক্টোবর',
        'November': 'নভেম্বর',
        'December': 'ডিসেম্বর'
    };
    
    const banglaDays = {
        'Sunday': 'রবিবার',
        'Monday': 'সোমবার',
        'Tuesday': 'মঙ্গলবার',
        'Wednesday': 'বুধবার',
        'Thursday': 'বৃহস্পতিবার',
        'Friday': 'শুক্রবার',
        'Saturday': 'শনিবার'
    };
    
    let banglaDate = englishDate;
    
    // Replace month
    for (const [engMonth, bangMonth] of Object.entries(banglaMonths)) {
        banglaDate = banglaDate.replace(engMonth, bangMonth);
    }
    
    // Replace day
    for (const [engDay, bangDay] of Object.entries(banglaDays)) {
        banglaDate = banglaDate.replace(engDay, bangDay);
    }
    
    // Convert numbers to Bangla
    banglaDate = convertNumbersToBangla(banglaDate);
    
    return message.reply(getLang("dateToday", {
        english: englishDate,
        bangla: banglaDate
    }));
}

async function banglaNumber(number, api, event, message, getLang) {
    if (!number || isNaN(number)) {
        return message.reply(getLang("invalidNumber"));
    }

    const num = parseInt(number);
    
    if (num < 0 || num > 999999999) {
        return message.reply("❌