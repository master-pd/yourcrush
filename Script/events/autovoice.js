const fs = require("fs-extra");
const path = require("path");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

module.exports = {
    config: {
        name: "autovoice",
        version: "2.0.0",
        description: "Convert text to voice messages",
        author: "RANA",
        category: "events"
    },

    onEvent: async function({ api, event }) {
        // Handle voice-related events
    },

    onMessage: async function({ api, event }) {
        try {
            const { threadID, senderID, body } = event;
            
            if (!body) return;
            
            // Check for voice command
            if (body.startsWith(global.config?.prefix || "!")) {
                const args = body.slice((global.config?.prefix || "!").length).trim().split(" ");
                const command = args.shift().toLowerCase();
                
                if (command === "voice" || command === "say") {
                    const text = args.join(" ");
                    
                    if (!text) {
                        api.sendMessage(
                            "Usage: !voice [text]\nExample: !voice Hello everyone!",
                            threadID
                        );
                        return;
                    }
                    
                    // Convert text to speech
                    api.sendMessage("🎤 Processing voice message...", threadID);
                    
                    const voiceFile = await this.textToSpeech(text);
                    
                    if (voiceFile) {
                        // Send as voice message
                        await api.sendMessage({
                            body: `🔊 Voice message:\n"${text}"`,
                            attachment: fs.createReadStream(voiceFile)
                        }, threadID);
                        
                        // Clean up temp file
                        fs.unlinkSync(voiceFile);
                    } else {
                        api.sendMessage("❌ Failed to create voice message.", threadID);
                    }
                }
            }
            
            // Auto voice for specific triggers
            await this.autoVoiceResponse(api, event);
            
        } catch (error) {
            console.error("Auto voice error:", error);
        }
    },

    textToSpeech: async function(text) {
        try {
            // Create temp directory
            const tempDir = path.join(__dirname, "../cache/voice_temp");
            await fs.ensureDir(tempDir);
            
            // Generate unique filename
            const timestamp = Date.now();
            const outputFile = path.join(tempDir, `voice_${timestamp}.mp3`);
            
            // Use gTTS (Google Text-to-Speech) or alternative
            // Note: You need to install gtts package: npm install gtts
            
            try {
                // Method 1: Using gTTS
                const { gtts } = require('gtts');
                const gtts = new gtts(text, 'bn'); // 'bn' for Bengali
                
                return new Promise((resolve, reject) => {
                    gtts.save(outputFile, (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(outputFile);
                        }
                    });
                });
                
            } catch (gttsError) {
                // Method 2: Using system TTS (requires espeak on Linux/macOS)
                try {
                    await execPromise(`espeak -v bn "${text}" --stdout | ffmpeg -i pipe:0 ${outputFile}`);
                    return outputFile;
                } catch (espeakError) {
                    // Method 3: Using online TTS service (requires API)
                    return await this.onlineTTS(text, outputFile);
                }
            }
            
        } catch (error) {
            console.error("Text to speech error:", error);
            return null;
        }
    },

    onlineTTS: async function(text, outputFile) {
        try {
            const axios = require("axios");
            
            // Google Translate TTS (free but limited)
            const encodedText = encodeURIComponent(text);
            const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=bn&client=tw-ob`;
            
            const response = await axios({
                url,
                method: 'GET',
                responseType: 'stream'
            });
            
            const writer = fs.createWriteStream(outputFile);
            response.data.pipe(writer);
            
            return new Promise((resolve, reject) => {
                writer.on('finish', () => resolve(outputFile));
                writer.on('error', reject);
            });
            
        } catch (error) {
            console.error("Online TTS error:", error);
            return null;
        }
    },

    autoVoiceResponse: async function(api, event) {
        try {
            const { threadID, senderID, body } = event;
            
            if (!body) return;
            
            const lowerBody = body.toLowerCase();
            
            // Auto voice responses for specific phrases
            const voiceTriggers = {
                "গান শোনাও": "আমি গান শোনাতে পারি না, কিন্তু আপনি !music [song name] ব্যবহার করে গান শুনতে পারেন।",
                "কি বলছ": "আমি আপনার কথার প্রতিধ্বনি করতে পারি। !voice [text] ব্যবহার করুন।",
                "বাংলা বল": "আমি বাংলায় কথা বলতে পারি। !voice ব্যবহার করুন বাংলায় কথা বলতে।",
                "hello": "Hello! How can I help you today?",
                "hi": "Hi there! Nice to meet you."
            };
            
            for (const [trigger, response] of Object.entries(voiceTriggers)) {
                if (lowerBody.includes(trigger.toLowerCase())) {
                    // Send text response first
                    api.sendMessage(response, threadID);
                    
                    // Then send voice response if enabled
                    const settingsPath = path.join(__dirname, "../cache/voice_settings.json");
                    const settings = await fs.readJson(settingsPath).catch(() => ({ autoVoice: false }));
                    
                    if (settings.autoVoice) {
                        const voiceFile = await this.textToSpeech(response);
                        
                        if (voiceFile) {
                            await api.sendMessage({
                                attachment: fs.createReadStream(voiceFile)
                            }, threadID);
                            
                            fs.unlinkSync(voiceFile);
                        }
                    }
                    break;
                }
            }
            
        } catch (error) {
            console.error("Auto voice response error:", error);
        }
    }
};