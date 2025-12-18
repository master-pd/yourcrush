const fs = require("fs-extra");
const path = require("path");

module.exports = {
    config: {
        name: "antirobbery",
        version: "1.0.0",
        description: "Prevent robbery/spam in economy system",
        author: "RANA",
        category: "events"
    },

    onEvent: async function({ api, event }) {
        // This event is triggered by other events
    },

    onMessage: async function({ api, event }) {
        try {
            const { threadID, senderID, body } = event;
            
            if (!body) return;
            
            // Check for robbery/spam patterns
            const robberyPatterns = [
                /!rob\s+\d+/i,
                /!steal\s+\d+/i,
                /!take\s+\d+/i,
                /spam/i,
                /ফাক/i,
                /হ্যাক/i
            ];
            
            const isRobbery = robberyPatterns.some(pattern => pattern.test(body));
            
            if (isRobbery) {
                // Load user cooldown data
                const cooldownPath = path.join(__dirname, "../cache/robbery_cooldown.json");
                const cooldowns = await fs.readJson(cooldownPath).catch(() => ({}));
                
                const userKey = `${senderID}_${threadID}`;
                const now = Date.now();
                const lastRobbery = cooldowns[userKey] || 0;
                const cooldownTime = 5 * 60 * 1000; // 5 minutes
                
                if (now - lastRobbery < cooldownTime) {
                    // User is on cooldown
                    const remaining = Math.ceil((cooldownTime - (now - lastRobbery)) / 1000 / 60);
                    
                    api.sendMessage(
                        `⏰ **Cooldown Active**\n` +
                        `You can use robbery commands again in ${remaining} minutes.`,
                        threadID
                    );
                    
                    // Delete the message
                    setTimeout(() => {
                        api.unsendMessage(event.messageID);
                    }, 3000);
                    
                    return;
                }
                
                // Update cooldown
                cooldowns[userKey] = now;
                await fs.writeJson(cooldownPath, cooldowns, { spaces: 2 });
                
                // Check for excessive robbery
                const historyPath = path.join(__dirname, "../cache/robbery_history.json");
                const history = await fs.readJson(historyPath).catch(() => ({}));
                
                if (!history[senderID]) {
                    history[senderID] = [];
                }
                
                history[senderID].push({
                    timestamp: now,
                    threadID,
                    command: body
                });
                
                // Keep only last 10 entries
                if (history[senderID].length > 10) {
                    history[senderID] = history[senderID].slice(-10);
                }
                
                await fs.writeJson(historyPath, history, { spaces: 2 });
                
                // Check for spam (more than 5 robbery attempts in 10 minutes)
                const recentAttempts = history[senderID].filter(
                    entry => now - entry.timestamp < 10 * 60 * 1000
                );
                
                if (recentAttempts.length > 5) {
                    // User is spamming robbery commands
                    const warnMsg = `⚠️ **Robbery Spam Detected**\n\n` +
                                   `You have used robbery commands ${recentAttempts.length} times in 10 minutes.\n` +
                                   `Please slow down or you may be temporarily banned from economy commands.`;
                    
                    api.sendMessage(warnMsg, threadID);
                    
                    // Log for admin review
                    await logRobberySpam({
                        userID: senderID,
                        threadID,
                        attempts: recentAttempts.length,
                        timestamp: now
                    });
                }
            }
            
        } catch (error) {
            console.error("Anti-robbery error:", error);
        }
    }
};

async function logRobberySpam(data) {
    try {
        const logPath = path.join(__dirname, "../cache/robbery_spam_logs.json");
        await fs.ensureFile(logPath);
        
        const existing = await fs.readJson(logPath).catch(() => []);
        existing.push(data);
        
        await fs.writeJson(logPath, existing, { spaces: 2 });
    } catch (error) {
        console.error("Robbery spam log error:", error);
    }
}