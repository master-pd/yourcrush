const fs = require('fs-extra');
const path = require('path');
const Canvas = require('canvas');

module.exports = {
    config: {
        name: "birthday",
        version: "3.0",
        author: "RANA",
        countDown: 10,
        role: 0,
        shortDescription: {
            en: "Birthday celebration system",
            bn: "জন্মদিন উদযাপন ব্যবস্থা"
        },
        longDescription: {
            en: "Celebrate birthdays with wishes, cards, and countdowns",
            bn: "শুভেচ্ছা, কার্ড এবং কাউন্টডাউন সহ জন্মদিন উদযাপন করুন"
        },
        category: "fun",
        guide: {
            en: "{pn} [set/wish/card/countdown/remind]",
            bn: "{pn} [set/wish/card/countdown/remind]"
        }
    },

    onStart: async function ({ api, event, args, message, usersData, threadsData, getLang }) {
        const action = args[0] || 'wish';
        const userId = event.senderID;

        try {
            switch (action.toLowerCase()) {
                case 'set':
                    const birthday = args[1];
                    return await setBirthday(userId, birthday, api, event, message, usersData, getLang);
                
                case 'wish':
                    const targetUser = args[1];
                    return await sendBirthdayWish(targetUser, api, event, message, usersData, getLang);
                
                case 'card':
                    const cardUser = args[1];
                    return await generateBirthdayCard(cardUser, api, event, message, usersData, getLang);
                
                case 'countdown':
                    return await showCountdown(userId, api, event, message, usersData, getLang);
                
                case 'remind':
                    return await setReminder(userId, api, event, message, usersData, threadsData, getLang);
                
                case 'list':
                    return await upcomingBirthdays(api, event, message, usersData, getLang);
                
                case 'today':
                    return await todayBirthdays(api, event, message, usersData, getLang);
                
                case 'delete':
                    return await deleteBirthday(userId, api, event, message, usersData, getLang);
                
                case 'info':
                    return await birthdayInfo(userId, api, event, message, usersData, getLang);
                
                default:
                    return message.reply(getLang("menu"));
            }
        } catch (error) {
            console.error('Birthday system error:', error);
            return message.reply(getLang("error", { error: error.message }));
        }
    },

    langs: {
        en: {
            menu: "🎉 Birthday System:\n\n• {pn} set [DD/MM] - Set your birthday\n• {pn} wish [@user] - Wish someone\n• {pn} card [@user] - Generate birthday card\n• {pn} countdown - Days until your birthday\n• {pn} remind - Set birthday reminder\n• {pn} list - Upcoming birthdays\n• {pn} today - Today's birthdays\n• {pn} delete - Delete your birthday\n• {pn} info - Your birthday info",
            birthdaySet: "✅ Birthday set successfully!\n\n🎂 Date: {date}\n🎉 Next birthday: {next}\n⏳ Days remaining: {days}",
            invalidDate: "❌ Invalid date format! Use: DD/MM\nExample: {pn} set 15/08",
            birthdayWish: "🎉 Happy Birthday {name}! 🎂\n\n{message}\n\n🎁 From: {from}",
            noTarget: "❌ Please mention someone or provide user ID",
            cardGenerating: "🎨 Generating birthday card...",
            cardSent: "🎁 Birthday card sent to {name}!",
            countdownInfo: "⏳ Birthday Countdown:\n\n🎂 Your birthday: {date}\n📅 Next: {next}\n⏰ Days remaining: {days}\n🎉 Age: {age}",
            noBirthdaySet: "❌ You haven't set your birthday yet\nUse: {pn} set [DD/MM]",
            reminderSet: "🔔 Birthday reminder set!\n\nI'll remind everyone in this group 1 day before birthdays.",
            upcomingList: "📅 Upcoming Birthdays:\n\n{list}\n\nTotal: {count} birthdays",
            todayList: "🎂 Today's Birthdays:\n\n{list}\n\nWish them: {pn} wish @user",
            birthdayDeleted: "🗑️ Your birthday information has been deleted.",
            birthdayInfo: "🎂 Your Birthday Information:\n\n📅 Date: {date}\n🎉 Next: {next}\n🎂 Age: {age}\n⏳ Days left: {days}",
            error: "❌ Error: {error}"
        },
        bn: {
            menu: "🎉 জন্মদিন ব্যবস্থা:\n\n• {pn} set [DD/MM] - আপনার জন্মদিন সেট করুন\n• {pn} wish [@user] - কাউকে শুভেচ্ছা দিন\n• {pn} card [@user] - জন্মদিন কার্ড তৈরি করুন\n• {pn} countdown - আপনার জন্মদিন পর্যন্ত দিন\n• {pn} remind - জন্মদিন রিমাইন্ডার সেট করুন\n• {pn} list - আসন্ন জন্মদিন\n• {pn} today - আজকের জন্মদিন\n• {pn} delete - আপনার জন্মদিন মুছুন\n• {pn} info - আপনার জন্মদিন তথ্য",
            birthdaySet: "✅ জন্মদিন সফলভাবে সেট করা হয়েছে!\n\n🎂 তারিখ: {date}\n🎉 পরবর্তী জন্মদিন: {next}\n⏳ বাকি দিন: {days}",
            invalidDate: "❌ অবৈধ তারিখ ফরম্যাট! ব্যবহার করুন: DD/MM\nউদাহরণ: {pn} set 15/08",
            birthdayWish: "🎉 শুভ জন্মদিন {name}! 🎂\n\n{message}\n\n🎁 থেকে: {from}",
            noTarget: "❌ দয়া করে কাউকে উল্লেখ করুন বা ইউজার আইডি দিন",
            cardGenerating: "🎨 জন্মদিন কার্ড তৈরি হচ্ছে...",
            cardSent: "🎁 জন্মদিন কার্ড {name} কে পাঠানো হয়েছে!",
            countdownInfo: "⏳ জন্মদিন কাউন্টডাউন:\n\n🎂 আপনার জন্মদিন: {date}\n📅 পরবর্তী: {next}\n⏰ বাকি দিন: {days}\n🎉 বয়স: {age}",
            noBirthdaySet: "❌ আপনি এখনো আপনার জন্মদিন সেট করেননি\nব্যবহার করুন: {pn} set [DD/MM]",
            reminderSet: "🔔 জন্মদিন রিমাইন্ডার সেট করা হয়েছে!\n\nআমি জন্মদিনের ১ দিন আগে এই গ্রুপের সবাইকে মনে করিয়ে দেব।",
            upcomingList: "📅 আসন্ন জন্মদিন:\n\n{list}\n\nমোট: {count} জন্মদিন",
            todayList: "🎂 আজকের জন্মদিন:\n\n{list}\n\nতাদের শুভেচ্ছা দিন: {pn} wish @user",
            birthdayDeleted: "🗑️ আপনার জন্মদিন তথ্য মুছে ফেলা হয়েছে।",
            birthdayInfo: "🎂 আপনার জন্মদিন তথ্য:\n\n📅 তারিখ: {date}\n🎉 পরবর্তী: {next}\n🎂 বয়স: {age}\n⏳ বাকি দিন: {days}",
            error: "❌ ত্রুটি: {error}"
        }
    }
};

async function setBirthday(userId, birthday, api, event, message, usersData, getLang) {
    if (!birthday) {
        return message.reply(getLang("invalidDate"));
    }

    const dateRegex = /^(\d{1,2})\/(\d{1,2})$/;
    const match = birthday.match(dateRegex);
    
    if (!match) {
        return message.reply(getLang("invalidDate"));
    }

    const day = parseInt(match[1]);
    const month = parseInt(match[2]);
    
    if (day < 1 || day > 31 || month < 1 || month > 12) {
        return message.reply(getLang("invalidDate"));
    }

    const userData = await usersData.get(userId);
    userData.birthday = {
        day: day,
        month: month,
        setAt: Date.now()
    };
    
    await usersData.set(userId, userData);
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const birthdayThisYear = new Date(currentYear, month - 1, day);
    
    let nextBirthday;
    if (birthdayThisYear < now) {
        nextBirthday = new Date(currentYear + 1, month - 1, day);
    } else {
        nextBirthday = birthdayThisYear;
    }
    
    const daysUntil = Math.ceil((nextBirthday - now) / (1000 * 60 * 60 * 24));
    const age = currentYear - 2000; // Example age calculation
    
    return message.reply(getLang("birthdaySet", {
        date: `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}`,
        next: nextBirthday.toLocaleDateString(),
        days: daysUntil
    }));
}

async function sendBirthdayWish(targetUser, api, event, message, usersData, getLang) {
    let targetId;
    
    if (Object.keys(event.mentions).length > 0) {
        targetId = Object.keys(event.mentions)[0];
    } else if (targetUser) {
        targetId = targetUser.replace(/[@<>]/g, '');
    } else {
        targetId = event.senderID;
    }

    if (!targetId) {
        return message.reply(getLang("noTarget"));
    }

    const targetData = await usersData.get(targetId);
    if (!targetData.birthday) {
        return message.reply("❌ This user hasn't set their birthday yet.");
    }

    const userInfo = await api.getUserInfo(targetId);
    const targetName = userInfo[targetId]?.name || "Friend";
    
    const senderInfo = await api.getUserInfo(event.senderID);
    const senderName = senderInfo[event.senderID]?.name || "Someone";
    
    const wishes = [
        "May all your wishes come true! ✨",
        "Wishing you a day filled with happiness! 😊",
        "May this year bring you endless joy! 🎉",
        "Hope your special day is amazing! 🌟",
        "Sending lots of love on your birthday! 💖",
        "May you be blessed with health and happiness! 🙏",
        "Hope your birthday is as wonderful as you are! 💕",
        "Cheers to another year of amazing you! 🥂",
        "May your day be sprinkled with fun! 🎊",
        "Wishing you success in everything! 🚀"
    ];
    
    const randomWish = wishes[Math.floor(Math.random() * wishes.length)];
    
    return message.reply(getLang("birthdayWish", {
        name: targetName,
        message: randomWish,
        from: senderName
    }));
}

async function generateBirthdayCard(targetUser, api, event, message, usersData, getLang) {
    let targetId;
    
    if (Object.keys(event.mentions).length > 0) {
        targetId = Object.keys(event.mentions)[0];
    } else if (targetUser) {
        targetId = targetUser.replace(/[@<>]/g, '');
    } else {
        targetId = event.senderID;
    }

    if (!targetId) {
        return message.reply(getLang("noTarget"));
    }

    const targetData = await usersData.get(targetId);
    if (!targetData.birthday) {
        return message.reply("❌ This user hasn't set their birthday yet.");
    }

    await message.reply(getLang("cardGenerating"));
    
    const card = await createBirthdayCard(targetId, api);
    
    const userInfo = await api.getUserInfo(targetId);
    const targetName = userInfo[targetId]?.name || "Friend";
    
    await message.reply({
        body: getLang("cardSent", { name: targetName }),
        attachment: card
    });
}

async function showCountdown(userId, api, event, message, usersData, getLang) {
    const userData = await usersData.get(userId);
    
    if (!userData.birthday) {
        return message.reply(getLang("noBirthdaySet"));
    }

    const { day, month } = userData.birthday;
    const now = new Date();
    const currentYear = now.getFullYear();
    
    const birthdayThisYear = new Date(currentYear, month - 1, day);
    const age = currentYear - 2000; // Example age
    
    let nextBirthday;
    if (birthdayThisYear < now) {
        nextBirthday = new Date(currentYear + 1, month - 1, day);
    } else {
        nextBirthday = birthdayThisYear;
    }
    
    const daysUntil = Math.ceil((nextBirthday - now) / (1000 * 60 * 60 * 24));
    
    return message.reply(getLang("countdownInfo", {
        date: `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}`,
        next: nextBirthday.toLocaleDateString(),
        days: daysUntil,
        age: age
    }));
}

async function setReminder(userId, api, event, message, usersData, threadsData, getLang) {
    const { threadID } = event;
    
    const threadData = await threadsData.get(threadID);
    if (!threadData.birthdayReminders) {
        threadData.birthdayReminders = {
            enabled: true,
            lastCheck: Date.now()
        };
    } else {
        threadData.birthdayReminders.enabled = true;
    }
    
    await threadsData.set(threadID, threadData);
    
    return message.reply(getLang("reminderSet"));
}

async function upcomingBirthdays(api, event, message, usersData, getLang) {
    const allUsers = await usersData.getAll();
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    
    const birthdays = [];
    
    for (const user of allUsers) {
        if (user.data.birthday) {
            const { day, month } = user.data.birthday;
            
            // Check if birthday is in next 30 days
            let birthdayThisYear = new Date(now.getFullYear(), month - 1, day);
            if (birthdayThisYear < now) {
                birthdayThisYear = new Date(now.getFullYear() + 1, month - 1, day);
            }
            
            const daysUntil = Math.ceil((birthdayThisYear - now) / (1000 * 60 * 60 * 24));
            
            if (daysUntil <= 30) {
                try {
                    const userInfo = await api.getUserInfo(user.userID);
                    const userName = userInfo[user.userID]?.name || `User ${user.userID}`;
                    
                    birthdays.push({
                        name: userName,
                        date: `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}`,
                        days: daysUntil,
                        userId: user.userID
                    });
                } catch (error) {
                    console.error('Error getting user info:', error);
                }
            }
        }
    }
    
    // Sort by days until birthday
    birthdays.sort((a, b) => a.days - b.days);
    
    if (birthdays.length === 0) {
        return message.reply("📭 No upcoming birthdays in the next 30 days.");
    }
    
    let listMessage = "";
    birthdays.forEach((bday, index) => {
        listMessage += `${index + 1}. ${bday.name}\n`;
        listMessage += `   ↳ Date: ${bday.date}\n`;
        listMessage += `   ↳ In: ${bday.days} day${bday.days > 1 ? 's' : ''}\n\n`;
    });
    
    return message.reply(getLang("upcomingList", {
        list: listMessage,
        count: birthdays.length
    }));
}

async function todayBirthdays(api, event, message, usersData, getLang) {
    const allUsers = await usersData.getAll();
    const now = new Date();
    const todayDay = now.getDate();
    const todayMonth = now.getMonth() + 1;
    
    const todayBirthdays = [];
    
    for (const user of allUsers) {
        if (user.data.birthday) {
            const { day, month } = user.data.birthday;
            
            if (day === todayDay && month === todayMonth) {
                try {
                    const userInfo = await api.getUserInfo(user.userID);
                    const userName = userInfo[user.userID]?.name || `User ${user.userID}`;
                    
                    todayBirthdays.push({
                        name: userName,
                        userId: user.userID
                    });
                } catch (error) {
                    console.error('Error getting user info:', error);
                }
            }
        }
    }
    
    if (todayBirthdays.length === 0) {
        return message.reply("📭 No birthdays today.");
    }
    
    let listMessage = "";
    todayBirthdays.forEach((bday, index) => {
        listMessage += `${index + 1}. ${bday.name}\n`;
    });
    
    return message.reply(getLang("todayList", {
        list: listMessage
    }));
}

async function deleteBirthday(userId, api, event, message, usersData, getLang) {
    const userData = await usersData.get(userId);
    
    if (!userData.birthday) {
        return message.reply("❌ You haven't set your birthday yet.");
    }
    
    delete userData.birthday;
    await usersData.set(userId, userData);
    
    return message.reply(getLang("birthdayDeleted"));
}

async function birthdayInfo(userId, api, event, message, usersData, getLang) {
    const userData = await usersData.get(userId);
    
    if (!userData.birthday) {
        return message.reply(getLang("noBirthdaySet"));
    }

    const { day, month } = userData.birthday;
    const now = new Date();
    const currentYear = now.getFullYear();
    
    const birthdayThisYear = new Date(currentYear, month - 1, day);
    const age = currentYear - 2000; // Example age
    
    let nextBirthday;
    if (birthdayThisYear < now) {
        nextBirthday = new Date(currentYear + 1, month - 1, day);
    } else {
        nextBirthday = birthdayThisYear;
    }
    
    const daysUntil = Math.ceil((nextBirthday - now) / (1000 * 60 * 60 * 24));
    
    return message.reply(getLang("birthdayInfo", {
        date: `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}`,
        next: nextBirthday.toLocaleDateString(),
        age: age,
        days: daysUntil
    }));
}

async function createBirthdayCard(userId, api) {
    const canvas = Canvas.createCanvas(800, 600);
    const ctx = canvas.getContext('2d');
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 800, 600);
    gradient.addColorStop(0, '#FF6B6B');
    gradient.addColorStop(0.5, '#FFD166');
    gradient.addColorStop(1, '#06D6A0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 600);
    
    // Confetti
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * 800;
        const y = Math.random() * 600;
        const size = 5 + Math.random() * 10;
        const color = getRandomBirthdayColor();
        
        ctx.fillStyle = color;
        
        if (Math.random() > 0.5) {
            ctx.fillRect(x, y, size, size);
        } else {
            ctx.beginPath();
            ctx.arc(x, y, size / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Balloons
    drawBalloon(ctx, 150, 100, '#EF476F');
    drawBalloon(ctx, 250, 80, '#118AB2');
    drawBalloon(ctx, 350, 120, '#FFD166');
    drawBalloon(ctx, 650, 100, '#06D6A0');
    drawBalloon(ctx, 550, 80, '#073B4C');
    
    // Birthday text
    ctx.font = 'bold 60px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    
    ctx.fillText('HAPPY', 400, 250);
    ctx.fillText('BIRTHDAY', 400, 320);
    
    ctx.shadowBlur = 0;
    
    // User name
    try {
        const userInfo = await api.getUserInfo(userId);
        const userName = userInfo[userId]?.name || 'Friend';
        
        ctx.font = 'bold 40px Arial';
        ctx.fillStyle = '#073B4C';
        ctx.fillText(userName, 400, 400);
    } catch (error) {
        console.error('Error getting user info:', error);
    }
    
    // Cake
    drawCake(ctx, 400, 500);
    
    // Border
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 5;
    ctx.strokeRect(10, 10, 780, 580);
    
    const tempPath = path.join(__dirname, '..', '..', 'cache', `birthday_${Date.now()}.png`);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(tempPath, buffer);
    
    return fs.createReadStream(tempPath);
}

function drawBalloon(ctx, x, y, color) {
    // Balloon body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, 30, 40, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Balloon tip
    ctx.beginPath();
    ctx.moveTo(x, y + 40);
    ctx.lineTo(x - 5, y + 50);
    ctx.lineTo(x + 5, y + 50);
    ctx.closePath();
    ctx.fill();
    
    // String
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + 50);
    ctx.lineTo(x, y + 100);
    ctx.stroke();
}

function drawCake(ctx, x, y) {
    // Cake base
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x - 60, y - 80, 120, 40);
    
    // Cake middle
    ctx.fillStyle = '#DEB887';
    ctx.fillRect(x - 50, y - 120, 100, 40);
    
    // Cake top
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(x - 40, y - 150, 80, 30);
    
    // Candles
    for (let i = 0; i < 5; i++) {
        const candleX = x - 30 + i * 15;
        
        // Candle
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(candleX, y - 180, 5, 30);
        
        // Flame
        ctx.fillStyle = '#FF6B6B';
        ctx.beginPath();
        ctx.arc(candleX + 2.5, y - 185, 5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Plate
    ctx.strokeStyle = '#C0C0C0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y - 40, 70, 0, Math.PI * 2);
    ctx.stroke();
}

function getRandomBirthdayColor() {
    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#FF8E53', '#9B5DE5'];
    return colors[Math.floor(Math.random() * colors.length)];
}