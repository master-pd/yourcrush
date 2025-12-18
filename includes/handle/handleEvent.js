const fs = require("fs-extra");
const path = require("path");

module.exports = async function handleEvent(api, event) {
    const { type, logMessageType, threadID, senderID } = event;
    
    try {
        // Load event handlers
        const eventHandlers = loadEventHandlers();
        
        // Call global onEvent handlers
        for (const [name, handler] of Object.entries(eventHandlers)) {
            if (typeof handler.onEvent === "function") {
                try {
                    await handler.onEvent({ api, event });
                } catch (error) {
                    console.error(`Event handler error (${name}):`, error);
                }
            }
        }
        
        // Handle specific event types
        switch (type) {
            case "event":
                await handleSystemEvent(api, event);
                break;
                
            case "message":
                await handleMessageEvent(api, event);
                break;
                
            case "message_reaction":
                await handleReactionEvent(api, event);
                break;
                
            case "message_unsend":
                await handleUnsendEvent(api, event);
                break;
                
            case "typ":
                await handleTypingEvent(api, event);
                break;
                
            case "presence":
                await handlePresenceEvent(api, event);
                break;
                
            case "read_receipt":
                await handleReadReceiptEvent(api, event);
                break;
                
            default:
                await handleUnknownEvent(api, event);
                break;
        }
        
        // Handle log message events
        if (logMessageType) {
            await handleLogMessageEvent(api, event);
        }
        
    } catch (error) {
        console.error("Event handler error:", error);
    }
};

function loadEventHandlers() {
    try {
        // Load from Script/events directory
        const eventsPath = path.join(__dirname, "../../Script/events");
        const eventFiles = fs.readdirSync(eventsPath).filter(file => 
            file.endsWith(".js") && !file.startsWith("_")
        );
        
        const handlers = {};
        
        for (const file of eventFiles) {
            try {
                const filePath = path.join(eventsPath, file);
                const handler = require(filePath);
                const handlerName = file.replace(".js", "");
                
                handlers[handlerName] = handler;
                
            } catch (error) {
                console.error(`Error loading event handler ${file}:`, error);
            }
        }
        
        return handlers;
        
    } catch (error) {
        console.error("Error loading event handlers:", error);
        return {};
    }
}

async function handleSystemEvent(api, event) {
    const { logMessageData, logMessageType } = event;
    
    // System events are handled by specific handlers
    // This function just logs them
    if (logMessageType) {
        console.log(`System Event: ${logMessageType}`, logMessageData);
    }
}

async function handleMessageEvent(api, event) {
    const { body, senderID, threadID, messageID } = event;
    
    // Log message (for debugging)
    if (body && body.length > 0) {
        const shortBody = body.length > 100 ? body.substring(0, 100) + "..." : body;
        console.log(`Message: ${senderID} -> ${threadID}: ${shortBody}`);
    }
    
    // Update user activity
    await updateUserActivity(senderID, threadID);
    
    // Update thread activity
    await updateThreadActivity(threadID);
}

async function handleReactionEvent(api, event) {
    const { reaction, userID, messageID } = event;
    
    console.log(`Reaction: ${userID} reacted ${reaction} to ${messageID}`);
    
    // Store reaction data
    await storeReactionData(userID, messageID, reaction);
}

async function handleUnsendEvent(api, event) {
    const { messageID } = event;
    
    console.log(`Unsend: Message ${messageID} was unsent`);
    
    // Clean up any data associated with the unsent message
    await cleanupUnsentMessage(messageID);
}

async function handleTypingEvent(api, event) {
    const { isTyping, from, threadID } = event;
    
    // You could use this for typing indicators or analytics
    if (isTyping) {
        console.log(`Typing: ${from} is typing in ${threadID}`);
    }
}

async function handlePresenceEvent(api, event) {
    const { userID, status, timestamp } = event;
    
    console.log(`Presence: ${userID} is now ${status} at ${timestamp}`);
    
    // Update user presence in database
    await updateUserPresence(userID, status, timestamp);
}

async function handleReadReceiptEvent(api, event) {
    const { reader, time } = event;
    
    console.log(`Read Receipt: ${reader} read at ${time}`);
}

async function handleUnknownEvent(api, event) {
    const { type } = event;
    
    console.log(`Unknown Event Type: ${type}`, event);
    
    // Log unknown events for debugging
    await logUnknownEvent(event);
}

async function handleLogMessageEvent(api, event) {
    const { logMessageType, logMessageData, threadID, author } = event;
    
    switch (logMessageType) {
        case "log:subscribe":
            await handleSubscribeEvent(api, event);
            break;
            
        case "log:unsubscribe":
            await handleUnsubscribeEvent(api, event);
            break;
            
        case "log:thread-admins":
            await handleThreadAdminsEvent(api, event);
            break;
            
        case "log:thread-name":
            await handleThreadNameEvent(api, event);
            break;
            
        case "log:thread-image":
            await handleThreadImageEvent(api, event);
            break;
            
        case "log:user-nickname":
            await handleUserNicknameEvent(api, event);
            break;
            
        case "log:thread-color":
            await handleThreadColorEvent(api, event);
            break;
            
        case "log:thread-icon":
            await handleThreadIconEvent(api, event);
            break;
            
        case "log:thread-call":
            await handleThreadCallEvent(api, event);
            break;
            
        default:
            console.log(`Unhandled Log Message: ${logMessageType}`, logMessageData);
            break;
    }
}

async function handleSubscribeEvent(api, event) {
    const { logMessageData, threadID, author } = event;
    const addedParticipants = logMessageData.addedParticipants || [];
    
    if (addedParticipants.length === 0) return;
    
    // Get thread info
    const threadInfo = await api.getThreadInfo(threadID);
    const threadName = threadInfo.threadName || "Unknown Group";
    
    for (const user of addedParticipants) {
        const userID = user.userFbId;
        
        // Check if bot was added
        if (userID === api.getCurrentUserID()) {
            console.log(`🤖 Bot was added to group: ${threadName}`);
            await handleBotJoin(api, threadID, threadName, author);
            continue;
        }
        
        // Regular user joined
        console.log(`👤 User ${userID} joined ${threadName}`);
        await handleUserJoin(api, threadID, userID, author);
    }
}

async function handleUnsubscribeEvent(api, event) {
    const { logMessageData, threadID, author } = event;
    const leftParticipantFbId = logMessageData.leftParticipantFbId;
    
    if (!leftParticipantFbId) return;
    
    // Get thread info
    const threadInfo = await api.getThreadInfo(threadID);
    const threadName = threadInfo.threadName || "Unknown Group";
    
    // Check if bot left
    if (leftParticipantFbId === api.getCurrentUserID()) {
        console.log(`🤖 Bot left group: ${threadName}`);
        await handleBotLeave(api, threadID, threadName, author);
        return;
    }
    
    // Regular user left
    console.log(`👤 User ${leftParticipantFbId} left ${threadName}`);
    await handleUserLeave(api, threadID, leftParticipantFbId, author);
}

async function handleThreadAdminsEvent(api, event) {
    const { logMessageData, threadID } = event;
    const adminIDs = logMessageData.ADMIN_EVENT ? 
        Object.keys(logMessageData.ADMIN_EVENT) : 
        (logMessageData.ADMIN_IDS || []);
    
    if (adminIDs.length === 0) return;
    
    const threadInfo = await api.getThreadInfo(threadID);
    const threadName = threadInfo.threadName || "Unknown Group";
    
    console.log(`👑 Admin changes in ${threadName}:`, adminIDs);
    
    // Update admin data in database
    await updateThreadAdmins(threadID, adminIDs);
}

async function handleThreadNameEvent(api, event) {
    const { logMessageData, threadID } = event;
    const newName = logMessageData.name;
    
    if (!newName) return;
    
    console.log(`📝 Thread ${threadID} renamed to: ${newName}`);
    
    // Update thread name in database
    await updateThreadName(threadID, newName);
}

async function handleThreadImageEvent(api, event) {
    const { threadID } = event;
    
    console.log(`🖼️ Thread ${threadID} image changed`);
    
    // You could download the new image here
}

async function handleUserNicknameEvent(api, event) {
    const { logMessageData, threadID } = event;
    const participantId = logMessageData.participant_id;
    const nickname = logMessageData.nickname;
    
    if (!participantId || !nickname) return;
    
    console.log(`🏷️ User ${participantId} nickname changed to: ${nickname} in ${threadID}`);
    
    // Update nickname in database
    await updateUserNickname(threadID, participantId, nickname);
}

async function handleThreadColorEvent(api, event) {
    const { logMessageData, threadID } = event;
    const color = logMessageData.theme_color;
    
    console.log(`🎨 Thread ${threadID} color changed to: ${color}`);
}

async function handleThreadIconEvent(api, event) {
    const { logMessageData, threadID } = event;
    const emoji = logMessageData.thread_icon;
    
    console.log(`😀 Thread ${threadID} icon changed to: ${emoji}`);
}

async function handleThreadCallEvent(api, event) {
    const { logMessageData, threadID } = event;
    const callType = logMessageData.event_type;
    const callDuration = logMessageData.call_duration;
    
    console.log(`📞 Thread ${threadID} call event: ${callType} (${callDuration}s)`);
}

async function handleBotJoin(api, threadID, threadName, addedBy) {
    // Update thread data
    await updateThreadData(threadID, threadName);
    
    // Send welcome message
    const welcomeMsg = `🎉 **Thanks for adding me!**\n\n` +
                      `I'm **YOUR CRUSH BOT** 🤖\n` +
                      `Group: **${threadName}**\n\n` +
                      `Type **!help** to see all commands\n` +
                      `Type **!menu** for command categories\n\n` +
                      `👑 **Owner:** RANA (MASTER 🪓)\n` +
                      `📞 **Contact:** 01847634486`;
    
    await api.sendMessage(welcomeMsg, threadID);
    
    // Notify owner
    await notifyOwnerBotAdded(api, threadID, threadName, addedBy);
}

async function handleBotLeave(api, threadID, threadName, removedBy) {
    // Update thread status
    await updateThreadStatus(threadID, 'inactive');
    
    // Notify owner
    await notifyOwnerBotRemoved(api, threadID, threadName, removedBy);
}

async function handleUserJoin(api, threadID, userID, addedBy) {
    // Update user data
    await updateUserData(userID, threadID);
    
    // Check if welcome message should be sent
    const shouldWelcome = await shouldSendWelcome(threadID);
    
    if (shouldWelcome) {
        const userInfo = await api.getUserInfo(userID);
        const userName = userInfo[userID]?.name || "New Member";
        
        const welcomeMsg = `👋 Welcome **${userName}** to the group!\n` +
                          `We're glad to have you here! 🎉`;
        
        await api.sendMessage(welcomeMsg, threadID);
    }
}

async function handleUserLeave(api, threadID, userID, removedBy) {
    // Update user status
    await updateUserStatus(userID, threadID, 'left');
    
    // Check if user was kicked
    const wasKicked = removedBy !== userID;
    
    if (wasKicked) {
        const userInfo = await api.getUserInfo(userID);
        const userName = userInfo[userID]?.name || "Unknown User";
        
        console.log(`👢 User ${userName} was kicked by ${removedBy}`);
    }
}

// Database update functions
async function updateUserActivity(userID, threadID) {
    try {
        if (!global.db) return;
        
        const now = new Date().toISOString();
        
        await global.db.run(`
            INSERT OR REPLACE INTO users (user_id, updated_at) 
            VALUES (?, ?)
        `, [userID, now]);
        
    } catch (error) {
        console.error("Error updating user activity:", error);
    }
}

async function updateThreadActivity(threadID) {
    try {
        if (!global.db) return;
        
        const now = new Date().toISOString();
        
        await global.db.run(`
            INSERT OR REPLACE INTO threads (thread_id, updated_at) 
            VALUES (?, ?)
        `, [threadID, now]);
        
    } catch (error) {
        console.error("Error updating thread activity:", error);
    }
}

async function updateUserPresence(userID, status, timestamp) {
    // Implement user presence tracking
}

async function updateThreadData(threadID, threadName) {
    try {
        if (!global.db) return;
        
        const now = new Date().toISOString();
        
        await global.db.run(`
            INSERT OR REPLACE INTO threads (thread_id, name, updated_at) 
            VALUES (?, ?, ?)
        `, [threadID, threadName, now]);
        
    } catch (error) {
        console.error("Error updating thread data:", error);
    }
}

async function updateThreadStatus(threadID, status) {
    try {
        if (!global.db) return;
        
        const settings = JSON.stringify({ status });
        
        await global.db.run(`
            UPDATE threads SET settings = ? WHERE thread_id = ?
        `, [settings, threadID]);
        
    } catch (error) {
        console.error("Error updating thread status:", error);
    }
}

async function updateUserData(userID, threadID) {
    try {
        if (!global.db) return;
        
        const now = new Date().toISOString();
        
        // Get user info from Facebook
        const userInfo = await api.getUserInfo(userID);
        const userName = userInfo[userID]?.name || null;
        
        await global.db.run(`
            INSERT OR REPLACE INTO users (user_id, name, updated_at) 
            VALUES (?, ?, ?)
        `, [userID, userName, now]);
        
    } catch (error) {
        console.error("Error updating user data:", error);
    }
}

async function updateUserStatus(userID, threadID, status) {
    // Implement user status tracking
}

async function updateThreadAdmins(threadID, adminIDs) {
    try {
        if (!global.db) return;
        
        const settings = JSON.stringify({ admins: adminIDs });
        
        await global.db.run(`
            UPDATE threads SET settings = ? WHERE thread_id = ?
        `, [settings, threadID]);
        
    } catch (error) {
        console.error("Error updating thread admins:", error);
    }
}

async function updateThreadName(threadID, name) {
    try {
        if (!global.db) return;
        
        await global.db.run(`
            UPDATE threads SET name = ? WHERE thread_id = ?
        `, [name, threadID]);
        
    } catch (error) {
        console.error("Error updating thread name:", error);
    }
}

async function updateUserNickname(threadID, userID, nickname) {
    // Implement nickname tracking
}

async function storeReactionData(userID, messageID, reaction) {
    try {
        const reactionsPath = path.join(__dirname, "../../cache/reactions.json");
        const reactions = await fs.readJson(reactionsPath).catch(() => []);
        
        reactions.push({
            userID,
            messageID,
            reaction,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 1000 reactions
        if (reactions.length > 1000) {
            reactions.splice(0, reactions.length - 1000);
        }
        
        await fs.writeJson(reactionsPath, reactions, { spaces: 2 });
        
    } catch (error) {
        console.error("Error storing reaction data:", error);
    }
}

async function cleanupUnsentMessage(messageID) {
    // Clean up any data associated with the message
}

async function logUnknownEvent(event) {
    try {
        const logPath = path.join(__dirname, "../../logs/unknown_events.json");
        const logs = await fs.readJson(logPath).catch(() => []);
        
        logs.push({
            ...event,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 100 logs
        if (logs.length > 100) {
            logs.splice(0, logs.length - 100);
        }
        
        await fs.writeJson(logPath, logs, { spaces: 2 });
        
    } catch (error) {
        console.error("Error logging unknown event:", error);
    }
}

async function shouldSendWelcome(threadID) {
    try {
        if (!global.db) return true;
        
        const row = await global.db.get(`
            SELECT settings FROM threads WHERE thread_id = ?
        `, [threadID]);
        
        if (!row || !row.settings) return true;
        
        const settings = JSON.parse(row.settings);
        return settings.welcome !== false;
        
    } catch (error) {
        console.error("Error checking welcome setting:", error);
        return true;
    }
}

async function notifyOwnerBotAdded(api, threadID, threadName, addedBy) {
    try {
        const owners = global.config?.ADMINS || [];
        
        for (const ownerID of owners) {
            try {
                const msg = `👑 **Bot Added to Group**\n\n` +
                           `Group: ${threadName}\n` +
                           `Thread ID: ${threadID}\n` +
                           `Added by: ${addedBy}\n` +
                           `Time: ${new Date().toLocaleString()}`;
                
                await api.sendMessage(msg, ownerID);
            } catch (error) {
                console.error("Failed to notify owner:", error);
            }
        }
    } catch (error) {
        console.error("Error notifying owner:", error);
    }
}

async function notifyOwnerBotRemoved(api, threadID, threadName, removedBy) {
    try {
        const owners = global.config?.ADMINS || [];
        
        for (const ownerID of owners) {
            try {
                const msg = `🚫 **Bot Removed from Group**\n\n` +
                           `Group: ${threadName}\n` +
                           `Thread ID: ${threadID}\n` +
                           `Removed by: ${removedBy}\n` +
                           `Time: ${new Date().toLocaleString()}`;
                
                await api.sendMessage(msg, ownerID);
            } catch (error) {
                console.error("Failed to notify owner:", error);
            }
        }
    } catch (error) {
        console.error("Error notifying owner:", error);
    }
}

// Export utility functions
module.exports.loadEventHandlers = loadEventHandlers;
module.exports.handleSubscribeEvent = handleSubscribeEvent;
module.exports.handleUnsubscribeEvent = handleUnsubscribeEvent;