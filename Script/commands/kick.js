module.exports = {
    config: {
        name: "kick",
        version: "1.0",
        author: "RANA",
        role: 1,
        category: "group",
        shortDescription: {
            en: "Kick user from group",
            bn: "ব্যবহারকারীকে গ্রুপ থেকে বের করুন"
        },
        longDescription: {
            en: "Remove a user from the current group",
            bn: "বর্তমান গ্রুপ থেকে একটি ব্যবহারকারী সরান"
        },
        guide: {
            en: "{pn} @mention or {pn} [userID]",
            bn: "{pn} @উল্লেখ অথবা {pn} [userID]"
        },
        cooldown: 5
    },

    onStart: async function({ api, event, args }) {
        try {
            const { threadID, messageID, senderID, mentions } = event;
            
            // Check if user is admin
            const threadInfo = await api.getThreadInfo(threadID);
            const isAdmin = threadInfo.adminIDs.some(admin => admin.id === senderID);
            
            if (!isAdmin) {
                return api.sendMessage(
                    "❌ You need to be a group admin to kick users.",
                    threadID,
                    messageID
                );
            }
            
            // Get target user
            let targetID;
            
            if (Object.keys(mentions).length > 0) {
                // Get first mentioned user
                targetID = Object.keys(mentions)[0];
            } else if (args[0] && /^\d+$/.test(args[0])) {
                // Get from argument
                targetID = args[0];
            } else {
                return api.sendMessage(
                    "❌ Please mention a user or provide their user ID.\n" +
                    "Example: .kick @user or .kick 100000000000000",
                    threadID,
                    messageID
                );
            }
            
            // Check if trying to kick self
            if (targetID === senderID) {
                return api.sendMessage(
                    "❌ You cannot kick yourself.",
                    threadID,
                    messageID
                );
            }
            
            // Check if trying to kick bot
            if (targetID === api.getCurrentUserID()) {
                return api.sendMessage(
                    "❌ You cannot kick the bot.",
                    threadID,
                    messageID
                );
            }
            
            // Check if target is admin
            const targetIsAdmin = threadInfo.adminIDs.some(admin => admin.id === targetID);
            if (targetIsAdmin) {
                return api.sendMessage(
                    "❌ You cannot kick a group admin.",
                    threadID,
                    messageID
                );
            }
            
            // Get target user info
            const userInfo = await api.getUserInfo(targetID);
            const targetName = userInfo[targetID] ? userInfo[targetID].name : "Unknown User";
            
            // Kick the user
            await api.removeUserFromGroup(targetID, threadID);
            
            // Send confirmation
            api.sendMessage(
                `✅ User "${targetName}" has been kicked from the group.`,
                threadID,
                messageID
            );
            
        } catch (error) {
            console.error(error);
            
            if (error.message.includes("not in group")) {
                api.sendMessage(
                    "❌ User is not in this group.",
                    event.threadID,
                    event.messageID
                );
            } else {
                api.sendMessage(
                    "❌ Failed to kick user.",
                    event.threadID,
                    event.messageID
                );
            }
        }
    }
};