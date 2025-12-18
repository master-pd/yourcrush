module.exports = {
    initialize: (sequelize, DataTypes) => {
        const User = sequelize.define('User', {
            userID: {
                type: DataTypes.STRING,
                primaryKey: true,
                allowNull: false
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            exp: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            level: {
                type: DataTypes.INTEGER,
                defaultValue: 1
            },
            money: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            bank: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            dailyStreak: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            lastDaily: {
                type: DataTypes.DATE
            },
            lastActive: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW
            },
            totalCommands: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            marriedTo: {
                type: DataTypes.STRING,
                defaultValue: null
            },
            marriedSince: {
                type: DataTypes.DATE
            },
            bio: {
                type: DataTypes.TEXT,
                defaultValue: "No bio set"
            },
            background: {
                type: DataTypes.STRING,
                defaultValue: "default"
            },
            title: {
                type: DataTypes.STRING,
                defaultValue: "Newbie"
            },
            banned: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            },
            banReason: {
                type: DataTypes.TEXT
            },
            warningCount: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            settings: {
                type: DataTypes.TEXT,
                defaultValue: '{}',
                get() {
                    const rawValue = this.getDataValue('settings');
                    return rawValue ? JSON.parse(rawValue) : {};
                },
                set(value) {
                    this.setDataValue('settings', JSON.stringify(value));
                }
            },
            inventory: {
                type: DataTypes.TEXT,
                defaultValue: '[]',
                get() {
                    const rawValue = this.getDataValue('inventory');
                    return rawValue ? JSON.parse(rawValue) : [];
                },
                set(value) {
                    this.setDataValue('inventory', JSON.stringify(value));
                }
            }
        }, {
            timestamps: true,
            indexes: [
                {
                    fields: ['level']
                },
                {
                    fields: ['money']
                },
                {
                    fields: ['lastActive']
                }
            ]
        });

        // Instance methods
        User.prototype.addExp = function(amount) {
            this.exp += amount;
            // Level up logic
            const requiredExp = this.level * 100;
            if (this.exp >= requiredExp) {
                this.level += 1;
                this.exp -= requiredExp;
                return { leveledUp: true, newLevel: this.level };
            }
            return { leveledUp: false };
        };

        User.prototype.addMoney = function(amount) {
            this.money += amount;
            if (this.money < 0) this.money = 0;
            return this.money;
        };

        User.prototype.deposit = function(amount) {
            if (amount > this.money) return false;
            this.money -= amount;
            this.bank += amount;
            return true;
        };

        User.prototype.withdraw = function(amount) {
            if (amount > this.bank) return false;
            this.bank -= amount;
            this.money += amount;
            return true;
        };

        User.prototype.canUseDaily = function() {
            if (!this.lastDaily) return true;
            const last = new Date(this.lastDaily);
            const now = new Date();
            return now.getDate() !== last.getDate() || 
                   now.getMonth() !== last.getMonth() || 
                   now.getFullYear() !== last.getFullYear();
        };

        User.prototype.useDaily = function() {
            const now = new Date();
            if (this.canUseDaily()) {
                const last = this.lastDaily ? new Date(this.lastDaily) : null;
                
                if (last && 
                    last.getDate() === now.getDate() - 1 && 
                    last.getMonth() === now.getMonth() && 
                    last.getFullYear() === now.getFullYear()) {
                    // Consecutive day
                    this.dailyStreak += 1;
                } else {
                    // New streak
                    this.dailyStreak = 1;
                }
                
                this.lastDaily = now;
                return {
                    success: true,
                    streak: this.dailyStreak,
                    reward: 100 + (this.dailyStreak * 50)
                };
            }
            return { success: false, streak: this.dailyStreak };
        };

        return User;
    }
};