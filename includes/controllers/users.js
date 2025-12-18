const db = require('../database');
const logger = require('../../utils/log');
const { Op } = require('sequelize');
const crypto = require('crypto');

class UserController {
    constructor() {
        this.maxLevel = 999;
        this.expMultiplier = 1.5;
        this.baseExp = 100;
    }

    /**
     * Get user data with caching
     */
    async getUser(userID, options = {}) {
        try {
            const cacheKey = `user_${userID}`;
            const cacheTimeout = options.forceRefresh ? 0 : 60000; // 1 minute
            
            // Cache logic
            if (!options.forceRefresh && global.userCache && global.userCache[cacheKey]) {
                const cached = global.userCache[cacheKey];
                if (Date.now() - cached.timestamp < cacheTimeout) {
                    return cached.data;
                }
            }

            const include = [];
            
            if (options.includeCurrency) {
                include.push({ 
                    model: db.Currencies, 
                    as: 'currency',
                    attributes: ['balance', 'bankBalance', 'lastDaily', 'dailyStreak']
                });
            }
            
            if (options.includeThreads) {
                include.push({ 
                    model: db.Threads, 
                    as: 'threads',
                    through: { attributes: ['role', 'joinDate', 'messageCount'] },
                    attributes: ['threadID', 'name']
                });
            }

            let user = await db.Users.findOne({
                where: { userID },
                include,
                attributes: options.attributes || [
                    'id', 'userID', 'name', 'level', 'exp', 
                    'totalExp', 'rank', 'isBanned', 'warningCount',
                    'lastSeen', 'createdAt', 'updatedAt'
                ]
            });

            if (!user) {
                user = await this.createUser(userID, options.userData);
            }

            // Ensure metadata is an object
            if (user.metadata && typeof user.metadata === 'string') {
                try {
                    user.metadata = JSON.parse(user.metadata);
                } catch {
                    user.metadata = {};
                }
            } else if (!user.metadata) {
                user.metadata = {};
            }

            // Update cache
            if (!global.userCache) global.userCache = {};
            global.userCache[cacheKey] = {
                data: user,
                timestamp: Date.now()
            };

            return user;
        } catch (error) {
            logger.error(`[UserController] getUser Error: ${error.message}`, {
                userID,
                options,
                stack: error.stack
            });
            throw new Error('Failed to fetch user');
        }
    }

    /**
     * Create new user
     */
    async createUser(userID, userData = {}) {
        const transaction = await db.sequelize.transaction();
        
        try {
            const defaultData = {
                userID,
                name: userData.name || `User_${userID}`,
                level: 1,
                exp: 0,
                totalExp: 0,
                rank: 'Newbie',
                isBanned: false,
                warningCount: 0,
                lastSeen: new Date(),
                metadata: JSON.stringify({
                    createdBy: 'system',
                    firstSeen: new Date().toISOString(),
                    devices: [],
                    preferences: {}
                })
            };

            const [user] = await db.Users.findOrCreate({
                where: { userID },
                defaults: { ...defaultData, ...userData },
                transaction
            });

            // Create currency account if not skipped
            if (!userData.skipCurrency) {
                const CurrencyController = require('./currencies');
                await CurrencyController.createUserCurrency(userID, 1000);
            }

            // Log user creation
            await db.UserLogs.create({
                userId: user.id,
                action: 'create',
                details: JSON.stringify({
                    source: 'system',
                    userData: userData
                }),
                ipAddress: userData.ipAddress || null
            }, { transaction });

            await transaction.commit();

            logger.info(`[UserController] Created new user: ${userID}`, {
                userID,
                name: user.name
            });

            return user;
        } catch (error) {
            await transaction.rollback();
            logger.error(`[UserController] createUser Error: ${error.message}`, {
                userID,
                userData,
                error: error.stack
            });
            throw new Error('Failed to create user');
        }
    }

    /**
     * Update user information
     */
    async updateUser(userID, updates) {
        const transaction = await db.sequelize.transaction();
        
        try {
            const user = await this.getUser(userID);
            
            // Allowed update fields
            const allowedUpdates = [
                'name', 'level', 'exp', 'totalExp', 'rank',
                'isBanned', 'banReason', 'banUntil', 'warningCount',
                'lastSeen', 'metadata'
            ];

            const filteredUpdates = {};
            allowedUpdates.forEach(key => {
                if (updates[key] !== undefined) {
                    filteredUpdates[key] = updates[key];
                }
            });

            // Handle metadata update specially
            if (updates.metadata && typeof updates.metadata === 'object') {
                const currentMetadata = user.metadata || {};
                filteredUpdates.metadata = JSON.stringify({
                    ...currentMetadata,
                    ...updates.metadata,
                    lastUpdated: new Date().toISOString()
                });
            }

            if (Object.keys(filteredUpdates).length === 0) {
                throw new Error('No valid updates provided');
            }

            // Update user
            await db.Users.update(
                filteredUpdates,
                { where: { userID }, transaction }
            );

            // Log the update
            await db.UserLogs.create({
                userId: user.id,
                action: 'update',
                details: JSON.stringify({
                    updates: filteredUpdates,
                    updatedBy: updates.updatedBy || 'system'
                }),
                ipAddress: updates.ipAddress || null
            }, { transaction });

            await transaction.commit();

            // Clear cache
            this.clearCache(userID);

            logger.info(`[UserController] Updated user: ${userID}`, {
                userID,
                updates: filteredUpdates
            });

            return await this.getUser(userID, { forceRefresh: true });
        } catch (error) {
            await transaction.rollback();
            logger.error(`[UserController] updateUser Error: ${error.message}`, {
                userID,
                updates,
                error: error.stack
            });
            throw error;
        }
    }

    /**
     * Add experience to user
     */
    async addExp(userID, expAmount, source = 'unknown') {
        if (expAmount <= 0) {
            throw new Error('Experience amount must be positive');
        }

        const transaction = await db.sequelize.transaction();
        
        try {
            const user = await db.Users.findOne({
                where: { userID },
                lock: transaction.LOCK.UPDATE,
                transaction
            });

            if (!user) {
                throw new Error('User not found');
            }

            const newExp = user.exp + expAmount;
            const expForNextLevel = this.calculateExpForLevel(user.level + 1);
            
            let levelUp = false;
            let newLevel = user.level;
            let levelsGained = 0;

            // Check for level ups
            let remainingExp = newExp;
            while (remainingExp >= expForNextLevel && newLevel < this.maxLevel) {
                remainingExp -= expForNextLevel;
                newLevel++;
                levelUp = true;
                levelsGained++;
            }

            // Update user
            await user.update({
                level: newLevel,
                exp: remainingExp,
                totalExp: user.totalExp + expAmount,
                rank: this.calculateRank(newLevel)
            }, { transaction });

            // Log experience gain
            await db.ExperienceLogs.create({
                userId: user.id,
                amount: expAmount,
                source: source,
                oldLevel: user.level,
                newLevel: newLevel,
                oldExp: user.exp,
                newExp: remainingExp,
                totalExp: user.totalExp + expAmount
            }, { transaction });

            await transaction.commit();

            // Clear cache
            this.clearCache(userID);

            logger.info(`[UserController] Added ${expAmount} EXP to ${userID}`, {
                userID,
                expAmount,
                source,
                oldLevel: user.level,
                newLevel,
                levelUp
            });

            return {
                success: true,
                userID,
                expAdded: expAmount,
                oldLevel: user.level,
                newLevel,
                oldExp: user.exp,
                newExp: remainingExp,
                levelUp,
                levelsGained,
                expToNextLevel: this.calculateExpForLevel(newLevel + 1) - remainingExp,
                totalExp: user.totalExp + expAmount,
                rank: this.calculateRank(newLevel)
            };
        } catch (error) {
            await transaction.rollback();
            logger.error(`[UserController] addExp Error: ${error.message}`, {
                userID,
                expAmount,
                source,
                error: error.stack
            });
            throw error;
        }
    }

    /**
     * Add warning to user
     */
    async addWarning(userID, reason, adminId = null) {
        const transaction = await db.sequelize.transaction();
        
        try {
            const user = await this.getUser(userID);
            
            user.warningCount += 1;
            
            // Update warnings in metadata
            const warnings = user.metadata.warnings || [];
            warnings.push({
                reason,
                adminId,
                timestamp: new Date().toISOString(),
                count: user.warningCount
            });
            
            user.metadata.warnings = warnings;
            user.metadata.lastWarning = new Date().toISOString();

            // Auto-ban after 3 warnings
            if (user.warningCount >= 3) {
                user.isBanned = true;
                user.banReason = 'Auto-ban: Received 3 warnings';
                user.banUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
                
                logger.warn(`[UserController] Auto-banned user ${userID} for 3 warnings`);
            }

            await user.update({
                warningCount: user.warningCount,
                isBanned: user.isBanned,
                banReason: user.banReason,
                banUntil: user.banUntil,
                metadata: JSON.stringify(user.metadata)
            }, { transaction });

            // Log warning
            await db.UserLogs.create({
                userId: user.id,
                action: 'warning',
                details: JSON.stringify({
                    reason,
                    adminId,
                    warningCount: user.warningCount,
                    autoBanned: user.warningCount >= 3
                }),
                ipAddress: null
            }, { transaction });

            await transaction.commit();

            // Clear cache
            this.clearCache(userID);

            logger.info(`[UserController] Added warning to user ${userID}`, {
                userID,
                reason,
                adminId,
                warningCount: user.warningCount
            });

            return {
                success: true,
                userID,
                warningCount: user.warningCount,
                reason,
                adminId,
                autoBanned: user.warningCount >= 3,
                banUntil: user.banUntil
            };
        } catch (error) {
            await transaction.rollback();
            logger.error(`[UserController] addWarning Error: ${error.message}`, {
                userID,
                reason,
                adminId,
                error: error.stack
            });
            throw error;
        }
    }

    /**
     * Clear user warnings
     */
    async clearWarnings(userID, adminId = null) {
        const transaction = await db.sequelize.transaction();
        
        try {
            const user = await this.getUser(userID);
            
            const oldWarningCount = user.warningCount;
            
            user.warningCount = 0;
            user.metadata.warnings = [];
            
            if (user.isBanned && user.banReason?.includes('Auto-ban')) {
                user.isBanned = false;
                user.banReason = null;
                user.banUntil = null;
            }

            await user.update({
                warningCount: 0,
                isBanned: user.isBanned,
                banReason: user.banReason,
                banUntil: user.banUntil,
                metadata: JSON.stringify(user.metadata)
            }, { transaction });

            // Log clearance
            await db.UserLogs.create({
                userId: user.id,
                action: 'clear_warnings',
                details: JSON.stringify({
                    adminId,
                    oldWarningCount,
                    newWarningCount: 0
                }),
                ipAddress: null
            }, { transaction });

            await transaction.commit();

            // Clear cache
            this.clearCache(userID);

            logger.info(`[UserController] Cleared warnings for user ${userID}`, {
                userID,
                oldWarningCount,
                adminId
            });

            return {
                success: true,
                userID,
                oldWarningCount,
                newWarningCount: 0,
                clearedBy: adminId
            };
        } catch (error) {
            await transaction.rollback();
            logger.error(`[UserController] clearWarnings Error: ${error.message}`, {
                userID,
                adminId,
                error: error.stack
            });
            throw error;
        }
    }

    /**
     * Check if user is banned
     */
    async isUserBanned(userID) {
        try {
            const user = await this.getUser(userID);
            
            if (!user.isBanned) {
                return { banned: false };
            }

            // Check if ban has expired
            if (user.banUntil && new Date() > new Date(user.banUntil)) {
                // Auto-unban
                await this.updateUser(userID, {
                    isBanned: false,
                    banReason: null,
                    banUntil: null
                });
                
                return { banned: false, autoUnbanned: true };
            }

            return {
                banned: true,
                reason: user.banReason,
                until: user.banUntil,
                remaining: user.banUntil ? 
                    Math.ceil((new Date(user.banUntil) - new Date()) / (1000 * 60 * 60 * 24)) : 
                    'permanent'
            };
        } catch (error) {
            logger.error(`[UserController] isUserBanned Error: ${error.message}`, {
                userID,
                error: error.stack
            });
            return { banned: false, error: true };
        }
    }

    /**
     * Ban user
     */
    async banUser(userID, reason, durationDays = null, adminId = null) {
        const transaction = await db.sequelize.transaction();
        
        try {
            const user = await this.getUser(userID);
            
            const banUntil = durationDays ? 
                new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000) : 
                null;

            await user.update({
                isBanned: true,
                banReason: reason,
                banUntil: banUntil
            }, { transaction });

            // Log ban
            await db.UserLogs.create({
                userId: user.id,
                action: 'ban',
                details: JSON.stringify({
                    reason,
                    durationDays,
                    adminId,
                    banUntil
                }),
                ipAddress: null
            }, { transaction });

            await transaction.commit();

            // Clear cache
            this.clearCache(userID);

            logger.warn(`[UserController] Banned user ${userID}`, {
                userID,
                reason,
                durationDays,
                adminId,
                banUntil
            });

            return {
                success: true,
                userID,
                reason,
                durationDays,
                banUntil,
                bannedBy: adminId,
                timestamp: new Date()
            };
        } catch (error) {
            await transaction.rollback();
            logger.error(`[UserController] banUser Error: ${error.message}`, {
                userID,
                reason,
                durationDays,
                error: error.stack
            });
            throw error;
        }
    }

    /**
     * Unban user
     */
    async unbanUser(userID, adminId = null) {
        const transaction = await db.sequelize.transaction();
        
        try {
            const user = await this.getUser(userID);
            
            if (!user.isBanned) {
                return { success: true, alreadyUnbanned: true };
            }

            await user.update({
                isBanned: false,
                banReason: null,
                banUntil: null
            }, { transaction });

            // Log unban
            await db.UserLogs.create({
                userId: user.id,
                action: 'unban',
                details: JSON.stringify({
                    adminId,
                    oldBanReason: user.banReason,
                    oldBanUntil: user.banUntil
                }),
                ipAddress: null
            }, { transaction });

            await transaction.commit();

            // Clear cache
            this.clearCache(userID);

            logger.info(`[UserController] Unbanned user ${userID}`, {
                userID,
                adminId
            });

            return {
                success: true,
                userID,
                unbannedBy: adminId,
                timestamp: new Date()
            };
        } catch (error) {
            await transaction.rollback();
            logger.error(`[UserController] unbanUser Error: ${error.message}`, {
                userID,
                adminId,
                error: error.stack
            });
            throw error;
        }
    }

    /**
     * Get user statistics
     */
    async getUserStats(userID) {
        try {
            const user = await this.getUser(userID, { 
                includeCurrency: true,
                includeThreads: true 
            });

            const CurrencyController = require('./currencies');
            const currencyStats = await CurrencyController.getUserStats(userID);

            // Calculate activity stats
            const threadStats = user.threads ? {
                totalThreads: user.threads.length,
                adminThreads: user.threads.filter(t => t.ThreadUser.role === 'admin').length,
                moderatorThreads: user.threads.filter(t => t.ThreadUser.role === 'moderator').length,
                memberThreads: user.threads.filter(t => t.ThreadUser.role === 'member').length,
                totalMessages: user.threads.reduce((sum, t) => sum + (t.ThreadUser.messageCount || 0), 0),
                mostActiveThread: user.threads.reduce((max, t) => 
                    (t.ThreadUser.messageCount || 0) > (max?.ThreadUser?.messageCount || 0) ? t : max, null
                )
            } : {
                totalThreads: 0,
                adminThreads: 0,
                moderatorThreads: 0,
                memberThreads: 0,
                totalMessages: 0,
                mostActiveThread: null
            };

            // Get experience history
            const expHistory = await db.ExperienceLogs.findAll({
                where: { userId: user.id },
                order: [['createdAt', 'DESC']],
                limit: 10,
                attributes: ['amount', 'source', 'oldLevel', 'newLevel', 'createdAt']
            });

            // Calculate playtime
            const firstSeen = new Date(user.metadata?.firstSeen || user.createdAt);
            const playtimeDays = Math.floor((new Date() - firstSeen) / (1000 * 60 * 60 * 24));

            // Calculate rank percentile
            const rankStats = await this.getRankPercentile(user.level);

            return {
                userID: user.userID,
                name: user.name,
                level: user.level,
                exp: user.exp,
                totalExp: user.totalExp,
                expToNextLevel: this.calculateExpForLevel(user.level + 1) - user.exp,
                rank: user.rank,
                rankPercentile: rankStats.percentile,
                globalRank: rankStats.rank,
                warningCount: user.warningCount,
                isBanned: user.isBanned,
                banInfo: user.isBanned ? {
                    reason: user.banReason,
                    until: user.banUntil,
                    remaining: user.banUntil ? 
                        Math.ceil((new Date(user.banUntil) - new Date()) / (1000 * 60 * 60 * 24)) : 
                        'permanent'
                } : null,
                currency: currencyStats,
                threadStats,
                activity: {
                    lastSeen: user.lastSeen,
                    isOnline: user.lastSeen ? 
                        (Date.now() - new Date(user.lastSeen).getTime() < 300000) : false,
                    playtimeDays,
                    firstSeen: firstSeen,
                    expHistory: expHistory.map(exp => ({
                        amount: exp.amount,
                        source: exp.source,
                        levelChange: exp.newLevel - exp.oldLevel,
                        date: exp.createdAt
                    }))
                },
                metadata: {
                    warnings: user.metadata.warnings || [],
                    preferences: user.metadata.preferences || {},
                    devices: user.metadata.devices || []
                },
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            };
        } catch (error) {
            logger.error(`[UserController] getUserStats Error: ${error.message}`, {
                userID,
                error: error.stack
            });
            throw new Error('Failed to fetch user stats');
        }
    }

    /**
     * Search users
     */
    async searchUsers(query, limit = 20, filters = {}) {
        try {
            const where = {
                [Op.or]: [
                    { userID: { [Op.like]: `%${query}%` } },
                    { name: { [Op.like]: `%${query}%` } }
                ]
            };

            if (filters.minLevel) {
                where.level = { [Op.gte]: filters.minLevel };
            }
            if (filters.isBanned !== undefined) {
                where.isBanned = filters.isBanned;
            }

            const users = await db.Users.findAll({
                where,
                limit: Math.min(limit, 50),
                order: [['level', 'DESC'], ['totalExp', 'DESC']],
                attributes: ['userID', 'name', 'level', 'exp', 'totalExp', 'rank', 'isBanned', 'lastSeen']
            });

            return users.map(user => ({
                userID: user.userID,
                name: user.name,
                level: user.level,
                exp: user.exp,
                totalExp: user.totalExp,
                rank: user.rank,
                isBanned: user.isBanned,
                lastSeen: user.lastSeen,
                isOnline: user.lastSeen ? 
                    (Date.now() - new Date(user.lastSeen).getTime() < 300000) : false
            }));
        } catch (error) {
            logger.error(`[UserController] searchUsers Error: ${error.message}`, {
                query,
                limit,
                error: error.stack
            });
            throw new Error('Failed to search users');
        }
    }

    /**
     * Get user leaderboard
     */
    async getLeaderboard(type = 'level', limit = 10, offset = 0) {
        try {
            let orderField;
            switch (type) {
                case 'exp':
                    orderField = 'totalExp';
                    break;
                case 'messages':
                    // This would require joining with thread messages
                    orderField = 'level'; // Fallback
                    break;
                case 'balance':
                    // This would require joining with currency
                    orderField = 'level'; // Fallback
                    break;
                default:
                    orderField = 'level';
            }

            const users = await db.Users.findAll({
                order: [[orderField, 'DESC'], ['totalExp', 'DESC']],
                limit: Math.min(limit, 100),
                offset: offset,
                attributes: ['userID', 'name', 'level', 'exp', 'totalExp', 'rank']
            });

            return users.map((user, index) => ({
                rank: offset + index + 1,
                userID: user.userID,
                name: user.name,
                level: user.level,
                exp: user.exp,
                totalExp: user.totalExp,
                rankTitle: user.rank
            }));
        } catch (error) {
            logger.error(`[UserController] getLeaderboard Error: ${error.message}`, {
                type,
                limit,
                error: error.stack
            });
            throw new Error('Failed to fetch leaderboard');
        }
    }

    /**
     * Calculate experience for level
     */
    calculateExpForLevel(level) {
        if (level <= 1) return 0;
        return Math.floor(this.baseExp * Math.pow(level - 1, this.expMultiplier));
    }

    /**
     * Calculate total exp for current level
     */
    calculateTotalExp(level, currentExp) {
        let totalExp = currentExp;
        for (let i = 1; i < level; i++) {
            totalExp += this.calculateExpForLevel(i + 1);
        }
        return totalExp;
    }

    /**
     * Calculate rank based on level
     */
    calculateRank(level) {
        const ranks = [
            { min: 1, max: 10, name: 'Newbie' },
            { min: 11, max: 30, name: 'Beginner' },
            { min: 31, max: 60, name: 'Intermediate' },
            { min: 61, max: 100, name: 'Advanced' },
            { min: 101, max: 150, name: 'Expert' },
            { min: 151, max: 200, name: 'Master' },
            { min: 201, max: 300, name: 'Grand Master' },
            { min: 301, max: 500, name: 'Legend' },
            { min: 501, max: 750, name: 'Mythic' },
            { min: 751, max: 999, name: 'God' }
        ];

        for (const rank of ranks) {
            if (level >= rank.min && level <= rank.max) {
                return rank.name;
            }
        }
        
        return 'Unknown';
    }

    /**
     * Get rank percentile
     */
    async getRankPercentile(level) {
        try {
            const totalUsers = await db.Users.count();
            const usersAbove = await db.Users.count({
                where: { level: { [Op.gt]: level } }
            });

            const percentile = totalUsers > 0 ? 
                ((totalUsers - usersAbove) / totalUsers * 100).toFixed(1) : 0;
            const rank = totalUsers - usersAbove;

            return {
                percentile: parseFloat(percentile),
                rank: rank,
                totalUsers: totalUsers
            };
        } catch (error) {
            return { percentile: 0, rank: 0, totalUsers: 0 };
        }
    }

    /**
     * Clear user cache
     */
    clearCache(userID) {
        if (global.userCache) {
            delete global.userCache[`user_${userID}`];
        }
    }

    /**
     * Update user last seen
     */
    async updateLastSeen(userID, ipAddress = null) {
        try {
            const user = await this.getUser(userID);
            
            const now = new Date();
            const lastSeen = new Date(user.lastSeen || 0);
            const hoursDiff = (now - lastSeen) / (1000 * 60 * 60);

            // Only update if more than 5 minutes passed
            if (hoursDiff * 60 >= 5) {
                await this.updateUser(userID, {
                    lastSeen: now,
                    metadata: {
                        ...user.metadata,
                        lastLogin: now.toISOString(),
                        loginCount: (user.metadata.loginCount || 0) + 1,
                        ...(ipAddress && { lastIp: ipAddress })
                    }
                });
            }

            return { success: true };
        } catch (error) {
            logger.error(`[UserController] updateLastSeen Error: ${error.message}`, {
                userID,
                error: error.stack
            });
            return { success: false };
        }
    }

    /**
     * Get system user statistics
     */
    async getSystemStats() {
        try {
            const stats = await db.Users.findAll({
                attributes: [
                    [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'totalUsers'],
                    [db.sequelize.fn('SUM', db.sequelize.col('level')), 'totalLevels'],
                    [db.sequelize.fn('AVG', db.sequelize.col('level')), 'avgLevel'],
                    [db.sequelize.fn('MAX', db.sequelize.col('level')), 'maxLevel'],
                    [db.sequelize.fn('COUNT', db.sequelize.col('isBanned')), 'bannedUsers'],
                    [db.sequelize.fn('SUM', db.sequelize.col('warningCount')), 'totalWarnings']
                ]
            });

            const recentUsers = await db.Users.count({
                where: {
                    createdAt: {
                        [Op.gte]: new Date(new Date() - 24 * 60 * 60 * 1000)
                    }
                }
            });

            const onlineUsers = await db.Users.count({
                where: {
                    lastSeen: {
                        [Op.gte]: new Date(new Date() - 5 * 60 * 1000)
                    }
                }
            });

            return {
                timestamp: new Date(),
                totalUsers: stats[0].get('totalUsers') || 0,
                totalLevels: stats[0].get('totalLevels') || 0,
                averageLevel: Math.round(stats[0].get('avgLevel') || 0),
                maxLevel: stats[0].get('maxLevel') || 0,
                bannedUsers: stats[0].get('bannedUsers') || 0,
                totalWarnings: stats[0].get('totalWarnings') || 0,
                recentUsers24h: recentUsers,
                onlineUsers: onlineUsers,
                activeRate: stats[0].get('totalUsers') > 0 ? 
                    ((onlineUsers / stats[0].get('totalUsers')) * 100).toFixed(1) + '%' : '0%'
            };
        } catch (error) {
            logger.error(`[UserController] getSystemStats Error: ${error.message}`, {
                error: error.stack
            });
            throw new Error('Failed to fetch system stats');
        }
    }
}

// Singleton instance
module.exports = new UserController();