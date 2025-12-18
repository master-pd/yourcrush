module.exports = {
    config: {
        name: "adduser",
        version: "1.0",
        author: "RANA",
        role: 1,
        category: "group",
        shortDescription: {
            en: "Add user to group",
            bn: "গ্রুপে ব্যবহারকারী যোগ করুন"
        },
        longDescription: {
            en: "Add a user to the current group by user ID",
            bn: "ব্যবহারকারী আইডি দ্বারা বর্তমান গ্রুপে একটি ব্যবহারকারী যোগ করুন"
        },
        guide: {
            en: "{pn} [userID]",
            bn: "{pn} [userID]"
        },
        cooldown: 10
    },

    onStart: async function({ api, event, args }) {
        try {
            const { threadID, messageID, senderID } = event;
            
            // Check if user is admin
            const threadInfo = await api.getThreadInfo(threadID);
            const isAdmin = threadInfo.adminIDs.some(admin => admin.id === senderID);
            
            if (!isAdmin) {
                return api.sendMessage(
                    "❌ You need to be a group admin to add users.",
                    threadID,
                    messageID
                );
            }
            
            if (!args.length) {
                return api.sendMessage(
                    "❌ Please provide a user ID to add.\n" +
                    "Example: .adduser 100000000000000",
                    threadID,
                    messageID
                );
            }
            
            const targetID = args[0];
            
            // Validate user ID
            if (!/^\d+$/.test(targetID)) {
                return api.sendMessage(
                    "❌ Invalid user ID. Please provide a numeric ID.",
                    threadID,
                    messageID
                );
            }
            
            // Check if trying to add self
            if (targetID === senderID) {
                return api.sendMessage(
                    "❌ You are already in the group.",
                    threadID,
                    messageID
                );
            }
            
            // Check if user is already in group
            const participants = threadInfo.participantIDs;
            if (participants.includes(targetID)) {
                return api.sendMessage(
                    "❌ User is already in this group.",
                    threadID,
                    messageID
                );
            }
            
            // Get user info
            const userInfo = await api.getUserInfo(targetID);
            const targetName = userInfo[targetID] ? userInfo[targetID].name : "Unknown User";
            
            // Add user to group
            await api.addUserToGroup(targetID, threadID);
            
            // Send confirmation
            api.sendMessage(
                `✅ User "${targetName}" has been added to the group.`,
                threadID,
                messageID
            );
            
        } catch (error) {
            console.error(error);
            
            if (error.message.includes("Cannot add yourself")) {
                api.sendMessage(
                    "❌ Cannot add yourself to the group.",
                    event.threadID,
                    event.messageID
                );
            } else if (error.message.includes("friendship")) {
                api.sendMessage(
                    "❌ Cannot add user. You need to be friends with them first.",
                    event.threadID,
                    event.messageID
                );
            } else {
                api.sendMessage(
                    "❌ Failed to add user. Make sure the user ID is correct.",
                    event.threadID,
                    event.messageID
                );
            }
        }
    }
};