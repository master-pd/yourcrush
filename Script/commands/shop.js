module.exports = {
    config: {
        name: "shop",
        version: "2.0",
        author: "RANA",
        role: 0,
        category: "economy",
        shortDescription: {
            en: "View and buy items from shop",
            bn: "দোকান থেকে আইটেম দেখুন এবং কিনুন"
        },
        longDescription: {
            en: "Browse available items in the shop and purchase them using your coins",
            bn: "দোকানে উপলব্ধ আইটেম ব্রাউজ করুন এবং আপনার কয়েন ব্যবহার করে সেগুলি কিনুন"
        },
        guide: {
            en: "{pn} or {pn} buy [item_id]",
            bn: "{pn} অথবা {pn} buy [item_id]"
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
                await showShop(api, threadID, messageID, database, senderID);
            } else if (args[0].toLowerCase() === 'buy') {
                if (args.length < 2) {
                    return api.sendMessage(
                        "❌ Please specify an item ID to buy.\nExample: .shop buy 1",
                        threadID,
                        messageID
                    );
                }
                await buyItem(api, threadID, messageID, database, senderID, args[1]);
            } else if (args[0].toLowerCase() === 'inventory' || args[0].toLowerCase() === 'inv') {
                await showInventory(api, threadID, messageID, database, senderID);
            } else {
                await showShop(api, threadID, messageID, database, senderID);
            }
            
        } catch (error) {
            console.error(error);
            api.sendMessage(
                "❌ Shop command failed.",
                event.threadID,
                event.messageID
            );
        }
    }
};

async function showShop(api, threadID, messageID, database, userID) {
    try {
        const shopItems = [
            {
                id: 1,
                name: "🍎 Apple",
                description: "A fresh red apple. Restores 10 energy.",
                price: 50,
                type: "consumable",
                effect: { energy: 10 }
            },
            {
                id: 2,
                name: "🍔 Burger",
                description: "Delicious burger. Restores 25 energy.",
                price: 120,
                type: "consumable",
                effect: { energy: 25 }
            },
            {
                id: 3,
                name: "💊 Energy Drink",
                description: "Instant energy boost! Restores 50 energy.",
                price: 250,
                type: "consumable",
                effect: { energy: 50 }
            },
            {
                id: 4,
                name: "🔑 Lucky Key",
                description: "A mysterious key. Use for a chance to win big!",
                price: 500,
                type: "consumable",
                effect: { random: true }
            },
            {
                id: 5,
                    name: "🎩 Top Hat",
                description: "Elegant top hat. Increases work earnings by 10%.",
                price: 1000,
                type: "equipment",
                effect: { workBonus: 10 }
            },
            {
                id: 6,
                name: "💍 Gold Ring",
                description: "Shiny gold ring. Increases daily reward by 20%.",
                price: 2000,
                type: "equipment",
                effect: { dailyBonus: 20 }
            },
            {
                id: 7,
                name: "🛡️ Shield",
                description: "Protective shield. Prevents theft for 24 hours.",
                price: 1500,
                type: "equipment",
                effect: { antiTheft: 24 }
            },
            {
                id: 8,
                name: "📱 Smartphone",
                description: "Latest smartphone. Unlocks new commands.",
                price: 5000,
                type: "special",
                effect: { unlocks: ["gamble", "lottery"] }
            },
            {
                id: 9,
                name: "🏠 Small House",
                description: "Your own house! Store items safely.",
                price: 10000,
                type: "property",
                effect: { storage: 50 }
            },
            {
                id: 10,
                name: "🚗 Sports Car",
                description: "Fast sports car! Increases travel speed.",
                price: 50000,
                type: "vehicle",
                effect: { speed: 50 }
            }
        ];
        
        // Get user balance
        const User = database.models.User;
        const user = await User.findByPk(userID);
        const balance = user ? user.money : 0;
        
        // Build shop message
        let message = `🛒 **SHOP - Available Items** 🛒\n\n`;
        message += `💰 Your Balance: ${balance} coins\n\n`;
        
        // Display items by category
        const categories = {
            "🥘 Consumables": shopItems.filter(item => item.type === "consumable"),
            "⚔️ Equipment": shopItems.filter(item => item.type === "equipment"),
            "🌟 Special": shopItems.filter(item => item.type === "special" || item.type === "property" || item.type === "vehicle")
        };
        
        for (const [category, items] of Object.entries(categories)) {
            if (items.length > 0) {
                message += `**${category}:**\n`;
                
                items.forEach(item => {
                    const canAfford = balance >= item.price ? "✅" : "❌";
                    message += `${item.id}. ${item.name} - ${item.price} coins ${canAfford}\n`;
                    message += `   ${item.description}\n\n`;
                });
            }
        }
        
        message += `📝 **How to Buy:**\n`;
        message += `• ${global.config.prefix}shop buy [item_id] - Buy an item\n`;
        message += `• ${global.config.prefix}shop inventory - View your inventory\n`;
        message += `• Example: ${global.config.prefix}shop buy 1\n\n`;
        
        message += `💡 **Tip:** Some items provide permanent bonuses!`;
        
        api.sendMessage(message, threadID, messageID);
        
    } catch (error) {
        console.error(error);
        api.sendMessage("❌ Failed to load shop.", threadID, messageID);
    }
}

async function buyItem(api, threadID, messageID, database, userID, itemId) {
    try {
        const itemIdNum = parseInt(itemId);
        
        if (isNaN(itemIdNum)) {
            return api.sendMessage(
                "❌ Invalid item ID. Please provide a number.",
                threadID,
                messageID
            );
        }
        
        const shopItems = [
            { id: 1, name: "🍎 Apple", price: 50 },
            { id: 2, name: "🍔 Burger", price: 120 },
            { id: 3, name: "💊 Energy Drink", price: 250 },
            { id: 4, name: "🔑 Lucky Key", price: 500 },
            { id: 5, name: "🎩 Top Hat", price: 1000 },
            { id: 6, name: "💍 Gold Ring", price: 2000 },
            { id: 7, name: "🛡️ Shield", price: 1500 },
            { id: 8, name: "📱 Smartphone", price: 5000 },
            { id: 9, name: "🏠 Small House", price: 10000 },
            { id: 10, name: "🚗 Sports Car", price: 50000 }
        ];
        
        const item = shopItems.find(i => i.id === itemIdNum);
        
        if (!item) {
            return api.sendMessage(
                "❌ Item not found. Please check the item ID.",
                threadID,
                messageID
            );
        }
        
        const User = database.models.User;
        const user = await User.findByPk(userID);
        
        if (!user) {
            return api.sendMessage(
                "❌ User not found. Please try another command first.",
                threadID,
                messageID
            );
        }
        
        // Check if user can afford
        if (user.money < item.price) {
            return api.sendMessage(
                `❌ You cannot afford ${item.name}.\n` +
                `Price: ${item.price} coins\n` +
                `Your balance: ${user.money} coins\n\n` +
                `💡 Earn more coins with ${global.config.prefix}work`,
                threadID,
                messageID
            );
        }
        
        // Check inventory limit
        const inventory = user.inventory || [];
        if (inventory.length >= 20) {
            return api.sendMessage(
                "❌ Your inventory is full! You can only hold 20 items.\n" +
                `Use ${global.config.prefix}shop inventory to view your items.`,
                threadID,
                messageID
            );
        }
        
        // Check if already owns the item (for unique items)
        const alreadyOwns = inventory.some(i => i.id === item.id && i.type !== "consumable");
        if (alreadyOwns) {
            return api.sendMessage(
                `❌ You already own ${item.name}.\n` +
                `Consumable items can be purchased multiple times.`,
                threadID,
                messageID
            );
        }
        
        // Process purchase
        user.money -= item.price;
        
        // Add to inventory
        const newItem = {
            id: item.id,
            name: item.name,
            type: getItemType(item.id),
            purchased: new Date().toISOString(),
            price: item.price
        };
        
        inventory.push(newItem);
        user.inventory = inventory;
        
        await user.save();
        
        // Send confirmation
        const message = `
✅ **PURCHASE SUCCESSFUL!** ✅

🛍️ **Item Purchased:** ${item.name}
💰 **Price:** ${item.price} coins
💳 **New Balance:** ${user.money} coins

📦 **Added to inventory successfully!**

🔧 **How to Use:**
• Use ${global.config.prefix}shop inventory to view your items
• Some items activate automatically
• Consumables can be used with ${global.config.prefix}use [item]

🎉 **Thank you for your purchase!**
        `;
        
        api.sendMessage(message, threadID, messageID);
        
    } catch (error) {
        console.error(error);
        api.sendMessage("❌ Purchase failed.", threadID, messageID);
    }
}

async function showInventory(api, threadID, messageID, database, userID) {
    try {
        const User = database.models.User;
        const user = await User.findByPk(userID);
        
        if (!user) {
            return api.sendMessage(
                "❌ User not found. Please try another command first.",
                threadID,
                messageID
            );
        }
        
        const inventory = user.inventory || [];
        const balance = user.money;
        
        if (inventory.length === 0) {
            return api.sendMessage(
                `📭 Your inventory is empty!\n\n` +
                `💰 Balance: ${balance} coins\n\n` +
                `🛒 Visit the shop: ${global.config.prefix}shop`,
                threadID,
                messageID
            );
        }
        
        // Categorize items
        const categories = {
            "🥘 Consumables": [],
            "⚔️ Equipment": [],
            "🌟 Special": [],
            "📦 Other": []
        };
        
        inventory.forEach(item => {
            const type = item.type || "other";
            if (type === "consumable") {
                categories["🥘 Consumables"].push(item);
            } else if (type === "equipment") {
                categories["⚔️ Equipment"].push(item);
            } else if (["special", "property", "vehicle"].includes(type)) {
                categories["🌟 Special"].push(item);
            } else {
                categories["📦 Other"].push(item);
            }
        });
        
        // Calculate total value
        const totalValue = inventory.reduce((sum, item) => sum + (item.price || 0), 0);
        
        // Build inventory message
        let message = `📦 **INVENTORY** 📦\n\n`;
        message += `👤 Owner: ${user.name}\n`;
        message += `💰 Balance: ${balance} coins\n`;
        message += `🏷️ Total Items: ${inventory.length}/20\n`;
        message += `💎 Total Value: ${totalValue} coins\n\n`;
        
        // Display items by category
        for (const [category, items] of Object.entries(categories)) {
            if (items.length > 0) {
                message += `**${category} (${items.length}):**\n`;
                
                items.forEach((item, index) => {
                    const purchaseDate = item.purchased ? 
                        new Date(item.purchased).toLocaleDateString() : "Unknown";
                    
                    message += `${index + 1}. ${item.name}\n`;
                    message += `   Value: ${item.price || 0} coins\n`;
                    message += `   Purchased: ${purchaseDate}\n\n`;
                });
            }
        }
        
        message += `📝 **Commands:**\n`;
        message += `• ${global.config.prefix}shop - View shop\n`;
        message += `• ${global.config.prefix}use [item] - Use an item\n`;
        message += `• ${global.config.prefix}gift [@user] [item] - Gift an item\n\n`;
        
        message += `💡 **Tip:** Some items provide passive bonuses!`;
        
        api.sendMessage(message, threadID, messageID);
        
    } catch (error) {
        console.error(error);
        api.sendMessage("❌ Failed to load inventory.", threadID, messageID);
    }
}

function getItemType(itemId) {
    const types = {
        1: "consumable",
        2: "consumable",
        3: "consumable",
        4: "consumable",
        5: "equipment",
        6: "equipment",
        7: "equipment",
        8: "special",
        9: "property",
        10: "vehicle"
    };
    return types[itemId] || "other";
}