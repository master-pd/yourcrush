module.exports = {
    config: {
        name: "menu",
        version: "2.0",
        author: "RANA",
        role: 0,
        category: "system",
        shortDescription: {
            en: "Show command menu",
            bn: "কমান্ড মেনু দেখান"
        },
        longDescription: {
            en: "Displays a categorized menu of all available commands",
            bn: "সমস্ত উপলব্ধ কমান্ডের একটি বিভাগভুক্ত মেনু প্রদর্শন করে"
        },
        guide: {
            en: "{pn} [page number]",
            bn: "{pn} [পৃষ্ঠা নম্বর]"
        },
        cooldown: 10
    },

    onStart: async function({ api, event, args, commands, config }) {
        try {
            const { threadID, messageID } = event;
            
            // Categorize commands
            const categorized = categorizeCommands(commands);
            
            // Get page number
            const page = args[0] ? parseInt(args[0]) : 1;
            const commandsPerPage = 15;
            
            // Calculate total pages
            const totalCommands = Object.values(categorized).reduce((sum, cmds) => sum + cmds.length, 0);
            const totalPages = Math.ceil(totalCommands / commandsPerPage);
            
            if (page < 1 || page > totalPages) {
                return api.sendMessage(
                    `❌ Invalid page number. Please use between 1 and ${totalPages}.`,
                    threadID,
                    messageID
                );
            }
            
            // Build menu
            const menu = buildMenu(categorized, page, commandsPerPage, config, totalPages, totalCommands);
            
            // Send menu
            api.sendMessage(menu, threadID, messageID);
            
        } catch (error) {
            console.error(error);
            api.sendMessage(
                "❌ Failed to display menu.",
                event.threadID,
                event.messageID
            );
        }
    }
};

function categorizeCommands(commands) {
    const categories = {
        'system': [],
        'ai': [],
        'fun': [],
        'utility': [],
        'image': [],
        'audio': [],
        'game': [],
        'info': [],
        'admin': [],
        'other': []
    };
    
    for (const [name, cmd] of commands) {
        if (cmd.config && cmd.config.category) {
            const category = cmd.config.category.toLowerCase();
            
            if (categories[category]) {
                categories[category].push({
                    name: cmd.config.name,
                    description: cmd.config.shortDescription?.en || cmd.config.shortDescription || "No description",
                    role: cmd.config.role || 0
                });
            } else {
                categories.other.push({
                    name: cmd.config.name,
                    description: cmd.config.shortDescription?.en || cmd.config.shortDescription || "No description",
                    role: cmd.config.role || 0
                });
            }
        } else {
            categories.other.push({
                name: cmd.config?.name || name,
                description: cmd.config?.shortDescription?.en || cmd.config?.shortDescription || "No description",
                role: cmd.config?.role || 0
            });
        }
    }
    
    // Sort commands in each category
    for (const category in categories) {
        categories[category].sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return categories;
}

function buildMenu(categorized, page, perPage, config, totalPages, totalCommands) {
    let menu = `📱 **${config.botInfo.name} - COMMAND MENU** 📱\n\n`;
    menu += `🔰 **Page:** ${page}/${totalPages}\n`;
    menu += `📊 **Total Commands:** ${totalCommands}\n`;
    menu += `🔤 **Prefix:** ${config.prefix}\n`;
    menu += `🌐 **Language:** ${config.language.toUpperCase()}\n\n`;
    menu += `════════════════════════════\n\n`;
    
    // Get commands for this page
    const allCommands = [];
    for (const [category, cmds] of Object.entries(categorized)) {
        if (cmds.length > 0) {
            cmds.forEach(cmd => {
                allCommands.push({ ...cmd, category });
            });
        }
    }
    
    // Paginate
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const pageCommands = allCommands.slice(startIndex, endIndex);
    
    // Display page commands
    let currentCategory = '';
    for (const cmd of pageCommands) {
        if (cmd.category !== currentCategory) {
            currentCategory = cmd.category;
            menu += `\n📁 **${currentCategory.toUpperCase()}**\n`;
        }
        
        const roleIcon = getRoleIcon(cmd.role);
        menu += `${roleIcon} \`${config.prefix}${cmd.name}\` - ${cmd.description}\n`;
    }
    
    menu += `\n════════════════════════════\n`;
    menu += `📖 **Usage:** ${config.prefix}menu [page]\n`;
    menu += `🔍 **Search:** ${config.prefix}help [command]\n`;
    menu += `👑 **Owner:** ${config.botInfo.author}\n`;
    menu += `💬 **Support:** https://t.me/master_account_remover_channel\n\n`;
    
    if (page < totalPages) {
        menu += `📄 **Next Page:** ${config.prefix}menu ${page + 1}`;
    }
    
    return menu;
}

function getRoleIcon(role) {
    switch (role) {
        case 0: return '👤'; // Everyone
        case 1: return '🛡️'; // Group Admin
        case 2: return '👑'; // Bot Admin
        default: return '👤';
    }
}