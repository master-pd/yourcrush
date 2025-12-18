const axios = require('axios');

module.exports = {
    config: {
        name: "translate",
        aliases: ["tr", "trans"],
        version: "2.0",
        author: "RANA",
        role: 0,
        category: "utility",
        shortDescription: {
            en: "Translate text between languages",
            bn: "ভাষার মধ্যে টেক্সট অনুবাদ করুন"
        },
        longDescription: {
            en: "Translate text from one language to another using Google Translate",
            bn: "Google Translate ব্যবহার করে এক ভাষা থেকে অন্য ভাষায় টেক্সট অনুবাদ করুন"
        },
        guide: {
            en: "{pn} [language code] [text] or {pn} list",
            bn: "{pn} [ভাষা কোড] [টেক্সট] অথবা {pn} list"
        },
        cooldown: 5
    },

    onStart: async function({ api, event, args }) {
        try {
            const { threadID, messageID } = event;
            
            if (args.length === 0) {
                return showTranslateHelp(api, threadID, messageID);
            }
            
            if (args[0].toLowerCase() === 'list') {
                return showLanguageList(api, threadID, messageID);
            }
            
            if (args.length < 2) {
                return api.sendMessage(
                    "❌ Please provide language code and text to translate.\n" +
                    `Example: ${global.config.prefix}translate es Hello world\n` +
                    `Example: ${global.config.prefix}translate list (to see language codes)`,
                    threadID,
                    messageID
                );
            }
            
            const targetLang = args[0].toLowerCase();
            const textToTranslate = args.slice(1).join(" ");
            
            // Send typing indicator
            api.sendTypingIndicator(threadID, true);
            
            // Translate text
            const translation = await translateText(textToTranslate, targetLang);
            
            api.sendTypingIndicator(threadID, false);
            
            if (!translation.success) {
                return api.sendMessage(
                    `❌ ${translation.message}\n\n` +
                    `💡 Try:\n` +
                    `• ${global.config.prefix}translate list (to see valid language codes)\n` +
                    `• Using common language codes like 'en', 'es', 'fr', 'bn'`,
                    threadID,
                    messageID
                );
            }
            
            // Build translation message
            const message = buildTranslationMessage(translation);
            
            api.sendMessage(message, threadID, messageID);
            
        } catch (error) {
            console.error(error);
            api.sendMessage(
                "❌ Translation failed.",
                event.threadID,
                event.messageID
            );
        }
    }
};

function showTranslateHelp(api, threadID, messageID) {
    const message = `
🌐 **TEXT TRANSLATOR** 🌐

📝 **Usage:**
• ${global.config.prefix}translate [language code] [text]
• ${global.config.prefix}translate list (show all languages)

📌 **Examples:**
• ${global.config.prefix}translate es Hello world
• ${global.config.prefix}translate fr How are you?
• ${global.config.prefix}translate bn আমি ভালো আছি

🔤 **Common Language Codes:**
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

💡 **Tip:** Use ${global.config.prefix}translate list to see all 100+ languages!
    `;
    
    api.sendMessage(message, threadID, messageID);
}

function showLanguageList(api, threadID, messageID) {
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
        'my': 'Myanmar (Burmese)',
        'ne': 'Nepali',
        'no': 'Norwegian',
        'ny': 'Nyanja (Chichewa)',
        'or': 'Odia (Oriya)',
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
        'si': 'Sinhala (Sinhalese)',
        'sk': 'Slovak',
        'sl': 'Slovenian',
        'so': 'Somali',
        'es': 'Spanish',
        'su': 'Sundanese',
        'sw': 'Swahili',
        'sv': 'Swedish',
        'tl': 'Tagalog (Filipino)',
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
    
    let message = `🌐 **SUPPORTED LANGUAGES** 🌐\n\n`;
    message += `📊 Total Languages: ${Object.keys(languages).length}\n\n`;
    
    // Group languages by first letter
    const grouped = {};
    
    Object.entries(languages).forEach(([code, name]) => {
        const firstLetter = name.charAt(0).toUpperCase();
        if (!grouped[firstLetter]) {
            grouped[firstLetter] = [];
        }
        grouped[firstLetter].push({ code, name });
    });
    
    // Sort letters
    const letters = Object.keys(grouped).sort();
    
    // Add languages for each letter
    letters.forEach(letter => {
        message += `**${letter}**\n`;
        
        grouped[letter].forEach(({ code, name }) => {
            message += `• ${code} - ${name}\n`;
        });
        
        message += '\n';
    });
    
    message += `📝 **Usage:** ${global.config.prefix}translate [code] [text]\n`;
    message += `📌 **Example:** ${global.config.prefix}translate es Hello world`;
    
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

async function translateText(text, targetLang) {
    try {
        // Try multiple translation APIs
        const apis = [
            `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`,
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|${targetLang}`,
            `https://libretranslate.com/translate?q=${encodeURIComponent(text)}&source=auto&target=${targetLang}&format=text`
        ];
        
        for (const apiUrl of apis) {
            try {
                const response = await axios.get(apiUrl, {
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0'
                    }
                });
                
                let translatedText = '';
                let detectedLang = 'auto';
                
                // Parse response based on API
                if (apiUrl.includes('googleapis')) {
                    // Google Translate
                    if (response.data && response.data[0]) {
                        translatedText = response.data[0].map(item => item[0]).join('');
                        detectedLang = response.data[2] || 'auto';
                    }
                } else if (apiUrl.includes('mymemory')) {
                    // MyMemory
                    if (response.data && response.data.responseData) {
                        translatedText = response.data.responseData.translatedText;
                        detectedLang = response.data.responseData.match || 'auto';
                    }
                } else if (apiUrl.includes('libretranslate')) {
                    // LibreTranslate
                    if (response.data && response.data.translatedText) {
                        translatedText = response.data.translatedText;
                    }
                }
                
                if (translatedText && translatedText.trim() !== '') {
                    // Clean up translation
                    translatedText = cleanTranslation(translatedText);
                    
                    // Get language names
                    const detectedLangName = getLanguageName(detectedLang);
                    const targetLangName = getLanguageName(targetLang);
                    
                    return {
                        success: true,
                        original: text,
                        translated: translatedText,
                        detectedLang: detectedLang,
                        detectedLangName: detectedLangName,
                        targetLang: targetLang,
                        targetLangName: targetLangName
                    };
                }
            } catch (error) {
                // Try next API
                continue;
            }
        }
        
        return {
            success: false,
            message: "Translation service unavailable or invalid language code."
        };
        
    } catch (error) {
        console.error('Translation error:', error.message);
        return {
            success: false,
            message: "Translation failed. Please try again."
        };
    }
}

function cleanTranslation(text) {
    // Clean common translation artifacts
    return text
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();
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
        'zu': 'Zulu',
        'auto': 'Auto-detected'
    };
    
    return languages[code] || code;
}

function buildTranslationMessage(translation) {
    const { original, translated, detectedLangName, targetLangName } = translation;
    
    let message = `🌐 **TRANSLATION COMPLETE** 🌐\n\n`;
    
    message += `📥 **Original Text (${detectedLangName}):**\n`;
    message += `${original}\n\n`;
    
    message += `📤 **Translated Text (${targetLangName}):**\n`;
    message += `${translated}\n\n`;
    
    message += `🔤 **Language Pair:** ${detectedLangName} → ${targetLangName}\n`;
    message += `📏 **Characters:** ${original.length} → ${translated.length}\n\n`;
    
    message += `💡 **Tip:** Use ${global.config.prefix}translate list to see all supported languages.`;
    
    return message;
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