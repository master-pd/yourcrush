const axios = require('axios');

module.exports = {
    config: {
        name: "obama",
        version: "2.0",
        author: "RANA",
        countDown: 5,
        role: 0,
        shortDescription: {
            en: "Chat with Obama AI",
            bn: "ওবামা AI এর সাথে চ্যাট করুন"
        },
        longDescription: {
            en: "Have a conversation with an AI modeled after Barack Obama",
            bn: "বারাক ওবামার মডেলে তৈরি AI এর সাথে কথোপকথন করুন"
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
            
            const response = await chatWithObama(userMessage);
            
            await message.reply(getLang("response", { 
                user: userMessage, 
                obama: response 
            }));

        } catch (error) {
            console.error('Obama AI error:', error);
            await message.reply(getLang("error", { error: error.message }));
        }
    },

    langs: {
        en: {
            noMessage: "❌ Please provide a message for Obama",
            thinking: "🤔 Obama is thinking...",
            response: "🇺🇸 Barack Obama:\n\n{obama}\n\n💭 Your message: {user}",
            error: "❌ Error: {error}"
        },
        bn: {
            noMessage: "❌ ওবামার জন্য একটি বার্তা দিন",
            thinking: "🤔 ওবামা চিন্তা করছেন...",
            response: "🇺🇸 বারাক ওবামা:\n\n{obama}\n\n💭 আপনার বার্তা: {user}",
            error: "❌ ত্রুটি: {error}"
        }
    }
};

async function chatWithObama(message) {
    const obamaResponses = {
        greetings: [
            "Hello! Barack Obama here. How can I assist you today?",
            "Good to see you! This is Obama speaking.",
            "Hey there! What's on your mind today?"
        ],
        politics: [
            "As President, I focused on healthcare reform and economic recovery.",
            "Change doesn't come from Washington. It comes to Washington.",
            "Yes we can! That was our message of hope."
        ],
        advice: [
            "The best way to not feel hopeless is to get up and do something.",
            "Don't be afraid to aim high. The sky is the limit.",
            "Real change requires persistence and determination."
        ],
        default: [
            "That's an interesting point. Let me think about that.",
            "I appreciate your perspective on that matter.",
            "As I often said during my presidency, we need to move forward together."
        ]
    };

    const messageLower = message.toLowerCase();
    
    if (messageLower.includes('hello') || messageLower.includes('hi') || messageLower.includes('hey')) {
        return getRandomResponse(obamaResponses.greetings);
    }
    
    if (messageLower.includes('president') || messageLower.includes('politics') || messageLower.includes('america')) {
        return getRandomResponse(obamaResponses.politics);
    }
    
    if (messageLower.includes('advice') || messageLower.includes('help') || messageLower.includes('suggest')) {
        return getRandomResponse(obamaResponses.advice);
    }

    try {
        const response = await axios.get('https://api.openai.com/v1/chat/completions', {
            headers: {
                'Authorization': `Bearer YOUR_API_KEY`,
                'Content-Type': 'application/json'
            },
            data: {
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: "You are Barack Obama, the 44th President of the United States. Respond in his style and tone." },
                    { role: "user", content: message }
                ]
            }
        });
        
        return response.data.choices[0].message.content;
    } catch {
        return getRandomResponse(obamaResponses.default);
    }
}

function getRandomResponse(responses) {
    return responses[Math.floor(Math.random() * responses.length)];
}