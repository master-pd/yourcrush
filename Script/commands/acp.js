const fs = require('fs-extra');
const path = require('path');

module.exports = {
    config: {
        name: "acp",
        version: "2.0",
        author: "RANA",
        countDown: 5,
        role: 2,
        shortDescription: {
            en: "Auto approve system for groups",
            bn: "গ্রুপের জন্য স্বয়ংক্রিয় অনুমোদন ব্যবস্থা"
        },
        longDescription: {
            en: "Automatically approve join requests for specific groups",
            bn: "নির্দিষ্ট গ্রুপগুলির জন্য যোগদানের অনুরোধ স্বয়ংক্রিয়ভাবে অনুমোদন করুন"
        },
        category: "admin",
        guide: {
            en: "{pn} [on/off/list/add/remove] [threadID]",
            bn: "{pn} [on/off/list/add/remove] [থ্রেড আইডি]"
        }
    },

    onStart: async function ({ api, event, args, message, getLang }) {
        const action = args[0];
        const threadID = args[1];
        
        const configPath = path.join(__dirname, '..', '..', 'config.json');
        const config = fs.readJsonSync(configPath);
        
        if (!config.autoApprove) {
            config.autoApprove = {
                enabled: false,
                threads: []
            };
        }

        switch (action) {
            case 'on':
                config.autoApprove.enabled = true;
                fs.writeJsonSync(configPath, config, { spaces: 2 });
                return message.reply(getLang("enabled"));
                
            case 'off':
                config.autoApprove.enabled = false;
                fs.writeJsonSync(configPath, config, { spaces: 2 });
                return message.reply(getLang("disabled"));
                
            case 'add':
                if (!threadID) {
                    return message.reply(getLang("provideThreadID"));
                }
                
                if (config.autoApprove.threads.includes(threadID)) {
                    return message.reply(getLang("alreadyAdded"));
                }
                
                config.autoApprove.threads.push(threadID);
                fs.writeJsonSync(configPath, config, { spaces: 2 });
                return message.reply(getLang("added", { threadID }));
                
            case 'remove':
                if (!threadID) {
                    return message.reply(getLang("provideThreadID"));
                }
                
                const index = config.autoApprove.threads.indexOf(threadID);
                if (index === -1) {
                    return message.reply(getLang("notInList"));
                }
                
                config.autoApprove.threads.splice(index, 1);
                fs.writeJsonSync(configPath, config, { spaces: 2 });
                return message.reply(getLang("removed", { threadID }));
                
            case 'list':
                if (config.autoApprove.threads.length === 0) {
                    return message.reply(getLang("emptyList"));
                }
                
                let listMessage = "📋 Auto Approve Threads:\n\n";
                config.autoApprove.threads.forEach((id, index) => {
                    listMessage += `${index + 1}. ${id}\n`;
                });
                
                listMessage += `\nStatus: ${config.autoApprove.enabled ? '✅ Enabled' : '❌ Disabled'}`;
                listMessage += `\nTotal: ${config.autoApprove.threads.length} threads`;
                
                return message.reply(listMessage);
                
            default:
                return message.reply(getLang("invalidSyntax"));
        }
    },

    langs: {
        en: {
            enabled: "✅ Auto approve system enabled",
            disabled: "❌ Auto approve system disabled",
            provideThreadID: "❌ Please provide thread ID",
            alreadyAdded: "✅ This thread is already in auto approve list",
            added: "✅ Thread added to auto approve: {threadID}",
            notInList: "❌ This thread is not in auto approve list",
            removed: "✅ Thread removed from auto approve: {threadID}",
            emptyList: "📭 Auto approve list is empty",
            invalidSyntax: "❌ Usage: {pn} [on/off/list/add/remove] [threadID]"
        },
        bn: {
            enabled: "✅ স্বয়ংক্রিয় অনুমোদন সিস্টেম সক্রিয় করা হয়েছে",
            disabled: "❌ স্বয়ংক্রিয় অনুমোদন সিস্টেম নিষ্ক্রিয় করা হয়েছে",
            provideThreadID: "❌ দয়া করে থ্রেড আইডি দিন",
            alreadyAdded: "✅ এই থ্রেডটি ইতিমধ্যেই স্বয়ংক্রিয় অনুমোদন তালিকায় রয়েছে",
            added: "✅ থ্রেড স্বয়ংক্রিয় অনুমোদনে যোগ করা হয়েছে: {threadID}",
            notInList: "❌ এই থ্রেডটি স্বয়ংক্রিয় অনুমোদন তালিকায় নেই",
            removed: "✅ থ্রেড স্বয়ংক্রিয় অনুমোদন থেকে সরানো হয়েছে: {threadID}",
            emptyList: "📭 স্বয়ংক্রিয় অনুমোদন তালিকা খালি",
            invalidSyntax: "❌ ব্যবহার: {pn} [on/off/list/add/remove] [থ্রেড আইডি]"
        }
    }
};