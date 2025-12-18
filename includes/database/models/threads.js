const BaseModel = require('../model');
const logger = require('../../../utils/log');

module.exports = (sequelize, DataTypes) => {
    class Threads extends BaseModel {}
    
    const model = Threads.init(sequelize, DataTypes, {
        tableName: 'threads',
        indexes: [
            {
                unique: true,
                fields: ['thread_id']
            },
            {
                fields: ['name']
            },
            {
                fields: ['is_active']
            },
            {
                fields: ['last_activity']
            },
            {
                fields: ['created_at']
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
                type: DataTypes.STRING(50),
                allowNull: false,
                unique: true,
                validate: {
                    len: {
                        args: [5, 50],
                        msg: 'Thread ID must be between 5 and 50 characters'
                    }
                },
                comment: 'Facebook Thread ID'
            },
            name: {
                type: DataTypes.STRING(255),
                allowNull: false,
                defaultValue: 'Unknown Group',
                validate: {
                    len: {
                        args: [1, 255],
                        msg: 'Thread name must be between 1 and 255 characters'
                    }
                },
                comment: 'Thread/Group name'
            },
            prefix: {
                type: DataTypes.STRING(5),
                allowNull: false,
                defaultValue: '!',
                validate: {
                    len: {
                        args: [1, 5],
                        msg: 'Prefix must be between 1 and 5 characters'
                    }
                },
                comment: 'Command prefix for this thread'
            },
            admin_only: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: 'Whether only admins can use commands'
            },
            anti_spam: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
                comment: 'Whether anti-spam is enabled'
            },
            welcome_enabled: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
                comment: 'Whether welcome messages are enabled'
            },
            farewell_enabled: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
                comment: 'Whether farewell messages are enabled'
            },
            auto_approve: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: 'Whether to auto-approve new members'
            },
            language: {
                type: DataTypes.STRING(10),
                allowNull: false,
                defaultValue: 'en',
                validate: {
                    isIn: {
                        args: [['en', 'bn', 'vi']],
                        msg: 'Language must be en, bn, or vi'
                    }
                },
                comment: 'Thread language preference'
            },
            is_active: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
                comment: 'Whether thread is active'
            },
            message_count: {
                type: DataTypes.BIGINT,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Message count cannot be negative'
                    }
                },
                comment: 'Total messages in thread'
            },
            last_activity: {
                type: DataTypes.DATE,
                allowNull: true,
                comment: 'Last activity timestamp'
            },
            settings: {
                type: DataTypes.TEXT,
                allowNull: true,
                defaultValue: '{}',
                get() {
                    const rawValue = this.getDataValue('settings');
                    try {
                        return rawValue ? JSON.parse(rawValue) : {};
                    } catch {
                        return {};
                    }
                },
                set(value) {
                    this.setDataValue('settings', JSON.stringify(value));
                },
                comment: 'Thread settings in JSON format'
            },
            welcome_message: {
                type: DataTypes.TEXT,
                allowNull: true,
                comment: 'Custom welcome message'
            },
            farewell_message: {
                type: DataTypes.TEXT,
                allowNull: true,
                comment: 'Custom farewell message'
            },
            rules: {
                type: DataTypes.TEXT,
                allowNull: true,
                comment: 'Thread rules'
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
                comment: 'Thread creation time'
            },
            updated_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
                comment: 'Thread last update time'
            }
        };
    };

    model.associate = function(models) {
        model.belongsToMany(models.Users, {
            through: models.ThreadUsers,
            foreignKey: 'thread_id',
            otherKey: 'user_id',
            as: 'members',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
        
        model.hasMany(models.ThreadLogs, {
            foreignKey: 'thread_id',
            as: 'threadLogs',
            onDelete: 'CASCADE'
        });
    };

    // Custom validators
    model.customValidators = {
        thread_id: {
            isUnique: async function(value) {
                const thread = await model.findOne({ where: { thread_id: value } });
                if (thread && thread.id !== this.id) {
                    throw new Error('Thread ID already exists');
                }
            }
        },
        prefix: {
            isValidPrefix(value) {
                if (value.includes(' ')) {
                    throw new Error('Prefix cannot contain spaces');
                }
                if (!/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/.test(value)) {
                    throw new Error('Prefix contains invalid characters');
                }
            }
        }
    };

    // Custom scopes
    model.customScopes = {
        active: {
            where: { is_active: true }
        },
        inactive: {
            where: { is_active: false }
        },
        recentActivity: {
            where: {
                last_activity: {
                    [sequelize.Sequelize.Op.gte]: sequelize.literal('DATE_SUB(NOW(), INTERVAL 24 HOUR)')
                }
            }
        },
        highActivity: {
            where: {
                message_count: {
                    [sequelize.Sequelize.Op.gt]: 1000
                }
            }
        },
        adminOnly: {
            where: { admin_only: true }
        },
        language: (lang) => ({
            where: { language: lang }
        })
    };

    // Instance methods
    model.prototype.incrementMessageCount = async function(userId = null, transaction = null) {
        const options = transaction ? { transaction } : {};

        await this.update({
            message_count: sequelize.literal('message_count + 1'),
            last_activity: new Date()
        }, options);

        // Also update user's message count in this thread
        if (userId && sequelize.models.ThreadUsers) {
            try {
                const user = await sequelize.models.Users.findOne({
                    where: { user_id: userId }
                });

                if (user) {
                    const threadUser = await sequelize.models.ThreadUsers.findOne({
                        where: {
                            thread_id: this.id,
                            user_id: user.id
                        },
                        ...options
                    });

                    if (threadUser) {
                        await threadUser.update({
                            message_count: sequelize.literal('message_count + 1'),
                            last_message: new Date()
                        }, options);
                    }
                }
            } catch (error) {
                logger.error(`[Threads] Failed to update user message count: ${error.message}`);
                // Don't throw error for message counting failures
            }
        }

        return { success: true };
    };

    model.prototype.updateSettings = async function(newSettings, transaction = null) {
        const currentSettings = this.settings || {};
        const mergedSettings = { ...currentSettings, ...newSettings };

        const options = transaction ? { transaction } : {};

        await this.update({
            settings: mergedSettings
        }, options);

        logger.debug(`[Threads] Updated settings for thread ${this.thread_id}`);

        return {
            success: true,
            settings: mergedSettings
        };
    };

    model.prototype.getSetting = function(key, defaultValue = null) {
        return this.settings[key] !== undefined ? this.settings[key] : defaultValue;
    };

    model.prototype.isCommandAllowed = function(commandName, userRole) {
        if (this.admin_only && userRole !== 'admin') {
            return false;
        }

        const blockedCommands = this.getSetting('blocked_commands', []);
        if (blockedCommands.includes(commandName)) {
            return false;
        }

        // Check time restrictions
        const timeRestrictions = this.getSetting('time_restrictions', {});
        if (timeRestrictions[commandName]) {
            const restriction = timeRestrictions[commandName];
            const now = new Date();
            const hour = now.getHours();
            
            if (restriction.start && restriction.end) {
                if (hour < restriction.start || hour > restriction.end) {
                    return false;
                }
            }
        }

        return true;
    };

    model.prototype.addMember = async function(userId, role = 'member', adminId = null, transaction = null) {
        const user = await sequelize.models.Users.findOne({
            where: { user_id: userId }
        });

        if (!user) {
            throw new Error('User not found');
        }

        const options = transaction ? { transaction } : {};

        // Check if already a member
        const existingMember = await sequelize.models.ThreadUsers.findOne({
            where: {
                thread_id: this.id,
                user_id: user.id
            },
            ...options
        });

        if (existingMember) {
            // Update role if different
            if (existingMember.role !== role) {
                await existingMember.update({ role: role }, options);
                
                logger.info(`[Threads] Updated member role: ${userId} -> ${role} in ${this.thread_id}`);
            }
            
            return { success: true, existed: true, role };
        }

        // Add as new member
        await sequelize.models.ThreadUsers.create({
            thread_id: this.id,
            user_id: user.id,
            role: role,
            join_date: new Date(),
            message_count: 0
        }, options);

        // Log the action
        if (sequelize.models.ThreadLogs) {
            await sequelize.models.ThreadLogs.create({
                thread_id: this.id,
                action: 'add_member',
                user_id: adminId ? (await sequelize.models.Users.findOne({ where: { user_id: adminId } }))?.id : user.id,
                details: JSON.stringify({
                    added_user_id: userId,
                    role: role,
                    admin_id: adminId
                }),
                ip_address: null
            }, options);
        }

        logger.info(`[Threads] Added member to thread: ${userId} as ${role} in ${this.thread_id}`);

        return { 
            success: true, 
            threadId: this.thread_id, 
            userId: userId, 
            role,
            joinDate: new Date()
        };
    };

    model.prototype.removeMember = async function(userId, adminId = null, reason = '', transaction = null) {
        const user = await sequelize.models.Users.findOne({
            where: { user_id: userId }
        });

        if (!user) {
            throw new Error('User not found');
        }

        const options = transaction ? { transaction } : {};

        // Remove from thread
        await sequelize.models.ThreadUsers.destroy({
            where: {
                thread_id: this.id,
                user_id: user.id
            },
            ...options
        });

        // Log the action
        if (sequelize.models.ThreadLogs) {
            await sequelize.models.ThreadLogs.create({
                thread_id: this.id,
                action: 'remove_member',
                user_id: adminId ? (await sequelize.models.Users.findOne({ where: { user_id: adminId } }))?.id : null,
                details: JSON.stringify({
                    removed_user_id: userId,
                    reason: reason,
                    admin_id: adminId
                }),
                ip_address: null
            }, options);
        }

        logger.info(`[Threads] Removed member from thread: ${userId} from ${this.thread_id}`, {
            thread_id: this.thread_id,
            user_id: userId,
            reason: reason,
            admin_id: adminId
        });

        return { 
            success: true, 
            threadId: this.thread_id, 
            userId: userId,
            reason,
            removedBy: adminId
        };
    };

    model.prototype.getMembers = async function(filters = {}) {
        const members = await sequelize.models.ThreadUsers.findAll({
            where: {
                thread_id: this.id,
                ...filters
            },
            include: [{
                model: sequelize.models.Users,
                as: 'user',
                attributes: ['user_id', 'name', 'level', 'last_seen']
            }],
            order: [['join_date', 'ASC']]
        });

        return members.map(member => ({
            userId: member.user.user_id,
            name: member.user.name,
            level: member.user.level,
            role: member.role,
            joinDate: member.join_date,
            messageCount: member.message_count,
            lastMessage: member.last_message,
            lastSeen: member.user.last_seen,
            isOnline: member.user.last_seen ? 
                (Date.now() - new Date(member.user.last_seen).getTime() < 300000) : false
        }));
    };

    model.prototype.getStats = async function() {
        const members = await this.getMembers();
        
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
        const messageStats = await sequelize.models.ThreadUsers.findAll({
            where: { thread_id: this.id },
            attributes: [
                [sequelize.fn('SUM', sequelize.col('message_count')), 'totalMessages'],
                [sequelize.fn('MAX', sequelize.col('message_count')), 'maxMessages'],
                [sequelize.fn('AVG', sequelize.col('message_count')), 'avgMessages']
            ]
        });

        // Get daily activity
        let dailyActivity = [];
        if (sequelize.models.ThreadLogs) {
            dailyActivity = await sequelize.query(`
                SELECT DATE(created_at) as date, COUNT(*) as messageCount
                FROM thread_logs 
                WHERE thread_id = ? AND action = 'message'
                GROUP BY DATE(created_at)
                ORDER BY date DESC
                LIMIT 7
            `, {
                replacements: [this.id],
                type: sequelize.QueryTypes.SELECT
            });
        }

        return {
            threadId: this.thread_id,
            name: this.name,
            totalMembers: members.length,
            adminCount,
            moderatorCount,
            memberCount,
            onlineCount,
            activeToday,
            messageCount: this.message_count,
            messageStats: {
                total: messageStats[0]?.get('totalMessages') || 0,
                maxPerUser: messageStats[0]?.get('maxMessages') || 0,
                averagePerUser: Math.round(messageStats[0]?.get('avgMessages') || 0)
            },
            settings: this.settings,
            prefix: this.prefix,
            language: this.language,
            adminOnly: this.admin_only,
            antiSpam: this.anti_spam,
            welcomeEnabled: this.welcome_enabled,
            farewellEnabled: this.farewell_enabled,
            isActive: this.is_active,
            createdAt: this.created_at,
            lastActivity: this.last_activity,
            dailyActivity: dailyActivity,
            activityRate: members.length > 0 ? 
                (activeToday / members.length * 100).toFixed(1) + '%' : '0%',
            activityLevel: this.getActivityLevel()
        };
    };

    model.prototype.getActivityLevel = function() {
        if (!this.last_activity) return 'inactive';
        
        const hoursDiff = (new Date() - new Date(this.last_activity)) / (1000 * 60 * 60);
        
        if (hoursDiff < 1) return 'very_active';
        if (hoursDiff < 6) return 'active';
        if (hoursDiff < 24) return 'normal';
        if (hoursDiff < 72) return 'low';
        return 'inactive';
    };

    model.prototype.exportData = async function() {
        const members = await this.getMembers();
        const logs = sequelize.models.ThreadLogs ? 
            await sequelize.models.ThreadLogs.findAll({
                where: { thread_id: this.id },
                order: [['created_at', 'DESC']],
                limit: 1000,
                include: [{
                    model: sequelize.models.Users,
                    as: 'user',
                    attributes: ['user_id', 'name']
                }]
            }) : [];

        return {
            metadata: {
                exportedAt: new Date().toISOString(),
                threadId: this.thread_id,
                name: this.name
            },
            thread: {
                threadId: this.thread_id,
                name: this.name,
                settings: this.settings,
                prefix: this.prefix,
                language: this.language,
                adminOnly: this.admin_only,
                antiSpam: this.anti_spam,
                welcomeEnabled: this.welcome_enabled,
                farewellEnabled: this.farewell_enabled,
                messageCount: this.message_count,
                createdAt: this.created_at,
                lastActivity: this.last_activity,
                isActive: this.is_active
            },
            members: members.map(member => ({
                userId: member.userId,
                name: member.name,
                level: member.level,
                role: member.role,
                joinDate: member.joinDate,
                messageCount: member.messageCount,
                lastMessage: member.lastMessage,
                lastSeen: member.lastSeen
            })),
            logs: logs.map(log => ({
                action: log.action,
                user: log.user ? {
                    userId: log.user.user_id,
                    name: log.user.name
                } : null,
                details: log.details,
                timestamp: log.created_at,
                ipAddress: log.ip_address
            })),
            statistics: await this.getStats()
        };
    };

    // Class methods
    model.findByThreadId = async function(threadId, includeMembers = false) {
        const options = {
            where: { thread_id: threadId }
        };

        if (includeMembers) {
            options.include = [{
                model: sequelize.models.Users,
                as: 'members',
                through: { attributes: ['role', 'join_date', 'message_count'] },
                attributes: ['user_id', 'name', 'level']
            }];
        }

        return await model.findOne(options);
    };

    model.getActiveThreads = async function(limit = 100) {
        return await model.findAll({
            where: { is_active: true },
            order: [['last_activity', 'DESC']],
            limit: Math.min(limit, 500),
            attributes: ['thread_id', 'name', 'message_count', 'last_activity', 'member_count']
        });
    };

    model.getTopThreads = async function(by = 'activity', limit = 10) {
        let orderField;
        switch (by) {
            case 'members':
                orderField = 'member_count';
                break;
            case 'messages':
                orderField = 'message_count';
                break;
            case 'recent':
                orderField = 'created_at';
                break;
            default:
                orderField = 'last_activity';
        }

        return await model.findAll({
            where: { is_active: true },
            order: [[orderField, 'DESC']],
            limit: Math.min(limit, 50),
            attributes: ['thread_id', 'name', 'message_count', 'member_count', 'last_activity', 'created_at']
        });
    };

    model.searchThreads = async function(query, limit = 20) {
        return await model.findAll({
            where: {
                [sequelize.Sequelize.Op.or]: [
                    { thread_id: { [sequelize.Sequelize.Op.like]: `%${query}%` } },
                    { name: { [sequelize.Sequelize.Op.like]: `%${query}%` } }
                ],
                is_active: true
            },
            limit: Math.min(limit, 50),
            order: [['last_activity', 'DESC']],
            attributes: ['thread_id', 'name', 'message_count', 'last_activity', 'member_count', 'language']
        });
    };

    model.cleanupInactiveThreads = async function(daysInactive = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

        const result = await model.update(
            { is_active: false },
            {
                where: {
                    is_active: true,
                    last_activity: { [sequelize.Sequelize.Op.lt]: cutoffDate }
                }
            }
        );

        logger.info(`[Threads] Cleaned up ${result[0]} inactive threads`);

        return {
            success: true,
            deactivated: result[0],
            cutoffDate: cutoffDate
        };
    };

    model.getSystemStats = async function() {
        const stats = await model.findAll({
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalThreads'],
                [sequelize.fn('SUM', sequelize.col('message_count')), 'totalMessages'],
                [sequelize.fn('AVG', sequelize.col('message_count')), 'avgMessages'],
                [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('language'))), 'languages'],
                [sequelize.fn('COUNT', sequelize.col('is_active')), 'activeThreads']
            ]
        });

        const recentThreads = await model.count({
            where: {
                created_at: {
                    [sequelize.Sequelize.Op.gte]: new Date(new Date() - 24 * 60 * 60 * 1000)
                }
            }
        });

        const activeToday = await model.count({
            where: {
                last_activity: {
                    [sequelize.Sequelize.Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
                }
            }
        });

        return {
            timestamp: new Date(),
            totalThreads: stats[0].get('totalThreads') || 0,
            activeThreads: stats[0].get('activeThreads') || 0,
            totalMessages: stats[0].get('totalMessages') || 0,
            averageMessages: Math.round(stats[0].get('avgMessages') || 0),
            languages: stats[0].get('languages') || 0,
            recentThreads24h: recentThreads,
            activeThreadsToday: activeToday,
            activityRate: stats[0].get('totalThreads') > 0 ? 
                ((activeToday / stats[0].get('totalThreads')) * 100).toFixed(1) + '%' : '0%'
        };
    };

    // Hidden fields
    model.hidden = [...BaseModel.hidden];

    return model;
};