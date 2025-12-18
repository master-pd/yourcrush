const fs = require("fs-extra");
const path = require("path");

module.exports = async function handleReaction(api, event) {
    const { reaction, userID, messageID } = event;
    
    try {
        // Load reaction handlers
        const reactionHandlers = loadReactionHandlers();
        
        // Check for registered handlers for this message
        const handlers = reactionHandlers.filter(h => h.messageID === messageID);
        
        for (const handler of handlers) {
            try {
                if (typeof handler.callback === "function") {
                    await handler.callback({
                        api,
                        event,
                        reaction,
                        userID,
                        messageID
                    });
                }
            } catch (error) {
                console.error("Reaction handler error:", error);
            }
        }
        
        // Handle automatic reactions
        await handleAutomaticReactions(api, event);
        
        // Log reaction
        await logReaction(userID, messageID, reaction);
        
    } catch (error) {
        console.error("Reaction handling error:", error);
    }
};

function loadReactionHandlers() {
    try {
        const handlersPath = path.join(__dirname, "../../cache/reaction_handlers.json");
        return fs.readJsonSync(handlersPath) || [];
    } catch (error) {
        return [];
    }
}

async function handleAutomaticReactions(api, event) {
    const { reaction, userID, messageID } = event;
    
    // Get message info
    const messageInfo = await api.getMessageInfo(messageID).catch(() => null);
    
    if (!messageInfo) return;
    
    const { senderID, body } = messageInfo;
    
    // Check if message is from bot
    if (senderID !== api.getCurrentUserID()) return;
    
    // Handle specific reaction patterns
    if (reaction === "❤️") {
        // User loved the bot's message
        await handleLoveReaction(api, event, userID, messageID, body);
    }
    else if (reaction === "😂") {
        // User found the message funny
        await handleFunnyReaction(api, event, userID, messageID, body);
    }
    else if (reaction === "😮") {
        // User is surprised
        await handleSurpriseReaction(api, event, userID, messageID, body);
    }
    else if (reaction === "😢") {
        // User is sad
        await handleSadReaction(api, event, userID, messageID, body);
    }
    else if (reaction === "👍") {
        // User agrees/likes
        await handleLikeReaction(api, event, userID, messageID, body);
    }
    else if (reaction === "👎") {
        // User disagrees/dislikes
        await handleDislikeReaction(api, event, userID, messageID, body);
    }
}

async function handleLoveReaction(api, event, userID, messageID, body) {
    const userInfo = await api.getUserInfo(userID);
    const userName = userInfo[userID]?.name || "User";
    
    // Send thank you message
    const responses = [
        `Thank you for the love, ${userName}! ❤️`,
        `Aww, thanks ${userName}! 😊`,
        `Love received from ${userName}! ❤️`,
        `You're awesome, ${userName}! Thanks for the love!`
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    await api.sendMessage(randomResponse, event.threadID);
    
    // Give love points
    await giveLovePoints(userID, 1);
}

async function handleFunnyReaction(api, event, userID, messageID, body) {
    const userInfo = await api.getUserInfo(userID);
    const userName = userInfo[userID]?.name || "User";
    
    const responses = [
        `Glad I could make you laugh, ${userName}! 😄`,
        `Haha, thanks ${userName}!`,
        `I aim to please! 😂`,
        `You have a great sense of humor, ${userName}!`
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    await api.sendMessage(randomResponse, event.threadID);
}

async function handleSurpriseReaction(api, event, userID, messageID, body) {
    const userInfo = await api.getUserInfo(userID);
    const userName = userInfo[userID]?.name || "User";
    
    const responses = [
        `Surprised, ${userName}? 😮`,
        `I know, right? Amazing!`,
        `Wait until you see what else I can do!`,
        `Surprise! 🎉`
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    await api.sendMessage(randomResponse, event.threadID);
}

async function handleSadReaction(api, event, userID, messageID, body) {
    const userInfo = await api.getUserInfo(userID);
    const userName = userInfo[userID]?.name || "User";
    
    const responses = [
        `Don't be sad, ${userName}! 🫂`,
        `Cheer up! 😊`,
        `I'm here for you, ${userName}!`,
        `Want to talk about it?`
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    await api.sendMessage(randomResponse, event.threadID);
}

async function handleLikeReaction(api, event, userID, messageID, body) {
    const userInfo = await api.getUserInfo(userID);
    const userName = userInfo[userID]?.name || "User";
    
    const responses = [
        `Thanks for the thumbs up, ${userName}! 👍`,
        `Appreciate it, ${userName}!`,
        `Glad you agree!`,
        `You have good taste, ${userName}!`
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    await api.sendMessage(randomResponse, event.threadID);
    
    // Give positive feedback points
    await giveFeedbackPoints(userID, 1);
}

async function handleDislikeReaction(api, event, userID, messageID, body) {
    const userInfo = await api.getUserInfo(userID);
    const userName = userInfo[userID]?.name || "User";
    
    const responses = [
        `Sorry you didn't like that, ${userName}.`,
        `I'll try to do better next time.`,
        `Noted. Thanks for the feedback.`,
        `Your feedback helps me improve!`
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    await api.sendMessage(randomResponse, event.threadID);
    
    // Log negative feedback
    await logNegativeFeedback(userID, body);
}

async function giveLovePoints(userID, points) {
    try {
        if (!global.db) return;
        
        await global.db.run(`
            UPDATE users SET money = money + ? WHERE user_id = ?
        `, [points * 10, userID]);
        
    } catch (error) {
        console.error("Error giving love points:", error);
    }
}

async function giveFeedbackPoints(userID, points) {
    try {
        if (!global.db) return;
        
        await global.db.run(`
            UPDATE users SET exp = exp + ? WHERE user_id = ?
        `, [points * 5, userID]);
        
    } catch (error) {
        console.error("Error giving feedback points:", error);
    }
}

async function logNegativeFeedback(userID, message) {
    try {
        const logPath = path.join(__dirname, "../../logs/negative_feedback.json");
        const logs = await fs.readJson(logPath).catch(() => []);
        
        logs.push({
            userID,
            message,
            timestamp: new Date().toISOString()
        });
        
        await fs.writeJson(logPath, logs, { spaces: 2 });
        
    } catch (error) {
        console.error("Error logging negative feedback:", error);
    }
}

async function logReaction(userID, messageID, reaction) {
    try {
        const logPath = path.join(__dirname, "../../logs/reactions.json");
        const logs = await fs.readJson(logPath).catch(() => []);
        
        logs.push({
            userID,
            messageID,
            reaction,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 1000 reactions
        if (logs.length > 1000) {
            logs.splice(0, logs.length - 1000);
        }
        
        await fs.writeJson(logPath, logs, { spaces: 2 });
        
    } catch (error) {
        console.error("Error logging reaction:", error);
    }
}

// Register a reaction handler
module.exports.registerReactionHandler = function(messageID, userID, callback, timeout = 30000) {
    try {
        const handlersPath = path.join(__dirname, "../../cache/reaction_handlers.json");
        const handlers = fs.readJsonSync(handlersPath) || [];
        
        const handler = {
            messageID,
            userID,
            callback,
            timestamp: Date.now(),
            expires: Date.now() + timeout
        };
        
        handlers.push(handler);
        fs.writeJsonSync(handlersPath, handlers, { spaces: 2 });
        
        // Clean up after timeout
        setTimeout(() => {
            removeReactionHandler(messageID, userID);
        }, timeout);
        
    } catch (error) {
        console.error("Error registering reaction handler:", error);
    }
};

function removeReactionHandler(messageID, userID) {
    try {
        const handlersPath = path.join(__dirname, "../../cache/reaction_handlers.json");
        const handlers = fs.readJsonSync(handlersPath) || [];
        
        const filteredHandlers = handlers.filter(h => 
            !(h.messageID === messageID && h.userID === userID)
        );
        
        fs.writeJsonSync(handlersPath, filteredHandlers, { spaces: 2 });
        
    } catch (error) {
        console.error("Error removing reaction handler:", error);
    }
}

// Clear expired handlers
module.exports.cleanupExpiredHandlers = function() {
    try {
        const handlersPath = path.join(__dirname, "../../cache/reaction_handlers.json");
        const handlers = fs.readJsonSync(handlersPath) || [];
        
        const now = Date.now();
        const activeHandlers = handlers.filter(h => h.expires > now);
        
        if (activeHandlers.length !== handlers.length) {
            fs.writeJsonSync(handlersPath, activeHandlers, { spaces: 2 });
            console.log(`Cleaned up ${handlers.length - activeHandlers.length} expired reaction handlers`);
        }
        
    } catch (error) {
        console.error("Error cleaning up expired handlers:", error);
    }
};