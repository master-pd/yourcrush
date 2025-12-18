module.exports = {
    config: {
        name: "add",
        version: "2.0",
        author: "RANA",
        countDown: 10,
        role: 1,
        shortDescription: {
            en: "Add user to group",
            bn: "গ্রুপে ব্যবহারকারী যোগ করুন"
        },
        longDescription: {
            en: "Add user to current group by UID or profile link",
            bn: "UID বা প্রোফাইল লিংক দ্বারা বর্তমান গ্রুপে ব্যবহারকারী যোগ করুন"
        },
        category: "group",
        guide: {
            en: "{pn} [userID/profile link]",
            bn: "{pn} [ইউজার আইডি/প্রোফাইল লিংক]"
        }
    },

    onStart: async function ({ api, event, args, message, getLang }) {
        const { threadID, messageID } = event;
        const userInput = args[0];

        if (!userInput) {
            return message.reply(getLang("noInput"));
        }

        try {
            let userID = extractUserID(userInput);
            
            if (!userID) {
                return message.reply(getLang("invalidInput"));
            }

            await message.reply(getLang("adding", { uid: userID }));

            await api.addUserToGroup(userID, threadID);

            const userInfo = await api.getUserInfo(userID);
            const userName = userInfo[userID]?.name || userID;

            await message.reply(getLang("added", { name: userName, uid: userID }));

        } catch (error) {
            console.error('Add user error:', error);
            
            if (error.message.includes("Can't add")) {
                await message.reply(getLang("cannotAdd"));
            } else if (error.message.includes("not found")) {
                await message.reply(getLang("userNotFound"));
            } else {
                await message.reply(getLang("error", { error: error.message }));
            }
        }
    },

    langs: {
        en: {
            noInput: "❌ Please provide user ID or profile link",
            invalidInput: "❌ Invalid user ID or link format",
            adding: "➕ Adding user {uid} to group...",
            added: "✅ User added successfully!\n👤 Name: {name}\n🆔 ID: {uid}",
            cannotAdd: "❌ Cannot add this user. They may have privacy settings enabled.",
            userNotFound: "❌ User not found",
            error: "❌ Error: {error}"
        },
        bn: {
            noInput: "❌ দয়া করে ইউজার আইডি বা প্রোফাইল লিংক দিন",
            invalidInput: "❌ অবৈধ ইউজার আইডি বা লিংক ফরম্যাট",
            adding: "➕ ইউজার {uid} গ্রুপে যোগ করা হচ্ছে...",
            added: "✅ ইউজার সফলভাবে যোগ করা হয়েছে!\n👤 নাম: {name}\n🆔 আইডি: {uid}",
            cannotAdd: "❌ এই ইউজার যোগ করা যাচ্ছে না। তাদের গোপনীয়তা সেটিংস চালু থাকতে পারে।",
            userNotFound: "❌ ইউজার খুঁজে পাওয়া যায়নি",
            error: "❌ ত্রুটি: {error}"
        }
    }
};

function extractUserID(input) {
    if (/^\d+$/.test(input)) {
        return input;
    }
    
    const facebookRegex = /(?:https?:\/\/)?(?:www\.)?facebook\.com\/(?:\?id=)?([^\/?&]+)/;
    const match = input.match(facebookRegex);
    
    if (match) {
        const id = match[1];
        if (/^\d+$/.test(id)) {
            return id;
        }
    }
    
    const mBasicRegex = /(?:https?:\/\/)?(?:www\.)?mbasic\.facebook\.com\/(?:\?id=)?([^\/?&]+)/;
    const mBasicMatch = input.match(mBasicRegex);
    
    if (mBasicMatch) {
        const id = mBasicMatch[1];
        if (/^\d+$/.test(id)) {
            return id;
        }
    }
    
    return null;
}