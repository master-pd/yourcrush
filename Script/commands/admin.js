module.exports = {
    config: {
        name: "admin",
        version: "2.0",
        author: "RANA",
        role: 2,
        category: "admin",
        shortDescription: {
            en: "Admin commands management",
            bn: "অ্যাডমিন কমান্ড ব্যবস্থাপনা"
        },
        longDescription: {
            en: "Manage bot admins, view admin list, add/remove admins",
            bn: "বট অ্যাডমিন পরিচালনা করুন, অ্যাডমিন তালিকা দেখুন, অ্যাডমিন যোগ/সরান"
        },
        guide: {
            en: "{pn} list | {pn} add [uid] | {pn} remove [uid]",
            bn: "{pn} list | {pn} add [uid] | {pn} remove [uid]"
        },
        cooldown: 5
    },

    onStart: async function({ api, event, args, config }) {
        try {
            const { threadID, messageID, senderID } = event;
            
            // Check if sender is owner
            if (config.admins[0] !== senderID) {
                return api.sendMessage(
                    "❌ Only the bot owner can use this command.",
                    threadID,
                    messageID
                );
            }
            
            if (args.length === 0) {
                return showAdminHelp(api, threadID, messageID, config);
            }
            
            const action = args[0].toLowerCase();
            
            switch (action) {
                case 'list':
                    await showAdminList(api, threadID, messageID, config);
                    break;
                    
                case 'add':
                    if (args.length < 2) {
                        return api.sendMessage(
                            "❌ Please provide a user ID to add.\nExample: .admin add 100000000000000",
                            threadID,
                            messageID
                        );
                    }
                    await addAdmin(api, threadID, messageID, args[1], config);
                    break;
                    
                case 'remove':
                case 'delete':
                    if (args.length < 2) {
                        return api.sendMessage(
                            "❌ Please provide a user ID to remove.\nExample: .admin remove 100000000000000",
                            threadID,
                            messageID
                        );
                    }
                    await removeAdmin(api, threadID, messageID, args[1], config);
                    break;
                    
                default:
                    return showAdminHelp(api, threadID, messageID, config);
            }
            
        } catch (error) {
            console.error(error);
            api.sendMessage(
                "❌ Admin command failed.",
                event.threadID,
                event.messageID
            );
        }
    }
};

async function showAdminHelp(api, threadID, messageID, config) {
    const helpMessage = `
👑 **ADMIN COMMANDS MANAGEMENT** 👑

📋 **Available Commands:**
• ${config.prefix}admin list - Show all admins
• ${config.prefix}admin add [uid] - Add new admin
• ${config.prefix}admin remove [uid] - Remove admin

📝 **Usage Examples:**
• ${config.prefix}admin list
• ${config.prefix}admin add 61578706761898
• ${config.prefix}admin remove 61578706761898

⚠️ **Note:** Only bot owner can manage admins.
    `;
    
    api.sendMessage(helpMessage, threadID, messageID);
}

async function showAdminList(api, threadID, messageID, config) {
    try {
        const admins = config.admins || [];
        
        if (admins.length === 0) {
            return api.sendMessage(
                "📭 No admins found. Only owner has access.",
                threadID,
                messageID
            );
        }
        
        let message = "👑 **BOT ADMINS LIST** 👑\n\n";
        message += `📊 Total Admins: ${admins.length}\n\n`;
        
        // Get admin names
        const adminInfos = await api.getUserInfo(admins);
        
        for (let i = 0; i < admins.length; i++) {
            const uid = admins[i];
            const info = adminInfos[uid];
            const name = info ? info.name : `Unknown (${uid})`;
            const isOwner = i === 0 ? " 👑 (Owner)" : "";
            
            message += `${i + 1}. ${name}\n`;
            message += `   ID: ${uid}${isOwner}\n\n`;
        }
        
        message += `🔰 Note: Only these users can use admin commands.`;
        
        api.sendMessage(message, threadID, messageID);
        
    } catch (error) {
        api.sendMessage(
            "❌ Failed to retrieve admin list.",
            threadID,
            messageID
        );
    }
}

async function addAdmin(api, threadID, messageID, uid, config) {
    try {
        // Validate UID
        if (!/^\d+$/.test(uid)) {
            return api.sendMessage(
                "❌ Invalid user ID. Please provide a numeric ID.",
                threadID,
                messageID
            );
        }
        
        // Check if already admin
        if (config.admins.includes(uid)) {
            return api.sendMessage(
                "❌ This user is already an admin.",
                threadID,
                messageID
            );
        }
        
        // Get user info
        const userInfo = await api.getUserInfo(uid);
        const userName = userInfo[uid] ? userInfo[uid].name : "Unknown User";
        
        // Add to config
        config.admins.push(uid);
        
        // Save config
        const fs = require('fs');
        const configPath = require('path').join(__dirname, '../../../config.json');
        
        // Read current config
        const currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        currentConfig.admins = config.admins;
        
        // Write updated config
        fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2));
        
        // Update global config
        global.config.admins = config.admins;
        
        // Send confirmation
        const message = `
✅ **ADMIN ADDED SUCCESSFULLY**

👤 **User:** ${userName}
🆔 **ID:** ${uid}
📊 **Total Admins:** ${config.admins.length}

🔰 The user can now use admin commands.
        `;
        
        api.sendMessage(message, threadID, messageID);
        
        // Log the action
        console.log(`Admin added: ${userName} (${uid})`);
        
    } catch (error) {
        console.error(error);
        api.sendMessage(
            "❌ Failed to add admin. Make sure the user ID is correct.",
            threadID,
            messageID
        );
    }
}

async function removeAdmin(api, threadID, messageID, uid, config) {
    try {
        // Validate UID
        if (!/^\d+$/.test(uid)) {
            return api.sendMessage(
                "❌ Invalid user ID. Please provide a numeric ID.",
                threadID,
                messageID
            );
        }
        
        // Check if trying to remove owner
        if (uid === config.admins[0]) {
            return api.sendMessage(
                "❌ Cannot remove the bot owner.",
                threadID,
                messageID
            );
        }
        
        // Check if user is admin
        const adminIndex = config.admins.indexOf(uid);
        if (adminIndex === -1) {
            return api.sendMessage(
                "❌ This user is not an admin.",
                threadID,
                messageID
            );
        }
        
        // Get user info
        const userInfo = await api.getUserInfo(uid);
        const userName = userInfo[uid] ? userInfo[uid].name : "Unknown User";
        
        // Remove from config
        config.admins.splice(adminIndex, 1);
        
        // Save config
        const fs = require('fs');
        const configPath = require('path').join(__dirname, '../../../config.json');
        
        // Read current config
        const currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        currentConfig.admins = config.admins;
        
        // Write updated config
        fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2));
        
        // Update global config
        global.config.admins = config.admins;
        
        // Send confirmation
        const message = `
✅ **ADMIN REMOVED SUCCESSFULLY**

👤 **User:** ${userName}
🆔 **ID:** ${uid}
📊 **Total Admins:** ${config.admins.length}

🔰 The user can no longer use admin commands.
        `;
        
        api.sendMessage(message, threadID, messageID);
        
        // Log the action
        console.log(`Admin removed: ${userName} (${uid})`);
        
    } catch (error) {
        console.error(error);
        api.sendMessage(
            "❌ Failed to remove admin.",
            threadID,
            messageID
        );
    }
}