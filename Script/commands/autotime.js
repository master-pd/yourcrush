const fs = require('fs-extra');
const path = require('path');

module.exports = {
    config: {
        name: "autotime",
        version: "2.0",
        author: "RANA",
        countDown: 5,
        role: 1,
        shortDescription: {
            en: "Auto display current time",
            bn: "বর্তমান সময় স্বয়ংক্রিয়ভাবে প্রদর্শন করুন"
        },
        longDescription: {
            en: "Automatically display current time in group at regular intervals",
            bn: "নিয়মিত বিরতিতে গ্রুপে বর্তমান সময় স্বয়ংক্রিয়ভাবে প্রদর্শন করুন"
        },
        category: "group",
        guide: {
            en: "{pn} [on/off/set/status]",
            bn: "{pn} [on/off/set/status]"
        }
    },

    onStart: async function ({ api, event, args, message, threadsData, getLang }) {
        const { threadID } = event;
        const action = args[0];

        const threadData = await threadsData.get(threadID);
        if (!threadData.autoTime) {
            threadData.autoTime = {
                enabled: false,
                format: "en-US",
                interval: 3600000,
                lastDisplay: 0
            };
            await threadsData.set(threadID, threadData);
        }

        try {
            switch (action) {
                case 'on':
                    threadData.autoTime.enabled = true;
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("enabled"));
                
                case 'off':
                    threadData.autoTime.enabled = false;
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("disabled"));
                
                case 'set':
                    const setting = args[1];
                    const value = args[2];
                    
                    if (!setting || !value) {
                        return message.reply(getLang("setSyntax"));
                    }
                    
                    switch (setting.toLowerCase()) {
                        case 'format':
                            const formats = ['en-US', 'bn-BD', '24h', '12h'];
                            if (!formats.includes(value)) {
                                return message.reply(getLang("invalidFormat", { formats: formats.join(', ') }));
                            }
                            threadData.autoTime.format = value;
                            break;
                        
                        case 'interval':
                            const interval = parseInt(value);
                            if (isNaN(interval) || interval < 1 || interval > 1440) {
                                return message.reply(getLang("invalidInterval"));
                            }
                            threadData.autoTime.interval = interval * 60000;
                            break;
                        
                        default:
                            return message.reply(getLang("invalidSetting"));
                    }
                    
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("settingUpdated", { setting, value }));
                
                case 'status':
                    const status = threadData.autoTime.enabled ? '✅ Enabled' : '❌ Disabled';
                    const lastDisplay = threadData.autoTime.lastDisplay ? 
                        formatTime(Date.now() - threadData.autoTime.lastDisplay) + ' ago' : 
                        'Never';
                    
                    return message.reply(getLang("status", {
                        status: status,
                        format: threadData.autoTime.format,
                        interval: Math.floor(threadData.autoTime.interval / 60000),
                        lastDisplay: lastDisplay
                    }));
                
                case 'formats':
                    return message.reply(getLang("formats"));
                
                case 'now':
                    const timeDisplay = getTimeDisplay(threadData.autoTime.format);
                    await api.sendMessage(`🕒 Current Time:\n\n${timeDisplay}`, threadID);
                    threadData.autoTime.lastDisplay = Date.now();
                    await threadsData.set(threadID, threadData);
                    return;
                
                case 'test':
                    const testFormat = args[1] || threadData.autoTime.format;
                    const testTime = getTimeDisplay(testFormat);
                    return message.reply(getLang("test", { format: testFormat, time: testTime }));
                
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
                
                if (threadData.autoTime?.enabled) {
                    const lastDisplay = threadData.autoTime.lastDisplay || 0;
                    const interval = threadData.autoTime.interval || 3600000;
                    
                    if (now - lastDisplay >= interval) {
                        try {
                            const timeDisplay = getTimeDisplay(threadData.autoTime.format);
                            await api.sendMessage(`🕒 Current Time:\n\n${timeDisplay}`, thread.threadID);
                            threadData.autoTime.lastDisplay = now;
                            await threadsData.set(thread.threadID, threadData);
                        } catch (error) {
                            console.error('Auto time display failed:', error);
                        }
                    }
                }
            }
        }
    },

    langs: {
        en: {
            enabled: "✅ Auto time display enabled",
            disabled: "❌ Auto time display disabled",
            setSyntax: "❌ Usage: {pn} set [format/interval] [value]",
            invalidFormat: "❌ Invalid format! Available: {formats}",
            invalidInterval: "❌ Invalid interval! Use minutes (1-1440)",
            invalidSetting: "❌ Invalid setting! Use: format or interval",
            settingUpdated: "✅ {setting} updated to: {value}",
            status: "📊 Auto Time Status:\n\nStatus: {status}\nFormat: {format}\nInterval: {interval} minutes\nLast display: {lastDisplay}",
            formats: "📝 Available Time Formats:\n\n• en-US - English (US) format\n• bn-BD - Bengali format\n• 24h - 24-hour format\n• 12h - 12-hour format with AM/PM",
            test: "🕒 Time Format Test:\n\nFormat: {format}\nDisplay: {time}",
            invalidSyntax: "❌ Usage: {pn} [on/off/set/status/formats/now/test]",
            error: "❌ Error: {error}"
        },
        bn: {
            enabled: "✅ স্বয়ংক্রিয় সময় প্রদর্শন সক্রিয় করা হয়েছে",
            disabled: "❌ স্বয়ংক্রিয় সময় প্রদর্শন নিষ্ক্রিয় করা হয়েছে",
            setSyntax: "❌ ব্যবহার: {pn} set [format/interval] [value]",
            invalidFormat: "❌ অবৈধ ফরম্যাট! উপলব্ধ: {formats}",
            invalidInterval: "❌ অবৈধ ব্যবধান! মিনিট ব্যবহার করুন (1-1440)",
            invalidSetting: "❌ অবৈধ সেটিং! ব্যবহার করুন: format বা interval",
            settingUpdated: "✅ {setting} আপডেট করা হয়েছে: {value}",
            status: "📊 স্বয়ংক্রিয় সময় অবস্থা:\n\nঅবস্থা: {status}\nফরম্যাট: {format}\nব্যয়: {interval} মিনিট\nশেষ প্রদর্শন: {lastDisplay}",
            formats: "📝 উপলব্ধ সময় ফরম্যাট:\n\n• en-US - ইংরেজি (US) ফরম্যাট\n• bn-BD - বাংলা ফরম্যাট\n• 24h - 24-ঘন্টা ফরম্যাট\n• 12h - 12-ঘন্টা ফরম্যাট AM/PM সহ",
            test: "🕒 সময় ফরম্যাট পরীক্ষা:\n\nফরম্যাট: {format}\nপ্রদর্শন: {time}",
            invalidSyntax: "❌ ব্যবহার: {pn} [on/off/set/status/formats/now/test]",
            error: "❌ ত্রুটি: {error}"
        }
    }
};

function getTimeDisplay(format) {
    const now = new Date();
    
    switch (format) {
        case 'en-US':
            return now.toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                timeZoneName: 'short'
            });
        
        case 'bn-BD':
            const options = {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            };
            return now.toLocaleString('bn-BD', options);
        
        case '24h':
            return now.toLocaleString('en-GB', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }).replace(',', '');
        
        case '12h':
            return now.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        
        default:
            return now.toLocaleString();
    }
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