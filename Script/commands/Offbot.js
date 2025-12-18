const fs = require('fs-extra');
const path = require('path');

module.exports = {
    config: {
        name: "offbot",
        version: "1.5",
        author: "RANA",
        countDown: 3,
        role: 2,
        shortDescription: {
            en: "Turn off the bot",
            bn: "বট বন্ধ করুন"
        },
        longDescription: {
            en: "Shutdown the bot system",
            bn: "বট সিস্টেম শাটডাউন করুন"
        },
        category: "admin",
        guide: {
            en: "{pn}",
            bn: "{pn}"
        }
    },

    onStart: async function ({ api, event, message, getLang }) {
        try {
            await message.reply(getLang("shuttingDown"));
            
            const shutdownTime = new Date().toLocaleString();
            
            const shutdownData = {
                lastShutdown: shutdownTime,
                initiatedBy: event.senderID,
                threadID: event.threadID,
                messageID: event.messageID
            };
            
            const shutdownPath = path.join(__dirname, '..', '..', 'cache', 'shutdown.json');
            fs.writeJsonSync(shutdownPath, shutdownData, { spaces: 2 });
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            process.exit(0);
            
        } catch (error) {
            await message.reply(getLang("error", { error: error.message }));
        }
    },

    langs: {
        en: {
            shuttingDown: "⚠️ Bot is shutting down...\n\nGoodbye! 👋",
            error: "❌ Error during shutdown: {error}"
        },
        bn: {
            shuttingDown: "⚠️ বট বন্ধ হচ্ছে...\n\nবিদায়! 👋",
            error: "❌ শাটডাউনে ত্রুটি: {error}"
        }
    }
};