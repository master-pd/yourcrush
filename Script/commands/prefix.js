module.exports = {
    config: {
        name: "prefix",
        version: "2.0",
        author: "RANA",
        role: 1,
        category: "system",
        shortDescription: {
            en: "Change bot prefix",
            bn: "বট প্রিফিক্স পরিবর্তন করুন"
        },
        longDescription: {
            en: "Change the bot's prefix for this thread or globally",
            bn: "এই থ্রেড বা গ্লোবালি বটের প্রিফিক্স পরিবর্তন করুন"
        },
        guide: {
            en: "{pn} [new prefix] or {pn} reset",
            bn: "{pn} [নতুন প্রিফিক্স] অথবা {pn} reset"
        },
        cooldown: 5
    },

    onStart: async function({ api, event, args, config, database }) {
        try {
            const { threadID, messageID, senderID } = event;
            
            // Check permission
            if (!config.admins.includes(senderID)) {
                const threadInfo = await api.getThreadInfo(threadID);
                const isAdmin = threadInfo.adminIDs.some(admin => admin.id === senderID);
                
                if (!isAdmin) {
                    return api.sendMessage(
                        "❌ You need to be a group admin to change the prefix.",
                        threadID,
                        messageID
                    );
                }
            }
            
            if (args.length === 0) {
                return api.sendMessage(
                    `📝 Current prefix: "${config.prefix}"\n\n` +
                    `To change prefix:\n` +
                    `• ${config.prefix}prefix [new prefix] - Change for this group\n` +
                    `• ${config.prefix}prefix reset - Reset to default\n\n` +
                    `Example: ${config.prefix}prefix !`,
                    threadID,
                    messageID
                );
            }
            
            const action = args[0].toLowerCase();
            
            if (action === 'reset') {
                // Reset to default
                if (database && database.models) {
                    const Thread = database.models.Thread;
                    const thread = await Thread.findByPk(threadID);
                    
                    if (thread) {
                        thread.prefix = null;
                        await thread.save();
                        
                        return api.sendMessage(
                            `✅ Prefix reset to default: "${config.prefix}"`,
                            threadID,
                            messageID
                        );
                    }
                }
                
                return api.sendMessage(
                    `✅ Prefix reset to default: "${config.prefix}"`,
                    threadID,
                    messageID
                );
            }
            
            // Set new prefix
            const newPrefix = args[0];
            
            // Validate prefix
            if (newPrefix.length > 5) {
                return api.sendMessage(
                    "❌ Prefix must be 5 characters or less.",
                    threadID,
                    messageID
                );
            }
            
            if (newPrefix.includes(' ')) {
                return api.sendMessage(
                    "❌ Prefix cannot contain spaces.",
                    threadID,
                    messageID
                );
            }
            
            // Save to database
            if (database && database.models) {
                const Thread = database.models.Thread;
                let thread = await Thread.findByPk(threadID);
                
                if (!thread) {
                    thread = await Thread.create({
                        threadID: threadID,
                        name: `Thread_${threadID}`,
                        prefix: newPrefix
                    });
                } else {
                    thread.prefix = newPrefix;
                    await thread.save();
                }
                
                // Update thread data cache
                if (global.threadData) {
                    if (!global.threadData.has(threadID)) {
                        global.threadData.set(threadID, {});
                    }
                    const threadData = global.threadData.get(threadID);
                    threadData.prefix = newPrefix;
                }
            }
            
            // Send confirmation
            api.sendMessage(
                `✅ Prefix changed to: "${newPrefix}"\n\n` +
                `Now you can use commands like:\n` +
                `• ${newPrefix}help - Show help\n` +
                `• ${newPrefix}ping - Check status\n` +
                `• ${newPrefix}menu - Show commands\n\n` +
                `Note: Global prefix "${config.prefix}" still works as fallback.`,
                threadID,
                messageID
            );
            
            logger.system(`Prefix changed to "${newPrefix}" in thread ${threadID}`);
            
        } catch (error) {
            console.error(error);
            api.sendMessage(
                "❌ Failed to change prefix.",
                event.threadID,
                event.messageID
            );
        }
    }
};