const BaseModel = require('../model');
const logger = require('../../../utils/log');

module.exports = (sequelize, DataTypes) => {
    class Currencies extends BaseModel {}
    
    const model = Currencies.init(sequelize, DataTypes, {
        tableName: 'currencies',
        indexes: [
            {
                unique: true,
                fields: ['user_id']
            },
            {
                fields: ['balance']
            },
            {
                fields: ['bank_balance']
            },
            {
                fields: ['last_daily']
            }
        ]
    });

    model.getSchema = function(DataTypes) {
        return {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
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
            balance: {
                type: DataTypes.BIGINT,
                allowNull: false,
                defaultValue: 1000,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Balance cannot be negative'
                    },
                    max: {
                        args: [9999999999],
                        msg: 'Balance cannot exceed 9,999,999,999'
                    }
                },
                comment: 'User\'s available balance'
            },
            bank_balance: {
                type: DataTypes.BIGINT,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Bank balance cannot be negative'
                    },
                    max: {
                        args: [9999999999],
                        msg: 'Bank balance cannot exceed 9,999,999,999'
                    }
                },
                comment: 'User\'s bank balance'
            },
            debt: {
                type: DataTypes.BIGINT,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Debt cannot be negative'
                    }
                },
                comment: 'User\'s debt amount'
            },
            last_daily: {
                type: DataTypes.DATE,
                allowNull: true,
                comment: 'Last time user claimed daily reward'
            },
            daily_streak: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Daily streak cannot be negative'
                    },
                    max: {
                        args: [3650],
                        msg: 'Daily streak cannot exceed 3650'
                    }
                },
                comment: 'Current daily reward streak'
            },
            total_earned: {
                type: DataTypes.BIGINT,
                allowNull: false,
                defaultValue: 1000,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Total earned cannot be negative'
                    }
                },
                comment: 'Total currency earned by user'
            },
            total_spent: {
                type: DataTypes.BIGINT,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Total spent cannot be negative'
                    }
                },
                comment: 'Total currency spent by user'
            },
            last_transaction: {
                type: DataTypes.DATE,
                allowNull: true,
                comment: 'Last transaction time'
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
                comment: 'Record creation time'
            },
            updated_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
                comment: 'Record last update time'
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

        model.hasMany(models.TransactionLogs, {
            foreignKey: 'currency_id',
            as: 'transactions',
            onDelete: 'SET NULL'
        });
    };

    // Custom validators
    model.customValidators = {
        balance: {
            isValidBalance(value) {
                if (value < 0) {
                    throw new Error('Balance cannot be negative');
                }
                if (value > 9999999999) {
                    throw new Error('Balance cannot exceed 9,999,999,999');
                }
            }
        },
        bank_balance: {
            isValidBankBalance(value) {
                if (value < 0) {
                    throw new Error('Bank balance cannot be negative');
                }
                if (value > 9999999999) {
                    throw new Error('Bank balance cannot exceed 9,999,999,999');
                }
            }
        }
    };

    // Custom scopes
    model.customScopes = {
        wealthy: {
            where: {
                balance: {
                    [sequelize.Sequelize.Op.gt]: 1000000
                }
            }
        },
        poor: {
            where: {
                balance: {
                    [sequelize.Sequelize.Op.lt]: 1000
                }
            }
        },
        activeSavers: {
            where: {
                bank_balance: {
                    [sequelize.Sequelize.Op.gt]: 0
                }
            }
        },
        canClaimDaily: {
            where: {
                [sequelize.Sequelize.Op.or]: [
                    { last_daily: null },
                    sequelize.where(
                        sequelize.fn('DATE', sequelize.col('last_daily')),
                        '!=',
                        sequelize.fn('DATE', sequelize.fn('NOW'))
                    ),
                    sequelize.literal(`DATEDIFF(NOW(), last_daily) >= 1`)
                ]
            }
        }
    };

    // Instance methods
    model.prototype.depositToBank = async function(amount, transaction = null) {
        if (amount <= 0) {
            throw new Error('Deposit amount must be positive');
        }
        
        if (this.balance < amount) {
            throw new Error('Insufficient balance for deposit');
        }

        const options = transaction ? { transaction } : {};

        this.balance -= amount;
        this.bank_balance += amount;
        this.last_transaction = new Date();
        
        await this.save(options);

        logger.info(`[Currencies] Deposit to bank: User ${this.user_id} deposited ${amount}`);

        return {
            success: true,
            amount: amount,
            newBalance: this.balance,
            newBankBalance: this.bank_balance
        };
    };

    model.prototype.withdrawFromBank = async function(amount, transaction = null) {
        if (amount <= 0) {
            throw new Error('Withdrawal amount must be positive');
        }
        
        if (this.bank_balance < amount) {
            throw new Error('Insufficient bank balance');
        }

        const options = transaction ? { transaction } : {};

        this.bank_balance -= amount;
        this.balance += amount;
        this.last_transaction = new Date();
        
        await this.save(options);

        logger.info(`[Currencies] Withdrawal from bank: User ${this.user_id} withdrew ${amount}`);

        return {
            success: true,
            amount: amount,
            newBalance: this.balance,
            newBankBalance: this.bank_balance
        };
    };

    model.prototype.canClaimDaily = function() {
        if (!this.last_daily) {
            return {
                canClaim: true,
                streakReset: false,
                nextClaim: null
            };
        }
        
        const lastClaim = new Date(this.last_daily);
        const now = new Date();
        
        // Reset streak if more than 48 hours passed
        const hoursDiff = (now - lastClaim) / (1000 * 60 * 60);
        if (hoursDiff > 48) {
            return {
                canClaim: true,
                streakReset: true,
                nextClaim: this.getNextClaimTime()
            };
        }
        
        // Check if already claimed today
        const sameDay = lastClaim.getDate() === now.getDate() &&
                       lastClaim.getMonth() === now.getMonth() &&
                       lastClaim.getFullYear() === now.getFullYear();
        
        return {
            canClaim: !sameDay,
            streakReset: false,
            nextClaim: sameDay ? this.getNextClaimTime() : null
        };
    };

    model.prototype.claimDailyReward = async function(transaction = null) {
        const check = this.canClaimDaily();
        
        if (!check.canClaim) {
            throw new Error(`Daily reward already claimed. Next claim: ${check.nextClaim}`);
        }

        // Calculate reward
        let baseReward = 100;
        let streakBonus = 0;
        
        if (check.streakReset) {
            this.daily_streak = 1;
        } else {
            this.daily_streak += 1;
            streakBonus = Math.min(this.daily_streak * 10, 500);
        }

        const totalReward = baseReward + streakBonus;
        
        const options = transaction ? { transaction } : {};

        // Update currency
        this.balance += totalReward;
        this.total_earned += totalReward;
        this.last_daily = new Date();
        this.last_transaction = new Date();
        
        await this.save(options);

        logger.info(`[Currencies] Daily reward claimed: User ${this.user_id} received ${totalReward} (streak: ${this.daily_streak})`);

        return {
            success: true,
            reward: totalReward,
            base: baseReward,
            streakBonus,
            streak: this.daily_streak,
            newBalance: this.balance,
            nextClaim: this.getNextClaimTime()
        };
    };

    model.prototype.transferTo = async function(toCurrency, amount, description = "Transfer", transaction = null) {
        if (amount <= 0) {
            throw new Error('Transfer amount must be positive');
        }
        
        if (this.balance < amount) {
            throw new Error('Insufficient balance for transfer');
        }

        if (this.user_id === toCurrency.user_id) {
            throw new Error('Cannot transfer to yourself');
        }

        const options = transaction ? { transaction } : {};

        // Perform transfer
        this.balance -= amount;
        this.total_spent += amount;
        this.last_transaction = new Date();
        
        toCurrency.balance += amount;
        toCurrency.total_earned += amount;
        toCurrency.last_transaction = new Date();
        
        await this.save(options);
        await toCurrency.save(options);

        logger.info(`[Currencies] Transfer: ${this.user_id} -> ${toCurrency.user_id} (${amount})`);

        return {
            success: true,
            amount: amount,
            fromUserId: this.user_id,
            toUserId: toCurrency.user_id,
            fromNewBalance: this.balance,
            toNewBalance: toCurrency.balance,
            description: description
        };
    };

    model.prototype.getTotalWealth = function() {
        return this.balance + this.bank_balance;
    };

    model.prototype.getNetWorth = function() {
        return (this.balance + this.bank_balance) - this.debt;
    };

    model.prototype.getStats = function() {
        return {
            userId: this.user_id,
            balance: this.balance,
            bankBalance: this.bank_balance,
            totalWealth: this.getTotalWealth(),
            debt: this.debt,
            netWorth: this.getNetWorth(),
            dailyStreak: this.daily_streak,
            totalEarned: this.total_earned,
            totalSpent: this.total_spent,
            profit: this.total_earned - this.total_spent,
            lastDaily: this.last_daily,
            lastTransaction: this.last_transaction,
            canClaimDaily: this.canClaimDaily().canClaim
        };
    };

    // Class methods
    model.getWealthyUsers = async function(limit = 10) {
        return await model.findAll({
            order: [[sequelize.literal('balance + bank_balance'), 'DESC']],
            limit: limit,
            include: [{
                model: sequelize.models.Users,
                as: 'user',
                attributes: ['user_id', 'name', 'level']
            }]
        });
    };

    model.getTopSavers = async function(limit = 10) {
        return await model.findAll({
            order: [['bank_balance', 'DESC']],
            limit: limit,
            include: [{
                model: sequelize.models.Users,
                as: 'user',
                attributes: ['user_id', 'name', 'level']
            }]
        });
    };

    model.getDailyClaimStats = async function() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const claimedToday = await model.count({
            where: {
                last_daily: {
                    [sequelize.Sequelize.Op.gte]: today
                }
            }
        });

        const totalUsers = await model.count();
        const claimRate = totalUsers > 0 ? (claimedToday / totalUsers * 100).toFixed(2) : 0;

        return {
            totalUsers,
            claimedToday,
            claimRate: `${claimRate}%`,
            date: today.toISOString().split('T')[0]
        };
    };

    model.applyInterest = async function(rate = 0.05, transaction = null) {
        const options = transaction ? { transaction } : {};

        const [affectedRows] = await model.update({
            bank_balance: sequelize.literal(`bank_balance + (bank_balance * ${rate})`),
            total_earned: sequelize.literal(`total_earned + (bank_balance * ${rate})`),
            last_transaction: new Date()
        }, {
            where: {
                bank_balance: { [sequelize.Sequelize.Op.gt]: 0 }
            },
            ...options
        });

        logger.info(`[Currencies] Applied ${rate * 100}% interest to ${affectedRows} accounts`);

        return {
            success: true,
            affectedAccounts: affectedRows,
            interestRate: rate,
            timestamp: new Date()
        };
    };

    // Helper methods
    model.prototype.getNextClaimTime = function() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow;
    };

    // Hidden fields
    model.hidden = [...BaseModel.hidden];

    return model;
};