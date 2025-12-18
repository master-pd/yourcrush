const fs = require("fs-extra");
const path = require("path");

module.exports = {
    config: {
        name: "antijoin",
        version: "2.0.0",
        description: "Prevent unauthorized users from joining group",
        author: "RANA",
        category: "events"
    },

    onEvent: async function({ api, event }) {
        try {
            if (event.logMessageType === "log:subscribe") {
                const { threadID, logMessageData } = event;
                const addedParticipants = logMessageData.addedParticipants || [];
                
                if (addedParticipants.length === 0) return;
                
                // Load approved users list
                const approvedPath = path.join(__dirname, "../cache/approved_users.json");
                const approvedUsers = await fs.readJson(approvedPath).catch(() => []);
                
                // Load thread settings
                const settingsPath = path.join(__dirname, "../cache/thread_settings.json");
                const settings = await fs.readJson(settingsPath).catch(() => ({}));
                const threadSettings = settings[threadID] || { antijoin: false };
                
                // Check if anti-join is enabled for this thread
                if (!threadSettings.antijoin) return;
                
                for (const user of addedParticipants) {
                    const userID = user.userFbId;
                    
                    // Check if user is approved or admin
                    const isApproved = approvedUsers.includes(userID);
                    const threadInfo = await api.getThreadInfo(threadID);
                    const isAdmin = threadInfo.adminIDs?.some(admin => admin.id === userID);
                    
                    if (!isApproved && !isAdmin) {
                        // Remove user from group
                        await api.removeUserFromGroup(userID, threadID);
                        
                        // Get user info for notification
                        const userInfo = await api.getUserInfo(userID);
                        const userName = userInfo[userID]?.name || "Unknown User";
                        
                        // Send notification
                        const message = `🚫 **Anti-Join Protection**\n\n` +
                                       `User **${userName}** (ID: ${userID}) was removed.\n` +
                                       `Reason: Not in approved users list.\n\n` +
                                       `To add to approved list, use: !approve ${userID}`;
                        
                        api.sendMessage(message, threadID);
                        
                        // Log removal
                        await logRemoval({
                            threadID,
                            threadName: threadInfo.threadName || "Unknown Group",
                            userID,
                            userName,
                            timestamp: new Date().toISOString(),
                            removedBy: "Anti-Join System"
                        });
                    }
                }
            }
            
        } catch (error) {
            console.error("Anti-join error:", error);
        }
    },

    onMessage: async function({ api, event }) {
        // Handle anti-join commands
        const { threadID, senderID, body } = event;
        
        if (body && body.startsWith(global.config?.prefix || "!")) {
            const args = body.slice((global.config?.prefix || "!").length).trim().split(" ");
            const command = args.shift().toLowerCase();
            
            if (command === "antijoin") {
                const action = args[0];
                
                // Check if user is admin
                const threadInfo = await api.getThreadInfo(threadID);
                const isAdmin = threadInfo.adminIDs?.some(admin => admin.id === senderID);
                
                if (!isAdmin) {
                    api.sendMessage("❌ You need to be admin to use this command.", threadID);
                    return;
                }
                
                const settingsPath = path.join(__dirname, "../cache/thread_settings.json");
                const settings = await fs.readJson(settingsPath).catch(() => ({}));
                
                if (action === "on") {
                    settings[threadID] = { ...settings[threadID], antijoin: true };
                    await fs.writeJson(settingsPath, settings, { spaces: 2 });
                    api.sendMessage("✅ Anti-join protection enabled for this group.", threadID);
                    
                } else if (action === "off") {
                    settings[threadID] = { ...settings[threadID], antijoin: false };
                    await fs.writeJson(settingsPath, settings, { spaces: 2 });
                    api.sendMessage("❌ Anti-join protection disabled for this group.", threadID);
                    
                } else if (action === "status") {
                    const isEnabled = settings[threadID]?.antijoin || false;
                    api.sendMessage(
                        `🔒 Anti-join status: ${isEnabled ? "Enabled" : "Disabled"}`,
                        threadID
                    );
                }
            }
        }
    }
};

async function logRemoval(data) {
    try {
        const logPath = path.join(__dirname, "../cache/antijoin_logs.json");
        await fs.ensureFile(logPath);
        
        const existing = await fs.readJson(logPath).catch(() => []);
        existing.push(data);
        
        await fs.writeJson(logPath, existing, { spaces: 2 });
    } catch (error) {
        console.error("Removal log error:", error);
    }
}