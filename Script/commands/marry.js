module.exports = {
    config: {
        name: "marry",
        version: "2.0",
        author: "RANA",
        role: 0,
        category: "fun",
        shortDescription: {
            en: "Marry another user",
            bn: "অন্য ব্যবহারকারীকে বিয়ে করুন"
        },
        longDescription: {
            en: "Propose marriage to another user and become virtual spouses",
            bn: "অন্য ব্যবহারকারীকে বিবাহের প্রস্তাব দিন এবং ভার্চুয়াল জীবনসঙ্গী হয়ে উঠুন"
        },
        guide: {
            en: "{pn} @mention or {pn} [userID]",
            bn: "{pn} @উল্লেখ অথবা {pn} [userID]"
        },
        cooldown: 30
    },

    onStart: async function({ api, event, args, database }) {
        try {
            const { threadID, messageID, senderID, mentions } = event;
            
            if (!database || !database.models) {
                return api.sendMessage(
                    "❌ Database is not available. Please try again later.",
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
                return showMarryHelp(api, threadID, messageID);
            }
            
            // Check if trying to marry self
            if (targetID === senderID) {
                return api.sendMessage(
                    "❌ You cannot marry yourself.",
                    threadID,
                    messageID
                );
            }
            
            // Check if trying to marry bot
            if (targetID === api.getCurrentUserID()) {
                return api.sendMessage(
                    "❌ You cannot marry the bot.",
                    threadID,
                    messageID
                );
            }
            
            const User = database.models.User;
            const proposer = await User.findByPk(senderID);
            const target = await User.findByPk(targetID);
            
            if (!proposer || !target) {
                return api.sendMessage(
                    "❌ User not found. Please try another command first.",
                    threadID,
                    messageID
                );
            }
            
            // Get user names
            const userInfo = await api.getUserInfo([senderID, targetID]);
            const proposerName = userInfo[senderID] ? userInfo[senderID].name : proposer.name;
            const targetName = userInfo[targetID] ? userInfo[targetID].name : target.name;
            
            // Check if already married
            if (proposer.marriedTo) {
                return api.sendMessage(
                    `❌ You are already married to ${proposer.marriedTo === targetID ? targetName : 'someone else'}!`,
                    threadID,
                    messageID
                );
            }
            
            if (target.marriedTo) {
                return api.sendMessage(
                    `❌ ${targetName} is already married!`,
                    threadID,
                    messageID
                );
            }
            
            // Check marriage cost
            const marriageCost = 1000;
            if (proposer.money < marriageCost) {
                return api.sendMessage(
                    `❌ You need ${marriageCost} coins to propose marriage.\n` +
                    `Your balance: ${proposer.money} coins\n\n` +
                    `💡 Earn coins with ${global.config.prefix}work`,
                    threadID,
                    messageID
                );
            }
            
            // Create marriage proposal
            const proposal = {
                from: senderID,
                to: targetID,
                timestamp: Date.now(),
                expires: Date.now() + (5 * 60 * 1000) // 5 minutes
            };
            
            // Store proposal (in real implementation, you'd use database)
            global.marriageProposals = global.marriageProposals || {};
            global.marriageProposals[targetID] = proposal;
            
            // Send proposal
            const proposalMessage = `
💍 **MARRIAGE PROPOSAL** 💍

${proposerName} has proposed to ${targetName}!

💰 **Marriage Cost:** ${marriageCost} coins
⏰ **Proposal Expires:** 5 minutes

❤️ **To Accept:** Type ${global.config.prefix}accept ${senderID}
💔 **To Reject:** Type ${global.config.prefix}reject ${senderID}

📝 **Note:** Marriage costs will be deducted from ${proposerName}'s account.
            `;
            
            api.sendMessage(proposalMessage, threadID, messageID);
            
            // Also send notification to target in PM if possible
            try {
                api.sendMessage(
                    `💍 You received a marriage proposal from ${proposerName}!\n\n` +
                    `Type "${global.config.prefix}accept ${senderID}" to accept or\n` +
                    `"${global.config.prefix}reject ${senderID}" to reject.\n\n` +
                    `Proposal expires in 5 minutes.`,
                    targetID
                );
            } catch (error) {
                // Can't send PM, but that's okay
            }
            
        } catch (error) {
            console.error(error);
            api.sendMessage(
                "❌ Marriage proposal failed.",
                event.threadID,
                event.messageID
            );
        }
    }
};

function showMarryHelp(api, threadID, messageID) {
    const message = `
💍 **MARRIAGE SYSTEM** 💍

❤️ **How to Propose:**
• ${global.config.prefix}marry @mention - Propose to mentioned user
• ${global.config.prefix}marry [userID] - Propose to user by ID

💰 **Requirements:**
• 1000 coins (marriage fee)
• Both users must be unmarried
• Target must accept within 5 minutes

💒 **Marriage Benefits:**
• Special couple status
• Shared benefits (coming soon)
• Marriage certificate
• Anniversary celebrations

📝 **Commands:**
• ${global.config.prefix}marry - Propose marriage
• ${global.config.prefix}accept - Accept proposal
• ${global.config.prefix}reject - Reject proposal
• ${global.config.prefix}divorce - End marriage
• ${global.config.prefix}couple - View couple info

💡 **Tip:** Save up coins before proposing!
    `;
    
    api.sendMessage(message, threadID, messageID);
}