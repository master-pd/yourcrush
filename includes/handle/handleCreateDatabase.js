const fs = require("fs-extra");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const chalk = require("chalk");

module.exports = async function createDatabase() {
    console.log(chalk.yellow("🗄️ Creating database..."));
    
    const dbPath = global.config?.database?.path || "./includes/data.sqlite";
    const dbDir = path.dirname(dbPath);
    
    // Create directory if it doesn't exist
    await fs.ensureDir(dbDir);
    
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error(chalk.red("❌ Database connection error:"), err);
                reject(err);
                return;
            }
            
            console.log(chalk.green("✅ Connected to SQLite database"));
            
            // Create tables
            createTables(db)
                .then(() => {
                    console.log(chalk.green("✅ Database tables created"));
                    resolve(db);
                })
                .catch(error => {
                    console.error(chalk.red("❌ Table creation error:"), error);
                    reject(error);
                });
        });
    });
};

async function createTables(db) {
    return new Promise((resolve, reject) => {
        // Begin transaction
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            
            // Users table
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT UNIQUE NOT NULL,
                    name TEXT,
                    exp INTEGER DEFAULT 0,
                    level INTEGER DEFAULT 1,
                    money INTEGER DEFAULT 0,
                    bank INTEGER DEFAULT 0,
                    daily_claimed DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) reject(err);
            });
            
            // Threads table
            db.run(`
                CREATE TABLE IF NOT EXISTS threads (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    thread_id TEXT UNIQUE NOT NULL,
                    name TEXT,
                    settings TEXT DEFAULT '{}',
                    member_count INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) reject(err);
            });
            
            // Economy table
            db.run(`
                CREATE TABLE IF NOT EXISTS economy (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    transaction_type TEXT,
                    amount INTEGER,
                    balance_before INTEGER,
                    balance_after INTEGER,
                    description TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (user_id)
                )
            `, (err) => {
                if (err) reject(err);
            });
            
            // Commands table
            db.run(`
                CREATE TABLE IF NOT EXISTS commands (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    user_id TEXT,
                    thread_id TEXT,
                    args TEXT,
                    success BOOLEAN,
                    execution_time INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) reject(err);
            });
            
            // Settings table
            db.run(`
                CREATE TABLE IF NOT EXISTS settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    key TEXT UNIQUE NOT NULL,
                    value TEXT,
                    category TEXT DEFAULT 'general',
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) reject(err);
            });
            
            // Items table (for shop)
            db.run(`
                CREATE TABLE IF NOT EXISTS items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    price INTEGER DEFAULT 0,
                    type TEXT DEFAULT 'item',
                    rarity TEXT DEFAULT 'common',
                    stock INTEGER DEFAULT -1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) reject(err);
            });
            
            // Inventory table
            db.run(`
                CREATE TABLE IF NOT EXISTS inventory (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    item_id INTEGER NOT NULL,
                    quantity INTEGER DEFAULT 1,
                    purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (user_id),
                    FOREIGN KEY (item_id) REFERENCES items (id)
                )
            `, (err) => {
                if (err) reject(err);
            });
            
            // Games table
            db.run(`
                CREATE TABLE IF NOT EXISTS games (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    game_type TEXT NOT NULL,
                    user_id TEXT,
                    opponent_id TEXT,
                    result TEXT,
                    bet_amount INTEGER DEFAULT 0,
                    data TEXT DEFAULT '{}',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) reject(err);
            });
            
            // Cooldowns table
            db.run(`
                CREATE TABLE IF NOT EXISTS cooldowns (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    command TEXT NOT NULL,
                    expires_at DATETIME NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) reject(err);
            });
            
            // Warnings table
            db.run(`
                CREATE TABLE IF NOT EXISTS warnings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    thread_id TEXT NOT NULL,
                    reason TEXT,
                    warned_by TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) reject(err);
            });
            
            // Create indexes
            db.run("CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id)", (err) => {
                if (err) reject(err);
            });
            
            db.run("CREATE INDEX IF NOT EXISTS idx_threads_thread_id ON threads(thread_id)", (err) => {
                if (err) reject(err);
            });
            
            db.run("CREATE INDEX IF NOT EXISTS idx_economy_user_id ON economy(user_id)", (err) => {
                if (err) reject(err);
            });
            
            db.run("CREATE INDEX IF NOT EXISTS idx_cooldowns_user_command ON cooldowns(user_id, command)", (err) => {
                if (err) reject(err);
            });
            
            // Commit transaction
            db.run("COMMIT", (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    });
}

// Database initialization function
module.exports.initializeDatabase = async function() {
    try {
        const db = await createDatabase();
        
        // Set global database instance
        global.db = db;
        
        // Insert default settings
        await insertDefaultSettings(db);
        
        // Insert default items
        await insertDefaultItems(db);
        
        console.log(chalk.green("✅ Database initialized successfully"));
        
        return db;
        
    } catch (error) {
        console.error(chalk.red("❌ Database initialization failed:"), error);
        throw error;
    }
};

async function insertDefaultSettings(db) {
    return new Promise((resolve, reject) => {
        const defaultSettings = [
            { key: "bot_prefix", value: "!", category: "bot" },
            { key: "bot_language", value: "bn", category: "bot" },
            { key: "economy_enabled", value: "true", category: "economy" },
            { key: "welcome_enabled", value: "true", category: "thread" },
            { key: "auto_backup", value: "true", category: "system" },
            { key: "log_level", value: "info", category: "system" }
        ];
        
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            
            const stmt = db.prepare(`
                INSERT OR REPLACE INTO settings (key, value, category) 
                VALUES (?, ?, ?)
            `);
            
            defaultSettings.forEach(setting => {
                stmt.run([setting.key, setting.value, setting.category]);
            });
            
            stmt.finalize();
            
            db.run("COMMIT", (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    });
}

async function insertDefaultItems(db) {
    return new Promise((resolve, reject) => {
        const defaultItems = [
            {
                name: "Bronze Medal",
                description: "A bronze medal for beginners",
                price: 100,
                type: "medal",
                rarity: "common",
                stock: -1
            },
            {
                name: "Silver Medal",
                description: "A silver medal for intermediate players",
                price: 500,
                type: "medal",
                rarity: "uncommon",
                stock: -1
            },
            {
                name: "Gold Medal",
                description: "A gold medal for advanced players",
                price: 1000,
                type: "medal",
                rarity: "rare",
                stock: -1
            },
            {
                name: "Daily Boost",
                description: "Double daily rewards for 1 day",
                price: 500,
                type: "boost",
                rarity: "uncommon",
                stock: -1
            },
            {
                name: "Experience Boost",
                description: "Double experience for 1 hour",
                price: 300,
                type: "boost",
                rarity: "common",
                stock: -1
            }
        ];
        
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            
            const stmt = db.prepare(`
                INSERT OR IGNORE INTO items (name, description, price, type, rarity, stock) 
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            
            defaultItems.forEach(item => {
                stmt.run([
                    item.name,
                    item.description,
                    item.price,
                    item.type,
                    item.rarity,
                    item.stock
                ]);
            });
            
            stmt.finalize();
            
            db.run("COMMIT", (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    });
}

// Database backup function
module.exports.backupDatabase = async function() {
    try {
        const dbPath = global.config?.database?.path || "./includes/data.sqlite";
        const backupDir = path.join(__dirname, "../../backups/database");
        
        await fs.ensureDir(backupDir);
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const backupPath = path.join(backupDir, `backup_${timestamp}.sqlite`);
        
        // Copy database file
        await fs.copy(dbPath, backupPath);
        
        console.log(chalk.green(`✅ Database backed up to: ${backupPath}`));
        
        // Clean old backups (keep only last 7)
        await cleanupOldBackups(backupDir, 7);
        
        return backupPath;
        
    } catch (error) {
        console.error(chalk.red("❌ Database backup failed:"), error);
        throw error;
    }
};

async function cleanupOldBackups(backupDir, keepCount) {
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
        if (backupFiles.length > keepCount) {
            const toDelete = backupFiles.slice(keepCount);
            
            for (const file of toDelete) {
                await fs.unlink(file.path);
                console.log(chalk.yellow(`🗑️ Deleted old backup: ${file.name}`));
            }
        }
        
    } catch (error) {
        console.error("Error cleaning up old backups:", error);
    }
}

// Database restore function
module.exports.restoreDatabase = async function(backupName) {
    try {
        const dbPath = global.config?.database?.path || "./includes/data.sqlite";
        const backupDir = path.join(__dirname, "../../backups/database");
        const backupPath = path.join(backupDir, backupName);
        
        if (!fs.existsSync(backupPath)) {
            throw new Error(`Backup file not found: ${backupName}`);
        }
        
        // Backup current database first
        const currentBackup = await module.exports.backupDatabase();
        console.log(chalk.yellow(`📦 Current database backed up: ${currentBackup}`));
        
        // Restore from backup
        await fs.copy(backupPath, dbPath);
        
        console.log(chalk.green(`✅ Database restored from: ${backupName}`));
        
        return true;
        
    } catch (error) {
        console.error(chalk.red("❌ Database restore failed:"), error);
        throw error;
    }
};

// Database query helper
module.exports.query = function(sql, params = []) {
    return new Promise((resolve, reject) => {
        if (!global.db) {
            reject(new Error("Database not initialized"));
            return;
        }
        
        global.db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

module.exports.run = function(sql, params = []) {
    return new Promise((resolve, reject) => {
        if (!global.db) {
            reject(new Error("Database not initialized"));
            return;
        }
        
        global.db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
};