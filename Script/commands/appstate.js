const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

module.exports = {
    config: {
        name: "appstate",
        version: "3.0",
        author: "RANA",
        countDown: 5,
        role: 2,
        shortDescription: {
            en: "Manage appstate.json file",
            bn: "appstate.json ফাইল ব্যবস্থাপনা"
        },
        longDescription: {
            en: "Backup, restore, encrypt and manage appstate.json file",
            bn: "appstate.json ফাইল ব্যাকআপ, পুনরুদ্ধার, এনক্রিপ্ট এবং ব্যবস্থাপনা করুন"
        },
        category: "admin",
        guide: {
            en: "{pn} [backup/restore/encrypt/decrypt/info]",
            bn: "{pn} [backup/restore/encrypt/decrypt/info]"
        }
    },

    onStart: async function ({ api, event, args, message, getLang }) {
        const action = args[0];

        if (!action) {
            return message.reply(getLang("menu"));
        }

        try {
            const appstatePath = path.join(__dirname, '..', '..', 'appstate.json');
            const backupDir = path.join(__dirname, '..', '..', 'backups');
            
            fs.ensureDirSync(backupDir);

            switch (action.toLowerCase()) {
                case 'backup':
                    return await backupAppstate(appstatePath, backupDir, message, getLang);
                
                case 'restore':
                    const backupFile = args[1];
                    return await restoreAppstate(backupFile, backupDir, appstatePath, message, getLang);
                
                case 'encrypt':
                    const encryptKey = args[1] || generateRandomKey();
                    return await encryptAppstate(appstatePath, encryptKey, message, getLang);
                
                case 'decrypt':
                    const decryptKey = args[1];
                    return await decryptAppstate(appstatePath, decryptKey, message, getLang);
                
                case 'info':
                    return await getAppstateInfo(appstatePath, message, getLang);
                
                case 'list':
                    return await listBackups(backupDir, message, getLang);
                
                case 'clean':
                    return await cleanOldBackups(backupDir, message, getLang);
                
                default:
                    return message.reply(getLang("invalidAction"));
            }
        } catch (error) {
            return message.reply(getLang("error", { error: error.message }));
        }
    },

    langs: {
        en: {
            menu: "🔐 Appstate Manager:\n\n• {pn} backup - Create backup\n• {pn} restore [filename] - Restore backup\n• {pn} encrypt [key] - Encrypt appstate\n• {pn} decrypt [key] - Decrypt appstate\n• {pn} info - Show info\n• {pn} list - List backups\n• {pn} clean - Clean old backups",
            backupCreated: "✅ Backup created successfully!\n📁 File: {filename}\n📏 Size: {size}\n🔑 Key: {key}",
            backupRestored: "✅ Appstate restored from backup!\n📁 File: {filename}",
            noBackupFile: "❌ Please specify backup filename",
            backupNotFound: "❌ Backup file not found",
            appstateEncrypted: "✅ Appstate encrypted successfully!\n🔑 Key: {key}\n⚠️ Save this key for decryption!",
            appstateDecrypted: "✅ Appstate decrypted successfully!",
            noEncryptionKey: "❌ Please provide encryption/decryption key",
            appstateInfo: "📊 Appstate Information:\n\n📁 File: {path}\n📏 Size: {size}\n🔐 Encrypted: {encrypted}\n📅 Modified: {modified}\n👥 Accounts: {accounts}",
            backupList: "📚 Backup Files:\n\n{list}\n\n📊 Total: {count} backups",
            noBackups: "📭 No backup files found",
            backupsCleaned: "🗑️ Old backups cleaned!\nDeleted: {deleted} files",
            invalidAction: "❌ Invalid action!",
            error: "❌ Error: {error}"
        },
        bn: {
            menu: "🔐 Appstate ব্যবস্থাপক:\n\n• {pn} backup - ব্যাকআপ তৈরি করুন\n• {pn} restore [ফাইলের নাম] - ব্যাকআপ পুনরুদ্ধার করুন\n• {pn} encrypt [কী] - Appstate এনক্রিপ্ট করুন\n• {pn} decrypt [কী] - Appstate ডিক্রিপ্ট করুন\n• {pn} info - তথ্য দেখান\n• {pn} list - ব্যাকআপ তালিকা\n• {pn} clean - পুরানো ব্যাকআপ পরিষ্কার করুন",
            backupCreated: "✅ ব্যাকআপ সফলভাবে তৈরি হয়েছে!\n📁 ফাইল: {filename}\n📏 সাইজ: {size}\n🔑 কী: {key}",
            backupRestored: "✅ ব্যাকআপ থেকে Appstate পুনরুদ্ধার করা হয়েছে!\n📁 ফাইল: {filename}",
            noBackupFile: "❌ দয়া করে ব্যাকআপ ফাইলের নাম উল্লেখ করুন",
            backupNotFound: "❌ ব্যাকআপ ফাইল পাওয়া যায়নি",
            appstateEncrypted: "✅ Appstate সফলভাবে এনক্রিপ্ট করা হয়েছে!\n🔑 কী: {key}\n⚠️ ডিক্রিপশনের জন্য এই কীটি সংরক্ষণ করুন!",
            appstateDecrypted: "✅ Appstate সফলভাবে ডিক্রিপ্ট করা হয়েছে!",
            noEncryptionKey: "❌ দয়া করে এনক্রিপশন/ডিক্রিপশন কী দিন",
            appstateInfo: "📊 Appstate তথ্য:\n\n📁 ফাইল: {path}\n📏 সাইজ: {size}\n🔐 এনক্রিপ্টেড: {encrypted}\n📅 পরিবর্তিত: {modified}\n👥 অ্যাকাউন্ট: {accounts}",
            backupList: "📚 ব্যাকআপ ফাইল:\n\n{list}\n\n📊 মোট: {count} ব্যাকআপ",
            noBackups: "📭 কোন ব্যাকআপ ফাইল পাওয়া যায়নি",
            backupsCleaned: "🗑️ পুরানো ব্যাকআপ পরিষ্কার করা হয়েছে!\nমুছে ফেলা হয়েছে: {deleted} ফাইল",
            invalidAction: "❌ ভুল কাজ!",
            error: "❌ ত্রুটি: {error}"
        }
    }
};

async function backupAppstate(appstatePath, backupDir, message, getLang) {
    if (!fs.existsSync(appstatePath)) {
        throw new Error('Appstate file not found');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `appstate_backup_${timestamp}.json`;
    const backupPath = path.join(backupDir, backupFilename);
    
    const key = generateRandomKey();
    const appstateData = fs.readFileSync(appstatePath, 'utf8');
    const encryptedData = encryptData(appstateData, key);
    
    fs.writeFileSync(backupPath, encryptedData);
    
    const stats = fs.statSync(backupPath);
    const size = formatBytes(stats.size);
    
    return message.reply(getLang("backupCreated", {
        filename: backupFilename,
        size: size,
        key: key
    }));
}

async function restoreAppstate(backupFile, backupDir, appstatePath, message, getLang) {
    if (!backupFile) {
        return message.reply(getLang("noBackupFile"));
    }

    const backupPath = path.join(backupDir, backupFile);
    
    if (!fs.existsSync(backupPath)) {
        return message.reply(getLang("backupNotFound"));
    }

    const encryptedData = fs.readFileSync(backupPath, 'utf8');
    
    let decryptedData;
    try {
        decryptedData = decryptData(encryptedData, args[2]);
    } catch {
        return message.reply("❌ Invalid decryption key or corrupted backup");
    }
    
    fs.writeFileSync(appstatePath, decryptedData);
    
    return message.reply(getLang("backupRestored", { filename: backupFile }));
}

async function encryptAppstate(appstatePath, key, message, getLang) {
    if (!key) {
        return message.reply(getLang("noEncryptionKey"));
    }

    const appstateData = fs.readFileSync(appstatePath, 'utf8');
    const encryptedData = encryptData(appstateData, key);
    
    fs.writeFileSync(appstatePath, encryptedData);
    
    return message.reply(getLang("appstateEncrypted", { key: key }));
}

async function decryptAppstate(appstatePath, key, message, getLang) {
    if (!key) {
        return message.reply(getLang("noEncryptionKey"));
    }

    const encryptedData = fs.readFileSync(appstatePath, 'utf8');
    const decryptedData = decryptData(encryptedData, key);
    
    fs.writeFileSync(appstatePath, decryptedData);
    
    return message.reply(getLang("appstateDecrypted"));
}

async function getAppstateInfo(appstatePath, message, getLang) {
    if (!fs.existsSync(appstatePath)) {
        throw new Error('Appstate file not found');
    }

    const stats = fs.statSync(appstatePath);
    const data = fs.readFileSync(appstatePath, 'utf8');
    
    let isEncrypted = false;
    let accountCount = 0;
    
    try {
        const parsed = JSON.parse(data);
        accountCount = Array.isArray(parsed) ? parsed.length : 1;
        isEncrypted = false;
    } catch {
        isEncrypted = true;
        accountCount = 'Unknown (encrypted)';
    }
    
    return message.reply(getLang("appstateInfo", {
        path: path.basename(appstatePath),
        size: formatBytes(stats.size),
        encrypted: isEncrypted ? '✅ Yes' : '❌ No',
        modified: new Date(stats.mtime).toLocaleString(),
        accounts: accountCount
    }));
}

async function listBackups(backupDir, message, getLang) {
    const files = fs.readdirSync(backupDir).filter(file => file.startsWith('appstate_backup_'));
    
    if (files.length === 0) {
        return message.reply(getLang("noBackups"));
    }
    
    let list = '';
    files.forEach((file, index) => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        const size = formatBytes(stats.size);
        const date = new Date(stats.mtime).toLocaleString();
        
        list += `${index + 1}. ${file}\n`;
        list += `   ↳ Size: ${size}\n`;
        list += `   ↳ Date: ${date}\n\n`;
    });
    
    return message.reply(getLang("backupList", {
        list: list,
        count: files.length
    }));
}

async function cleanOldBackups(backupDir, message, getLang) {
    const files = fs.readdirSync(backupDir).filter(file => file.startsWith('appstate_backup_'));
    
    if (files.length === 0) {
        return message.reply(getLang("noBackups"));
    }
    
    const now = Date.now();
    const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
    let deletedCount = 0;
    
    files.forEach(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtimeMs < weekAgo) {
            fs.unlinkSync(filePath);
            deletedCount++;
        }
    });
    
    return message.reply(getLang("backupsCleaned", { deleted: deletedCount }));
}

function encryptData(data, key) {
    const cipher = crypto.createCipher('aes-256-cbc', key);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

function decryptData(encryptedData, key) {
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

function generateRandomKey() {
    return crypto.randomBytes(32).toString('hex');
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}