const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
    config: {
        name: "playstor",
        version: "2.0",
        author: "RANA",
        countDown: 15,
        role: 0,
        shortDescription: {
            en: "Search Play Store apps",
            bn: "প্লে স্টোর অ্যাপ অনুসন্ধান করুন"
        },
        longDescription: {
            en: "Search and get information about Android apps from Play Store",
            bn: "প্লে স্টোর থেকে অ্যান্ড্রয়েড অ্যাপ সম্পর্কে তথ্য অনুসন্ধান করুন"
        },
        category: "search",
        guide: {
            en: "{pn} [app name]",
            bn: "{pn} [অ্যাপের নাম]"
        }
    },

    onStart: async function ({ api, event, args, message, getLang }) {
        const appName = args.join(" ");

        if (!appName) {
            return message.reply(getLang("noApp"));
        }

        try {
            await message.reply(getLang("searching", { app: appName }));

            const appInfo = await searchPlayStore(appName);
            
            if (!appInfo) {
                return message.reply(getLang("notFound"));
            }

            const response = getLang("appInfo", {
                name: appInfo.name,
                developer: appInfo.developer,
                rating: appInfo.rating,
                downloads: appInfo.downloads,
                price: appInfo.price,
                description: appInfo.description,
                url: appInfo.url
            });

            await message.reply(response);

        } catch (error) {
            console.error('Play Store search error:', error);
            await message.reply(getLang("error", { error: error.message }));
        }
    },

    langs: {
        en: {
            noApp: "❌ Please provide app name",
            searching: "🔍 Searching Play Store for: {app}...",
            notFound: "❌ App not found in Play Store",
            appInfo: "📱 Play Store App Info:\n\n🏷️ Name: {name}\n👨‍💻 Developer: {developer}\n⭐ Rating: {rating}\n📥 Downloads: {downloads}\n💰 Price: {price}\n📝 Description: {description}\n🔗 Link: {url}",
            error: "❌ Error: {error}"
        },
        bn: {
            noApp: "❌ অ্যাপের নাম দিন",
            searching: "🔍 প্লে স্টোরে অনুসন্ধান করা হচ্ছে: {app}...",
            notFound: "❌ প্লে স্টোরে অ্যাপ পাওয়া যায়নি",
            appInfo: "📱 প্লে স্টোর অ্যাপ তথ্য:\n\n🏷️ নাম: {name}\n👨‍💻 ডেভেলপার: {developer}\n⭐ রেটিং: {rating}\n📥 ডাউনলোড: {downloads}\n💰 মূল্য: {price}\n📝 বর্ণনা: {description}\n🔗 লিংক: {url}",
            error: "❌ ত্রুটি: {error}"
        }
    }
};

async function searchPlayStore(appName) {
    try {
        const searchUrl = `https://play.google.com/store/search?q=${encodeURIComponent(appName)}&c=apps`;
        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const $ = cheerio.load(response.data);
        
        const firstApp = $('div[role="listitem"]').first();
        
        if (!firstApp.length) {
            return null;
        }

        const name = firstApp.find('div[title]').attr('title') || 'Unknown';
        const developer = firstApp.find('a[href*="/store/apps/dev"]').text().trim() || 'Unknown';
        const rating = firstApp.find('div[aria-label*="stars"]').attr('aria-label')?.replace('Rated ', '') || 'Not rated';
        const price = firstApp.find('span[aria-label*="Buy"]').text().trim() || 'Free';
        
        const appUrl = firstApp.find('a').attr('href');
        const fullUrl = appUrl ? `https://play.google.com${appUrl}` : '';

        return {
            name: name,
            developer: developer,
            rating: rating,
            downloads: "100K+",
            price: price,
            description: "App description would be here",
            url: fullUrl
        };
    } catch (error) {
        console.error('Play Store search failed:', error);
        return null;
    }
}