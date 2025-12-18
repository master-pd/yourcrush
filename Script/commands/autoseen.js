const fs = require('fs-extra');
const path = require('path');

module.exports = {
    config: {
        name: "autoseen",
        version: "2.0",
        author: "RANA",
        countDown: 5,
        role: 1,
        shortDescription: {
            en: "Auto seen messages",
            bn: "বার্তাগুলি স্বয়ংক্রিয়ভাবে দেখা হয়েছে"
        },
        longDescription: {
            en: "Automatically mark messages as seen for the bot",
            bn: "বটের জন্য বার্তাগুলি স্বয়ংক্রিয়ভাবে দেখা হয়েছে হিসাবে চিহ্নিত করুন"
        },
        category: "bot",
        guide: {
            en: "{pn} [on/off/status]",
            bn: "{pn} [on/off/status]"
        }
    },

    onStart: async function ({ api, event, args, message, threadsData, getLang }) {
        const action = args[0];

        const configPath = path.join(__dirname, '..', '..', 'config.json');
        const config = fs.readJsonSync(configPath);
        
        if (config.autoSeen === undefined) {
            config.autoSeen = false;
        }

        try {
            switch (action) {
                case 'on':
                    config.autoSeen = true;
                    fs.writeJsonSync(configPath, config, { spaces: 2 });
                    return message.reply(getLang("enabled"));
                
                case 'off':
                    config.autoSeen = false;
                    fs.writeJsonSync(configPath, config, { spaces: 2 });
                    return message.reply(getLang("disabled"));
                
                case 'status':
                    const status = config.autoSeen ? '✅ Enabled' : '❌ Disabled';
                    return message.reply(getLang("status", { status }));
                
                case 'settings':
                    return message.reply(getLang("settings", {
                        status: config.autoSeen ? '✅ Enabled' : '❌ Disabled',
                        delay: config.autoSeenDelay || '1000',
                        exemptThreads: config.autoSeenExempt?.length || 0
                    }));
                
                case 'delay':
                    const delay = parseInt(args[1]);
                    
                    if (!delay || isNaN(delay) || delay < 0 || delay > 10000) {
                        return message.reply(getLang("invalidDelay"));
                    }
                    
                    config.autoSeenDelay = delay;
                    fs.writeJsonSync(configPath, config, { spaces: 2 });
                    return message.reply(getLang("delaySet", { delay }));
                
                case 'addexempt':
                    const threadID = args[1];
                    
                    if (!threadID) {
                        return message.reply(getLang("noThreadID"));
                    }
                    
                    if (!config.autoSeenExempt) {
                        config.autoSeenExempt = [];
                    }
                    
                    if (config.autoSeenExempt.includes(threadID)) {
                        return message.reply(getLang("alreadyExempt", { threadID }));
                    }
                    
                    config.autoSeenExempt.push(threadID);
                    fs.writeJsonSync(configPath, config, { spaces: 2 });
                    return message.reply(getLang("exemptAdded", { threadID }));
                
                case 'removeexempt':
                    const removeThreadID = args[1];
                    
                    if (!removeThreadID) {
                        return message.reply(getLang("noThreadID"));
                    }
                    
                    if (!config.autoSeenExempt || !config.autoSeenExempt.includes(removeThreadID)) {
                        return message.reply(getLang("notExempt", { threadID: removeThreadID }));
                    }
                    
                    config.autoSeenExempt = config.autoSeenExempt.filter(id => id !== removeThreadID);
                    fs.writeJsonSync(configPath, config, { spaces: 2 });
                    return message.reply(getLang("exemptRemoved", { threadID: removeThreadID }));
                
                case 'listexempt':
                    if (!config.autoSeenExempt || config.autoSeenExempt.length === 0) {
                        return message.reply(getLang("noExempt"));
                    }
                    
                    let listMessage = "📋 Auto Seen Exempt Threads:\n\n";
                    config.autoSeenExempt.forEach((id, index) => {
                        listMessage += `${index + 1}. ${id}\n`;
                    });
                    
                    return message.reply(listMessage);
                
                default:
                    return message.reply(getLang("invalidSyntax"));
            }
        } catch (error) {
            return message.reply(getLang("error", { error: error.message }));
        }
    },

    onEvent: async function ({ api, event, config }) {
        if (!config.autoSeen) return;
        
        const { threadID, messageID } = event;
        
        if (config.autoSeenExempt?.includes(threadID)) return;
        
        const delay = config.autoSeenDelay || 1000;
        
        setTimeout(() => {
            try {
                api.markAsRead(threadID, messageID);
            } catch (error) {
                console.error('Auto seen failed:', error);
            }
        }, delay);
    },

    langs: {
        en: {
            enabled: "✅ Auto seen system enabled",
            disabled: "❌ Auto seen system disabled",
            status: "📊 Auto Seen Status: {status}",
            settings: "⚙️ Auto Seen Settings:\n\nStatus: {status}\nDelay: {delay}ms\nExempt threads: {exemptThreads}",
            invalidDelay: "❌ Invalid delay! Please provide a number between 0 and 10000",
            delaySet: "✅ Auto seen delay set to {delay}ms",
            noThreadID: "❌ Please provide thread ID",
            alreadyExempt: "✅ Thread {threadID} is already exempt",
            exemptAdded: "✅ Thread {threadID} added to exempt list",
            notExempt: "❌ Thread {threadID} is not exempt",
            exemptRemoved: "✅ Thread {threadID} removed from exempt list",
            noExempt: "📭 No exempt threads",
            invalidSyntax: "❌ Usage: {pn} [on/off/status/settings/delay/addexempt/removeexempt/listexempt]",
            error: "❌ Error: {error}"
        },
        bn: {
            enabled: "✅ স্বয়ংক্রিয় দেখা ব্যবস্থা সক্রিয় করা হয়েছে",
            disabled: "❌ স্বয়ংক্রিয় দেখা ব্যবস্থা নিষ্ক্রিয় করা হয়েছে",
            status: "📊 স্বয়ংক্রিয় দেখা অবস্থা: {status}",
            settings: "⚙️ স্বয়ংক্রিয় দেখা সেটিংস:\n\nঅবস্থা: {status}\nবিলম্ব: {delay}ms\nব্যতিক্রম থ্রেড: {exemptThreads}",
            invalidDelay: "❌ অবৈধ বিলম্ব! দয়া করে 0 থেকে 10000 এর মধ্যে একটি সংখ্যা দিন",
            delaySet: "✅ স্বয়ংক্রিয় দেখা বিলম্ব {delay}ms এ সেট করা হয়েছে",
            noThreadID: "❌ দয়া করে থ্রেড আইডি দিন",
            alreadyExempt: "✅ থ্রেড {threadID} ইতিমধ্যেই ব্যতিক্রম",
            exemptAdded: "✅ থ্রেড {threadID} ব্যতিক্রম তালিকায় যোগ করা হয়েছে",
            notExempt: "❌ থ্রেড {threadID} ব্যতিক্রম নয়",
            exemptRemoved: "✅ থ্রেড {threadID} ব্যতিক্রম তালিকা থেকে সরানো হয়েছে",
            noExempt: "📭 কোন ব্যতিক্রম থ্রেড নেই",
            invalidSyntax: "❌ ব্যবহার: {pn} [on/off/status/settings/delay/addexempt/removeexempt/listexempt]",
            error: "❌ ত্রুটি: {error}"
        }
    }
};