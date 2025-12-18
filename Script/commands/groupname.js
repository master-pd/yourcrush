module.exports = {
    config: {
        name: "groupname",
        version: "1.0",
        author: "RANA",
        role: 1,
        category: "group",
        shortDescription: {
            en: "Change group name",
            bn: "গ্রুপের নাম পরিবর্তন করুন"
        },
        longDescription: {
            en: "Change the name of the current group",
            bn: "বর্তমান গ্রুপের নাম পরিবর্তন করুন"
        },
        guide: {
            en: "{pn} [new name]",
            bn: "{pn} [নতুন নাম]"
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
                    "❌ You need to be a group admin to change the group name.",
                    threadID,
                    messageID
                );
            }
            
            if (!args.length) {
                return api.sendMessage(
                    `📝 Current group name: "${threadInfo.name}"\n\n` +
                    `To change group name:\n` +
                    `Example: .groupname New Group Name`,
                    threadID,
                    messageID
                );
            }
            
            const newName = args.join(" ");
            
            // Check name length
            if (newName.length > 100) {
                return api.sendMessage(
                    "❌ Group name is too long. Maximum 100 characters allowed.",
                    threadID,
                    messageID
                );
            }
            
            // Change group name
            await api.changeThreadName(newName, threadID);
            
            // Send confirmation
            api.sendMessage(
                `✅ Group name changed to: "${newName}"`,
                threadID,
                messageID
            );
            
        } catch (error) {
            console.error(error);
            api.sendMessage(
                "❌ Failed to change group name.",
                event.threadID,
                event.messageID
            );
        }
    }
};