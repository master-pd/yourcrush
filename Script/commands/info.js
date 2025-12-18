const os = require('os');
const fs = require('fs');
const path = require('path');

module.exports = {
    config: {
        name: "info",
        version: "2.0",
        author: "RANA",
        role: 0,
        category: "system",
        shortDescription: {
            en: "Show detailed bot information",
            bn: "বিস্তারিত বট তথ্য দেখান"
        },
        longDescription: {
            en: "Displays detailed information about the bot, system, and statistics",
            bn: "বট, সিস্টেম এবং পরিসংখ্যান সম্পর্কে বিস্তারিত তথ্য প্রদর্শন করে"
        },
        guide: {
            en: "{pn}",
            bn: "{pn}"
        },
        cooldown: 10
    },

    onStart: async function({ api, event, config, commands }) {
        try {
            const { threadID, messageID } = event;
            
            // Get system information
            const systemInfo = getSystemInfo();
            
            // Get bot statistics
            const botStats = await getBotStats();
            
            // Get database statistics
            const dbStats = await getDatabaseStats();
            
            // Build info message
            let infoMessage = `🤖 **${config.botInfo.name} - INFORMATION** 🤖\n\n`;
            
            infoMessage += `📊 **BOT STATISTICS**\n`;
            infoMessage += `• Version: ${config.botInfo.version}\n`;
            infoMessage += `• Prefix: ${config.prefix}\n`;
            infoMessage += `• Language: ${config.language}\n`;
            infoMessage += `• Commands: ${commands.size} loaded\n`;
            infoMessage += `• Uptime: ${formatUptime(process.uptime())}\n`;
            infoMessage += `• Mode: ${config.developmentMode ? 'Development' : 'Production'}\n\n`;
            
            infoMessage += `💾 **DATABASE**\n`;
            infoMessage += `• Type: ${config.database.type}\n`;
            infoMessage += `• Users: ${dbStats.users || 0}\n`;
            infoMessage += `• Threads: ${dbStats.threads || 0}\n`;
            infoMessage += `• Commands Executed: ${dbStats.commands || 0}\n\n`;
            
            infoMessage += `🖥️ **SYSTEM INFORMATION**\n`;
            infoMessage += `• Platform: ${systemInfo.platform}\n`;
            infoMessage += `• CPU: ${systemInfo.cpu} cores\n`;
            infoMessage += `• Memory: ${systemInfo.memory.used}MB / ${systemInfo.memory.total}MB\n`;
            infoMessage += `• Uptime: ${systemInfo.uptime}\n`;
            infoMessage += `• Node.js: ${process.version}\n\n`;
            
            infoMessage += `📁 **FILE SYSTEM**\n`;
            infoMessage += `• Total Commands: ${botStats.commandFiles}\n`;
            infoMessage += `• Total Events: ${botStats.eventFiles}\n`;
            infoMessage += `• Cache Size: ${botStats.cacheSize}\n`;
            infoMessage += `• Log Files: ${botStats.logFiles}\n\n`;
            
            infoMessage += `👤 **DEVELOPER**\n`;
            infoMessage += `• Name: ${config.botInfo.author}\n`;
            infoMessage += `• Contact: ${config.botInfo.contact.email}\n`;
            infoMessage += `• Telegram: ${config.botInfo.contact.telegram}\n\n`;
            
            infoMessage += `🔗 **LINKS**\n`;
            infoMessage += `• Support: https://t.me/master_account_remover_channel\n`;
            infoMessage += `• Source: Private Repository\n\n`;
            
            infoMessage += `📌 **NOTE:** This bot is under continuous development.`;
            
            api.sendMessage(infoMessage, threadID, messageID);
            
        } catch (error) {
            console.error(error);
            api.sendMessage(
                "❌ Failed to retrieve bot information.",
                event.threadID,
                event.messageID
            );
        }
    }
};

function getSystemInfo() {
    return {
        platform: `${os.platform()} ${os.arch()}`,
        cpu: os.cpus().length,
        memory: {
            total: Math.round(os.totalmem() / 1024 / 1024),
            used: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024),
            free: Math.round(os.freemem() / 1024 / 1024)
        },
        uptime: formatUptime(os.uptime()),
        loadavg: os.loadavg()
    };
}

async function getBotStats() {
    try {
        const commandsPath = path.join(__dirname, '..');
        const eventsPath = path.join(__dirname, '../events');
        const cachePath = path.join(__dirname, '../../cache');
        const logsPath = path.join(__dirname, '../../logs');
        
        const commandFiles = fs.existsSync(commandsPath) ? 
            fs.readdirSync(commandsPath).filter(f => f.endsWith('.js')).length : 0;
        
        const eventFiles = fs.existsSync(eventsPath) ? 
            fs.readdirSync(eventsPath).filter(f => f.endsWith('.js')).length : 0;
        
        let cacheSize = 0;
        if (fs.existsSync(cachePath)) {
            cacheSize = getDirectorySize(cachePath);
        }
        
        let logFiles = 0;
        if (fs.existsSync(logsPath)) {
            logFiles = fs.readdirSync(logsPath).length;
        }
        
        return {
            commandFiles,
            eventFiles,
            cacheSize: formatBytes(cacheSize),
            logFiles
        };
    } catch (error) {
        return {
            commandFiles: 0,
            eventFiles: 0,
            cacheSize: "0 B",
            logFiles: 0
        };
    }
}

async function getDatabaseStats() {
    try {
        if (!global.database || !global.database.models) {
            return { users: 0, threads: 0, commands: 0 };
        }
        
        const { User, Thread, CommandUsage } = global.database.models;
        
        const users = await User.count();
        const threads = await Thread.count();
        const commands = await CommandUsage.count();
        
        return { users, threads, commands };
    } catch (error) {
        return { users: 0, threads: 0, commands: 0 };
    }
}

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

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getDirectorySize(dirPath) {
    let size = 0;
    
    const getSize = (currentPath) => {
        const stats = fs.statSync(currentPath);
        if (stats.isFile()) {
            size += stats.size;
        } else if (stats.isDirectory()) {
            const files = fs.readdirSync(currentPath);
            files.forEach(file => {
                getSize(path.join(currentPath, file));
            });
        }
    };
    
    if (fs.existsSync(dirPath)) {
        getSize(dirPath);
    }
    
    return size;
}