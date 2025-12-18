const fs = require("fs-extra");
const path = require("path");

module.exports = {
    config: {
        name: "autosetname",
        version: "1.0.0",
        description: "Automatically set nickname for users",
        author: "RANA",
        category: "events"
    },

    onEvent: async function({ api, event }) {
        try {
            // Trigger on user join or message
            if (event.logMessageType === "log:subscribe" || event.type === "message") {
                const { threadID, senderID } = event;
                
                // Check if auto setname is enabled for this thread
                const settingsPath = path.join(__dirname, "../cache/autosetname_settings.json");
                const settings = await fs.readJson(settingsPath).catch(() => ({}));
                const threadSettings = settings[threadID];
                
                if (!threadSettings || !threadSettings.enabled) return;
                
                // Get user info
                const userInfo = await api.getUserInfo(senderID);
                const userName = userInfo[senderID]?.name || "User";
                
                // Set nickname based on template
                const nickname = this.generateNickname(userName, threadSettings.template);
                
                // Set nickname in group
                await api.changeNickname(nickname, threadID, senderID);
                
                // Log nickname change
                console.log(`Set nickname for ${userName} in ${threadID}: ${nickname}`);
            }
            
        } catch (error) {
            console.error("Auto setname error:", error);
        }
    },

    onMessage: async function({ api, event }) {
        const { threadID, senderID, body } = event;
        
        if (body && body.startsWith(global.config?.prefix || "!")) {
            const args = body.slice((global.config?.prefix || "!").length).trim().split(" ");
            const command = args.shift().toLowerCase();
            
            if (command === "autosetname") {
                // Check if user is admin
                const threadInfo = await api.getThreadInfo(threadID);
                const isAdmin = threadInfo.adminIDs?.some(admin => admin.id === senderID);
                
                if (!isAdmin) {
                    api.sendMessage("❌ Admin only command.", threadID);
                    return;
                }
                
                const action = args[0];
                
                if (action === "on") {
                    const template = args.slice(1).join(" ") || "{name} 👑";
                    await this.enableAutoSetname(threadID, template);
                    
                    api.sendMessage(
                        `✅ Auto Setname enabled!\n` +
                        `Template: ${template}\n` +
                        `New members will get nickname automatically.`,
                        threadID
                    );
                    
                } else if (action === "off") {
                    await this.disableAutoSetname(threadID);
                    api.sendMessage("❌ Auto Setname disabled.", threadID);
                    
                } else if (action === "set") {
                    const userID = args[1];
                    const nickname = args.slice(2).join(" ");
                    
                    if (!userID || !nickname) {
                        api.sendMessage("Usage: !autosetname set @user nickname", threadID);
                        return;
                    }
                    
                    // Set nickname for specific user
                    await api.changeNickname(nickname, threadID, userID);
                    api.sendMessage(`✅ Nickname set for user: ${nickname}`, threadID);
                }
            }
        }
    },

    generateNickname: function(userName, template = "{name} 👑") {
        // Available variables: {name}, {first}, {last}, {random}
        const nameParts = userName.split(" ");
        const firstName = nameParts[0] || "User";
        const lastName = nameParts.slice(1).join(" ") || "";
        
        const randomEmojis = ["👑", "⭐", "🔥", "❤️", "🎯", "⚡", "🌟", "💎"];
        const randomEmoji = randomEmojis[Math.floor(Math.random() * randomEmojis.length)];
        
        let nickname = template
            .replace(/{name}/g, userName)
            .replace(/{first}/g, firstName)
            .replace(/{last}/g, lastName)
            .replace(/{random}/g, randomEmoji);
        
        return nickname;
    },

    enableAutoSetname: async function(threadID, template) {
        try {
            const filePath = path.join(__dirname, "../cache/autosetname_settings.json");
            const settings = await fs.readJson(filePath).catch(() => ({}));
            
            settings[threadID] = {
                enabled: true,
                template: template
            };
            
            await fs.writeJson(filePath, settings, { spaces: 2 });
            return true;
        } catch (error) {
            console.error("Enable auto setname error:", error);
            return false;
        }
    },

    disableAutoSetname: async function(threadID) {
        try {
            const filePath = path.join(__dirname, "../cache/autosetname_settings.json");
            const settings = await fs.readJson(filePath).catch(() => ({}));
            
            if (settings[threadID]) {
                delete settings[threadID];
                await fs.writeJson(filePath, settings, { spaces: 2 });
            }
            
            return true;
        } catch (error) {
            console.error("Disable auto setname error:", error);
            return false;
        }
    }
};