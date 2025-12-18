const fs = require("fs-extra");
const path = require("path");

module.exports = {
    config: {
        name: "adminupdate",
        version: "1.0.0",
        description: "Handle admin updates in threads",
        author: "RANA",
        category: "events"
    },

    onEvent: async function({ api, event }) {
        try {
            const { threadID, logMessageData } = event;
            
            if (event.logMessageType === "log:thread-admins") {
                const adminIDs = logMessageData.ADMIN_EVENT ? 
                    Object.keys(logMessageData.ADMIN_EVENT) : 
                    (logMessageData.ADMIN_IDS || []);
                
                if (adminIDs.length === 0) return;
                
                // Get thread info
                const threadInfo = await api.getThreadInfo(threadID);
                const threadName = threadInfo.threadName || "Group";
                
                // Get user info
                const userInfo = await api.getUserInfo(adminIDs);
                
                let message = `👑 **Admin Update in ${threadName}**\n\n`;
                
                if (logMessageData.EVENT_TYPE === "add_admin") {
                    const addedAdmin = userInfo[adminIDs[0]];
                    message += `✅ **${addedAdmin.name}** has been promoted to Admin`;
                    
                    // Send notification
                    api.sendMessage(message, threadID);
                    
                    // Log to file
                    const logData = {
                        timestamp: new Date().toISOString(),
                        threadID,
                        threadName,
                        event: "admin_add",
                        adminID: adminIDs[0],
                        adminName: addedAdmin.name,
                        addedBy: event.author || "unknown"
                    };
                    
                    await logEvent("admin_updates.json", logData);
                    
                } else if (logMessageData.EVENT_TYPE === "remove_admin") {
                    const removedAdmin = userInfo[adminIDs[0]];
                    message += `❌ **${removedAdmin.name}** has been removed from Admin`;
                    
                    api.sendMessage(message, threadID);
                    
                    const logData = {
                        timestamp: new Date().toISOString(),
                        threadID,
                        threadName,
                        event: "admin_remove",
                        adminID: adminIDs[0],
                        adminName: removedAdmin.name,
                        removedBy: event.author || "unknown"
                    };
                    
                    await logEvent("admin_updates.json", logData);
                }
            }
            
        } catch (error) {
            console.error("Admin update event error:", error);
        }
    },

    onMessage: async function({ api, event }) {
        // Optional: Handle admin-related commands
    }
};

async function logEvent(filename, data) {
    try {
        const logPath = path.join(__dirname, "../cache/events", filename);
        await fs.ensureFile(logPath);
        
        const existing = await fs.readJson(logPath).catch(() => []);
        existing.push(data);
        
        await fs.writeJson(logPath, existing, { spaces: 2 });
    } catch (error) {
        console.error("Log error:", error);
    }
}