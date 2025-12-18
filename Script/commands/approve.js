module.exports = {
    config: {
        name: "approve",
        version: "2.0",
        author: "RANA",
        role: 2,
        category: "admin",
        shortDescription: {
            en: "Approve thread for bot usage",
            bn: "বট ব্যবহারের জন্য থ্রেড অনুমোদন করুন"
        },
        longDescription: {
            en: "Approve or disapprove threads to use the bot. Can also list approved threads.",
            bn: "বট ব্যবহার করার জন্য থ্রেড অনুমোদন বা অননুমোদন করুন। অনুমোদিত থ্রেড তালিকাও দেখাতে পারেন।"
        },
        guide: {
            en: "{pn} list | {pn} add [threadID] | {pn} remove [threadID]",
            bn: "{pn} list | {pn} add [threadID] | {pn} remove [threadID]"
        },
        cooldown: 5
    },

    onStart: async function({ api, event, args, config }) {
        try {
            const { threadID, messageID, senderID } = event;
            
            // Check if user is admin
            if (!config.admins.includes(senderID)) {
                return api.sendMessage(
                    "❌ Only bot admins can use this command.",
                    threadID,
                    messageID
                );
            }
            
            if (args.length === 0) {
                return showApproveHelp(api, threadID, messageID, config);
            }
            
            const action = args[0].toLowerCase();
            
            switch (action) {
                case 'list':
                    await showApprovedThreads(api, threadID, messageID);
                    break;
                    
                case 'add':
                case 'approve':
                    if (args.length < 2) {
                        return api.sendMessage(
                            "❌ Please provide a thread ID to approve.\n" +
                            "Example: .approve add 1234567890123456",
                            threadID,
                            messageID
                        );
                    }
                    await approveThread(api, threadID, messageID, args[1]);
                    break;
                    
                case 'remove':
                case 'disapprove':
                case 'delete':
                    if (args.length < 2) {
                        return api.sendMessage(
                            "❌ Please provide a thread ID to remove.\n" +
                            "Example: .approve remove 1234567890123456",
                            threadID,
                            messageID
                        );
                    }
                    await disapproveThread(api, threadID, messageID, args[1]);
                    break;
                    
                default:
                    return showApproveHelp(api, threadID, messageID, config);
            }
            
        } catch (error) {
            console.error(error);
            api.sendMessage(
                "❌ Approve command failed.",
                event.threadID,
                event.messageID
            );
        }
    }
};

async function showApproveHelp(api, threadID, messageID, config) {
    const helpMessage = `
✅ **THREAD APPROVAL SYSTEM** ✅

📋 **Available Commands:**
• ${config.prefix}approve list - Show all approved threads
• ${config.prefix}approve add [threadID] - Approve a thread
• ${config.prefix}approve remove [threadID] - Remove approval

📝 **Usage Examples:**
• ${config.prefix}approve list
• ${config.prefix}approve add 1234567890123456
• ${config.prefix}approve remove 1234567890123456

🔰 **Note:** When thread approval is enabled, only approved threads can use the bot.
    `;
    
    api.sendMessage(helpMessage, threadID, messageID);
}

async function showApprovedThreads(api, threadID, messageID) {
    try {
        const fs = require('fs');
        const path = require('path');
        
        const approvedPath = path.join(__dirname, '../../includes/database/master/approvedThreads.json');
        
        let approvedThreads = [];
        
        if (fs.existsSync(approvedPath)) {
            approvedThreads = JSON.parse(fs.readFileSync(approvedPath, 'utf8'));
        }
        
        if (approvedThreads.length === 0) {
            return api.sendMessage(
                "📭 No approved threads found. All threads can use the bot.",
                threadID,
                messageID
            );
        }
        
        let message = "✅ **APPROVED THREADS LIST** ✅\n\n";
        message += `📊 Total Approved: ${approvedThreads.length}\n\n`;
        
        // Get thread names
        for (let i = 0; i < approvedThreads.length; i++) {
            const threadId = approvedThreads[i];
            
            try {
                const threadInfo = await api.getThreadInfo(threadId);
                const threadName = threadInfo.name || `Thread_${threadId}`;
                
                message += `${i + 1}. ${threadName}\n`;
                message += `   ID: ${threadId}\n`;
                message += `   Participants: ${threadInfo.participantIDs.length}\n\n`;
            } catch (error) {
                message += `${i + 1}. Unknown Thread\n`;
                message += `   ID: ${threadId}\n`;
                message += `   Status: Cannot fetch info\n\n`;
            }
        }
        
        message += `🔰 Note: Only these threads can use the bot when approval is enabled.`;
        
        api.sendMessage(message, threadID, messageID);
        
    } catch (error) {
        console.error(error);
        api.sendMessage(
            "❌ Failed to retrieve approved threads list.",
            threadID,
            messageID
        );
    }
}

async function approveThread(api, threadID, messageID, targetThreadID) {
    try {
        // Validate thread ID
        if (!/^\d+$/.test(targetThreadID)) {
            return api.sendMessage(
                "❌ Invalid thread ID. Please provide a numeric ID.",
                threadID,
                messageID
            );
        }
        
        const fs = require('fs');
        const path = require('path');
        
        const approvedPath = path.join(__dirname, '../../includes/database/master/approvedThreads.json');
        const pendingPath = path.join(__dirname, '../../includes/database/master/pendingThreads.json');
        
        // Create directories if they don't exist
        const dirPath = path.dirname(approvedPath);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        
        // Load existing approved threads
        let approvedThreads = [];
        if (fs.existsSync(approvedPath)) {
            approvedThreads = JSON.parse(fs.readFileSync(approvedPath, 'utf8'));
        }
        
        // Check if already approved
        if (approvedThreads.includes(targetThreadID)) {
            return api.sendMessage(
                "❌ This thread is already approved.",
                threadID,
                messageID
            );
        }
        
        // Get thread info
        let threadName;
        try {
            const threadInfo = await api.getThreadInfo(targetThreadID);
            threadName = threadInfo.name || `Thread_${targetThreadID}`;
        } catch (error) {
            threadName = `Thread_${targetThreadID}`;
        }
        
        // Add to approved list
        approvedThreads.push(targetThreadID);
        
        // Remove from pending if exists
        let pendingThreads = [];
        if (fs.existsSync(pendingPath)) {
            pendingThreads = JSON.parse(fs.readFileSync(pendingPath, 'utf8'));
            const pendingIndex = pendingThreads.indexOf(targetThreadID);
            if (pendingIndex > -1) {
                pendingThreads.splice(pendingIndex, 1);
                fs.writeFileSync(pendingPath, JSON.stringify(pendingThreads, null, 2));
            }
        }
        
        // Save approved threads
        fs.writeFileSync(approvedPath, JSON.stringify(approvedThreads, null, 2));
        
        // Send confirmation
        const message = `
✅ **THREAD APPROVED SUCCESSFULLY**

💬 **Thread:** ${threadName}
🆔 **ID:** ${targetThreadID}
📊 **Total Approved:** ${approvedThreads.length}

🔰 The thread can now use the bot.
        `;
        
        api.sendMessage(message, threadID, messageID);
        
        // Notify the thread if possible
        try {
            api.sendMessage(
                `🎉 This thread has been approved to use ${global.config.botInfo.name} bot!\n\n` +
                `You can now use all bot commands with prefix "${global.config.prefix}".\n` +
                `Use "${global.config.prefix}help" to see available commands.`,
                targetThreadID
            );
        } catch (notifyError) {
            // Can't notify, but that's okay
        }
        
    } catch (error) {
        console.error(error);
        api.sendMessage(
            "❌ Failed to approve thread. Make sure the thread ID is correct.",
            threadID,
            messageID
        );
    }
}

async function disapproveThread(api, threadID, messageID, targetThreadID) {
    try {
        // Validate thread ID
        if (!/^\d+$/.test(targetThreadID)) {
            return api.sendMessage(
                "❌ Invalid thread ID. Please provide a numeric ID.",
                threadID,
                messageID
            );
        }
        
        const fs = require('fs');
        const path = require('path');
        
        const approvedPath = path.join(__dirname, '../../includes/database/master/approvedThreads.json');
        
        // Check if file exists
        if (!fs.existsSync(approvedPath)) {
            return api.sendMessage(
                "❌ No approved threads found.",
                threadID,
                messageID
            );
        }
        
        // Load approved threads
        let approvedThreads = JSON.parse(fs.readFileSync(approvedPath, 'utf8'));
        
        // Check if thread is approved
        const threadIndex = approvedThreads.indexOf(targetThreadID);
        if (threadIndex === -1) {
            return api.sendMessage(
                "❌ This thread is not approved.",
                threadID,
                messageID
            );
        }
        
        // Get thread info before removing
        let threadName;
        try {
            const threadInfo = await api.getThreadInfo(targetThreadID);
            threadName = threadInfo.name || `Thread_${targetThreadID}`;
        } catch (error) {
            threadName = `Thread_${targetThreadID}`;
        }
        
        // Remove from approved list
        approvedThreads.splice(threadIndex, 1);
        
        // Save updated list
        fs.writeFileSync(approvedPath, JSON.stringify(approvedThreads, null, 2));
        
        // Send confirmation
        const message = `
✅ **THREAD DISAPPROVED SUCCESSFULLY**

💬 **Thread:** ${threadName}
🆔 **ID:** ${targetThreadID}
📊 **Total Approved:** ${approvedThreads.length}

🔰 The thread can no longer use the bot.
        `;
        
        api.sendMessage(message, threadID, messageID);
        
    } catch (error) {
        console.error(error);
        api.sendMessage(
            "❌ Failed to disapprove thread.",
            threadID,
            messageID
        );
    }
}
