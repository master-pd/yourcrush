const fs = require("fs-extra");
const path = require("path");

module.exports = {
    config: {
        name: "god",
        version: "2.0.0",
        description: "God mode/admin protection system",
        author: "RANA",
        category: "events"
    },

    onLoad: function({ api }) {
        // Initialize god mode
        this.initializeGodMode();
    },

    onEvent: async function({ api, event }) {
        try {
            // Protect against bot removal
            if (event.logMessageType === "log:unsubscribe") {
                const { threadID, logMessageData } = event;
                const leftParticipantFbId = logMessageData.leftParticipantFbId;
                
                if (leftParticipantFbId === api.getCurrentUserID()) {
                    // Bot was removed - rejoin if possible
                    console.log(`Bot was removed from group: ${threadID}`);
                    
                    // Notify owner
                    await this.notifyOwner(api, `Bot was removed from group: ${threadID}`);
                }
            }
            
            // Protect against admin removal
            if (event.logMessageType === "log:thread-admins") {
                const { threadID, logMessageData } = event;
                
                if (logMessageData.EVENT_TYPE === "remove_admin") {
                    const removedAdmin = Object.keys(logMessageData.ADMIN_EVENT || {})[0];
                    
                    if (removedAdmin === api.getCurrentUserID()) {
                        // Bot admin was removed - try to re-add
                        console.log(`Bot admin removed from group: ${threadID}`);
                        
                        // Check if we can re-add ourselves
                        const threadInfo = await api.getThreadInfo(threadID);
                        const ownerID = threadInfo.threadID;
                        
                        // Notify owner
                        await api.sendMessage(
                            `⚠️ **Admin Removed**\n\n` +
                            `Bot admin was removed from this group.\n` +
                            `Please re-add admin permissions for full functionality.`,
                            threadID
                        );
                    }
                }
            }
            
        } catch (error) {
            console.error("God mode error:", error);
        }
    },

    onMessage: async function({ api, event }) {
        const { threadID, senderID, body } = event;
        
        if (body && body.startsWith(global.config?.prefix || "!")) {
            const args = body.slice((global.config?.prefix || "!").length).trim().split(" ");
            const command = args.shift().toLowerCase();
            
            if (command === "god") {
                // Check if user is owner
                const isOwner = global.config?.ADMINS?.includes(senderID);
                
                if (!isOwner) {
                    api.sendMessage("❌ Owner only command.", threadID);
                    return;
                }
                
                const action = args[0];
                
                if (action === "status") {
                    const status = await this.getGodModeStatus();
                    
                    let statusMsg = "👑 **God Mode Status**\n\n";
                    statusMsg += `• Bot Protection: ${status.botProtection ? "✅" : "❌"}\n`;
                    statusMsg += `• Admin Protection: ${status.adminProtection ? "✅" : "❌"}\n`;
                    statusMsg += `• Auto Backup: ${status.autoBackup ? "✅" : "❌"}\n`;
                    statusMsg += `• Error Reporting: ${status.errorReporting ? "✅" : "❌"}\n`;
                    statusMsg += `• Last Backup: ${status.lastBackup || "Never"}\n`;
                    
                    api.sendMessage(statusMsg, threadID);
                    
                } else if (action === "backup") {
                    api.sendMessage("Creating backup...", threadID);
                    
                    const backupResult = await this.createBackup(api);
                    
                    if (backupResult.success) {
                        api.sendMessage(
                            `✅ Backup created!\n` +
                            `File: ${backupResult.filename}\n` +
                            `Size: ${backupResult.size}`,
                            threadID
                        );
                    } else {
                        api.sendMessage(`❌ Backup failed: ${backupResult.error}`, threadID);
                    }
                    
                } else if (action === "restore") {
                    const backupName = args[1];
                    
                    if (!backupName) {
                        const backups = await this.listBackups();
                        
                        if (backups.length === 0) {
                            api.sendMessage("No backups found.", threadID);
                            return;
                        }
                        
                        let backupList = "📁 **Available Backups**\n\n";
                        backups.forEach((backup, index) => {
                            backupList += `${index + 1}. ${backup.name} (${backup.size})\n`;
                        });
                        
                        api.sendMessage(backupList, threadID);
                        return;
                    }
                    
                    api.sendMessage(`Restoring backup: ${backupName}...`, threadID);
                    const result = await this.restoreBackup(backupName);
                    
                    if (result.success) {
                        api.sendMessage(`✅ Backup restored! Restarting bot...`, threadID);
                        setTimeout(() => process.exit(0), 3000);
                    } else {
                        api.sendMessage(`❌ Restore failed: ${result.error}`, threadID);
                    }
                }
            }
        }
    },

    initializeGodMode: async function() {
        console.log("👑 God Mode Initialized");
        
        // Create god mode directory
        const godPath = path.join(__dirname, "../cache/god_mode");
        await fs.ensureDir(godPath);
        
        // Initialize settings
        const settingsPath = path.join(godPath, "settings.json");
        const defaultSettings = {
            botProtection: true,
            adminProtection: true,
            autoBackup: true,
            errorReporting: true,
            lastBackup: null
        };
        
        await fs.writeJson(settingsPath, defaultSettings, { spaces: 2 }).catch(() => {});
    },

    getGodModeStatus: async function() {
        try {
            const settingsPath = path.join(__dirname, "../cache/god_mode/settings.json");
            return await fs.readJson(settingsPath);
        } catch (error) {
            return {
                botProtection: false,
                adminProtection: false,
                autoBackup: false,
                errorReporting: false,
                lastBackup: null
            };
        }
    },

    notifyOwner: async function(api, message) {
        try {
            const owners = global.config?.ADMINS || [];
            
            for (const ownerID of owners) {
                try {
                    await api.sendMessage(`👑 **God Mode Alert**\n\n${message}`, ownerID);
                } catch (error) {
                    console.error("Failed to notify owner:", error);
                }
            }
        } catch (error) {
            console.error("Notify owner error:", error);
        }
    },

    createBackup: async function(api) {
        try {
            const backupDir = path.join(__dirname, "../backups/god_mode");
            await fs.ensureDir(backupDir);
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
            const backupName = `god_backup_${timestamp}.zip`;
            const backupPath = path.join(backupDir, backupName);
            
            // Files to backup
            const filesToBackup = [
                "config.json",
                "appstate.json",
                "includes/data.sqlite",
                "cache/",
                "languages/"
            ];
            
            // Create backup using archiver
            const archiver = require("archiver");
            const output = fs.createWriteStream(backupPath);
            const archive = archiver("zip", { zlib: { level: 9 } });
            
            return new Promise((resolve) => {
                output.on("close", () => {
                    resolve({
                        success: true,
                        filename: backupName,
                        size: archive.pointer() + " bytes"
                    });
                });
                
                archive.on("error", (err) => {
                    resolve({ success: false, error: err.message });
                });
                
                archive.pipe(output);
                
                // Add files to archive
                filesToBackup.forEach(file => {
                    const filePath = path.join(__dirname, "..", file);
                    if (fs.existsSync(filePath)) {
                        if (file.endsWith("/")) {
                            archive.directory(filePath, file);
                        } else {
                            archive.file(filePath, { name: file });
                        }
                    }
                });
                
                archive.finalize();
            });
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    listBackups: async function() {
        try {
            const backupDir = path.join(__dirname, "../backups/god_mode");
            await fs.ensureDir(backupDir);
            
            const files = await fs.readdir(backupDir);
            
            return files.map(file => {
                const filePath = path.join(backupDir, file);
                const stats = fs.statSync(filePath);
                
                return {
                    name: file,
                    size: this.formatBytes(stats.size),
                    modified: stats.mtime
                };
            }).sort((a, b) => b.modified - a.modified);
            
        } catch (error) {
            console.error("List backups error:", error);
            return [];
        }
    },

    restoreBackup: async function(backupName) {
        try {
            const backupPath = path.join(__dirname, "../backups/god_mode", backupName);
            
            if (!fs.existsSync(backupPath)) {
                return { success: false, error: "Backup not found" };
            }
            
            // Extract backup
            const extract = require("extract-zip");
            const tempDir = path.join(__dirname, "../temp_restore");
            
            await fs.ensureDir(tempDir);
            await fs.emptyDir(tempDir);
            
            await extract(backupPath, { dir: tempDir });
            
            // Restore files
            const files = await fs.readdir(tempDir);
            
            for (const file of files) {
                const source = path.join(tempDir, file);
                const dest = path.join(__dirname, "..", file);
                
                await fs.copy(source, dest, { overwrite: true });
            }
            
            // Cleanup
            await fs.remove(tempDir);
            
            return { success: true };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    formatBytes: function(bytes) {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    }
};