const db = require('../database');
const logger = require('../../utils/log');
const { Op } = require('sequelize');

class CurrencyController {
    constructor() {
        this.minBalance = 0;
        this.maxBalance = 999999999;
        this.dailyReward = 100;
        this.interestRate = 0.05; // 5% interest
    }

    /**
     * Get user currency with caching
     */
    async getUserCurrency(userId, forceRefresh = false) {
        try {
            const cacheKey = `currency_${userId}`;
            
            // Simple in-memory cache
            if (!forceRefresh && global.currencyCache && global.currencyCache[cacheKey]) {
                const cached = global.currencyCache[cacheKey];
                if (Date.now() - cached.timestamp < 60000) { // 1 minute cache
                    return cached.data;
                }
            }

            const user = await db.Users.findOne({ 
                where: { userID: userId },
                include: [{ 
                    model: db.Currencies, 
                    as: 'currency',
                    attributes: ['balance', 'bankBalance', 'debt', 'lastDaily', 'dailyStreak', 'totalEarned', 'totalSpent']
                }]
            });
            
            let currency;
            
            if (!user) {
                currency = await this.createUserCurrency(userId);
            } else {
                currency = user.currency || await this.createUserCurrency(userId);
            }

            // Update cache
            if (!global.currencyCache) global.currencyCache = {};
            global.currencyCache[cacheKey] = {
                data: currency,
                timestamp: Date.now()
            };

            return currency;
        } catch (error) {
            logger.error(`[CurrencyController] getUserCurrency Error: ${error.message}`, {
                userId,
                stack: error.stack
            });
            throw new Error('Failed to fetch user currency');
        }
    }

    /**
     * Create new user currency
     */
    async createUserCurrency(userId, initialBalance = 1000) {
        const transaction = await db.sequelize.transaction();
        
        try {
            // Get or create user
            const [user] = await db.Users.findOrCreate({
                where: { userID: userId },
                defaults: { userID: userId, name: `User_${userId}` },
                transaction
            });

            // Create currency
            const [currency] = await db.Currencies.findOrCreate({
                where: { userId: user.id },
                defaults: {
                    balance: Math.min(initialBalance, this.maxBalance),
                    bankBalance: 0,
                    debt: 0,
                    lastDaily: null,
                    dailyStreak: 0,
                    totalEarned: initialBalance,
                    totalSpent: 0,
                    userId: user.id
                },
                transaction
            });

            await transaction.commit();
            
            logger.info(`[CurrencyController] Created currency for user: ${userId}`, {
                userId,
                initialBalance
            });

            return currency;
        } catch (error) {
            await transaction.rollback();
            logger.error(`[CurrencyController] createUserCurrency Error: ${error.message}`, {
                userId,
                error: error.stack
            });
            throw new Error('Failed to create user currency');
        }
    }

    /**
     * Transfer currency between users
     */
    async transferCurrency(senderId, receiverId, amount, description = "Transfer") {
        if (amount <= 0) {
            throw new Error('Transfer amount must be positive');
        }

        if (amount > this.maxBalance) {
            throw new Error(`Maximum transfer amount is ${this.maxBalance}`);
        }

        const transaction = await db.sequelize.transaction();
        
        try {
            // Get sender currency with lock
            const sender = await db.Users.findOne({
                where: { userID: senderId },
                include: [{
                    model: db.Currencies,
                    as: 'currency',
                    required: true
                }],
                lock: transaction.LOCK.UPDATE,
                transaction
            });

            if (!sender || !sender.currency) {
                throw new Error('Sender not found or has no currency account');
            }

            // Check balance
            if (sender.currency.balance < amount) {
                throw new Error('Insufficient balance for transfer');
            }

            // Get or create receiver currency
            const receiverCurrency = await this.getUserCurrency(receiverId);
            
            // Perform transfer
            await sender.currency.decrement('balance', { by: amount, transaction });
            await sender.currency.increment('totalSpent', { by: amount, transaction });
            
            await receiverCurrency.increment('balance', { by: amount, transaction });
            await receiverCurrency.increment('totalEarned', { by: amount, transaction });

            // Log transaction
            await db.TransactionLogs.create({
                type: 'transfer',
                fromUserId: sender.id,
                toUserId: receiverCurrency.userId,
                amount: amount,
                description: description,
                status: 'completed',
                metadata: {
                    senderId: senderId,
                    receiverId: receiverId
                }
            }, { transaction });

            await transaction.commit();

            // Clear cache
            this.clearCache(senderId);
            this.clearCache(receiverId);

            logger.info(`[CurrencyController] Transfer completed: ${senderId} -> ${receiverId} (${amount})`);

            return {
                success: true,
                amount: amount,
                senderNewBalance: sender.currency.balance - amount,
                receiverNewBalance: receiverCurrency.balance + amount,
                transactionId: Date.now()
            };
        } catch (error) {
            await transaction.rollback();
            logger.error(`[CurrencyController] transferCurrency Error: ${error.message}`, {
                senderId,
                receiverId,
                amount,
                error: error.stack
            });
            throw error;
        }
    }

    /**
     * Deposit to bank
     */
    async depositToBank(userId, amount) {
        if (amount <= 0) {
            throw new Error('Deposit amount must be positive');
        }

        const transaction = await db.sequelize.transaction();
        
        try {
            const currency = await this.getUserCurrency(userId);
            
            if (currency.balance < amount) {
                throw new Error('Insufficient balance for deposit');
            }

            // Update balances
            await currency.decrement('balance', { by: amount, transaction });
            await currency.increment('bankBalance', { by: amount, transaction });

            // Log transaction
            await db.TransactionLogs.create({
                type: 'deposit',
                fromUserId: currency.userId,
                toUserId: currency.userId,
                amount: amount,
                description: 'Bank Deposit',
                status: 'completed',
                metadata: { bankTransaction: true }
            }, { transaction });

            await transaction.commit();
            this.clearCache(userId);

            logger.info(`[CurrencyController] Deposit to bank: ${userId} deposited ${amount}`);

            return {
                success: true,
                amount: amount,
                newBalance: currency.balance - amount,
                newBankBalance: currency.bankBalance + amount
            };
        } catch (error) {
            await transaction.rollback();
            logger.error(`[CurrencyController] depositToBank Error: ${error.message}`, {
                userId,
                amount,
                error: error.stack
            });
            throw error;
        }
    }

    /**
     * Withdraw from bank
     */
    async withdrawFromBank(userId, amount) {
        if (amount <= 0) {
            throw new Error('Withdrawal amount must be positive');
        }

        const transaction = await db.sequelize.transaction();
        
        try {
            const currency = await this.getUserCurrency(userId);
            
            if (currency.bankBalance < amount) {
                throw new Error('Insufficient bank balance');
            }

            // Update balances
            await currency.decrement('bankBalance', { by: amount, transaction });
            await currency.increment('balance', { by: amount, transaction });

            // Log transaction
            await db.TransactionLogs.create({
                type: 'withdrawal',
                fromUserId: currency.userId,
                toUserId: currency.userId,
                amount: amount,
                description: 'Bank Withdrawal',
                status: 'completed',
                metadata: { bankTransaction: true }
            }, { transaction });

            await transaction.commit();
            this.clearCache(userId);

            logger.info(`[CurrencyController] Withdrawal from bank: ${userId} withdrew ${amount}`);

            return {
                success: true,
                amount: amount,
                newBalance: currency.balance + amount,
                newBankBalance: currency.bankBalance - amount
            };
        } catch (error) {
            await transaction.rollback();
            logger.error(`[CurrencyController] withdrawFromBank Error: ${error.message}`, {
                userId,
                amount,
                error: error.stack
            });
            throw error;
        }
    }

    /**
     * Claim daily reward
     */
    async claimDailyReward(userId) {
        const transaction = await db.sequelize.transaction();
        
        try {
            const currency = await this.getUserCurrency(userId);
            const checkResult = this.canClaimDaily(currency.lastDaily);
            
            if (!checkResult.canClaim) {
                throw new Error(`Daily reward already claimed. Next claim: ${checkResult.nextClaim}`);
            }

            // Calculate reward
            let reward = this.dailyReward;
            let streakBonus = 0;
            
            if (checkResult.streakReset) {
                currency.dailyStreak = 1;
            } else {
                currency.dailyStreak += 1;
                streakBonus = Math.min(currency.dailyStreak * 10, 500);
                reward += streakBonus;
            }

            // Update currency
            currency.balance += reward;
            currency.totalEarned += reward;
            currency.lastDaily = new Date();
            
            await currency.save({ transaction });

            // Log transaction
            await db.TransactionLogs.create({
                type: 'daily_reward',
                fromUserId: null,
                toUserId: currency.userId,
                amount: reward,
                description: `Daily Reward (Streak: ${currency.dailyStreak})`,
                status: 'completed',
                metadata: {
                    streak: currency.dailyStreak,
                    baseReward: this.dailyReward,
                    streakBonus: streakBonus
                }
            }, { transaction });

            await transaction.commit();
            this.clearCache(userId);

            logger.info(`[CurrencyController] Daily reward claimed: ${userId} received ${reward} (streak: ${currency.dailyStreak})`);

            return {
                success: true,
                reward: reward,
                baseReward: this.dailyReward,
                streakBonus: streakBonus,
                streak: currency.dailyStreak,
                newBalance: currency.balance,
                nextClaim: this.getNextClaimTime()
            };
        } catch (error) {
            await transaction.rollback();
            logger.error(`[CurrencyController] claimDailyReward Error: ${error.message}`, {
                userId,
                error: error.stack
            });
            throw error;
        }
    }

    /**
     * Check if user can claim daily reward
     */
    canClaimDaily(lastDaily) {
        if (!lastDaily) {
            return {
                canClaim: true,
                streakReset: false,
                nextClaim: null
            };
        }
        
        const lastClaim = new Date(lastDaily);
        const now = new Date();
        const hoursDiff = (now - lastClaim) / (1000 * 60 * 60);
        
        // Reset streak if more than 48 hours passed
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
    }

    /**
     * Get leaderboard
     */
    async getLeaderboard(type = 'balance', limit = 10, offset = 0) {
        try {
            let orderField;
            switch (type) {
                case 'bank':
                    orderField = 'bankBalance';
                    break;
                case 'total':
                    orderField = [db.sequelize.literal('balance + bankBalance'), 'DESC'];
                    break;
                case 'earned':
                    orderField = 'totalEarned';
                    break;
                default:
                    orderField = 'balance';
            }

            const leaderboard = await db.Currencies.findAll({
                include: [{
                    model: db.Users,
                    attributes: ['userID', 'name'],
                    required: true
                }],
                order: Array.isArray(orderField) ? orderField : [[orderField, 'DESC']],
                limit: Math.min(limit, 100),
                offset: offset,
                attributes: ['balance', 'bankBalance', 'totalEarned', 'totalSpent']
            });

            return leaderboard.map((item, index) => ({
                rank: offset + index + 1,
                userId: item.User.userID,
                name: item.User.name,
                balance: item.balance,
                bankBalance: item.bankBalance,
                total: item.balance + item.bankBalance,
                totalEarned: item.totalEarned,
                totalSpent: item.totalSpent,
                netWorth: item.totalEarned - item.totalSpent
            }));
        } catch (error) {
            logger.error(`[CurrencyController] getLeaderboard Error: ${error.message}`, {
                type,
                limit,
                error: error.stack
            });
            throw new Error('Failed to fetch leaderboard');
        }
    }

    /**
     * Get user financial stats
     */
    async getUserStats(userId) {
        try {
            const currency = await this.getUserCurrency(userId);
            const user = await db.Users.findOne({ where: { userID: userId } });
            
            // Get transaction history
            const transactions = await db.TransactionLogs.findAll({
                where: {
                    [Op.or]: [
                        { fromUserId: user.id },
                        { toUserId: user.id }
                    ]
                },
                order: [['createdAt', 'DESC']],
                limit: 10,
                include: [
                    {
                        model: db.Users,
                        as: 'fromUser',
                        attributes: ['userID', 'name']
                    },
                    {
                        model: db.Users,
                        as: 'toUser',
                        attributes: ['userID', 'name']
                    }
                ]
            });

            const dailyCheck = this.canClaimDaily(currency.lastDaily);

            return {
                userId: userId,
                name: user?.name || `User_${userId}`,
                balance: currency.balance,
                bankBalance: currency.bankBalance,
                total: currency.balance + currency.bankBalance,
                debt: currency.debt,
                dailyStreak: currency.dailyStreak,
                totalEarned: currency.totalEarned,
                totalSpent: currency.totalSpent,
                netWorth: currency.totalEarned - currency.totalSpent,
                lastDaily: currency.lastDaily,
                canClaimDaily: dailyCheck.canClaim,
                nextDailyClaim: dailyCheck.nextClaim,
                recentTransactions: transactions.map(t => ({
                    type: t.type,
                    amount: t.amount,
                    description: t.description,
                    date: t.createdAt,
                    from: t.fromUser?.userID === userId ? 'You' : t.fromUser?.name,
                    to: t.toUser?.userID === userId ? 'You' : t.toUser?.name
                }))
            };
        } catch (error) {
            logger.error(`[CurrencyController] getUserStats Error: ${error.message}`, {
                userId,
                error: error.stack
            });
            throw new Error('Failed to fetch user stats');
        }
    }

    /**
     * Apply bank interest (run daily)
     */
    async applyBankInterest() {
        try {
            const result = await db.sequelize.query(`
                UPDATE currencies 
                SET bankBalance = bankBalance + (bankBalance * ?),
                    totalEarned = totalEarned + (bankBalance * ?)
                WHERE bankBalance > 0
            `, {
                replacements: [this.interestRate / 365, this.interestRate / 365],
                type: db.sequelize.QueryTypes.UPDATE
            });

            logger.info(`[CurrencyController] Applied bank interest to ${result[1]} accounts`);
            
            // Clear all cache
            if (global.currencyCache) {
                global.currencyCache = {};
            }

            return {
                success: true,
                affectedAccounts: result[1],
                interestRate: this.interestRate
            };
        } catch (error) {
            logger.error(`[CurrencyController] applyBankInterest Error: ${error.message}`, {
                error: error.stack
            });
            throw error;
        }
    }

    /**
     * Clear cache for user
     */
    clearCache(userId) {
        if (global.currencyCache) {
            delete global.currencyCache[`currency_${userId}`];
        }
    }

    /**
     * Helper: Get next claim time
     */
    getNextClaimTime() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow;
    }

    /**
     * Reset all currencies (admin only)
     */
    async resetAllCurrencies(newBalance = 1000) {
        const transaction = await db.sequelize.transaction();
        
        try {
            await db.Currencies.update({
                balance: Math.min(newBalance, this.maxBalance),
                bankBalance: 0,
                debt: 0,
                lastDaily: null,
                dailyStreak: 0,
                totalEarned: newBalance,
                totalSpent: 0
            }, {
                where: {},
                transaction
            });

            await transaction.commit();
            
            // Clear all cache
            if (global.currencyCache) {
                global.currencyCache = {};
            }

            logger.warn(`[CurrencyController] All currencies reset to ${newBalance}`);

            return {
                success: true,
                newBalance: newBalance,
                message: 'All currencies have been reset'
            };
        } catch (error) {
            await transaction.rollback();
            logger.error(`[CurrencyController] resetAllCurrencies Error: ${error.message}`, {
                error: error.stack
            });
            throw error;
        }
    }

    /**
     * Get system economy stats
     */
    async getEconomyStats() {
        try {
            const stats = await db.Currencies.findAll({
                attributes: [
                    [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'totalUsers'],
                    [db.sequelize.fn('SUM', db.sequelize.col('balance')), 'totalBalance'],
                    [db.sequelize.fn('SUM', db.sequelize.col('bankBalance')), 'totalBankBalance'],
                    [db.sequelize.fn('SUM', db.sequelize.col('totalEarned')), 'totalEarned'],
                    [db.sequelize.fn('SUM', db.sequelize.col('totalSpent')), 'totalSpent'],
                    [db.sequelize.fn('AVG', db.sequelize.col('balance')), 'avgBalance'],
                    [db.sequelize.fn('MAX', db.sequelize.col('balance')), 'maxBalance']
                ]
            });

            const richest = await db.Currencies.findOne({
                order: [['balance', 'DESC']],
                include: [{
                    model: db.Users,
                    attributes: ['userID', 'name']
                }]
            });

            return {
                timestamp: new Date(),
                totalUsers: stats[0].get('totalUsers') || 0,
                totalMoneyInCirculation: (stats[0].get('totalBalance') || 0) + (stats[0].get('totalBankBalance') || 0),
                totalBalance: stats[0].get('totalBalance') || 0,
                totalBankBalance: stats[0].get('totalBankBalance') || 0,
                totalEarned: stats[0].get('totalEarned') || 0,
                totalSpent: stats[0].get('totalSpent') || 0,
                averageBalance: Math.round(stats[0].get('avgBalance') || 0),
                maxBalance: stats[0].get('maxBalance') || 0,
                richestUser: richest ? {
                    userId: richest.User.userID,
                    name: richest.User.name,
                    balance: richest.balance
                } : null,
                dailyReward: this.dailyReward,
                interestRate: this.interestRate
            };
        } catch (error) {
            logger.error(`[CurrencyController] getEconomyStats Error: ${error.message}`, {
                error: error.stack
            });
            throw new Error('Failed to fetch economy stats');
        }
    }
}

// Singleton instance
module.exports = new CurrencyController();