const fs = require("fs-extra");
const path = require("path");
const chalk = require("chalk");

module.exports = async function handleCommand(api, event, commands) {
    const { body, senderID, threadID, messageID } = event;
    const prefix = global.config?.prefix || "!";
    
    if (!body.startsWith(prefix)) return false;
    
    const args = body.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = commands[commandName];
    
    if (!command) {
        // Command not found
        await handleCommandNotFound(api, event, commandName, commands);
        return false;
    }
    
    // Check permission
    if (!await checkCommandPermission(api, event, command)) {
        await api.sendMessage(
            "❌ You don't have permission to use this command.",
            threadID,
            messageID
        );
        return false;
    }
    
    // Check cooldown
    if (await isCommandOnCooldown(commandName, senderID, threadID)) {
        const remaining = await getCooldownRemaining(commandName, senderID, threadID);
        await api.sendMessage(
            `⏰ Please wait ${remaining} seconds before using this command again.`,
            threadID,
            messageID
        );
        return false;
    }
    
    // Execute command
    try {
        console.log(chalk.cyan(`▶️ Command: ${commandName} by ${senderID} in ${threadID}`));
        
        // Set cooldown
        setCommandCooldown(commandName, senderID, threadID);
        
        // Execute command based on structure
        let result;
        
        if (typeof command.onStart === "function") {
            result = await command.onStart({ api, event, args });
        } else if (typeof command.run === "function") {
            result = await command.run({ api, event, args });
        } else if (typeof command === "function") {
            result = await command({ api, event, args });
        } else {
            throw new Error("Invalid command structure");
        }
        
        // Log successful command execution
        logCommandExecution(commandName, senderID, threadID, args, true);
        
        return result;
        
    } catch (error) {
        console.error(chalk.red(`❌ Command execution error (${commandName}):`), error);
        
        // Log failed command execution
        logCommandExecution(commandName, senderID, threadID, args, false, error.message);
        
        // Send error message
        const errorMsg = `❌ Error executing command:\n${error.message}`;
        if (errorMsg.length < 2000) {
            await api.sendMessage(errorMsg, threadID, messageID);
        }
        
        return false;
    }
};

async function handleCommandNotFound(api, event, commandName, commands) {
    const { threadID } = event;
    
    // Find similar commands
    const similarCommands = findSimilarCommands(commandName, Object.keys(commands));
    
    if (similarCommands.length > 0) {
        const suggestions = similarCommands.slice(0, 3).map(cmd => `• ${cmd}`).join('\n');
        await api.sendMessage(
            `❌ Command "${commandName}" not found.\n\nDid you mean:\n${suggestions}`,
            threadID
        );
    }
}

function findSimilarCommands(input, commandList) {
    const inputLower = input.toLowerCase();
    const similar = [];
    
    for (const cmd of commandList) {
        const cmdLower = cmd.toLowerCase();
        
        // Check for various similarity measures
        if (cmdLower.startsWith(inputLower) || inputLower.startsWith(cmdLower)) {
            similar.push(cmd);
        } else if (cmdLower.includes(inputLower) || inputLower.includes(cmdLower)) {
            similar.push(cmd);
        } else if (calculateSimilarity(cmdLower, inputLower) > 0.6) {
            similar.push(cmd);
        }
    }
    
    return similar.slice(0, 5); // Return top 5 matches
}

function calculateSimilarity(str1, str2) {
    // Simple similarity calculation
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    return (longer.length - editDistance(longer, shorter)) / parseFloat(longer.length);
}

function editDistance(s1, s2) {
    // Levenshtein distance
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
    
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
            if (i === 0) {
                costs[j] = j;
            } else if (j > 0) {
                let newValue = costs[j - 1];
                if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                    newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                }
                costs[j - 1] = lastValue;
                lastValue = newValue;
            }
        }
        if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}

async function checkCommandPermission(api, event, command) {
    const { senderID, threadID } = event;
    
    // If no config, allow everyone
    if (!command.config) return true;
    
    const { role, adminOnly, ownerOnly } = command.config;
    
    // Owner check
    if (ownerOnly) {
        return isOwner(senderID);
    }
    
    // Admin check
    if (adminOnly) {
        return await isAdmin(api, senderID, threadID);
    }
    
    // Role-based permission
    if (role) {
        return await checkUserRole(senderID, threadID, role);
    }
    
    return true;
}

function isOwner(userID) {
    const admins = global.config?.ADMINS || [];
    return admins.includes(userID.toString());
}

async function isAdmin(api, userID, threadID) {
    try {
        // Check config admins first
        if (isOwner(userID)) return true;
        
        // Check thread admins
        const threadInfo = await api.getThreadInfo(threadID);
        const adminIDs = threadInfo.adminIDs?.map(admin => admin.id) || [];
        
        return adminIDs.includes(userID.toString());
    } catch (error) {
        console.error("Error checking admin status:", error);
        return false;
    }
}

async function checkUserRole(userID, threadID, requiredRole) {
    // Implement role-based permission system
    // For now, return true
    return true;
}

const commandCooldowns = new Map();

async function isCommandOnCooldown(commandName, userID, threadID) {
    const key = `${commandName}_${userID}_${threadID}`;
    const cooldownData = commandCooldowns.get(key);
    
    if (!cooldownData) return false;
    
    const now = Date.now();
    const cooldownTime = getCommandCooldownTime(commandName);
    
    return now - cooldownData.timestamp < cooldownTime;
}

async function getCooldownRemaining(commandName, userID, threadID) {
    const key = `${commandName}_${userID}_${threadID}`;
    const cooldownData = commandCooldowns.get(key);
    
    if (!cooldownData) return 0;
    
    const now = Date.now();
    const cooldownTime = getCommandCooldownTime(commandName);
    const remaining = Math.ceil((cooldownTime - (now - cooldownData.timestamp)) / 1000);
    
    return Math.max(0, remaining);
}

function setCommandCooldown(commandName, userID, threadID) {
    const key = `${commandName}_${userID}_${threadID}`;
    const cooldownTime = getCommandCooldownTime(commandName);
    
    commandCooldowns.set(key, {
        timestamp: Date.now(),
        expires: Date.now() + cooldownTime
    });
    
    // Clean up after cooldown expires
    setTimeout(() => {
        commandCooldowns.delete(key);
    }, cooldownTime);
}

function getCommandCooldownTime(commandName) {
    const command = global.commands?.[commandName];
    
    // Command-specific cooldown
    if (command?.config?.cooldown) {
        return command.config.cooldown * 1000;
    }
    
    // Category-based cooldown
    if (command?.config?.category) {
        const categoryCooldowns = {
            "admin": 5000,
            "economy": 3000,
            "game": 2000,
            "utility": 1000,
            "fun": 1000
        };
        
        return categoryCooldowns[command.config.category] || 2000;
    }
    
    // Global default cooldown
    return global.config?.limits?.cooldownTime || 2000;
}

function logCommandExecution(commandName, userID, threadID, args, success, error = null) {
    try {
        const logger = require("../../utils/log");
        
        const logData = {
            command: commandName,
            userID,
            threadID,
            args: args.join(" "),
            success,
            timestamp: new Date().toISOString(),
            error: error || null
        };
        
        logger.logCommand(userID, threadID, commandName, args, success);
        
        // Also save to file
        const logPath = path.join(__dirname, "../../logs/command_execution.json");
        const existingLogs = fs.readJsonSync(logPath, { throws: false }) || [];
        existingLogs.push(logData);
        
        // Keep only last 1000 logs
        if (existingLogs.length > 1000) {
            existingLogs.splice(0, existingLogs.length - 1000);
        }
        
        fs.writeJsonSync(logPath, existingLogs, { spaces: 2 });
        
    } catch (error) {
        console.error("Error logging command execution:", error);
    }
}

// Export utility functions
module.exports.findSimilarCommands = findSimilarCommands;
module.exports.isCommandOnCooldown = isCommandOnCooldown;
module.exports.getCooldownRemaining = getCooldownRemaining;
module.exports.checkCommandPermission = checkCommandPermission;