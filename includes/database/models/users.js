const BaseModel = require('../model');
const logger = require('../../../utils/log');
const crypto = require('crypto');

module.exports = (sequelize, DataTypes) => {
    class Users extends BaseModel {}
    
    const model = Users.init(sequelize, DataTypes, {
        tableName: 'users',
        indexes: [
            {
                unique: true,
                fields: ['user_id']
            },
            {
                fields: ['name']
            },
            {
                fields: ['level']
            },
            {
                fields: ['is_banned']
            },
            {
                fields: ['last_seen']
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
            user_id: {
                type: DataTypes.STRING(50),
                allowNull: false,
                unique: true,
                validate: {
                    len: {
                        args: [5, 50],
                        msg: 'User ID must be between 5 and 50 characters'
                    },
                    isAlphanumeric: {
                        msg: 'User ID must be alphanumeric'
                    }
                },
                comment: 'Facebook User ID'
            },
            name: {
                type: DataTypes.STRING(255),
                allowNull: false,
                defaultValue: 'Unknown User',
                validate: {
                    len: {
                        args: [1, 255],
                        msg: 'Name must be between 1 and 255 characters'
                    }
                },
                comment: 'User display name'
            },
            level: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1,
                validate: {
                    min: {
                        args: [1],
                        msg: 'Level cannot be less than 1'
                    },
                    max: {
                        args: [999],
                        msg: 'Level cannot exceed 999'
                    }
                },
                comment: 'User level'
            },
            exp: {
                type: DataTypes.BIGINT,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Experience cannot be negative'
                    },
                    max: {
                        args: [9999999999],
                        msg: 'Experience cannot exceed 9,999,999,999'
                    }
                },
                comment: 'Current experience points'
            },
            total_exp: {
                type: DataTypes.BIGINT,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Total experience cannot be negative'
                    }
                },
                comment: 'Total experience earned'
            },
            rank: {
                type: DataTypes.STRING(50),
                allowNull: true,
                defaultValue: 'Newbie',
                comment: 'User rank title'
            },
            is_banned: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: 'Whether user is banned'
            },
            ban_reason: {
                type: DataTypes.TEXT,
                allowNull: true,
                comment: 'Reason for ban'
            },
            ban_until: {
                type: DataTypes.DATE,
                allowNull: true,
                comment: 'Ban expiration date'
            },
            warning_count: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Warning count cannot be negative'
                    },
                    max: {
                        args: [100],
                        msg: 'Warning count cannot exceed 100'
                    }
                },
                comment: 'Number of warnings received'
            },
            metadata: {
                type: DataTypes.TEXT,
                allowNull: true,
                defaultValue: '{}',
                get() {
                    const rawValue = this.getDataValue('metadata');
                    try {
                        return rawValue ? JSON.parse(rawValue) : {};
                    } catch {
                        return {};
                    }
                },
                set(value) {
                    this.setDataValue('metadata', JSON.stringify(value));
                },
                comment: 'Additional user metadata in JSON format'
            },
            api_key: {
                type: DataTypes.STRING(64),
                allowNull: true,
                unique: true,
                defaultValue: function() {
                    return crypto.randomBytes(32).toString('hex');
                },
                comment: 'API key for external access'
            },
            last_seen: {
                type: DataTypes.DATE,
                allowNull: true,
                comment: 'Last seen timestamp'
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
                comment: 'User settings in JSON format'
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
                comment: 'Account creation time'
            },
            updated_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
                comment: 'Account last update time'
            }
        };
    };

    model.associate = function(models) {
        model.hasOne(models.Currencies, {
            foreignKey: 'user_id',
            as: 'currency',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
        
        model.belongsToMany(models.Threads, {
            through: models.ThreadUsers,
            foreignKey: 'user_id',
            otherKey: 'thread_id',
            as: 'threads',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
        
        model.hasMany(models.ExperienceLogs, {
            foreignKey: 'user_id',
            as: 'experienceLogs',
            onDelete: 'CASCADE'
        });
        
        model.hasMany(models.UserLogs, {
            foreignKey: 'user_id',
            as: 'userLogs',
            onDelete: 'CASCADE'
        });
        
        model.hasMany(models.TransactionLogs, {
            foreignKey: 'from_user_id',
            as: 'sentTransactions'
        });
        
        model.hasMany(models.TransactionLogs, {
            foreignKey: 'to_user_id',
            as: 'receivedTransactions'
        });
    };

    // Custom validators
    model.customValidators = {
        user_id: {
            isUnique: async function(value) {
                const user = await model.findOne({ where: { user_id: value } });
                if (user && user.id !== this.id) {
                    throw new Error('User ID already exists');
                }
            }
        },
        level: {
            isValidLevel(value) {
                if (value < 1) {
                    throw new Error('Level cannot be less than 1');
                }
                if (value > 999) {
                    throw new Error('Level cannot exceed 999');
                }
            }
        }
    };

    // Custom scopes
    model.customScopes = {
        active: {
            where: {
                last_seen: {
                    [sequelize.Sequelize.Op.gte]: sequelize.literal('DATE_SUB(NOW(), INTERVAL 7 DAY)')
                }
            }
        },
        online: {
            where: {
                last_seen: {
                    [sequelize.Sequelize.Op.gte]: sequelize.literal('DATE_SUB(NOW(), INTERVAL 5 MINUTE)')
                }
            }
        },
        banned: {
            where: { is_banned: true }
        },
        warningThreshold: (count = 3) => ({
            where: {
                warning_count: {
                    [sequelize.Sequelize.Op.gte]: count
                }
            }
        }),
        highLevel: {
            where: {
                level: {
                    [sequelize.Sequelize.Op.gte]: 50
                }
            }
        },
        newUsers: {
            where: {
                created_at: {
                    [sequelize.Sequelize.Op.gte]: sequelize.literal('DATE_SUB(NOW(), INTERVAL 24 HOUR)')
                }
            }
        }
    };

    // Instance methods
    model.prototype.updateLastSeen = async function(ipAddress = null, userAgent = null) {
        const now = new Date();
        const lastSeen = new Date(this.last_seen || 0);
        const minutesDiff = (now - lastSeen) / (1000 * 60);

        // Only update if more than 5 minutes passed or first time
        if (minutesDiff >= 5 || !this.last_seen) {
            const metadata = this.metadata || {};
            const devices = metadata.devices || [];
            
            // Add device info if provided
            if (userAgent) {
                const deviceInfo = {
                    userAgent: userAgent.substring(0, 200),
                    ipAddress: ipAddress,
                    lastSeen: now.toISOString()
                };
                
                // Keep only last 5 devices
                devices.unshift(deviceInfo);
                if (devices.length > 5) {
                    devices.length = 5;
                }
                
                metadata.devices = devices;
            }

            // Update metadata
            metadata.lastLogin = now.toISOString();
            metadata.loginCount = (metadata.loginCount || 0) + 1;
            if (ipAddress) {
                metadata.lastIp = ipAddress;
            }

            await this.update({
                last_seen: now,
                metadata: metadata
            });

            logger.debug(`[Users] Updated last seen for user ${this.user_id}`);
        }

        return { success: true };
    };

    model.prototype.addWarning = async function(reason, adminId = null, transaction = null) {
        this.warning_count += 1;
        
        const metadata = this.metadata || {};
        const warnings = metadata.warnings || [];
        
        warnings.push({
            reason: reason,
            adminId: adminId,
            timestamp: new Date().toISOString(),
            count: this.warning_count
        });
        
        metadata.warnings = warnings;
        metadata.lastWarning = new Date().toISOString();

        // Auto-ban after 3 warnings
        let autoBanned = false;
        if (this.warning_count >= 3) {
            this.is_banned = true;
            this.ban_reason = 'Auto-ban: Received 3 warnings';
            this.ban_until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
            autoBanned = true;
            
            logger.warn(`[Users] Auto-banned user ${this.user_id} for 3 warnings`);
        }

        const options = transaction ? { transaction } : {};

        await this.update({
            warning_count: this.warning_count,
            is_banned: this.is_banned,
            ban_reason: this.ban_reason,
            ban_until: this.ban_until,
            metadata: metadata
        }, options);

        logger.info(`[Users] Added warning to user ${this.user_id}`, {
            user_id: this.user_id,
            reason: reason,
            adminId: adminId,
            warningCount: this.warning_count,
            autoBanned: autoBanned
        });

        return {
            success: true,
            warningCount: this.warning_count,
            reason: reason,
            adminId: adminId,
            autoBanned: autoBanned,
            banUntil: this.ban_until
        };
    };

    model.prototype.clearWarnings = async function(adminId = null, transaction = null) {
        const oldWarningCount = this.warning_count;
        
        this.warning_count = 0;
        const metadata = this.metadata || {};
        metadata.warnings = [];
        
        // Remove auto-ban if it was for warnings
        if (this.is_banned && this.ban_reason?.includes('Auto-ban')) {
            this.is_banned = false;
            this.ban_reason = null;
            this.ban_until = null;
        }

        const options = transaction ? { transaction } : {};

        await this.update({
            warning_count: 0,
            is_banned: this.is_banned,
            ban_reason: this.ban_reason,
            ban_until: this.ban_until,
            metadata: metadata
        }, options);

        logger.info(`[Users] Cleared warnings for user ${this.user_id}`, {
            user_id: this.user_id,
            oldWarningCount: oldWarningCount,
            adminId: adminId
        });

        return {
            success: true,
            oldWarningCount: oldWarningCount,
            newWarningCount: 0,
            clearedBy: adminId
        };
    };

    model.prototype.isBanned = function() {
        if (!this.is_banned) {
            return { banned: false };
        }

        // Check if ban has expired
        if (this.ban_until && new Date() > new Date(this.ban_until)) {
            return { banned: false, expired: true };
        }

        return {
            banned: true,
            reason: this.ban_reason,
            until: this.ban_until,
            remaining: this.ban_until ? 
                Math.ceil((new Date(this.ban_until) - new Date()) / (1000 * 60 * 60 * 24)) : 
                'permanent'
        };
    };

    model.prototype.ban = async function(reason, durationDays = null, adminId = null, transaction = null) {
        const banUntil = durationDays ? 
            new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000) : 
            null;

        const options = transaction ? { transaction } : {};

        await this.update({
            is_banned: true,
            ban_reason: reason,
            ban_until: banUntil
        }, options);

        logger.warn(`[Users] Banned user ${this.user_id}`, {
            user_id: this.user_id,
            reason: reason,
            durationDays: durationDays,
            adminId: adminId,
            banUntil: banUntil
        });

        return {
            success: true,
            reason: reason,
            durationDays: durationDays,
            banUntil: banUntil,
            bannedBy: adminId
        };
    };

    model.prototype.unban = async function(adminId = null, transaction = null) {
        if (!this.is_banned) {
            return { success: true, alreadyUnbanned: true };
        }

        const oldBanReason = this.ban_reason;
        const oldBanUntil = this.ban_until;

        const options = transaction ? { transaction } : {};

        await this.update({
            is_banned: false,
            ban_reason: null,
            ban_until: null
        }, options);

        logger.info(`[Users] Unbanned user ${this.user_id}`, {
            user_id: this.user_id,
            adminId: adminId,
            oldBanReason: oldBanReason,
            oldBanUntil: oldBanUntil
        });

        return {
            success: true,
            unbannedBy: adminId,
            oldBanReason: oldBanReason,
            oldBanUntil: oldBanUntil
        };
    };

    model.prototype.addExperience = async function(amount, source = 'unknown', transaction = null) {
        if (amount <= 0) {
            throw new Error('Experience amount must be positive');
        }

        const oldLevel = this.level;
        const oldExp = this.exp;
        const newExp = oldExp + amount;
        
        let levelUp = false;
        let newLevel = oldLevel;
        let levelsGained = 0;

        // Calculate level ups
        while (newLevel < 999) {
            const expForNextLevel = model.calculateExpForLevel(newLevel + 1);
            if (newExp >= expForNextLevel) {
                newExp -= expForNextLevel;
                newLevel++;
                levelUp = true;
                levelsGained++;
            } else {
                break;
            }
        }

        const options = transaction ? { transaction } : {};

        // Update user
        await this.update({
            level: newLevel,
            exp: newExp,
            total_exp: this.total_exp + amount,
            rank: model.calculateRank(newLevel)
        }, options);

        // Log experience gain
        if (sequelize.models.ExperienceLogs) {
            await sequelize.models.ExperienceLogs.create({
                user_id: this.id,
                amount: amount,
                source: source,
                old_level: oldLevel,
                new_level: newLevel,
                old_exp: oldExp,
                new_exp: newExp,
                total_exp: this.total_exp + amount
            }, options);
        }

        logger.info(`[Users] Added ${amount} EXP to user ${this.user_id}`, {
            user_id: this.user_id,
            amount: amount,
            source: source,
            oldLevel: oldLevel,
            newLevel: newLevel,
            levelUp: levelUp,
            levelsGained: levelsGained
        });

        return {
            success: true,
            amount: amount,
            source: source,
            oldLevel: oldLevel,
            newLevel: newLevel,
            oldExp: oldExp,
            newExp: newExp,
            levelUp: levelUp,
            levelsGained: levelsGained,
            expToNextLevel: model.calculateExpForLevel(newLevel + 1) - newExp,
            totalExp: this.total_exp + amount,
            rank: model.calculateRank(newLevel)
        };
    };

    model.prototype.getStats = async function() {
        const currency = await this.getCurrency();
        const threads = await this.getThreads();
        
        const threadStats = {
            totalThreads: threads.length,
            adminThreads: threads.filter(t => t.ThreadUser.role === 'admin').length,
            moderatorThreads: threads.filter(t => t.ThreadUser.role === 'member').length,
            totalMessages: threads.reduce((sum, t) => sum + (t.ThreadUser.messageCount || 0), 0)
        };

        // Get experience history
        const expHistory = sequelize.models.ExperienceLogs ? 
            await sequelize.models.ExperienceLogs.findAll({
                where: { user_id: this.id },
                order: [['created_at', 'DESC']],
                limit: 10,
                attributes: ['amount', 'source', 'old_level', 'new_level', 'created_at']
            }) : [];

        // Calculate playtime
        const firstSeen = new Date(this.metadata?.firstSeen || this.created_at);
        const playtimeDays = Math.floor((new Date() - firstSeen) / (1000 * 60 * 60 * 24));

        // Get rank percentile
        const rankStats = await model.getRankPercentile(this.level);

        return {
            userId: this.user_id,
            name: this.name,
            level: this.level,
            exp: this.exp,
            totalExp: this.total_exp,
            expToNextLevel: model.calculateExpForLevel(this.level + 1) - this.exp,
            rank: this.rank,
            rankPercentile: rankStats.percentile,
            globalRank: rankStats.rank,
            warningCount: this.warning_count,
            banStatus: this.isBanned(),
            currency: currency ? {
                balance: currency.balance,
                bankBalance: currency.bank_balance,
                totalWealth: currency.balance + currency.bank_balance,
                netWorth: (currency.balance + currency.bank_balance) - currency.debt
            } : null,
            threadStats,
            activity: {
                lastSeen: this.last_seen,
                isOnline: this.last_seen ? 
                    (Date.now() - new Date(this.last_seen).getTime() < 300000) : false,
                playtimeDays,
                firstSeen: firstSeen,
                expHistory: expHistory.map(exp => ({
                    amount: exp.amount,
                    source: exp.source,
                    levelChange: exp.new_level - exp.old_level,
                    date: exp.created_at
                }))
            },
            metadata: {
                warnings: this.metadata.warnings || [],
                preferences: this.metadata.preferences || {},
                devices: this.metadata.devices || []
            },
            settings: this.settings || {},
            createdAt: this.created_at,
            updatedAt: this.updated_at
        };
    };

    model.prototype.updateSettings = async function(newSettings, transaction = null) {
        const currentSettings = this.settings || {};
        const mergedSettings = { ...currentSettings, ...newSettings };

        const options = transaction ? { transaction } : {};

        await this.update({
            settings: mergedSettings
        }, options);

        logger.debug(`[Users] Updated settings for user ${this.user_id}`);

        return {
            success: true,
            settings: mergedSettings
        };
    };

    model.prototype.getSetting = function(key, defaultValue = null) {
        return this.settings[key] !== undefined ? this.settings[key] : defaultValue;
    };

    // Class methods
    model.calculateExpForLevel = function(level) {
        if (level <= 1) return 0;
        return Math.floor(100 * Math.pow(level - 1, 1.5));
    };

    model.calculateTotalExp = function(level, currentExp) {
        let totalExp = currentExp;
        for (let i = 1; i < level; i++) {
            totalExp += model.calculateExpForLevel(i + 1);
        }
        return totalExp;
    };

    model.calculateRank = function(level) {
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
    };

    model.getRankPercentile = async function(level) {
        try {
            const totalUsers = await model.count();
            const usersAbove = await model.count({
                where: { level: { [sequelize.Sequelize.Op.gt]: level } }
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
            logger.error(`[Users] Failed to calculate rank percentile: ${error.message}`);
            return { percentile: 0, rank: 0, totalUsers: 0 };
        }
    };

    model.generateApiKey = function() {
        return crypto.randomBytes(32).toString('hex');
    };

    model.findByApiKey = async function(apiKey) {
        return await model.findOne({
            where: { api_key: apiKey },
            include: [{
                model: sequelize.models.Currencies,
                as: 'currency',
                attributes: ['balance', 'bank_balance', 'total_earned']
            }]
        });
    };

    model.getLeaderboard = async function(type = 'level', limit = 10, offset = 0) {
        let orderField;
        switch (type) {
            case 'exp':
                orderField = 'total_exp';
                break;
            case 'wealth':
                // Requires joining with currencies
                return await model.getWealthLeaderboard(limit, offset);
            case 'activity':
                // Requires complex calculation
                orderField = 'last_seen';
                break;
            default:
                orderField = 'level';
        }

        const users = await model.findAll({
            order: [[orderField, 'DESC'], ['total_exp', 'DESC']],
            limit: Math.min(limit, 100),
            offset: offset,
            attributes: ['user_id', 'name', 'level', 'exp', 'total_exp', 'rank', 'last_seen']
        });

        return users.map((user, index) => ({
            rank: offset + index + 1,
            userId: user.user_id,
            name: user.name,
            level: user.level,
            exp: user.exp,
            totalExp: user.total_exp,
            rankTitle: user.rank,
            lastSeen: user.last_seen,
            isOnline: user.last_seen ? 
                (Date.now() - new Date(user.last_seen).getTime() < 300000) : false
        }));
    };

    model.getWealthLeaderboard = async function(limit = 10, offset = 0) {
        const result = await sequelize.query(`
            SELECT 
                u.user_id,
                u.name,
                u.level,
                u.rank,
                c.balance,
                c.bank_balance,
                (c.balance + c.bank_balance) as total_wealth,
                c.total_earned,
                ROW_NUMBER() OVER (ORDER BY (c.balance + c.bank_balance) DESC) as rank_position
            FROM users u
            INNER JOIN currencies c ON u.id = c.user_id
            ORDER BY total_wealth DESC
            LIMIT ? OFFSET ?
        `, {
            replacements: [limit, offset],
            type: sequelize.QueryTypes.SELECT
        });

        return result.map(row => ({
            rank: row.rank_position,
            userId: row.user_id,
            name: row.name,
            level: row.level,
            rankTitle: row.rank,
            balance: row.balance,
            bankBalance: row.bank_balance,
            totalWealth: row.total_wealth,
            totalEarned: row.total_earned
        }));
    };

    model.getSystemStats = async function() {
        const stats = await model.findAll({
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalUsers'],
                [sequelize.fn('SUM', sequelize.col('level')), 'totalLevels'],
                [sequelize.fn('AVG', sequelize.col('level')), 'avgLevel'],
                [sequelize.fn('MAX', sequelize.col('level')), 'maxLevel'],
                [sequelize.fn('COUNT', sequelize.col('is_banned')), 'bannedUsers'],
                [sequelize.fn('SUM', sequelize.col('warning_count')), 'totalWarnings']
            ]
        });

        const recentUsers = await model.count({
            where: {
                created_at: {
                    [sequelize.Sequelize.Op.gte]: new Date(new Date() - 24 * 60 * 60 * 1000)
                }
            }
        });

        const onlineUsers = await model.count({
            where: {
                last_seen: {
                    [sequelize.Sequelize.Op.gte]: new Date(new Date() - 5 * 60 * 1000)
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
    };

    model.searchUsers = async function(query, limit = 20, filters = {}) {
        const where = {
            [sequelize.Sequelize.Op.or]: [
                { user_id: { [sequelize.Sequelize.Op.like]: `%${query}%` } },
                { name: { [sequelize.Sequelize.Op.like]: `%${query}%` } }
            ]
        };

        if (filters.minLevel) {
            where.level = { [sequelize.Sequelize.Op.gte]: filters.minLevel };
        }
        if (filters.isBanned !== undefined) {
            where.is_banned = filters.isBanned;
        }
        if (filters.minLastSeen) {
            where.last_seen = { [sequelize.Sequelize.Op.gte]: filters.minLastSeen };
        }

        const users = await model.findAll({
            where,
            limit: Math.min(limit, 50),
            order: [['level', 'DESC'], ['total_exp', 'DESC']],
            attributes: ['user_id', 'name', 'level', 'exp', 'total_exp', 'rank', 'is_banned', 'last_seen', 'warning_count']
        });

        return users.map(user => ({
            userId: user.user_id,
            name: user.name,
            level: user.level,
            exp: user.exp,
            totalExp: user.total_exp,
            rank: user.rank,
            isBanned: user.is_banned,
            warningCount: user.warning_count,
            lastSeen: user.last_seen,
            isOnline: user.last_seen ? 
                (Date.now() - new Date(user.last_seen).getTime() < 300000) : false
        }));
    };

    // Hidden fields
    model.hidden = [...BaseModel.hidden, 'api_key'];

    return model;
};