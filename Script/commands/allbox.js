module.exports = {
    config: {
        name: "allbox",
        version: "2.0",
        author: "RANA",
        countDown: 10,
        role: 2,
        shortDescription: {
            en: "Show all groups information",
            bn: "সব গ্রুপের তথ্য দেখান"
        },
        longDescription: {
            en: "Display information about all groups the bot is in",
            bn: "বট যেসব গ্রুপে আছে তার সব তথ্য প্রদর্শন করুন"
        },
        category: "admin",
        guide: {
            en: "{pn}",
            bn: "{pn}"
        }
    },

    onStart: async function ({ api, event, message, getLang }) {
        try {
            await message.reply(getLang("loading"));
            
            const allThreads = await api.getThreadList(100, null, ['INBOX']);
            const groupThreads = allThreads.filter(thread => thread.isGroup);
            
            if (groupThreads.length === 0) {
                return message.reply(getLang("noGroups"));
            }
            
            let response = getLang("header", { count: groupThreads.length });
            
            groupThreads.forEach((thread, index) => {
                response += `\n${index + 1}. ${thread.name || 'Unnamed Group'}\n`;
                response += `   ↳ ID: ${thread.threadID}\n`;
                response += `   ↳ Members: ${thread.participantIDs?.length || 0}\n`;
                response += `   ↳ Admin IDs: ${thread.adminIDs?.length || 0}\n`;
                
                if (thread.approvalMode !== undefined) {
                    response += `   ↳ Approval Mode: ${thread.approvalMode ? '✅ On' : '❌ Off'}\n`;
                }
                
                response += `   ↳ Last Activity: ${formatDate(thread.lastMessageTimestamp || thread.updatedTime)}\n`;
            });
            
            response += getLang("footer");
            
            await message.reply(response);
            
        } catch (error) {
            console.error('Allbox command error:', error);
            await message.reply(getLang("error", { error: error.message }));
        }
    },

    langs: {
        en: {
            loading: "📊 Loading all groups information...",
            noGroups: "📭 Bot is not in any groups",
            header: "📦 All Groups Information\n\n📊 Total Groups: {count}\n\n",
            footer: "\n─\n💡 Use .boxinfo [group_id] for detailed information",
            error: "❌ Error: {error}"
        },
        bn: {
            loading: "📊 সব গ্রুপের তথ্য লোড হচ্ছে...",
            noGroups: "📭 বট কোন গ্রুপে নেই",
            header: "📦 সব গ্রুপের তথ্য\n\n📊 মোট গ্রুপ: {count}\n\n",
            footer: "\n─\n💡 বিস্তারিত তথ্যের জন্য .boxinfo [group_id] ব্যবহার করুন",
            error: "❌ ত্রুটি: {error}"
        }
    }
};

function formatDate(timestamp) {
    if (!timestamp) return 'Unknown';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) {
        return `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
        return `${diffHours} hours ago`;
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString();
    }
}