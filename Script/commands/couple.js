module.exports = {
    config: {
        name: "couple",
        aliases: ["married", "marriage"],
        version: "2.0",
        author: "RANA",
        role: 0,
        category: "fun",
        shortDescription: {
            en: "View couple information",
            bn: "দম্পতির তথ্য দেখুন"
        },
        longDescription: {
            en: "View information about a married couple, including anniversary and relationship details",
            bn: "বিবাহিত দম্পতির তথ্য দেখুন, বার্ষিকী এবং সম্পর্কের বিবরণ সহ"
        },
        guide: {
            en: "{pn} or {pn} @mention",
            bn: "{pn} অথবা {pn} @উল্লেখ"
        },
        cooldown: 5
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
            
            // Determine target user
            let targetID = senderID;
            
            if (Object.keys(mentions).length > 0) {
                // Get first mentioned user
                targetID = Object.keys(mentions)[0];
            } else if (args[0] && /^\d+$/.test(args[0])) {
                // Get from argument
                targetID = args[0];
            }
            
            const User = database.models.User;
            const user = await User.findByPk(targetID);
            
            if (!user) {
                return api.sendMessage(
                    "❌ User not found.",
                    threadID,
                    messageID
                );
            }
            
            // Get user info
            const userInfo = await api.getUserInfo([targetID]);
            const userName = userInfo[targetID] ? userInfo[targetID].name : user.name;
            
            // Check if married
            if (!user.marriedTo) {
                if (targetID === senderID) {
                    return api.sendMessage(
                        `💔 You are not married.\n\n` +
                        `💍 To get married:\n` +
                        `1. Find someone special\n` +
                        `2. Use ${global.config.prefix}marry @user\n` +
                        `3. They need to accept with ${global.config.prefix}accept\n\n` +
                        `💰 Cost: 1000 coins`,
                        threadID,
                        messageID
                    );
                } else {
                    return api.sendMessage(
                        `💔 ${userName} is not married.`,
                        threadID,
                        messageID
                    );
                }
            }
            
            // Get spouse info
            const spouse = await User.findByPk(user.marriedTo);
            if (!spouse) {
                return api.sendMessage(
                    "❌ Spouse information not found.",
                    threadID,
                    messageID
                );
            }
            
            const spouseInfo = await api.getUserInfo([user.marriedTo]);
            const spouseName = spouseInfo[user.marriedTo] ? spouseInfo[user.marriedTo].name : spouse.name;
            
            // Calculate marriage duration
            const marriedSince = new Date(user.marriedSince);
            const now = new Date();
            const duration = now - marriedSince;
            
            const days = Math.floor(duration / (1000 * 60 * 60 * 24));
            const hours = Math.floor((duration % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
            
            // Calculate next anniversary
            const nextAnniversary = new Date(marriedSince);
            nextAnniversary.setFullYear(now.getFullYear());
            
            if (nextAnniversary < now) {
                nextAnniversary.setFullYear(now.getFullYear() + 1);
            }
            
            const daysToAnniversary = Math.ceil((nextAnniversary - now) / (1000 * 60 * 60 * 24));
            
            // Get relationship score (based on time together)
            let relationshipScore = Math.min(days * 10, 1000);
            
            // Add bonus for active users
            const userLastActive = new Date(user.lastActive || 0);
            const spouseLastActive = new Date(spouse.lastActive || 0);
            const daysSinceActive = Math.min(
                Math.floor((now - userLastActive) / (1000 * 60 * 60 * 24)),
                Math.floor((now - spouseLastActive) / (1000 * 60 * 60 * 24))
            );
            
            if (daysSinceActive < 7) {
                relationshipScore += 100;
            }
            
            // Determine relationship status
            let relationshipStatus = "Newlyweds";
            let statusEmoji = "💖";
            
            if (days > 365) {
                relationshipStatus = "Long-term Marriage";
                statusEmoji = "💑";
            } else if (days > 180) {
                relationshipStatus = "Strong Marriage";
                statusEmoji = "❤️";
            } else if (days > 90) {
                relationshipStatus = "Growing Strong";
                statusEmoji = "💕";
            } else if (days > 30) {
                relationshipStatus = "Honeymoon Phase";
                statusEmoji = "💝";
            }
            
            // Build couple message
            let message = `${statusEmoji} **COUPLE INFORMATION** ${statusEmoji}\n\n`;
            
            message += `👰 **Wife:** ${userName}\n`;
            message += `🤵 **Husband:** ${spouseName}\n\n`;
            
            message += `📅 **Marriage Date:** ${marriedSince.toLocaleDateString()}\n`;
            message += `⏰ **Marriage Time:** ${marriedSince.toLocaleTimeString()}\n\n`;
            
            message += `⏳ **Marriage Duration:**\n`;
            message += `• ${days} days, ${hours} hours, ${minutes} minutes\n\n`;
            
            message += `🎂 **Next Anniversary:**\n`;
            message += `• In ${daysToAnniversary} days\n`;
            message += `• Date: ${nextAnniversary.toLocaleDateString()}\n\n`;
            
            message += `💞 **Relationship Status:** ${relationshipStatus}\n`;
            message += `⭐ **Relationship Score:** ${relationshipScore}/1000\n\n`;
            
            // Add fun facts
            message += `✨ **Fun Facts:**\n`;
            
            if (days === 0) {
                message += `• Just married today! 🎉\n`;
            } else if (days === 1) {
                message += `• First day of marriage! 💕\n`;
            } else if (days === 7) {
                message += `• One week anniversary! 🎊\n`;
            } else if (days === 30) {
                message += `• One month anniversary! 🥳\n`;
            } else if (days === 100) {
                message += `• 100 days together! 💯\n`;
            }
            
            if (days >= 365) {
                const years = Math.floor(days / 365);
                message += `• ${years} year${years > 1 ? 's' : ''} of marriage! 🎂\n`;
            }
            
            message += `\n💝 **Love Quote:**\n`;
            message += `"A successful marriage requires falling in love many times, always with the same person."\n\n`;
            
            message += `📝 **Commands:**\n`;
            message += `• ${global.config.prefix}divorce - End marriage\n`;
            message += `• ${global.config.prefix}anniversary - View anniversary details\n`;
            
            if (targetID === senderID) {
                message += `• ${global.config.prefix}gift @spouse - Send gift to spouse\n`;
            }
            
            api.sendMessage(message, threadID, messageID);
            
        } catch (error) {
            console.error(error);
            api.sendMessage(
                "❌ Failed to retrieve couple information.",
                event.threadID,
                event.messageID
            );
        }
    }
};