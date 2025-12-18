module.exports = {
    config: {
        name: "withdraw",
        aliases: ["with"],
        version: "1.0",
        author: "RANA",
        role: 0,
        category: "economy",
        shortDescription: {
            en: "Withdraw money from bank",
            bn: "ব্যাংক থেকে টাকা তুলুন"
        },
        longDescription: {
            en: "Withdraw coins from your bank account to use for purchases and transactions.",
            bn: "ক্রয় এবং লেনদেনের জন্য ব্যবহার করার জন্য আপনার ব্যাংক অ্যাকাউন্ট থেকে কয়েন তুলুন।"
        },
        guide: {
            en: "{pn} [amount] or {pn} all",
            bn: "{pn} [পরিমাণ] অথবা {pn} all"
        },
        cooldown: 5
    },

    onStart: async function({ api, event, args, database }) {
        try {
            const { threadID, messageID, senderID } = event;
            
            if (!database || !database.models) {
                return api.sendMessage(
                    "❌ Database is not available. Please try again later.",
                    threadID,
                    messageID
                );
            }
            
            if (args.length === 0) {
                return showWithdrawHelp(api, threadID, messageID);
            }
            
            const User = database.models.User;
            const user = await User.findByPk(senderID);
            
            if (!user) {
                return api.sendMessage(
                    "❌ User not found. Please try another command first.",
                    threadID,
                    messageID
                );
            }
            
            const amountArg = args[0].toLowerCase();
            let amount;
            
            if (amountArg === 'all') {
                amount = user.bank;
            } else if (amountArg === 'half') {
                amount = Math.floor(user.bank / 2);
            } else {
                amount = parseInt(amountArg);
                
                if (isNaN(amount) || amount <= 0) {
                    return api.sendMessage(
                        "❌ Please enter a valid amount to withdraw.\n" +
                        "Example: .withdraw 100 or .withdraw all",
                        threadID,
                        messageID
                    );
                }
            }
            
            // Check if user has enough in bank
            if (amount > user.bank) {
                return api.sendMessage(
                    `❌ You don't have enough coins in bank to withdraw ${amount}.\n` +
                    `Your bank balance: ${user.bank} coins`,
                    threadID,
                    messageID
                );
            }
            
            // Withdraw money
            const success = user.withdraw(amount);
            
            if (!success) {
                return api.sendMessage(
                    "❌ Withdrawal failed. Please try again.",
                    threadID,
                    messageID
                );
            }
            
            await user.save();
            
            // Send confirmation
            const message = `
✅ **WITHDRAWAL SUCCESSFUL!** ✅

💰 **Transaction Details:**
• Amount Withdrawn: ${amount} coins
• Withdrawal Fee: 0 coins (Free service!)
• Net Withdrawal: ${amount} coins

📊 **Your New Balances:**
• Cash: ${user.money} coins
• Bank: ${user.bank} coins
• **Total:** ${user.money + user.bank} coins

🏦 **Bank Remaining:**
• Available balance: ${user.bank} coins
• Maximum withdrawal: ${user.bank} coins

💡 **Tip:** Use ${global.config.prefix}shop to see what you can buy with your coins!
            `;
            
            api.sendMessage(message, threadID, messageID);
            
        } catch (error) {
            console.error(error);
            api.sendMessage(
                "❌ Withdrawal failed.",
                event.threadID,
                event.messageID
            );
        }
    }
};

function showWithdrawHelp(api, threadID, messageID) {
    const message = `
🏦 **BANK WITHDRAWAL SYSTEM** 🏦

📝 **Usage:**
• ${global.config.prefix}withdraw [amount] - Withdraw specific amount
• ${global.config.prefix}withdraw all - Withdraw all coins
• ${global.config.prefix}withdraw half - Withdraw half of your coins

📌 **Examples:**
• ${global.config.prefix}withdraw 500
• ${global.config.prefix}withdraw all
• ${global.config.prefix}withdraw half

🔒 **Bank Features:**
• Instant withdrawals
• No fees or charges
• No withdrawal limits
• Secure transactions

💡 **Tip:** Keep some money in bank for safety!
    `;
    
    api.sendMessage(message, threadID, messageID);
}