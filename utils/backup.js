const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const moment = require('moment-timezone');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class BackupSystem {
    constructor() {
        this.backupDir = path.join(__dirname, '../backups');
        this.ensureBackupDirectory();
        this.logger = require('./log');
    }

    ensureBackupDirectory() {
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
            console.log(chalk.blue(`📁 Created backup directory: ${this.backupDir}`));
        }
    }

    getBackupFileName(prefix = 'backup') {
        const timestamp = moment().tz(global.config?.timezone || 'Asia/Dhaka').format('YYYY-MM-DD_HH-mm-ss');
        return `${prefix}_${timestamp}.zip`;
    }

    async createDatabaseBackup() {
        try {
            const dbPath = global.config?.database?.path || './includes/data.sqlite';
            if (!fs.existsSync(dbPath)) {
                this.logger.warn('Database file not found, skipping backup');
                return false;
            }

            const backupName = this.getBackupFileName('database');
            const backupPath = path.join(this.backupDir, backupName);

            // Create backup using 7zip or zip
            await this.compressFile(dbPath, backupPath);

            this.logger.success(`Database backup created: ${backupName}`);
            
            // Clean old backups
            await this.cleanOldBackups('database');
            
            return {
                success: true,
                filename: backupName,
                path: backupPath,
                size: fs.statSync(backupPath).size,
                timestamp: moment().format()
            };
        } catch (error) {
            this.logger.error('Error creating database backup', error);
            return { success: false, error: error.message };
        }
    }

    async createFullBackup() {
        try {
            const backupName = this.getBackupFileName('full');
            const backupPath = path.join(this.backupDir, backupName);

            // Files and directories to backup
            const itemsToBackup = [
                'config.json',
                'includes/',
                'languages/',
                'utils/',
                'cache/data.json',
                'cache/autosetname.json'
            ];

            // Filter existing items
            const existingItems = itemsToBackup.filter(item => 
                fs.existsSync(path.join(__dirname, '..', item))
            );

            // Create temporary backup directory
            const tempDir = path.join(__dirname, '../temp_backup');
            if (fs.existsSync(tempDir)) {
                fs.removeSync(tempDir);
            }
            fs.mkdirSync(tempDir, { recursive: true });

            // Copy items to temp directory
            for (const item of existingItems) {
                const source = path.join(__dirname, '..', item);
                const dest = path.join(tempDir, item);
                
                if (item.endsWith('/')) {
                    await fs.copy(source, dest);
                } else {
                    await fs.copy(source, dest);
                }
            }

            // Create backup info file
            const backupInfo = {
                timestamp: moment().format(),
                botName: global.botInfo?.name || 'YOUR CRUSH BOT',
                version: global.botInfo?.version || '2.0.0',
                itemsBackedUp: existingItems,
                totalSize: this.getDirectorySize(tempDir)
            };

            await fs.writeJson(path.join(tempDir, 'backup_info.json'), backupInfo, { spaces: 2 });

            // Compress backup
            await this.compressDirectory(tempDir, backupPath);

            // Clean up temp directory
            await fs.remove(tempDir);

            this.logger.success(`Full backup created: ${backupName}`);

            // Clean old backups
            await this.cleanOldBackups('full');

            return {
                success: true,
                filename: backupName,
                path: backupPath,
                size: fs.statSync(backupPath).size,
                info: backupInfo
            };
        } catch (error) {
            this.logger.error('Error creating full backup', error);
            return { success: false, error: error.message };
        }
    }

    async createConfigBackup() {
        try {
            const configPath = path.join(__dirname, '../config.json');
            if (!fs.existsSync(configPath)) {
                this.logger.warn('Config file not found');
                return false;
            }

            const backupName = this.getBackupFileName('config');
            const backupPath = path.join(this.backupDir, backupName);

            await fs.copy(configPath, backupPath);

            this.logger.success(`Config backup created: ${backupName}`);
            
            return {
                success: true,
                filename: backupName,
                path: backupPath,
                size: fs.statSync(backupPath).size
            };
        } catch (error) {
            this.logger.error('Error creating config backup', error);
            return { success: false, error: error.message };
        }
    }

    async compressFile(source, destination) {
        try {
            // Try using 7zip if available
            await execPromise(`7z a "${destination}" "${source}"`);
            return true;
        } catch (error) {
            try {
                // Fallback to zip command
                await execPromise(`zip -j "${destination}" "${source}"`);
                return true;
            } catch (error2) {
                // Fallback to Node.js implementation
                const archiver = require('archiver');
                const output = fs.createWriteStream(destination);
                const archive = archiver('zip', { zlib: { level: 9 } });

                return new Promise((resolve, reject) => {
                    output.on('close', () => resolve(true));
                    archive.on('error', reject);
                    
                    archive.pipe(output);
                    archive.file(source, { name: path.basename(source) });
                    archive.finalize();
                });
            }
        }
    }

    async compressDirectory(source, destination) {
        const archiver = require('archiver');
        const output = fs.createWriteStream(destination);
        const archive = archiver('zip', { zlib: { level: 9 } });

        return new Promise((resolve, reject) => {
            output.on('close', () => resolve(true));
            archive.on('error', reject);
            
            archive.pipe(output);
            archive.directory(source, false);
            archive.finalize();
        });
    }

    async cleanOldBackups(type = 'all', maxBackups = global.config?.database?.maxBackups || 7) {
        try {
            const files = await fs.readdir(this.backupDir);
            
            // Filter by type
            let backupFiles = files.filter(file => {
                if (type === 'all') return true;
                return file.startsWith(`${type}_`);
            }).map(file => ({
                name: file,
                path: path.join(this.backupDir, file),
                time: fs.statSync(path.join(this.backupDir, file)).mtimeMs
            }));

            // Sort by modification time (oldest first)
            backupFiles.sort((a, b) => a.time - b.time);

            // Remove old backups if exceeds maxBackups
            if (backupFiles.length > maxBackups) {
                const toDelete = backupFiles.slice(0, backupFiles.length - maxBackups);
                
                for (const file of toDelete) {
                    await fs.unlink(file.path);
                    this.logger.info(`Deleted old backup: ${file.name}`);
                }
            }

            return backupFiles.length;
        } catch (error) {
            this.logger.error('Error cleaning old backups', error);
            return 0;
        }
    }

    getDirectorySize(dirPath) {
        let totalSize = 0;
        
        const getSize = (currentPath) => {
            const stats = fs.statSync(currentPath);
            
            if (stats.isDirectory()) {
                const files = fs.readdirSync(currentPath);
                files.forEach(file => {
                    getSize(path.join(currentPath, file));
                });
            } else {
                totalSize += stats.size;
            }
        };

        getSize(dirPath);
        return totalSize;
    }

    async listBackups(type = 'all') {
        try {
            const files = await fs.readdir(this.backupDir);
            
            const backups = files
                .filter(file => {
                    if (type === 'all') return true;
                    return file.startsWith(`${type}_`);
                })
                .map(file => {
                    const filePath = path.join(this.backupDir, file);
                    const stats = fs.statSync(filePath);
                    
                    return {
                        name: file,
                        path: filePath,
                        size: stats.size,
                        sizeFormatted: this.formatFileSize(stats.size),
                        modified: moment(stats.mtime).format('YYYY-MM-DD HH:mm:ss'),
                        age: moment().diff(stats.mtime, 'days') + ' days ago'
                    };
                })
                .sort((a, b) => fs.statSync(b.path).mtimeMs - fs.statSync(a.path).mtimeMs);

            return backups;
        } catch (error) {
            this.logger.error('Error listing backups', error);
            return [];
        }
    }

    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Byte';
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    }

    async restoreBackup(backupName) {
        try {
            const backupPath = path.join(this.backupDir, backupName);
            if (!fs.existsSync(backupPath)) {
                throw new Error('Backup file not found');
            }

            // Extract backup to temp directory
            const tempDir = path.join(__dirname, '../temp_restore');
            if (fs.existsSync(tempDir)) {
                await fs.remove(tempDir);
            }
            await fs.mkdir(tempDir, { recursive: true });

            await this.extractArchive(backupPath, tempDir);

            // Check backup type
            const backupInfoPath = path.join(tempDir, 'backup_info.json');
            let backupType = 'unknown';
            
            if (fs.existsSync(backupInfoPath)) {
                const info = await fs.readJson(backupInfoPath);
                backupType = 'full';
            } else if (backupName.includes('database')) {
                backupType = 'database';
            } else if (backupName.includes('config')) {
                backupType = 'config';
            }

            // Restore based on type
            switch (backupType) {
                case 'database':
                    await this.restoreDatabase(tempDir);
                    break;
                    
                case 'config':
                    await this.restoreConfig(tempDir);
                    break;
                    
                case 'full':
                    await this.restoreFull(tempDir);
                    break;
                    
                default:
                    throw new Error('Unknown backup type');
            }

            // Clean up temp directory
            await fs.remove(tempDir);

            this.logger.success(`Successfully restored backup: ${backupName}`);
            return { success: true, type: backupType };
        } catch (error) {
            this.logger.error('Error restoring backup', error);
            return { success: false, error: error.message };
        }
    }

    async extractArchive(archivePath, destination) {
        const extract = require('extract-zip');
        
        return new Promise((resolve, reject) => {
            extract(archivePath, { dir: destination })
                .then(resolve)
                .catch(reject);
        });
    }

    async restoreDatabase(tempDir) {
        const dbFiles = fs.readdirSync(tempDir).filter(file => 
            file.endsWith('.sqlite') || file.endsWith('.db')
        );

        if (dbFiles.length === 0) {
            throw new Error('No database file found in backup');
        }

        const dbFile = dbFiles[0];
        const sourcePath = path.join(tempDir, dbFile);
        const destPath = global.config?.database?.path || './includes/data.sqlite';

        // Backup current database first
        await this.createDatabaseBackup();

        // Replace database
        await fs.copy(sourcePath, destPath);
    }

    async restoreConfig(tempDir) {
        const configFiles = fs.readdirSync(tempDir).filter(file => 
            file === 'config.json'
        );

        if (configFiles.length === 0) {
            throw new Error('No config file found in backup');
        }

        const sourcePath = path.join(tempDir, 'config.json');
        const destPath = path.join(__dirname, '../config.json');

        // Backup current config first
        await this.createConfigBackup();

        // Replace config
        await fs.copy(sourcePath, destPath);
    }

    async restoreFull(tempDir) {
        // Backup current state first
        await this.createFullBackup();

        // Restore each item from backup info
        const infoPath = path.join(tempDir, 'backup_info.json');
        const info = await fs.readJson(infoPath);

        for (const item of info.itemsBackedUp) {
            const source = path.join(tempDir, item);
            const dest = path.join(__dirname, '..', item);

            if (fs.existsSync(source)) {
                if (item.endsWith('/')) {
                    if (fs.existsSync(dest)) {
                        await fs.remove(dest);
                    }
                    await fs.copy(source, dest);
                } else {
                    await fs.copy(source, dest);
                }
            }
        }
    }

    async autoBackup() {
        const backupInterval = global.config?.database?.backupInterval || 86400; // Default: 24 hours
        const lastBackupFile = path.join(this.backupDir, '.last_backup');

        let lastBackupTime = 0;
        if (fs.existsSync(lastBackupFile)) {
            lastBackupTime = parseInt(fs.readFileSync(lastBackupFile, 'utf8'));
        }

        const now = Date.now();
        const timeSinceLastBackup = now - lastBackupTime;

        if (timeSinceLastBackup >= backupInterval * 1000) {
            this.logger.info('Starting automatic backup...');
            
            // Create backups
            await this.createDatabaseBackup();
            
            // Update last backup time
            fs.writeFileSync(lastBackupFile, now.toString());
            
            this.logger.success('Automatic backup completed');
            return true;
        }

        return false;
    }

    async getBackupStats() {
        const backups = await this.listBackups('all');
        
        const stats = {
            totalBackups: backups.length,
            totalSize: backups.reduce((sum, backup) => sum + backup.size, 0),
            byType: {},
            recent: backups.slice(0, 5)
        };

        // Group by type
        backups.forEach(backup => {
            const type = backup.name.split('_')[0];
            stats.byType[type] = (stats.byType[type] || 0) + 1;
        });

        stats.totalSizeFormatted = this.formatFileSize(stats.totalSize);
        
        return stats;
    }
}

module.exports = new BackupSystem();