const fs = require('fs-extra');
const path = require('path');

module.exports = {
    config: {
        name: "adbot",
        version: "3.0",
        author: "RANA",
        countDown: 5,
        role: 2,
        shortDescription: {
            en: "Bot advertisement system",
            bn: "বট বিজ্ঞাপন ব্যবস্থা"
        },
        longDescription: {
            en: "Send advertisement messages to all groups",
            bn: "সব গ্রুপে বিজ্ঞাপন বার্তা পাঠান"
        },
        category: "admin",
        guide: {
            en: "{pn} [message] or {pn} preview",
            bn: "{pn} [বার্তা] বা {pn} preview"
        }
    },

    onStart: async function ({ api, event, args, message, getLang }) {
        const action = args[0];
        const adMessage = args.join(" ");

        if (!action) {
            return message.reply(getLang("noMessage"));
        }

        try {
            if (action.toLowerCase() === 'preview') {
                const previewAd = getDefaultAd();
                return message.reply(getLang("preview", { ad: previewAd }));
            }

            await message.reply(getLang("confirm", { message: adMessage }));

        } catch (error) {
            return message.reply(getLang("error", { error: error.message }));
        }
    },

    onChat: async function ({ event, message }) {
        if (event.body && event.body.toLowerCase().startsWith('confirm ad')) {
            const adMessage = event.body.replace('confirm ad', '').trim();
            await sendAdvertisement(adMessage, message, event);
        }
    },

    langs: {
        en: {
            noMessage: "❌ Please provide advertisement message\nUsage: {pn} [message] or {pn} preview",
            preview: "📢 Advertisement Preview:\n\n{ad}\n\nUse: confirm ad [message] to send",
            confirm: "⚠️ Are you sure you want to send this advertisement to all groups?\n\nMessage: {message}\n\nType: confirm ad {message}",
            sending: "📤 Sending advertisement to all groups...",
            sent: "✅ Advertisement sent successfully!\n\nSent to: {sent} groups\nFailed: {failed} groups",
            error: "❌ Error: {error}"
        },
        bn: {
            noMessage: "❌ দয়া করে বিজ্ঞাপন বার্তা দিন\nব্যবহার: {pn} [বার্তা] বা {pn} preview",
            preview: "📢 বিজ্ঞাপন প্রিভিউ:\n\n{ad}\n\nপ্রেরণ করতে ব্যবহার করুন: confirm ad [বার্তা]",
            confirm: "⚠️ আপনি কি নিশ্চিত যে আপনি এই বিজ্ঞাপনটি সব গ্রুপে পাঠাতে চান?\n\nবার্তা: {message}\n\nটাইপ করুন: confirm ad {message}",
            sending: "📤 সব গ্রুপে বিজ্ঞাপন পাঠানো হচ্ছে...",
            sent: "✅ বিজ্ঞাপন সফলভাবে পাঠানো হয়েছে!\n\nপাঠানো হয়েছে: {sent} গ্রুপে\nব্যর্থ হয়েছে: {failed} গ্রুপ",
            error: "❌ ত্রুটি: {error}"
        }
    }
};

async function sendAdvertisement(message, originalMessage, event) {
    try {
        await originalMessage.reply(getLang("sending"));
        
        const allThreads = await api.getThreadList(100, null, ['INBOX']);
        const groupThreads = allThreads.filter(thread => thread.isGroup);
        
        let sent = 0;
        let failed = 0;
        
        const adWithSignature = `${message}\n\n─\n📢 Bot Advertisement\nPowered by: YOUR CRUSH ⟵o_0\n👤 Developer: RANA (MASTER 🪓)`;
        
        for (const thread of groupThreads) {
            try {
                await api.sendMessage(adWithSignature, thread.threadID);
                sent++;
                
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                failed++;
                console.error(`Failed to send ad to ${thread.threadID}:`, error.message);
            }
        }
        
        await originalMessage.reply(getLang("sent", { sent: sent, failed: failed }));
        
    } catch (error) {
        await originalMessage.reply(getLang("error", { error: error.message }));
    }
}

function getDefaultAd() {
    return `🤖 *YOUR CRUSH ⟵o_0 BOT* 🤖

🌟 *Features:*
• 300+ Commands
• AI Chat System
• Image Editing
• Games & Economy
• Group Management
• And much more!

🔧 *Developer:* RANA (MASTER 🪓)
📞 *Contact:* @rana_editz_00
🌐 *Support:* https://t.me/master_account_remover_channel

💖 *Always ready to serve you!*`;
}