const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const moment = require('moment-timezone');

class Helpers {
    constructor() {
        this.utils = require('./index');
        this.logger = require('./log');
    }

    // Message formatting helpers
    formatHelpMessage(command, description, usage, aliases = []) {
        const prefix = global.config?.prefix || '!';
        
        let message = `🎯 *Command:* ${command}\n`;
        message += `📝 *Description:* ${description}\n`;
        message += `💡 *Usage:* ${prefix}${usage}\n`;
        
        if (aliases.length > 0) {
            message += `🔤 *Aliases:* ${aliases.map(a => `${prefix}${a}`).join(', ')}\n`;
        }
        
        message += `👑 *Permission:* ${this.getPermissionLevel(command)}`;
        
        return message;
    }

    getPermissionLevel(command) {
        const adminCommands = ['eval', 'exec', 'shell', 'admin', 'ban', 'kick'];
        const ownerCommands = ['restart', 'shutdown', 'setprefix', 'setadmin'];
        
        if (ownerCommands.includes(command)) return 'Owner Only';
        if (adminCommands.includes(command)) return 'Admin Only';
        return 'Everyone';
    }

    // User mention helpers
    createMentionList(userIDs, api) {
        return userIDs.map(id => `@${id}`).join(' ');
    }

    async getUserInfo(api, userID) {
        try {
            const userInfo = await api.getUserInfo(userID);
            return userInfo[userID] || { name: 'Unknown User', id: userID };
        } catch (error) {
            this.logger.error('Error getting user info', error);
            return { name: 'Unknown User', id: userID };
        }
    }

    // Thread/Group helpers
    async getThreadInfo(api, threadID) {
        try {
            const threadInfo = await api.getThreadInfo(threadID);
            return threadInfo;
        } catch (error) {
            this.logger.error('Error getting thread info', error);
            return null;
        }
    }

    // Economy helpers
    formatCoins(amount) {
        return `${amount.toLocaleString()} 🪙`;
    }

    generateWorkReward() {
        const min = global.config?.economy?.workCoinsMin || 100;
        const max = global.config?.economy?.workCoinsMax || 1000;
        return this.utils.getRandomInt(min, max);
    }

    // AI response helpers
    async getAIResponse(prompt, apiKey = null) {
        try {
            const axios = require('axios');
            const key = apiKey || global.config?.apiConfig?.openai;
            
            if (!key) {
                return "AI service is not configured. Please add an API key in config.json";
            }

            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 500,
                temperature: 0.7
            }, {
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data.choices[0].message.content.trim();
        } catch (error) {
            this.logger.error('Error getting AI response', error);
            return "Sorry, I couldn't process your request at the moment.";
        }
    }

    // Image processing helpers
    async downloadImage(url) {
        try {
            const axios = require('axios');
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            return Buffer.from(response.data, 'binary');
        } catch (error) {
            this.logger.error('Error downloading image', error);
            return null;
        }
    }

    // Weather helpers
    async getWeather(city) {
        try {
            const axios = require('axios');
            const apiKey = global.config?.apiConfig?.weather;
            
            if (!apiKey) {
                return "Weather API key not configured.";
            }

            const response = await axios.get(
                `http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`
            );

            const weather = response.data;
            return {
                city: weather.name,
                country: weather.sys.country,
                temp: Math.round(weather.main.temp),
                feels_like: Math.round(weather.main.feels_like),
                humidity: weather.main.humidity,
                description: weather.weather[0].description,
                icon: weather.weather[0].icon
            };
        } catch (error) {
            this.logger.error('Error getting weather', error);
            return null;
        }
    }

    // Time conversion helpers
    convertTimezone(time, fromZone, toZone) {
        return moment.tz(time, fromZone).tz(toZone).format('YYYY-MM-DD HH:mm:ss');
    }

    // File helpers
    async saveAttachment(attachment, filename) {
        try {
            const cacheDir = path.join(__dirname, '../cache');
            const filePath = path.join(cacheDir, filename);
            
            await fs.writeFile(filePath, attachment);
            return filePath;
        } catch (error) {
            this.logger.error('Error saving attachment', error);
            return null;
        }
    }

    // Validation helpers
    validateCommandArgs(args, expectedCount, usage) {
        if (args.length < expectedCount) {
            return {
                valid: false,
                message: `❌ Invalid arguments. Usage: ${global.config?.prefix || '!'}${usage}`
            };
        }
        return { valid: true };
    }

    // Rate limiting helpers
    checkRateLimit(userID, command) {
        const rateLimiter = this.utils.createRateLimiter(5, 60000); // 5 commands per minute
        return rateLimiter(`${userID}_${command}`);
    }

    // Error response helpers
    createErrorResponse(error, context = '') {
        const errorId = this.utils.generateToken(6);
        this.logger.logError(context, error);
        
        return {
            errorId,
            message: `❌ An error occurred (ID: ${errorId}). Please try again later.`,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        };
    }

    // Success response helpers
    createSuccessResponse(message, data = null) {
        return {
            success: true,
            message: `✅ ${message}`,
            data
        };
    }

    // Progress tracking
    createProgressTracker(total, message = 'Processing') {
        let current = 0;
        
        return {
            increment: (amount = 1) => {
                current += amount;
                const percentage = Math.round((current / total) * 100);
                console.log(chalk.blue(`${message}: ${percentage}% (${current}/${total})`));
            },
            getProgress: () => ({
                current,
                total,
                percentage: Math.round((current / total) * 100)
            })
        };
    }

    // Template system
    loadTemplate(templateName, variables = {}) {
        try {
            const templatePath = path.join(__dirname, '../templates', `${templateName}.txt`);
            
            if (!fs.existsSync(templatePath)) {
                return `Template ${templateName} not found.`;
            }

            let template = fs.readFileSync(templatePath, 'utf8');
            
            // Replace variables
            for (const [key, value] of Object.entries(variables)) {
                template = template.replace(new RegExp(`{{${key}}}`, 'g'), value);
            }

            return template;
        } catch (error) {
            this.logger.error('Error loading template', error);
            return `Error loading template: ${templateName}`;
        }
    }

    // Random quote generator
    getRandomQuote() {
        const quotes = [
            "The only way to do great work is to love what you do. - Steve Jobs",
            "Innovation distinguishes between a leader and a follower. - Steve Jobs",
            "The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt",
            "Don't watch the clock; do what it does. Keep going. - Sam Levenson",
            "The only limit to our realization of tomorrow will be our doubts of today. - Franklin D. Roosevelt",
            "বিশ্বাস করো, সবই সম্ভব। - রানা",
            "যেখানে ইচ্ছা, সেখানে পথ। - বাংলা প্রবাদ",
            "কঠিন পরিশ্রম কখনো বৃথা যায় না। - অজানা"
        ];
        
        return this.utils.getRandomElement(quotes);
    }

    // Fact generator
    getRandomFact() {
        const facts = [
            "হাতিরা একমাত্র স্তন্যপায়ী প্রাণী যারা লাফাতে পারে না।",
            "একটি শামুক ৩ বছর পর্যন্ত ঘুমাতে পারে।",
            "ডলফিন এক চোখ খোলা রেখে ঘুমায়।",
            "মধু কখনো নষ্ট হয় না।",
            "আপনার নাক এবং কান জীবনে কখনো বড় হওয়া বন্ধ করে না।",
            "একটি কুমিরের জিভ বের করতে পারে না।",
            "প্রজাপতি তার পা দিয়ে স্বাদ গ্রহণ করে।"
        ];
        
        return this.utils.getRandomElement(facts);
    }

    // Joke generator
    getRandomJoke() {
        const jokes = [
            "কম্পিউটার: আমি ক্লান্ত, আমি সারাদিন কাজ করেছি।\nইউজার: ঠিক আছে, একটা বিরতি নাও।\nকম্পিউটার: আমি ব্রেক নিতে জানি না, আমি শুধু ক্র্যাশ করতে জানি।",
            "কোন প্রোগ্রামার সবচেয়ে বেশি ভীত?\nযে প্রোগ্রামার NullPointerException থেকে ভীত!",
            "কেন প্রোগ্রামাররা অন্ধকারে কাজ করতে পছন্দ করে?\nকারণ আলোতে বাগ দেখা যায়!",
            "একজন প্রোগ্রামার তার বন্ধুকে বলল: 'আমি তোমাকে একটা মজার জোক বলব, কিন্তু তুমি এটা বুঝবে না।'\nবন্ধু: 'কেন?'\nপ্রোগ্রামার: 'কারণ এটা শেল স্ক্রিপ্টে লেখা!'"
        ];
        
        return this.utils.getRandomElement(jokes);
    }

    // Password generator
    generatePassword(length = 12) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return password;
    }

    // Color code converter
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    // URL shortener (dummy function - needs real API)
    async shortenUrl(url) {
        // This is a placeholder - you need to implement with a real URL shortener API
        return url; // Return original URL for now
    }

    // Text analyzer
    analyzeText(text) {
        const words = text.trim().split(/\s+/);
        const characters = text.length;
        const sentences = text.split(/[.!?]+/).length - 1;
        const paragraphs = text.split(/\n\s*\n/).length;
        
        return {
            words: words.length,
            characters,
            sentences,
            paragraphs,
            readingTime: Math.ceil(words.length / 200) // Average reading speed: 200 words/minute
        };
    }

    // Emoji helper
    getEmoji(type) {
        const emojis = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
            question: '❓',
            star: '⭐',
            heart: '❤️',
            fire: '🔥',
            thumbsup: '👍',
            thumbsdown: '👎'
        };
        
        return emojis[type] || '🔹';
    }

    // Format bytes to human readable
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // Create a delay
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Validate email
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // Create a unique ID
    createUniqueId(prefix = '') {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `${prefix}${timestamp}${random}`.toUpperCase();
    }

    // Truncate text with ellipsis
    truncateText(text, maxLength = 100) {
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength - 3) + '...';
    }

    // Get current timestamp in different formats
    getTimestamp(format = 'full') {
        const formats = {
            full: 'YYYY-MM-DD HH:mm:ss',
            date: 'YYYY-MM-DD',
            time: 'HH:mm:ss',
            iso: 'YYYY-MM-DDTHH:mm:ssZ',
            human: 'MMMM Do YYYY, h:mm:ss a'
        };
        
        const selectedFormat = formats[format] || format;
        return moment().tz(global.config?.timezone || 'Asia/Dhaka').format(selectedFormat);
    }
}

module.exports = new Helpers();