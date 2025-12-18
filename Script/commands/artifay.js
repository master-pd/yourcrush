const axios = require('axios');

module.exports = {
    config: {
        name: "artifay",
        version: "2.0",
        author: "RANA",
        countDown: 5,
        role: 0,
        shortDescription: {
            en: "Artifay AI assistant",
            bn: "আর্টিফে AI সহকারী"
        },
        longDescription: {
            en: "Advanced AI assistant with multiple capabilities including creative writing, analysis, and problem solving",
            bn: "সৃজনশীল লেখা, বিশ্লেষণ এবং সমস্যা সমাধান সহ একাধিক ক্ষমতাসম্পন্ন উন্নত AI সহকারী"
        },
        category: "ai",
        guide: {
            en: "{pn} [your question/request]",
            bn: "{pn} [আপনার প্রশ্ন/অনুরোধ]"
        }
    },

    onStart: async function ({ api, event, args, message, getLang }) {
        const userMessage = args.join(" ");

        if (!userMessage) {
            return message.reply(getLang("noMessage"));
        }

        try {
            await message.reply(getLang("thinking"));
            
            const response = await chatWithArtifay(userMessage);
            
            await message.reply(getLang("response", { 
                user: userMessage, 
                artifay: response 
            }));

        } catch (error) {
            console.error('Artifay AI error:', error);
            await message.reply(getLang("error", { error: error.message }));
        }
    },

    langs: {
        en: {
            noMessage: "❌ Please provide a message for Artifay",
            thinking: "🤖 Artifay is thinking...",
            response: "🧠 Artifay AI:\n\n{artifay}\n\n💭 Your message: {user}",
            error: "❌ Error: {error}"
        },
        bn: {
            noMessage: "❌ আর্টিফের জন্য একটি বার্তা দিন",
            thinking: "🤖 আর্টিফে চিন্তা করছে...",
            response: "🧠 আর্টিফে AI:\n\n{artifay}\n\n💭 আপনার বার্তা: {user}",
            error: "❌ ত্রুটি: {error}"
        }
    }
};

async function chatWithArtifay(message) {
    const messageLower = message.toLowerCase();
    
    const predefinedResponses = {
        greetings: [
            "Hello! I'm Artifay, your advanced AI assistant. How can I help you today?",
            "Greetings! Artifay here, ready to assist with your queries and creative tasks.",
            "Hi there! I'm Artifay, equipped with advanced reasoning capabilities. What's on your mind?"
        ],
        capabilities: [
            "I can help with creative writing, problem solving, code generation, analysis, translation, and much more!",
            "My capabilities include: text generation, data analysis, creative tasks, logical reasoning, and learning from interactions.",
            "As an advanced AI, I can assist with writing, analysis, coding, planning, and creative projects."
        ],
        creative: [
            "I excel at creative tasks! Whether it's writing stories, poems, or brainstorming ideas, I'm here to help.",
            "Creative writing is one of my specialties. I can generate stories, poems, dialogues, and more.",
            "Let's create something amazing together! I can help with any creative project you have in mind."
        ],
        technical: [
            "I'm proficient in technical topics including programming, mathematics, science, and data analysis.",
            "For technical assistance, I can help with coding, debugging, algorithm design, and problem solving.",
            "Technical queries are welcome! I can assist with programming, math problems, scientific concepts, and more."
        ]
    };

    if (messageLower.includes('hello') || messageLower.includes('hi') || messageLower.includes('hey')) {
        return getRandomResponse(predefinedResponses.greetings);
    }
    
    if (messageLower.includes('what can you do') || messageLower.includes('capabilities') || messageLower.includes('help with')) {
        return getRandomResponse(predefinedResponses.capabilities);
    }
    
    if (messageLower.includes('creative') || messageLower.includes('write') || messageLower.includes('story') || messageLower.includes('poem')) {
        return getRandomResponse(predefinedResponses.creative);
    }
    
    if (messageLower.includes('code') || messageLower.includes('programming') || messageLower.includes('technical') || messageLower.includes('math')) {
        return getRandomResponse(predefinedResponses.technical);
    }

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-4",
            messages: [
                { 
                    role: "system", 
                    content: "You are Artifay, an advanced AI assistant created by RANA. You are intelligent, creative, helpful, and have extensive knowledge across various domains. You excel at creative writing, technical problem solving, analysis, and providing detailed, thoughtful responses. Always be precise, creative, and engaging in your answers." 
                },
                { role: "user", content: message }
            ],
            temperature: 0.7,
            max_tokens: 1000
        }, {
            headers: {
                'Authorization': `Bearer YOUR_API_KEY`,
                'Content-Type': 'application/json'
            }
        });
        
        return response.data.choices[0].message.content;
    } catch (apiError) {
        console.error('API Error:', apiError);
        
        try {
            const backupResponse = await axios.get(`https://api.simsimi.net/v2/?text=${encodeURIComponent(message)}&lc=en&cf=true`);
            return backupResponse.data.success || "I apologize, but I couldn't process your request at the moment. Please try again.";
        } catch {
            return "As Artifay, I would say: " + generateSmartResponse(message);
        }
    }
}

function getRandomResponse(responses) {
    return responses[Math.floor(Math.random() * responses.length)];
}

function generateSmartResponse(message) {
    const words = message.toLowerCase().split(' ');
    
    if (words.includes('how') || words.includes('what') || words.includes('why') || words.includes('when')) {
        return "That's an interesting question. Based on my analysis, I would suggest considering multiple perspectives to fully understand this topic.";
    }
    
    if (words.includes('best') || words.includes('recommend') || words.includes('suggest')) {
        return "I recommend evaluating your specific needs and constraints before making a decision. Each option has its own advantages.";
    }
    
    if (words.includes('love') || words.includes('like') || words.includes('enjoy')) {
        return "That's wonderful! It's great to have passions and interests that bring joy to your life.";
    }
    
    if (words.includes('problem') || words.includes('issue') || words.includes('trouble')) {
        return "I understand you're facing a challenge. Let me help you analyze this systematically to find potential solutions.";
    }
    
    return "Thank you for sharing that with me. I've processed your input and I believe there are interesting insights to explore here.";
}