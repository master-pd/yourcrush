const fs = require("fs-extra");
const path = require("path");

module.exports = {
    config: {
        name: "antibd",
        version: "1.0.0",
        description: "Anti-Bangladeshi spam and advertisement filter",
        author: "RANA",
        category: "events"
    },

    onEvent: async function({ api, event }) {
        try {
            const { threadID, senderID, body } = event;
            
            if (!body || senderID === api.getCurrentUserID()) return;
            
            // Spam keywords (Bangladeshi specific)
            const spamKeywords = [
                "বাইন্ডিং", "বিন্ডিং", "binding",
                "টাকা পাঠান", "টাকা দেন", "send money",
                "বিডি", "bd", "bikroy",
                "ডিসকাউন্ট", "discount", "অফার",
                "গ্রুপ জয়েন", "join group",
                "পেজ লাইক", "page like",
                "ফ্রি", "free", "ফ্রিতে",
                "পয়সা", "টাকা", "money",
                "বিক্রি", "sale", "বিক্রয়",
                "অর্ডার", "order"
            ];
            
            // Check for spam
            const lowerBody = body.toLowerCase();
            const isSpam = spamKeywords.some(keyword => 
                lowerBody.includes(keyword.toLowerCase())
            );
            
            if (isSpam) {
                // Get user info
                const userInfo = await api.getUserInfo(senderID);
                const userName = userInfo[senderID]?.name || "Unknown User";
                
                // Check if user is admin
                const threadInfo = await api.getThreadInfo(threadID);
                const isAdmin = threadInfo.adminIDs?.some(admin => admin.id === senderID);
                
                if (!isAdmin) {
                    // Warn user
                    const warningMsg = `⚠️ **Warning ${userName}**\n` +
                                      `Your message contains spam/advertisement content.\n` +
                                      `Please avoid promotional messages in this group.\n` +
                                      `Next violation may result in mute/ban.`;
                    
                    api.sendMessage(warningMsg, threadID);
                    
                    // Log spam
                    await logSpam({
                        threadID,
                        threadName: threadInfo.threadName || "Unknown Group",
                        userID: senderID,
                        userName,
                        message: body,
                        timestamp: new Date().toISOString()
                    });
                    
                    // Delete spam message
                    setTimeout(() => {
                        api.unsendMessage(event.messageID);
                    }, 3000);
                }
            }
            
        } catch (error) {
            console.error("Anti-BD error:", error);
        }
    },

    onMessage: async function({ api, event }) {
        // Additional spam detection
    }
};

async function logSpam(data) {
    try {
        const logPath = path.join(__dirname, "../cache/spam_logs.json");
        await fs.ensureFile(logPath);
        
        const existing = await fs.readJson(logPath).catch(() => []);
        existing.push(data);
        
        // Keep only last 100 logs
        if (existing.length > 100) {
            existing.splice(0, existing.length - 100);
        }
        
        await fs.writeJson(logPath, existing, { spaces: 2 });
    } catch (error) {
        console.error("Spam log error:", error);
    }
}