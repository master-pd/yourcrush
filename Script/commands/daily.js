module.exports = {
    config: {
        name: "daily",
        version: "2.0",
        author: "RANA",
        role: 0,
        category: "economy",
        shortDescription: {
            en: "Claim daily reward",
            bn: "দৈনিক পুরস্কার দাবি করুন"
        },
        longDescription: {
            en: "Claim your daily coins reward. Streak increases reward amount.",
            bn: "আপনার দৈনিক কয়েন পুরস্কার দাবি করুন। স্ট্রীক পুরস্কারের পরিমাণ বৃদ্ধি করে।"
        },
        guide: {
            en: "{pn}",
            bn: "{pn}"
        },
        cooldown: 5
    },

    onStart: async function({ api, event, database }) {
        try {
            const { threadID, messageID, senderID } = event;
            
            if (!database || !database.models) {
                return api.sendMessage(
                    "❌ Database is not available. Please try again later.",
                    threadID,
                    messageID
                );
            }
            
            const User = database.models.User;
            const user = await User.findByPk(senderID);
            
            if (!user) {
                return api.sendMessage(
                    "❌ User not found in database.",
                    threadID,
                    messageID
                );
            }
            
            // Check if can claim daily
            const dailyResult = user.useDaily();
            
            if (!dailyResult.success) {
                // Calculate time until next daily
                const lastDaily = new Date(user.lastDaily);
                const now = new Date();
                const nextDaily = new Date(lastDaily);
                nextDaily.setDate(nextDaily.getDate() + 1);
                nextDaily.setHours(0, 0, 0, 0);
                
                const timeLeft = nextDaily - now;
                const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
                const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                
                return api.sendMessage(
                    `❌ You have already claimed your daily reward today!\n\n` +
                    `📊 Current Streak: ${dailyResult.streak} days\n` +
                    `⏰ Next Daily: ${hoursLeft}h ${minutesLeft}m\n` +
                    `💎 Come back tomorrow for more coins!`,
                    threadID,
                    messageID
                );
            }
            
            // Calculate reward
            const baseReward = 100;
            const streakBonus = dailyResult.streak * 50;
            const totalReward = baseReward + streakBonus;
            
            // Add coins to user
            user.addMoney(totalReward);
            await user.save();
            
            // Send success message
            const message = `
🎉 **DAILY REWARD CLAIMED!** 🎉

💰 **Reward Details:**
• Base Reward: ${baseReward} coins
• Streak Bonus: ${streakBonus} coins (${dailyResult.streak} days)
• **Total:** ${totalReward} coins

📊 **Your Stats:**
• Current Streak: ${dailyResult.streak} days
• Total Coins: ${user.money} coins
• Level: ${user.level}
• Experience: ${user.exp}/${user.level * 100}

🔥 **Keep your streak going!** Claim again tomorrow for even more coins!

💡 **Tip:** Use ${global.config.prefix}work to earn more coins!
            `;
            
            api.sendMessage(message, threadID, messageID);
            
        } catch (error) {
            console.error(error);
            api.sendMessage(
                "❌ Failed to claim daily reward.",
                event.threadID,
                event.messageID
            );
        }
    }
};