const fs = require('fs-extra');
const path = require('path');

module.exports = {
    config: {
        name: "autoreact",
        version: "2.5",
        author: "RANA",
        countDown: 5,
        role: 1,
        shortDescription: {
            en: "Auto react to messages",
            bn: "বার্তায় স্বয়ংক্রিয়ভাবে প্রতিক্রিয়া দিন"
        },
        longDescription: {
            en: "Automatically react with emojis to specific messages or keywords",
            bn: "নির্দিষ্ট বার্তা বা কীওয়ার্ডে স্বয়ংক্রিয়ভাবে ইমোজি দিয়ে প্রতিক্রিয়া দিন"
        },
        category: "group",
        guide: {
            en: "{pn} [add/remove/list/on/off] [keyword] [emoji]",
            bn: "{pn} [add/remove/list/on/off] [কীওয়ার্ড] [ইমোজি]"
        }
    },

    onStart: async function ({ api, event, args, message, threadsData, getLang }) {
        const { threadID } = event;
        const action = args[0];

        const threadData = await threadsData.get(threadID);
        if (!threadData.autoReact) {
            threadData.autoReact = {
                enabled: true,
                reactions: [],
                globalReactions: []
            };
            await threadsData.set(threadID, threadData);
        }

        try {
            switch (action) {
                case 'add':
                    const keyword = args[1];
                    const emoji = args[2];
                    
                    if (!keyword || !emoji) {
                        return message.reply(getLang("addSyntax"));
                    }
                    
                    threadData.autoReact.reactions.push({
                        keyword: keyword.toLowerCase(),
                        emoji: emoji,
                        addedBy: event.senderID,
                        addedAt: Date.now()
                    });
                    
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("added", { keyword, emoji }));
                
                case 'remove':
                    const removeKeyword = args[1];
                    const removeEmoji = args[2];
                    
                    if (!removeKeyword) {
                        return message.reply(getLang("removeSyntax"));
                    }
                    
                    const initialLength = threadData.autoReact.reactions.length;
                    
                    if (removeEmoji) {
                        threadData.autoReact.reactions = threadData.autoReact.reactions.filter(
                            r => !(r.keyword === removeKeyword.toLowerCase() && r.emoji === removeEmoji)
                        );
                    } else {
                        threadData.autoReact.reactions = threadData.autoReact.reactions.filter(
                            r => r.keyword !== removeKeyword.toLowerCase()
                        );
                    }
                    
                    if (threadData.autoReact.reactions.length === initialLength) {
                        return message.reply(getLang("reactionNotFound"));
                    }
                    
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("removed", { keyword: removeKeyword }));
                
                case 'list':
                    if (threadData.autoReact.reactions.length === 0 && threadData.autoReact.globalReactions.length === 0) {
                        return message.reply(getLang("noReactions"));
                    }
                    
                    let listMessage = "🤖 Auto Reactions:\n\n";
                    
                    if (threadData.autoReact.reactions.length > 0) {
                        listMessage += "🔤 Keyword-based reactions:\n";
                        threadData.autoReact.reactions.forEach((reaction, index) => {
                            listMessage += `${index + 1}. Keyword: ${reaction.keyword}\n`;
                            listMessage += `   ↳ Reaction: ${reaction.emoji}\n\n`;
                        });
                    }
                    
                    if (threadData.autoReact.globalReactions.length > 0) {
                        listMessage += "🌍 Global reactions:\n";
                        threadData.autoReact.globalReactions.forEach((emoji, index) => {
                            listMessage += `${index + 1}. ${emoji}\n`;
                        });
                    }
                    
                    listMessage += `\nStatus: ${threadData.autoReact.enabled ? '✅ Enabled' : '❌ Disabled'}`;
                    listMessage += `\nTotal rules: ${threadData.autoReact.reactions.length + threadData.autoReact.globalReactions.length}`;
                    
                    return message.reply(listMessage);
                
                case 'on':
                    threadData.autoReact.enabled = true;
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("enabled"));
                
                case 'off':
                    threadData.autoReact.enabled = false;
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("disabled"));
                
                case 'addglobal':
                    const globalEmoji = args[1];
                    
                    if (!globalEmoji) {
                        return message.reply(getLang("noEmoji"));
                    }
                    
                    if (threadData.autoReact.globalReactions.includes(globalEmoji)) {
                        return message.reply(getLang("alreadyGlobal", { emoji: globalEmoji }));
                    }
                    
                    threadData.autoReact.globalReactions.push(globalEmoji);
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("globalAdded", { emoji: globalEmoji }));
                
                case 'removeglobal':
                    const removeGlobalEmoji = args[1];
                    
                    if (!removeGlobalEmoji) {
                        return message.reply(getLang("noEmoji"));
                    }
                    
                    if (!threadData.autoReact.globalReactions.includes(removeGlobalEmoji)) {
                        return message.reply(getLang("notGlobal", { emoji: removeGlobalEmoji }));
                    }
                    
                    threadData.autoReact.globalReactions = threadData.autoReact.globalReactions.filter(e => e !== removeGlobalEmoji);
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("globalRemoved", { emoji: removeGlobalEmoji }));
                
                case 'clear':
                    threadData.autoReact.reactions = [];
                    threadData.autoReact.globalReactions = [];
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
        const { threadID, messageID, body, senderID } = event;
        
        if (!body || senderID === api.getCurrentUserID()) return;
        
        const threadData = await threadsData.get(threadID);
        
        if (!threadData.autoReact?.enabled) return;
        
        const message = body.toLowerCase();
        
        for (const reaction of threadData.autoReact.reactions || []) {
            if (message.includes(reaction.keyword)) {
                try {
                    await api.setMessageReaction(reaction.emoji, messageID);
                    break;
                } catch (error) {
                    console.error('Auto react failed:', error);
                }
            }
        }
        
        for (const emoji of threadData.autoReact.globalReactions || []) {
            try {
                await api.setMessageReaction(emoji, messageID);
            } catch (error) {
                console.error('Global react failed:', error);
            }
        }
    },

    langs: {
        en: {
            addSyntax: "❌ Usage: {pn} add [keyword] [emoji]",
            added: "✅ Auto reaction added!\n\nKeyword: {keyword}\nReaction: {emoji}",
            removeSyntax: "❌ Usage: {pn} remove [keyword] [emoji]",
            reactionNotFound: "❌ Reaction rule not found",
            removed: "✅ Auto reaction removed!\nKeyword: {keyword}",
            noReactions: "📭 No auto reactions set",
            enabled: "✅ Auto reaction system enabled",
            disabled: "❌ Auto reaction system disabled",
            noEmoji: "❌ Please provide an emoji",
            alreadyGlobal: "✅ Emoji {emoji} is already a global reaction",
            globalAdded: "✅ Emoji {emoji} added to global reactions",
            notGlobal: "❌ Emoji {emoji} is not a global reaction",
            globalRemoved: "✅ Emoji {emoji} removed from global reactions",
            cleared: "🗑️ All auto reactions cleared",
            invalidSyntax: "❌ Usage: {pn} [add/remove/list/on/off/addglobal/removeglobal/clear]",
            error: "❌ Error: {error}"
        },
        bn: {
            addSyntax: "❌ ব্যবহার: {pn} add [কীওয়ার্ড] [ইমোজি]",
            added: "✅ স্বয়ংক্রিয় প্রতিক্রিয়া যোগ করা হয়েছে!\n\nকীওয়ার্ড: {keyword}\nপ্রতিক্রিয়া: {emoji}",
            removeSyntax: "❌ ব্যবহার: {pn} remove [কীওয়ার্ড] [ইমোজি]",
            reactionNotFound: "❌ প্রতিক্রিয়া নিয়ম পাওয়া যায়নি",
            removed: "✅ স্বয়ংক্রিয় প্রতিক্রিয়া সরানো হয়েছে!\nকীওয়ার্ড: {keyword}",
            noReactions: "📭 কোন স্বয়ংক্রিয় প্রতিক্রিয়া সেট করা নেই",
            enabled: "✅ স্বয়ংক্রিয় প্রতিক্রিয়া ব্যবস্থা সক্রিয় করা হয়েছে",
            disabled: "❌ স্বয়ংক্রিয় প্রতিক্রিয়া ব্যবস্থা নিষ্ক্রিয় করা হয়েছে",
            noEmoji: "❌ দয়া করে একটি ইমোজি দিন",
            alreadyGlobal: "✅ ইমোজি {emoji} ইতিমধ্যেই একটি গ্লোবাল প্রতিক্রিয়া",
            globalAdded: "✅ ইমোজি {emoji} গ্লোবাল প্রতিক্রিয়ায় যোগ করা হয়েছে",
            notGlobal: "❌ ইমোজি {emoji} গ্লোবাল প্রতিক্রিয়া নয়",
            globalRemoved: "✅ ইমোজি {emoji} গ্লোবাল প্রতিক্রিয়া থেকে সরানো হয়েছে",
            cleared: "🗑️ সব স্বয়ংক্রিয় প্রতিক্রিয়া পরিষ্কার করা হয়েছে",
            invalidSyntax: "❌ ব্যবহার: {pn} [add/remove/list/on/off/addglobal/removeglobal/clear]",
            error: "❌ ত্রুটি: {error}"
        }
    }
};