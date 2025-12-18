const fs = require('fs-extra');
const path = require('path');

module.exports = {
    config: {
        name: "antiout",
        version: "2.0",
        author: "RANA",
        countDown: 5,
        role: 1,
        shortDescription: {
            en: "Prevent users from leaving group",
            bn: "গ্রুপ ছেড়ে যাওয়া থেকে ব্যবহারকারীদের রোধ করুন"
        },
        longDescription: {
            en: "Automatically add back users who leave the group",
            bn: "যারা গ্রুপ ছেড়ে যায় তাদের স্বয়ংক্রিয়ভাবে আবার যোগ করুন"
        },
        category: "group",
        guide: {
            en: "{pn} [on/off/status]",
            bn: "{pn} [on/off/status]"
        }
    },

    onStart: async function ({ api, event, args, message, threadsData, getLang }) {
        const { threadID } = event;
        const action = args[0];

        const threadData = await threadsData.get(threadID);
        if (!threadData.antiOut) {
            threadData.antiOut = {
                enabled: false,
                exceptions: []
            };
            await threadsData.set(threadID, threadData);
        }

        try {
            switch (action) {
                case 'on':
                    threadData.antiOut.enabled = true;
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("enabled"));
                
                case 'off':
                    threadData.antiOut.enabled = false;
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("disabled"));
                
                case 'status':
                    const status = threadData.antiOut.enabled ? '✅ Enabled' : '❌ Disabled';
                    const exceptions = threadData.antiOut.exceptions?.length || 0;
                    
                    return message.reply(getLang("status", {
                        status: status,
                        exceptions: exceptions
                    }));
                
                case 'addexception':
                    const userToAdd = args[1];
                    if (!userToAdd) return message.reply(getLang("noUserID"));
                    
                    const uidToAdd = userToAdd.replace(/[@<>]/g, '');
                    
                    if (!threadData.antiOut.exceptions) threadData.antiOut.exceptions = [];
                    if (threadData.antiOut.exceptions.includes(uidToAdd)) {
                        return message.reply(getLang("alreadyException"));
                    }
                    
                    threadData.antiOut.exceptions.push(uidToAdd);
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("exceptionAdded", { uid: uidToAdd }));
                
                case 'removeexception':
                    const userToRemove = args[1];
                    if (!userToRemove) return message.reply(getLang("noUserID"));
                    
                    const uidToRemove = userToRemove.replace(/[@<>]/g, '');
                    
                    if (!threadData.antiOut.exceptions || !threadData.antiOut.exceptions.includes(uidToRemove)) {
                        return message.reply(getLang("notException"));
                    }
                    
                    threadData.antiOut.exceptions = threadData.antiOut.exceptions.filter(id => id !== uidToRemove);
                    await threadsData.set(threadID, threadData);
                    return message.reply(getLang("exceptionRemoved", { uid: uidToRemove }));
                
                case 'listexceptions':
                    if (!threadData.antiOut.exceptions || threadData.antiOut.exceptions.length === 0) {
                        return message.reply(getLang("noExceptions"));
                    }
                    
                    let listMessage = "📋 Anti-Out Exceptions:\n\n";
                    threadData.antiOut.exceptions.forEach((uid, index) => {
                        listMessage += `${index + 1}. ${uid}\n`;
                    });
                    
                    return message.reply(listMessage);
                
                default:
                    return message.reply(getLang("invalidSyntax"));
            }
        } catch (error) {
            return message.reply(getLang("error", { error: error.message }));
        }
    },

    onEvent: async function ({ api, event, threadsData }) {
        if (event.logMessageType === 'log:unsubscribe') {
            const { threadID, logMessageData } = event;
            
            const threadData = await threadsData.get(threadID);
            
            if (!threadData.antiOut?.enabled) return;
            
            const leftParticipant = logMessageData.leftParticipantFbId;
            
            if (threadData.antiOut.exceptions?.includes(leftParticipant)) {
                return;
            }
            
            try {
                await api.addUserToGroup(leftParticipant, threadID);
                
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const userInfo = await api.getUserInfo(leftParticipant);
                const userName = userInfo[leftParticipant]?.name || leftParticipant;
                
                await api.sendMessage(
                    `🔁 User ${userName} (${leftParticipant}) was automatically added back by anti-out system.`,
                    threadID
                );
                
            } catch (error) {
                console.error('Anti-out add back failed:', error);
                
                if (error.message.includes("Can't add")) {
                    await api.sendMessage(
                        `❌ Could not add back user ${leftParticipant}. Privacy settings may prevent adding.`,
                        threadID
                    );
                }
            }
        }
    },

    langs: {
        en: {
            enabled: "✅ Anti-out system enabled",
            disabled: "❌ Anti-out system disabled",
            status: "📊 Anti-Out Status:\n\nStatus: {status}\nExceptions: {exceptions} users",
            noUserID: "❌ Please provide user ID",
            alreadyException: "✅ This user is already in exception list",
            exceptionAdded: "✅ User {uid} added to exception list",
            notException: "❌ This user is not in exception list",
            exceptionRemoved: "✅ User {uid} removed from exception list",
            noExceptions: "📭 No exceptions in the list",
            invalidSyntax: "❌ Usage: {pn} [on/off/status/addexception/removeexception/listexceptions]",
            error: "❌ Error: {error}"
        },
        bn: {
            enabled: "✅ অ্যান্টি-আউট সিস্টেম সক্রিয় করা হয়েছে",
            disabled: "❌ অ্যান্টি-আউট সিস্টেম নিষ্ক্রিয় করা হয়েছে",
            status: "📊 অ্যান্টি-আউট অবস্থা:\n\nঅবস্থা: {status}\nব্যতিক্রম: {exceptions} ব্যবহারকারী",
            noUserID: "❌ দয়া করে ইউজার আইডি দিন",
            alreadyException: "✅ এই ব্যবহারকারী ইতিমধ্যেই ব্যতিক্রম তালিকায় আছে",
            exceptionAdded: "✅ ইউজার {uid} ব্যতিক্রম তালিকায় যোগ করা হয়েছে",
            notException: "❌ এই ব্যবহারকারী ব্যতিক্রম তালিকায় নেই",
            exceptionRemoved: "✅ ইউজার {uid} ব্যতিক্রম তালিকা থেকে সরানো হয়েছে",
            noExceptions: "📭 তালিকায় কোন ব্যতিক্রম নেই",
            invalidSyntax: "❌ ব্যবহার: {pn} [on/off/status/addexception/removeexception/listexceptions]",
            error: "❌ ত্রুটি: {error}"
        }
    }
};