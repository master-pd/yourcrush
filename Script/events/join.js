const fs = require("fs-extra");
const path = require("path");

module.exports = {
    config: {
        name: "join",
        version: "2.0.0",
        description: "Handle user join events",
        author: "RANA",
        category: "events"
    },

    onEvent: async function({ api, event }) {
        try {
            if (event.logMessageType === "log:subscribe") {
                const { threadID, logMessageData, author } = event;
                const addedParticipants = logMessageData.addedParticipants || [];
                
                if (addedParticipants.length === 0) return;
                
                // Get thread info
                const threadInfo = await api.getThreadInfo(threadID);
                const threadName = threadInfo.threadName || "Group";
                
                // Load join settings
                const settingsPath = path.join(__dirname, "../cache/join_settings.json");
                const settings = await fs.readJson(settingsPath).catch(() => ({}));
                const threadSettings = settings[threadID] || { 
                    welcome: true, 
                    welcomeMessage: "Welcome {name} to {group}! 👋",
                    autoApprove: false 
                };
                
                if (!threadSettings.welcome) return;
                
                for (const user of addedParticipants) {
                    const userID = user.userFbId;
                    
                    // Check if user added themselves or was added by someone
                    const addedBy = userID === author ? "themselves" : author;
                    
                    // Get user info
                    const userInfo = await api.getUserInfo(userID);
                    const userName = userInfo[userID]?.name || "New Member";
                    
                    // Prepare welcome message
                    let welcomeMsg = threadSettings.welcomeMessage
                        .replace(/{name}/g, userName)
                        .replace(/{group}/g, threadName)
                        .replace(/{adder}/g, addedBy)
                        .replace(/{count}/g, threadInfo.participantIDs.length);
                    
                    // Send welcome message
                    api.sendMessage(welcomeMsg, threadID);
                    
                    // Send welcome image/GIF if available
                    await this.sendWelcomeMedia(api, threadID, userID, userName);
                    
                    // Auto-approve if enabled
                    if (threadSettings.autoApprove) {
                        await this.autoApproveUser(userID, threadID);
                    }
                    
                    // Log join event
                    await this.logJoin({
                        threadID,
                        threadName,
                        userID,
                        userName,
                        addedBy,
                        timestamp: new Date().toISOString()
                    });
                }
            }
            
        } catch (error) {
            console.error("Join event error:", error);
        }
    },

    onMessage: async function({ api, event }) {
        const { threadID, senderID, body } = event;
        
        if (body && body.startsWith(global.config?.prefix || "!")) {
            const args = body.slice((global.config?.prefix || "!").length).trim().split(" ");
            const command = args.shift().toLowerCase();
            
            if (command === "welcome") {
                // Check if user is admin
                const threadInfo = await api.getThreadInfo(threadID);
                const isAdmin = threadInfo.adminIDs?.some(admin => admin.id === senderID);
                
                if (!isAdmin) {
                    api.sendMessage("❌ Admin only command.", threadID);
                    return;
                }
                
                const action = args[0];
                
                if (action === "on") {
                    const message = args.slice(1).join(" ") || "Welcome {name} to {group}! 👋";
                    await this.setWelcomeMessage(threadID, message);
                    
                    api.sendMessage(
                        `✅ Welcome message enabled!\n` +
                        `Message: ${message}`,
                        threadID
                    );
                    
                } else if (action === "off") {
                    await this.disableWelcome(threadID);
                    api.sendMessage("❌ Welcome message disabled.", threadID);
                    
                } else if (action === "test") {
                    // Test welcome message
                    const userInfo = await api.getUserInfo(senderID);
                    const userName = userInfo[senderID]?.name || "Test User";
                    
                    const testMsg = `🎉 **Test Welcome Message**\n\n` +
                                   `Welcome ${userName} to ${threadInfo.threadName}! 👋\n` +
                                   `We're glad to have you here!`;
                    
                    api.sendMessage(testMsg, threadID);
                    
                } else if (action === "autoapprove") {
                    const enable = args[1] === "on";
                    await this.setAutoApprove(threadID, enable);
                    
                    api.sendMessage(
                        `✅ Auto-approve ${enable ? "enabled" : "disabled"}.`,
                        threadID
                    );
                }
            }
        }
    },

    sendWelcomeMedia: async function(api, threadID, userID, userName) {
        try {
            const mediaPath = path.join(__dirname, "../cache/joinGif");
            
            // Check for welcome media files
            const files = await fs.readdir(mediaPath).catch(() => []);
            const mediaFiles = files.filter(file => 
                file.endsWith(".mp4") || file.endsWith(".gif") || file.endsWith(".jpg") || file.endsWith(".png")
            );
            
            if (mediaFiles.length > 0) {
                // Select random media file
                const randomFile = mediaFiles[Math.floor(Math.random() * mediaFiles.length)];
                const filePath = path.join(mediaPath, randomFile);
                
                // Send as attachment
                await api.sendMessage({
                    body: `🎉 Welcome ${userName}!`,
                    attachment: fs.createReadStream(filePath)
                }, threadID);
            }
        } catch (error) {
            console.error("Send welcome media error:", error);
        }
    },

    setWelcomeMessage: async function(threadID, message) {
        try {
            const settingsPath = path.join(__dirname, "../cache/join_settings.json");
            const settings = await fs.readJson(settingsPath).catch(() => ({}));
            
            settings[threadID] = {
                ...settings[threadID],
                welcome: true,
                welcomeMessage: message
            };
            
            await fs.writeJson(settingsPath, settings, { spaces: 2 });
            return true;
        } catch (error) {
            console.error("Set welcome message error:", error);
            return false;
        }
    },

    disableWelcome: async function(threadID) {
        try {
            const settingsPath = path.join(__dirname, "../cache/join_settings.json");
            const settings = await fs.readJson(settingsPath).catch(() => ({}));
            
            if (settings[threadID]) {
                settings[threadID].welcome = false;
                await fs.writeJson(settingsPath, settings, { spaces: 2 });
            }
            
            return true;
        } catch (error) {
            console.error("Disable welcome error:", error);
            return false;
        }
    },

    setAutoApprove: async function(threadID, enable) {
        try {
            const settingsPath = path.join(__dirname, "../cache/join_settings.json");
            const settings = await fs.readJson(settingsPath).catch(() => ({}));
            
            settings[threadID] = {
                ...settings[threadID],
                autoApprove: enable
            };
            
            await fs.writeJson(settingsPath, settings, { spaces: 2 });
            return true;
        } catch (error) {
            console.error("Set auto approve error:", error);
            return false;
        }
    },

    autoApproveUser: async function(userID, threadID) {
        try {
            const approvedPath = path.join(__dirname, "../cache/approved_users.json");
            const approved = await fs.readJson(approvedPath).catch(() => []);
            
            if (!approved.includes(userID)) {
                approved.push(userID);
                await fs.writeJson(approvedPath, approved, { spaces: 2 });
                
                console.log(`Auto-approved user: ${userID} for thread: ${threadID}`);
            }
        } catch (error) {
            console.error("Auto approve error:", error);
        }
    },

    logJoin: async function(data) {
        try {
            const logPath = path.join(__dirname, "../cache/join_logs.json");
            await fs.ensureFile(logPath);
            
            const existing = await fs.readJson(logPath).catch(() => []);
            existing.push(data);
            
            // Keep only last 100 logs
            if (existing.length > 100) {
                existing.splice(0, existing.length - 100);
            }
            
            await fs.writeJson(logPath, existing, { spaces: 2 });
        } catch (error) {
            console.error("Join log error:", error);
        }
    }
};