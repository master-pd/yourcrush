const fs = require('fs-extra');
const path = require('path');

module.exports = {
    config: {
        name: "ban",
        version: "2.5",
        author: "RANA",
        countDown: 5,
        role: 1,
        shortDescription: {
            en: "Ban users from group",
            bn: "গ্রুপ থেকে ব্যবহারকারীদের ব্যান করুন"
        },
        longDescription: {
            en: "Ban users from the group with optional reason and duration",
            bn: "ঐচ্ছিক কারণ এবং সময়সীমা সহ গ্রুপ থেকে ব্যবহারকারীদের ব্যান করুন"
        },
        category: "group",
        guide: {
            en: "{pn} [@mention/userID] [reason] -time [duration]",
            bn: "{pn} [@মেনশন/ইউজার আইডি] [কারণ] -time [সময়সীমা]"
        }
    },

    onStart: async function ({ api, event, args, message, threadsData, getLang }) {
        const { threadID, messageID, mentions } = event;
        
        let targetID;
        let reason = "";
        let duration = 0;

        if (Object.keys(mentions).length > 0) {
            targetID = Object.keys(mentions)[0];
            reason = args.slice(1).join(" ").replace(mentions[targetID], "").trim();
        } else if (args[0]) {
            targetID = args[0].replace(/[@<>]/g, '');
            reason = args.slice(1).join(" ").trim();
        } else {
            return message.reply(getLang("noUser"));
        }

        const timeIndex = reason.indexOf('-time');
        if (timeIndex !== -1) {
            const timePart = reason.substring(timeIndex + 5).trim();
            reason = reason.substring(0, timeIndex).trim();
            
            duration = parseDuration(timePart);
            if (duration === null) {
                return message.reply(getLang("invalidDuration"));
            }
        }

        if (targetID === api.getCurrentUserID()) {
            return message.reply(getLang("cannotBanBot"));
        }

        if (targetID === event.senderID) {
            return message.reply(getLang("cannotBanSelf"));
        }

        try {
            const threadData = await threadsData.get(threadID);
            if (!threadData.bannedUsers) {
                threadData.bannedUsers = [];
            }

            const existingBan = threadData.bannedUsers.find(ban => ban.userID === targetID);
            if (existingBan) {
                return message.reply(getLang("alreadyBanned", { 
                    user: await getUserName(api, targetID),
                    reason: existingBan.reason || "No reason provided",
                    until: existingBan.until ? formatDate(existingBan.until) : "Permanent"
                }));
            }

            const userInfo = await api.getUserInfo(targetID);
            const userName = userInfo[targetID]?.name || targetID;

            const banData = {
                userID: targetID,
                userName: userName,
                bannedBy: event.senderID,
                banDate: Date.now(),
                reason: reason || "No reason provided",
                until: duration > 0 ? Date.now() + duration : 0
            };

            threadData.bannedUsers.push(banData);
            await threadsData.set(threadID, threadData);

            try {
                await api.removeUserFromGroup(targetID, threadID);
                
                const banMessage = getLang("banned", {
                    user: userName,
                    reason: banData.reason,
                    duration: duration > 0 ? formatDuration(duration) : "Permanent",
                    until: banData.until ? formatDate(banData.until) : "Never"
                });
                
                await message.reply(banMessage);
                
                await api.sendMessage(
                    getLang("notification", {
                        user: userName,
                        group: threadID,
                        reason: banData.reason,
                        duration: duration > 0 ? formatDuration(duration) : "Permanent"
                    }),
                    targetID
                ).catch(() => {});

            } catch (kickError) {
                console.error('Kick failed:', kickError);
                await message.reply(getLang("kickFailed", { user: userName, error: kickError.message }));
            }

        } catch (error) {
            return message.reply(getLang("error", { error: error.message }));
        }
    },

    langs: {
        en: {
            noUser: "❌ Please mention a user or provide user ID",
            invalidDuration: "❌ Invalid duration format!\n\nExamples:\n• 1h (1 hour)\n• 2d (2 days)\n• 1w (1 week)\n• 30m (30 minutes)\n• permanent (no time limit)",
            cannotBanBot: "❌ I cannot ban myself!",
            cannotBanSelf: "❌ You cannot ban yourself!",
            alreadyBanned: "❌ This user is already banned!\n\n👤 User: {user}\n📝 Reason: {reason}\n⏰ Until: {until}",
            banned: "✅ User banned successfully!\n\n👤 User: {user}\n📝 Reason: {reason}\n⏰ Duration: {duration}\n📅 Until: {until}",
            notification: "🚫 You have been banned from a group!\n\n💬 Group ID: {group}\n📝 Reason: {reason}\n⏰ Duration: {duration}\n\nContact the group admin for more information.",
            kickFailed: "⚠️ User added to ban list but could not be kicked!\n\n👤 User: {user}\n❌ Error: {error}",
            unbanSuccess: "✅ User unbanned successfully!\n👤 User: {user}",
            userNotBanned: "❌ This user is not banned",
            banList: "📋 Banned Users List:\n\n{list}\n\n📊 Total: {count} users",
            noBannedUsers: "📭 No users are currently banned",
            error: "❌ Error: {error}"
        },
        bn: {
            noUser: "❌ দয়া করে একজন ব্যবহারকারী উল্লেখ করুন বা ইউজার আইডি দিন",
            invalidDuration: "❌ অবৈধ সময়সীমা ফরম্যাট!\n\nউদাহরণ:\n• 1h (1 ঘন্টা)\n• 2d (2 দিন)\n• 1w (1 সপ্তাহ)\n• 30m (30 মিনিট)\n• permanent (কোন সময় সীমা নেই)",
            cannotBanBot: "❌ আমি নিজেকে ব্যান করতে পারি না!",
            cannotBanSelf: "❌ আপনি নিজেকে ব্যান করতে পারবেন না!",
            alreadyBanned: "❌ এই ব্যবহারকারী ইতিমধ্যেই ব্যান করা হয়েছে!\n\n👤 ব্যবহারকারী: {user}\n📝 কারণ: {reason}\n⏰ পর্যন্ত: {until}",
            banned: "✅ ব্যবহারকারী সফলভাবে ব্যান করা হয়েছে!\n\n👤 ব্যবহারকারী: {user}\n📝 কারণ: {reason}\n⏰ সময়সীমা: {duration}\n📅 পর্যন্ত: {until}",
            notification: "🚫 আপনি একটি গ্রুপ থেকে ব্যান করা হয়েছে!\n\n💬 গ্রুপ আইডি: {group}\n📝 কারণ: {reason}\n⏰ সময়সীমা: {duration}\n\nআরও তথ্যের জন্য গ্রুপ অ্যাডমিনের সাথে যোগাযোগ করুন।",
            kickFailed: "⚠️ ব্যবহারকারী ব্যান তালিকায় যোগ করা হয়েছে কিন্তু কিক করা যায়নি!\n\n👤 ব্যবহারকারী: {user}\n❌ ত্রুটি: {error}",
            unbanSuccess: "✅ ব্যবহারকারী আনবান করা হয়েছে!\n👤 ব্যবহারকারী: {user}",
            userNotBanned: "❌ এই ব্যবহারকারী ব্যান করা নেই",
            banList: "📋 ব্যান করা ব্যবহারকারীদের তালিকা:\n\n{list}\n\n📊 মোট: {count} ব্যবহারকারী",
            noBannedUsers: "📭 বর্তমানে কোন ব্যবহারকারী ব্যান করা নেই",
            error: "❌ ত্রুটি: {error}"
        }
    }
};

async function getUserName(api, userID) {
    try {
        const userInfo = await api.getUserInfo(userID);
        return userInfo[userID]?.name || userID;
    } catch {
        return userID;
    }
}

function parseDuration(durationStr) {
    if (!durationStr) return 0;
    
    if (durationStr.toLowerCase() === 'permanent' || durationStr === '0') {
        return 0;
    }
    
    const match = durationStr.match(/^(\d+)([mhdw])$/i);
    if (!match) return null;
    
    const amount = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    switch (unit) {
        case 'm': return amount * 60 * 1000;
        case 'h': return amount * 60 * 60 * 1000;
        case 'd': return amount * 24 * 60 * 60 * 1000;
        case 'w': return amount * 7 * 24 * 60 * 60 * 1000;
        default: return null;
    }
}

function formatDuration(ms) {
    if (ms === 0) return "Permanent";
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    
    if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''}`;
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    return `${seconds} second${seconds > 1 ? 's' : ''}`;
}

function formatDate(timestamp) {
    if (!timestamp) return "Never";
    return new Date(timestamp).toLocaleString();
}