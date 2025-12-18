const fs = require('fs-extra');
const path = require('path');

module.exports = {
    config: {
        name: "autoban",
        version: "2.5",
        author: "RANA",
        countDown: 5,
        role: 1,
        shortDescription: {
            en: "Auto ban system for group",
            bn: "গ্রুপের জন্য স্বয়ংক্রিয় ব্যান ব্যবস্থা"
        },
        longDescription: {
            en: "Automatically ban users who violate rules or post specific content",
            bn: "যারা নিয়ম ভঙ্গ করে বা নির্দিষ্ট বিষয়বস্তু পোস্ট করে তাদের স্বয়ংক্রিয়ভাবে ব্যান করুন"
        },
        category: "group",
        guide: {
            en: "{pn} [on/off/addword/removeword/list/status]",
            bn: "{pn} [on/off/addword/removeword/list/status]"
        }
    },

    onStart: async function ({ api, event, args, message, threadsData, getLang }) {
        const { threadID } = event;
        const action = args[0];

        const threadData = await threadsData.get(threadID);
        if (!threadData.autoBan) {
            threadData.autoBan = {
                enabled: false,
                bannedWords: [],
                exemptUsers: [],
                banCount: 0
            };
            await threadsData.set(threadID, threadData);
        }

        try {
            switch (action) {
                case 'on':
                    threadData.autoBan.enabled = true;
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("enabled"));
                
                case 'off':
                    threadData.autoBan.enabled = false;
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("disabled"));
                
                case 'status':
                    const status = threadData.autoBan.enabled ? '✅ Enabled' : '❌ Disabled';
                    const wordCount = threadData.autoBan.bannedWords?.length || 0;
                    const banCount = threadData.autoBan.banCount || 0;
                    const exemptCount = threadData.autoBan.exemptUsers?.length || 0;
                    
                    return message.reply(getLang("status", {
                        status: status,
                        words: wordCount,
                        bans: banCount,
                        exempt: exemptCount
                    }));
                
                case 'addword':
                    const wordToAdd = args.slice(1).join(" ").toLowerCase();
                    
                    if (!wordToAdd) {
                        return message.reply(getLang("noWord"));
                    }
                    
                    if (!threadData.autoBan.bannedWords) threadData.autoBan.bannedWords = [];
                    
                    if (threadData.autoBan.bannedWords.includes(wordToAdd)) {
                        return message.reply(getLang("alreadyBanned", { word: wordToAdd }));
                    }
                    
                    threadData.autoBan.bannedWords.push(wordToAdd);
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("wordAdded", { word: wordToAdd }));
                
                case 'removeword':
                    const wordToRemove = args.slice(1).join(" ").toLowerCase();
                    
                    if (!wordToRemove) {
                        return message.reply(getLang("noWord"));
                    }
                    
                    if (!threadData.autoBan.bannedWords || !threadData.autoBan.bannedWords.includes(wordToRemove)) {
                        return message.reply(getLang("notBanned", { word: wordToRemove }));
                    }
                    
                    threadData.autoBan.bannedWords = threadData.autoBan.bannedWords.filter(w => w !== wordToRemove);
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("wordRemoved", { word: wordToRemove }));
                
                case 'list':
                    if (!threadData.autoBan.bannedWords || threadData.autoBan.bannedWords.length === 0) {
                        return message.reply(getLang("noBannedWords"));
                    }
                    
                    let listMessage = "🚫 Banned Words:\n\n";
                    threadData.autoBan.bannedWords.forEach((word, index) => {
                        listMessage += `${index + 1}. ${word}\n`;
                    });
                    
                    return message.reply(listMessage);
                
                case 'addexempt':
                    const userToExempt = args[1];
                    
                    if (!userToExempt) {
                        return message.reply(getLang("noUserID"));
                    }
                    
                    const uidToExempt = userToExempt.replace(/[@<>]/g, '');
                    
                    if (!threadData.autoBan.exemptUsers) threadData.autoBan.exemptUsers = [];
                    
                    if (threadData.autoBan.exemptUsers.includes(uidToExempt)) {
                        return message.reply(getLang("alreadyExempt", { uid: uidToExempt }));
                    }
                    
                    threadData.autoBan.exemptUsers.push(uidToExempt);
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("exemptAdded", { uid: uidToExempt }));
                
                case 'removeexempt':
                    const userToRemoveExempt = args[1];
                    
                    if (!userToRemoveExempt) {
                        return message.reply(getLang("noUserID"));
                    }
                    
                    const uidToRemoveExempt = userToRemoveExempt.replace(/[@<>]/g, '');
                    
                    if (!threadData.autoBan.exemptUsers || !threadData.autoBan.exemptUsers.includes(uidToRemoveExempt)) {
                        return message.reply(getLang("notExempt", { uid: uidToRemoveExempt }));
                    }
                    
                    threadData.autoBan.exemptUsers = threadData.autoBan.exemptUsers.filter(id => id !== uidToRemoveExempt);
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("exemptRemoved", { uid: uidToRemoveExempt }));
                
                case 'stats':
                    const userStats = threadData.autoBan.userStats || {};
                    
                    let statsMessage = "📊 Auto Ban Statistics:\n\n";
                    statsMessage += `Total bans: ${threadData.autoBan.banCount || 0}\n`;
                    statsMessage += `Banned words: ${threadData.autoBan.bannedWords?.length || 0}\n`;
                    
                    if (Object.keys(userStats).length > 0) {
                        statsMessage += "\nUser violations:\n";
                        Object.entries(userStats).forEach(([userId, count]) => {
                            statsMessage += `• ${userId}: ${count} violations\n`;
                        });
                    }
                    
                    return message.reply(statsMessage);
                
                default:
                    return message.reply(getLang("invalidSyntax"));
            }
        } catch (error) {
            return message.reply(getLang("error", { error: error.message }));
        }
    },

    onChat: async function ({ api, event, threadsData }) {
        const { threadID, senderID, body } = event;
        
        if (!body || senderID === api.getCurrentUserID()) return;
        
        const threadData = await threadsData.get(threadID);
        
        if (!threadData.autoBan?.enabled) return;
        
        if (threadData.autoBan.exemptUsers?.includes(senderID)) return;
        
        const message = body.toLowerCase();
        const bannedWords = threadData.autoBan.bannedWords || [];
        
        for (const word of bannedWords) {
            if (message.includes(word)) {
                try {
                    await api.removeUserFromGroup(senderID, threadID);
                    
                    threadData.autoBan.banCount = (threadData.autoBan.banCount || 0) + 1;
                    
                    if (!threadData.autoBan.userStats) threadData.autoBan.userStats = {};
                    threadData.autoBan.userStats[senderID] = (threadData.autoBan.userStats[senderID] || 0) + 1;
                    
                    await threadsData.set(threadID, threadData);
                    
                    const userInfo = await api.getUserInfo(senderID);
                    const userName = userInfo[senderID]?.name || senderID;
                    
                    await api.sendMessage(
                        `🚫 User ${userName} (${senderID}) has been automatically banned for using banned word: "${word}"`,
                        threadID
                    );
                    
                    break;
                } catch (error) {
                    console.error('Auto ban failed:', error);
                }
            }
        }
    },

    langs: {
        en: {
            enabled: "✅ Auto ban system enabled",
            disabled: "❌ Auto ban system disabled",
            status: "📊 Auto Ban Status:\n\nStatus: {status}\nBanned words: {words}\nTotal bans: {bans}\nExempt users: {exempt}",
            noWord: "❌ Please provide a word to ban",
            alreadyBanned: "✅ The word '{word}' is already banned",
            wordAdded: "✅ Word '{word}' added to banned list",
            notBanned: "❌ The word '{word}' is not banned",
            wordRemoved: "✅ Word '{word}' removed from banned list",
            noBannedWords: "📭 No banned words set",
            noUserID: "❌ Please provide user ID",
            alreadyExempt: "✅ User {uid} is already exempt",
            exemptAdded: "✅ User {uid} added to exempt list",
            notExempt: "❌ User {uid} is not exempt",
            exemptRemoved: "✅ User {uid} removed from exempt list",
            invalidSyntax: "❌ Usage: {pn} [on/off/status/addword/removeword/list/addexempt/removeexempt/stats]",
            error: "❌ Error: {error}"
        },
        bn: {
            enabled: "✅ স্বয়ংক্রিয় ব্যান ব্যবস্থা সক্রিয় করা হয়েছে",
            disabled: "❌ স্বয়ংক্রিয় ব্যান ব্যবস্থা নিষ্ক্রিয় করা হয়েছে",
            status: "📊 স্বয়ংক্রিয় ব্যান অবস্থা:\n\nঅবস্থা: {status}\nনিষিদ্ধ শব্দ: {words}\nমোট ব্যান: {bans}\nব্যতিক্রম ব্যবহারকারী: {exempt}",
            noWord: "❌ দয়া করে নিষিদ্ধ করার জন্য একটি শব্দ দিন",
            alreadyBanned: "✅ '{word}' শব্দটি ইতিমধ্যেই নিষিদ্ধ",
            wordAdded: "✅ '{word}' শব্দটি নিষিদ্ধ তালিকায় যোগ করা হয়েছে",
            notBanned: "❌ '{word}' শব্দটি নিষিদ্ধ নয়",
            wordRemoved: "✅ '{word}' শব্দটি নিষিদ্ধ তালিকা থেকে সরানো হয়েছে",
            noBannedWords: "📭 কোন নিষিদ্ধ শব্দ সেট করা নেই",
            noUserID: "❌ দয়া করে ইউজার আইডি দিন",
            alreadyExempt: "✅ ইউজার {uid} ইতিমধ্যেই ব্যতিক্রম",
            exemptAdded: "✅ ইউজার {uid} ব্যতিক্রম তালিকায় যোগ করা হয়েছে",
            notExempt: "❌ ইউজার {uid} ব্যতিক্রম নয়",
            exemptRemoved: "✅ ইউজার {uid} ব্যতিক্রম তালিকা থেকে সরানো হয়েছে",
            invalidSyntax: "❌ ব্যবহার: {pn} [on/off/status/addword/removeword/list/addexempt/removeexempt/stats]",
            error: "❌ ত্রুটি: {error}"
        }
    }
};