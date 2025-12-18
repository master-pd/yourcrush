const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');
const login = require('fca-unofficial');
const colors = require('colors');
const axios = require('axios');
const moment = require('moment-timezone');
const { Sequelize, DataTypes } = require('sequelize');

// Load configuration
const config = require('./config.json');

// Initialize logger
const logger = require('./utils/log.js');

// Global variables
global.config = config;
global.logger = logger;
global.moment = moment;
global.axios = axios;

// Load database
const database = require('./includes/database/index.js');

// Commands and events storage
global.commands = new Map();
global.events = new Map();
global.cooldowns = new Map();
global.threadData = new Map();
global.userData = new Map();

// Anti-spam system
global.messageCount = new Map();
global.commandCount = new Map();

class Bot {
    constructor() {
        this.api = null;
        this.botID = null;
        this.botName = null;
        this.isReady = false;
    }

    async initialize() {
        try {
            logger.system('══════════════════════════════════════');
            logger.system(`${config.botInfo.name} v${config.botInfo.version}`);
            logger.system(`Developer: ${config.botInfo.author}`);
            logger.system('══════════════════════════════════════');

            // Initialize database
            await database.initialize();
            logger.system('Database initialized');

            // Load all modules
            await this.loadModules();
            
            // Login to Facebook
            await this.login();
            
            // Setup event listeners
            this.setupListeners();
            
            // Mark as ready
            this.isReady = true;
            
            logger.system('Bot initialization completed!');
            logger.system(`Prefix: ${config.prefix} | Ready: ${this.isReady}`);
            
        } catch (error) {
            logger.error(`Initialization failed: ${error.message}`);
            logger.error(error.stack);
            process.exit(1);
        }
    }

    async loadModules() {
        // Load commands
        await this.loadCommands();
        
        // Load events
        await this.loadEvents();
        
        // Load custom modules
        await this.loadCustomModules();
    }

    async loadCommands() {
        const commandsPath = path.join(__dirname, 'Script', 'commands');
        
        if (!fs.existsSync(commandsPath)) {
            fs.mkdirSync(commandsPath, { recursive: true });
            logger.system('Commands directory created');
            return;
        }

        const commandFiles = fs.readdirSync(commandsPath)
            .filter(file => file.endsWith('.js') && !file.startsWith('_'));

        let loadedCount = 0;
        let errorCount = 0;

        for (const file of commandFiles) {
            try {
                const commandPath = path.join(commandsPath, file);
                const command = require(commandPath);
                
                if (command && command.config && command.config.name) {
                    const cmdName = command.config.name.toLowerCase();
                    
                    // Validate command structure
                    if (!command.onStart && !command.run && !command.execute) {
                        logger.error(`Command ${cmdName} has no execute method`);
                        continue;
                    }
                    
                    commands.set(cmdName, command);
                    
                    // Set aliases if exist
                    if (command.config.aliases && Array.isArray(command.config.aliases)) {
                        command.config.aliases.forEach(alias => {
                            commands.set(alias.toLowerCase(), command);
                        });
                    }
                    
                    loadedCount++;
                    logger.command(`✓ ${cmdName} (v${command.config.version || '1.0'})`);
                }
            } catch (error) {
                errorCount++;
                logger.error(`Failed to load ${file}: ${error.message}`);
            }
        }
        
        logger.system(`Commands: ${loadedCount} loaded, ${errorCount} failed`);
    }

    async loadEvents() {
        const eventsPath = path.join(__dirname, 'Script', 'events');
        
        if (!fs.existsSync(eventsPath)) {
            fs.mkdirSync(eventsPath, { recursive: true });
            logger.system('Events directory created');
            return;
        }

        const eventFiles = fs.readdirSync(eventsPath)
            .filter(file => file.endsWith('.js') && !file.startsWith('_'));

        let loadedCount = 0;
        let errorCount = 0;

        for (const file of eventFiles) {
            try {
                const eventPath = path.join(eventsPath, file);
                const event = require(eventPath);
                
                if (event && event.name && event.execute) {
                    events.set(event.name, event);
                    loadedCount++;
                    logger.event(`✓ ${event.name}`);
                }
            } catch (error) {
                errorCount++;
                logger.error(`Failed to load event ${file}: ${error.message}`);
            }
        }
        
        logger.system(`Events: ${loadedCount} loaded, ${errorCount} failed`);
    }

    async loadCustomModules() {
        const modules = ['utils/index.js'];
        
        for (const modulePath of modules) {
            try {
                const fullPath = path.join(__dirname, modulePath);
                if (fs.existsSync(fullPath)) {
                    require(fullPath);
                    logger.system(`Module loaded: ${modulePath}`);
                }
            } catch (error) {
                logger.error(`Failed to load module ${modulePath}: ${error.message}`);
            }
        }
    }

    async login() {
        try {
            logger.system('Attempting Facebook login...');
            
            const appState = require('./appstate.json');
            
            this.api = await login({
                appState: appState,
                logLevel: 'silent',
                forceLogin: true,
                listenEvents: true,
                selfListen: false
            });
            
            // Get bot info
            const userInfo = await this.api.getUserInfo(this.api.getCurrentUserID());
            this.botID = this.api.getCurrentUserID();
            this.botName = userInfo[this.botID].name;
            
            logger.system(`Logged in as: ${this.botName} (${this.botID})`);
            
        } catch (error) {
            logger.error(`Login failed: ${error.message}`);
            
            // Try alternative login method
            await this.alternativeLogin();
        }
    }

    async alternativeLogin() {
        try {
            logger.system('Trying alternative login method...');
            
            // If appstate.json doesn't exist, create from cookies
            if (!fs.existsSync('./appstate.json')) {
                const { getAppState } = require('fca-unofficial');
                // You'll need to implement cookie to appstate conversion
                logger.error('No appstate found. Please provide credentials.');
                process.exit(1);
            }
            
            // Retry with different options
            this.api = await login({
                appState: require('./appstate.json'),
                logLevel: 'error'
            });
            
            logger.system('Alternative login successful!');
        } catch (error) {
            logger.error(`All login methods failed: ${error.message}`);
            process.exit(1);
        }
    }

    setupListeners() {
        if (!this.api) {
            logger.error('Cannot setup listeners: API not available');
            return;
        }

        // Message listener
        this.api.listen(async (err, event) => {
            if (err) {
                logger.error(`Listener error: ${err.message}`);
                return;
            }
            
            try {
                await this.handleEvent(event);
            } catch (error) {
                logger.error(`Event handler error: ${error.message}`);
            }
        });

        // Error handling
        this.api.on('error', (error) => {
            logger.error(`API Error: ${error.message}`);
        });

        logger.system('Event listeners setup completed');
    }

    async handleEvent(event) {
        // Rate limiting check
        if (!this.checkRateLimit(event)) {
            return;
        }

        // Handle different event types
        switch (event.type) {
            case 'message':
            case 'message_reply':
                await this.handleMessage(event);
                break;
                
            case 'event':
                await this.handleSystemEvent(event);
                break;
                
            case 'message_unsend':
                await this.handleUnsend(event);
                break;
                
            default:
                // Handle custom events
                for (const [name, handler] of events) {
                    if (handler.shouldExecute && handler.shouldExecute(event)) {
                        await handler.execute(this.api, event, config);
                    }
                }
        }
    }

    checkRateLimit(event) {
        const { senderID, threadID } = event;
        
        // Initialize counters
        if (!messageCount.has(senderID)) {
            messageCount.set(senderID, { count: 0, lastReset: Date.now() });
        }
        
        if (!messageCount.has(threadID)) {
            messageCount.set(threadID, { count: 0, lastReset: Date.now() });
        }
        
        // Reset counters every minute
        const now = Date.now();
        const senderData = messageCount.get(senderID);
        const threadData = messageCount.get(threadID);
        
        if (now - senderData.lastReset > 60000) {
            senderData.count = 0;
            senderData.lastReset = now;
        }
        
        if (now - threadData.lastReset > 60000) {
            threadData.count = 0;
            threadData.lastReset = now;
        }
        
        // Check limits
        if (senderData.count > config.limits.maxMessagesPerMinute) {
            logger.warn(`Rate limit exceeded for user ${senderID}`);
            return false;
        }
        
        if (threadData.count > config.limits.maxMessagesPerMinute * 2) {
            logger.warn(`Rate limit exceeded for thread ${threadID}`);
            return false;
        }
        
        // Increment counters
        senderData.count++;
        threadData.count++;
        
        return true;
    }

    async handleMessage(event) {
        const { body, threadID, messageID, senderID } = event;
        
        // Ignore bot's own messages
        if (senderID === this.botID) return;
        
        // Check for prefix
        if (!body || !body.startsWith(config.prefix)) {
            // Handle non-command messages (auto-reply, etc.)
            await this.handleNonCommand(event);
            return;
        }
        
        // Parse command
        const args = body.slice(config.prefix.length).trim().split(/\s+/);
        const cmdName = args.shift().toLowerCase();
        
        // Check if command exists
        const command = commands.get(cmdName);
        if (!command) {
            // Check for aliases
            for (const [name, cmd] of commands) {
                if (cmd.config && cmd.config.aliases && cmd.config.aliases.includes(cmdName)) {
                    return await this.executeCommand(cmd, event, args);
                }
            }
            return;
        }
        
        // Execute command
        await this.executeCommand(command, event, args);
    }

    async executeCommand(command, event, args) {
        const { threadID, messageID, senderID } = event;
        
        // Check cooldown
        if (this.isOnCooldown(command, senderID)) {
            const remaining = this.getCooldownRemaining(command, senderID);
            this.api.sendMessage(
                `⏱️ Please wait ${remaining} seconds before using this command again.`,
                threadID,
                messageID
            );
            return;
        }
        
        // Check permissions
        if (!this.hasPermission(command, senderID, threadID)) {
            this.api.sendMessage(
                '❌ You do not have permission to use this command.',
                threadID,
                messageID
            );
            return;
        }
        
        // Set cooldown
        this.setCooldown(command, senderID);
        
        // Log command execution
        logger.command(`${command.config.name} executed by ${senderID} in ${threadID}`);
        
        try {
            // Execute command
            if (command.onStart) {
                await command.onStart({
                    api: this.api,
                    event: event,
                    args: args,
                    config: config,
                    commands: commands,
                    logger: logger,
                    database: database
                });
            } else if (command.run) {
                await command.run({
                    api: this.api,
                    event: event,
                    args: args
                });
            } else if (command.execute) {
                await command.execute({
                    api: this.api,
                    event: event,
                    args: args
                });
            }
            
            // Update command count
            this.updateCommandCount(senderID);
            
        } catch (error) {
            logger.error(`Command execution error: ${error.message}`);
            logger.error(error.stack);
            
            this.api.sendMessage(
                `❌ Command error: ${error.message}`,
                threadID,
                messageID
            );
        }
    }

    async handleSystemEvent(event) {
        for (const [name, handler] of events) {
            try {
                if (handler.shouldExecute && handler.shouldExecute(event)) {
                    await handler.execute(this.api, event, config);
                }
            } catch (error) {
                logger.error(`Event handler error (${name}): ${error.message}`);
            }
        }
    }

    async handleNonCommand(event) {
        // Auto-reply, AI response, etc.
        // This can be extended based on requirements
        
        // Example: Auto-reply to mentions
        if (event.body && event.body.includes(`@${this.botName}`)) {
            this.api.sendMessage(
                "🤖 Hello! I'm your assistant. Use '.' prefix for commands.",
                event.threadID,
                event.messageID
            );
        }
    }

    async handleUnsend(event) {
        if (config.features.antiUnsend) {
            // Anti-unsend feature
            this.api.sendMessage(
                `⚠️ User unsent a message`,
                event.threadID
            );
        }
    }

    // Utility methods
    hasPermission(command, userID, threadID) {
        if (!command.config) return true;
        
        const { role = 0, adminOnly = false } = command.config;
        
        // Check if admin
        if (config.admins.includes(userID)) {
            return true;
        }
        
        // Check role
        if (role === 0) return true; // Everyone
        if (role === 1 && threadID) return true; // Group only
        if (role === 2) return false; // Admin only (already checked)
        
        return true;
    }

    isOnCooldown(command, userID) {
        if (!command.config || !command.config.cooldown) return false;
        
        const key = `${command.config.name}_${userID}`;
        if (!cooldowns.has(key)) return false;
        
        const cooldown = cooldowns.get(key);
        return Date.now() < cooldown;
    }

    setCooldown(command, userID) {
        if (!command.config || !command.config.cooldown) return;
        
        const key = `${command.config.name}_${userID}`;
        const cooldownTime = command.config.cooldown * 1000; // Convert to milliseconds
        cooldowns.set(key, Date.now() + cooldownTime);
        
        // Auto-remove cooldown after expiration
        setTimeout(() => {
            cooldowns.delete(key);
        }, cooldownTime);
    }

    getCooldownRemaining(command, userID) {
        const key = `${command.config.name}_${userID}`;
        if (!cooldowns.has(key)) return 0;
        
        const remaining = cooldowns.get(key) - Date.now();
        return Math.ceil(remaining / 1000);
    }

    updateCommandCount(userID) {
        if (!commandCount.has(userID)) {
            commandCount.set(userID, { count: 0, minute: Date.now() });
        }
        
        const data = commandCount.get(userID);
        const now = Date.now();
        
        // Reset if new minute
        if (now - data.minute > 60000) {
            data.count = 0;
            data.minute = now;
        }
        
        data.count++;
        
        // Check limit
        if (data.count > config.limits.maxCommandsPerMinute) {
            logger.warn(`User ${userID} exceeded command limit`);
        }
    }
}

// Process handlers
process.on('uncaughtException', (error) => {
    logger.error(`Uncaught Exception: ${error.message}`);
    logger.error(error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

process.on('SIGINT', async () => {
    logger.system('Shutting down bot gracefully...');
    
    // Backup database
    try {
        await database.backup();
        logger.system('Database backup completed');
    } catch (error) {
        logger.error(`Backup failed: ${error.message}`);
    }
    
    logger.system('Goodbye!');
    process.exit(0);
});

// Start the bot
const bot = new Bot();
bot.initialize();