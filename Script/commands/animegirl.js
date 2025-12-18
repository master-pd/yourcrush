const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

module.exports = {
    config: {
        name: "animegirl",
        version: "2.0",
        author: "RANA",
        countDown: 15,
        role: 0,
        shortDescription: {
            en: "Get random anime girl images",
            bn: "এনিমে মেয়ের ছবি পান"
        },
        longDescription: {
            en: "Get random high-quality anime girl images from various sources",
            bn: "বিভিন্ন উৎস থেকে উচ্চ-গুণমানের এনিমে মেয়ের ছবি পান"
        },
        category: "anime",
        guide: {
            en: "{pn} [category]",
            bn: "{pn} [বিভাগ]"
        }
    },

    onStart: async function ({ api, event, args, message, getLang }) {
        const category = args[0] || 'random';

        try {
            await message.reply(getLang("searching", { category }));
            
            const imageUrl = await getAnimeGirlImage(category);
            
            if (!imageUrl) {
                return message.reply(getLang("notFound"));
            }

            const tempPath = await downloadImage(imageUrl);
            
            await message.reply({
                body: getLang("success", { category }),
                attachment: fs.createReadStream(tempPath)
            });
            
            fs.unlinkSync(tempPath);

        } catch (error) {
            console.error('Anime girl command error:', error);
            await message.reply(getLang("error", { error: error.message }));
        }
    },

    langs: {
        en: {
            searching: "🎨 Searching for anime girl image ({category})...",
            success: "🌸 Here's your anime girl image!\nCategory: {category}",
            notFound: "❌ No anime girl images found. Please try another category.",
            categories: "📚 Available Categories:\n\n• waifu\n• neko\n• maid\n• marin-kitagawa\n• mori-calliope\n• raiden-shogun\n• oppai\n• selfies\n• uniform",
            error: "❌ Error: {error}"
        },
        bn: {
            searching: "🎨 এনিমে মেয়ের ছবি খোঁজা হচ্ছে ({category})...",
            success: "🌸 আপনার এনিমে মেয়ের ছবি!\nবিভাগ: {category}",
            notFound: "❌ কোন এনিমে মেয়ের ছবি পাওয়া যায়নি। অন্য একটি বিভাগ চেষ্টা করুন।",
            categories: "📚 উপলব্ধ বিভাগ:\n\n• ওয়াইফু\n• নেকো\n• মেইড\n• মারিন-কিতাগাওয়া\n• মোরি-কালিওপ\n• রাইডেন-শোগুন\n• ওপাই\n• সেলফি\n• ইউনিফর্ম",
            error: "❌ ত্রুটি: {error}"
        }
    }
};

async function getAnimeGirlImage(category) {
    const categories = {
        'waifu': 'https://api.waifu.im/search/?included_tags=waifu',
        'neko': 'https://api.waifu.im/search/?included_tags=neko',
        'maid': 'https://api.waifu.im/search/?included_tags=maid',
        'marin-kitagawa': 'https://api.waifu.im/search/?included_tags=marin-kitagawa',
        'mori-calliope': 'https://api.waifu.im/search/?included_tags=mori-calliope',
        'raiden-shogun': 'https://api.waifu.im/search/?included_tags=raiden-shogun',
        'oppai': 'https://api.waifu.im/search/?included_tags=oppai',
        'selfies': 'https://api.waifu.im/search/?included_tags=selfies',
        'uniform': 'https://api.waifu.im/search/?included_tags=uniform'
    };

    try {
        const apiUrl = categories[category] || 'https://api.waifu.im/search/';
        
        const response = await axios.get(apiUrl, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            },
            timeout: 10000
        });

        if (response.data && response.data.images && response.data.images.length > 0) {
            return response.data.images[0].url;
        }

        throw new Error('No images found');
    } catch (error) {
        console.error('Anime API error:', error);
        
        const fallbackUrls = [
            'https://i.waifu.pics/2Xl7JQ-.jpg',
            'https://i.waifu.pics/ZGJ77YV.jpg',
            'https://i.waifu.pics/SG8U7n4.jpg',
            'https://i.waifu.pics/eFzUXw-.jpg'
        ];
        
        return fallbackUrls[Math.floor(Math.random() * fallbackUrls.length)];
    }
}

async function downloadImage(url) {
    const tempPath = path.join(__dirname, '..', '..', 'cache', `anime_${Date.now()}.jpg`);
    
    const response = await axios({
        url: url,
        method: 'GET',
        responseType: 'stream'
    });

    const writer = fs.createWriteStream(tempPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(tempPath));
        writer.on('error', reject);
    });
}