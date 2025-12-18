const axios = require('axios');

module.exports = {
    config: {
        name: "baby",
        version: "2.0",
        author: "RANA",
        countDown: 5,
        role: 0,
        shortDescription: {
            en: "Generate baby names and meanings",
            bn: "শিশুর নাম এবং অর্থ তৈরি করুন"
        },
        longDescription: {
            en: "Generate baby names with meanings, origins, and popularity information",
            bn: "অর্থ, উৎপত্তি এবং জনপ্রিয়তা তথ্য সহ শিশুর নাম তৈরি করুন"
        },
        category: "fun",
        guide: {
            en: "{pn} [gender] [origin] or {pn} random",
            bn: "{pn} [লিঙ্গ] [উৎপত্তি] বা {pn} random"
        }
    },

    onStart: async function ({ api, event, args, message, getLang }) {
        const gender = args[0]?.toLowerCase() || 'both';
        const origin = args[1]?.toLowerCase() || 'any';

        try {
            if (gender === 'random') {
                const randomName = await getRandomName();
                return message.reply(getLang("randomName", randomName));
            }

            await message.reply(getLang("generating", { gender, origin }));

            const names = await generateBabyNames(gender, origin);
            
            if (names.length === 0) {
                return message.reply(getLang("noNames"));
            }

            let response = getLang("nameList", { gender, origin });
            
            names.forEach((name, index) => {
                response += `\n${index + 1}. ${name.name} (${name.gender})\n`;
                response += `   ↳ Meaning: ${name.meaning}\n`;
                response += `   ↳ Origin: ${name.origin}\n`;
                
                if (name.popularity) {
                    response += `   ↳ Popularity: ${name.popularity}\n`;
                }
            });

            response += `\n📊 Total names: ${names.length}`;
            response += `\n💡 Use: {pn} random for a random name`;
            
            await message.reply(response);

        } catch (error) {
            console.error('Baby name generator error:', error);
            await message.reply(getLang("error", { error: error.message }));
        }
    },

    langs: {
        en: {
            generating: "👶 Generating baby names...\nGender: {gender}\nOrigin: {origin}",
            randomName: "👶 Random Baby Name:\n\nName: {name}\nGender: {gender}\nMeaning: {meaning}\nOrigin: {origin}",
            noNames: "❌ No names found with those criteria",
            nameList: "👶 Baby Names - {gender} ({origin}):\n\n",
            origins: "🌍 Available Origins:\n\n• arabic\n• english\n• spanish\n• french\n• german\n• italian\n• greek\n• hebrew\n• indian\n• japanese\n• korean\n• chinese\n• african\n• celtic\n• scandinavian",
            genders: "👫 Available Genders:\n\n• boy\n• girl\n• both\n• unisex",
            help: "👶 Baby Name Generator Help:\n\n• {pn} [gender] [origin]\n• {pn} random\n• {pn} origins\n• {pn} genders\n\nExamples:\n• {pn} boy english\n• {pn} girl arabic\n• {pn} both french",
            error: "❌ Error: {error}"
        },
        bn: {
            generating: "👶 শিশুর নাম তৈরি করা হচ্ছে...\nলিঙ্গ: {gender}\nউৎপত্তি: {origin}",
            randomName: "👶 এলোমেলো শিশুর নাম:\n\nনাম: {name}\nলিঙ্গ: {gender}\nঅর্থ: {meaning}\nউৎপত্তি: {origin}",
            noNames: "❌ সেই মানদণ্ডের সাথে কোন নাম পাওয়া যায়নি",
            nameList: "👶 শিশুর নাম - {gender} ({origin}):\n\n",
            origins: "🌍 উপলব্ধ উৎপত্তি:\n\n• আরবি\n• ইংরেজি\n• স্প্যানিশ\n• ফরাসি\n• জার্মান\n• ইতালিয়ান\n• গ্রীক\n• হিব্রু\n• ভারতীয়\n• জাপানি\n• কোরিয়ান\n• চাইনিজ\n• আফ্রিকান\n• কেলটিক\n• স্ক্যান্ডিনেভিয়ান",
            genders: "👫 উপলব্ধ লিঙ্গ:\n\n• ছেলে\n• মেয়ে\n• উভয়\n• ইউনিসেক্স",
            help: "👶 শিশুর নাম জেনারেটর সাহায্য:\n\n• {pn} [লিঙ্গ] [উৎপত্তি]\n• {pn} random\n• {pn} origins\n• {pn} genders\n\nউদাহরণ:\n• {pn} boy english\n• {pn} girl arabic\n• {pn} both french",
            error: "❌ ত্রুটি: {error}"
        }
    },

    onChat: async function ({ event, message, getLang }) {
        if (event.body && event.body.toLowerCase() === 'baby origins') {
            return message.reply(getLang("origins"));
        }
        
        if (event.body && event.body.toLowerCase() === 'baby genders') {
            return message.reply(getLang("genders"));
        }
        
        if (event.body && event.body.toLowerCase() === 'baby help') {
            return message.reply(getLang("help"));
        }
    }
};

async function generateBabyNames(gender, origin) {
    const babyNames = {
        boy: [
            { name: "Aarav", meaning: "Peaceful", origin: "Indian", gender: "Boy", popularity: "High" },
            { name: "Liam", meaning: "Strong-willed warrior", origin: "English", gender: "Boy", popularity: "Very High" },
            { name: "Noah", meaning: "Rest, comfort", origin: "Hebrew", gender: "Boy", popularity: "High" },
            { name: "Muhammad", meaning: "Praised", origin: "Arabic", gender: "Boy", popularity: "Very High" },
            { name: "Oliver", meaning: "Olive tree", origin: "English", gender: "Boy", popularity: "High" },
            { name: "Lucas", meaning: "Light", origin: "Latin", gender: "Boy", popularity: "Medium" },
            { name: "Ethan", meaning: "Strong, firm", origin: "Hebrew", gender: "Boy", popularity: "Medium" },
            { name: "Alexander", meaning: "Defender of mankind", origin: "Greek", gender: "Boy", popularity: "High" },
            { name: "James", meaning: "Supplanter", origin: "Hebrew", gender: "Boy", popularity: "High" },
            { name: "Benjamin", meaning: "Son of the right hand", origin: "Hebrew", gender: "Boy", popularity: "Medium" }
        ],
        girl: [
            { name: "Olivia", meaning: "Olive tree", origin: "English", gender: "Girl", popularity: "Very High" },
            { name: "Emma", meaning: "Universal", origin: "German", gender: "Girl", popularity: "High" },
            { name: "Ava", meaning: "Bird", origin: "Latin", gender: "Girl", popularity: "High" },
            { name: "Sophia", meaning: "Wisdom", origin: "Greek", gender: "Girl", popularity: "High" },
            { name: "Isabella", meaning: "God is my oath", origin: "Hebrew", gender: "Girl", popularity: "Medium" },
            { name: "Mia", meaning: "Mine", origin: "Italian", gender: "Girl", popularity: "Medium" },
            { name: "Charlotte", meaning: "Free man", origin: "French", gender: "Girl", popularity: "High" },
            { name: "Amelia", meaning: "Work", origin: "German", gender: "Girl", popularity: "Medium" },
            { name: "Harper", meaning: "Harp player", origin: "English", gender: "Girl", popularity: "Medium" },
            { name: "Evelyn", meaning: "Desired", origin: "English", gender: "Girl", popularity: "Medium" }
        ],
        unisex: [
            { name: "Jordan", meaning: "To flow down", origin: "Hebrew", gender: "Unisex", popularity: "Medium" },
            { name: "Taylor", meaning: "Tailor", origin: "English", gender: "Unisex", popularity: "Medium" },
            { name: "Riley", meaning: "Courageous", origin: "English", gender: "Unisex", popularity: "Medium" },
            { name: "Morgan", meaning: "Sea circle", origin: "Welsh", gender: "Unisex", popularity: "Low" },
            { name: "Alex", meaning: "Defender", origin: "Greek", gender: "Unisex", popularity: "High" }
        ]
    };

    let filteredNames = [];
    
    if (gender === 'both') {
        filteredNames = [...babyNames.boy, ...babyNames.girl, ...babyNames.unisex];
    } else if (gender === 'boy') {
        filteredNames = babyNames.boy;
    } else if (gender === 'girl') {
        filteredNames = babyNames.girl;
    } else if (gender === 'unisex') {
        filteredNames = babyNames.unisex;
    } else {
        filteredNames = [...babyNames.boy, ...babyNames.girl, ...babyNames.unisex];
    }

    if (origin !== 'any') {
        filteredNames = filteredNames.filter(name => 
            name.origin.toLowerCase().includes(origin)
        );
    }

    return filteredNames.slice(0, 10);
}

async function getRandomName() {
    const allNames = [
        { name: "Aarav", meaning: "Peaceful", origin: "Indian", gender: "Boy" },
        { name: "Liam", meaning: "Strong-willed warrior", origin: "English", gender: "Boy" },
        { name: "Olivia", meaning: "Olive tree", origin: "English", gender: "Girl" },
        { name: "Emma", meaning: "Universal", origin: "German", gender: "Girl" },
        { name: "Noah", meaning: "Rest, comfort", origin: "Hebrew", gender: "Boy" },
        { name: "Sophia", meaning: "Wisdom", origin: "Greek", gender: "Girl" },
        { name: "Muhammad", meaning: "Praised", origin: "Arabic", gender: "Boy" },
        { name: "Ava", meaning: "Bird", origin: "Latin", gender: "Girl" },
        { name: "Oliver", meaning: "Olive tree", origin: "English", gender: "Boy" },
        { name: "Isabella", meaning: "God is my oath", origin: "Hebrew", gender: "Girl" }
    ];

    return allNames[Math.floor(Math.random() * allNames.length)];
}