const fs = require("fs-extra");
const path = require("path");

module.exports = async function handleCommandEvent(api, event) {
    const { type, body, senderID, threadID, messageID } = event;
    
    // This handler specifically deals with command-related events
    // like command execution, completion, errors, etc.
    
    try {
        switch (type) {
            case "message":
                await handleCommandMessage(api, event);
                break;
                
            case "message_reply":
                await handleCommandReply(api, event);
                break;
                
            case "message_reaction":
                await handleCommandReaction(api, event);
                break;
                
            case "message_unsend":
                await handleCommandUnsend(api, event);
                break;
                
            default:
                // Other event types
                break;
        }
    } catch (error) {
        console.error("Command event handler error:", error);
    }
};

async function handleCommandMessage(api, event) {
    const { body, senderID, threadID, messageID } = event;
    
    // Check if message is a command execution result
    if (body && body.includes("executed") || body.includes("error") || body.includes("result")) {
        await logCommandResult(api, event);
    }
}

async function handleCommandReply(api, event) {
    const { body, senderID, threadID, messageID, messageReply } = event;
    
    // Handle replies to bot messages (for interactive commands)
    if (messageReply && messageReply.senderID === api.getCurrentUserID()) {
        await handleBotMessageReply(api, event);
    }
}

async function handleCommandReaction(api, event) {
    const { reaction, userID, messageID } = event;
    
    // Handle reactions to command messages
    // This can be used for interactive menus, polls, etc.
    
    // Load reaction handlers
    const reactionHandlers = loadReactionHandlers();
    
    for (const handler of reactionHandlers) {
        if (handler.messageID === messageID && handler.userID === userID) {
            await handler.callback(reaction);
            break;
        }
    }
}

async function handleCommandUnsend(api, event) {
    const { messageID } = event;
    
    // Handle when a command message is unsent
    // Clean up any associated data
    
    await cleanupCommandData(messageID);
}

async function handleBotMessageReply(api, event) {
    const { body, senderID, threadID, messageID, messageReply } = event;
    const originalMessage = messageReply.body;
    
    // Check if original message was a command prompt
    if (originalMessage.includes("?") || originalMessage.includes(":")) {
        // This could be a response to a command that asked for input
        await processCommandResponse(api, event);
    }
}

async function processCommandResponse(api, event) {
    const { body, senderID, threadID, messageID, messageReply } = event;
    
    // Load pending commands waiting for user input
    const pendingPath = path.join(__dirname, "../../cache/pending_commands.json");
    const pendingCommands = await fs.readJson(pendingPath).catch(() => ({}));
    
    const userKey = `${senderID}_${threadID}`;
    const pendingCommand = pendingCommands[userKey];
    
    if (pendingCommand) {
        // Process the response
        const { command, args, callback } = pendingCommand;
        
        try {
            // Execute the callback with user's response
            await callback(body);
            
            // Remove from pending
            delete pendingCommands[userKey];
            await fs.writeJson(pendingPath, pendingCommands, { spaces: 2 });
            
        } catch (error) {
            console.error("Error processing command response:", error);
            await api.sendMessage(
                `❌ Error processing response: ${error.message}`,
                threadID
            );
        }
    }
}

async function logCommandResult(api, event) {
    const { body, senderID, threadID, messageID } = event;
    
    const logData = {
        type: "command_result",
        message: body,
        senderID,
        threadID,
        messageID,
        timestamp: new Date().toISOString()
    };
    
    const logPath = path.join(__dirname, "../../logs/command_results.json");
    const existingLogs = await fs.readJson(logPath).catch(() => []);
    existingLogs.push(logData);
    
    // Keep only last 500 results
    if (existingLogs.length > 500) {
        existingLogs.splice(0, existingLogs.length - 500);
    }
    
    await fs.writeJson(logPath, existingLogs, { spaces: 2 });
}

function loadReactionHandlers() {
    try {
        const handlersPath = path.join(__dirname, "../../cache/reaction_handlers.json");
        return fs.readJsonSync(handlersPath) || [];
    } catch (error) {
        return [];
    }
}

async function cleanupCommandData(messageID) {
    try {
        // Clean up reaction handlers
        const handlersPath = path.join(__dirname, "../../cache/reaction_handlers.json");
        const handlers = await fs.readJson(handlersPath).catch(() => []);
        
        const filteredHandlers = handlers.filter(handler => handler.messageID !== messageID);
        await fs.writeJson(handlersPath, filteredHandlers, { spaces: 2 });
        
        // Clean up pending commands referencing this message
        const pendingPath = path.join(__dirname, "../../cache/pending_commands.json");
        const pendingCommands = await fs.readJson(pendingPath).catch(() => ({}));
        
        for (const [key, data] of Object.entries(pendingCommands)) {
            if (data.messageID === messageID) {
                delete pendingCommands[key];
            }
        }
        
        await fs.writeJson(pendingPath, pendingCommands, { spaces: 2 });
        
    } catch (error) {
        console.error("Error cleaning up command data:", error);
    }
}

// Utility function to wait for user response
async function waitForUserResponse(api, threadID, userID, prompt, callback, timeout = 30000) {
    const pendingPath = path.join(__dirname, "../../cache/pending_commands.json");
    const pendingCommands = await fs.readJson(pendingPath).catch(() => ({}));
    
    const userKey = `${userID}_${threadID}`;
    
    // Send prompt
    const message = await api.sendMessage(prompt, threadID);
    
    // Store pending command
    pendingCommands[userKey] = {
        command: "user_input",
        threadID,
        userID,
        messageID: message.messageID,
        callback,
        timestamp: Date.now()
    };
    
    await fs.writeJson(pendingPath, pendingCommands, { spaces: 2 });
    
    // Set timeout to clean up
    setTimeout(async () => {
        if (pendingCommands[userKey]) {
            delete pendingCommands[userKey];
            await fs.writeJson(pendingPath, pendingCommands, { spaces: 2 });
            
            // Notify user
            await api.sendMessage("⏰ Response timeout. Please try again.", threadID);
        }
    }, timeout);
}

// Export utility functions
module.exports.waitForUserResponse = waitForUserResponse;