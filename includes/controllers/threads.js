const db = require('../database');
const logger = require('../../utils/log');
const { Op } = require('sequelize');

class ThreadController {
    constructor() {
        this.defaultSettings = {
            prefix: "!",
            adminOnly: false,
            antiSpam: true,
            welcomeEnabled: true,
            farewellEnabled: true,
            autoApprove: false,
            language: "en",
            autoDeleteCommands: false,
            maxWarnings: 3,
            allowMedia: true,
            allowLinks: true,
            allowCommands: true,
            nsfwFilter: false
        };
    }

    /**
     * Get thread settings with caching
     */
    async getThreadSettings(threadID, forceRefresh = false) {
        try {
            const cacheKey = `thread_${threadID}`;
            
            // Cache logic
            if (!forceRefresh && global.threadCache && global.threadCache[cacheKey]) {
                const cached = global.threadCache[cacheKey];
                if (Date.now() - cached.timestamp < 30000) { // 30 seconds cache
                    return cached.data;
                }
            }

            let thread = await db.Threads.findOne({
                where: { threadID },
                include: [{
                    model: db.Users,
                    as: 'members',
                    through: { attributes: ['role', 'joinDate'] },
                    attributes: ['userID', 'name', 'level']
                }]
            });

            if (!thread) {
                thread = await this.createThread(threadID);
            }

            // Ensure settings is an object
            if (typeof thread.settings === 'string') {
                thread.settings = JSON.parse(thread.settings);
            } else if (!thread.settings) {
                thread.settings = {};
            }

            // Merge with default settings
            thread.settings = { ...this.defaultSettings, ...thread.settings };

            // Update cache
            if (!global.threadCache) global.threadCache = {};
            global.threadCache[cacheKey] = {
                data: thread,
                timestamp: Date.now()
            };

            return thread;
        } catch (error) {
            logger.error(`[ThreadController] getThreadSettings Error: ${error.message}`, {
                threadID,
                stack: error.stack
            });
            throw new Error('Failed to fetch thread settings');
        }
    }

    /**
     * Create new thread
     */
    async createThread(threadID, initialData = {}) {
        const transaction = await db.sequelize.transaction();
        
        try {
            const defaultData = {
                threadID,
                name: initialData.name || 'New Group',
                prefix: this.defaultSettings.prefix,
                isActive: true,
                settings: JSON.stringify(this.defaultSettings),
                messageCount: 0,
                lastActivity: new Date()
            };

            const [thread] = await db.Threads.findOrCreate({
                where: { threadID },
                defaults: defaultData,
                transaction
            });

            // Parse settings if it's a string
            if (typeof thread.settings === 'string') {
                thread.settings = JSON.parse(thread.settings);
            }

            await transaction.commit();

            logger.info(`[ThreadController] Created new thread: ${threadID}`, {
                threadID,
                name: thread.name
            });

            return thread;
        } catch (error) {
            await transaction.rollback();
            logger.error(`[ThreadController] createThread Error: ${error.message}`, {
                threadID,
                error: error.stack
            });
            throw new Error('Failed to create thread');
        }
    }

    /**
     * Update thread settings
     */
    async updateThreadSettings(threadID, updates) {
        const transaction = await db.sequelize.transaction();
        
        try {
            // Get current thread
            const thread = await this.getThreadSettings(threadID);
            
            // Allowed update fields
            const allowedUpdates = [
                'name', 'prefix', 'isActive', 'settings',
                'welcomeMessage', 'farewellMessage', 'rules'
            ];

            const filteredUpdates = {};
            allowedUpdates.forEach(key => {
                if (updates[key] !== undefined) {
                    filteredUpdates[key] = updates[key];
                }
            });

            // Handle settings update specially
            if (updates.settings && typeof updates.settings === 'object') {
                const currentSettings = thread.settings || {};
                filteredUpdates.settings = JSON.stringify({
                    ...currentSettings,
                    ...updates.settings
                });
            }

            if (Object.keys(filteredUpdates).length === 0) {
                throw new Error('No valid updates provided');
            }

            // Update thread
            await db.Threads.update(
                filteredUpdates,
                { where: { threadID }, transaction }
            );

            // Log the change
            await db.ThreadLogs.create({
                threadId: thread.id,
                action: 'update_settings',
                userId: updates.adminId || null,
                details: JSON.stringify(filteredUpdates),
                ipAddress: updates.ipAddress || null
            }, { transaction });

            await transaction.commit();

            // Clear cache
            this.clearCache(threadID);

            logger.info(`[ThreadController] Updated thread settings: ${threadID}`, {
                threadID,
                updates: filteredUpdates
            });

            return await this.getThreadSettings(threadID, true);
        } catch (error) {
            await transaction.rollback();
            logger.error(`[ThreadController] updateThreadSettings Error: ${error.message}`, {
                threadID,
                updates,
                error: error.stack
            });
            throw error;
        }
    }

    /**
     * Add member to thread
     */
    async addMemberToThread(threadID, userID, role = 'member', adminId = null) {
        const transaction = await db.sequelize.transaction();
        
        try {
            // Get or create thread
            const thread = await this.getThreadSettings(threadID);
            
            // Get or create user
            const [user] = await db.Users.findOrCreate({
                where: { userID },
                defaults: { userID, name: `User_${userID}` },
                transaction
            });

            // Check if already a member
            const existingMember = await db.ThreadUsers.findOne({
                where: {
                    threadId: thread.id,
                    userId: user.id
                },
                transaction
            });

            if (existingMember) {
                // Update role if different
                if (existingMember.role !== role) {
                    existingMember.role = role;
                    await existingMember.save({ transaction });
                    
                    logger.info(`[ThreadController] Updated member role: ${userID} -> ${role} in ${threadID}`);
                }
                
                await transaction.commit();
                return { success: true, existed: true, role };
            }

            // Add as new member
            await thread.addMember(user, {
                through: { 
                    role: role, 
                    joinDate: new Date(),
                    messageCount: 0
                },
                transaction
            });

            // Log the action
            await db.ThreadLogs.create({
                threadId: thread.id,
                action: 'add_member',
                userId: adminId || user.id,
                details: JSON.stringify({
                    addedUserId: userID,
                    role: role,
                    adminId: adminId
                }),
                ipAddress: null
            }, { transaction });

            await transaction.commit();

            // Clear cache
            this.clearCache(threadID);

            logger.info(`[ThreadController] Added member to thread: ${userID} as ${role} in ${threadID}`);

            return { 
                success: true, 
                threadId: threadID, 
                userId: userID, 
                role,
                joinDate: new Date()
            };
        } catch (error) {
            await transaction.rollback();
            logger.error(`[ThreadController] addMemberToThread Error: ${error.message}`, {
                threadID,
                userID,
                role,
                error: error.stack
            });
            throw error;
        }
    }

    /**
     * Remove member from thread
     */
    async removeMemberFromThread(threadID, userID, adminId = null, reason = '') {
        const transaction = await db.sequelize.transaction();
        
        try {
            const thread = await db.Threads.findOne({
                where: { threadID },
                transaction
            });

            if (!thread) {
                throw new Error('Thread not found');
            }

            const user = await db.Users.findOne({
                where: { userID },
                transaction
            });

            if (!user) {
                throw new Error('User not found');
            }

            // Remove from thread
            await thread.removeMember(user, { transaction });

            // Log the action
            await db.ThreadLogs.create({
                threadId: thread.id,
                action: 'remove_member',
                userId: adminId,
                details: JSON.stringify({
                    removedUserId: userID,
                    reason: reason,
                    adminId: adminId
                }),
                ipAddress: null
            }, { transaction });

            await transaction.commit();

            // Clear cache
            this.clearCache(threadID);

            logger.info(`[ThreadController] Removed member from thread: ${userID} from ${threadID}`, {
                threadID,
                userID,
                reason
            });

            return { 
                success: true, 
                threadId: threadID, 
                userId: userID,
                reason,
                removedBy: adminId
            };
        } catch (error) {
            await transaction.rollback();
            logger.error(`[ThreadController] removeMemberFromThread Error: ${error.message}`, {
                threadID,
                userID,
                error: error.stack
            });
            throw error;
        }
    }

    /**
     * Get thread members
     */
    async getThreadMembers(threadID, filters = {}) {
        try {
            const thread = await db.Threads.findOne({
                where: { threadID },
                include: [{
                    model: db.Users,
                    as: 'members',
                    through: {
                        where: filters,
                        attributes: ['role', 'joinDate', 'messageCount', 'lastMessage']
                    },
                    attributes: ['userID', 'name', 'level', 'lastSeen']
                }]
            });

            if (!thread) {
                return [];
            }

            return thread.members.map(member => ({
                userId: member.userID,
                name: member.name,
                level: member.level,
                role: member.ThreadUser.role,
                joinDate: member.ThreadUser.joinDate,
                messageCount: member.ThreadUser.messageCount,
                lastMessage: member.ThreadUser.lastMessage,
                lastSeen: member.lastSeen,
                isOnline: member.lastSeen ? (Date.now() - new Date(member.lastSeen).getTime() < 300000) : false
            }));
        } catch (error) {
            logger.error(`[ThreadController] getThreadMembers Error: ${error.message}`, {
                threadID,
                filters,
                error: error.stack
            });
            throw new Error('Failed to fetch thread members');
        }
    }

    /**
     * Get thread stats
     */
    async getThreadStats(threadID) {
        try {
            const thread = await this.getThreadSettings(threadID);
            const members = await this.getThreadMembers(threadID);
            
            const adminCount = members.filter(m => m.role === 'admin').length;
            const moderatorCount = members.filter(m => m.role === 'moderator').length;
            const memberCount = members.filter(m => m.role === 'member').length;
            
            const onlineCount = members.filter(m => m.isOnline).length;
            const activeToday = members.filter(m => {
                if (!m.lastMessage) return false;
                const lastMessageDate = new Date(m.lastMessage);
                const today = new Date();
                return lastMessageDate.getDate() === today.getDate() &&
                       lastMessageDate.getMonth() === today.getMonth() &&
                       lastMessageDate.getFullYear() === today.getFullYear();
            }).length;

            // Get message statistics
            const messageStats = await db.ThreadUsers.findAll({
                where: { threadId: thread.id },
                attributes: [
                    [db.sequelize.fn('SUM', db.sequelize.col('messageCount')), 'totalMessages'],
                    [db.sequelize.fn('MAX', db.sequelize.col('messageCount')), 'maxMessages'],
                    [db.sequelize.fn('AVG', db.sequelize.col('messageCount')), 'avgMessages']
                ]
            });

            // Get daily activity
            const dailyActivity = await db.sequelize.query(`
                SELECT DATE(createdAt) as date, COUNT(*) as messageCount
                FROM thread_logs 
                WHERE threadId = ? AND action = 'message'
                GROUP BY DATE(createdAt)
                ORDER BY date DESC
                LIMIT 7
            `, {
                replacements: [thread.id],
                type: db.sequelize.QueryTypes.SELECT
            });

            return {
                threadID: thread.threadID,
                name: thread.name,
                totalMembers: members.length,
                adminCount,
                moderatorCount,
                memberCount,
                onlineCount,
                activeToday,
                messageCount: thread.messageCount,
                messageStats: {
                    total: messageStats[0]?.get('totalMessages') || 0,
                    maxPerUser: messageStats[0]?.get('maxMessages') || 0,
                    averagePerUser: Math.round(messageStats[0]?.get('avgMessages') || 0)
                },
                settings: thread.settings,
                isActive: thread.isActive,
                createdAt: thread.createdAt,
                lastActivity: thread.lastActivity,
                dailyActivity: dailyActivity,
                activityRate: thread.messageCount > 0 ? 
                    (activeToday / members.length * 100).toFixed(1) + '%' : '0%'
            };
        } catch (error) {
            logger.error(`[ThreadController] getThreadStats Error: ${error.message}`, {
                threadID,
                error: error.stack
            });
            throw new Error('Failed to fetch thread stats');
        }
    }

    /**
     * Increment message count for thread and user
     */
    async incrementMessageCount(threadID, userID) {
        const transaction = await db.sequelize.transaction();
        
        try {
            // Update thread message count
            await db.Threads.increment('messageCount', {
                where: { threadID },
                by: 1,
                transaction
            });

            await db.Threads.update({
                lastActivity: new Date()
            }, {
                where: { threadID },
                transaction
            });

            // Update user message count in thread
            const thread = await db.Threads.findOne({
                where: { threadID },
                transaction
            });

            const user = await db.Users.findOne({
                where: { userID },
                transaction
            });

            if (thread && user) {
                const threadUser = await db.ThreadUsers.findOne({
                    where: {
                        threadId: thread.id,
                        userId: user.id
                    },
                    transaction
                });

                if (threadUser) {
                    await threadUser.increment('messageCount', { by: 1, transaction });
                    await threadUser.update({ lastMessage: new Date() }, { transaction });
                }
            }

            await transaction.commit();
            
            // Clear cache after activity
            this.clearCache(threadID);

            return { success: true };
        } catch (error) {
            await transaction.rollback();
            logger.error(`[ThreadController] incrementMessageCount Error: ${error.message}`, {
                threadID,
                userID,
                error: error.stack
            });
            // Don't throw error for message counting failures
            return { success: false };
        }
    }

    /**
     * Search threads
     */
    async searchThreads(query, limit = 20) {
        try {
            const threads = await db.Threads.findAll({
                where: {
                    [Op.or]: [
                        { threadID: { [Op.like]: `%${query}%` } },
                        { name: { [Op.like]: `%${query}%` } }
                    ],
                    isActive: true
                },
                limit: Math.min(limit, 50),
                order: [['lastActivity', 'DESC']],
                attributes: ['threadID', 'name', 'messageCount', 'lastActivity', 'memberCount']
            });

            return threads.map(thread => ({
                threadID: thread.threadID,
                name: thread.name,
                messageCount: thread.messageCount,
                lastActivity: thread.lastActivity,
                memberCount: thread.memberCount || 0,
                activityLevel: this.getActivityLevel(thread.lastActivity)
            }));
        } catch (error) {
            logger.error(`[ThreadController] searchThreads Error: ${error.message}`, {
                query,
                error: error.stack
            });
            throw new Error('Failed to search threads');
        }
    }

    /**
     * Get all threads with pagination
     */
    async getAllThreads(page = 1, limit = 20, filters = {}) {
        try {
            const offset = (page - 1) * limit;
            
            const where = { isActive: true };
            if (filters.search) {
                where[Op.or] = [
                    { threadID: { [Op.like]: `%${filters.search}%` } },
                    { name: { [Op.like]: `%${filters.search}%` } }
                ];
            }

            const { count, rows } = await db.Threads.findAndCountAll({
                where,
                limit: Math.min(limit, 100),
                offset,
                order: [['lastActivity', 'DESC']],
                attributes: ['threadID', 'name', 'messageCount', 'lastActivity', 'createdAt', 'settings']
            });

            const threads = rows.map(thread => {
                const settings = typeof thread.settings === 'string' ? 
                    JSON.parse(thread.settings) : thread.settings;
                
                return {
                    threadID: thread.threadID,
                    name: thread.name,
                    messageCount: thread.messageCount,
                    lastActivity: thread.lastActivity,
                    createdAt: thread.createdAt,
                    prefix: settings.prefix || '!',
                    language: settings.language || 'en',
                    memberCount: thread.memberCount || 0,
                    activityLevel: this.getActivityLevel(thread.lastActivity)
                };
            });

            return {
                threads,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count,
                    pages: Math.ceil(count / limit),
                    hasNext: offset + limit < count,
                    hasPrev: page > 1
                }
            };
        } catch (error) {
            logger.error(`[ThreadController] getAllThreads Error: ${error.message}`, {
                page,
                limit,
                error: error.stack
            });
            throw new Error('Failed to fetch threads');
        }
    }

    /**
     * Clean up inactive threads
     */
    async cleanupInactiveThreads(daysInactive = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

            const result = await db.Threads.update(
                { isActive: false },
                {
                    where: {
                        isActive: true,
                        lastActivity: { [Op.lt]: cutoffDate }
                    }
                }
            );

            logger.info(`[ThreadController] Cleaned up ${result[0]} inactive threads`);

            return {
                success: true,
                deactivated: result[0],
                cutoffDate: cutoffDate
            };
        } catch (error) {
            logger.error(`[ThreadController] cleanupInactiveThreads Error: ${error.message}`, {
                daysInactive,
                error: error.stack
            });
            throw error;
        }
    }

    /**
     * Clear cache for thread
     */
    clearCache(threadID) {
        if (global.threadCache) {
            delete global.threadCache[`thread_${threadID}`];
        }
    }

    /**
     * Helper: Get activity level
     */
    getActivityLevel(lastActivity) {
        if (!lastActivity) return 'inactive';
        
        const hoursDiff = (new Date() - new Date(lastActivity)) / (1000 * 60 * 60);
        
        if (hoursDiff < 1) return 'very_active';
        if (hoursDiff < 6) return 'active';
        if (hoursDiff < 24) return 'normal';
        if (hoursDiff < 72) return 'low';
        return 'inactive';
    }

    /**
     * Export thread data
     */
    async exportThreadData(threadID) {
        try {
            const thread = await this.getThreadSettings(threadID, true);
            const members = await this.getThreadMembers(threadID);
            const logs = await db.ThreadLogs.findAll({
                where: { threadId: thread.id },
                order: [['createdAt', 'DESC']],
                limit: 1000,
                include: [{
                    model: db.Users,
                    attributes: ['userID', 'name']
                }]
            });

            return {
                metadata: {
                    exportedAt: new Date().toISOString(),
                    threadID: thread.threadID,
                    name: thread.name
                },
                thread: {
                    threadID: thread.threadID,
                    name: thread.name,
                    settings: thread.settings,
                    messageCount: thread.messageCount,
                    createdAt: thread.createdAt,
                    lastActivity: thread.lastActivity,
                    isActive: thread.isActive
                },
                members: members.map(member => ({
                    userId: member.userId,
                    name: member.name,
                    role: member.role,
                    joinDate: member.joinDate,
                    messageCount: member.messageCount,
                    lastMessage: member.lastMessage
                })),
                logs: logs.map(log => ({
                    action: log.action,
                    user: log.User ? {
                        userId: log.User.userID,
                        name: log.User.name
                    } : null,
                    details: log.details,
                    timestamp: log.createdAt,
                    ipAddress: log.ipAddress
                })),
                statistics: await this.getThreadStats(threadID)
            };
        } catch (error) {
            logger.error(`[ThreadController] exportThreadData Error: ${error.message}`, {
                threadID,
                error: error.stack
            });
            throw new Error('Failed to export thread data');
        }
    }
}

// Singleton instance
module.exports = new ThreadController();