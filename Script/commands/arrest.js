const fs = require('fs-extra');
const path = require('path');
const Canvas = require('canvas');

module.exports = {
    config: {
        name: "arrest",
        version: "2.0",
        author: "RANA",
        countDown: 10,
        role: 1,
        shortDescription: {
            en: "Arrest users in fun way",
            bn: "মজারভাবে ব্যবহারকারীদের গ্রেপ্তার করুন"
        },
        longDescription: {
            en: "Arrest users with custom charges and generate arrest warrant",
            bn: "কাস্টম অভিযোগ সহ ব্যবহারকারীদের গ্রেপ্তার করুন এবং গ্রেপ্তারি পরোয়ানা তৈরি করুন"
        },
        category: "fun",
        guide: {
            en: "{pn} [@mention] [charge]",
            bn: "{pn} [@মেনশন] [অভিযোগ]"
        }
    },

    onStart: async function ({ api, event, args, message, getLang }) {
        const { threadID, messageID, mentions } = event;
        
        let targetID;
        let charge = args.slice(1).join(" ");

        if (Object.keys(mentions).length > 0) {
            targetID = Object.keys(mentions)[0];
            charge = charge.replace(mentions[targetID], "").trim();
        } else if (args[0]) {
            targetID = args[0].replace(/[@<>]/g, '');
            charge = args.slice(1).join(" ").trim();
        } else {
            targetID = event.senderID;
        }

        if (!charge) {
            charge = "Being too cute and awesome";
        }

        try {
            await message.reply(getLang("processing"));

            const userInfo = await api.getUserInfo(targetID);
            const userName = userInfo[targetID]?.name || "Unknown User";
            const adminInfo = await api.getUserInfo(event.senderID);
            const adminName = adminInfo[event.senderID]?.name || "Police";

            const arrestWarrant = await generateArrestWarrant({
                userName: userName,
                userID: targetID,
                charge: charge,
                arrestingOfficer: adminName,
                officerID: event.senderID,
                date: new Date().toLocaleDateString(),
                time: new Date().toLocaleTimeString()
            });

            await message.reply({
                body: getLang("arrested", {
                    name: userName,
                    officer: adminName,
                    charge: charge
                }),
                attachment: arrestWarrant
            });

        } catch (error) {
            console.error('Arrest command error:', error);
            await message.reply(getLang("error", { error: error.message }));
        }
    },

    langs: {
        en: {
            processing: "🚨 Processing arrest warrant...",
            arrested: "🚓 *ARREST WARRANT*\n\n👤 Suspect: {name}\n👮 Arresting Officer: {officer}\n📋 Charges: {charge}\n\n⚠️ You have the right to remain cute!",
            error: "❌ Error: {error}"
        },
        bn: {
            processing: "🚨 গ্রেপ্তারি পরোয়ানা প্রক্রিয়াকরণ...",
            arrested: "🚓 *গ্রেপ্তারি পরোয়ানা*\n\n👤 সন্দেহভাজন: {name}\n👮 গ্রেপ্তারকারী কর্মকর্তা: {officer}\n📋 অভিযোগ: {charge}\n\n⚠️ আপনার সুন্দর থাকার অধিকার আছে!",
            error: "❌ ত্রুটি: {error}"
        }
    }
};

async function generateArrestWarrant(data) {
    const canvas = Canvas.createCanvas(800, 600);
    const ctx = canvas.getContext('2d');

    // Background
    const gradient = ctx.createLinearGradient(0, 0, 800, 600);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 600);

    // Header
    ctx.fillStyle = '#e94560';
    ctx.fillRect(0, 0, 800, 100);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🚓 ARREST WARRANT', 400, 60);

    ctx.font = '18px Arial';
    ctx.fillText('OFFICIAL POLICE DOCUMENT', 400, 90);

    // Border
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 5;
    ctx.strokeRect(20, 120, 760, 460);

    // Content
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('SUSPECT INFORMATION:', 40, 170);

    ctx.font = '18px Arial';
    ctx.fillText(`Name: ${data.userName}`, 60, 210);
    ctx.fillText(`ID: ${data.userID}`, 60, 240);
    ctx.fillText(`Charge: ${data.charge}`, 60, 270);

    ctx.font = 'bold 24px Arial';
    ctx.fillText('ARRESTING OFFICER:', 40, 320);

    ctx.font = '18px Arial';
    ctx.fillText(`Officer: ${data.arrestingOfficer}`, 60, 360);
    ctx.fillText(`Badge #: ${data.officerID}`, 60, 390);

    ctx.font = 'bold 24px Arial';
    ctx.fillText('ARREST DETAILS:', 40, 440);

    ctx.font = '18px Arial';
    ctx.fillText(`Date: ${data.date}`, 60, 480);
    ctx.fillText(`Time: ${data.time}`, 60, 510);

    // Footer
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('⚠️ THIS IS A FUN COMMAND - NOT A REAL ARREST WARRANT ⚠️', 400, 570);

    // Police badge
    ctx.beginPath();
    ctx.arc(650, 300, 60, 0, Math.PI * 2);
    ctx.fillStyle = '#0f3460';
    ctx.fill();
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('POLICE', 650, 295);
    ctx.font = '14px Arial';
    ctx.fillText('BOT DIVISION', 650, 320);

    const buffer = canvas.toBuffer('image/png');
    const tempPath = path.join(__dirname, '..', '..', 'cache', `arrest_${Date.now()}.png`);
    fs.writeFileSync(tempPath, buffer);

    return fs.createReadStream(tempPath);
}