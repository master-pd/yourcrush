const BaseModel = require('../model');
const logger = require('../../../utils/log');

module.exports = (sequelize, DataTypes) => {
    class UserLogs extends BaseModel {}
    
    const model = UserLogs.init(sequelize, DataTypes, {
        tableName: 'user_logs',
        indexes: [
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
            user_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
                comment: 'Reference to users table'
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
        model.belongsTo(models.Users, {
            foreignKey: 'user_id',
            as: 'user',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
    };

    // Custom validators
    model.customValidators = {
        action: {
            isValidAction(value) {
                const allowedActions = [
                    'create', 'update', 'delete', 'login', 'logout',
                    'ban', 'unban', 'warning', 'clear_warnings',
                    'level_up', 'exp_gain', 'currency_change',
                    'settings_change', 'profile_update', 'password_change',
                    'api_key_generated', 'api_key_revoked'
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
        securityRelated: {
            where: {
                action: {
                    [sequelize.Sequelize.Op.in]: ['login', 'logout', 'ban', 'unban', 'warning', 'api_key_generated', 'api_key_revoked']
                }
            }
        },
        withIP: {
            where: {
                ip_address: {
                    [sequelize.Sequelize.Op.ne]: null
                }
            }
        },
        userLogs: (userId) => ({
            where: { user_id: userId }
        })
    };

    // Instance methods
    model.prototype.getDetails = function() {
        return {
            id: this.id,
            userId: this.user_id,
            action: this.action,
            details: this.details || {},
            ipAddress: this.ip_address,
            userAgent: this.user_agent ? this.user_agent.substring(0, 200) : null,
            createdAt: this.created_at,
            timestamp: this.created_at.getTime()
        };
    };

    model.prototype.isSecurityRelated = function() {
        const securityActions = ['login', 'logout', 'ban', 'unban', 'warning', 'api_key_generated', 'api_key_revoked'];
        return securityActions.includes(this.action);
    };

    model.prototype.getActionCategory = function() {
        const categories = {
            // User management
            'create': 'user_management',
            'update': 'user_management',
            'delete': 'user_management',
            
            // Authentication
            'login': 'authentication',
            'logout': 'authentication',
            
            // Moderation
            'ban': 'moderation',
            'unban': 'moderation',
            'warning': 'moderation',
            'clear_warnings': 'moderation',
            
            // Progression
            'level_up': 'progression',
            'exp_gain': 'progression',
            
            // Economy
            'currency_change': 'economy',
            
            // Settings
            'settings_change': 'settings',
            'profile_update': 'settings',
            'password_change': 'settings',
            
            // API
            'api_key_generated': 'api',
            'api_key_revoked': 'api'
        };
        
        return categories[this.action] || 'other';
    };

    // Class methods
    model.createLog = async function(userId, action, details = {}, ipAddress = null, userAgent = null, transaction = null) {
        const user = await sequelize.models.Users.findOne({
            where: { user_id: userId }
        });

        if (!user) {
            throw new Error('User not found');
        }

        const options = transaction ? { transaction } : {};

        const log = await model.create({
            user_id: user.id,
            action: action,
            details: details,
            ip_address: ipAddress,
            user_agent: userAgent
        }, options);

        // Log to console for security-related actions
        if (log.isSecurityRelated()) {
            logger.info(`[UserLogs] Security action: ${action} for user ${userId}`, {
                userId: userId,
                action: action,
                ipAddress: ipAddress,
                details: details
            });
        } else {
            logger.debug(`[UserLogs] Created log: ${action} for user ${userId}`);
        }

        return log;
    };

    model.getUserLogs = async function(userId, limit = 50, offset = 0, filters = {}) {
        const user = await sequelize.models.Users.findOne({
            where: { user_id: userId }
        });

        if (!user) {
            return { logs: [], pagination: { total: 0, pages: 0 } };
        }

        const where = { user_id: user.id };
        
        if (filters.action) {
            where.action = filters.action;
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
            include: [{
                model: sequelize.models.Users,
                as: 'user',
                attributes: ['user_id', 'name']
            }],
            order: [['created_at', 'DESC']],
            limit: Math.min(limit, 100),
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
                user: log.user ? {
                    userId: log.user.user_id,
                    name: log.user.name
                } : null,
                isSecurityRelated: log.isSecurityRelated()
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

    model.getUserActivitySummary = async function(userId, period = 'month') {
        const user = await sequelize.models.Users.findOne({
            where: { user_id: userId }
        });

        if (!user) {
            return {
                totalLogs: 0,
                byAction: {},
                byCategory: {},
                timeline: [],
                securityLogs: 0
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
                user_id: user.id,
                created_at: {
                    [sequelize.Sequelize.Op.gte]: startDate
                }
            },
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalLogs'],
                [sequelize.fn('COUNT', sequelize.literal("CASE WHEN action IN ('login', 'logout', 'ban', 'unban', 'warning', 'api_key_generated', 'api_key_revoked') THEN 1 END")), 'securityLogs']
            ]
        });

        // Get logs by action
        const byAction = await model.findAll({
            where: {
                user_id: user.id,
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
                    WHEN action IN ('create', 'update', 'delete') THEN 'user_management'
                    WHEN action IN ('login', 'logout') THEN 'authentication'
                    WHEN action IN ('ban', 'unban', 'warning', 'clear_warnings') THEN 'moderation'
                    WHEN action IN ('level_up', 'exp_gain') THEN 'progression'
                    WHEN action IN ('currency_change') THEN 'economy'
                    WHEN action IN ('settings_change', 'profile_update', 'password_change') THEN 'settings'
                    WHEN action IN ('api_key_generated', 'api_key_revoked') THEN 'api'
                    ELSE 'other'
                END as category,
                COUNT(*) as count
            FROM user_logs
            WHERE user_id = ? AND created_at >= ?
            GROUP BY category
            ORDER BY count DESC
        `, {
            replacements: [user.id, startDate],
            type: sequelize.QueryTypes.SELECT
        });

        // Get timeline
        let timeline;
        if (period === 'day' || period === 'week') {
            timeline = await sequelize.query(`
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as logs,
                    COUNT(CASE WHEN action IN ('login', 'logout', 'ban', 'unban', 'warning', 'api_key_generated', 'api_key_revoked') THEN 1 END) as security_logs
                FROM user_logs
                WHERE user_id = ? AND created_at >= ?
                GROUP BY DATE(created_at)
                ORDER BY date DESC
                LIMIT 30
            `, {
                replacements: [user.id, startDate],
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

        return {
            period: period,
            startDate: startDate,
            endDate: new Date(),
            totalLogs: parseInt(summary[0]?.get('totalLogs') || 0),
            securityLogs: parseInt(summary[0]?.get('securityLogs') || 0),
            securityPercentage: summary[0]?.get('totalLogs') > 0 ? 
                ((summary[0]?.get('securityLogs') / summary[0]?.get('totalLogs')) * 100).toFixed(1) : 0,
            byAction: actionMap,
            byCategory: categoryMap,
            timeline: timeline || [],
            activityLevel: this.getActivityLevel(parseInt(summary[0]?.get('totalLogs') || 0), period)
        };
    };

    model.getActivityLevel = function(logCount, period) {
        const thresholds = {
            'day': { low: 1, medium: 5, high: 10 },
            'week': { low: 7, medium: 35, high: 70 },
            'month': { low: 30, medium: 150, high: 300 },
            'year': { low: 365, medium: 1825, high: 3650 }
        };

        const threshold = thresholds[period] || thresholds.month;
        
        if (logCount >= threshold.high) return 'very_active';
        if (logCount >= threshold.medium) return 'active';
        if (logCount >= threshold.low) return 'normal';
        return 'inactive';
    };

    model.getSecurityLogs = async function(limit = 100, offset = 0) {
        const { count, rows } = await model.findAndCountAll({
            where: {
                action: {
                    [sequelize.Sequelize.Op.in]: ['login', 'logout', 'ban', 'unban', 'warning', 'api_key_generated', 'api_key_revoked']
                }
            },
            include: [{
                model: sequelize.models.Users,
                as: 'user',
                attributes: ['user_id', 'name', 'is_banned']
            }],
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
                ipAddress: details.ipAddress,
                userAgent: details.userAgent,
                timestamp: details.timestamp,
                createdAt: log.created_at,
                user: log.user ? {
                    userId: log.user.user_id,
                    name: log.user.name,
                    isBanned: log.user.is_banned
                } : null
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

    model.getSuspiciousActivity = async function(hours = 24, threshold = 10) {
        const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

        const suspiciousIPs = await sequelize.query(`
            SELECT 
                ip_address,
                COUNT(DISTINCT user_id) as unique_users,
                COUNT(*) as total_logs,
                GROUP_CONCAT(DISTINCT action) as actions
            FROM user_logs
            WHERE ip_address IS NOT NULL 
                AND created_at >= ?
                AND action IN ('login', 'api_key_generated')
            GROUP BY ip_address
            HAVING COUNT(DISTINCT user_id) > ?
            ORDER BY total_logs DESC
            LIMIT 50
        `, {
            replacements: [startDate, threshold],
            type: sequelize.QueryTypes.SELECT
        });

        const suspiciousUsers = await sequelize.query(`
            SELECT 
                u.user_id,
                u.name,
                COUNT(ul.id) as login_attempts,
                COUNT(DISTINCT ul.ip_address) as unique_ips,
                MIN(ul.created_at) as first_attempt,
                MAX(ul.created_at) as last_attempt
            FROM user_logs ul
            INNER JOIN users u ON ul.user_id = u.id
            WHERE ul.action = 'login' 
                AND ul.created_at >= ?
            GROUP BY u.id
            HAVING COUNT(ul.id) > ? OR COUNT(DISTINCT ul.ip_address) > 3
            ORDER BY login_attempts DESC
            LIMIT 50
        `, {
            replacements: [startDate, threshold * 2],
            type: sequelize.QueryTypes.SELECT
        });

        return {
            period: `${hours} hours`,
            threshold: threshold,
            suspiciousIPs: suspiciousIPs.map(ip => ({
                ipAddress: ip.ip_address,
                uniqueUsers: parseInt(ip.unique_users),
                totalLogs: parseInt(ip.total_logs),
                actions: ip.actions ? ip.actions.split(',') : []
            })),
            suspiciousUsers: suspiciousUsers.map(user => ({
                userId: user.user_id,
                name: user.name,
                loginAttempts: parseInt(user.login_attempts),
                uniqueIPs: parseInt(user.unique_ips),
                firstAttempt: user.first_attempt,
                lastAttempt: user.last_attempt,
                timeSpan: user.last_attempt ? 
                    Math.round((new Date(user.last_attempt) - new Date(user.first_attempt)) / (1000 * 60 * 60)) : 0
            }))
        };
    };

    model.cleanupOldLogs = async function(daysToKeep = 365) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const result = await model.destroy({
            where: {
                created_at: {
                    [sequelize.Sequelize.Op.lt]: cutoffDate
                },
                action: {
                    [sequelize.Sequelize.Op.notIn]: ['ban', 'unban', 'warning'] // Keep important moderation logs longer
                }
            }
        });

        logger.info(`[UserLogs] Cleaned up ${result} old user logs`);

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
                [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('user_id'))), 'uniqueUsers'],
                [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('ip_address'))), 'uniqueIPs'],
                [sequelize.fn('COUNT', sequelize.literal("CASE WHEN action IN ('login', 'logout', 'ban', 'unban', 'warning', 'api_key_generated', 'api_key_revoked') THEN 1 END")), 'securityLogs']
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
                    COUNT(CASE WHEN action IN ('login', 'logout', 'ban', 'unban', 'warning', 'api_key_generated', 'api_key_revoked') THEN 1 END) as security_logs
                FROM user_logs
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
                FROM user_logs
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
            uniqueUsers: parseInt(stats[0]?.get('uniqueUsers') || 0),
            uniqueIPs: parseInt(stats[0]?.get('uniqueIPs') || 0),
            securityLogs: parseInt(stats[0]?.get('securityLogs') || 0),
            securityPercentage: parseInt(stats[0]?.get('totalLogs') || 0) > 0 ? 
                ((parseInt(stats[0]?.get('securityLogs') || 0) / parseInt(stats[0]?.get('totalLogs') || 0)) * 100).toFixed(1) : 0,
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