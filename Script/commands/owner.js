module.exports = {
    config: {
        name: "owner",
        version: "2.0",
        author: "RANA",
        role: 0,
        category: "info",
        shortDescription: {
            en: "Show bot owner information",
            bn: "বট মালিকের তথ্য দেখান"
        },
        longDescription: {
            en: "Displays information about the bot owner/developer",
            bn: "বট মালিক/ডেভেলপারের তথ্য প্রদর্শন করে"
        },
        guide: {
            en: "{pn}",
            bn: "{pn}"
        },
        cooldown: 5
    },

    onStart: async function({ api, event, config }) {
        try {
            const { threadID, messageID } = event;
            
            const ownerInfo = `
👑 **BOT OWNER INFORMATION** 👑

🤖 **Bot Name:** ${config.botInfo.name}
📊 **Version:** ${config.botInfo.version}

👤 **Developer Details:**
• **Name:** RANA
• **Social Name:** MASTER 🪓
• **Age:** 20 years
• **Status:** Single
• **Education:** SSC Batch 2022
• **Location:** Faridpur, Dhaka, Bangladesh

💼 **Professional Information:**
• **Profession:** Security Field
• **Work Type:** Experiment / Technical Operations
• **Skills:**
  - Video Editing
  - Photo Editing
  - Mobile Technology
  - Online Operations
  - In Training: Cyber Security

🎯 **Goals & Dreams:**
• **Dream:** Become a Professional Developer
• **Project:** Website (Coming Soon)

📞 **Contact Details:**
• **Email:** ranaeditz333@gmail.com
• **Telegram Bot:** @black_lovers1_bot
• **Telegram Profile:** @rana_editz_00
• **Support Channel:** https://t.me/master_account_remover_channel
• **Phone:** 01847634486

🆔 **Bot Owner UID:** 61578706761898

🔰 **Note:** For business inquiries or support, please use the contact methods above.
            `;
            
            // Send owner info
            api.sendMessage(ownerInfo, threadID, messageID);
            
        } catch (error) {
            console.error(error);
            api.sendMessage(
                "❌ Failed to retrieve owner information.",
                event.threadID,
                event.messageID
            );
        }
    }
};