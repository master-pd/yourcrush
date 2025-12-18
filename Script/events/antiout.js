module.exports = {
    config: {
        name: "antiout",
        version: "1.0.0",
        description: "Prevent users from leaving group",
        author: "RANA",
        category: "events"
    },

    onEvent: async function({ api, event }) {
        try {
            if (event.logMessageType === "log:unsubscribe") {
                const { threadID, logMessageData, author } = event;
                const leftParticipantFbId = logMessageData.leftParticipantFbId;
                
                if (!leftParticipantFbId) return;
                
                // Get thread info
                const threadInfo = await api.getThreadInfo(threadID);
                const threadName = threadInfo.threadName || "Group";
                
                // Get user info
                const userInfo = await api.getUserInfo(leftParticipantFbId);
                const userName = userInfo[leftParticipantFbId]?.name || "Unknown User";
                
                // Check if user was kicked or left voluntarily
                const wasKicked = author !== leftParticipantFbId;
                
                if (!wasKicked) {
                    // User left voluntarily - try to add back
                    try {
                        await api.addUserToGroup(leftParticipantFbId, threadID);
                        
                        // Send welcome back message
                        const welcomeMsg = `🎉 **Welcome Back ${userName}!**\n\n` +
                                          `You tried to leave, but we brought you back! 😄\n` +
                                          `This group needs you! Stay with us. ❤️`;
                        
                        api.sendMessage(welcomeMsg, threadID);
                        
                        // Log the event
                        console.log(`User ${userName} was added back to ${threadName}`);
                        
                    } catch (addError) {
                        console.error("Failed to add user back:", addError);
                        
                        // Notify admins
                        const adminMsg = `⚠️ **User Left Group**\n\n` +
                                        `User: **${userName}**\n` +
                                        `ID: ${leftParticipantFbId}\n` +
                                        `Group: ${threadName}\n\n` +
                                        `Could not add back automatically.`;
                        
                        // Send to all admins
                        const adminIDs = threadInfo.adminIDs?.map(admin => admin.id) || [];
                        for (const adminID of adminIDs) {
                            if (adminID !== api.getCurrentUserID()) {
                                try {
                                    api.sendMessage(adminMsg, adminID);
                                } catch (e) {
                                    console.error("Failed to notify admin:", e);
                                }
                            }
                        }
                    }
                } else {
                    // User was kicked - just log
                    const kickMsg = `👢 **User Kicked**\n\n` +
                                   `User: **${userName}**\n` +
                                   `Kicked by: ${author}\n` +
                                   `Group: ${threadName}`;
                    
                    console.log(kickMsg);
                }
            }
            
        } catch (error) {
            console.error("Anti-out error:", error);
        }
    },

    onMessage: async function({ api, event }) {
        // Handle anti-out commands
        const { threadID, senderID, body } = event;
        
        if (body && body.startsWith(global.config?.prefix || "!")) {
            const args = body.slice((global.config?.prefix || "!").length).trim().split(" ");
            const command = args.shift().toLowerCase();
            
            if (command === "antiout") {
                // Check if user is admin
                const threadInfo = await api.getThreadInfo(threadID);
                const isAdmin = threadInfo.adminIDs?.some(admin => admin.id === senderID);
                
                if (!isAdmin) {
                    api.sendMessage("❌ Admin only command.", threadID);
                    return;
                }
                
                const action = args[0];
                
                if (action === "info") {
                    const infoMsg = `🛡️ **Anti-Out Protection**\n\n` +
                                   `• Prevents users from leaving group\n` +
                                   `• Automatically adds them back\n` +
                                   `• Notifies admins if fails\n` +
                                   `• Currently: **Active**`;
                    
                    api.sendMessage(infoMsg, threadID);
                }
            }
        }
    }
};