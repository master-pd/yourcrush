module.exports = {
    config: {
        name: "balance",
        aliases: ["bal", "money", "coins"],
        version: "2.0",
        author: "RANA",
        role: 0,
        category: "economy",
        shortDescription: {
            en: "Check your balance",
            bn: "আপনার ব্যালেন্স চেক করুন"
        },
        longDescription: {
            en: "Check your current coins balance, bank balance, and economy statistics",
            bn: "আপনার বর্তমান কয়েন ব্যালেন্স, ব্যাংক ব্যালেন্স এবং অর্থনীতি পরিসংখ্যান চেক করুন"
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
            let user = await User.findByPk(targetID);
            
            if (!user) {
                // Create user if doesn't exist
                const userInfo = await api.getUserInfo(targetID);
                const userName = userInfo[targetID] ? userInfo[targetID].name : `User_${targetID}`;
                
                user = await User.create({
                    userID: targetID,
                    name: userName,
                    exp: 0,
                    level: 1,
                    money: 0,
                    bank: 0
                });
            }
            
            // Get user info for name
            let userName = user.name;
            try {
                const userInfo = await api.getUserInfo(targetID);
                if (userInfo[targetID]) {
                    userName = userInfo[targetID].name;
                    
                    // Update name in database if different
                    if (user.name !== userName) {
                        user.name = userName;
                        await user.save();
                    }
                }
            } catch (error) {
                // Use stored name
            }
            
            // Calculate rank if checking self
            let rank = "N/A";
            let totalUsers = 0;
            
            if (targetID === senderID) {
                try {
                    // Get all users sorted by money
                    const allUsers = await User.findAll({
                        order: [['money', 'DESC']]
                    });
                    
                    totalUsers = allUsers.length;
                    const userIndex = allUsers.findIndex(u => u.userID === targetID);
                    
                    if (userIndex !== -1) {
                        rank = `#${userIndex + 1}`;
                    }
                } catch (error) {
                    console.error('Rank calculation error:', error);
                }
            }
            
            // Calculate next level requirements
            const currentLevel = user.level;
            const expForCurrentLevel = (currentLevel - 1) * 100;
            const expForNextLevel = currentLevel * 100;
            const expProgress = user.exp - expForCurrentLevel;
            const expNeeded = expForNextLevel - user.exp;
            
            // Create progress bar
            const progressBarLength = 20;
            const progress = Math.min(Math.floor((expProgress / (expForNextLevel - expForCurrentLevel)) * progressBarLength), progressBarLength);
            const progressBar = '█'.repeat(progress) + '░'.repeat(progressBarLength - progress);
            
            // Check daily status
            let dailyStatus = "✅ Available";
            if (user.lastDaily) {
                const lastDaily = new Date(user.lastDaily);
                const now = new Date();
                
                if (lastDaily.getDate() === now.getDate() && 
                    lastDaily.getMonth() === now.getMonth() && 
                    lastDaily.getFullYear() === now.getFullYear()) {
                    
                    const nextDaily = new Date(lastDaily);
                    nextDaily.setDate(nextDaily.getDate() + 1);
                    nextDaily.setHours(0, 0, 0, 0);
                    
                    const timeLeft = nextDaily - now;
                    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
                    const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                    
                    dailyStatus = `⏰ ${hoursLeft}h ${minutesLeft}m`;
                }
            }
            
            // Build balance message
            let message = `💰 **${userName}'s BALANCE** 💰\n\n`;
            
            if (targetID !== senderID) {
                message += `👤 **Viewing:** ${userName}'s balance\n\n`;
            }
            
            message += `📊 **ECONOMY STATS**\n`;
            message += `• Cash: ${formatNumber(user.money)} coins\n`;
            message += `• Bank: ${formatNumber(user.bank)} coins\n`;
            message += `• Total: ${formatNumber(user.money + user.bank)} coins\n`;
            
            if (targetID === senderID) {
                message += `• Rank: ${rank} / ${totalUsers}\n`;
            }
            
            message += `\n📈 **LEVEL & EXPERIENCE**\n`;
            message += `• Level: ${user.level}\n`;
            message += `• Experience: ${user.exp}/${expForNextLevel}\n`;
            message += `• Progress: [${progressBar}] ${expProgress}/${expForNextLevel - expForCurrentLevel}\n`;
            message += `• Needed for next level: ${expNeeded} XP\n`;
            
            message += `\n🎯 **DAILY REWARD**\n`;
            message += `• Status: ${dailyStatus}\n`;
            message += `• Streak: ${user.dailyStreak} days\n`;
            message += `• Next Reward: ${100 + (user.dailyStreak * 50)} coins\n`;
            
            message += `\n📅 **LAST ACTIVE:** ${user.lastActive ? formatDate(user.lastActive) : 'Never'}\n`;
            message += `📝 **BIO:** ${user.bio || 'No bio set'}\n`;
            message += `🏷️ **TITLE:** ${user.title || 'Newbie'}\n`;
            
            if (targetID === senderID) {
                message += `\n💡 **Tips:**\n`;
                message += `• Use ${global.config.prefix}daily - Claim daily reward\n`;
                message += `• Use ${global.config.prefix}work - Earn coins\n`;
                message += `• Use ${global.config.prefix}deposit - Save coins in bank\n`;
                message += `• Use ${global.config.prefix}withdraw - Take coins from bank\n`;
            }
            
            api.sendMessage(message, threadID, messageID);
            
        } catch (error) {
            console.error(error);
            api.sendMessage(
                "❌ Failed to check balance.",
                event.threadID,
                event.messageID
            );
        }
    }
};

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatDate(date) {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    
    if (diff < 60000) { // Less than 1 minute
        return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
        const minutes = Math.floor(diff / 60000);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diff < 86400000) { // Less than 1 day
        const hours = Math.floor(diff / 3600000);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diff < 604800000) { // Less than 1 week
        const days = Math.floor(diff / 86400000);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
        return d.toLocaleDateString();
    }
}