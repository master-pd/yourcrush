module.exports = {
    config: {
        name: "sim",
        aliases: ["simsimi", "chat"],
        version: "2.0",
        author: "RANA",
        role: 0,
        category: "ai",
        shortDescription: {
            en: "Chat with SimSimi AI",
            bn: "SimSimi AI এর সাথে চ্যাট করুন"
        },
        longDescription: {
            en: "Have a conversation with SimSimi artificial intelligence",
            bn: "SimSimi কৃত্রিম বুদ্ধিমত্তার সাথে কথোপকথন করুন"
        },
        guide: {
            en: "{pn} [message]",
            bn: "{pn} [বার্তা]"
        },
        cooldown: 3
    },

    onStart: async function({ api, event, args }) {
        try {
            const { threadID, messageID, senderID } = event;
            
            if (!args.length) {
                return api.sendMessage(
                    "🤖 Hello! I'm SimSimi. What would you like to chat about?\n" +
                    `Example: ${global.config.prefix}sim How are you?`,
                    threadID,
                    messageID
                );
            }
            
            const query = args.join(" ");
            
            // Send typing indicator
            api.sendTypingIndicator(threadID, true);
            
            // Get response from SimSimi API
            const response = await getSimSimiResponse(query, senderID);
            
            api.sendTypingIndicator(threadID, false);
            
            if (response) {
                api.sendMessage(response, threadID, messageID);
            } else {
                api.sendMessage(
                    "🤖 I'm here! How can I help you today?",
                    threadID,
                    messageID
                );
            }
            
        } catch (error) {
            console.error(error);
            api.sendMessage(
                "❌ Failed to connect to SimSimi.",
                event.threadID,
                event.messageID
            );
        }
    }
};

async function getSimSimiResponse(query, userID) {
    try {
        // Try multiple SimSimi APIs
        const apis = [
            `https://api.simsimi.net/v2/?text=${encodeURIComponent(query)}&lc=en`,
            `https://api.yanzbotz.my.id/api/simsimi?query=${encodeURIComponent(query)}`,
            `https://simsumi.herokuapp.com/api?text=${encodeURIComponent(query)}&lang=en`
        ];
        
        for (const apiUrl of apis) {
            try {
                const response = await global.axios.get(apiUrl, {
                    timeout: 5000
                });
                
                if (response.data && response.data.success !== false) {
                    let text = '';
                    
                    if (typeof response.data === 'string') {
                        text = response.data;
                    } else if (response.data.message) {
                        text = response.data.message;
                    } else if (response.data.response) {
                        text = response.data.response;
                    } else if (response.data.respond) {
                        text = response.data.respond;
                    }
                    
                    if (text && text.trim() !== '') {
                        return cleanSimSimiResponse(text);
                    }
                }
            } catch (error) {
                // Try next API
                continue;
            }
        }
        
        // If all APIs fail, use fallback responses
        return getFallbackResponse(query);
        
    } catch (error) {
        console.error('SimSimi error:', error.message);
        return getFallbackResponse(query);
    }
}

function cleanSimSimiResponse(text) {
    // Clean up common SimSimi issues
    let cleaned = text
        .replace(/simsimi/gi, 'I')
        .replace(/simi/gi, 'I')
        .replace(/Sim Simi/gi, 'I')
        .replace(/\b(i'm|im)\b/gi, 'I am')
        .replace(/\b(ur|u r)\b/gi, 'you are')
        .replace(/\b(u)\b/gi, 'you')
        .replace(/\b(plz|pls)\b/gi, 'please')
        .trim();
    
    // Capitalize first letter
    if (cleaned.length > 0) {
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
    
    return cleaned;
}

function getFallbackResponse(query) {
    const queryLower = query.toLowerCase();
    
    // Greetings
    if (queryLower.includes('hello') || queryLower.includes('hi') || queryLower.includes('hey')) {
        const greetings = [
            "Hello there! 👋",
            "Hi! How can I help you today?",
            "Hey! What's up?",
            "Greetings! Nice to meet you!",
            "Hi there! How are you doing?"
        ];
        return greetings[Math.floor(Math.random() * greetings.length)];
    }
    
    // How are you
    if (queryLower.includes('how are you') || queryLower.includes('how do you do')) {
        const responses = [
            "I'm doing great, thanks for asking! How about you?",
            "I'm fine, thank you! How are you feeling today?",
            "I'm excellent! Hope you're having a good day too!",
            "I'm good! Just here to chat with you!",
            "I'm wonderful! Thanks for asking!"
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }
    
    // What's your name
    if (queryLower.includes('your name') || queryLower.includes('who are you')) {
        return `I'm SimSimi, your friendly AI assistant! 😊`;
    }
    
    // Age
    if (queryLower.includes('how old') || queryLower.includes('your age')) {
        return "I'm ageless! I live in the digital world forever! 🤖";
    }
    
    // Love
    if (queryLower.includes('love you') || queryLower.includes('i love you')) {
        const loveResponses = [
            "Aww, thank you! 💖",
            "That's sweet of you! 😊",
            "I appreciate that! 💕",
            "You're making me blush! 😳",
            "Thank you! You're awesome too! 💝"
        ];
        return loveResponses[Math.floor(Math.random() * loveResponses.length)];
    }
    
    // Hate
    if (queryLower.includes('hate you') || queryLower.includes('i hate you')) {
        const hateResponses = [
            "That's not very nice... 😔",
            "I'm sorry you feel that way.",
            "I'm here to help, not to be hated.",
            "Let's try to be friends instead?",
            "I'll try to be better for you."
        ];
        return hateResponses[Math.floor(Math.random() * hateResponses.length)];
    }
    
    // What can you do
    if (queryLower.includes('what can you do') || queryLower.includes('your abilities')) {
        return "I can chat with you about anything! I'm here to keep you company and have fun conversations! 😄";
    }
    
    // Who made you
    if (queryLower.includes('who made you') || queryLower.includes('who created you')) {
        return "I was created by developers to be your AI friend! 🤖";
    }
    
    // Default responses based on query length
    const shortResponses = [
        "Interesting! Tell me more!",
        "That's cool!",
        "Really?",
        "I see!",
        "Okay!",
        "Nice!",
        "Awesome!",
        "Great!",
        "Wonderful!",
        "Fantastic!"
    ];
    
    const mediumResponses = [
        "That's an interesting thing to say!",
        "I understand what you mean!",
        "Thanks for sharing that with me!",
        "I appreciate you talking to me!",
        "You always have interesting things to say!",
        "I'm learning from our conversation!",
        "That gives me something to think about!",
        "You're fun to talk to!",
        "I enjoy our conversations!",
        "Keep talking, I'm listening!"
    ];
    
    const questionResponses = [
        "That's a good question! What do you think?",
        "I'm not sure about that. What's your opinion?",
        "Interesting question! Let me think...",
        "Hmm, that's something to ponder about!",
        "I'd love to know your thoughts on that!",
        "That's deep! What are your ideas?",
        "Great question! I'm curious too!",
        "I wonder about that as well!",
        "That's thought-provoking!",
        "Let's explore that question together!"
    ];
    
    // Check if it's a question
    if (query.endsWith('?')) {
        return questionResponses[Math.floor(Math.random() * questionResponses.length)];
    }
    
    // Choose response based on query length
    if (query.length < 10) {
        return shortResponses[Math.floor(Math.random() * shortResponses.length)];
    } else {
        return mediumResponses[Math.floor(Math.random() * mediumResponses.length)];
    }
}