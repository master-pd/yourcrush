const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
    config: {
        name: "alllin",
        version: "2.0",
        author: "RANA",
        countDown: 15,
        role: 0,
        shortDescription: {
            en: "Extract all links from webpage",
            bn: "ওয়েবপৃষ্ঠা থেকে সব লিংক এক্সট্র্যাক্ট করুন"
        },
        longDescription: {
            en: "Extract and display all links from any webpage URL",
            bn: "যেকোনো ওয়েবপৃষ্ঠা URL থেকে সব লিংক এক্সট্র্যাক্ট এবং প্রদর্শন করুন"
        },
        category: "tools",
        guide: {
            en: "{pn} [URL]",
            bn: "{pn} [ইউআরএল]"
        }
    },

    onStart: async function ({ api, event, args, message, getLang }) {
        const url = args[0];

        if (!url) {
            return message.reply(getLang("noUrl"));
        }

        if (!isValidUrl(url)) {
            return message.reply(getLang("invalidUrl"));
        }

        try {
            await message.reply(getLang("extracting", { url }));

            const links = await extractAllLinks(url);
            
            if (links.length === 0) {
                return message.reply(getLang("noLinks"));
            }

            let response = getLang("resultHeader", { 
                url: url, 
                count: links.length 
            });
            
            links.forEach((link, index) => {
                response += `${index + 1}. ${link.text || 'No Text'}\n`;
                response += `   ↳ ${link.href}\n`;
                
                if (link.type) {
                    response += `   ↳ Type: ${link.type}\n`;
                }
                
                response += '\n';
            });

            if (links.length > 20) {
                response += getLang("truncated", { total: links.length });
            }

            await message.reply(response);

        } catch (error) {
            console.error('Link extraction error:', error);
            await message.reply(getLang("error", { error: error.message }));
        }
    },

    langs: {
        en: {
            noUrl: "❌ Please provide a URL",
            invalidUrl: "❌ Invalid URL format",
            extracting: "🔗 Extracting links from: {url}...",
            noLinks: "❌ No links found on this page",
            resultHeader: "🔗 Links found on: {url}\n\n📊 Total links: {count}\n\n",
            truncated: "\n─\n💡 Showing first 20 links out of {total}",
            error: "❌ Error: {error}"
        },
        bn: {
            noUrl: "❌ দয়া করে একটি ইউআরএল দিন",
            invalidUrl: "❌ অবৈধ ইউআরএল ফরম্যাট",
            extracting: "🔗 লিংক এক্সট্র্যাক্ট করা হচ্ছে: {url}...",
            noLinks: "❌ এই পৃষ্ঠায় কোন লিংক পাওয়া যায়নি",
            resultHeader: "🔗 লিংক পাওয়া গেছে: {url}\n\n📊 মোট লিংক: {count}\n\n",
            truncated: "\n─\n💡 মোট {total} টির মধ্যে প্রথম ২০টি লিংক দেখানো হচ্ছে",
            error: "❌ ত্রুটি: {error}"
        }
    }
};

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

async function extractAllLinks(url) {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);
        const links = [];

        $('a').each((index, element) => {
            const href = $(element).attr('href');
            const text = $(element).text().trim();
            
            if (href && (href.startsWith('http') || href.startsWith('https') || href.startsWith('//'))) {
                const fullUrl = href.startsWith('//') ? 'https:' + href : href;
                
                let type = 'Unknown';
                if (fullUrl.includes('.pdf')) type = 'PDF';
                else if (fullUrl.includes('.jpg') || fullUrl.includes('.png') || fullUrl.includes('.gif')) type = 'Image';
                else if (fullUrl.includes('.mp4') || fullUrl.includes('.avi') || fullUrl.includes('.mov')) type = 'Video';
                else if (fullUrl.includes('.mp3') || fullUrl.includes('.wav')) type = 'Audio';
                else if (fullUrl.includes('.zip') || fullUrl.includes('.rar')) type = 'Archive';
                else if (fullUrl.includes('mailto:')) type = 'Email';
                else type = 'Webpage';

                links.push({
                    href: fullUrl,
                    text: text || fullUrl,
                    type: type
                });
            }
        });

        return links.slice(0, 20);
    } catch (error) {
        console.error('Link extraction failed:', error);
        return [];
    }
}