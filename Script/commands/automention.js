const fs = require('fs-extra');
const path = require('path');

module.exports = {
    config: {
        name: "automention",
        version: "2.0",
        author: "RANA",
        countDown: 5,
        role: 1,
        shortDescription: {
            en: "Auto mention users in group",
            bn: "গ্রুপে ব্যবহারকারীদের স্বয়ংক্রিয়ভাবে উল্লেখ করুন"
        },
        longDescription: {
            en: "Automatically mention users when specific keywords are detected",
            bn: "নির্দিষ্ট কীওয়ার্ড সনাক্ত হলে ব্যবহারকারীদের স্বয়ংক্রিয়ভাবে উল্লেখ করুন"
        },
        category: "group",
        guide: {
            en: "{pn} [add/remove/list/on/off] [keyword] [userID/@mention]",
            bn: "{pn} [add/remove/list/on/off] [কীওয়ার্ড] [ইউজার আইডি/@মেনশন]"
        }
    },

    onStart: async function ({ api, event, args, message, threadsData, getLang }) {
        const { threadID, mentions } = event;
        const action = args[0];

        const threadData = await threadsData.get(threadID);
        if (!threadData.autoMention) {
            threadData.autoMention = {
                enabled: true,
                rules: []
            };
            await threadsData.set(threadID, threadData);
        }

        try {
            switch (action) {
                case 'add':
                    const keyword = args[1];
                    let targetUser = args[2];
                    
                    if (!keyword || !targetUser) {
                        return message.reply(getLang("addSyntax"));
                    }
                    
                    let userID;
                    if (Object.keys(mentions).length > 0) {
                        userID = Object.keys(mentions)[0];
                    } else if (targetUser.startsWith('@')) {
                        userID = targetUser.replace('@', '').replace(/[<>]/g, '');
                    } else {
                        userID = targetUser;
                    }
                    
                    try {
                        const userInfo = await api.getUserInfo(userID);
                        const userName = userInfo[userID]?.name || userID;
                        
                        threadData.autoMention.rules.push({
                            keyword: keyword.toLowerCase(),
                            userID: userID,
                            userName: userName,
                            addedBy: event.senderID,
                            addedAt: Date.now()
                        });
                        
                        await threadsData.set(threadID, threadData);
                        return message.reply(getLang("added", { keyword, user: userName, uid: userID }));
                    } catch (error) {
                        return message.reply(getLang("userNotFound"));
                    }
                
                case 'remove':
                    const removeKeyword = args[1];
                    const removeUserID = args[2];
                    
                    if (!removeKeyword) {
                        return message.reply(getLang("removeSyntax"));
                    }
                    
                    const initialLength = threadData.autoMention.rules.length;
                    
                    if (removeUserID) {
                        threadData.autoMention.rules = threadData.autoMention.rules.filter(
                            r => !(r.keyword === removeKeyword.toLowerCase() && r.userID === removeUserID)
                        );
                    } else {
                        threadData.autoMention.rules = threadData.autoMention.rules.filter(
                            r => r.keyword !== removeKeyword.toLowerCase()
                        );
                    }
                    
                    if (threadData.autoMention.rules.length === initialLength) {
                        return message.reply(getLang("ruleNotFound"));
                    }
                    
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("removed", { keyword: removeKeyword }));
                
                case 'list':
                    if (threadData.autoMention.rules.length === 0) {
                        return message.reply(getLang("noRules"));
                    }
                    
                    let listMessage = "📋 Auto Mention Rules:\n\n";
                    threadData.autoMention.rules.forEach((rule, index) => {
                        listMessage += `${index + 1}. Keyword: ${rule.keyword}\n`;
                        listMessage += `   ↳ User: ${rule.userName} (${rule.userID})\n\n`;
                    });
                    
                    listMessage += `Status: ${threadData.autoMention.enabled ? '✅ Enabled' : '❌ Disabled'}`;
                    listMessage += `\nTotal rules: ${threadData.autoMention.rules.length}`;
                    
                    return message.reply(listMessage);
                
                case 'on':
                    threadData.autoMention.enabled = true;
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("enabled"));
                
                case 'off':
                    threadData.autoMention.enabled = false;
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("disabled"));
                
                case 'clear':
                    threadData.autoMention.rules = [];
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("cleared"));
                
                default:
                    return message.reply(getLang("invalidSyntax"));
            }
        } catch (error) {
            return message.reply(getLang("error", { error: error.message }));
        }
    },

    onChat: async function ({ api, event, threadsData }) {
        const { threadID, body, senderID } = event;
        
        if (!body || senderID === api.getCurrentUserID()) return;
        
        const threadData = await threadsData.get(threadID);
        
        if (!threadData.autoMention?.enabled) return;
        
        const message = body.toLowerCase();
        
        for (const rule of threadData.autoMention.rules || []) {
            if (message.includes(rule.keyword)) {
                await api.sendMessage(`@${rule.userID}`, threadID);
                break;
            }
        }
    },

    langs: {
        en: {
            addSyntax: "❌ Usage: {pn} add [keyword] [userID/@mention]",
            added: "✅ Auto mention rule added!\n\nKeyword: {keyword}\nUser: {user} ({uid})",
            userNotFound: "❌ User not found. Please check the user ID",
            removeSyntax: "❌ Usage: {pn} remove [keyword] [userID]",
            ruleNotFound: "❌ Rule not found",
            removed: "✅ Auto mention rule removed!\nKeyword: {keyword}",
            noRules: "📭 No auto mention rules set",
            enabled: "✅ Auto mention system enabled",
            disabled: "❌ Auto mention system disabled",
            cleared: "🗑️ All auto mention rules cleared",
            invalidSyntax: "❌ Usage: {pn} [add/remove/list/on/off/clear]",
            error: "❌ Error: {error}"
        },
        bn: {
            addSyntax: "❌ ব্যবহার: {pn} add [কীওয়ার্ড] [ইউজার আইডি/@মেনশন]",
            added: "✅ স্বয়ংক্রিয় উল্লেখ নিয়ম যোগ করা হয়েছে!\n\nকীওয়ার্ড: {keyword}\nব্যবহারকারী: {user} ({uid})",
            userNotFound: "❌ ব্যবহারকারী পাওয়া যায়নি। ইউজার আইডি চেক করুন",
            removeSyntax: "❌ ব্যবহার: {pn} remove [কীওয়ার্ড] [ইউজার আইডি]",
            ruleNotFound: "❌ নিয়ম পাওয়া যায়নি",
            removed: "✅ স্বয়ংক্রিয় উল্লেখ নিয়ম সরানো হয়েছে!\nকীওয়ার্ড: {keyword}",
            noRules: "📭 কোন স্বয়ংক্রিয় উল্লেখ নিয়ম সেট করা নেই",
            enabled: "✅ স্বয়ংক্রিয় উল্লেখ ব্যবস্থা সক্রিয় করা হয়েছে",
            disabled: "❌ স্বয়ংক্রিয় উল্লেখ ব্যবস্থা নিষ্ক্রিয় করা হয়েছে",
            cleared: "🗑️ সব স্বয়ংক্রিয় উল্লেখ নিয়ম পরিষ্কার করা হয়েছে",
            invalidSyntax: "❌ ব্যবহার: {pn} [add/remove/list/on/off/clear]",
            error: "❌ ত্রুটি: {error}"
        }
    }
};