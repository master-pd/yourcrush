const fs = require('fs-extra');
const path = require('path');

module.exports = {
    config: {
        name: "auto",
        version: "3.0",
        author: "RANA",
        countDown: 5,
        role: 1,
        shortDescription: {
            en: "Auto response system",
            bn: "স্বয়ংক্রিয় প্রতিক্রিয়া ব্যবস্থা"
        },
        longDescription: {
            en: "Set up automatic responses for specific keywords in the group",
            bn: "গ্রুপে নির্দিষ্ট কীওয়ার্ডের জন্য স্বয়ংক্রিয় প্রতিক্রিয়া সেট আপ করুন"
        },
        category: "group",
        guide: {
            en: "{pn} [add/remove/list/on/off] [keyword] [response]",
            bn: "{pn} [add/remove/list/on/off] [কীওয়ার্ড] [প্রতিক্রিয়া]"
        }
    },

    onStart: async function ({ api, event, args, message, threadsData, getLang }) {
        const { threadID } = event;
        const action = args[0];

        const threadData = await threadsData.get(threadID);
        if (!threadData.autoResponses) {
            threadData.autoResponses = {
                enabled: true,
                responses: []
            };
            await threadsData.set(threadID, threadData);
        }

        try {
            switch (action) {
                case 'add':
                    const keyword = args[1];
                    const response = args.slice(2).join(" ");
                    
                    if (!keyword || !response) {
                        return message.reply(getLang("addSyntax"));
                    }
                    
                    threadData.autoResponses.responses.push({
                        keyword: keyword.toLowerCase(),
                        response: response,
                        addedBy: event.senderID,
                        addedAt: Date.now()
                    });
                    
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("added", { keyword, response }));
                
                case 'remove':
                    const removeKeyword = args[1];
                    
                    if (!removeKeyword) {
                        return message.reply(getLang("removeSyntax"));
                    }
                    
                    const initialLength = threadData.autoResponses.responses.length;
                    threadData.autoResponses.responses = threadData.autoResponses.responses.filter(
                        r => r.keyword !== removeKeyword.toLowerCase()
                    );
                    
                    if (threadData.autoResponses.responses.length === initialLength) {
                        return message.reply(getLang("keywordNotFound", { keyword: removeKeyword }));
                    }
                    
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("removed", { keyword: removeKeyword }));
                
                case 'list':
                    if (threadData.autoResponses.responses.length === 0) {
                        return message.reply(getLang("noResponses"));
                    }
                    
                    let listMessage = "📋 Auto Responses:\n\n";
                    threadData.autoResponses.responses.forEach((item, index) => {
                        listMessage += `${index + 1}. Keyword: ${item.keyword}\n`;
                        listMessage += `   Response: ${item.response}\n\n`;
                    });
                    
                    listMessage += `Status: ${threadData.autoResponses.enabled ? '✅ Enabled' : '❌ Disabled'}`;
                    listMessage += `\nTotal: ${threadData.autoResponses.responses.length} responses`;
                    
                    return message.reply(listMessage);
                
                case 'on':
                    threadData.autoResponses.enabled = true;
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("enabled"));
                
                case 'off':
                    threadData.autoResponses.enabled = false;
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("disabled"));
                
                case 'clear':
                    threadData.autoResponses.responses = [];
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
        
        if (!threadData.autoResponses?.enabled) return;
        
        const message = body.toLowerCase();
        
        for (const item of threadData.autoResponses.responses || []) {
            if (message.includes(item.keyword)) {
                await api.sendMessage(item.response, threadID);
                break;
            }
        }
    },

    langs: {
        en: {
            addSyntax: "❌ Usage: {pn} add [keyword] [response]",
            added: "✅ Auto response added!\n\nKeyword: {keyword}\nResponse: {response}",
            removeSyntax: "❌ Usage: {pn} remove [keyword]",
            keywordNotFound: "❌ Keyword '{keyword}' not found",
            removed: "✅ Auto response removed!\nKeyword: {keyword}",
            noResponses: "📭 No auto responses set up",
            enabled: "✅ Auto response system enabled",
            disabled: "❌ Auto response system disabled",
            cleared: "🗑️ All auto responses cleared",
            invalidSyntax: "❌ Usage: {pn} [add/remove/list/on/off/clear]",
            error: "❌ Error: {error}"
        },
        bn: {
            addSyntax: "❌ ব্যবহার: {pn} add [কীওয়ার্ড] [প্রতিক্রিয়া]",
            added: "✅ স্বয়ংক্রিয় প্রতিক্রিয়া যোগ করা হয়েছে!\n\nকীওয়ার্ড: {keyword}\nপ্রতিক্রিয়া: {response}",
            removeSyntax: "❌ ব্যবহার: {pn} remove [কীওয়ার্ড]",
            keywordNotFound: "❌ কীওয়ার্ড '{keyword}' পাওয়া যায়নি",
            removed: "✅ স্বয়ংক্রিয় প্রতিক্রিয়া সরানো হয়েছে!\nকীওয়ার্ড: {keyword}",
            noResponses: "📭 কোন স্বয়ংক্রিয় প্রতিক্রিয়া সেট আপ নেই",
            enabled: "✅ স্বয়ংক্রিয় প্রতিক্রিয়া ব্যবস্থা সক্রিয় করা হয়েছে",
            disabled: "❌ স্বয়ংক্রিয় প্রতিক্রিয়া ব্যবস্থা নিষ্ক্রিয় করা হয়েছে",
            cleared: "🗑️ সব স্বয়ংক্রিয় প্রতিক্রিয়া পরিষ্কার করা হয়েছে",
            invalidSyntax: "❌ ব্যবহার: {pn} [add/remove/list/on/off/clear]",
            error: "❌ ত্রুটি: {error}"
        }
    }
};