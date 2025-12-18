const fs = require('fs-extra');
const path = require('path');

module.exports = {
    config: {
        name: "antijoin",
        version: "2.5",
        author: "RANA",
        countDown: 5,
        role: 1,
        shortDescription: {
            en: "Prevent users from joining group",
            bn: "গ্রুপে ব্যবহারকারীদের যোগদান রোধ করুন"
        },
        longDescription: {
            en: "Automatically kick users who try to join the group",
            bn: "গ্রুপে যোগ দেওয়ার চেষ্টা করা ব্যবহারকারীদের স্বয়ংক্রিয়ভাবে কিক করুন"
        },
        category: "group",
        guide: {
            en: "{pn} [on/off/status] or {pn} add [userID] or {pn} remove [userID]",
            bn: "{pn} [on/off/status] বা {pn} add [ইউজার আইডি] বা {pn} remove [ইউজার আইডি]"
        }
    },

    onStart: async function ({ api, event, args, message, threadsData, getLang }) {
        const { threadID } = event;
        const action = args[0];
        const targetUser = args[1];

        const threadData = await threadsData.get(threadID);
        if (!threadData.antiJoin) {
            threadData.antiJoin = {
                enabled: false,
                whitelist: [],
                blacklist: []
            };
            await threadsData.set(threadID, threadData);
        }

        try {
            switch (action) {
                case 'on':
                    threadData.antiJoin.enabled = true;
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("enabled"));
                
                case 'off':
                    threadData.antiJoin.enabled = false;
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("disabled"));
                
                case 'status':
                    const status = threadData.antiJoin.enabled ? '✅ Enabled' : '❌ Disabled';
                    const whitelistCount = threadData.antiJoin.whitelist?.length || 0;
                    const blacklistCount = threadData.antiJoin.blacklist?.length || 0;
                    
                    return message.reply(getLang("status", {
                        status: status,
                        whitelist: whitelistCount,
                        blacklist: blacklistCount
                    }));
                
                case 'add':
                    if (!targetUser) return message.reply(getLang("noUserID"));
                    
                    const uidToAdd = targetUser.replace(/[@<>]/g, '');
                    
                    if (!threadData.antiJoin.whitelist) threadData.antiJoin.whitelist = [];
                    if (threadData.antiJoin.whitelist.includes(uidToAdd)) {
                        return message.reply(getLang("alreadyWhitelisted"));
                    }
                    
                    threadData.antiJoin.whitelist.push(uidToAdd);
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("whitelisted", { uid: uidToAdd }));
                
                case 'remove':
                    if (!targetUser) return message.reply(getLang("noUserID"));
                    
                    const uidToRemove = targetUser.replace(/[@<>]/g, '');
                    
                    if (!threadData.antiJoin.whitelist || !threadData.antiJoin.whitelist.includes(uidToRemove)) {
                        return message.reply(getLang("notWhitelisted"));
                    }
                    
                    threadData.antiJoin.whitelist = threadData.antiJoin.whitelist.filter(id => id !== uidToRemove);
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("removedFromWhitelist", { uid: uidToRemove }));
                
                case 'blacklist':
                    if (!targetUser) return message.reply(getLang("noUserID"));
                    
                    const uidToBlacklist = targetUser.replace(/[@<>]/g, '');
                    
                    if (!threadData.antiJoin.blacklist) threadData.antiJoin.blacklist = [];
                    if (threadData.antiJoin.blacklist.includes(uidToBlacklist)) {
                        return message.reply(getLang("alreadyBlacklisted"));
                    }
                    
                    threadData.antiJoin.blacklist.push(uidToBlacklist);
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("blacklisted", { uid: uidToBlacklist }));
                
                case 'unblacklist':
                    if (!targetUser) return message.reply(getLang("noUserID"));
                    
                    const uidToUnblacklist = targetUser.replace(/[@<>]/g, '');
                    
                    if (!threadData.antiJoin.blacklist || !threadData.antiJoin.blacklist.includes(uidToUnblacklist)) {
                        return message.reply(getLang("notBlacklisted"));
                    }
                    
                    threadData.antiJoin.blacklist = threadData.antiJoin.blacklist.filter(id => id !== uidToUnblacklist);
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("unblacklisted", { uid: uidToUnblacklist }));
                
                case 'list':
                    let listMessage = "📋 Anti-Join Lists:\n\n";
                    
                    if (threadData.antiJoin.whitelist?.length > 0) {
                        listMessage += "✅ Whitelisted Users:\n";
                        threadData.antiJoin.whitelist.forEach((uid, index) => {
                            listMessage += `${index + 1}. ${uid}\n`;
                        });
                        listMessage += "\n";
                    }
                    
                    if (threadData.antiJoin.blacklist?.length > 0) {
                        listMessage += "🚫 Blacklisted Users:\n";
                        threadData.antiJoin.blacklist.forEach((uid, index) => {
                            listMessage += `${index + 1}. ${uid}\n`;
                        });
                    }
                    
                    if (!threadData.antiJoin.whitelist?.length && !threadData.antiJoin.blacklist?.length) {
                        listMessage += "📭 No users in lists";
                    }
                    
                    return message.reply(listMessage);
                
                default:
                    return message.reply(getLang("invalidSyntax"));
            }
        } catch (error) {
            return message.reply(getLang("error", { error: error.message }));
        }
    },

    onEvent: async function ({ api, event, threadsData }) {
        if (event.logMessageType === 'log:subscribe') {
            const { threadID, logMessageData } = event;
            
            const threadData = await threadsData.get(threadID);
            
            if (!threadData.antiJoin?.enabled) return;
            
            const addedParticipants = logMessageData.addedParticipants;
            
            for (const participant of addedParticipants) {
                const userID = participant.userFbId;
                
                if (threadData.antiJoin.whitelist?.includes(userID)) {
                    continue;
                }
                
                if (threadData.antiJoin.blacklist?.includes(userID)) {
                    try {
                        await api.removeUserFromGroup(userID, threadID);
                        
                        await api.sendMessage(
                            `🚫 User ${participant.fullName} (${userID}) was removed by anti-join system.`,
                            threadID
                        );
                    } catch (error) {
                        console.error('Anti-join kick failed:', error);
                    }
                } else if (threadData.antiJoin.enabled) {
                    try {
                        await api.removeUserFromGroup(userID, threadID);
                        
                        await api.sendMessage(
                            `🚫 User ${participant.fullName} (${userID}) was automatically removed.\nUse: .antijoin add ${userID} to whitelist.`,
                            threadID
                        );
                    } catch (error) {
                        console.error('Anti-join kick failed:', error);
                    }
                }
            }
        }
    },

    langs: {
        en: {
            enabled: "✅ Anti-join system enabled",
            disabled: "❌ Anti-join system disabled",
            status: "📊 Anti-Join Status:\n\nStatus: {status}\nWhitelist: {whitelist} users\nBlacklist: {blacklist} users",
            noUserID: "❌ Please provide user ID",
            alreadyWhitelisted: "✅ This user is already whitelisted",
            whitelisted: "✅ User {uid} added to whitelist",
            notWhitelisted: "❌ This user is not whitelisted",
            removedFromWhitelist: "✅ User {uid} removed from whitelist",
            alreadyBlacklisted: "✅ This user is already blacklisted",
            blacklisted: "🚫 User {uid} added to blacklist",
            notBlacklisted: "❌ This user is not blacklisted",
            unblacklisted: "✅ User {uid} removed from blacklist",
            invalidSyntax: "❌ Usage: {pn} [on/off/status/list/add/remove/blacklist/unblacklist] [userID]",
            error: "❌ Error: {error}"
        },
        bn: {
            enabled: "✅ অ্যান্টি-জয়েন সিস্টেম সক্রিয় করা হয়েছে",
            disabled: "❌ অ্যান্টি-জয়েন সিস্টেম নিষ্ক্রিয় করা হয়েছে",
            status: "📊 অ্যান্টি-জয়েন অবস্থা:\n\nঅবস্থা: {status}\nহোয়াইটলিস্ট: {whitelist} ব্যবহারকারী\nব্ল্যাকলিস্ট: {blacklist} ব্যবহারকারী",
            noUserID: "❌ দয়া করে ইউজার আইডি দিন",
            alreadyWhitelisted: "✅ এই ব্যবহারকারী ইতিমধ্যেই হোয়াইটলিস্টেড",
            whitelisted: "✅ ইউজার {uid} হোয়াইটলিস্টে যোগ করা হয়েছে",
            notWhitelisted: "❌ এই ব্যবহারকারী হোয়াইটলিস্টেড নয়",
            removedFromWhitelist: "✅ ইউজার {uid} হোয়াইটলিস্ট থেকে সরানো হয়েছে",
            alreadyBlacklisted: "✅ এই ব্যবহারকারী ইতিমধ্যেই ব্ল্যাকলিস্টেড",
            blacklisted: "🚫 ইউজার {uid} ব্ল্যাকলিস্টে যোগ করা হয়েছে",
            notBlacklisted: "❌ এই ব্যবহারকারী ব্ল্যাকলিস্টেড নয়",
            unblacklisted: "✅ ইউজার {uid} ব্ল্যাকলিস্ট থেকে সরানো হয়েছে",
            invalidSyntax: "❌ ব্যবহার: {pn} [on/off/status/list/add/remove/blacklist/unblacklist] [ইউজার আইডি]",
            error: "❌ ত্রুটি: {error}"
        }
    }
};