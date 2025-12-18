module.exports = {
    config: {
        name: "uptime",
        version: "1.0",
        author: "RANA",
        role: 0,
        category: "system",
        shortDescription: {
            en: "Check bot uptime",
            bn: "বটের আপটাইম চেক করুন"
        },
        longDescription: {
            en: "Shows how long the bot has been running",
            bn: "বট কতক্ষণ চলছে তা দেখায়"
        },
        guide: {
            en: "{pn}",
            bn: "{pn}"
        },
        cooldown: 5
    },

    onStart: async function({ api, event, config }) {
        try {
            const { threadID, messageID } = event;
            
            const uptime = process.uptime();
            const uptimeString = formatUptime(uptime);
            
            // Get current time
            const now = new Date();
            const startTime = new Date(now - (uptime * 1000));
            
            // Get system info
            const os = require('os');
            const systemUptime = formatUptime(os.uptime());
            
            const message = `
⏱️ **BOT UPTIME**

🤖 **Bot Information:**
• Name: ${config.botInfo.name}
• Version: ${config.botInfo.version}
• Uptime: ${uptimeString}
• Started: ${startTime.toLocaleString()}

🖥️ **System Information:**
• System Uptime: ${systemUptime}
• Platform: ${os.platform()} ${os.arch()}
• CPU Cores: ${os.cpus().length}
• Memory Usage: ${Math.round((os.totalmem() - os.freemem()) / 1024 / 1024)}MB / ${Math.round(os.totalmem() / 1024 / 1024)}MB

📊 **Statistics:**
• Commands Loaded: ${global.commands ? global.commands.size : 0}
• Active Threads: ${global.threadData ? global.threadData.size : 0}
• Active Users: ${global.userData ? global.userData.size : 0}

🔄 **Status:** ✅ Online and Running
            `;
            
            api.sendMessage(message, threadID, messageID);
            
        } catch (error) {
            console.error(error);
            api.sendMessage(
                "❌ Failed to retrieve uptime information.",
                event.threadID,
                event.messageID
            );
        }
    }
};

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
    if (secs > 0) parts.push(`${secs} second${secs > 1 ? 's' : ''}`);
    
    return parts.join(', ');
}