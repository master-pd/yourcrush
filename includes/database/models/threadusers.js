const BaseModel = require('../model');
const logger = require('../../../utils/log');

module.exports = (sequelize, DataTypes) => {
    class ThreadUsers extends BaseModel {}
    
    const model = ThreadUsers.init(sequelize, DataTypes, {
        tableName: 'thread_users',
        timestamps: true,
        createdAt: 'join_date',
        updatedAt: 'updated_at',
        indexes: [
            {
                unique: true,
                fields: ['thread_id', 'user_id']
            },
            {
                fields: ['role']
            },
            {
                fields: ['join_date']
            },
            {
                fields: ['message_count']
            },
            {
                fields: ['last_message']
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
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
                comment: 'Reference to users table'
            },
            role: {
                type: DataTypes.ENUM('admin', 'moderator', 'member'),
                allowNull: false,
                defaultValue: 'member',
                validate: {
                    isIn: {
                        args: [['admin', 'moderator', 'member']],
                        msg: 'Role must be admin, moderator, or member'
                    }
                },
                comment: 'User role in thread'
            },
            message_count: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Message count cannot be negative'
                    }
                },
                comment: 'Messages sent by user in this thread'
            },
            last_message: {
                type: DataTypes.DATE,
                allowNull: true,
                comment: 'Last message timestamp'
            },
            join_date: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
                comment: 'Join date'
            },
            updated_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
                comment: 'Last update time'
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
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
    };

    // Custom validators
    model.customValidators = {
        thread_id_user_id: {
            isUnique: async function(value) {
                const existing = await model.findOne({
                    where: {
                        thread_id: this.thread_id,
                        user_id: this.user_id
                    }
                });
                if (existing && existing.id !== this.id) {
                    throw new Error('User is already a member of this thread');
                }
            }
        }
    };

    // Custom scopes
    model.customScopes = {
        admins: {
            where: { role: 'admin' }
        },
        moderators: {
            where: { role: 'moderator' }
        },
        members: {
            where: { role: 'member' }
        },
        active: {
            where: {
                last_message: {
                    [sequelize.Sequelize.Op.gte]: sequelize.literal('DATE_SUB(NOW(), INTERVAL 7 DAY)')
                }
            }
        },
        topPosters: (limit = 10) => ({
            order: [['message_count', 'DESC']],
            limit: limit
        }),
        recentJoiners: (limit = 10) => ({
            order: [['join_date', 'DESC']],
            limit: limit
        })
    };

    // Instance methods
    model.prototype.incrementMessageCount = async function(transaction = null) {
        const options = transaction ? { transaction } : {};

        await this.update({
            message_count: sequelize.literal('message_count + 1'),
            last_message: new Date(),
            updated_at: new Date()
        }, options);

        return { success: true };
    };

    model.prototype.updateRole = async function(newRole, adminId = null, transaction = null) {
        const allowedRoles = ['admin', 'moderator', 'member'];
        if (!allowedRoles.includes(newRole)) {
            throw new Error(`Invalid role. Allowed: ${allowedRoles.join(', ')}`);
        }

        if (this.role === newRole) {
            return { success: true, noChange: true };
        }

        const oldRole = this.role;
        const options = transaction ? { transaction } : {};

        await this.update({
            role: newRole,
            updated_at: new Date()
        }, options);

        // Log role change
        if (sequelize.models.ThreadLogs) {
            const adminUser = adminId ? 
                await sequelize.models.Users.findOne({ where: { user_id: adminId } }) : 
                null;

            await sequelize.models.ThreadLogs.create({
                thread_id: this.thread_id,
                action: 'role_change',
                user_id: adminUser?.id || null,
                details: JSON.stringify({
                    user_id: this.user_id,
                    old_role: oldRole,
                    new_role: newRole,
                    admin_id: adminId
                }),
                ip_address: null
            }, options);
        }

        logger.info(`[ThreadUsers] Updated role: ${this.user_id} from ${oldRole} to ${newRole} in thread ${this.thread_id}`);

        return {
            success: true,
            userId: this.user_id,
            threadId: this.thread_id,
            oldRole: oldRole,
            newRole: newRole,
            changedBy: adminId,
            timestamp: new Date()
        };
    };

    model.prototype.getStats = function() {
        const joinDate = new Date(this.join_date);
        const now = new Date();
        const daysInThread = Math.floor((now - joinDate) / (1000 * 60 * 60 * 24));

        let activityLevel = 'inactive';
        if (this.last_message) {
            const hoursSinceLastMessage = (now - new Date(this.last_message)) / (1000 * 60 * 60);
            
            if (hoursSinceLastMessage < 1) activityLevel = 'very_active';
            else if (hoursSinceLastMessage < 6) activityLevel = 'active';
            else if (hoursSinceLastMessage < 24) activityLevel = 'normal';
            else if (hoursSinceLastMessage < 72) activityLevel = 'low';
        }

        const messagesPerDay = daysInThread > 0 ? 
            (this.message_count / daysInThread).toFixed(2) : this.message_count;

        return {
            role: this.role,
            messageCount: this.message_count,
            lastMessage: this.last_message,
            joinDate: this.join_date,
            daysInThread: daysInThread,
            messagesPerDay: parseFloat(messagesPerDay),
            activityLevel: activityLevel,
            isActive: activityLevel !== 'inactive'
        };
    };

    model.prototype.isAdmin = function() {
        return this.role === 'admin';
    };

    model.prototype.isModerator = function() {
        return this.role === 'moderator' || this.role === 'admin';
    };

    model.prototype.isRegularMember = function() {
        return this.role === 'member';
    };

    model.prototype.hasPermission = function(permission) {
        const permissions = {
            admin: ['all'],
            moderator: ['manage_members', 'manage_messages', 'warn_users'],
            member: ['send_messages', 'use_commands']
        };

        const rolePermissions = permissions[this.role] || [];
        
        return rolePermissions.includes('all') || rolePermissions.includes(permission);
    };

    // Class methods
    model.getThreadAdmins = async function(threadId) {
        return await model.findAll({
            where: {
                thread_id: threadId,
                role: 'admin'
            },
            include: [{
                model: sequelize.models.Users,
                as: 'user',
                attributes: ['user_id', 'name', 'level', 'last_seen']
            }],
            order: [['join_date', 'ASC']]
        });
    };

    model.getThreadModerators = async function(threadId) {
        return await model.findAll({
            where: {
                thread_id: threadId,
                role: ['admin', 'moderator']
            },
            include: [{
                model: sequelize.models.Users,
                as: 'user',
                attributes: ['user_id', 'name', 'level', 'last_seen']
            }],
            order: [['join_date', 'ASC']]
        });
    };

    model.getTopPosters = async function(threadId, limit = 10) {
        return await model.findAll({
            where: { thread_id: threadId },
            order: [['message_count', 'DESC']],
            limit: Math.min(limit, 50),
            include: [{
                model: sequelize.models.Users,
                as: 'user',
                attributes: ['user_id', 'name', 'level']
            }],
            attributes: ['message_count', 'last_message', 'join_date', 'role']
        });
    };

    model.getUserThreads = async function(userId) {
        const user = await sequelize.models.Users.findOne({
            where: { user_id: userId }
        });

        if (!user) {
            return [];
        }

        return await model.findAll({
            where: { user_id: user.id },
            include: [{
                model: sequelize.models.Threads,
                as: 'thread',
                attributes: ['thread_id', 'name', 'message_count', 'last_activity']
            }],
            order: [['last_message', 'DESC']],
            attributes: ['role', 'message_count', 'last_message', 'join_date']
        });
    };

    model.getThreadMemberCount = async function(threadId) {
        return await model.count({
            where: { thread_id: threadId }
        });
    };

    model.getActiveMembers = async function(threadId, hours = 24) {
        const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);

        return await model.findAll({
            where: {
                thread_id: threadId,
                last_message: {
                    [sequelize.Sequelize.Op.gte]: cutoffDate
                }
            },
            include: [{
                model: sequelize.models.Users,
                as: 'user',
                attributes: ['user_id', 'name', 'level']
            }],
            order: [['last_message', 'DESC']]
        });
    };

    model.getMemberActivityStats = async function(threadId) {
        const stats = await model.findAll({
            where: { thread_id: threadId },
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalMembers'],
                [sequelize.fn('SUM', sequelize.col('message_count')), 'totalMessages'],
                [sequelize.fn('AVG', sequelize.col('message_count')), 'avgMessages'],
                [sequelize.fn('MAX', sequelize.col('message_count')), 'maxMessages'],
                [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('role'))), 'roles']
            ]
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const activeToday = await model.count({
            where: {
                thread_id: threadId,
                last_message: {
                    [sequelize.Sequelize.Op.gte]: today
                }
            }
        });

        return {
            totalMembers: stats[0]?.get('totalMembers') || 0,
            totalMessages: stats[0]?.get('totalMessages') || 0,
            averageMessages: Math.round(stats[0]?.get('avgMessages') || 0),
            maxMessages: stats[0]?.get('maxMessages') || 0,
            roles: stats[0]?.get('roles') || 0,
            activeToday: activeToday,
            activityRate: stats[0]?.get('totalMembers') > 0 ? 
                ((activeToday / stats[0]?.get('totalMembers')) * 100).toFixed(1) + '%' : '0%'
        };
    };

    model.removeInactiveMembers = async function(threadId, daysInactive = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

        const result = await model.destroy({
            where: {
                thread_id: threadId,
                last_message: {
                    [sequelize.Sequelize.Op.lt]: cutoffDate
                },
                role: 'member' // Don't remove admins/moderators
            }
        });

        logger.info(`[ThreadUsers] Removed ${result} inactive members from thread ${threadId}`);

        return {
            success: true,
            removedCount: result,
            cutoffDate: cutoffDate
        };
    };

    // Hidden fields
    model.hidden = [...BaseModel.hidden];

    return model;
};