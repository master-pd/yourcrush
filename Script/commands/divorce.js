module.exports = {
    config: {
        name: "divorce",
        version: "1.0",
        author: "RANA",
        role: 0,
        category: "fun",
        shortDescription: {
            en: "Divorce your spouse",
            bn: "আপনার জীবনসঙ্গীর সাথে বিবাহবিচ্ছেদ করুন"
        },
        longDescription: {
            en: "End your marriage with your current spouse",
            bn: "আপনার বর্তমান জীবনসঙ্গীর সাথে বিবাহবিচ্ছেদ করুন"
        },
        guide: {
            en: "{pn}",
            bn: "{pn}"
        },
        cooldown: 30
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
                    "❌ User not found.",
                    threadID,
                    messageID
                );
            }
            
            // Check if married
            if (!user.marriedTo) {
                return api.sendMessage(
                    "❌ You are not married.",
                    threadID,
                    messageID
                );
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
            
            // Get user names
            const userInfo = await api.getUserInfo([senderID, user.marriedTo]);
            const userName = userInfo[senderID] ? userInfo[senderID].name : user.name;
            const spouseName = userInfo[user.marriedTo] ? userInfo[user.marriedTo].name : spouse.name;
            
            // Calculate marriage duration
            const marriedSince = new Date(user.marriedSince);
            const now = new Date();
            const days = Math.floor((now - marriedSince) / (1000 * 60 * 60 * 24));
            
            // Divorce cost (50% of marriage cost)
            const divorceCost = 500;
            
            // Check if user can afford divorce
            if (user.money < divorceCost) {
                return api.sendMessage(
                    `❌ You need ${divorceCost} coins for divorce papers.\n` +
                    `Your balance: ${user.money} coins\n\n` +
                    `💔 Maybe it's a sign to work things out?`,
                    threadID,
                    messageID
                );
            }
            
            // Confirm divorce
            const confirmMessage = `
💔 **DIVORCE CONFIRMATION** 💔

Are you sure you want to divorce ${spouseName}?

📅 **Marriage Duration:** ${days} days
💰 **Divorce Cost:** ${divorceCost} coins
📝 **This action cannot be undone!**

Type "CONFIRM DIVORCE" to proceed with the divorce.
Type anything else to cancel.
            `;
            
            api.sendMessage(confirmMessage, threadID, async (err, info) => {
                if (err) return;
                
                // Wait for confirmation
                const confirmation = await waitForConfirmation(api, threadID, senderID, 30000); // 30 seconds
                
                if (confirmation === 'CONFIRM DIVORCE') {
                    // Process divorce
                    user.money -= divorceCost;
                    user.marriedTo = null;
                    user.marriedSince = null;
                    
                    spouse.marriedTo = null;
                    spouse.marriedSince = null;
                    
                    await user.save();
                    await spouse.save();
                    
                    // Send divorce announcement
                    const divorceMessage = `
📜 **DIVORCE FINALIZED** 📜

${userName} and ${spouseName} are now divorced.

⏳ **Marriage Duration:** ${days} days
💸 **Divorce Cost:** ${divorceCost} coins (paid by ${userName})
📅 **Divorce Date:** ${new Date().toLocaleDateString()}

😢 **Divorce Quote:**
"Sometimes good things fall apart so better things can fall together."

💔 We hope you both find happiness in your future paths.
                    `;
                    
                    api.sendMessage(divorceMessage, threadID, messageID);
                    
                    // Notify spouse
                    try {
                        api.sendMessage(
                            `💔 You have been divorced by ${userName}.\n\n` +
                            `Marriage duration: ${days} days\n` +
                            `We're sorry things didn't work out.`,
                            user.marriedTo
                        );
                    } catch (error) {
                        // Can't notify, but that's okay
                    }
                    
                } else {
                    api.sendMessage(
                        `❤️ **DIVORCE CANCELLED** ❤️\n\n` +
                        `Your marriage with ${spouseName} continues.\n` +
                        `Maybe give it another chance? 💕`,
                        threadID,
                        messageID
                    );
                }
            });
            
        } catch (error) {
            console.error(error);
            api.sendMessage(
                "❌ Divorce process failed.",
                event.threadID,
                event.messageID
            );
        }
    }
};

function waitForConfirmation(api, threadID, userID, timeout) {
    return new Promise((resolve) => {
        let resolved = false;
        
        // Set timeout
        const timer = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                resolve('TIMEOUT');
            }
        }, timeout);
        
        // Listen for confirmation
        const listener = (err, event) => {
            if (err || resolved) return;
            
            if (event.type === 'message' && 
                event.threadID === threadID && 
                event.senderID === userID) {
                
                const message = event.body.toUpperCase().trim();
                
                if (message === 'CONFIRM DIVORCE') {
                    resolved = true;
                    clearTimeout(timer);
                    api.removeListener('message', listener);
                    resolve('CONFIRM DIVORCE');
                } else if (message) {
                    resolved = true;
                    clearTimeout(timer);
                    api.removeListener('message', listener);
                    resolve('CANCELLED');
                }
            }
        };
        
        api.on('message', listener);
    });
}