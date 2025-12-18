const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const chalk = require('chalk');
const moment = require('moment-timezone');

class Utils {
    constructor() {
        this.cacheDir = path.join(__dirname, '../cache');
        this.logsDir = path.join(__dirname, '../logs');
        this.ensureDirectories();
    }

    ensureDirectories() {
        const dirs = [this.cacheDir, this.logsDir];
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    // Random utilities
    getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    getRandomElement(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Time utilities
    formatTime(time) {
        return moment(time).tz(global.config?.timezone || 'Asia/Dhaka').format('YYYY-MM-DD HH:mm:ss');
    }

    getCurrentTime() {
        return moment().tz(global.config?.timezone || 'Asia/Dhaka').format('HH:mm:ss');
    }

    getCurrentDate() {
        return moment().tz(global.config?.timezone || 'Asia/Dhaka').format('YYYY-MM-DD');
    }

    formatDuration(ms) {
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
        const days = Math.floor(ms / (1000 * 60 * 60 * 24));

        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (seconds > 0) parts.push(`${seconds}s`);

        return parts.join(' ') || '0s';
    }

    // String utilities
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    trimString(str, length = 100) {
        if (str.length <= length) return str;
        return str.substring(0, length) + '...';
    }

    removeAccents(str) {
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    // File utilities
    async readJson(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                const data = await fs.readJson(filePath);
                return data;
            }
            return null;
        } catch (error) {
            console.error(chalk.red(`Error reading JSON ${filePath}:`), error);
            return null;
        }
    }

    async writeJson(filePath, data) {
        try {
            await fs.writeJson(filePath, data, { spaces: 2 });
            return true;
        } catch (error) {
            console.error(chalk.red(`Error writing JSON ${filePath}:`), error);
            return false;
        }
    }

    async appendToFile(filePath, data) {
        try {
            await fs.appendFile(filePath, data + '\n');
            return true;
        } catch (error) {
            console.error(chalk.red(`Error appending to ${filePath}:`), error);
            return false;
        }
    }

    // Cache utilities
    getCachePath(filename) {
        return path.join(this.cacheDir, filename);
    }

    async saveToCache(filename, data) {
        const filePath = this.getCachePath(filename);
        return await this.writeJson(filePath, data);
    }

    async loadFromCache(filename) {
        const filePath = this.getCachePath(filename);
        return await this.readJson(filePath);
    }

    async clearCache(olderThan = 24 * 60 * 60 * 1000) { // Default: 24 hours
        try {
            const files = await fs.readdir(this.cacheDir);
            const now = Date.now();
            
            for (const file of files) {
                const filePath = path.join(this.cacheDir, file);
                const stats = await fs.stat(filePath);
                
                if (now - stats.mtimeMs > olderThan) {
                    await fs.unlink(filePath);
                    console.log(chalk.yellow(`Cleared cache: ${file}`));
                }
            }
            
            return true;
        } catch (error) {
            console.error(chalk.red('Error clearing cache:'), error);
            return false;
        }
    }

    // Validation utilities
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    isEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isPhoneNumber(phone) {
        const phoneRegex = /^[\+]?[0-9]{10,15}$/;
        return phoneRegex.test(phone);
    }

    // Number utilities
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    parseNumber(str) {
        const num = parseFloat(str);
        if (isNaN(num)) return 0;
        return num;
    }

    // Array utilities
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    uniqueArray(array) {
        return [...new Set(array)];
    }

    // Object utilities
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    mergeObjects(target, source) {
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (!target[key]) target[key] = {};
                this.mergeObjects(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
        return target;
    }

    // Encryption utilities
    hashString(str, algorithm = 'md5') {
        return crypto.createHash(algorithm).update(str).digest('hex');
    }

    generateToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    // Color utilities
    getRandomColor() {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#FFE66D', '#1A535C', '#FF9F1C',
            '#2EC4B6', '#E71D36', '#FF9F1C', '#011627', '#2EC4B6',
            '#E71D36', '#FF9F1C', '#011627', '#2EC4B6', '#E71D36'
        ];
        return this.getRandomElement(colors);
    }

    // Progress bar
    createProgressBar(current, total, length = 20) {
        const percentage = current / total;
        const filledLength = Math.round(length * percentage);
        const emptyLength = length - filledLength;
        
        const filledBar = '█'.repeat(filledLength);
        const emptyBar = '░'.repeat(emptyLength);
        
        return `[${filledBar}${emptyBar}] ${Math.round(percentage * 100)}%`;
    }

    // Command utilities
    parseCommand(text) {
        const prefix = global.config?.prefix || '!';
        if (!text.startsWith(prefix)) return null;
        
        const args = text.slice(prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        
        return { command, args, text: text.slice(prefix.length).trim() };
    }

    // Error handling
    handleError(error, context = '') {
        const errorId = this.generateToken(8);
        const timestamp = this.formatTime(Date.now());
        
        const errorData = {
            id: errorId,
            timestamp,
            context,
            error: error.message,
            stack: error.stack,
            date: this.getCurrentDate()
        };
        
        // Log to file
        const errorLogPath = path.join(this.logsDir, `errors_${this.getCurrentDate()}.json`);
        this.appendToFile(errorLogPath, JSON.stringify(errorData));
        
        // Log to console
        console.error(chalk.red(`[${errorId}] Error in ${context}:`), error.message);
        
        return errorId;
    }

    // Performance monitoring
    startTimer() {
        return {
            start: Date.now(),
            elapsed: function() {
                return Date.now() - this.start;
            },
            formatted: function() {
                return this.formatDuration(this.elapsed());
            }
        };
    }

    // Download utilities
    async downloadFile(url, filename) {
        const axios = require('axios');
        const writer = fs.createWriteStream(filename);
        
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });
        
        response.data.pipe(writer);
        
        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    }

    // Image utilities
    async validateImage(buffer) {
        try {
            const size = buffer.length;
            if (size > (global.config?.maxUploadSize || 26214400)) {
                return { valid: false, error: 'File too large' };
            }
            
            // Check if it's a valid image by checking magic bytes
            const magic = buffer.toString('hex', 0, 4);
            const validMagics = ['89504e47', 'ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2', 'ffd8ffe3', 'ffd8ffe8', '47494638'];
            
            if (validMagics.includes(magic)) {
                return { valid: true, type: this.getImageType(magic) };
            }
            
            return { valid: false, error: 'Invalid image format' };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    getImageType(magic) {
        const types = {
            '89504e47': 'png',
            'ffd8ffe0': 'jpg',
            'ffd8ffe1': 'jpg',
            'ffd8ffe2': 'jpg',
            'ffd8ffe3': 'jpg',
            'ffd8ffe8': 'jpg',
            '47494638': 'gif'
        };
        return types[magic] || 'unknown';
    }

    // User mention formatting
    formatMention(userID, name) {
        return `@${name}`;
    }

    // Currency formatting
    formatCurrency(amount, currency = '৳') {
        return `${currency}${amount.toLocaleString()}`;
    }

    // Text formatting for Facebook
    formatBold(text) {
        return `*${text}*`;
    }

    formatItalic(text) {
        return `_${text}_`;
    }

    formatMonospace(text) {
        return `\`${text}\``;
    }

    // Clean text for commands
    cleanText(text) {
        return text
            .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII
            .replace(/\s+/g, ' ') // Multiple spaces to single
            .trim();
    }

    // Rate limiting
    createRateLimiter(limit, interval) {
        const calls = new Map();
        
        return function(key) {
            const now = Date.now();
            const userCalls = calls.get(key) || [];
            
            // Remove old calls
            const recentCalls = userCalls.filter(time => now - time < interval);
            
            if (recentCalls.length >= limit) {
                return false;
            }
            
            recentCalls.push(now);
            calls.set(key, recentCalls);
            return true;
        };
    }

    // Cooldown system
    createCooldown(cooldownTime) {
        const cooldowns = new Map();
        
        return function(key) {
            const now = Date.now();
            const lastUsed = cooldowns.get(key);
            
            if (lastUsed && now - lastUsed < cooldownTime) {
                const remaining = cooldownTime - (now - lastUsed);
                return { onCooldown: true, remaining };
            }
            
            cooldowns.set(key, now);
            return { onCooldown: false, remaining: 0 };
        };
    }

    // Pagination
    paginateArray(array, page, itemsPerPage = 10) {
        const totalPages = Math.ceil(array.length / itemsPerPage);
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const items = array.slice(startIndex, endIndex);
        
        return {
            items,
            page,
            totalPages,
            totalItems: array.length,
            hasNext: page < totalPages,
            hasPrev: page > 1
        };
    }

    // Search utilities
    searchArray(array, query, fields = []) {
        const lowerQuery = query.toLowerCase();
        
        return array.filter(item => {
            for (const field of fields) {
                if (item[field] && item[field].toString().toLowerCase().includes(lowerQuery)) {
                    return true;
                }
            }
            return false;
        });
    }

    // Template rendering (simple)
    renderTemplate(template, data) {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return data[key] || match;
        });
    }
}

module.exports = new Utils();