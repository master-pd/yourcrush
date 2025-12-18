module.exports = {
    config: {
        name: "say",
        version: "1.0",
        author: "RANA",
        role: 0,
        category: "fun",
        shortDescription: {
            en: "Make the bot say something",
            bn: "বটকে কিছু বলান"
        },
        longDescription: {
            en: "Makes the bot repeat your message",
            bn: "বট আপনার বার্তা পুনরাবৃত্তি করে"
        },
        guide: {
            en: "{pn} [text]",
            bn: "{pn} [টেক্সট]"
        },
        cooldown: 5
    },

    onStart: async function({ api, event, args }) {
        try {
            const { threadID, messageID } = event;
            
            if (!args.length) {
                return api.sendMessage(
                    "📝 Please provide a message for me to say.\nExample: .say Hello everyone!",
                    threadID,
                    messageID
                );
            }
            
            const text = args.join(" ");
            
            // Check for spam/long messages
            if (text.length > 2000) {
                return api.sendMessage(
                    "❌ Message is too long. Maximum 2000 characters allowed.",
                    threadID,
                    messageID
                );
            }
            
            // Send the message
            api.sendMessage(text, threadID, messageID);
            
        } catch (error) {
            console.error(error);
            api.sendMessage(
                "❌ Failed to send message.",
                event.threadID,
                event.messageID
            );
        }
    }
};