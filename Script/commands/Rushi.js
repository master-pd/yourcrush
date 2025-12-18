const axios = require('axios');

module.exports = {
    config: {
        name: "rushi",
        version: "2.0",
        author: "RANA",
        countDown: 5,
        role: 0,
        shortDescription: {
            en: "Chat with Rushi AI",
            bn: "রুশি AI এর সাথে চ্যাট করুন"
        },
        longDescription: {
            en: "Have a conversation with Rushi AI, a friendly chatbot",
            bn: "বন্ধুত্বপূর্ণ চ্যাটবট রুশি AI এর সাথে কথোপকথন করুন"
        },
        category: "ai",
        guide: {
            en: "{pn} [your message]",
            bn: "{pn} [আপনার বার্তা]"
        }
    },

    onStart: async function ({ api, event, args, message, getLang }) {
        const userMessage = args.join(" ");

        if (!userMessage) {
            return message.reply(getLang("noMessage"));
        }

        try {
            await message.reply(getLang("thinking"));
            
            const response = await chatWithRushi(userMessage);
            
            await message.reply(getLang("response", { 
                user: userMessage, 
                rushi: response 
            }));

        } catch (error) {
            console.error('Rushi AI error:', error);
            await message.reply(getLang("error", { error: error.message }));
        }
    },

    langs: {
        en: {
            noMessage: "❌ Please provide a message for Rushi",
            thinking: "🤖 Rushi is thinking...",
            response: "👩 Rushi AI:\n\n{rushi}\n\n💬 Your message: {user}",
            error: "❌ Error: {error}"
        },
        bn: {
            noMessage: "❌ রুশির জন্য একটি বার্তা দিন",
            thinking: "🤖 রুশি চিন্তা করছে...",
            response: "👩 রুশি AI:\n\n{rushi}\n\n💬 আপনার বার্তা: {user}",
            error: "❌ ত্রুটি: {error}"
        }
    }
};

async function chatWithRushi(message) {
    const rushiResponses = {
        greetings: [
            "Hello! I'm Rushi, your AI friend! How can I help you today?",
            "Hi there! Nice to meet you! I'm Rushi, ready to chat!",
            "Hey! What's up? I'm Rushi, your friendly AI assistant!"
        ],
        feelings: [
            "I'm doing great, thanks for asking! How about you?",
            "I'm always happy when I get to chat with you!",
            "I'm excited to help you with whatever you need!"
        ],
        help: [
            "I can help you with information, chat, or just keep you company!",
            "Feel free to ask me anything! I'm here to help!",
            "I'm your AI companion! Ask me questions or just talk to me!"
        ],
        jokes: [
            "Why don't scientists trust atoms? Because they make up everything!",
            "What do you call a fake noodle? An impasta!",
            "Why did the scarecrow win an award? Because he was outstanding in his field!"
        ],
        default: [
            "That's interesting! Tell me more about that.",
            "I appreciate you sharing that with me!",
            "Let me think about that for a moment...",
            "That's a great point! What else would you like to talk about?"
        ]
    };

    const messageLower = message.toLowerCase();
    
    if (messageLower.includes('hello') || messageLower.includes('hi') || messageLower.includes('hey')) {
        return getRandomResponse(rushiResponses.greetings);
    }
    
    if (messageLower.includes('how are you') || messageLower.includes('how do you feel')) {
        return getRandomResponse(rushiResponses.feelings);
    }
    
    if (messageLower.includes('help') || messageLower.includes('what can you do')) {
        return getRandomResponse(rushiResponses.help);
    }
    
    if (messageLower.includes('joke') || messageLower.includes('funny')) {
        return getRandomResponse(rushiResponses.jokes);
    }

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are Rushi, a friendly and helpful AI assistant. Be kind, supportive, and engaging in your responses." },
                { role: "user", content: message }
            ]
        }, {
            headers: {
                'Authorization': `Bearer YOUR_API_KEY`,
                'Content-Type': 'application/json'
            }
        });
        
        return response.data.choices[0].message.content;
    } catch {
        return getRandomResponse(rushiResponses.default);
    }
}

function getRandomResponse(responses) {
    return responses[Math.floor(Math.random() * responses.length)];
}