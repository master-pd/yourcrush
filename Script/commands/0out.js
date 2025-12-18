module.exports = {
    config: {
        name: "0out",
        version: "1.3",
        author: "RANA",
        countDown: 10,
        role: 2,
        shortDescription: {
            en: "Leave all groups",
            bn: "সব গ্রুপ থেকে বের হন"
        },
        longDescription: {
            en: "Leave all groups except current thread",
            bn: "বর্তমান থ্রেড বাদে সব গ্রুপ থেকে বের হন"
        },
        category: "admin",
        guide: {
            en: "{pn}",
            bn: "{pn}"
        }
    },

    onStart: async function ({ api, event, message, getLang }) {
        const { threadID, messageID } = event;
        
        try {
            await message.reply(getLang("processing"));
            
            const allThreads = await api.getThreadList(100, null, ['INBOX']);
            let successCount = 0;
            let failCount = 0;
            const currentThreadID = threadID;

            const groupThreads = allThreads.filter(thread => 
                thread.isGroup && thread.threadID !== currentThreadID
            );

            if (groupThreads.length === 0) {
                return message.reply(getLang("noGroups"));
            }

            for (const thread of groupThreads) {
                try {
                    await api.removeUserFromGroup(api.getCurrentUserID(), thread.threadID);
                    successCount++;
                    
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    failCount++;
                    console.error(`Failed to leave group ${thread.threadID}:`, error.message);
                }
            }

            const resultMessage = getLang("result", {
                success: successCount,
                fail: failCount,
                total: groupThreads.length
            });
            
            await message.reply(resultMessage);

        } catch (error) {
            await message.reply(getLang("error", { error: error.message }));
        }
    },

    langs: {
        en: {
            processing: "⏳ Leaving all groups... Please wait",
            noGroups: "📭 No other groups found to leave",
            result: "✅ Successfully left {success} groups\n❌ Failed to leave {fail} groups\n📊 Total groups processed: {total}",
            error: "❌ Error: {error}"
        },
        bn: {
            processing: "⏳ সব গ্রুপ থেকে বের হচ্ছি... অপেক্ষা করুন",
            noGroups: "📭 বের হওয়ার মত অন্য কোন গ্রুপ নেই",
            result: "✅ সফলভাবে বের হয়েছে {success} টি গ্রুপ\n❌ ব্যর্থ হয়েছে {fail} টি গ্রুপ\n📊 মোট গ্রুপ: {total}",
            error: "❌ ত্রুটি: {error}"
        }
    }
};