module.exports = {
    config: {
        name: "accept",
        version: "1.0",
        author: "RANA",
        role: 0,
        category: "fun",
        shortDescription: {
            en: "Accept marriage proposal",
            bn: "বিবাহের প্রস্তাব গ্রহণ করুন"
        },
        longDescription: {
            en: "Accept a marriage proposal from another user",
            bn: "অন্য ব্যবহারকারীর কাছ থেকে বিবাহের প্রস্তাব গ্রহণ করুন"
        },
        guide: {
            en: "{pn} [userID]",
            bn: "{pn} [userID]"
        },
        cooldown: 5
    },

    onStart: async function({ api, event, args, database }) {
        try {
            const { threadID, messageID, senderID } = event;
            
            if (!database || !database.models) {
                return api.sendMessage(
                    "❌ Database is not available. Please try again later.",
                    threadID,
                    messageID
                );
            }
            
            if (args.length === 0) {
                return api.sendMessage(
                    "❌ Please specify the user ID of the person who proposed.\n" +
                    "Example: .accept 61578706761898",
                    threadID,
                    messageID
                );
            }
            
            const proposerID = args[0];
            
            // Check if proposal exists
            if (!global.marriageProposals || !global.marriageProposals[senderID]) {
                return api.sendMessage(
                    "❌ No marriage proposal found or proposal has expired.",
                    threadID,
                    messageID
                );
            }
            
            const proposal = global.marriageProposals[senderID];
            
            // Check if proposal is for correct proposer
            if (proposal.from !== proposerID) {
                return api.sendMessage(
                    "❌ This proposal is not from the specified user.",
                    threadID,
                    messageID
                );
            }
            
            // Check if proposal expired
            if (Date.now() > proposal.expires) {
                delete global.marriageProposals[senderID];
                return api.sendMessage(
                    "❌ This marriage proposal has expired.",
                    threadID,
                    messageID
                );
            }
            
            const User = database.models.User;
            const proposer = await User.findByPk(proposerID);
            const accepter = await User.findByPk(senderID);
            
            if (!proposer || !accepter) {
                return api.sendMessage(
                    "❌ User not found.",
                    threadID,
                    messageID
                );
            }
            
            // Get user names
            const userInfo = await api.getUserInfo([proposerID, senderID]);
            const proposerName = userInfo[proposerID] ? userInfo[proposerID].name : proposer.name;
            const accepterName = userInfo[senderID] ? userInfo[senderID].name : accepter.name;
            
            // Check marriage status again
            if (proposer.marriedTo || accepter.marriedTo) {
                delete global.marriageProposals[senderID];
                return api.sendMessage(
                    "❌ One of you is already married.",
                    threadID,
                    messageID
                );
            }
            
            // Check if proposer still has enough money
            const marriageCost = 1000;
            if (proposer.money < marriageCost) {
                delete global.marriageProposals[senderID];
                return api.sendMessage(
                    `❌ ${proposerName} no longer has enough coins for marriage.\n` +
                    `Required: ${marriageCost} coins\n` +
                    `Available: ${proposer.money} coins`,
                    threadID,
                    messageID
                );
            }
            
            // Process marriage
            proposer.money -= marriageCost;
            proposer.marriedTo = senderID;
            proposer.marriedSince = new Date();
            
            accepter.marriedTo = proposerID;
            accepter.marriedSince = new Date();
            
            await proposer.save();
            await accepter.save();
            
            // Remove proposal
            delete global.marriageProposals[senderID];
            
            // Send marriage announcement
            const marriageDate = new Date().toLocaleDateString();
            const marriageTime = new Date().toLocaleTimeString();
            
            const message = `
🎉 **CONGRATULATIONS!** 🎉

💒 **NEWLYWEDS:**
👰 ${accepterName}
🤵 ${proposerName}

📅 **Marriage Date:** ${marriageDate}
⏰ **Marriage Time:** ${marriageTime}
💰 **Marriage Fee:** ${marriageCost} coins (paid by ${proposerName})

❤️ **Wedding Vows:**
"To have and to hold, from this day forward,
for better, for worse, for richer, for poorer,
in sickness and in health, to love and to cherish,
till death do us part."

🎊 **Congratulations to the happy couple!** 🎊

📝 **Marriage Commands:**
• ${global.config.prefix}couple - View couple information
• ${global.config.prefix}divorce - End the marriage
• ${global.config.prefix}anniversary - View anniversary
            `;
            
            api.sendMessage(message, threadID, messageID);
            
            // Send private congratulations
            try {
                api.sendMessage(
                    `💝 Congratulations on your marriage to ${accepterName}! 💝\n\n` +
                    `Your new balance: ${proposer.money} coins\n` +
                    `Use ${global.config.prefix}couple to view your marriage details.`,
                    proposerID
                );
                
                api.sendMessage(
                    `💝 Congratulations on your marriage to ${proposerName}! 💝\n\n` +
                    `Use ${global.config.prefix}couple to view your marriage details.`,
                    senderID
                );
            } catch (error) {
                // Can't send PM, but that's okay
            }
            
        } catch (error) {
            console.error(error);
            api.sendMessage(
                "❌ Failed to accept proposal.",
                event.threadID,
                event.messageID
            );
        }
    }
};