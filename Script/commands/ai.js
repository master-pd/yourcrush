const axios = require('axios');

module.exports = {
    config: {
        name: "ai",
        version: "2.0",
        author: "RANA",
        role: 0,
        category: "ai",
        shortDescription: {
            en: "Chat with AI",
            bn: "AI এর সাথে চ্যাট করুন"
        },
        longDescription: {
            en: "Have a conversation with AI using various APIs",
            bn: "বিভিন্ন API ব্যবহার করে AI এর সাথে কথোপকথন করুন"
        },
        guide: {
            en: "{pn} [your message]",
            bn: "{pn} [আপনার বার্তা]"
        },
        cooldown: 3
    },

    onStart: async function({ api, event, args }) {
        try {
            const { threadID, messageID, senderID } = event;
            
            if (!args.length) {
                return api.sendMessage(
                    "🤖 Please provide a message for the AI.\nExample: .ai Hello, how are you?",
                    threadID,
                    messageID
                );
            }
            
            const query = args.join(" ");
            
            // Send typing indicator
            api.sendTypingIndicator(threadID, true);
            
            // Try multiple AI APIs
            const response = await getAIResponse(query, senderID);
            
            api.sendTypingIndicator(threadID, false);
            
            if (response) {
                api.sendMessage(response, threadID, messageID);
            } else {
                api.sendMessage(
                    "❌ Unable to get AI response at the moment. Please try again later.",
                    threadID,
                    messageID
                );
            }
            
        } catch (error) {
            console.error(error);
            api.sendMessage(
                "❌ An error occurred while processing your request.",
                event.threadID,
                event.messageID
            );
        }
    }
};

async function getAIResponse(query, userID) {
    try {
        // Try Gemini API first
        if (global.config.apiConfig.gemini) {
            const geminiResponse = await tryGemini(query, userID);
            if (geminiResponse) return geminiResponse;
        }
        
        // Try OpenAI
        if (global.config.apiConfig.openai) {
            const openaiResponse = await tryOpenAI(query, userID);
            if (openaiResponse) return openaiResponse;
        }
        
        // Fallback to free API
        return await tryFreeAI(query, userID);
        
    } catch (error) {
        console.error('AI response error:', error.message);
        return null;
    }
}

async function tryGemini(query, userID) {
    try {
        const apiKey = global.config.apiConfig.gemini;
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
            {
                contents: [{
                    parts: [{
                        text: `You are a helpful assistant. User ID: ${userID}\n\nUser: ${query}\nAssistant:`
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 1,
                    topP: 1,
                    maxOutputTokens: 2048,
                }
            }
        );
        
        return response.data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (error) {
        return null;
    }
}

async function tryOpenAI(query, userID) {
    try {
        const apiKey = global.config.apiConfig.openai;
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: `You are a helpful assistant. User ID: ${userID}`
                    },
                    {
                        role: "user",
                        content: query
                    }
                ],
                max_tokens: 1000,
                temperature: 0.7
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        return response.data.choices[0].message.content;
    } catch (error) {
        return null;
    }
}

async function tryFreeAI(query, userID) {
    try {
        // Try Blackbox AI
        const response = await axios.post('https://www.blackbox.ai/api/chat', {
            messages: [{
                role: "user",
                content: query
            }],
            id: userID,
            previewToken: null,
            userId: userID,
            codeModelMode: true,
            agentMode: {},
            trendingAgentMode: {},
            isMicMode: false,
            isChromeExt: false,
            githubToken: null
        });
        
        return response.data || "I'm here to help! How can I assist you today?";
    } catch (error) {
        // Final fallback
        return "Hello! I'm your AI assistant. How can I help you today?";
    }
}