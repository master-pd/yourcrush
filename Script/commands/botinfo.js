const os = require('os');
const fs = require('fs');
const path = require('path');

module.exports = {
    config: {
        name: "botinfo",
        version: "2.0",
        author: "RANA",
        role: 0,
        category: "info",
        shortDescription: {
            en: "Show detailed bot information",
            bn: "বিস্তারিত বট তথ্য দেখান"
        },
        longDescription: {
            en: "Display comprehensive information about the bot including statistics, system info, and developer details",
            bn: "বট সম্পর্কে বিস্তারিত তথ্য প্রদর্শন করুন যার মধ্যে পরিসংখ্যান, সিস্টেম তথ্য এবং ডেভেলপার বিবরণ অন্তর্ভুক্ত"
        },
        guide: {
            en: "{pn}",
            bn: "{pn}"
        },
        cooldown: 10
    },

    onStart: async function({ api, event, config, commands, database }) {
        try {
            const { threadID, messageID } = event;
            
            // Get various statistics
            const stats = await getStatistics(database);
            const systemInfo = getSystemInformation();
            const botInfo = getBotInformation(config, commands);
            const devInfo = getDeveloperInfo(config);
            
            // Build the info message
            const message = buildInfoMessage(stats, systemInfo, botInfo, devInfo, config);
            
            // Send the message
            api.sendMessage(message, threadID, messageID);
            
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

async function getStatistics(database) {
    try {
        let userCount = 0;
        let threadCount = 0;
        let commandCount = 0;
        
        if (database && database.models) {
            try {
                userCount = await database.models.User.count();
                threadCount = await database.models.Thread.count();
                commandCount = await database.models.CommandUsage.count();
            } catch (dbError) {
                console.error('Database error:', dbError);
            }
        }
        
        // Get file statistics
        const commandsPath = path.join(__dirname, '..');
        const eventsPath = path.join(__dirname, '../events');
        const cachePath = path.join(__dirname, '../../cache');
        
        const commandFiles = fs.existsSync(commandsPath) ? 
            fs.readdirSync(commandsPath).filter(f => f.endsWith('.js')).length : 0;
        
        const eventFiles = fs.existsSync(eventsPath) ? 
            fs.readdirSync(eventsPath).filter(f => f.endsWith('.js')).length : 0;
        
        let cacheSize = 0;
        if (fs.existsSync(cachePath)) {
            cacheSize = getDirectorySize(cachePath);
        }
        
        return {
            users: userCount,
            threads: threadCount,
            commands: commandCount,
            commandFiles: commandFiles,
            eventFiles: eventFiles,
            cacheSize: cacheSize
        };
    } catch (error) {
        return {
            users: 0,
            threads: 0,
            commands: 0,
            commandFiles: 0,
            eventFiles: 0,
            cacheSize: 0
        };
    }
}

function getSystemInformation() {
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    
    return {
        platform: `${os.platform()} ${os.arch()}`,
        nodeVersion: process.version,
        uptime: formatTime(uptime),
        cpuCores: os.cpus().length,
        cpuModel: os.cpus()[0].model,
        totalMemory: Math.round(os.totalmem() / 1024 / 1024) + ' MB',
        usedMemory: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024) + ' MB',
        freeMemory: Math.round(os.freemem() / 1024 / 1024) + ' MB',
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024) + ' MB',
        loadAverage: os.loadavg().map(l => l.toFixed(2)).join(', ')
    };
}

function getBotInformation(config, commands) {
    return {
        name: config.botInfo.name,
        version: config.botInfo.version,
        author: config.botInfo.author,
        prefix: config.prefix,
        language: config.language,
        loadedCommands: commands ? commands.size : 0,
        uptime: formatTime(process.uptime()),
        mode: config.developmentMode ? 'Development' : 'Production',
        admins: config.admins.length
    };
}

function getDeveloperInfo(config) {
    return {
        name: "RANA (MASTER 🪓)",
        age: "20 years",
        location: "Faridpur, Dhaka, Bangladesh",
        profession: "Security Field",
        education: "SSC Batch 2022",
        skills: ["Video Editing", "Photo Editing", "Mobile Technology", "Cyber Security (Learning)"],
        contact: {
            email: config.botInfo.contact.email,
            telegram: config.botInfo.contact.telegram,
            phone: "01847634486"
        },
        dream: "Become a Professional Developer",
        project: "Website (Coming Soon)"
    };
}

function buildInfoMessage(stats, systemInfo, botInfo, devInfo, config) {
    let message = `🤖 **${botInfo.name} - BOT INFORMATION** 🤖\n\n`;
    
    message += `📊 **BOT STATISTICS**\n`;
    message += `• Version: ${botInfo.version}\n`;
    message += `• Prefix: ${botInfo.prefix}\n`;
    message += `• Language: ${botInfo.language}\n`;
    message += `• Commands Loaded: ${botInfo.loadedCommands}\n`;
    message += `• Commands Executed: ${stats.commands}\n`;
    message += `• Bot Uptime: ${botInfo.uptime}\n`;
    message += `• Mode: ${botInfo.mode}\n\n`;
    
    message += `👥 **USER STATISTICS**\n`;
    message += `• Total Users: ${stats.users}\n`;
    message += `• Total Threads: ${stats.threads}\n`;
    message += `• Admins: ${botInfo.admins}\n\n`;
    
    message += `💾 **FILE SYSTEM**\n`;
    message += `• Command Files: ${stats.commandFiles}\n`;
    message += `• Event Files: ${stats.eventFiles}\n`;
    message += `• Cache Size: ${formatBytes(stats.cacheSize)}\n\n`;
    
    message += `🖥️ **SYSTEM INFORMATION**\n`;
    message += `• Platform: ${systemInfo.platform}\n`;
    message += `• Node.js: ${systemInfo.nodeVersion}\n`;
    message += `• CPU: ${systemInfo.cpuCores} cores (${systemInfo.cpuModel})\n`;
    message += `• Memory: ${systemInfo.usedMemory} / ${systemInfo.totalMemory}\n`;
    message += `• Heap: ${systemInfo.heapUsed} / ${systemInfo.heapTotal}\n`;
    message += `• Load Average: ${systemInfo.loadAverage}\n\n`;
    
    message += `👤 **DEVELOPER INFORMATION**\n`;
    message += `• Name: ${devInfo.name}\n`;
    message += `• Age: ${devInfo.age}\n`;
    message += `• Location: ${devInfo.location}\n`;
    message += `• Profession: ${devInfo.profession}\n`;
    message += `• Education: ${devInfo.education}\n`;
    message += `• Skills: ${devInfo.skills.join(', ')}\n`;
    message += `• Dream: ${devInfo.dream}\n`;
    message += `• Project: ${devInfo.project}\n\n`;
    
    message += `📞 **CONTACT INFORMATION**\n`;
    message += `• Email: ${devInfo.contact.email}\n`;
    message += `• Telegram: ${devInfo.contact.telegram}\n`;
    message += `• Phone: ${devInfo.contact.phone}\n`;
    message += `• Support: https://t.me/master_account_remover_channel\n\n`;
    
    message += `🔰 **BOT OWNER UID:** 61578706761898\n\n`;
    
    message += `📌 **Note:** This bot is under continuous development and improvement.`;
    
    return message;
}

function formatTime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0) parts.push(`${secs}s`);
    
    return parts.length > 0 ? parts.join(' ') : '0s';
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