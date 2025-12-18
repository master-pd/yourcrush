module.exports = {
    config: {
        name: "leavenoti",
        version: "1.0.0",
        description: "Send notification when bot leaves group",
        author: "RANA",
        category: "events"
    },

    onEvent: async function({ api, event }) {
        try {
            if (event.logMessageType === "log:unsubscribe") {
                const { threadID, logMessageData, author } = event;
                const leftParticipantFbId = logMessageData.leftParticipantFbId;
                const botID = api.getCurrentUserID();
                
                if (leftParticipantFbId === botID) {
                    // Bot was removed from group
                    const threadInfo = await api.getThreadInfo(threadID).catch(() => ({}));
                    const threadName = threadInfo.threadName || "Unknown Group";
                    
                    // Check if bot left voluntarily or was kicked
                    const wasKicked = author !== botID;
                    
                    if (wasKicked) {
                        // Bot was kicked - log and notify
                        await this.handleBotKicked(api, threadID, threadName, author);
                    } else {
                        // Bot left voluntarily
                        await this.handleBotLeft(api, threadID, threadName);
                    }
                }
            }
            
        } catch (error) {
            console.error("Leave notification error:", error);
        }
    },

    handleBotKicked: async function(api, threadID, threadName, kickerID) {
        try {
            // Get kicker info
            const kickerInfo = await api.getUserInfo(kickerID).catch(() => ({}));
            const kickerName = kickerInfo[kickerID]?.name || "Unknown User";
            
            // Log the kick
            console.log(`Bot was kicked from ${threadName} by ${kickerName}`);
            
            // Notify owner
            await this.notifyOwnerBotKicked(api, threadID, threadName, kickerName, kickerID);
            
            // Update thread settings
            await this.updateThreadStatus(threadID, "kicked");
            
        } catch (error) {
            console.error("Handle bot kicked error:", error);
        }
    },

    handleBotLeft: async function(api, threadID, threadName) {
        try {
            console.log(`Bot left group: ${threadName}`);
            
            // Notify owner
            await this.notifyOwnerBotLeft(api, threadID, threadName);
            
            // Update thread settings
            await this.updateThreadStatus(threadID, "left");
            
        } catch (error) {
            console.error("Handle bot left error:", error);
        }
    },

    notifyOwnerBotKicked: async function(api, threadID, threadName, kickerName, kickerID) {
        try {
            const owners = global.config?.ADMINS || [];
            
            for (const ownerID of owners) {
                try {
                    const message = 
                        `🚫 **Bot Kicked from Group**\n\n` +
                        `Group: ${threadName}\n` +
                        `Thread ID: ${threadID}\n` +
                        `Kicked by: ${kickerName}\n` +
                        `Kicker ID: ${kickerID}\n` +
                        `Time: ${new Date().toLocaleString()}\n\n` +
                        `The bot can be added back if needed.`;
                    
                    await api.sendMessage(message, ownerID);
                } catch (error) {
                    console.error("Failed to notify owner:", error);
                }
            }
        } catch (error) {
            console.error("Notify owner error:", error);
        }
    },

    notifyOwnerBotLeft: async function(api, threadID, threadName) {
        try {
            const owners = global.config?.ADMINS || [];
            
            for (const ownerID of owners) {
                try {
                    const message = 
                        `👋 **Bot Left Group**\n\n` +
                        `Group: ${threadName}\n` +
                        `Thread ID: ${threadID}\n` +
                        `Time: ${new Date().toLocaleString()}\n\n` +
                        `Bot left voluntarily or due to error.`;
                    
                    await api.sendMessage(message, ownerID);
                } catch (error) {
                    console.error("Failed to notify owner:", error);
                }
            }
        } catch (error) {
            console.error("Notify owner error:", error);
        }
    },

    updateThreadStatus: async function(threadID, status) {
        try {
            const fs = require("fs-extra");
            const path = require("path");
            
            const statusPath = path.join(__dirname, "../cache/thread_status.json");
            const statusData = await fs.readJson(statusPath).catch(() => ({}));
            
            statusData[threadID] = {
                status,
                updatedAt: new Date().toISOString()
            };
            
            await fs.writeJson(statusPath, statusData, { spaces: 2 });
            
        } catch (error) {
            console.error("Update thread status error:", error);
        }
    }
};