const fs = require("fs-extra");
const path = require("path");
const cron = require("node-cron");

module.exports = {
    config: {
        name: "autosent",
        version: "2.0.0",
        description: "Auto send messages at scheduled times",
        author: "RANA",
        category: "events"
    },

    onLoad: function({ api }) {
        // Schedule auto messages
        this.scheduleAutoMessages(api);
    },

    onEvent: async function({ api, event }) {
        // Handle auto-sent related events
    },

    onMessage: async function({ api, event }) {
        const { threadID, senderID, body } = event;
        
        if (body && body.startsWith(global.config?.prefix || "!")) {
            const args = body.slice((global.config?.prefix || "!").length).trim().split(" ");
            const command = args.shift().toLowerCase();
            
            if (command === "autosent") {
                // Check if user is admin
                const threadInfo = await api.getThreadInfo(threadID);
                const isAdmin = threadInfo.adminIDs?.some(admin => admin.id === senderID);
                
                if (!isAdmin) {
                    api.sendMessage("❌ Admin only command.", threadID);
                    return;
                }
                
                const action = args[0];
                
                if (action === "add") {
                    const time = args[1];
                    const message = args.slice(2).join(" ");
                    
                    if (!time || !message) {
                        api.sendMessage(
                            "Usage: !autosent add HH:mm \"Your message here\"",
                            threadID
                        );
                        return;
                    }
                    
                    // Add auto message
                    await this.addAutoMessage(threadID, time, message);
                    
                    api.sendMessage(
                        `✅ Auto message added:\n` +
                        `Time: ${time}\n` +
                        `Message: ${message}`,
                        threadID
                    );
                    
                } else if (action === "list") {
                    const messages = await this.getAutoMessages(threadID);
                    
                    if (messages.length === 0) {
                        api.sendMessage("No auto messages scheduled for this group.", threadID);
                        return;
                    }
                    
                    let listMsg = "📅 **Scheduled Auto Messages**\n\n";
                    messages.forEach((msg, index) => {
                        listMsg += `${index + 1}. ${msg.time} - ${msg.message}\n`;
                    });
                    
                    api.sendMessage(listMsg, threadID);
                    
                } else if (action === "remove") {
                    const index = parseInt(args[1]) - 1;
                    
                    if (isNaN(index)) {
                        api.sendMessage("Usage: !autosent remove [number]", threadID);
                        return;
                    }
                    
                    const removed = await this.removeAutoMessage(threadID, index);
                    
                    if (removed) {
                        api.sendMessage(`✅ Removed auto message #${index + 1}`, threadID);
                    } else {
                        api.sendMessage("❌ Invalid message number.", threadID);
                    }
                }
            }
        }
    },

    scheduleAutoMessages: function(api) {
        // Schedule message checking every minute
        cron.schedule("* * * * *", async () => {
            try {
                const now = new Date();
                const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
                
                const autoMessages = await this.getAllAutoMessages();
                
                for (const [threadID, messages] of Object.entries(autoMessages)) {
                    for (const msg of messages) {
                        if (msg.time === currentTime) {
                            // Send the message
                            api.sendMessage(msg.message, threadID);
                            
                            // Log sent message
                            console.log(`Auto message sent to ${threadID} at ${currentTime}`);
                        }
                    }
                }
            } catch (error) {
                console.error("Auto message scheduling error:", error);
            }
        });
    },

    addAutoMessage: async function(threadID, time, message) {
        try {
            const filePath = path.join(__dirname, "../cache/auto_messages.json");
            const data = await fs.readJson(filePath).catch(() => ({}));
            
            if (!data[threadID]) {
                data[threadID] = [];
            }
            
            data[threadID].push({ time, message });
            await fs.writeJson(filePath, data, { spaces: 2 });
            
            return true;
        } catch (error) {
            console.error("Add auto message error:", error);
            return false;
        }
    },

    getAutoMessages: async function(threadID) {
        try {
            const filePath = path.join(__dirname, "../cache/auto_messages.json");
            const data = await fs.readJson(filePath).catch(() => ({}));
            
            return data[threadID] || [];
        } catch (error) {
            console.error("Get auto messages error:", error);
            return [];
        }
    },

    getAllAutoMessages: async function() {
        try {
            const filePath = path.join(__dirname, "../cache/auto_messages.json");
            return await fs.readJson(filePath).catch(() => ({}));
        } catch (error) {
            console.error("Get all auto messages error:", error);
            return {};
        }
    },

    removeAutoMessage: async function(threadID, index) {
        try {
            const filePath = path.join(__dirname, "../cache/auto_messages.json");
            const data = await fs.readJson(filePath).catch(() => ({}));
            
            if (!data[threadID] || index < 0 || index >= data[threadID].length) {
                return false;
            }
            
            data[threadID].splice(index, 1);
            
            // Remove thread entry if no messages left
            if (data[threadID].length === 0) {
                delete data[threadID];
            }
            
            await fs.writeJson(filePath, data, { spaces: 2 });
            return true;
        } catch (error) {
            console.error("Remove auto message error:", error);
            return false;
        }
    }
};