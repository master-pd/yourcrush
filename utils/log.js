const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const moment = require('moment-timezone');

class Logger {
    constructor() {
        this.logsDir = path.join(__dirname, '../logs');
        this.ensureLogsDirectory();
        this.setupLogLevels();
    }

    ensureLogsDirectory() {
        if (!fs.existsSync(this.logsDir)) {
            fs.mkdirSync(this.logsDir, { recursive: true });
        }
    }

    setupLogLevels() {
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };

        this.colors = {
            error: chalk.red.bold,
            warn: chalk.yellow.bold,
            info: chalk.blue.bold,
            debug: chalk.gray.bold,
            success: chalk.green.bold
        };

        this.currentLevel = process.env.LOG_LEVEL || 'info';
    }

    getTimestamp() {
        return moment().tz(global.config?.timezone || 'Asia/Dhaka').format('YYYY-MM-DD HH:mm:ss.SSS');
    }

    getLogFilePath() {
        const date = moment().tz(global.config?.timezone || 'Asia/Dhaka').format('YYYY-MM-DD');
        return path.join(this.logsDir, `${date}.log`);
    }

    writeToFile(level, message, data = null) {
        try {
            const logEntry = {
                timestamp: this.getTimestamp(),
                level: level.toUpperCase(),
                message,
                data: data || undefined
            };

            const logString = JSON.stringify(logEntry) + '\n';
            fs.appendFileSync(this.getLogFilePath(), logString);
        } catch (error) {
            console.error(chalk.red('Error writing to log file:'), error);
        }
    }

    shouldLog(level) {
        return this.levels[level] <= this.levels[this.currentLevel];
    }

    log(level, message, data = null) {
        if (!this.shouldLog(level)) return;

        const timestamp = chalk.gray(`[${this.getTimestamp()}]`);
        const levelTag = this.colors[level] ? this.colors[level](`[${level.toUpperCase()}]`) : `[${level.toUpperCase()}]`;
        
        console.log(`${timestamp} ${levelTag} ${message}`);
        
        if (data) {
            if (typeof data === 'object') {
                console.log(chalk.gray(JSON.stringify(data, null, 2)));
            } else {
                console.log(chalk.gray(data));
            }
        }

        // Write to file
        this.writeToFile(level, message, data);
    }

    // Convenience methods
    error(message, error = null) {
        this.log('error', message, error);
    }

    warn(message, data = null) {
        this.log('warn', message, data);
    }

    info(message, data = null) {
        this.log('info', message, data);
    }

    debug(message, data = null) {
        this.log('debug', message, data);
    }

    success(message, data = null) {
        const timestamp = chalk.gray(`[${this.getTimestamp()}]`);
        const levelTag = this.colors.success('[SUCCESS]');
        console.log(`${timestamp} ${levelTag} ${message}`);
        
        if (data) {
            console.log(chalk.gray(JSON.stringify(data, null, 2)));
        }
        
        this.writeToFile('info', `SUCCESS: ${message}`, data);
    }

    // Command logging
    logCommand(userID, threadID, command, args = []) {
        const logEntry = {
            timestamp: this.getTimestamp(),
            type: 'COMMAND',
            userID,
            threadID,
            command,
            args,
            botName: global.botInfo?.name || 'YOUR CRUSH BOT'
        };

        const commandLogPath = path.join(this.logsDir, 'commands.log');
        fs.appendFileSync(commandLogPath, JSON.stringify(logEntry) + '\n');

        if (this.shouldLog('debug')) {
            this.debug(`Command: ${command} by ${userID} in ${threadID}`, { args });
        }
    }

    // Message logging
    logMessage(senderID, threadID, message, type = 'message') {
        const logEntry = {
            timestamp: this.getTimestamp(),
            type: type.toUpperCase(),
            senderID,
            threadID,
            message: message.substring(0, 200), // Limit message length
            length: message.length
        };

        const messageLogPath = path.join(this.logsDir, 'messages.log');
        fs.appendFileSync(messageLogPath, JSON.stringify(logEntry) + '\n');
    }

    // Error logging with context
    logError(context, error, extra = {}) {
        const errorId = require('./index').generateToken(8);
        
        const errorEntry = {
            id: errorId,
            timestamp: this.getTimestamp(),
            context,
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name
            },
            extra,
            botVersion: global.botInfo?.version || 'unknown'
        };

        // Write to error log
        const errorLogPath = path.join(this.logsDir, 'errors.log');
        fs.appendFileSync(errorLogPath, JSON.stringify(errorEntry) + '\n');

        // Write to daily error file
        const date = moment().tz(global.config?.timezone || 'Asia/Dhaka').format('YYYY-MM-DD');
        const dailyErrorPath = path.join(this.logsDir, `errors_${date}.json`);
        fs.appendFileSync(dailyErrorPath, JSON.stringify(errorEntry) + '\n');

        this.error(`Error [${errorId}] in ${context}: ${error.message}`);
        
        return errorId;
    }

    // Performance logging
    logPerformance(operation, duration, details = {}) {
        const logEntry = {
            timestamp: this.getTimestamp(),
            type: 'PERFORMANCE',
            operation,
            duration,
            unit: 'ms',
            details
        };

        const perfLogPath = path.join(this.logsDir, 'performance.log');
        fs.appendFileSync(perfLogPath, JSON.stringify(logEntry) + '\n');

        if (duration > 1000) { // Log if operation took more than 1 second
            this.warn(`Slow operation: ${operation} took ${duration}ms`, details);
        }
    }

    // User activity logging
    logUserActivity(userID, action, details = {}) {
        const logEntry = {
            timestamp: this.getTimestamp(),
            type: 'USER_ACTIVITY',
            userID,
            action,
            details
        };

        const activityLogPath = path.join(this.logsDir, 'activity.log');
        fs.appendFileSync(activityLogPath, JSON.stringify(logEntry) + '\n');
    }

    // Database logging
    logDatabase(operation, query, duration, success = true) {
        const logEntry = {
            timestamp: this.getTimestamp(),
            type: 'DATABASE',
            operation,
            query: typeof query === 'string' ? query : JSON.stringify(query),
            duration,
            success
        };

        const dbLogPath = path.join(this.logsDir, 'database.log');
        fs.appendFileSync(dbLogPath, JSON.stringify(logEntry) + '\n');

        if (duration > 500) { // Log if query took more than 500ms
            this.warn(`Slow database query: ${operation} took ${duration}ms`);
        }
    }

    // System statistics logging
    logStatistics(stats) {
        const logEntry = {
            timestamp: this.getTimestamp(),
            type: 'STATISTICS',
            ...stats
        };

        const statsLogPath = path.join(this.logsDir, 'statistics.log');
        fs.appendFileSync(statsLogPath, JSON.stringify(logEntry) + '\n');

        // Also log to console if debug mode
        if (this.shouldLog('debug')) {
            this.debug('System Statistics', stats);
        }
    }

    // Clean old logs
    cleanOldLogs(daysToKeep = 7) {
        try {
            const files = fs.readdirSync(this.logsDir);
            const cutoff = moment().subtract(daysToKeep, 'days').valueOf();

            for (const file of files) {
                const filePath = path.join(this.logsDir, file);
                const stats = fs.statSync(filePath);

                if (stats.mtimeMs < cutoff) {
                    fs.unlinkSync(filePath);
                    this.info(`Cleaned old log file: ${file}`);
                }
            }
        } catch (error) {
            this.error('Error cleaning old logs', error);
        }
    }

    // Get log statistics
    getLogStats() {
        try {
            const files = fs.readdirSync(this.logsDir);
            const stats = {
                totalFiles: files.length,
                totalSize: 0,
                files: []
            };

            for (const file of files) {
                const filePath = path.join(this.logsDir, file);
                const fileStats = fs.statSync(filePath);
                
                stats.totalSize += fileStats.size;
                stats.files.push({
                    name: file,
                    size: fileStats.size,
                    modified: moment(fileStats.mtime).format('YYYY-MM-DD HH:mm:ss')
                });
            }

            stats.totalSizeFormatted = this.formatFileSize(stats.totalSize);
            return stats;
        } catch (error) {
            this.error('Error getting log stats', error);
            return null;
        }
    }

    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Byte';
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    }

    // Export logs
    exportLogs(startDate, endDate) {
        try {
            const logs = [];
            const files = fs.readdirSync(this.logsDir);

            for (const file of files) {
                if (file.endsWith('.log') || file.endsWith('.json')) {
                    const filePath = path.join(this.logsDir, file);
                    const content = fs.readFileSync(filePath, 'utf8');
                    
                    content.split('\n').forEach(line => {
                        if (line.trim()) {
                            try {
                                const logEntry = JSON.parse(line);
                                const logDate = moment(logEntry.timestamp);
                                
                                if (logDate.isBetween(startDate, endDate, null, '[]')) {
                                    logs.push(logEntry);
                                }
                            } catch (e) {
                                // Skip invalid JSON lines
                            }
                        }
                    });
                }
            }

            return logs;
        } catch (error) {
            this.error('Error exporting logs', error);
            return [];
        }
    }

    // Real-time log monitoring
    createLogStream(callback) {
        const logPath = this.getLogFilePath();
        
        fs.watchFile(logPath, (curr, prev) => {
            if (curr.mtime !== prev.mtime) {
                try {
                    const content = fs.readFileSync(logPath, 'utf8');
                    const lines = content.trim().split('\n');
                    const newLines = lines.slice(-10); // Get last 10 lines
                    
                    callback(newLines.map(line => {
                        try {
                            return JSON.parse(line);
                        } catch (e) {
                            return { raw: line };
                        }
                    }));
                } catch (error) {
                    callback([{ error: error.message }]);
                }
            }
        });
    }

    // Custom log format
    customLog(level, category, message, data = null) {
        const logEntry = {
            timestamp: this.getTimestamp(),
            level: level.toUpperCase(),
            category,
            message,
            data
        };

        const customLogPath = path.join(this.logsDir, `${category}.log`);
        fs.appendFileSync(customLogPath, JSON.stringify(logEntry) + '\n');

        const colorMap = {
            'SECURITY': chalk.red,
            'SYSTEM': chalk.cyan,
            'NETWORK': chalk.magenta,
            'USER': chalk.blue
        };

        const color = colorMap[category] || chalk.white;
        console.log(`${chalk.gray(`[${this.getTimestamp()}]`)} ${color(`[${category}]`)} ${message}`);
    }
}

module.exports = new Logger();