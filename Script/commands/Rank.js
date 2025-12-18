const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const Canvas = require('canvas');

module.exports = {
    config: {
        name: "rank",
        version: "3.0",
        author: "RANA",
        countDown: 10,
        role: 0,
        shortDescription: {
            en: "Check user rank and level",
            bn: "ব্যবহারকারীর র‍্যাঙ্ক এবং লেভেল চেক করুন"
        },
        longDescription: {
            en: "Check your or others' rank, level, experience points and statistics",
            bn: "আপনার বা অন্যের র‍্যাঙ্ক, লেভেল, এক্সপেরিয়েন্স পয়েন্ট এবং পরিসংখ্যান চেক করুন"
        },
        category: "economy",
        guide: {
            en: "{pn} [@mention or leave empty for yourself]",
            bn: "{pn} [@মেনশন বা নিজের জন্য খালি রাখুন]"
        }
    },

    onStart: async function ({ api, event, args, message, usersData, getLang }) {
        try {
            let targetID;
            
            if (Object.keys(event.mentions).length > 0) {
                targetID = Object.keys(event.mentions)[0];
            } else if (args[0]) {
                targetID = args[0].replace(/[@<>]/g, '');
            } else {
                targetID = event.senderID;
            }

            await message.reply(getLang("generating"));

            const userData = await usersData.get(targetID);
            const userInfo = await api.getUserInfo(targetID);
            const userName = userInfo[targetID]?.name || "Unknown User";

            const rankCard = await generateRankCard({
                name: userName,
                level: userData.level || 1,
                exp: userData.exp || 0,
                rank: await getGlobalRank(targetID, usersData),
                requiredExp: calculateRequiredExp(userData.level || 1),
                avatar: await getAvatarUrl(api, targetID)
            });

            await message.reply({
                body: getLang("rankInfo", {
                    name: userName,
                    level: userData.level || 1,
                    exp: userData.exp || 0,
                    requiredExp: calculateRequiredExp(userData.level || 1),
                    rank: await getGlobalRank(targetID, usersData),
                    progress: Math.floor((userData.exp || 0) / calculateRequiredExp(userData.level || 1) * 100)
                }),
                attachment: rankCard
            });

        } catch (error) {
            console.error('Rank command error:', error);
            await message.reply(getLang("error", { error: error.message }));
        }
    },

    langs: {
        en: {
            generating: "🔄 Generating rank card...",
            rankInfo: "🏆 Rank Information\n\n👤 Name: {name}\n⭐ Level: {level}\n📊 Experience: {exp}/{requiredExp}\n🏅 Rank: #{rank}\n📈 Progress: {progress}%",
            error: "❌ Error: {error}"
        },
        bn: {
            generating: "🔄 র‍্যাঙ্ক কার্ড তৈরি হচ্ছে...",
            rankInfo: "🏆 র‍্যাঙ্ক তথ্য\n\n👤 নাম: {name}\n⭐ লেভেল: {level}\n📊 অভিজ্ঞতা: {exp}/{requiredExp}\n🏅 র‍্যাঙ্ক: #{rank}\n📈 অগ্রগতি: {progress}%",
            error: "❌ ত্রুটি: {error}"
        }
    }
};

async function getGlobalRank(userID, usersData) {
    try {
        const allUsers = await usersData.getAll();
        const sortedUsers = allUsers.sort((a, b) => {
            const aScore = (a.data.level || 1) * 1000 + (a.data.exp || 0);
            const bScore = (b.data.level || 1) * 1000 + (b.data.exp || 0);
            return bScore - aScore;
        });

        const rank = sortedUsers.findIndex(user => user.userID === userID) + 1;
        return rank || 1;
    } catch {
        return 1;
    }
}

function calculateRequiredExp(level) {
    return Math.floor(100 * Math.pow(1.5, level - 1));
}

async function getAvatarUrl(api, userID) {
    try {
        const userInfo = await api.getUserInfo(userID);
        return userInfo[userID]?.thumbSrc || 'https://i.imgur.com/8nLFCVP.png';
    } catch {
        return 'https://i.imgur.com/8nLFCVP.png';
    }
}

async function generateRankCard(data) {
    const canvas = Canvas.createCanvas(800, 300);
    const ctx = canvas.getContext('2d');

    const progressWidth = 500;
    const progressHeight = 20;
    const progress = (data.exp / data.requiredExp) * progressWidth;

    const gradient = ctx.createLinearGradient(0, 0, 800, 300);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 300);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(20, 20, 760, 260);

    try {
        const avatar = await Canvas.loadImage(data.avatar);
        ctx.save();
        ctx.beginPath();
        ctx.arc(100, 150, 60, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 40, 90, 120, 120);
        ctx.restore();
    } catch (error) {
        console.error('Avatar loading error:', error);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(data.name, 180, 100);

    ctx.font = '18px Arial';
    ctx.fillText(`Level: ${data.level}`, 180, 140);
    ctx.fillText(`Rank: #${data.rank}`, 180, 170);
    ctx.fillText(`Exp: ${data.exp}/${data.requiredExp}`, 180, 200);

    ctx.fillStyle = '#333333';
    ctx.fillRect(180, 220, progressWidth, progressHeight);
    
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(180, 220, progress, progressHeight);

    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.fillText(`${Math.floor((data.exp / data.requiredExp) * 100)}%`, 180 + progressWidth + 10, 235);

    const buffer = canvas.toBuffer('image/png');
    const tempPath = path.join(__dirname, '..', '..', 'cache', `rank_${Date.now()}.png`);
    fs.writeFileSync(tempPath, buffer);

    return fs.createReadStream(tempPath);
}