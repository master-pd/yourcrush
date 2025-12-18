const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
    config: {
        name: "tts",
        aliases: ["texttospeech", "speak"],
        version: "2.0",
        author: "RANA",
        role: 0,
        category: "utility",
        shortDescription: {
            en: "Convert text to speech",
            bn: "টেক্সটকে স্পিচে রূপান্তর করুন"
        },
        longDescription: {
            en: "Convert text to speech audio with multiple language and voice options",
            bn: "একাধিক ভাষা এবং ভয়েস বিকল্প সহ টেক্সটকে স্পিচ অডিওতে রূপান্তর করুন"
        },
        guide: {
            en: "{pn} [language] [text] or {pn} voices",
            bn: "{pn} [ভাষা] [টেক্সট] অথবা {pn} voices"
        },
        cooldown: 10
    },

    onStart: async function({ api, event, args }) {
        try {
            const { threadID, messageID } = event;
            
            if (args.length === 0) {
                return showTTSHelp(api, threadID, messageID);
            }
            
            if (args[0].toLowerCase() === 'voices' || args[0].toLowerCase() === 'voice') {
                return showVoiceList(api, threadID, messageID);
            }
            
            if (args.length < 2) {
                return api.sendMessage(
                    "🔊 **Text-to-Speech**\n\n" +
                    "Please provide language and text.\n" +
                    `Example: ${global.config.prefix}tts en Hello world\n` +
                    `Example: ${global.config.prefix}tts bn আমি ভালো আছি\n\n` +
                    `Use ${global.config.prefix}tts voices to see available voices.`,
                    threadID,
                    messageID
                );
            }
            
            const language = args[0].toLowerCase();
            const text = args.slice(1).join(" ");
            
            // Check text length
            if (text.length > 500) {
                return api.sendMessage(
                    "❌ Text is too long. Maximum 500 characters allowed.",
                    threadID,
                    messageID
                );
            }
            
            // Send processing message
            api.sendMessage(
                "🔊 Processing text-to-speech...",
                threadID,
                messageID
            );
            
            // Generate TTS audio
            const ttsResult = await generateTTS(text, language);
            
            if (!ttsResult.success) {
                return api.sendMessage(
                    `❌ ${ttsResult.message}\n\n` +
                    `💡 Try:\n` +
                    `• ${global.config.prefix}tts voices (to see available voices)\n` +
                    `• Using common languages: en, es, fr, bn\n` +
                    `• Shorter text`,
                    threadID,
                    messageID
                );
            }
            
            // Send the audio file
            api.sendMessage(
                {
                    body: `🔊 Text-to-Speech Generated!\n\n` +
                          `📝 Text: ${text}\n` +
                          `🔤 Language: ${ttsResult.languageName}\n` +
                          `🗣️ Voice: ${ttsResult.voice}\n` +
                          `⏱️ Duration: ${ttsResult.duration}s`,
                    attachment: fs.createReadStream(ttsResult.filePath)
                },
                threadID,
                messageID,
                async () => {
                    // Clean up temp file after sending
                    try {
                        fs.unlinkSync(ttsResult.filePath);
                    } catch (error) {
                        // Ignore cleanup errors
                    }
                }
            );
            
        } catch (error) {
            console.error(error);
            api.sendMessage(
                "❌ Text-to-speech conversion failed.",
                event.threadID,
                event.messageID
            );
        }
    }
};

function showTTSHelp(api, threadID, messageID) {
    const message = `
🔊 **TEXT-TO-SPEECH** 🔊

📝 **Usage:**
• ${global.config.prefix}tts [language] [text]
• ${global.config.prefix}tts voices (show available voices)

📌 **Examples:**
• ${global.config.prefix}tts en Hello world
• ${global.config.prefix}tts bn আমি ভালো আছি
• ${global.config.prefix}tts es Hola cómo estás
• ${global.config.prefix}tts fr Bonjour tout le monde

🔤 **Common Languages:**
• en - English
• es - Spanish
• fr - French
• de - German
• bn - Bengali
• hi - Hindi
• ar - Arabic
• zh - Chinese
• ja - Japanese
• ko - Korean

⚙️ **Limits:**
• Maximum 500 characters
• Supports 50+ languages
• Multiple voice options

💡 **Tip:** Use ${global.config.prefix}tts voices to see all available voices!
    `;
    
    api.sendMessage(message, threadID, messageID);
}

function showVoiceList(api, threadID, messageID) {
    const voices = {
        'en': [
            { code: 'en-US', name: 'English (US)', gender: 'Female', example: 'Hello world' },
            { code: 'en-GB', name: 'English (UK)', gender: 'Male', example: 'Hello world' },
            { code: 'en-AU', name: 'English (Australia)', gender: 'Female', example: 'G\'day mate' }
        ],
        'es': [
            { code: 'es-ES', name: 'Spanish (Spain)', gender: 'Female', example: 'Hola mundo' },
            { code: 'es-MX', name: 'Spanish (Mexico)', gender: 'Male', example: 'Hola mundo' }
        ],
        'fr': [
            { code: 'fr-FR', name: 'French (France)', gender: 'Female', example: 'Bonjour le monde' },
            { code: 'fr-CA', name: 'French (Canada)', gender: 'Male', example: 'Bonjour le monde' }
        ],
        'bn': [
            { code: 'bn-IN', name: 'Bengali (India)', gender: 'Female', example: 'নমস্কার বিশ্ব' },
            { code: 'bn-BD', name: 'Bengali (Bangladesh)', gender: 'Male', example: 'আসসালামু আলাইকুম' }
        ],
        'hi': [
            { code: 'hi-IN', name: 'Hindi (India)', gender: 'Female', example: 'नमस्ते दुनिया' }
        ],
        'ar': [
            { code: 'ar-SA', name: 'Arabic (Saudi Arabia)', gender: 'Male', example: 'مرحبا بالعالم' }
        ],
        'zh': [
            { code: 'zh-CN', name: 'Chinese (China)', gender: 'Female', example: '你好世界' },
            { code: 'zh-TW', name: 'Chinese (Taiwan)', gender: 'Male', example: '你好世界' }
        ],
        'ja': [
            { code: 'ja-JP', name: 'Japanese (Japan)', gender: 'Female', example: 'こんにちは世界' }
        ],
        'ko': [
            { code: 'ko-KR', name: 'Korean (Korea)', gender: 'Female', example: '안녕하세요 세계' }
        ],
        'de': [
            { code: 'de-DE', name: 'German (Germany)', gender: 'Male', example: 'Hallo Welt' }
        ],
        'it': [
            { code: 'it-IT', name: 'Italian (Italy)', gender: 'Female', example: 'Ciao mondo' }
        ],
        'pt': [
            { code: 'pt-BR', name: 'Portuguese (Brazil)', gender: 'Female', example: 'Olá mundo' },
            { code: 'pt-PT', name: 'Portuguese (Portugal)', gender: 'Male', example: 'Olá mundo' }
        ],
        'ru': [
            { code: 'ru-RU', name: 'Russian (Russia)', gender: 'Female', example: 'Привет мир' }
        ]
    };
    
    let message = `🗣️ **AVAILABLE TTS VOICES** 🗣️\n\n`;
    message += `📊 Total Languages: ${Object.keys(voices).length}\n\n`;
    
    Object.entries(voices).forEach(([langCode, langVoices]) => {
        const langName = getLanguageName(langCode);
        message += `**${langName} (${langCode})**\n`;
        
        langVoices.forEach(voice => {
            const genderEmoji = voice.gender === 'Female' ? '👩' : '👨';
            message += `• ${genderEmoji} ${voice.name} (${voice.code})\n`;
            message += `  Example: ${voice.example}\n`;
        });
        
        message += '\n';
    });
    
    message += `📝 **Usage:** ${global.config.prefix}tts [language] [text]\n`;
    message += `📌 **Example:** ${global.config.prefix}tts en-US Hello world\n\n`;
    message += `💡 **Tip:** You can use language code (en) or voice code (en-US).`;
    
    // Split message if too long
    if (message.length > 2000) {
        const parts = splitMessage(message);
        parts.forEach(part => {
            api.sendMessage(part, threadID);
        });
    } else {
        api.sendMessage(message, threadID, messageID);
    }
}

async function generateTTS(text, language) {
    try {
        // Create temp directory
        const tempDir = path.join(__dirname, '../../cache/tts');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // Generate unique filename
        const filename = `tts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp3`;
        const filePath = path.join(tempDir, filename);
        
        // Try multiple TTS APIs
        const apis = [
            // Google TTS (free)
            `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${language}&q=${encodeURIComponent(text)}`,
            
            // ResponsiveVoice
            `https://code.responsivevoice.org/getvoice.php?t=${encodeURIComponent(text)}&tl=${language}&sv=&vn=&pitch=0.5&rate=0.5&vol=1`,
            
            // VoiceRSS
            `https://api.voicerss.org/?key=demo&hl=${language}&src=${encodeURIComponent(text)}&f=44khz_16bit_stereo&c=mp3`
        ];
        
        for (const apiUrl of apis) {
            try {
                const response = await axios({
                    method: 'GET',
                    url: apiUrl,
                    responseType: 'stream',
                    timeout: 30000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                // Save to file
                const writer = fs.createWriteStream(filePath);
                response.data.pipe(writer);
                
                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });
                
                // Check if file was created and has content
                const stats = fs.statSync(filePath);
                if (stats.size > 100) { // Minimum file size check
                    // Get language name
                    const languageName = getLanguageName(language.split('-')[0]) || language;
                    
                    // Get voice name
                    const voice = getVoiceName(language);
                    
                    // Estimate duration (approx 150 characters per 10 seconds)
                    const duration = Math.max(1, Math.round(text.length / 15));
                    
                    return {
                        success: true,
                        filePath: filePath,
                        language: language,
                        languageName: languageName,
                        voice: voice,
                        duration: duration,
                        text: text
                    };
                }
                
                // If file is too small, try next API
                fs.unlinkSync(filePath);
                
            } catch (error) {
                // Try next API
                continue;
            }
        }
        
        // If all APIs fail, try local TTS if available
        try {
            const localResult = await generateLocalTTS(text, language, filePath);
            if (localResult.success) {
                return localResult;
            }
        } catch (localError) {
            // Local TTS also failed
        }
        
        return {
            success: false,
            message: "TTS service unavailable for this language."
        };
        
    } catch (error) {
        console.error('TTS error:', error.message);
        return {
            success: false,
            message: "Failed to generate speech."
        };
    }
}

async function generateLocalTTS(text, language, filePath) {
    // This is a placeholder for local TTS implementation
    // In a real implementation, you might use:
    // - gTTS (Google Text-to-Speech) Python library
    // - say command (macOS)
    // - espeak (Linux)
    // - Windows Speech API
    
    // For now, return failure
    return {
        success: false,
        message: "Local TTS not configured."
    };
}

function getLanguageName(code) {
    const languages = {
        'af': 'Afrikaans',
        'sq': 'Albanian',
        'am': 'Amharic',
        'ar': 'Arabic',
        'hy': 'Armenian',
        'az': 'Azerbaijani',
        'eu': 'Basque',
        'be': 'Belarusian',
        'bn': 'Bengali',
        'bs': 'Bosnian',
        'bg': 'Bulgarian',
        'ca': 'Catalan',
        'ceb': 'Cebuano',
        'zh': 'Chinese',
        'zh-CN': 'Chinese (Simplified)',
        'zh-TW': 'Chinese (Traditional)',
        'co': 'Corsican',
        'hr': 'Croatian',
        'cs': 'Czech',
        'da': 'Danish',
        'nl': 'Dutch',
        'en': 'English',
        'eo': 'Esperanto',
        'et': 'Estonian',
        'fi': 'Finnish',
        'fr': 'French',
        'fy': 'Frisian',
        'gl': 'Galician',
        'ka': 'Georgian',
        'de': 'German',
        'el': 'Greek',
        'gu': 'Gujarati',
        'ht': 'Haitian Creole',
        'ha': 'Hausa',
        'haw': 'Hawaiian',
        'he': 'Hebrew',
        'hi': 'Hindi',
        'hmn': 'Hmong',
        'hu': 'Hungarian',
        'is': 'Icelandic',
        'ig': 'Igbo',
        'id': 'Indonesian',
        'ga': 'Irish',
        'it': 'Italian',
        'ja': 'Japanese',
        'jv': 'Javanese',
        'kn': 'Kannada',
        'kk': 'Kazakh',
        'km': 'Khmer',
        'rw': 'Kinyarwanda',
        'ko': 'Korean',
        'ku': 'Kurdish',
        'ky': 'Kyrgyz',
        'lo': 'Lao',
        'la': 'Latin',
        'lv': 'Latvian',
        'lt': 'Lithuanian',
        'lb': 'Luxembourgish',
        'mk': 'Macedonian',
        'mg': 'Malagasy',
        'ms': 'Malay',
        'ml': 'Malayalam',
        'mt': 'Maltese',
        'mi': 'Maori',
        'mr': 'Marathi',
        'mn': 'Mongolian',
        'my': 'Myanmar',
        'ne': 'Nepali',
        'no': 'Norwegian',
        'ny': 'Nyanja',
        'or': 'Odia',
        'ps': 'Pashto',
        'fa': 'Persian',
        'pl': 'Polish',
        'pt': 'Portuguese',
        'pa': 'Punjabi',
        'ro': 'Romanian',
        'ru': 'Russian',
        'sm': 'Samoan',
        'gd': 'Scots Gaelic',
        'sr': 'Serbian',
        'st': 'Sesotho',
        'sn': 'Shona',
        'sd': 'Sindhi',
        'si': 'Sinhala',
        'sk': 'Slovak',
        'sl': 'Slovenian',
        'so': 'Somali',
        'es': 'Spanish',
        'su': 'Sundanese',
        'sw': 'Swahili',
        'sv': 'Swedish',
        'tl': 'Tagalog',
        'tg': 'Tajik',
        'ta': 'Tamil',
        'tt': 'Tatar',
        'te': 'Telugu',
        'th': 'Thai',
        'tr': 'Turkish',
        'tk': 'Turkmen',
        'uk': 'Ukrainian',
        'ur': 'Urdu',
        'ug': 'Uyghur',
        'uz': 'Uzbek',
        'vi': 'Vietnamese',
        'cy': 'Welsh',
        'xh': 'Xhosa',
        'yi': 'Yiddish',
        'yo': 'Yoruba',
        'zu': 'Zulu'
    };
    
    return languages[code] || code;
}

function getVoiceName(voiceCode) {
    // Map voice codes to friendly names
    const voices = {
        'en-US': 'American English Female',
        'en-GB': 'British English Male',
        'en-AU': 'Australian English Female',
        'es-ES': 'Spanish Female',
        'es-MX': 'Mexican Spanish Male',
        'fr-FR': 'French Female',
        'fr-CA': 'Canadian French Male',
        'bn-IN': 'Indian Bengali Female',
        'bn-BD': 'Bangladeshi Bengali Male',
        'hi-IN': 'Hindi Female',
        'ar-SA': 'Arabic Male',
        'zh-CN': 'Chinese Female',
        'zh-TW': 'Taiwanese Chinese Male',
        'ja-JP': 'Japanese Female',
        'ko-KR': 'Korean Female',
        'de-DE': 'German Male',
        'it-IT': 'Italian Female',
        'pt-BR': 'Brazilian Portuguese Female',
        'pt-PT': 'Portuguese Male',
        'ru-RU': 'Russian Female'
    };
    
    return voices[voiceCode] || voiceCode;
}

function splitMessage(message) {
    const maxLength = 2000;
    const messages = [];
    let currentMessage = '';
    
    const lines = message.split('\n');
    
    for (const line of lines) {
        if (currentMessage.length + line.length + 1 > maxLength) {
            messages.push(currentMessage);
            currentMessage = line + '\n';
        } else {
            currentMessage += line + '\n';
        }
    }
    
    if (currentMessage.length > 0) {
        messages.push(currentMessage);
    }
    
    return messages;
}