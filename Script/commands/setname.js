module.exports = {
    config: {
        name: "setname",
        version: "1.0",
        author: "RANA",
        role: 1,
        category: "group",
        shortDescription: {
            en: "Set nickname for user",
            bn: "ব্যবহারকারীর জন্য ডাকনাম সেট করুন"
        },
        longDescription: {
            en: "Set or change nickname for a user in the group",
            bn: "গ্রুপে একটি ব্যবহারকারীর জন্য ডাকনাম সেট বা পরিবর্তন করুন"
        },
        guide: {
            en: "{pn} @mention [nickname] or {pn} [userID] [nickname]",
            bn: "{pn} @উল্লেখ [ডাকনাম] অথবা {pn} [userID] [ডাকনাম]"
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
                    "❌ You need to be a group admin to set nicknames.",
                    threadID,
                    messageID
                );
            }
            
            // Get target user and nickname
            let targetID;
            let nickname;
            
            if (Object.keys(mentions).length > 0) {
                // Get first mentioned user
                targetID = Object.keys(mentions)[0];
                const mentionLength = mentions[targetID].length;
                
                // Extract nickname (everything after the mention)
                nickname = args.slice(mentionLength).join(" ");
            } else if (args.length >= 2 && /^\d+$/.test(args[0])) {
                // Get from arguments
                targetID = args[0];
                nickname = args.slice(1).join(" ");
            } else {
                return api.sendMessage(
                    "❌ Please mention a user or provide user ID and nickname.\n" +
                    "Example: .setname @user New Nickname\n" +
                    "Example: .setname 100000000000000 New Nickname",
                    threadID,
                    messageID
                );
            }
            
            if (!nickname || nickname.trim() === "") {
                return api.sendMessage(
                    "❌ Please provide a nickname.",
                    threadID,
                    messageID
                );
            }
            
            // Trim and validate nickname
            nickname = nickname.trim();
            
            if (nickname.length > 20) {
                return api.sendMessage(
                    "❌ Nickname is too long. Maximum 20 characters allowed.",
                    threadID,
                    messageID
                );
            }
            
            // Check if trying to set bot's nickname
            if (targetID === api.getCurrentUserID()) {
                return api.sendMessage(
                    "❌ You cannot set the bot's nickname.",
                    threadID,
                    messageID
                );
            }
            
            // Get target user info
            const userInfo = await api.getUserInfo(targetID);
            const targetName = userInfo[targetID] ? userInfo[targetID].name : "Unknown User";
            
            // Change nickname
            await api.changeNickname(nickname, threadID, targetID);
            
            // Send confirmation
            api.sendMessage(
                `✅ Nickname for "${targetName}" has been set to: "${nickname}"`,
                threadID,
                messageID
            );
            
        } catch (error) {
            console.error(error);
            api.sendMessage(
                "❌ Failed to set nickname.",
                event.threadID,
                event.messageID
            );
        }
    }
};