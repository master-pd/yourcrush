const BaseModel = require('../model');
const logger = require('../../../utils/log');

module.exports = (sequelize, DataTypes) => {
    class ExperienceLogs extends BaseModel {}
    
    const model = ExperienceLogs.init(sequelize, DataTypes, {
        tableName: 'experience_logs',
        indexes: [
            {
                fields: ['user_id']
            },
            {
                fields: ['source']
            },
            {
                fields: ['created_at']
            },
            {
                fields: ['old_level']
            },
            {
                fields: ['new_level']
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
            amount: {
                type: DataTypes.BIGINT,
                allowNull: false,
                validate: {
                    min: {
                        args: [1],
                        msg: 'Experience amount must be positive'
                    },
                    max: {
                        args: [9999999],
                        msg: 'Experience amount cannot exceed 9,999,999'
                    }
                },
                comment: 'Experience points gained'
            },
            source: {
                type: DataTypes.STRING(100),
                allowNull: false,
                defaultValue: 'unknown',
                validate: {
                    len: {
                        args: [1, 100],
                        msg: 'Source must be between 1 and 100 characters'
                    }
                },
                comment: 'Source of experience gain'
            },
            old_level: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1,
                validate: {
                    min: {
                        args: [1],
                        msg: 'Level cannot be less than 1'
                    }
                },
                comment: 'Level before experience gain'
            },
            new_level: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1,
                validate: {
                    min: {
                        args: [1],
                        msg: 'Level cannot be less than 1'
                    }
                },
                comment: 'Level after experience gain'
            },
            old_exp: {
                type: DataTypes.BIGINT,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Experience cannot be negative'
                    }
                },
                comment: 'Experience points before gain'
            },
            new_exp: {
                type: DataTypes.BIGINT,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Experience cannot be negative'
                    }
                },
                comment: 'Experience points after gain'
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
                comment: 'Total experience after gain'
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
                comment: 'Additional metadata in JSON format'
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
        amount: {
            isValidAmount(value) {
                if (value <= 0) {
                    throw new Error('Experience amount must be positive');
                }
                if (value > 9999999) {
                    throw new Error('Experience amount cannot exceed 9,999,999');
                }
            }
        },
        new_level: {
            isHigherOrEqual(value) {
                if (value < this.old_level) {
                    throw new Error('New level cannot be lower than old level');
                }
            }
        },
        new_exp: {
            isValidExp(value) {
                if (value < 0) {
                    throw new Error('Experience cannot be negative');
                }
                if (value < this.old_exp && this.old_level === this.new_level) {
                    throw new Error('Experience cannot decrease without level up');
                }
            }
        }
    };

    // Custom scopes
    model.customScopes = {
        levelUps: {
            where: {
                new_level: {
                    [sequelize.Sequelize.Op.gt]: sequelize.col('old_level')
                }
            }
        },
        largeGains: (amount = 1000) => ({
            where: {
                amount: {
                    [sequelize.Sequelize.Op.gte]: amount
                }
            }
        }),
        bySource: (source) => ({
            where: { source: source }
        }),
        recent: (hours = 24) => ({
            where: {
                created_at: {
                    [sequelize.Sequelize.Op.gte]: sequelize.literal(`DATE_SUB(NOW(), INTERVAL ${hours} HOUR)`)
                }
            }
        }),
        userLogs: (userId) => ({
            where: { user_id: userId }
        })
    };

    // Instance methods
    model.prototype.getDetails = function() {
        const levelUp = this.new_level > this.old_level;
        const levelsGained = this.new_level - this.old_level;
        
        return {
            id: this.id,
            userId: this.user_id,
            amount: this.amount,
            source: this.source,
            oldLevel: this.old_level,
            newLevel: this.new_level,
            oldExp: this.old_exp,
            newExp: this.new_exp,
            totalExp: this.total_exp,
            levelUp: levelUp,
            levelsGained: levelsGained,
            expToNextLevel: this.calculateExpToNextLevel(),
            metadata: this.metadata || {},
            createdAt: this.created_at
        };
    };

    model.prototype.calculateExpToNextLevel = function() {
        // This assumes we have access to the Users model's calculateExpForLevel method
        // In practice, you might need to import or calculate differently
        const Users = sequelize.models.Users;
        if (Users && Users.calculateExpForLevel) {
            const expForNextLevel = Users.calculateExpForLevel(this.new_level + 1);
            return expForNextLevel - this.new_exp;
        }
        return 0;
    };

    model.prototype.isLevelUp = function() {
        return this.new_level > this.old_level;
    };

    model.prototype.getLevelsGained = function() {
        return this.new_level - this.old_level;
    };

    // Class methods
    model.getUserExperienceHistory = async function(userId, limit = 50, offset = 0) {
        const user = await sequelize.models.Users.findOne({
            where: { user_id: userId }
        });

        if (!user) {
            return { logs: [], pagination: { total: 0, pages: 0 } };
        }

        const { count, rows } = await model.findAndCountAll({
            where: { user_id: user.id },
            include: [{
                model: sequelize.models.Users,
                as: 'user',
                attributes: ['user_id', 'name', 'level']
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
                amount: details.amount,
                source: details.source,
                oldLevel: details.oldLevel,
                newLevel: details.newLevel,
                levelUp: details.levelUp,
                levelsGained: details.levelsGained,
                totalExp: details.totalExp,
                expToNextLevel: details.expToNextLevel,
                metadata: details.metadata,
                timestamp: log.created_at,
                user: log.user ? {
                    userId: log.user.user_id,
                    name: log.user.name,
                    level: log.user.level
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

    model.getExperienceSummary = async function(userId, period = 'month') {
        const user = await sequelize.models.Users.findOne({
            where: { user_id: userId }
        });

        if (!user) {
            return {
                totalExp: 0,
                totalGains: 0,
                levelUps: 0,
                averageGain: 0,
                bySource: {},
                timeline: []
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
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalGains'],
                [sequelize.fn('SUM', sequelize.col('amount')), 'totalExp'],
                [sequelize.fn('AVG', sequelize.col('amount')), 'averageGain'],
                [sequelize.fn('MAX', sequelize.col('amount')), 'maxGain'],
                [sequelize.fn('COUNT', sequelize.literal('CASE WHEN new_level > old_level THEN 1 END')), 'levelUps']
            ]
        });

        // Get experience by source
        const bySource = await model.findAll({
            where: {
                user_id: user.id,
                created_at: {
                    [sequelize.Sequelize.Op.gte]: startDate
                }
            },
            attributes: [
                'source',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                [sequelize.fn('SUM', sequelize.col('amount')), 'total']
            ],
            group: ['source'],
            order: [[sequelize.fn('SUM', sequelize.col('amount')), 'DESC']]
        });

        // Get timeline data
        let timeline;
        if (period === 'day' || period === 'week') {
            timeline = await sequelize.query(`
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as gains,
                    SUM(amount) as total_exp,
                    COUNT(CASE WHEN new_level > old_level THEN 1 END) as level_ups
                FROM experience_logs
                WHERE user_id = ? AND created_at >= ?
                GROUP BY DATE(created_at)
                ORDER BY date DESC
                LIMIT 30
            `, {
                replacements: [user.id, startDate],
                type: sequelize.QueryTypes.SELECT
            });
        } else if (period === 'month') {
            timeline = await sequelize.query(`
                SELECT 
                    DATE_FORMAT(created_at, '%Y-%m') as month,
                    COUNT(*) as gains,
                    SUM(amount) as total_exp,
                    COUNT(CASE WHEN new_level > old_level THEN 1 END) as level_ups
                FROM experience_logs
                WHERE user_id = ? AND created_at >= ?
                GROUP BY DATE_FORMAT(created_at, '%Y-%m')
                ORDER BY month DESC
                LIMIT 12
            `, {
                replacements: [user.id, startDate],
                type: sequelize.QueryTypes.SELECT
            });
        }

        // Convert to object format
        const sourceMap = {};
        bySource.forEach(item => {
            sourceMap[item.source] = {
                count: item.get('count') || 0,
                total: parseInt(item.get('total') || 0),
                percentage: summary[0]?.get('totalExp') > 0 ? 
                    ((item.get('total') / summary[0]?.get('totalExp')) * 100).toFixed(1) : 0
            };
        });

        return {
            period: period,
            startDate: startDate,
            endDate: new Date(),
            totalExp: parseInt(summary[0]?.get('totalExp') || 0),
            totalGains: parseInt(summary[0]?.get('totalGains') || 0),
            levelUps: parseInt(summary[0]?.get('levelUps') || 0),
            averageGain: Math.round(summary[0]?.get('averageGain') || 0),
            maximumGain: parseInt(summary[0]?.get('maxGain') || 0),
            bySource: sourceMap,
            timeline: timeline || [],
            efficiency: summary[0]?.get('totalGains') > 0 ? 
                (parseInt(summary[0]?.get('totalExp') || 0) / parseInt(summary[0]?.get('totalGains') || 0)).toFixed(2) : 0
        };
    };

    model.getTopExperienceGainers = async function(period = 'day', limit = 10) {
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

        const topGainers = await sequelize.query(`
            SELECT 
                u.user_id,
                u.name,
                u.level,
                COUNT(el.id) as gain_count,
                SUM(el.amount) as total_exp,
                MAX(el.amount) as max_gain,
                COUNT(CASE WHEN el.new_level > el.old_level THEN 1 END) as level_ups
            FROM experience_logs el
            INNER JOIN users u ON el.user_id = u.id
            WHERE el.created_at >= ?
            GROUP BY u.id
            ORDER BY total_exp DESC
            LIMIT ?
        `, {
            replacements: [startDate, limit],
            type: sequelize.QueryTypes.SELECT
        });

        return topGainers.map((gainer, index) => ({
            rank: index + 1,
            userId: gainer.user_id,
            name: gainer.name,
            level: gainer.level,
            gainCount: parseInt(gainer.gain_count),
            totalExp: parseInt(gainer.total_exp),
            maxGain: parseInt(gainer.max_gain),
            levelUps: parseInt(gainer.level_ups),
            averageGain: parseInt(gainer.gain_count) > 0 ? 
                Math.round(parseInt(gainer.total_exp) / parseInt(gainer.gain_count)) : 0
        }));
    };

    model.getSystemExperienceStats = async function(period = 'day') {
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
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalGains'],
                [sequelize.fn('SUM', sequelize.col('amount')), 'totalExp'],
                [sequelize.fn('AVG', sequelize.col('amount')), 'averageGain'],
                [sequelize.fn('MAX', sequelize.col('amount')), 'maxGain'],
                [sequelize.fn('COUNT', sequelize.literal('CASE WHEN new_level > old_level THEN 1 END')), 'levelUps'],
                [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('user_id'))), 'uniqueUsers']
            ]
        });

        // Get experience by source
        const bySource = await model.findAll({
            where: {
                created_at: {
                    [sequelize.Sequelize.Op.gte]: startDate
                }
            },
            attributes: [
                'source',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
                [sequelize.fn('AVG', sequelize.col('amount')), 'average']
            ],
            group: ['source'],
            order: [[sequelize.fn('SUM', sequelize.col('amount')), 'DESC']],
            limit: 10
        });

        // Get distribution by hour/day
        let distribution;
        if (period === 'day' || period === 'week') {
            distribution = await sequelize.query(`
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as gains,
                    SUM(amount) as total_exp,
                    COUNT(CASE WHEN new_level > old_level THEN 1 END) as level_ups
                FROM experience_logs
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
                    COUNT(*) as gains,
                    SUM(amount) as total_exp
                FROM experience_logs
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
            totalGains: parseInt(stats[0]?.get('totalGains') || 0),
            totalExp: parseInt(stats[0]?.get('totalExp') || 0),
            averageGain: Math.round(stats[0]?.get('averageGain') || 0),
            maximumGain: parseInt(stats[0]?.get('maxGain') || 0),
            levelUps: parseInt(stats[0]?.get('levelUps') || 0),
            uniqueUsers: parseInt(stats[0]?.get('uniqueUsers') || 0),
            expPerUser: parseInt(stats[0]?.get('uniqueUsers') || 0) > 0 ? 
                Math.round(parseInt(stats[0]?.get('totalExp') || 0) / parseInt(stats[0]?.get('uniqueUsers') || 0)) : 0,
            gainsPerUser: parseInt(stats[0]?.get('uniqueUsers') || 0) > 0 ? 
                (parseInt(stats[0]?.get('totalGains') || 0) / parseInt(stats[0]?.get('uniqueUsers') || 0)).toFixed(2) : 0,
            bySource: bySource.map(item => ({
                source: item.source,
                count: item.get('count') || 0,
                total: parseInt(item.get('total') || 0),
                average: Math.round(item.get('average') || 0),
                percentage: parseInt(stats[0]?.get('totalExp') || 0) > 0 ? 
                    ((item.get('total') / parseInt(stats[0]?.get('totalExp') || 0)) * 100).toFixed(1) : 0
            })),
            distribution: distribution || []
        };
    };

    model.getMostCommonSources = async function(limit = 10) {
        const sources = await model.findAll({
            attributes: [
                'source',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                [sequelize.fn('SUM', sequelize.col('amount')), 'total_exp'],
                [sequelize.fn('AVG', sequelize.col('amount')), 'average_exp'],
                [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('user_id'))), 'unique_users']
            ],
            group: ['source'],
            order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
            limit: Math.min(limit, 50)
        });

        return sources.map(source => ({
            source: source.source,
            count: source.get('count') || 0,
            totalExp: parseInt(source.get('total_exp') || 0),
            averageExp: Math.round(source.get('average_exp') || 0),
            uniqueUsers: source.get('unique_users') || 0
        }));
    };

    model.cleanupOldLogs = async function(daysToKeep = 180) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const result = await model.destroy({
            where: {
                created_at: {
                    [sequelize.Sequelize.Op.lt]: cutoffDate
                }
            }
        });

        logger.info(`[ExperienceLogs] Cleaned up ${result} old experience logs`);

        return {
            success: true,
            deletedCount: result,
            cutoffDate: cutoffDate,
            daysKept: daysToKeep
        };
    };

    model.createExperienceLog = async function(userId, amount, source, oldLevel, newLevel, oldExp, newExp, totalExp, metadata = {}, transaction = null) {
        const user = await sequelize.models.Users.findOne({
            where: { user_id: userId }
        });

        if (!user) {
            throw new Error('User not found');
        }

        const options = transaction ? { transaction } : {};

        const log = await model.create({
            user_id: user.id,
            amount: amount,
            source: source,
            old_level: oldLevel,
            new_level: newLevel,
            old_exp: oldExp,
            new_exp: newExp,
            total_exp: totalExp,
            metadata: metadata
        }, options);

        logger.debug(`[ExperienceLogs] Created experience log for user ${userId}: +${amount} EXP from ${source}`);

        return log;
    };

    // Hidden fields
    model.hidden = [...BaseModel.hidden];

    return model;
};