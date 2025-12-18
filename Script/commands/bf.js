const fs = require('fs-extra');
const path = require('path');

module.exports = {
    config: {
        name: "bf",
        version: "2.0",
        author: "RANA",
        countDown: 5,
        role: 0,
        shortDescription: {
            en: "Virtual boyfriend simulator",
            bn: "ভার্চুয়াল বয়ফ্রেন্ড সিমুলেটর"
        },
        longDescription: {
            en: "Interact with a virtual boyfriend with different personalities and activities",
            bn: "বিভিন্ন ব্যক্তিত্ব এবং কার্যক্রম সহ একটি ভার্চুয়াল বয়ফ্রেন্ডের সাথে যোগাযোগ করুন"
        },
        category: "fun",
        guide: {
            en: "{pn} [chat/date/gift/breakup/status]",
            bn: "{pn} [chat/date/gift/breakup/status]"
        }
    },

    onStart: async function ({ api, event, args, message, usersData, getLang }) {
        const action = args[0] || 'chat';
        const userId = event.senderID;

        try {
            const userData = await usersData.get(userId);
            if (!userData.bf) {
                userData.bf = {
                    status: 'single',
                    name: 'Alex',
                    personality: 'romantic',
                    affection: 50,
                    lastInteraction: Date.now(),
                    gifts: [],
                    dates: 0,
                    created: Date.now()
                };
                await usersData.set(userId, userData);
            }

            switch (action.toLowerCase()) {
                case 'chat':
                    return await chatWithBF(userId, args.slice(1).join(" "), api, event, message, usersData, getLang);
                
                case 'date':
                    return await goOnDate(userId, api, event, message, usersData, getLang);
                
                case 'gift':
                    const giftType = args[1];
                    return await giveGift(userId, giftType, api, event, message, usersData, getLang);
                
                case 'breakup':
                    return await breakUp(userId, api, event, message, usersData, getLang);
                
                case 'status':
                    return await checkStatus(userId, api, event, message, usersData, getLang);
                
                case 'name':
                    const newName = args.slice(1).join(" ");
                    return await changeName(userId, newName, api, event, message, usersData, getLang);
                
                case 'personality':
                    const personality = args[1];
                    return await changePersonality(userId, personality, api, event, message, usersData, getLang);
                
                case 'gifts':
                    return await showGifts(userId, api, event, message, usersData, getLang);
                
                case 'reset':
                    return await resetBF(userId, api, event, message, usersData, getLang);
                
                default:
                    return message.reply(getLang("menu"));
            }
        } catch (error) {
            console.error('BF simulator error:', error);
            return message.reply(getLang("error", { error: error.message }));
        }
    },

    langs: {
        en: {
            menu: "💖 Boyfriend Simulator:\n\n• {pn} chat [message] - Chat with your BF\n• {pn} date - Go on a virtual date\n• {pn} gift [type] - Give a gift\n• {pn} status - Check relationship status\n• {pn} breakup - Break up\n• {pn} name [name] - Change BF's name\n• {pn} personality [type] - Change personality\n• {pn} gifts - Show gift collection\n• {pn} reset - Reset relationship",
            chatResponse: "💬 {name}:\n\n{response}\n\n❤️ Affection: {affection}%",
            noMessage: "❌ Please type a message for your boyfriend",
            dateStarted: "💕 Going on a date with {name}...",
            dateResult: "✨ Date Completed!\n\nLocation: {location}\nActivity: {activity}\nResult: {result}\n\n❤️ Affection increased by {points}%\nTotal affection: {affection}%",
            giftGiven: "🎁 Gift Given!\n\nGift: {gift}\nReaction: {reaction}\n\n❤️ Affection: {affection}%",
            noGiftType: "❌ Please specify gift type\nAvailable: flowers, chocolate, jewelry, book, teddy, perfume",
            invalidGift: "❌ Invalid gift type",
            breakupConfirm: "💔 Are you sure you want to break up with {name}?\nType: {pn} breakup confirm",
            breakupComplete: "💔 Relationship ended with {name}.\nYou are now single. 💔",
            breakupCancelled: "✅ Breakup cancelled. Still together with {name}! ❤️",
            statusInfo: "💑 Relationship Status:\n\n👤 BF Name: {name}\n❤️ Affection: {affection}%\n🎭 Personality: {personality}\n💝 Gifts Received: {gifts}\n💕 Dates: {dates}\n⏰ Together for: {time}\n📊 Status: {status}",
            nameChanged: "✅ BF's name changed to {name}!",
            noName: "❌ Please provide a name",
            personalityChanged: "✅ Personality changed to {personality}!",
            invalidPersonality: "❌ Invalid personality\nAvailable: romantic, funny, serious, sweet, adventurous",
            giftsList: "🎁 Gift Collection:\n\n{gifts}\n\nTotal gifts: {count}",
            noGifts: "📭 No gifts received yet",
            resetComplete: "🔄 Relationship reset! New boyfriend created.",
            error: "❌ Error: {error}"
        },
        bn: {
            menu: "💖 বয়ফ্রেন্ড সিমুলেটর:\n\n• {pn} chat [বার্তা] - আপনার বয়ফ্রেন্ডের সাথে চ্যাট করুন\n• {pn} date - ভার্চুয়াল ডেটে যান\n• {pn} gift [টাইপ] - উপহার দিন\n• {pn} status - সম্পর্কের অবস্থা চেক করুন\n• {pn} breakup - ব্রেক আপ করুন\n• {pn} name [নাম] - বয়ফ্রেন্ডের নাম পরিবর্তন করুন\n• {pn} personality [টাইপ] - ব্যক্তিত্ব পরিবর্তন করুন\n• {pn} gifts - উপহার সংগ্রহ দেখুন\n• {pn} reset - সম্পর্ক রিসেট করুন",
            chatResponse: "💬 {name}:\n\n{response}\n\n❤️ ভালোবাসা: {affection}%",
            noMessage: "❌ আপনার বয়ফ্রেন্ডের জন্য একটি বার্তা টাইপ করুন",
            dateStarted: "💕 {name} এর সাথে ডেটে যাচ্ছি...",
            dateResult: "✨ ডেট সম্পন্ন!\n\nঅবস্থান: {location}\nকার্যক্রম: {activity}\nফলাফল: {result}\n\n❤️ ভালোবাসা বৃদ্ধি পেয়েছে {points}%\nমোট ভালোবাসা: {affection}%",
            giftGiven: "🎁 উপহার দেওয়া হয়েছে!\n\nউপহার: {gift}\nপ্রতিক্রিয়া: {reaction}\n\n❤️ ভালোবাসা: {affection}%",
            noGiftType: "❌ দয়া করে উপহারের ধরন নির্দিষ্ট করুন\nউপলব্ধ: flowers, chocolate, jewelry, book, teddy, perfume",
            invalidGift: "❌ অবৈধ উপহার ধরন",
            breakupConfirm: "💔 আপনি কি নিশ্চিত যে আপনি {name} এর সাথে ব্রেক আপ করতে চান?\nটাইপ করুন: {pn} breakup confirm",
            breakupComplete: "💔 {name} এর সাথে সম্পর্ক শেষ।\nআপনি এখন একা। 💔",
            breakupCancelled: "✅ ব্রেক আপ বাতিল করা হয়েছে। এখনও {name} এর সাথে আছেন! ❤️",
            statusInfo: "💑 সম্পর্কের অবস্থা:\n\n👤 বয়ফ্রেন্ডের নাম: {name}\n❤️ ভালোবাসা: {affection}%\n🎭 ব্যক্তিত্ব: {personality}\n💝 প্রাপ্ত উপহার: {gifts}\n💕 ডেট: {dates}\n⏰ একসাথে: {time}\n📊 অবস্থা: {status}",
            nameChanged: "✅ বয়ফ্রেন্ডের নাম পরিবর্তন করা হয়েছে {name}!",
            noName: "❌ দয়া করে একটি নাম দিন",
            personalityChanged: "✅ ব্যক্তিত্ব পরিবর্তন করা হয়েছে {personality}!",
            invalidPersonality: "❌ অবৈধ ব্যক্তিত্ব\nউপলব্ধ: romantic, funny, serious, sweet, adventurous",
            giftsList: "🎁 উপহার সংগ্রহ:\n\n{gifts}\n\nমোট উপহার: {count}",
            noGifts: "📭 এখনো কোন উপহার পাওয়া যায়নি",
            resetComplete: "🔄 সম্পর্ক রিসেট করা হয়েছে! নতুন বয়ফ্রেন্ড তৈরি করা হয়েছে।",
            error: "❌ ত্রুটি: {error}"
        }
    }
};

async function chatWithBF(userId, message, api, event, messageObj, usersData, getLang) {
    if (!message) {
        return messageObj.reply(getLang("noMessage"));
    }

    const userData = await usersData.get(userId);
    const bf = userData.bf;
    
    const response = generateBFResponse(message, bf.personality);
    
    // Increase affection based on message
    const affectionIncrease = Math.floor(Math.random() * 5) + 1;
    bf.affection = Math.min(100, bf.affection + affectionIncrease);
    bf.lastInteraction = Date.now();
    
    await usersData.set(userId, userData);
    
    return messageObj.reply(getLang("chatResponse", {
        name: bf.name,
        response: response,
        affection: bf.affection
    }));
}

async function goOnDate(userId, api, event, message, usersData, getLang) {
    const userData = await usersData.get(userId);
    const bf = userData.bf;
    
    if (bf.status !== 'dating') {
        bf.status = 'dating';
    }
    
    await message.reply(getLang("dateStarted", { name: bf.name }));
    
    // Simulate date
    const dateOptions = [
        {
            location: "Romantic Restaurant",
            activity: "Candlelight Dinner",
            result: "Had a wonderful time talking and laughing",
            affection: 10
        },
        {
            location: "Movie Theater",
            activity: "Watching a Romantic Movie",
            result: "Shared popcorn and held hands during the movie",
            affection: 8
        },
        {
            location: "Beach",
            activity: "Evening Walk",
            result: "Watched the sunset together, very romantic",
            affection: 12
        },
        {
            location: "Amusement Park",
            activity: "Riding Roller Coasters",
            result: "Screamed together on rides, lots of fun",
            affection: 9
        },
        {
            location: "Art Museum",
            activity: "Viewing Exhibits",
            result: "Discussed art and culture, intellectual connection",
            affection: 7
        }
    ];
    
    const date = dateOptions[Math.floor(Math.random() * dateOptions.length)];
    
    // Increase affection
    bf.affection = Math.min(100, bf.affection + date.affection);
    bf.dates = (bf.dates || 0) + 1;
    bf.lastInteraction = Date.now();
    
    await usersData.set(userId, userData);
    
    return message.reply(getLang("dateResult", {
        location: date.location,
        activity: date.activity,
        result: date.result,
        points: date.affection,
        affection: bf.affection
    }));
}

async function giveGift(userId, giftType, api, event, message, usersData, getLang) {
    if (!giftType) {
        return message.reply(getLang("noGiftType"));
    }

    const validGifts = {
        'flowers': { name: "🌹 Beautiful Roses", affection: 8 },
        'chocolate': { name: "🍫 Delicious Chocolate", affection: 6 },
        'jewelry': { name: "💎 Elegant Necklace", affection: 15 },
        'book': { name: "📚 Interesting Book", affection: 5 },
        'teddy': { name: "🧸 Cute Teddy Bear", affection: 10 },
        'perfume': { name: "💐 Luxury Perfume", affection: 12 }
    };

    if (!validGifts[giftType.toLowerCase()]) {
        return message.reply(getLang("invalidGift"));
    }

    const userData = await usersData.get(userId);
    const bf = userData.bf;
    const gift = validGifts[giftType.toLowerCase()];
    
    // Add gift to collection
    if (!bf.gifts) bf.gifts = [];
    bf.gifts.push({
        name: gift.name,
        date: Date.now(),
        type: giftType
    });
    
    // Increase affection
    bf.affection = Math.min(100, bf.affection + gift.affection);
    bf.lastInteraction = Date.now();
    
    await usersData.set(userId, userData);
    
    const reactions = [
        "Wow! Thank you so much! ❤️",
        "This is amazing! You're so thoughtful! 😊",
        "I love it! You know me so well! 💖",
        "You shouldn't have! But I'm glad you did! 😍",
        "This is perfect! Thank you, my love! 💕"
    ];
    
    const reaction = reactions[Math.floor(Math.random() * reactions.length)];
    
    return message.reply(getLang("giftGiven", {
        gift: gift.name,
        reaction: reaction,
        affection: bf.affection
    }));
}

async function breakUp(userId, api, event, message, usersData, getLang) {
    const userData = await usersData.get(userId);
    const bf = userData.bf;
    
    if (event.body.toLowerCase().includes('confirm')) {
        // Confirm breakup
        const bfName = bf.name;
        
        // Reset BF data
        userData.bf = {
            status: 'single',
            name: generateRandomName(),
            personality: getRandomPersonality(),
            affection: 50,
            lastInteraction: Date.now(),
            gifts: [],
            dates: 0,
            created: Date.now()
        };
        
        await usersData.set(userId, userData);
        
        return message.reply(getLang("breakupComplete", { name: bfName }));
    } else {
        // Ask for confirmation
        return message.reply(getLang("breakupConfirm", { name: bf.name, pn: '.bf' }));
    }
}

async function checkStatus(userId, api, event, message, usersData, getLang) {
    const userData = await usersData.get(userId);
    const bf = userData.bf;
    
    const timeTogether = formatTime(Date.now() - bf.created);
    const status = bf.affection >= 80 ? "Very Strong ❤️" : 
                  bf.affection >= 60 ? "Strong 💕" : 
                  bf.affection >= 40 ? "Good 💖" : 
                  bf.affection >= 20 ? "Okay 💝" : "Needs Work 💔";
    
    return message.reply(getLang("statusInfo", {
        name: bf.name,
        affection: bf.affection,
        personality: bf.personality.charAt(0).toUpperCase() + bf.personality.slice(1),
        gifts: bf.gifts?.length || 0,
        dates: bf.dates || 0,
        time: timeTogether,
        status: status
    }));
}

async function changeName(userId, newName, api, event, message, usersData, getLang) {
    if (!newName) {
        return message.reply(getLang("noName"));
    }

    const userData = await usersData.get(userId);
    userData.bf.name = newName;
    userData.bf.lastInteraction = Date.now();
    
    await usersData.set(userId, userData);
    
    return message.reply(getLang("nameChanged", { name: newName }));
}

async function changePersonality(userId, personality, api, event, message, usersData, getLang) {
    if (!personality) {
        return message.reply(getLang("invalidPersonality"));
    }

    const validPersonalities = ['romantic', 'funny', 'serious', 'sweet', 'adventurous'];
    
    if (!validPersonalities.includes(personality.toLowerCase())) {
        return message.reply(getLang("invalidPersonality"));
    }

    const userData = await usersData.get(userId);
    userData.bf.personality = personality.toLowerCase();
    userData.bf.lastInteraction = Date.now();
    
    await usersData.set(userId, userData);
    
    return message.reply(getLang("personalityChanged", { personality: personality }));
}

async function showGifts(userId, api, event, message, usersData, getLang) {
    const userData = await usersData.get(userId);
    const gifts = userData.bf.gifts || [];
    
    if (gifts.length === 0) {
        return message.reply(getLang("noGifts"));
    }
    
    let giftsList = "";
    gifts.forEach((gift, index) => {
        const date = new Date(gift.date).toLocaleDateString();
        giftsList += `${index + 1}. ${gift.name} (${date})\n`;
    });
    
    return message.reply(getLang("giftsList", {
        gifts: giftsList,
        count: gifts.length
    }));
}

async function resetBF(userId, api, event, message, usersData, getLang) {
    const userData = await usersData.get(userId);
    
    userData.bf = {
        status: 'single',
        name: generateRandomName(),
        personality: getRandomPersonality(),
        affection: 50,
        lastInteraction: Date.now(),
        gifts: [],
        dates: 0,
        created: Date.now()
    };
    
    await usersData.set(userId, userData);
    
    return message.reply(getLang("resetComplete"));
}

function generateBFResponse(message, personality) {
    const messageLower = message.toLowerCase();
    
    const responses = {
        romantic: [
            "You mean everything to me, my love. ❤️",
            "Every moment with you is special. 💕",
            "I was just thinking about how lucky I am to have you. 😊",
            "You're the most beautiful person in my world. 🌹",
            "My heart beats only for you. 💓"
        ],
        funny: [
            "That's what she said! 😂 Just kidding, I love you!",
            "You're funnier than my last attempt at cooking! 😄",
            "I'd tell you a chemistry joke, but I know I wouldn't get a reaction! 😆",
            "You're my favorite notification! 📱❤️",
            "I was going to make a joke about pizza, but it's too cheesy! 🍕"
        ],
        serious: [
            "I appreciate your thoughtful message. 🙏",
            "That's an important point you've raised. 💭",
            "I value our conversations deeply. 🗣️",
            "Your perspective is always worth considering. 👁️",
            "Let's discuss this further when we have more time. ⏰"
        ],
        sweet: [
            "You make my heart smile! 😊💖",
            "Just thinking about you makes me happy! 🌈",
            "You're sweeter than chocolate! 🍫❤️",
            "Every day with you is a blessing! 🌟",
            "You're my sunshine on a cloudy day! ☀️"
        ],
        adventurous: [
            "Let's go on an adventure together! 🗺️",
            "Life with you is always exciting! 🎢",
            "What's our next adventure? I'm ready! ⛰️",
            "You make every day an adventure! 🚀",
            "Let's explore the world together! 🌍"
        ]
    };

    // Check for specific keywords
    if (messageLower.includes('love') || messageLower.includes('miss')) {
        return "I love you too! More than anything! ❤️";
    }
    
    if (messageLower.includes('hello') || messageLower.includes('hi') || messageLower.includes('hey')) {
        return "Hello my love! How are you today? 😊";
    }
    
    if (messageLower.includes('how are you')) {
        return "I'm doing great now that I'm talking to you! 😄";
    }
    
    if (messageLower.includes('good night') || messageLower.includes('night')) {
        return "Good night, my love! Sweet dreams! 🌙💤";
    }
    
    if (messageLower.includes('good morning') || messageLower.includes('morning')) {
        return "Good morning, beautiful! Ready to conquer the day? ☀️";
    }
    
    if (messageLower.includes('date') || messageLower.includes('go out')) {
        return "I'd love to go on a date with you! Where should we go? 💕";
    }
    
    // Return random response based on personality
    const personalityResponses = responses[personality] || responses.romantic;
    return personalityResponses[Math.floor(Math.random() * personalityResponses.length)];
}

function generateRandomName() {
    const names = ['Alex', 'Chris', 'Jordan', 'Taylor', 'Casey', 'Morgan', 'Dylan', 'Jamie', 'Riley', 'Skyler'];
    return names[Math.floor(Math.random() * names.length)];
}

function getRandomPersonality() {
    const personalities = ['romantic', 'funny', 'serious', 'sweet', 'adventurous'];
    return personalities[Math.floor(Math.random() * personalities.length)];
}

function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    return `${seconds} second${seconds > 1 ? 's' : ''}`;
}