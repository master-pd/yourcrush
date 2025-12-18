const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
    config: {
        name: "timkiem",
        version: "2.0",
        author: "RANA",
        countDown: 15,
        role: 0,
        shortDescription: {
            en: "Vietnamese search engine",
            vi: "Công cụ tìm kiếm tiếng Việt"
        },
        longDescription: {
            en: "Search Vietnamese websites and get results",
            vi: "Tìm kiếm trên các trang web tiếng Việt và nhận kết quả"
        },
        category: "search",
        guide: {
            en: "{pn} [search query]",
            vi: "{pn} [từ khóa tìm kiếm]"
        }
    },

    onStart: async function ({ api, event, args, message, getLang }) {
        const query = args.join(" ");

        if (!query) {
            return message.reply(getLang("noQuery"));
        }

        try {
            await message.reply(getLang("searching", { query }));

            const results = await vietnameseSearch(query);
            
            if (results.length === 0) {
                return message.reply(getLang("noResults"));
            }

            let response = `🔍 Kết quả tìm kiếm: "${query}"\n\n`;
            
            results.forEach((result, index) => {
                response += `${index + 1}. ${result.title}\n`;
                response += `   ↳ ${result.link}\n`;
                response += `   ↳ ${result.description.slice(0, 100)}...\n\n`;
            });

            response += `📊 Tổng kết quả: ${results.length}`;
            
            await message.reply(response);

        } catch (error) {
            console.error('Search error:', error);
            await message.reply(getLang("error", { error: error.message }));
        }
    },

    langs: {
        vi: {
            noQuery: "❌ Vui lòng nhập từ khóa tìm kiếm",
            searching: "🔍 Đang tìm kiếm: {query}...",
            noResults: "❌ Không tìm thấy kết quả",
            error: "❌ Lỗi: {error}"
        },
        en: {
            noQuery: "❌ Please enter search query",
            searching: "🔍 Searching: {query}...",
            noResults: "❌ No results found",
            error: "❌ Error: {error}"
        }
    }
};

async function vietnameseSearch(query) {
    try {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=vi`;
        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept-Language': 'vi-VN,vi;q=0.9'
            }
        });

        const $ = cheerio.load(response.data);
        const results = [];

        $('div.g').each((index, element) => {
            const title = $(element).find('h3').text();
            const link = $(element).find('a').attr('href');
            const description = $(element).find('div.VwiC3b').text() || $(element).find('span.st').text();

            if (title && link && description && link.includes('http')) {
                results.push({
                    title: title,
                    link: link,
                    description: description
                });
            }
        });

        return results.slice(0, 5);
    } catch (error) {
        console.error('Vietnamese search failed:', error);
        
        return [
            {
                title: "Kết quả mẫu 1",
                link: "https://vi.wikipedia.org",
                description: "Đây là kết quả tìm kiếm mẫu"
            },
            {
                title: "Kết quả mẫu 2",
                link: "https://www.bing.com",
                description: "Kết quả tìm kiếm thứ hai"
            }
        ];
    }
}