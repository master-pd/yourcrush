const fs = require('fs-extra');
const path = require('path');

module.exports = {
    config: {
        name: "autosetname",
        version: "2.0",
        author: "RANA",
        countDown: 5,
        role: 1,
        shortDescription: {
            en: "Auto set group name",
            bn: "গ্রুপের নাম স্বয়ংক্রিয়ভাবে সেট করুন"
        },
        longDescription: {
            en: "Automatically set group name based on templates or conditions",
            bn: "টেমপ্লেট বা শর্তের উপর ভিত্তি করে গ্রুপের নাম স্বয়ংক্রিয়ভাবে সেট করুন"
        },
        category: "group",
        guide: {
            en: "{pn} [on/off/set/list/templates]",
            bn: "{pn} [on/off/set/list/templates]"
        }
    },

    onStart: async function ({ api, event, args, message, threadsData, getLang }) {
        const { threadID } = event;
        const action = args[0];

        const threadData = await threadsData.get(threadID);
        if (!threadData.autoSetName) {
            threadData.autoSetName = {
                enabled: false,
                template: "{time} • {members} members • {random}",
                interval: 3600000,
                lastSet: 0
            };
            await threadsData.set(threadID, threadData);
        }

        try {
            switch (action) {
                case 'on':
                    threadData.autoSetName.enabled = true;
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("enabled"));
                
                case 'off':
                    threadData.autoSetName.enabled = false;
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("disabled"));
                
                case 'set':
                    const template = args.slice(1).join(" ");
                    
                    if (!template) {
                        return message.reply(getLang("noTemplate"));
                    }
                    
                    threadData.autoSetName.template = template;
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("templateSet", { template }));
                
                case 'interval':
                    const interval = parseInt(args[1]);
                    
                    if (!interval || isNaN(interval) || interval < 60000 || interval > 86400000) {
                        return message.reply(getLang("invalidInterval"));
                    }
                    
                    threadData.autoSetName.interval = interval;
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("intervalSet", { interval: Math.floor(interval / 60000) }));
                
                case 'status':
                    const status = threadData.autoSetName.enabled ? '✅ Enabled' : '❌ Disabled';
                    const lastSet = threadData.autoSetName.lastSet ? 
                        formatTime(Date.now() - threadData.autoSetName.lastSet) + ' ago' : 
                        'Never';
                    
                    return message.reply(getLang("status", {
                        status: status,
                        template: threadData.autoSetName.template,
                        interval: Math.floor(threadData.autoSetName.interval / 60000),
                        lastSet: lastSet
                    }));
                
                case 'list':
                    const allThreads = await api.getThreadList(100, null, ['INBOX']);
                    const autoSetNameThreads = [];
                    
                    for (const thread of allThreads) {
                        if (thread.isGroup) {
                            const tData = await threadsData.get(thread.threadID);
                            if (tData.autoSetName?.enabled) {
                                autoSetNameThreads.push({
                                    name: thread.name || 'Unnamed',
                                    id: thread.threadID,
                                    template: tData.autoSetName.template
                                });
                            }
                        }
                    }
                    
                    if (autoSetNameThreads.length === 0) {
                        return message.reply(getLang("noActive"));
                    }
                    
                    let listMessage = "📋 Auto Set Name Active Groups:\n\n";
                    autoSetNameThreads.forEach((thread, index) => {
                        listMessage += `${index + 1}. ${thread.name}\n`;
                        listMessage += `   ↳ ID: ${thread.id}\n`;
                        listMessage += `   ↳ Template: ${thread.template}\n\n`;
                    });
                    
                    return message.reply(listMessage);
                
                case 'templates':
                    return message.reply(getLang("templates"));
                
                case 'now':
                    await setGroupName(api, threadID, threadData.autoSetName.template);
                    threadData.autoSetName.lastSet = Date.now();
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("nameSet"));
                
                default:
                    return message.reply(getLang("invalidSyntax"));
            }
        } catch (error) {
            return message.reply(getLang("error", { error: error.message }));
        }
    },

    onEvent: async function ({ api, event, threadsData }) {
        const now = Date.now();
        const allThreads = await api.getThreadList(100, null, ['INBOX']);
        
        for (const thread of allThreads) {
            if (thread.isGroup) {
                const threadData = await threadsData.get(thread.threadID);
                
                if (threadData.autoSetName?.enabled) {
                    const lastSet = threadData.autoSetName.lastSet || 0;
                    const interval = threadData.autoSetName.interval || 3600000;
                    
                    if (now - lastSet >= interval) {
                        try {
                            await setGroupName(api, thread.threadID, threadData.autoSetName.template);
                            threadData.autoSetName.lastSet = now;
                            await threadsData.set(thread.threadID, threadData);
                        } catch (error) {
                            console.error('Auto set name failed:', error);
                        }
                    }
                }
            }
        }
    },

    langs: {
        en: {
            enabled: "✅ Auto set name enabled",
            disabled: "❌ Auto set name disabled",
            noTemplate: "❌ Please provide a template\nExample: {pn} set \"{time} • {members} members\"",
            templateSet: "✅ Template set: {template}",
            invalidInterval: "❌ Invalid interval! Use minutes (1-1440)",
            intervalSet: "✅ Interval set to {interval} minutes",
            status: "📊 Auto Set Name Status:\n\nStatus: {status}\nTemplate: {template}\nInterval: {interval} minutes\nLast set: {lastSet}",
            noActive: "📭 No groups have auto set name enabled",
            templates: "📝 Available Template Variables:\n\n• {time} - Current time\n• {date} - Current date\n• {members} - Member count\n• {random} - Random emoji\n• {day} - Day of week\n• {month} - Month name\n• {year} - Current year\n\nExample: \"{time} • {members} members {random}\"",
            nameSet: "✅ Group name updated successfully!",
            invalidSyntax: "❌ Usage: {pn} [on/off/set/interval/status/list/templates/now]",
            error: "❌ Error: {error}"
        },
        bn: {
            enabled: "✅ স্বয়ংক্রিয় নাম সেট সক্রিয় করা হয়েছে",
            disabled: "❌ স্বয়ংক্রিয় নাম সেট নিষ্ক্রিয় করা হয়েছে",
            noTemplate: "❌ দয়া করে একটি টেমপ্লেট দিন\nউদাহরণ: {pn} set \"{time} • {members} members\"",
            templateSet: "✅ টেমপ্লেট সেট: {template}",
            invalidInterval: "❌ অবৈধ ব্যবধান! মিনিট ব্যবহার করুন (1-1440)",
            intervalSet: "✅ ব্যবধান {interval} মিনিটে সেট করা হয়েছে",
            status: "📊 স্বয়ংক্রিয় নাম সেট অবস্থা:\n\nঅবস্থা: {status}\nটেমপ্লেট: {template}\nব্যয়: {interval} মিনিট\nসর্বশেষ সেট: {lastSet}",
            noActive: "📭 কোন গ্রুপে স্বয়ংক্রিয় নাম সেট সক্রিয় নেই",
            templates: "📝 উপলব্ধ টেমপ্লেট ভেরিয়েবল:\n\n• {time} - বর্তমান সময়\n• {date} - বর্তমান তারিখ\n• {members} - সদস্য সংখ্যা\n• {random} - এলোমেলো ইমোজি\n• {day} - সপ্তাহের দিন\n• {month} - মাসের নাম\n• {year} - বর্তমান বছর\n\nউদাহরণ: \"{time} • {members} members {random}\"",
            nameSet: "✅ গ্রুপের নাম সফলভাবে আপডেট করা হয়েছে!",
            invalidSyntax: "❌ ব্যবহার: {pn} [on/off/set/interval/status/list/templates/now]",
            error: "❌ ত্রুটি: {error}"
        }
    }
};

async function setGroupName(api, threadID, template) {
    const threadInfo = await api.getThreadInfo(threadID);
    
    const variables = {
        '{time}': new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        '{date}': new Date().toLocaleDateString(),
        '{members}': threadInfo.participantIDs.length,
        '{random}': getRandomEmoji(),
        '{day}': new Date().toLocaleDateString('en-US', { weekday: 'long' }),
        '{month}': new Date().toLocaleDateString('en-US', { month: 'long' }),
        '{year}': new Date().getFullYear()
    };
    
    let groupName = template;
    for (const [key, value] of Object.entries(variables)) {
        groupName = groupName.replace(new RegExp(key, 'g'), value);
    }
    
    await api.setTitle(groupName, threadID);
}

function getRandomEmoji() {
    const emojis = ['😊', '🌟', '⚡', '🔥', '💫', '✨', '🎯', '💖', '🎉', '🚀'];
    return emojis[Math.floor(Math.random() * emojis.length)];
}

function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    return `${seconds} second${seconds > 1 ? 's' : ''}`;
}