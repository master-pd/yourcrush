module.exports = {
    config: {
        name: "adden",
        version: "1.5",
        author: "RANA",
        countDown: 10,
        role: 1,
        shortDescription: {
            en: "Add user to group (English version)",
            bn: "গ্রুপে ব্যবহারকারী যোগ করুন (ইংরেজি সংস্করণ)"
        },
        longDescription: {
            en: "Add user to current group by UID, username or profile link",
            bn: "UID, ইউজারনেম বা প্রোফাইল লিংক দ্বারা বর্তমান গ্রুপে ব্যবহারকারী যোগ করুন"
        },
        category: "group",
        guide: {
            en: "{pn} [userID/username/link]",
            bn: "{pn} [ইউজার আইডি/ইউজারনেম/লিংক]"
        }
    },

    onStart: async function ({ api, event, args, message, getLang }) {
        const { threadID, messageID } = event;
        const userInput = args.join(" ");

        if (!userInput) {
            return message.reply(getLang("noInput"));
        }

        try {
            let userID = await extractUserIDAdvanced(userInput, api);
            
            if (!userID) {
                return message.reply(getLang("invalidInput"));
            }

            await message.reply(getLang("adding", { uid: userID }));

            const result = await api.addUserToGroup(userID, threadID);

            if (result) {
                const userInfo = await api.getUserInfo(userID);
                const userName = userInfo[userID]?.name || userID;

                await message.reply(getLang("added", { 
                    name: userName, 
                    uid: userID,
                    thread: threadID 
                }));
            } else {
                await message.reply(getLang("failed"));
            }

        } catch (error) {
            console.error('Add user error:', error);
            
            if (error.message.includes("Can't add")) {
                await message.reply(getLang("privacyError"));
            } else if (error.message.includes("not found")) {
                await message.reply(getLang("userNotFound"));
            } else if (error.message.includes("already in")) {
                await message.reply(getLang("alreadyInGroup"));
            } else {
                await message.reply(getLang("error", { error: error.message }));
            }
        }
    },

    langs: {
        en: {
            noInput: "❌ Please provide user ID, username or profile link",
            invalidInput: "❌ Invalid input format. Please provide:\n• Facebook User ID (numbers)\n• Username (facebook.com/username)\n• Profile Link",
            adding: "➕ Adding user {uid} to the group...",
            added: "✅ Successfully added user to group!\n\n👤 User: {name}\n🆔 ID: {uid}\n💬 Group ID: {thread}",
            failed: "❌ Failed to add user. Please try again.",
            privacyError: "❌ Cannot add user due to privacy settings.\nThe user may have restricted who can add them to groups.",
            userNotFound: "❌ User not found. Please check the ID/link and try again.",
            alreadyInGroup: "✅ This user is already in the group.",
            error: "❌ Error: {error}"
        },
        bn: {
            noInput: "❌ দয়া করে ইউজার আইডি, ইউজারনেম বা প্রোফাইল লিংক দিন",
            invalidInput: "❌ অবৈধ ইনপুট ফরম্যাট। দয়া করে দিন:\n• ফেসবুক ইউজার আইডি (সংখ্যা)\n• ইউজারনেম (facebook.com/username)\n• প্রোফাইল লিংক",
            adding: "➕ ইউজার {uid} গ্রুপে যোগ করা হচ্ছে...",
            added: "✅ ইউজার সফলভাবে গ্রুপে যোগ করা হয়েছে!\n\n👤 ব্যবহারকারী: {name}\n🆔 আইডি: {uid}\n💬 গ্রুপ আইডি: {thread}",
            failed: "❌ ইউজার যোগ করতে ব্যর্থ হয়েছে। আবার চেষ্টা করুন।",
            privacyError: "❌ গোপনীয়তা সেটিংসের কারণে ইউজার যোগ করা যাচ্ছে না।\nব্যবহারকারী সীমিত করে দিয়েছেন কে তাকে গ্রুপে যোগ করতে পারবে।",
            userNotFound: "❌ ইউজার খুঁজে পাওয়া যায়নি। আইডি/লিংক চেক করুন এবং আবার চেষ্টা করুন।",
            alreadyInGroup: "✅ এই ইউজার ইতিমধ্যে গ্রুপে আছেন।",
            error: "❌ ত্রুটি: {error}"
        }
    }
};

async function extractUserIDAdvanced(input, api) {
    if (/^\d+$/.test(input)) {
        return input;
    }
    
    const patterns = [
        /facebook\.com\/([^\/?&]+)/,
        /fb\.me\/([^\/?&]+)/,
        /m\.facebook\.com\/([^\/?&]+)/,
        /mbasic\.facebook\.com\/([^\/?&]+)/
    ];
    
    for (const pattern of patterns) {
        const match = input.match(pattern);
        if (match) {
            const identifier = match[1];
            
            if (/^\d+$/.test(identifier)) {
                return identifier;
            }
            
            try {
                const searchResult = await api.searchUsers(identifier);
                if (searchResult && searchResult[0]) {
                    return searchResult[0].userID;
                }
            } catch (error) {
                console.error('User search error:', error);
            }
        }
    }
    
    if (input.includes('profile.php?id=')) {
        const idMatch = input.match(/id=(\d+)/);
        if (idMatch) {
            return idMatch[1];
        }
    }
    
    return null;
}