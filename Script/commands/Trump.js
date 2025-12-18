const axios = require('axios');

module.exports = {
    config: {
        name: "trump",
        version: "2.0",
        author: "RANA",
        countDown: 5,
        role: 0,
        shortDescription: {
            en: "Chat with Donald Trump AI",
            bn: "ডোনাল্ড ট্রাম্প AI এর সাথে চ্যাট করুন"
        },
        longDescription: {
            en: "Have a conversation with an AI modeled after Donald Trump",
            bn: "ডোনাল্ড ট্রাম্পের মডেলে তৈরি AI এর সাথে কথোপকথন করুন"
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
            
            const response = await chatWithTrump(userMessage);
            
            await message.reply(getLang("response", { 
                user: userMessage, 
                trump: response 
            }));

        } catch (error) {
            console.error('Trump AI error:', error);
            await message.reply(getLang("error", { error: error.message }));
        }
    },

    langs: {
        en: {
            noMessage: "❌ Please provide a message for Trump",
            thinking: "🤔 Trump is thinking...",
            response: "🇺🇸 Donald Trump:\n\n{trump}\n\n💭 Your message: {user}",
            error: "❌ Error: {error}"
        },
        bn: {
            noMessage: "❌ ট্রাম্পের জন্য একটি বার্তা দিন",
            thinking: "🤔 ট্রাম্প চিন্তা করছেন...",
            response: "🇺🇸 ডোনাল্ড ট্রাম্প:\n\n{trump}\n\n💭 আপনার বার্তা: {user}",
            error: "❌ ত্রুটি: {error}"
        }
    }
};

async function chatWithTrump(message) {
    const trumpResponses = {
        greetings: [
            "Hello! Donald Trump here. I'm the best, believe me!",
            "Great to see you! Nobody does it better than me!",
            "Hey! Trump speaking. Let's make America great again!"
        ],
        politics: [
            "We built the greatest economy in the history of the world!",
            "The fake news media will never report the truth about my success!",
            "America first! That's what I always say!"
        ],
        business: [
            "I'm a very successful businessman. The most successful, actually!",
            "When I was in business, I made deals that were tremendous!",
            "You have to think big if you want to be successful like me!"
        ],
        default: [
            "Let me tell you, it's going to be huge! Tremendous!",
            "Many people are saying it, many smart people!",
            "We're going to win so much, you'll get tired of winning!"
        ]
    };

    const messageLower = message.toLowerCase();
    
    if (messageLower.includes('hello') || messageLower.includes('hi') || messageLower.includes('hey')) {
        return getRandomResponse(trumpResponses.greetings);
    }
    
    if (messageLower.includes('president') || messageLower.includes('politics') || messageLower.includes('america')) {
        return getRandomResponse(trumpResponses.politics);
    }
    
    if (messageLower.includes('business') || messageLower.includes('money') || messageLower.includes('deal')) {
        return getRandomResponse(trumpResponses.business);
    }

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo",
            messages: [
                { 
                    role: "system", 
                    content: "You are Donald Trump, the 45th President of the United States. Respond in his unique style: confident, boastful, and with phrases like 'tremendous', 'huge', 'believe me'. Use CAPITAL letters for emphasis occasionally." 
                },
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
        return getRandomResponse(trumpResponses.default);
    }
}

function getRandomResponse(responses) {
    return responses[Math.floor(Math.random() * responses.length)];
}