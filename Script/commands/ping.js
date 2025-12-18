module.exports = {
    config: {
        name: "ping",
        version: "1.0",
        author: "RANA",
        role: 0,
        category: "system",
        shortDescription: {
            en: "Check bot response time",
            bn: "বটের রেসপন্স টাইম চেক করুন"
        },
        longDescription: {
            en: "Shows the bot's current ping and response time",
            bn: "বটের বর্তমান পিং এবং রেসপন্স টাইম দেখায়"
        },
        guide: {
            en: "{pn}",
            bn: "{pn}"
        },
        cooldown: 5
    },

    onStart: async function({ api, event }) {
        try {
            const startTime = Date.now();
            
            const pingMessage = await api.sendMessage(
                "🏓 Pinging...",
                event.threadID,
                event.messageID
            );
            
            const endTime = Date.now();
            const ping = endTime - startTime;
            
            // Get bot uptime
            const uptime = process.uptime();
            const uptimeString = formatUptime(uptime);
            
            // Get memory usage
            const memoryUsage = process.memoryUsage();
            const usedMemory = Math.round(memoryUsage.heapUsed / 1024 / 1024);
            const totalMemory = Math.round(memoryUsage.heapTotal / 1024 / 1024);
            
            // Get command count
            const commandCount = global.commands ? global.commands.size : 0;
            
            // Build response
            let response = `🏓 **PONG!**\n\n`;
            response += `⚡ **Response Time:** ${ping}ms\n`;
            response += `⏱️ **Uptime:** ${uptimeString}\n`;
            response += `💾 **Memory:** ${usedMemory}MB / ${totalMemory}MB\n`;
            response += `📊 **Commands:** ${commandCount} loaded\n`;
            response += `👤 **Users:** ${global.userData ? global.userData.size : 0} cached\n`;
            response += `💬 **Threads:** ${global.threadData ? global.threadData.size : 0} cached\n`;
            
            // Add system status
            response += `\n🔧 **System Status:**\n`;
            response += `• Database: ${global.database && global.database.isConnected ? '✅ Connected' : '❌ Disconnected'}\n`;
            response += `• Bot: ${global.bot && global.bot.isReady ? '✅ Ready' : '❌ Not Ready'}\n`;
            response += `• Mode: ${global.config.developmentMode ? 'Development' : 'Production'}\n`;
            
            // Update the ping message
            api.editMessage(
                response,
                pingMessage.messageID
            );
            
        } catch (error) {
            console.error(error);
            api.sendMessage(
                "❌ Failed to check ping. Please try again.",
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
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    
    return parts.join(' ');
}