module.exports = {
    config: {
        name: "deposit",
        aliases: ["dep"],
        version: "1.0",
        author: "RANA",
        role: 0,
        category: "economy",
        shortDescription: {
            en: "Deposit money to bank",
            bn: "ব্যাংকে টাকা জমা দিন"
        },
        longDescription: {
            en: "Deposit your coins to the bank for safekeeping. Bank deposits are safe from theft.",
            bn: "আপনার কয়েনগুলি নিরাপদে রাখার জন্য ব্যাংকে জমা দিন। ব্যাংক জমা চুরি থেকে নিরাপদ।"
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
                return showDepositHelp(api, threadID, messageID);
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
                amount = user.money;
            } else if (amountArg === 'half') {
                amount = Math.floor(user.money / 2);
            } else {
                amount = parseInt(amountArg);
                
                if (isNaN(amount) || amount <= 0) {
                    return api.sendMessage(
                        "❌ Please enter a valid amount to deposit.\n" +
                        "Example: .deposit 100 or .deposit all",
                        threadID,
                        messageID
                    );
                }
            }
            
            // Check if user has enough money
            if (amount > user.money) {
                return api.sendMessage(
                    `❌ You don't have enough coins to deposit ${amount}.\n` +
                    `Your current balance: ${user.money} coins`,
                    threadID,
                    messageID
                );
            }
            
            // Deposit money
            const success = user.deposit(amount);
            
            if (!success) {
                return api.sendMessage(
                    "❌ Deposit failed. Please try again.",
                    threadID,
                    messageID
                );
            }
            
            await user.save();
            
            // Send confirmation
            const message = `
✅ **DEPOSIT SUCCESSFUL!** ✅

💰 **Transaction Details:**
• Amount Deposited: ${amount} coins
• Bank Fee: 0 coins (Free service!)
• Net Deposit: ${amount} coins

📊 **Your New Balances:**
• Cash: ${user.money} coins
• Bank: ${user.bank} coins
• **Total:** ${user.money + user.bank} coins

🏦 **Bank Security:**
• Bank deposits are safe from theft
• No interest earned (for now)
• Withdraw anytime using ${global.config.prefix}withdraw

💡 **Tip:** Keep some cash for daily expenses!
            `;
            
            api.sendMessage(message, threadID, messageID);
            
        } catch (error) {
            console.error(error);
            api.sendMessage(
                "❌ Deposit failed.",
                event.threadID,
                event.messageID
            );
        }
    }
};

function showDepositHelp(api, threadID, messageID) {
    const message = `
🏦 **BANK DEPOSIT SYSTEM** 🏦

📝 **Usage:**
• ${global.config.prefix}deposit [amount] - Deposit specific amount
• ${global.config.prefix}deposit all - Deposit all coins
• ${global.config.prefix}deposit half - Deposit half of your coins

📌 **Examples:**
• ${global.config.prefix}deposit 500
• ${global.config.prefix}deposit all
• ${global.config.prefix}deposit half

🔒 **Bank Features:**
• Safe from theft and robbery
• Free deposits and withdrawals
• No minimum balance required
• Accessible anytime

💡 **Tip:** Keep your coins safe in the bank!
    `;
    
    api.sendMessage(message, threadID, messageID);
}