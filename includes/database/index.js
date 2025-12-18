const fs = require("fs-extra");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const chalk = require("chalk");

class Database {
    constructor() {
        this.db = null;
        this.dbPath = global.config?.database?.path || "./includes/data.sqlite";
        this.models = {};
    }

    async initialize() {
        console.log(chalk.yellow("🗄️ Initializing database..."));
        
        try {
            // Ensure database directory exists
            const dbDir = path.dirname(this.dbPath);
            await fs.ensureDir(dbDir);
            
            // Connect to database
            this.db = await this.connect();
            
            // Create tables
            await this.createTables();
            
            // Initialize models
            await this.initializeModels();
            
            // Insert default data
            await this.insertDefaultData();
            
            // Set global database instance
            global.db = this.db;
            global.database = this;
            
            console.log(chalk.green("✅ Database initialized successfully"));
            
            // Schedule auto-backup if enabled
            if (global.config?.database?.autoBackup) {
                this.scheduleAutoBackup();
            }
            
            return this.db;
            
        } catch (error) {
            console.error(chalk.red("❌ Database initialization failed:"), error);
            throw error;
        }
    }

    connect() {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
                if (err) {
                    console.error(chalk.red("❌ Database connection error:"), err);
                    reject(err);
                    return;
                }
                
                // Enable foreign keys
                db.run("PRAGMA foreign_keys = ON");
                
                // Set busy timeout
                db.configure("busyTimeout", 5000);
                
                console.log(chalk.green("✅ Connected to SQLite database"));
                resolve(db);
            });
        });
    }

    async createTables() {
        console.log(chalk.yellow("📊 Creating database tables..."));
        
        const tables = [
            // Users table
            `
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT UNIQUE NOT NULL,
                name TEXT,
                exp INTEGER DEFAULT 0,
                level INTEGER DEFAULT 1,
                money INTEGER DEFAULT 0,
                bank INTEGER DEFAULT 0,
                daily_claimed DATETIME,
                last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            `,
            
            // Threads table
            `
            CREATE TABLE IF NOT EXISTS threads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                thread_id TEXT UNIQUE NOT NULL,
                name TEXT,
                settings TEXT DEFAULT '{}',
                member_count INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            `,
            
            // Economy table
            `
            CREATE TABLE IF NOT EXISTS economy (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                transaction_type TEXT,
                amount INTEGER,
                balance_before INTEGER,
                balance_after INTEGER,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
            )
            `,
            
            // Commands table
            `
            CREATE TABLE IF NOT EXISTS commands (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                user_id TEXT,
                thread_id TEXT,
                args TEXT,
                success BOOLEAN,
                execution_time INTEGER,
                error_message TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            `,
            
            // Settings table
            `
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT UNIQUE NOT NULL,
                value TEXT,
                category TEXT DEFAULT 'general',
                description TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            `,
            
            // Items table
            `
            CREATE TABLE IF NOT EXISTS items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                price INTEGER DEFAULT 0,
                type TEXT DEFAULT 'item',
                rarity TEXT DEFAULT 'common',
                stock INTEGER DEFAULT -1,
                image_url TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            `,
            
            // Inventory table
            `
            CREATE TABLE IF NOT EXISTS inventory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                item_id INTEGER NOT NULL,
                quantity INTEGER DEFAULT 1,
                purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
                FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE CASCADE
            )
            `,
            
            // Games table
            `
            CREATE TABLE IF NOT EXISTS games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_type TEXT NOT NULL,
                user_id TEXT,
                opponent_id TEXT,
                result TEXT,
                bet_amount INTEGER DEFAULT 0,
                data TEXT DEFAULT '{}',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE SET NULL
            )
            `,
            
            // Cooldowns table
            `
            CREATE TABLE IF NOT EXISTS cooldowns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                command TEXT NOT NULL,
                expires_at DATETIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, command)
            )
            `,
            
            // Warnings table
            `
            CREATE TABLE IF NOT EXISTS warnings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                thread_id TEXT NOT NULL,
                reason TEXT,
                warned_by TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
            )
            `,
            
            // User stats table
            `
            CREATE TABLE IF NOT EXISTS user_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT UNIQUE NOT NULL,
                messages_sent INTEGER DEFAULT 0,
                commands_used INTEGER DEFAULT 0,
                games_played INTEGER DEFAULT 0,
                games_won INTEGER DEFAULT 0,
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
            )
            `,
            
            // Thread stats table
            `
            CREATE TABLE IF NOT EXISTS thread_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                thread_id TEXT UNIQUE NOT NULL,
                messages_count INTEGER DEFAULT 0,
                commands_count INTEGER DEFAULT 0,
                active_users INTEGER DEFAULT 0,
                last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (thread_id) REFERENCES threads (thread_id) ON DELETE CASCADE
            )
            `,
            
            // Shop transactions table
            `
            CREATE TABLE IF NOT EXISTS shop_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                item_id INTEGER NOT NULL,
                quantity INTEGER DEFAULT 1,
                total_price INTEGER,
                transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
                FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE CASCADE
            )
            `
        ];

        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                // Begin transaction
                this.db.run("BEGIN TRANSACTION");
                
                // Create tables
                tables.forEach((sql, index) => {
                    this.db.run(sql, (err) => {
                        if (err) {
                            console.error(chalk.red(`❌ Error creating table ${index + 1}:`), err);
                            reject(err);
                            return;
                        }
                    });
                });
                
                // Create indexes
                this.createIndexes();
                
                // Commit transaction
                this.db.run("COMMIT", (err) => {
                    if (err) {
                        console.error(chalk.red("❌ Transaction commit error:"), err);
                        reject(err);
                    } else {
                        console.log(chalk.green("✅ All tables created successfully"));
                        resolve();
                    }
                });
            });
        });
    }

    createIndexes() {
        const indexes = [
            "CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_threads_thread_id ON threads(thread_id)",
            "CREATE INDEX IF NOT EXISTS idx_economy_user_id ON economy(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_economy_created ON economy(created_at)",
            "CREATE INDEX IF NOT EXISTS idx_commands_user_thread ON commands(user_id, thread_id)",
            "CREATE INDEX IF NOT EXISTS idx_cooldowns_user_command ON cooldowns(user_id, command)",
            "CREATE INDEX IF NOT EXISTS idx_cooldowns_expires ON cooldowns(expires_at)",
            "CREATE INDEX IF NOT EXISTS idx_warnings_user_thread ON warnings(user_id, thread_id)",
            "CREATE INDEX IF NOT EXISTS idx_inventory_user_item ON inventory(user_id, item_id)",
            "CREATE INDEX IF NOT EXISTS idx_games_user_type ON games(user_id, game_type)",
            "CREATE INDEX IF NOT EXISTS idx_shop_transactions_user ON shop_transactions(user_id)"
        ];
        
        indexes.forEach(sql => {
            this.db.run(sql);
        });
    }

    async initializeModels() {
        try {
            const modelsPath = path.join(__dirname, "models");
            
            // Load all model files
            const modelFiles = fs.readdirSync(modelsPath).filter(file => 
                file.endsWith(".js") && !file.startsWith("_")
            );
            
            for (const file of modelFiles) {
                try {
                    const modelName = file.replace(".js", "");
                    const ModelClass = require(path.join(modelsPath, file));
                    
                    // Initialize model
                    this.models[modelName] = new ModelClass(this.db);
                    
                    console.log(chalk.blue(`📦 Loaded model: ${modelName}`));
                    
                } catch (error) {
                    console.error(chalk.red(`❌ Error loading model ${file}:`), error);
                }
            }
            
        } catch (error) {
            console.error(chalk.red("❌ Error initializing models:"), error);
        }
    }

    async insertDefaultData() {
        try {
            // Insert default settings
            await this.insertDefaultSettings();
            
            // Insert default items
            await this.insertDefaultItems();
            
            console.log(chalk.green("✅ Default data inserted"));
            
        } catch (error) {
            console.error(chalk.red("❌ Error inserting default data:"), error);
        }
    }

    async insertDefaultSettings() {
        const defaultSettings = [
            { key: "bot_prefix", value: "!", category: "bot", description: "Bot command prefix" },
            { key: "bot_language", value: "bn", category: "bot", description: "Default bot language" },
            { key: "economy_enabled", value: "true", category: "economy", description: "Enable economy system" },
            { key: "welcome_enabled", value: "true", category: "thread", description: "Enable welcome messages" },
            { key: "auto_backup", value: "true", category: "system", description: "Enable auto backup" },
            { key: "log_level", value: "info", category: "system", description: "Logging level" },
            { key: "daily_reward", value: "500", category: "economy", description: "Daily reward amount" },
            { key: "max_warnings", value: "3", category: "moderation", description: "Maximum warnings before action" },
            { key: "cooldown_time", value: "2000", category: "bot", description: "Default command cooldown in ms" }
        ];

        for (const setting of defaultSettings) {
            await this.run(
                `INSERT OR IGNORE INTO settings (key, value, category, description) VALUES (?, ?, ?, ?)`,
                [setting.key, setting.value, setting.category, setting.description]
            );
        }
    }

    async insertDefaultItems() {
        const defaultItems = [
            {
                name: "Bronze Medal",
                description: "A bronze medal for beginners",
                price: 100,
                type: "medal",
                rarity: "common",
                stock: -1,
                image_url: null
            },
            {
                name: "Silver Medal",
                description: "A silver medal for intermediate players",
                price: 500,
                type: "medal",
                rarity: "uncommon",
                stock: -1,
                image_url: null
            },
            {
                name: "Gold Medal",
                description: "A gold medal for advanced players",
                price: 1000,
                type: "medal",
                rarity: "rare",
                stock: -1,
                image_url: null
            },
            {
                name: "Daily Boost",
                description: "Double daily rewards for 1 day",
                price: 500,
                type: "boost",
                rarity: "uncommon",
                stock: -1,
                image_url: null
            },
            {
                name: "Experience Boost",
                description: "Double experience for 1 hour",
                price: 300,
                type: "boost",
                rarity: "common",
                stock: -1,
                image_url: null
            },
            {
                name: "Luck Charm",
                description: "Increases gambling luck",
                price: 750,
                type: "charm",
                rarity: "rare",
                stock: -1,
                image_url: null
            },
            {
                name: "Money Bag",
                description: "Extra money storage",
                price: 1000,
                type: "utility",
                rarity: "uncommon",
                stock: -1,
                image_url: null
            }
        ];

        for (const item of defaultItems) {
            await this.run(
                `INSERT OR IGNORE INTO items (name, description, price, type, rarity, stock, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [item.name, item.description, item.price, item.type, item.rarity, item.stock, item.image_url]
            );
        }
    }

    scheduleAutoBackup() {
        const backupInterval = global.config?.database?.backupInterval || 86400; // 24 hours
        
        setInterval(async () => {
            try {
                await this.backup();
            } catch (error) {
                console.error(chalk.red("❌ Auto backup failed:"), error);
            }
        }, backupInterval * 1000);
        
        console.log(chalk.blue("🔄 Auto backup scheduled"));
    }

    // Database query methods
    async query(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error(chalk.red("❌ Query error:"), err);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    console.error(chalk.red("❌ Get error:"), err);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    console.error(chalk.red("❌ Run error:"), err);
                    reject(err);
                } else {
                    resolve({ lastID: this.lastID, changes: this.changes });
                }
            });
        });
    }

    async backup() {
        console.log(chalk.yellow("💾 Creating database backup..."));
        
        try {
            const backupDir = path.join(__dirname, "../../backups/database");
            await fs.ensureDir(backupDir);
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
            const backupPath = path.join(backupDir, `backup_${timestamp}.sqlite`);
            
            // Copy database file
            await fs.copy(this.dbPath, backupPath);
            
            console.log(chalk.green(`✅ Database backed up to: ${backupPath}`));
            
            // Clean old backups
            await this.cleanupOldBackups(backupDir);
            
            return backupPath;
            
        } catch (error) {
            console.error(chalk.red("❌ Database backup failed:"), error);
            throw error;
        }
    }

    async cleanupOldBackups(backupDir, maxBackups = 7) {
        try {
            const files = await fs.readdir(backupDir);
            const backupFiles = files
                .filter(file => file.startsWith("backup_") && file.endsWith(".sqlite"))
                .map(file => ({
                    name: file,
                    path: path.join(backupDir, file),
                    time: fs.statSync(path.join(backupDir, file)).mtimeMs
                }))
                .sort((a, b) => b.time - a.time);
            
            // Remove old backups
            if (backupFiles.length > maxBackups) {
                const toDelete = backupFiles.slice(maxBackups);
                
                for (const file of toDelete) {
                    await fs.unlink(file.path);
                    console.log(chalk.yellow(`🗑️ Deleted old backup: ${file.name}`));
                }
            }
            
        } catch (error) {
            console.error("Error cleaning up old backups:", error);
        }
    }

    async restore(backupName) {
        console.log(chalk.yellow("🔄 Restoring database from backup..."));
        
        try {
            const backupDir = path.join(__dirname, "../../backups/database");
            const backupPath = path.join(backupDir, backupName);
            
            if (!fs.existsSync(backupPath)) {
                throw new Error(`Backup file not found: ${backupName}`);
            }
            
            // Close current connection
            await this.close();
            
            // Backup current database first
            const currentBackup = await this.backup();
            console.log(chalk.yellow(`📦 Current database backed up: ${currentBackup}`));
            
            // Restore from backup
            await fs.copy(backupPath, this.dbPath);
            
            // Reconnect
            this.db = await this.connect();
            global.db = this.db;
            
            console.log(chalk.green(`✅ Database restored from: ${backupName}`));
            
            return true;
            
        } catch (error) {
            console.error(chalk.red("❌ Database restore failed:"), error);
            throw error;
        }
    }

    async close() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve();
                return;
            }
            
            this.db.close((err) => {
                if (err) {
                    console.error(chalk.red("❌ Database close error:"), err);
                    reject(err);
                } else {
                    console.log(chalk.green("✅ Database connection closed"));
                    resolve();
                }
            });
        });
    }

    // Utility methods
    async getUser(userID) {
        return await this.get("SELECT * FROM users WHERE user_id = ?", [userID]);
    }

    async getThread(threadID) {
        return await this.get("SELECT * FROM threads WHERE thread_id = ?", [threadID]);
    }

    async updateUser(userID, data) {
        const fields = Object.keys(data);
        const values = Object.values(data);
        
        const setClause = fields.map(field => `${field} = ?`).join(", ");
        values.push(userID);
        
        return await this.run(
            `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
            values
        );
    }

    async updateThread(threadID, data) {
        const fields = Object.keys(data);
        const values = Object.values(data);
        
        const setClause = fields.map(field => `${field} = ?`).join(", ");
        values.push(threadID);
        
        return await this.run(
            `UPDATE threads SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE thread_id = ?`,
            values
        );
    }

    async getSetting(key) {
        const row = await this.get("SELECT value FROM settings WHERE key = ?", [key]);
        return row ? row.value : null;
    }

    async setSetting(key, value, category = "general", description = null) {
        return await this.run(
            `INSERT OR REPLACE INTO settings (key, value, category, description, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [key, value, category, description]
        );
    }

    // Statistics methods
    async getUserStats(userID) {
        return await this.get("SELECT * FROM user_stats WHERE user_id = ?", [userID]);
    }

    async incrementUserStat(userID, stat, amount = 1) {
        return await this.run(
            `INSERT OR REPLACE INTO user_stats (user_id, ${stat}, last_updated) 
             VALUES (?, COALESCE((SELECT ${stat} FROM user_stats WHERE user_id = ?), 0) + ?, CURRENT_TIMESTAMP)`,
            [userID, userID, amount]
        );
    }

    async getLeaderboard(limit = 10, orderBy = "money") {
        return await this.query(
            `SELECT user_id, name, ${orderBy} FROM users ORDER BY ${orderBy} DESC LIMIT ?`,
            [limit]
        );
    }

    // Economy methods
    async addMoney(userID, amount, description = "Added money") {
        const user = await this.getUser(userID);
        if (!user) return null;
        
        const balanceBefore = user.money;
        const balanceAfter = balanceBefore + amount;
        
        await this.run(
            `UPDATE users SET money = money + ? WHERE user_id = ?`,
            [amount, userID]
        );
        
        await this.run(
            `INSERT INTO economy (user_id, transaction_type, amount, balance_before, balance_after, description) 
             VALUES (?, 'add', ?, ?, ?, ?)`,
            [userID, amount, balanceBefore, balanceAfter, description]
        );
        
        return balanceAfter;
    }

    async removeMoney(userID, amount, description = "Removed money") {
        const user = await this.getUser(userID);
        if (!user) return null;
        
        if (user.money < amount) {
            throw new Error("Insufficient funds");
        }
        
        const balanceBefore = user.money;
        const balanceAfter = balanceBefore - amount;
        
        await this.run(
            `UPDATE users SET money = money - ? WHERE user_id = ?`,
            [amount, userID]
        );
        
        await this.run(
            `INSERT INTO economy (user_id, transaction_type, amount, balance_before, balance_after, description) 
             VALUES (?, 'remove', ?, ?, ?, ?)`,
            [userID, amount, balanceBefore, balanceAfter, description]
        );
        
        return balanceAfter;
    }

    async transferMoney(fromUserID, toUserID, amount, description = "Money transfer") {
        await this.removeMoney(fromUserID, amount, `Transfer to ${toUserID}: ${description}`);
        await this.addMoney(toUserID, amount, `Transfer from ${fromUserID}: ${description}`);
        
        return true;
    }

    // Cooldown methods
    async setCooldown(userID, command, cooldownSeconds) {
        const expiresAt = new Date(Date.now() + cooldownSeconds * 1000).toISOString();
        
        return await this.run(
            `INSERT OR REPLACE INTO cooldowns (user_id, command, expires_at) VALUES (?, ?, ?)`,
            [userID, command, expiresAt]
        );
    }

    async getCooldown(userID, command) {
        const row = await this.get(
            `SELECT expires_at FROM cooldowns WHERE user_id = ? AND command = ? AND expires_at > CURRENT_TIMESTAMP`,
            [userID, command]
        );
        
        return row ? new Date(row.expires_at) : null;
    }

    async cleanupExpiredCooldowns() {
        return await this.run(
            `DELETE FROM cooldowns WHERE expires_at <= CURRENT_TIMESTAMP`
        );
    }

    // Shop methods
    async buyItem(userID, itemID, quantity = 1) {
        // Start transaction
        await this.run("BEGIN TRANSACTION");
        
        try {
            // Get item info
            const item = await this.get("SELECT * FROM items WHERE id = ?", [itemID]);
            if (!item) throw new Error("Item not found");
            
            if (item.stock !== -1 && item.stock < quantity) {
                throw new Error("Insufficient stock");
            }
            
            // Check user money
            const user = await this.getUser(userID);
            const totalPrice = item.price * quantity;
            
            if (user.money < totalPrice) {
                throw new Error("Insufficient funds");
            }
            
            // Remove money
            await this.removeMoney(userID, totalPrice, `Purchased ${quantity}x ${item.name}`);
            
            // Reduce stock
            if (item.stock !== -1) {
                await this.run(
                    `UPDATE items SET stock = stock - ? WHERE id = ?`,
                    [quantity, itemID]
                );
            }
            
            // Add to inventory
            const existingItem = await this.get(
                `SELECT * FROM inventory WHERE user_id = ? AND item_id = ?`,
                [userID, itemID]
            );
            
            if (existingItem) {
                await this.run(
                    `UPDATE inventory SET quantity = quantity + ? WHERE user_id = ? AND item_id = ?`,
                    [quantity, userID, itemID]
                );
            } else {
                await this.run(
                    `INSERT INTO inventory (user_id, item_id, quantity) VALUES (?, ?, ?)`,
                    [userID, itemID, quantity]
                );
            }
            
            // Record transaction
            await this.run(
                `INSERT INTO shop_transactions (user_id, item_id, quantity, total_price) VALUES (?, ?, ?, ?)`,
                [userID, itemID, quantity, totalPrice]
            );
            
            // Commit transaction
            await this.run("COMMIT");
            
            return {
                success: true,
                item: item.name,
                quantity,
                totalPrice,
                remainingMoney: user.money - totalPrice
            };
            
        } catch (error) {
            // Rollback on error
            await this.run("ROLLBACK");
            throw error;
        }
    }

    async getUserInventory(userID) {
        return await this.query(
            `SELECT i.*, inv.quantity, inv.purchased_at 
             FROM inventory inv 
             JOIN items i ON inv.item_id = i.id 
             WHERE inv.user_id = ? 
             ORDER BY inv.purchased_at DESC`,
            [userID]
        );
    }

    // Cleanup methods
    async cleanup() {
        console.log(chalk.yellow("🧹 Cleaning up database..."));
        
        try {
            // Clean expired cooldowns
            await this.cleanupExpiredCooldowns();
            
            // Clean old logs (keep 30 days)
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            
            await this.run(
                `DELETE FROM commands WHERE created_at < ?`,
                [thirtyDaysAgo]
            );
            
            await this.run(
                `DELETE FROM economy WHERE created_at < ?`,
                [thirtyDaysAgo]
            );
            
            await this.run(
                `DELETE FROM games WHERE created_at < ?`,
                [thirtyDaysAgo]
            );
            
            console.log(chalk.green("✅ Database cleanup completed"));
            
        } catch (error) {
            console.error(chalk.red("❌ Database cleanup failed:"), error);
        }
    }

    // Database info
    async getInfo() {
        const tables = await this.query(
            `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
        );
        
        const info = {
            tables: tables.map(t => t.name),
            databasePath: this.dbPath,
            size: fs.existsSync(this.dbPath) ? fs.statSync(this.dbPath).size : 0,
            lastBackup: null
        };
        
        // Get last backup info
        const backupDir = path.join(__dirname, "../../backups/database");
        if (fs.existsSync(backupDir)) {
            const backupFiles = fs.readdirSync(backupDir)
                .filter(file => file.endsWith(".sqlite"))
                .map(file => ({
                    name: file,
                    time: fs.statSync(path.join(backupDir, file)).mtimeMs
                }))
                .sort((a, b) => b.time - a.time);
            
            if (backupFiles.length > 0) {
                info.lastBackup = {
                    name: backupFiles[0].name,
                    time: new Date(backupFiles[0].time)
                };
            }
        }
        
        return info;
    }
}

// Export singleton instance
const database = new Database();
module.exports = database;

// Also export class for testing
module.exports.Database = Database;