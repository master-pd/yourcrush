const fs = require("fs-extra");
const path = require("path");

module.exports = {
    config: {
        name: "joinNoti",
        version: "1.0.0",
        description: "Send notification when bot joins group",
        author: "RANA",
        category: "events"
    },

    onEvent: async function({ api, event }) {
        try {
            if (event.logMessageType === "log:subscribe") {
                const { threadID, logMessageData } = event;
                const addedParticipants = logMessageData.addedParticipants || [];
                
                // Check if bot was added
                const botID = api.getCurrentUserID();
                const botAdded = addedParticipants.some(user => user.userFbId === botID);
                
                if (botAdded) {
                    // Bot was added to group
                    const threadInfo = await api.getThreadInfo(threadID);
                    const threadName = threadInfo.threadName || "Unknown Group";
                    const adderID = event.author;
                    
                    // Get adder info
                    const adderInfo = await api.getUserInfo(adderID);
                    const adderName = adderInfo[adderID]?.name || "Someone";
                    
                    // Send join notification
                    const joinMsg = this.getJoinMessage(threadName, adderName);
                    await api.sendMessage(joinMsg, threadID);
                    
                    // Send to owner
                    await this.notifyOwner(api, threadID, threadName, adderName);
                    
                    // Log bot join
                    await this.logBotJoin({
                        threadID,
                        threadName,
                        adderID,
                        adderName,
                        participantCount: threadInfo.participantIDs.length,
                        timestamp: new Date().toISOString()
                    });
                    
                    // Create thread settings
                    await this.initializeThreadSettings(threadID);
                }
            }
            
        } catch (error) {
            console.error("Join notification error:", error);
        }
    },

    getJoinMessage: function(threadName, adderName) {
        const messages = [
            `🎉 **Thanks for adding me!**\n\n` +
            `Hello everyone! I'm **YOUR CRUSH BOT** 🤖\n` +
            `Added by: **${adderName}**\n` +
            `Group: **${threadName}**\n\n` +
            `📌 **My Features:**\n` +
            `• 300+ Commands\n` +
            `• AI Chat\n` +
            `• Games\n` +
            `• Economy System\n` +
            `• Image Editing\n\n` +
            `Type **!help** to see all commands\n` +
            `Type **!menu** for command categories\n\n` +
            `👑 **Owner:** RANA (MASTER 🪓)\n` +
            `📞 **Contact:** 01847634486`,
            
            `🤖 **YOUR CRUSH BOT has joined!**\n\n` +
            `Thanks **${adderName}** for adding me to **${threadName}**!\n\n` +
            `🔧 **Quick Start:**\n` +
            `• !help - Show commands\n` +
            `• !info - Bot information\n` +
            `• !ping - Check bot status\n\n` +
            `🎮 **Popular Commands:**\n` +
            `• !meme - Random memes\n` +
            `• !music - Play songs\n` +
            `• !game - Play games\n` +
            `• !ai - Ask AI\n\n` +
            `Need help? Contact my owner!`,
            
            `✨ **A new adventure begins!**\n\n` +
            `Hello **${threadName}**! 👋\n` +
            `I'm YOUR CRUSH BOT, ready to serve!\n\n` +
            `Added by: **${adderName}**\n` +
            `Bot Version: 2.0.0\n` +
            `Commands: 300+\n\n` +
            `💡 **Tip:** Use **!cmd** to see command list\n` +
            `📚 **Guide:** Use **!guide** for tutorials\n\n` +
            `Let's have fun together! 🎯`
        ];
        
        return messages[Math.floor(Math.random() * messages.length)];
    },

    notifyOwner: async function(api, threadID, threadName, adderName) {
        try {
            const owners = global.config?.ADMINS || [];
            const botName = "YOUR CRUSH BOT";
            
            for (const ownerID of owners) {
                try {
                    const notification = 
                        `👑 **Bot Added to Group**\n\n` +
                        `Bot: ${botName}\n` +
                        `Group: ${threadName}\n` +
                        `Added by: ${adderName}\n` +
                        `Thread ID: ${threadID}\n` +
                        `Time: ${new Date().toLocaleString()}\n\n` +
                        `Bot will now serve this group.`;
                    
                    await api.sendMessage(notification, ownerID);
                } catch (error) {
                    console.error("Failed to notify owner:", error);
                }
            }
        } catch (error) {
            console.error("Notify owner error:", error);
        }
    },

    initializeThreadSettings: async function(threadID) {
        try {
            const settingsPath = path.join(__dirname, "../cache/thread_settings.json");
            const settings = await fs.readJson(settingsPath).catch(() => ({}));
            
            if (!settings[threadID]) {
                settings[threadID] = {
                    welcome: true,
                    antijoin: false,
                    antispam: true,
                    nsfw: false,
                    economy: true,
                    joinedAt: new Date().toISOString()
                };
                
                await fs.writeJson(settingsPath, settings, { spaces: 2 });
                console.log(`Initialized settings for thread: ${threadID}`);
            }
        } catch (error) {
            console.error("Initialize settings error:", error);
        }
    },

    logBotJoin: async function(data) {
        try {
            const logPath = path.join(__dirname, "../cache/bot_join_logs.json");
            await fs.ensureFile(logPath);
            
            const existing = await fs.readJson(logPath).catch(() => []);
            existing.push(data);
            
            await fs.writeJson(logPath, existing, { spaces: 2 });
        } catch (error) {
            console.error("Bot join log error:", error);
        }
    }
};