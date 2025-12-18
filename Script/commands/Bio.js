module.exports = {
    config: {
        name: "bio",
        version: "1.5",
        author: "RANA",
        countDown: 5,
        role: 2,
        shortDescription: {
            en: "Change Facebook bio",
            bn: "ফেসবুক বায়ো পরিবর্তন করুন"
        },
        longDescription: {
            en: "Change the bot's Facebook bio text",
            bn: "বটের ফেসবুক বায়ো টেক্সট পরিবর্তন করুন"
        },
        category: "bot",
        guide: {
            en: "{pn} [new bio text]",
            bn: "{pn} [নতুন বায়ো টেক্সট]"
        }
    },

    onStart: async function ({ api, event, args, message, getLang }) {
        const bioText = args.join(" ");

        if (!bioText) {
            return message.reply(getLang("noText"));
        }

        if (bioText.length > 100) {
            return message.reply(getLang("tooLong"));
        }

        try {
            await api.changeBio(bioText, true);
            
            const newBio = await getCurrentBio(api);
            
            await message.reply(getLang("success", { 
                bio: newBio || bioText 
            }));

        } catch (error) {
            console.error('Bio change error:', error);
            await message.reply(getLang("error", { error: error.message }));
        }
    },

    langs: {
        en: {
            noText: "❌ Please provide bio text",
            tooLong: "❌ Bio text is too long (max 100 characters)",
            success: "✅ Bio updated successfully!\n\n📝 New Bio:\n{bio}",
            error: "❌ Error: {error}"
        },
        bn: {
            noText: "❌ দয়া করে বায়ো টেক্সট দিন",
            tooLong: "❌ বায়ো টেক্সট খুব দীর্ঘ (সর্বাধিক ১০০ অক্ষর)",
            success: "✅ বায়ো সফলভাবে আপডেট হয়েছে!\n\n📝 নতুন বায়ো:\n{bio}",
            error: "❌ ত্রুটি: {error}"
        }
    }
};

async function getCurrentBio(api) {
    try {
        const profile = await api.getUserInfo(api.getCurrentUserID());
        return profile[api.getCurrentUserID()]?.bio || null;
    } catch {
        return null;
    }
}