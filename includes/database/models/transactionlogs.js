const BaseModel = require('../model');
const logger = require('../../../utils/log');

module.exports = (sequelize, DataTypes) => {
    class TransactionLogs extends BaseModel {}
    
    const model = TransactionLogs.init(sequelize, DataTypes, {
        tableName: 'transaction_logs',
        indexes: [
            {
                fields: ['from_user_id']
            },
            {
                fields: ['to_user_id']
            },
            {
                fields: ['type']
            },
            {
                fields: ['status']
            },
            {
                fields: ['created_at']
            },
            {
                fields: ['amount']
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
            type: {
                type: DataTypes.ENUM('transfer', 'deposit', 'withdrawal', 'daily_reward', 'purchase', 'reward', 'penalty', 'system'),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [['transfer', 'deposit', 'withdrawal', 'daily_reward', 'purchase', 'reward', 'penalty', 'system']],
                        msg: 'Invalid transaction type'
                    }
                },
                comment: 'Transaction type'
            },
            from_user_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE',
                comment: 'Sender user ID (null for system transactions)'
            },
            to_user_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE',
                comment: 'Receiver user ID (null for system transactions)'
            },
            currency_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'currencies',
                    key: 'id'
                },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE',
                comment: 'Currency account ID'
            },
            amount: {
                type: DataTypes.BIGINT,
                allowNull: false,
                validate: {
                    min: {
                        args: [1],
                        msg: 'Amount must be positive'
                    },
                    max: {
                        args: [9999999999],
                        msg: 'Amount cannot exceed 9,999,999,999'
                    }
                },
                comment: 'Transaction amount'
            },
            description: {
                type: DataTypes.STRING(500),
                allowNull: true,
                comment: 'Transaction description'
            },
            status: {
                type: DataTypes.ENUM('pending', 'completed', 'failed', 'cancelled', 'refunded'),
                allowNull: false,
                defaultValue: 'completed',
                validate: {
                    isIn: {
                        args: [['pending', 'completed', 'failed', 'cancelled', 'refunded']],
                        msg: 'Invalid transaction status'
                    }
                },
                comment: 'Transaction status'
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
                comment: 'Additional transaction metadata'
            },
            ip_address: {
                type: DataTypes.STRING(45),
                allowNull: true,
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
                comment: 'Transaction creation time'
            },
            updated_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
                comment: 'Transaction last update time'
            }
        };
    };

    model.associate = function(models) {
        model.belongsTo(models.Users, {
            foreignKey: 'from_user_id',
            as: 'fromUser',
            onDelete: 'SET NULL'
        });
        
        model.belongsTo(models.Users, {
            foreignKey: 'to_user_id',
            as: 'toUser',
            onDelete: 'SET NULL'
        });
        
        model.belongsTo(models.Currencies, {
            foreignKey: 'currency_id',
            as: 'currency',
            onDelete: 'SET NULL'
        });
    };

    // Custom validators
    model.customValidators = {
        amount: {
            isValidAmount(value) {
                if (value <= 0) {
                    throw new Error('Transaction amount must be positive');
                }
                if (value > 9999999999) {
                    throw new Error('Transaction amount cannot exceed 9,999,999,999');
                }
            }
        },
        from_user_id: {
            isValidTransfer(value) {
                if (this.type === 'transfer' && !value) {
                    throw new Error('Transfer transactions require a sender');
                }
            }
        },
        to_user_id: {
            isValidTransfer(value) {
                if (this.type === 'transfer' && !value) {
                    throw new Error('Transfer transactions require a receiver');
                }
            }
        }
    };

    // Custom scopes
    model.customScopes = {
        transfers: {
            where: { type: 'transfer' }
        },
        deposits: {
            where: { type: 'deposit' }
        },
        withdrawals: {
            where: { type: 'withdrawal' }
        },
        dailyRewards: {
            where: { type: 'daily_reward' }
        },
        completed: {
            where: { status: 'completed' }
        },
        failed: {
            where: { status: 'failed' }
        },
        pending: {
            where: { status: 'pending' }
        },
        largeTransactions: (amount = 100000) => ({
            where: {
                amount: {
                    [sequelize.Sequelize.Op.gte]: amount
                }
            }
        }),
        userTransactions: (userId) => ({
            where: {
                [sequelize.Sequelize.Op.or]: [
                    { from_user_id: userId },
                    { to_user_id: userId }
                ]
            }
        }),
        recent: (hours = 24) => ({
            where: {
                created_at: {
                    [sequelize.Sequelize.Op.gte]: sequelize.literal(`DATE_SUB(NOW(), INTERVAL ${hours} HOUR)`)
                }
            }
        })
    };

    // Instance methods
    model.prototype.getDetails = function() {
        const details = {
            id: this.id,
            type: this.type,
            amount: this.amount,
            description: this.description,
            status: this.status,
            createdAt: this.created_at,
            metadata: this.metadata || {}
        };

        // Add direction information
        if (this.fromUser && this.toUser) {
            details.direction = 'transfer';
            details.fromUserId = this.fromUser.user_id;
            details.toUserId = this.toUser.user_id;
        } else if (this.fromUser && !this.toUser) {
            details.direction = 'outgoing';
            details.fromUserId = this.fromUser.user_id;
        } else if (!this.fromUser && this.toUser) {
            details.direction = 'incoming';
            details.toUserId = this.toUser.user_id;
        } else {
            details.direction = 'system';
        }

        return details;
    };

    model.prototype.updateStatus = async function(newStatus, reason = null, transaction = null) {
        const allowedStatuses = ['pending', 'completed', 'failed', 'cancelled', 'refunded'];
        
        if (!allowedStatuses.includes(newStatus)) {
            throw new Error(`Invalid status. Allowed: ${allowedStatuses.join(', ')}`);
        }

        if (this.status === newStatus) {
            return { success: true, noChange: true };
        }

        const oldStatus = this.status;
        const options = transaction ? { transaction } : {};

        // Update metadata with status change reason
        const metadata = this.metadata || {};
        metadata.statusChanges = metadata.statusChanges || [];
        metadata.statusChanges.push({
            from: oldStatus,
            to: newStatus,
            reason: reason,
            timestamp: new Date().toISOString()
        });

        await this.update({
            status: newStatus,
            metadata: metadata,
            updated_at: new Date()
        }, options);

        logger.info(`[TransactionLogs] Updated transaction ${this.id} status: ${oldStatus} -> ${newStatus}`, {
            transactionId: this.id,
            oldStatus: oldStatus,
            newStatus: newStatus,
            reason: reason
        });

        return {
            success: true,
            transactionId: this.id,
            oldStatus: oldStatus,
            newStatus: newStatus,
            reason: reason,
            timestamp: new Date()
        };
    };

    model.prototype.refund = async function(reason, adminId = null, transaction = null) {
        if (this.status !== 'completed') {
            throw new Error('Only completed transactions can be refunded');
        }

        if (this.type !== 'transfer') {
            throw new Error('Only transfer transactions can be refunded');
        }

        const options = transaction ? { transaction } : {};

        // Update transaction status
        await this.updateStatus('refunded', reason, transaction);

        // Create refund transaction
        const refundTransaction = await model.create({
            type: 'transfer',
            from_user_id: this.to_user_id, // Reverse the direction
            to_user_id: this.from_user_id,
            amount: this.amount,
            description: `Refund: ${this.description}`,
            status: 'completed',
            metadata: {
                originalTransactionId: this.id,
                refundReason: reason,
                refundedBy: adminId
            }
        }, options);

        logger.info(`[TransactionLogs] Refunded transaction ${this.id}`, {
            originalTransaction: this.id,
            refundTransaction: refundTransaction.id,
            amount: this.amount,
            reason: reason,
            adminId: adminId
        });

        return {
            success: true,
            originalTransactionId: this.id,
            refundTransactionId: refundTransaction.id,
            amount: this.amount,
            reason: reason,
            refundedBy: adminId
        };
    };

    // Class methods
    model.getUserTransactionHistory = async function(userId, limit = 50, offset = 0) {
        const user = await sequelize.models.Users.findOne({
            where: { user_id: userId }
        });

        if (!user) {
            return { transactions: [], pagination: { total: 0, pages: 0 } };
        }

        const { count, rows } = await model.findAndCountAll({
            where: {
                [sequelize.Sequelize.Op.or]: [
                    { from_user_id: user.id },
                    { to_user_id: user.id }
                ]
            },
            include: [
                {
                    model: sequelize.models.Users,
                    as: 'fromUser',
                    attributes: ['user_id', 'name']
                },
                {
                    model: sequelize.models.Users,
                    as: 'toUser',
                    attributes: ['user_id', 'name']
                }
            ],
            order: [['created_at', 'DESC']],
            limit: Math.min(limit, 100),
            offset: offset,
            distinct: true
        });

        const transactions = rows.map(transaction => {
            const details = transaction.getDetails();
            
            // Add readable type
            const typeMap = {
                'transfer': 'Transfer',
                'deposit': 'Bank Deposit',
                'withdrawal': 'Bank Withdrawal',
                'daily_reward': 'Daily Reward',
                'purchase': 'Purchase',
                'reward': 'Reward',
                'penalty': 'Penalty',
                'system': 'System'
            };

            return {
                id: transaction.id,
                type: details.type,
                typeReadable: typeMap[details.type] || details.type,
                amount: details.amount,
                description: details.description,
                status: details.status,
                direction: details.direction,
                fromUser: transaction.fromUser ? {
                    userId: transaction.fromUser.user_id,
                    name: transaction.fromUser.name
                } : null,
                toUser: transaction.toUser ? {
                    userId: transaction.toUser.user_id,
                    name: transaction.toUser.name
                } : null,
                metadata: details.metadata,
                createdAt: transaction.created_at,
                updatedAt: transaction.updated_at
            };
        });

        return {
            transactions,
            pagination: {
                total: count,
                pages: Math.ceil(count / limit),
                currentPage: Math.floor(offset / limit) + 1,
                hasNext: offset + limit < count,
                hasPrev: offset > 0
            }
        };
    };

    model.getTransactionSummary = async function(userId, period = 'month') {
        const user = await sequelize.models.Users.findOne({
            where: { user_id: userId }
        });

        if (!user) {
            return {
                totalTransactions: 0,
                totalAmount: 0,
                incoming: 0,
                outgoing: 0,
                byType: {},
                byStatus: {}
            };
        }

        // Calculate date range based on period
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
                startDate = new Date(0); // All time
        }

        // Get summary statistics
        const summary = await model.findAll({
            where: {
                [sequelize.Sequelize.Op.or]: [
                    { from_user_id: user.id },
                    { to_user_id: user.id }
                ],
                created_at: {
                    [sequelize.Sequelize.Op.gte]: startDate
                },
                status: 'completed'
            },
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalTransactions'],
                [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount'],
                [sequelize.fn('SUM', sequelize.literal('CASE WHEN from_user_id = ' + user.id + ' THEN amount ELSE 0 END')), 'outgoing'],
                [sequelize.fn('SUM', sequelize.literal('CASE WHEN to_user_id = ' + user.id + ' THEN amount ELSE 0 END')), 'incoming']
            ]
        });

        // Get transactions by type
        const byType = await model.findAll({
            where: {
                [sequelize.Sequelize.Op.or]: [
                    { from_user_id: user.id },
                    { to_user_id: user.id }
                ],
                created_at: {
                    [sequelize.Sequelize.Op.gte]: startDate
                },
                status: 'completed'
            },
            attributes: [
                'type',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                [sequelize.fn('SUM', sequelize.col('amount')), 'total']
            ],
            group: ['type']
        });

        // Get transactions by status
        const byStatus = await model.findAll({
            where: {
                [sequelize.Sequelize.Op.or]: [
                    { from_user_id: user.id },
                    { to_user_id: user.id }
                ],
                created_at: {
                    [sequelize.Sequelize.Op.gte]: startDate
                }
            },
            attributes: [
                'status',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                [sequelize.fn('SUM', sequelize.col('amount')), 'total']
            ],
            group: ['status']
        });

        // Convert results to objects
        const typeMap = {};
        byType.forEach(item => {
            typeMap[item.type] = {
                count: item.get('count') || 0,
                total: parseInt(item.get('total') || 0)
            };
        });

        const statusMap = {};
        byStatus.forEach(item => {
            statusMap[item.status] = {
                count: item.get('count') || 0,
                total: parseInt(item.get('total') || 0)
            };
        });

        return {
            period: period,
            startDate: startDate,
            endDate: new Date(),
            totalTransactions: parseInt(summary[0]?.get('totalTransactions') || 0),
            totalAmount: parseInt(summary[0]?.get('totalAmount') || 0),
            incoming: parseInt(summary[0]?.get('incoming') || 0),
            outgoing: parseInt(summary[0]?.get('outgoing') || 0),
            netFlow: (parseInt(summary[0]?.get('incoming') || 0) - parseInt(summary[0]?.get('outgoing') || 0)),
            byType: typeMap,
            byStatus: statusMap
        };
    };

    model.getSystemTransactionStats = async function(period = 'day') {
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
                },
                status: 'completed'
            },
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalTransactions'],
                [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount'],
                [sequelize.fn('AVG', sequelize.col('amount')), 'avgAmount'],
                [sequelize.fn('MAX', sequelize.col('amount')), 'maxAmount']
            ]
        });

        // Get transactions by type
        const byType = await model.findAll({
            where: {
                created_at: {
                    [sequelize.Sequelize.Op.gte]: startDate
                },
                status: 'completed'
            },
            attributes: [
                'type',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                [sequelize.fn('SUM', sequelize.col('amount')), 'total']
            ],
            group: ['type'],
            order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']]
        });

        // Get hourly/daily distribution
        let distribution;
        if (period === 'day' || period === 'week') {
            distribution = await sequelize.query(`
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as count,
                    SUM(amount) as total
                FROM transaction_logs
                WHERE created_at >= ? AND status = 'completed'
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
                    COUNT(*) as count,
                    SUM(amount) as total
                FROM transaction_logs
                WHERE created_at >= ? AND status = 'completed'
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
            totalTransactions: parseInt(stats[0]?.get('totalTransactions') || 0),
            totalAmount: parseInt(stats[0]?.get('totalAmount') || 0),
            averageAmount: Math.round(stats[0]?.get('avgAmount') || 0),
            maximumAmount: parseInt(stats[0]?.get('maxAmount') || 0),
            byType: byType.map(item => ({
                type: item.type,
                count: item.get('count') || 0,
                total: parseInt(item.get('total') || 0),
                percentage: stats[0]?.get('totalTransactions') > 0 ? 
                    ((item.get('count') / stats[0]?.get('totalTransactions')) * 100).toFixed(1) : 0
            })),
            distribution: distribution || []
        };
    };

    model.cleanupOldTransactions = async function(daysToKeep = 90) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const result = await model.destroy({
            where: {
                created_at: {
                    [sequelize.Sequelize.Op.lt]: cutoffDate
                },
                status: 'completed' // Only cleanup completed transactions
            }
        });

        logger.info(`[TransactionLogs] Cleaned up ${result} old transactions`);

        return {
            success: true,
            deletedCount: result,
            cutoffDate: cutoffDate,
            daysKept: daysToKeep
        };
    };

    // Hidden fields
    model.hidden = [...BaseModel.hidden, 'ip_address', 'user_agent'];

    return model;
};