const BaseModel = require('../model');
const logger = require('../../../utils/log');

module.exports = (sequelize, DataTypes) => {
    class ThreadLogs extends BaseModel {}
    
    const model = ThreadLogs.init(sequelize, DataTypes, {
        tableName: 'thread_logs',
        indexes: [
            {
                fields: ['thread_id']
            },
            {
                fields: ['user_id']
            },
            {
                fields: ['action']
            },
            {
                fields: ['created_at']
            },
            {
                fields: ['ip_address']
            }
        ]
    });

    model.getSchema = function(DataTypes) {
        return {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
                comment: 'Primary key'
            },
            thread_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'threads',
                    key: 'id'
                },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
                comment: 'Reference to threads table'
            },
            user_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE',
                comment: 'User who performed the action (null for system actions)'
            },
            action: {
                type: DataTypes.STRING(50),
                allowNull: false,
                validate: {
                    len: {
                        args: [1, 50],
                        msg: 'Action must be between 1 and 50 characters'
                    }
                },
                comment: 'Action performed'
            },
            details: {
                type: DataTypes.TEXT,
                allowNull: true,
                get() {
                    const rawValue = this.getDataValue('details');
                    try {
                        return rawValue ? JSON.parse(rawValue) : {};
                    } catch {
                        return {};
                    }
                },
                set(value) {
                    this.setDataValue('details', JSON.stringify(value));
                },
                comment: 'Action details in JSON format'
            },
            ip_address: {
                type: DataTypes.STRING(45),
                allowNull: true,
                validate: {
                    isIP: {
                        msg: 'Invalid IP address format'
                    }
                },
                comment: 'IP address of requester'
            },
            user_agent: {
                type: DataTypes.TEXT,
                allowNull: true,
                comment: 'User agent of requester'
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
                comment: 'Log creation time'
            },
            updated_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
                comment: 'Log last update time'
            }
        };
    };

    model.associate = function(models) {
        model.belongsTo(models.Threads, {
            foreignKey: 'thread_id',
            as: 'thread',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
        
        model.belongsTo(models.Users, {
            foreignKey: 'user_id',
            as: 'user',
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE'
        });
    };

    // Custom validators
    model.customValidators = {
        action: {
            isValidAction(value) {
                const allowedActions = [
                    'create_thread', 'update_settings', 'delete_thread',
                    'add_member', 'remove_member', 'role_change',
                    'message', 'command', 'media_shared', 'link_shared',
                    'welcome_message', 'farewell_message', 'bot_added',
                    'bot_removed', 'thread_name_change', 'thread_icon_change',
                    'thread_color_change', 'anti_spam_triggered',
                    'warning_issued', 'user_muted', 'user_unmuted',
                    'cleanup_performed', 'backup_created'
                ];
                
                if (!allowedActions.includes(value)) {
                    throw new Error(`Invalid action. Allowed: ${allowedActions.join(', ')}`);
                }
            }
        },
        ip_address: {
            isValidIP(value) {
                if (value && !require('net').isIP(value)) {
                    throw new Error('Invalid IP address format');
                }
            }
        }
    };

    // Custom scopes
    model.customScopes = {
        byAction: (action) => ({
            where: { action: action }
        }),
        recent: (hours = 24) => ({
            where: {
                created_at: {
                    [sequelize.Sequelize.Op.gte]: sequelize.literal(`DATE_SUB(NOW(), INTERVAL ${hours} HOUR)`)
                }
            }
        }),
        moderationActions: {
            where: {
                action: {
                    [sequelize.Sequelize.Op.in]: ['add_member', 'remove_member', 'role_change', 'warning_issued', 'user_muted', 'user_unmuted']
                }
            }
        },
        systemActions: {
            where: {
                action: {
                    [sequelize.Sequelize.Op.in]: ['create_thread', 'delete_thread', 'cleanup_performed', 'backup_created']
                }
            }
        },
        userActions: {
            where: {
                action: {
                    [sequelize.Sequelize.Op.in]: ['message', 'command', 'media_shared', 'link_shared']
                }
            }
        },
        threadLogs: (threadId) => ({
            where: { thread_id: threadId }
        }),
        userInThread: (threadId, userId) => ({
            where: {
                thread_id: threadId,
                user_id: userId
            }
        })
    };

    // Instance methods
    model.prototype.getDetails = function() {
        return {
            id: this.id,
            threadId: this.thread_id,
            userId: this.user_id,
            action: this.action,
            details: this.details || {},
            ipAddress: this.ip_address,
            userAgent: this.user_agent ? this.user_agent.substring(0, 200) : null,
            createdAt: this.created_at,
            timestamp: this.created_at.getTime()
        };
    };

    model.prototype.isModerationAction = function() {
        const moderationActions = ['add_member', 'remove_member', 'role_change', 'warning_issued', 'user_muted', 'user_unmuted'];
        return moderationActions.includes(this.action);
    };

    model.prototype.isSystemAction = function() {
        const systemActions = ['create_thread', 'delete_thread', 'cleanup_performed', 'backup_created'];
        return systemActions.includes(this.action);
    };

    model.prototype.isUserAction = function() {
        const userActions = ['message', 'command', 'media_shared', 'link_shared'];
        return userActions.includes(this.action);
    };

    model.prototype.getActionCategory = function() {
        const categories = {
            // Thread management
            'create_thread': 'thread_management',
            'update_settings': 'thread_management',
            'delete_thread': 'thread_management',
            'thread_name_change': 'thread_management',
            'thread_icon_change': 'thread_management',
            'thread_color_change': 'thread_management',
            
            // Member management
            'add_member': 'member_management',
            'remove_member': 'member_management',
            'role_change': 'member_management',
            
            // User activity
            'message': 'user_activity',
            'command': 'user_activity',
            'media_shared': 'user_activity',
            'link_shared': 'user_activity',
            
            // Automation
            'welcome_message': 'automation',
            'farewell_message': 'automation',
            'bot_added': 'automation',
            'bot_removed': 'automation',
            
            // Moderation
            'warning_issued': 'moderation',
            'user_muted': 'moderation',
            'user_unmuted': 'moderation',
            'anti_spam_triggered': 'moderation',
            
            // System
            'cleanup_performed': 'system',
            'backup_created': 'system'
        };
        
        return categories[this.action] || 'other';
    };

    // Class methods
    model.createLog = async function(threadId, action, details = {}, userId = null, ipAddress = null, userAgent = null, transaction = null) {
        const thread = await sequelize.models.Threads.findOne({
            where: { thread_id: threadId }
        });

        if (!thread) {
            throw new Error('Thread not found');
        }

        let userModel = null;
        if (userId) {
            userModel = await sequelize.models.Users.findOne({
                where: { user_id: userId }
            });
        }

        const options = transaction ? { transaction } : {};

        const log = await model.create({
            thread_id: thread.id,
            user_id: userModel ? userModel.id : null,
            action: action,
            details: details,
            ip_address: ipAddress,
            user_agent: userAgent
        }, options);

        // Log moderation and system actions
        if (log.isModerationAction() || log.isSystemAction()) {
            logger.info(`[ThreadLogs] ${action} in thread ${threadId}`, {
                threadId: threadId,
                action: action,
                userId: userId,
                ipAddress: ipAddress,
                details: details
            });
        } else {
            logger.debug(`[ThreadLogs] Created log: ${action} in thread ${threadId}`);
        }

        return log;
    };

    model.getThreadLogs = async function(threadId, limit = 100, offset = 0, filters = {}) {
        const thread = await sequelize.models.Threads.findOne({
            where: { thread_id: threadId }
        });

        if (!thread) {
            return { logs: [], pagination: { total: 0, pages: 0 } };
        }

        const where = { thread_id: thread.id };
        
        if (filters.action) {
            where.action = filters.action;
        }
        
        if (filters.userId) {
            const user = await sequelize.models.Users.findOne({
                where: { user_id: filters.userId }
            });
            if (user) {
                where.user_id = user.id;
            }
        }
        
        if (filters.category) {
            // This would require more complex filtering based on action categories
        }
        
        if (filters.startDate) {
            where.created_at = {
                [sequelize.Sequelize.Op.gte]: filters.startDate
            };
        }
        
        if (filters.endDate) {
            where.created_at = {
                ...where.created_at,
                [sequelize.Sequelize.Op.lte]: filters.endDate
            };
        }

        const { count, rows } = await model.findAndCountAll({
            where,
            include: [
                {
                    model: sequelize.models.Threads,
                    as: 'thread',
                    attributes: ['thread_id', 'name']
                },
                {
                    model: sequelize.models.Users,
                    as: 'user',
                    attributes: ['user_id', 'name']
                }
            ],
            order: [['created_at', 'DESC']],
            limit: Math.min(limit, 500),
            offset: offset,
            distinct: true
        });

        const logs = rows.map(log => {
            const details = log.getDetails();
            return {
                id: log.id,
                action: details.action,
                category: log.getActionCategory(),
                details: details.details,
                ipAddress: details.ipAddress,
                userAgent: details.userAgent,
                timestamp: details.timestamp,
                createdAt: log.created_at,
                thread: log.thread ? {
                    threadId: log.thread.thread_id,
                    name: log.thread.name
                } : null,
                user: log.user ? {
                    userId: log.user.user_id,
                    name: log.user.name
                } : null,
                isModerationAction: log.isModerationAction(),
                isSystemAction: log.isSystemAction(),
                isUserAction: log.isUserAction()
            };
        });

        return {
            logs,
            pagination: {
                total: count,
                pages: Math.ceil(count / limit),
                currentPage: Math.floor(offset / limit) + 1,
                hasNext: offset + limit < count,
                hasPrev: offset > 0
            }
        };
    };

    model.getThreadActivitySummary = async function(threadId, period = 'month') {
        const thread = await sequelize.models.Threads.findOne({
            where: { thread_id: threadId }
        });

        if (!thread) {
            return {
                totalLogs: 0,
                byAction: {},
                byCategory: {},
                byUser: {},
                timeline: [],
                moderationActions: 0,
                userActions: 0
            };
        }

        // Calculate date range
        let startDate;
        const now = new Date();
        
        switch (period) {
            case 'day':
                startDate = new Date(now.setHours(0, 0, 0, 0));
                break;
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(0);
        }

        // Get summary statistics
        const summary = await model.findAll({
            where: {
                thread_id: thread.id,
                created_at: {
                    [sequelize.Sequelize.Op.gte]: startDate
                }
            },
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalLogs'],
                [sequelize.fn('COUNT', sequelize.literal("CASE WHEN action IN ('add_member', 'remove_member', 'role_change', 'warning_issued', 'user_muted', 'user_unmuted') THEN 1 END")), 'moderationActions'],
                [sequelize.fn('COUNT', sequelize.literal("CASE WHEN action IN ('message', 'command', 'media_shared', 'link_shared') THEN 1 END")), 'userActions'],
                [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('user_id'))), 'uniqueUsers']
            ]
        });

        // Get logs by action
        const byAction = await model.findAll({
            where: {
                thread_id: thread.id,
                created_at: {
                    [sequelize.Sequelize.Op.gte]: startDate
                }
            },
            attributes: [
                'action',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['action'],
            order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
            limit: 10
        });

        // Get logs by category
        const byCategory = await sequelize.query(`
            SELECT 
                CASE 
                    WHEN action IN ('create_thread', 'update_settings', 'delete_thread', 'thread_name_change', 'thread_icon_change', 'thread_color_change') THEN 'thread_management'
                    WHEN action IN ('add_member', 'remove_member', 'role_change') THEN 'member_management'
                    WHEN action IN ('message', 'command', 'media_shared', 'link_shared') THEN 'user_activity'
                    WHEN action IN ('welcome_message', 'farewell_message', 'bot_added', 'bot_removed') THEN 'automation'
                    WHEN action IN ('warning_issued', 'user_muted', 'user_unmuted', 'anti_spam_triggered') THEN 'moderation'
                    WHEN action IN ('cleanup_performed', 'backup_created') THEN 'system'
                    ELSE 'other'
                END as category,
                COUNT(*) as count
            FROM thread_logs
            WHERE thread_id = ? AND created_at >= ?
            GROUP BY category
            ORDER BY count DESC
        `, {
            replacements: [thread.id, startDate],
            type: sequelize.QueryTypes.SELECT
        });

        // Get top active users
        const byUser = await sequelize.query(`
            SELECT 
                u.user_id,
                u.name,
                COUNT(tl.id) as action_count,
                COUNT(DISTINCT tl.action) as unique_actions
            FROM thread_logs tl
            INNER JOIN users u ON tl.user_id = u.id
            WHERE tl.thread_id = ? AND tl.created_at >= ?
            GROUP BY u.id
            ORDER BY action_count DESC
            LIMIT 10
        `, {
            replacements: [thread.id, startDate],
            type: sequelize.QueryTypes.SELECT
        });

        // Get timeline
        let timeline;
        if (period === 'day' || period === 'week') {
            timeline = await sequelize.query(`
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as logs,
                    COUNT(CASE WHEN action IN ('message', 'command', 'media_shared', 'link_shared') THEN 1 END) as user_actions,
                    COUNT(CASE WHEN action IN ('add_member', 'remove_member', 'role_change', 'warning_issued') THEN 1 END) as moderation_actions
                FROM thread_logs
                WHERE thread_id = ? AND created_at >= ?
                GROUP BY DATE(created_at)
                ORDER BY date DESC
                LIMIT 30
            `, {
                replacements: [thread.id, startDate],
                type: sequelize.QueryTypes.SELECT
            });
        }

        // Convert to object format
        const actionMap = {};
        byAction.forEach(item => {
            actionMap[item.action] = {
                count: item.get('count') || 0,
                percentage: summary[0]?.get('totalLogs') > 0 ? 
                    ((item.get('count') / summary[0]?.get('totalLogs')) * 100).toFixed(1) : 0
            };
        });

        const categoryMap = {};
        byCategory.forEach(item => {
            categoryMap[item.category] = {
                count: item.count || 0,
                percentage: summary[0]?.get('totalLogs') > 0 ? 
                    ((item.count / summary[0]?.get('totalLogs')) * 100).toFixed(1) : 0
            };
        });

        const userMap = {};
        byUser.forEach(item => {
            userMap[item.user_id] = {
                name: item.name,
                actionCount: parseInt(item.action_count),
                uniqueActions: parseInt(item.unique_actions),
                percentage: summary[0]?.get('totalLogs') > 0 ? 
                    ((item.action_count / summary[0]?.get('totalLogs')) * 100).toFixed(1) : 0
            };
        });

        return {
            period: period,
            startDate: startDate,
            endDate: new Date(),
            totalLogs: parseInt(summary[0]?.get('totalLogs') || 0),
            moderationActions: parseInt(summary[0]?.get('moderationActions') || 0),
            userActions: parseInt(summary[0]?.get('userActions') || 0),
            uniqueUsers: parseInt(summary[0]?.get('uniqueUsers') || 0),
            byAction: actionMap,
            byCategory: categoryMap,
            byUser: userMap,
            timeline: timeline || [],
            activityLevel: this.getActivityLevel(parseInt(summary[0]?.get('totalLogs') || 0), period)
        };
    };

    model.getActivityLevel = function(logCount, period) {
        const thresholds = {
            'day': { low: 10, medium: 50, high: 100 },
            'week': { low: 70, medium: 350, high: 700 },
            'month': { low: 300, medium: 1500, high: 3000 },
            'year': { low: 3650, medium: 18250, high: 36500 }
        };

        const threshold = thresholds[period] || thresholds.month;
        
        if (logCount >= threshold.high) return 'very_active';
        if (logCount >= threshold.medium) return 'active';
        if (logCount >= threshold.low) return 'normal';
        return 'inactive';
    };

    model.getModerationLogs = async function(threadId = null, limit = 100, offset = 0) {
        const where = {
            action: {
                [sequelize.Sequelize.Op.in]: ['add_member', 'remove_member', 'role_change', 'warning_issued', 'user_muted', 'user_unmuted']
            }
        };

        if (threadId) {
            const thread = await sequelize.models.Threads.findOne({
                where: { thread_id: threadId }
            });
            if (thread) {
                where.thread_id = thread.id;
            }
        }

        const { count, rows } = await model.findAndCountAll({
            where,
            include: [
                {
                    model: sequelize.models.Threads,
                    as: 'thread',
                    attributes: ['thread_id', 'name']
                },
                {
                    model: sequelize.models.Users,
                    as: 'user',
                    attributes: ['user_id', 'name']
                }
            ],
            order: [['created_at', 'DESC']],
            limit: Math.min(limit, 500),
            offset: offset,
            distinct: true
        });

        const logs = rows.map(log => {
            const details = log.getDetails();
            const actionDetails = details.details || {};
            
            return {
                id: log.id,
                action: details.action,
                details: actionDetails,
                timestamp: details.timestamp,
                createdAt: log.created_at,
                thread: log.thread ? {
                    threadId: log.thread.thread_id,
                    name: log.thread.name
                } : null,
                moderator: log.user ? {
                    userId: log.user.user_id,
                    name: log.user.name
                } : null,
                targetUser: actionDetails.userId || actionDetails.targetUserId || null,
                reason: actionDetails.reason || null,
                ipAddress: details.ipAddress
            };
        });

        return {
            logs,
            pagination: {
                total: count,
                pages: Math.ceil(count / limit),
                currentPage: Math.floor(offset / limit) + 1,
                hasNext: offset + limit < count,
                hasPrev: offset > 0
            }
        };
    };

    model.getSystemLogs = async function(limit = 100, offset = 0) {
        const { count, rows } = await model.findAndCountAll({
            where: {
                action: {
                    [sequelize.Sequelize.Op.in]: ['create_thread', 'delete_thread', 'cleanup_performed', 'backup_created']
                }
            },
            include: [
                {
                    model: sequelize.models.Threads,
                    as: 'thread',
                    attributes: ['thread_id', 'name']
                },
                {
                    model: sequelize.models.Users,
                    as: 'user',
                    attributes: ['user_id', 'name']
                }
            ],
            order: [['created_at', 'DESC']],
            limit: Math.min(limit, 500),
            offset: offset,
            distinct: true
        });

        const logs = rows.map(log => {
            const details = log.getDetails();
            return {
                id: log.id,
                action: details.action,
                details: details.details,
                timestamp: details.timestamp,
                createdAt: log.created_at,
                thread: log.thread ? {
                    threadId: log.thread.thread_id,
                    name: log.thread.name
                } : null,
                user: log.user ? {
                    userId: log.user.user_id,
                    name: log.user.name
                } : null,
                ipAddress: details.ipAddress
            };
        });

        return {
            logs,
            pagination: {
                total: count,
                pages: Math.ceil(count / limit),
                currentPage: Math.floor(offset / limit) + 1,
                hasNext: offset + limit < count,
                hasPrev: offset > 0
            }
        };
    };

    model.cleanupOldLogs = async function(daysToKeep = 180) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const result = await model.destroy({
            where: {
                created_at: {
                    [sequelize.Sequelize.Op.lt]: cutoffDate
                },
                action: {
                    [sequelize.Sequelize.Op.notIn]: ['create_thread', 'delete_thread', 'warning_issued'] // Keep important logs longer
                }
            }
        });

        logger.info(`[ThreadLogs] Cleaned up ${result} old thread logs`);

        return {
            success: true,
            deletedCount: result,
            cutoffDate: cutoffDate,
            daysKept: daysToKeep
        };
    };

    model.getSystemStats = async function(period = 'day') {
        // Calculate date range
        let startDate;
        const now = new Date();
        
        switch (period) {
            case 'hour':
                startDate = new Date(now.getTime() - 60 * 60 * 1000);
                break;
            case 'day':
                startDate = new Date(now.setHours(0, 0, 0, 0));
                break;
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            default:
                startDate = new Date(0);
        }

        const stats = await model.findAll({
            where: {
                created_at: {
                    [sequelize.Sequelize.Op.gte]: startDate
                }
            },
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalLogs'],
                [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('thread_id'))), 'uniqueThreads'],
                [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('user_id'))), 'uniqueUsers'],
                [sequelize.fn('COUNT', sequelize.literal("CASE WHEN action IN ('add_member', 'remove_member', 'role_change', 'warning_issued', 'user_muted', 'user_unmuted') THEN 1 END")), 'moderationActions'],
                [sequelize.fn('COUNT', sequelize.literal("CASE WHEN action IN ('message', 'command', 'media_shared', 'link_shared') THEN 1 END")), 'userActions']
            ]
        });

        // Get logs by action
        const byAction = await model.findAll({
            where: {
                created_at: {
                    [sequelize.Sequelize.Op.gte]: startDate
                }
            },
            attributes: [
                'action',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['action'],
            order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
            limit: 10
        });

        // Get hourly/daily distribution
        let distribution;
        if (period === 'day' || period === 'week') {
            distribution = await sequelize.query(`
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as logs,
                    COUNT(CASE WHEN action IN ('message', 'command', 'media_shared', 'link_shared') THEN 1 END) as user_actions,
                    COUNT(CASE WHEN action IN ('add_member', 'remove_member', 'role_change', 'warning_issued') THEN 1 END) as moderation_actions
                FROM thread_logs
                WHERE created_at >= ?
                GROUP BY DATE(created_at)
                ORDER BY date DESC
                LIMIT 30
            `, {
                replacements: [startDate],
                type: sequelize.QueryTypes.SELECT
            });
        } else if (period === 'hour') {
            distribution = await sequelize.query(`
                SELECT 
                    HOUR(created_at) as hour,
                    COUNT(*) as logs
                FROM thread_logs
                WHERE created_at >= ?
                GROUP BY HOUR(created_at)
                ORDER BY hour ASC
            `, {
                replacements: [startDate],
                type: sequelize.QueryTypes.SELECT
            });
        }

        return {
            period: period,
            startDate: startDate,
            endDate: new Date(),
            totalLogs: parseInt(stats[0]?.get('totalLogs') || 0),
            uniqueThreads: parseInt(stats[0]?.get('uniqueThreads') || 0),
            uniqueUsers: parseInt(stats[0]?.get('uniqueUsers') || 0),
            moderationActions: parseInt(stats[0]?.get('moderationActions') || 0),
            userActions: parseInt(stats[0]?.get('userActions') || 0),
            logsPerThread: parseInt(stats[0]?.get('uniqueThreads') || 0) > 0 ? 
                (parseInt(stats[0]?.get('totalLogs') || 0) / parseInt(stats[0]?.get('uniqueThreads') || 0)).toFixed(2) : 0,
            logsPerUser: parseInt(stats[0]?.get('uniqueUsers') || 0) > 0 ? 
                (parseInt(stats[0]?.get('totalLogs') || 0) / parseInt(stats[0]?.get('uniqueUsers') || 0)).toFixed(2) : 0,
            byAction: byAction.map(item => ({
                action: item.action,
                count: item.get('count') || 0,
                percentage: parseInt(stats[0]?.get('totalLogs') || 0) > 0 ? 
                    ((item.get('count') / parseInt(stats[0]?.get('totalLogs') || 0)) * 100).toFixed(1) : 0
            })),
            distribution: distribution || []
        };
    };

    // Hidden fields
    model.hidden = [...BaseModel.hidden, 'ip_address', 'user_agent'];

    return model;
};