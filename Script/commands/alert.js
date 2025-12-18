const fs = require('fs-extra');
const path = require('path');

module.exports = {
    config: {
        name: "alert",
        version: "2.0",
        author: "RANA",
        countDown: 5,
        role: 2,
        shortDescription: {
            en: "Send alerts to users/groups",
            bn: "ব্যবহারকারী/গ্রুপে অ্যালার্ট পাঠান"
        },
        longDescription: {
            en: "Send important alerts and notifications to specific users or all groups",
            bn: "নির্দিষ্ট ব্যবহারকারী বা সব গ্রুপে গুরুত্বপূর্ণ অ্যালার্ট এবং বিজ্ঞপ্তি পাঠান"
        },
        category: "admin",
        guide: {
            en: "{pn} [user/group/all] [ID] [message]",
            bn: "{pn} [user/group/all] [আইডি] [বার্তা]"
        }
    },

    onStart: async function ({ api, event, args, message, getLang }) {
        const type = args[0];
        const target = args[1];
        const alertMessage = args.slice(2).join(" ");

        if (!type || !target || !alertMessage) {
            return message.reply(getLang("invalidSyntax"));
        }

        try {
            switch (type.toLowerCase()) {
                case 'user':
                    await sendUserAlert(target, alertMessage, api, message, getLang);
                    break;
                
                case 'group':
                    await sendGroupAlert(target, alertMessage, api, message, getLang);
                    break;
                
                case 'all':
                    await sendToAllGroups(alertMessage, api, message, getLang);
                    break;
                
                default:
                    return message.reply(getLang("invalidType"));
            }
        } catch (error) {
            return message.reply(getLang("error", { error: error.message }));
        }
    },

    langs: {
        en: {
            invalidSyntax: "❌ Usage: {pn} [user/group/all] [ID] [message]",
            invalidType: "❌ Invalid type! Use: user, group, all",
            sendingUser: "📨 Sending alert to user...",
            userSent: "✅ Alert sent to user!\n👤 User ID: {id}\n💬 Message: {message}",
            sendingGroup: "📨 Sending alert to group...",
            groupSent: "✅ Alert sent to group!\n💬 Group ID: {id}\n💬 Message: {message}",
            sendingAll: "📢 Sending alert to all groups...",
            allSent: "✅ Alert sent to all groups!\n\nSent: {sent}\nFailed: {failed}\nTotal: {total}",
            error: "❌ Error: {error}"
        },
        bn: {
            invalidSyntax: "❌ ব্যবহার: {pn} [user/group/all] [আইডি] [বার্তা]",
            invalidType: "❌ ভুল ধরন! ব্যবহার করুন: user, group, all",
            sendingUser: "📨 ব্যবহারকারীকে অ্যালার্ট পাঠানো হচ্ছে...",
            userSent: "✅ ব্যবহারকারীকে অ্যালার্ট পাঠানো হয়েছে!\n👤 ইউজার আইডি: {id}\n💬 বার্তা: {message}",
            sendingGroup: "📨 গ্রুপে অ্যালার্ট পাঠানো হচ্ছে...",
            groupSent: "✅ গ্রুপে অ্যালার্ট পাঠানো হয়েছে!\n💬 গ্রুপ আইডি: {id}\n💬 বার্তা: {message}",
            sendingAll: "📢 সব গ্রুপে অ্যালার্ট পাঠানো হচ্ছে...",
            allSent: "✅ সব গ্রুপে অ্যালার্ট পাঠানো হয়েছে!\n\nপাঠানো: {sent}\nব্যর্থ: {failed}\nমোট: {total}",
            error: "❌ ত্রুটি: {error}"
        }
    }
};

async function sendUserAlert(userID, message, api, originalMessage, getLang) {
    await originalMessage.reply(getLang("sendingUser"));
    
    try {
        const alertMsg = `🚨 *ALERT from Bot Admin*\n\n${message}\n\n─\nThis is an important alert from the bot system.`;
        
        await api.sendMessage(alertMsg, userID);
        
        await originalMessage.reply(getLang("userSent", {
            id: userID,
            message: message.substring(0, 50) + (message.length > 50 ? "..." : "")
        }));
    } catch (error) {
        throw new Error(`Failed to send user alert: ${error.message}`);
    }
}

async function sendGroupAlert(groupID, message, api, originalMessage, getLang) {
    await originalMessage.reply(getLang("sendingGroup"));
    
    try {
        const alertMsg = `🚨 *GROUP ALERT*\n\n${message}\n\n─\nImportant announcement from bot admin.`;
        
        await api.sendMessage(alertMsg, groupID);
        
        await originalMessage.reply(getLang("groupSent", {
            id: groupID,
            message: message.substring(0, 50) + (message.length > 50 ? "..." : "")
        }));
    } catch (error) {
        throw new Error(`Failed to send group alert: ${error.message}`);
    }
}

async function sendToAllGroups(message, api, originalMessage, getLang) {
    await originalMessage.reply(getLang("sendingAll"));
    
    try {
        const allThreads = await api.getThreadList(100, null, ['INBOX']);
        const groupThreads = allThreads.filter(thread => thread.isGroup);
        
        let sent = 0;
        let failed = 0;
        
        const alertMsg = `🚨 *IMPORTANT BOT ALERT*\n\n${message}\n\n─\nThis is a broadcast message to all groups.`;
        
        for (const thread of groupThreads) {
            try {
                await api.sendMessage(alertMsg, thread.threadID);
                sent++;
                
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                failed++;
                console.error(`Failed to send alert to ${thread.threadID}:`, error.message);
            }
        }
        
        await originalMessage.reply(getLang("allSent", {
            sent: sent,
            failed: failed,
            total: groupThreads.length
        }));
    } catch (error) {
        throw new Error(`Failed to send to all groups: ${error.message}`);
    }
}