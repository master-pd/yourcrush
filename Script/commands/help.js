module.exports = {
    config: {
        name: "help",
        version: "2.0",
        author: "RANA",
        role: 0,
        category: "system",
        shortDescription: {
            en: "Show all commands",
            bn: "সব কমান্ড দেখান"
        },
        longDescription: {
            en: "Displays all available commands or detailed info about a specific command",
            bn: "সব কমান্ড দেখায় অথবা নির্দিষ্ট কমান্ডের বিস্তারিত তথ্য দেখায়"
        },
        guide: {
            en: "{pn} [command name]",
            bn: "{pn} [কমান্ড নাম]"
        },
        cooldown: 5
    },

    onStart: async function({ api, event, args, config, commands }) {
        try {
            const { threadID, messageID } = event;
            
            if (args.length === 0) {
                // Show all commands
                await showAllCommands(api, threadID, messageID, commands);
            } else {
                // Show specific command help
                const cmdName = args[0].toLowerCase();
                const command = commands.get(cmdName);
                
                if (command) {
                    await showCommandHelp(api, threadID, messageID, command, config);
                } else {
                    api.sendMessage(
                        `❌ Command "${cmdName}" not found.`,
                        threadID,
                        messageID
                    );
                }
            }
        } catch (error) {
            console.error(error);
            api.sendMessage(
                "❌ An error occurred while displaying help.",
                event.threadID,
                event.messageID
            );
        }
    }
};

async function showAllCommands(api, threadID, messageID, commands) {
    // Categorize commands
    const categories = {};
    
    for (const [name, cmd] of commands) {
        if (cmd.config && cmd.config.category) {
            const category = cmd.config.category.toLowerCase();
            
            if (!categories[category]) {
                categories[category] = [];
            }
            
            categories[category].push({
                name: cmd.config.name,
                description: cmd.config.shortDescription?.en || cmd.config.shortDescription || "No description"
            });
        }
    }
    
    // Build help message
    let helpMessage = `🤖 ${global.config.botInfo.name} - Command List\n`;
    helpMessage += `Version: ${global.config.botInfo.version}\n`;
    helpMessage += `Prefix: ${global.config.prefix}\n`;
    helpMessage += `Total Commands: ${commands.size}\n\n`;
    
    // Add each category
    for (const [category, cmds] of Object.entries(categories)) {
        helpMessage += `📁 ${category.toUpperCase()}\n`;
        
        // Sort commands alphabetically
        cmds.sort((a, b) => a.name.localeCompare(b.name));
        
        // Display commands in this category
        for (const cmd of cmds) {
            helpMessage += `  ▸ ${global.config.prefix}${cmd.name} - ${cmd.description}\n`;
        }
        
        helpMessage += '\n';
    }
    
    // Add system commands category
    helpMessage += `📁 SYSTEM\n`;
    helpMessage += `  ▸ ${global.config.prefix}help - Show this help menu\n`;
    helpMessage += `  ▸ ${global.config.prefix}menu - Show command menu\n`;
    helpMessage += `  ▸ ${global.config.prefix}ping - Check bot status\n`;
    helpMessage += `  ▸ ${global.config.prefix}info - Bot information\n\n`;
    
    helpMessage += `📌 Tip: Use "${global.config.prefix}help [command]" for detailed info`;
    
    // Send the message
    api.sendMessage(helpMessage, threadID, (error) => {
        if (error) {
            // If message is too long, split it
            const chunks = splitMessage(helpMessage);
            for (const chunk of chunks) {
                api.sendMessage(chunk, threadID);
            }
        }
    }, messageID);
}

async function showCommandHelp(api, threadID, messageID, command, config) {
    const { config: cmdConfig } = command;
    
    let helpMessage = `📖 Command: ${config.prefix}${cmdConfig.name}\n`;
    helpMessage += `Version: ${cmdConfig.version || '1.0'}\n`;
    helpMessage += `Author: ${cmdConfig.author || 'Unknown'}\n`;
    helpMessage += `Category: ${cmdConfig.category || 'General'}\n`;
    helpMessage += `Role: ${getRoleName(cmdConfig.role)}\n\n`;
    
    // Description
    if (cmdConfig.longDescription) {
        const desc = cmdConfig.longDescription[config.language] || 
                    cmdConfig.longDescription.en || 
                    cmdConfig.longDescription;
        helpMessage += `📝 Description:\n${desc}\n\n`;
    }
    
    // Usage
    if (cmdConfig.guide) {
        const guide = cmdConfig.guide[config.language] || 
                     cmdConfig.guide.en || 
                     cmdConfig.guide;
        const usage = guide.replace(/\{pn\}/g, config.prefix);
        helpMessage += `🛠️ Usage:\n${usage}\n\n`;
    }
    
    // Aliases
    if (cmdConfig.aliases && cmdConfig.aliases.length > 0) {
        helpMessage += `🔤 Aliases:\n`;
        helpMessage += cmdConfig.aliases.map(alias => `${config.prefix}${alias}`).join(', ') + '\n\n';
    }
    
    // Cooldown
    if (cmdConfig.cooldown) {
        helpMessage += `⏱️ Cooldown: ${cmdConfig.cooldown} seconds\n`;
    }
    
    api.sendMessage(helpMessage, threadID, messageID);
}

function getRoleName(role) {
    switch (role) {
        case 0: return 'Everyone';
        case 1: return 'Group Admin';
        case 2: return 'Bot Admin';
        default: return 'Everyone';
    }
}

function splitMessage(message, maxLength = 2000) {
    const chunks = [];
    let currentChunk = '';
    
    const lines = message.split('\n');
    
    for (const line of lines) {
        if (currentChunk.length + line.length + 1 > maxLength) {
            chunks.push(currentChunk);
            currentChunk = line + '\n';
        } else {
            currentChunk += line + '\n';
        }
    }
    
    if (currentChunk.length > 0) {
        chunks.push(currentChunk);
    }
    
    return chunks;
}