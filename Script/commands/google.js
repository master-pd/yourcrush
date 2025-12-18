const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
    config: {
        name: "google",
        aliases: ["search", "g"],
        version: "2.0",
        author: "RANA",
        role: 0,
        category: "utility",
        shortDescription: {
            en: "Search Google",
            bn: "Google এ সার্চ করুন"
        },
        longDescription: {
            en: "Search Google and get results with links",
            bn: "Google এ সার্চ করুন এবং লিঙ্কসহ ফলাফল পান"
        },
        guide: {
            en: "{pn} [search query]",
            bn: "{pn} [সার্চ কুয়েরি]"
        },
        cooldown: 10
    },

    onStart: async function({ api, event, args }) {
        try {
            const { threadID, messageID } = event;
            
            if (!args.length) {
                return api.sendMessage(
                    "🔍 **Google Search**\n\n" +
                    "Please provide a search query.\n\n" +
                    `📝 **Usage:** ${global.config.prefix}google [query]\n\n` +
                    `📌 **Examples:**\n` +
                    `• ${global.config.prefix}google ChatGPT\n` +
                    `• ${global.config.prefix}google weather in Dhaka\n` +
                    `• ${global.config.prefix}google how to learn programming\n\n` +
                    `🔧 **Features:**\n` +
                    `• Web search results\n` +
                    `• Instant answers\n` +
                    `• Related searches\n` +
                    `• Safe search enabled`,
                    threadID,
                    messageID
                );
            }
            
            const query = args.join(" ");
            
            // Send searching message
            const searchMsg = await api.sendMessage(
                `🔍 Searching Google for: "${query}"...`,
                threadID,
                messageID
            );
            
            // Perform Google search
            const searchResults = await googleSearch(query);
            
            if (!searchResults || searchResults.results.length === 0) {
                api.editMessage(
                    "❌ No results found. Please try different keywords.",
                    searchMsg.messageID
                );
                return;
            }
            
            // Build results message
            const message = buildResultsMessage(searchResults, query);
            
            // Edit message with results
            api.editMessage(message, searchMsg.messageID);
            
        } catch (error) {
            console.error(error);
            api.sendMessage(
                "❌ Search failed. Please try again.",
                event.threadID,
                event.messageID
            );
        }
    }
};

async function googleSearch(query) {
    try {
        // Use Google Custom Search API or scraping
        // Note: You need a Google API key for official API
        
        // Method 1: Using serpapi (if you have API key)
        // Method 2: Using google-it package
        // Method 3: Scraping (simplified)
        
        // For now, use a free API or scraping
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=10`;
        
        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Cache-Control': 'max-age=0',
                'Upgrade-Insecure-Requests': '1'
            }
        });
        
        const $ = cheerio.load(response.data);
        
        const results = [];
        
        // Extract search results
        $('div.g').each((index, element) => {
            if (index >= 8) return false; // Limit to 8 results
            
            const title = $(element).find('h3').text().trim();
            const link = $(element).find('a').attr('href');
            const description = $(element).find('div.VwiC3b').text().trim() || 
                               $(element).find('span.aCOpRe').text().trim();
            
            if (title && link && description) {
                // Clean link (remove /url?q= prefix)
                let cleanLink = link;
                if (link.startsWith('/url?q=')) {
                    cleanLink = link.split('/url?q=')[1].split('&')[0];
                }
                
                // Decode URL
                cleanLink = decodeURIComponent(cleanLink);
                
                results.push({
                    title: title,
                    link: cleanLink,
                    description: description.substring(0, 200) + '...'
                });
            }
        });
        
        // Extract instant answer (if available)
        let instantAnswer = null;
        
        // Check for knowledge panel
        const knowledgePanel = $('div.kp-blk').first();
        if (knowledgePanel.length > 0) {
            instantAnswer = knowledgePanel.text().trim().substring(0, 300);
        }
        
        // Check for featured snippet
        const featuredSnippet = $('div.xpdopen').first();
        if (featuredSnippet.length > 0 && !instantAnswer) {
            instantAnswer = featuredSnippet.text().trim().substring(0, 300);
        }
        
        // Extract related searches
        const relatedSearches = [];
        $('a.k8XOCe').each((index, element) => {
            if (index < 5) {
                const related = $(element).text().trim();
                if (related) {
                    relatedSearches.push(related);
                }
            }
        });
        
        return {
            query: query,
            results: results,
            instantAnswer: instantAnswer,
            relatedSearches: relatedSearches,
            totalResults: $('div#result-stats').text() || 'Results found'
        };
        
    } catch (error) {
        console.error('Google search error:', error);
        
        // Fallback to google-it package if available
        try {
            const googleIt = require('google-it');
            const results = await googleIt({ 
                query: query,
                limit: 8 
            });
            
            return {
                query: query,
                results: results.map(result => ({
                    title: result.title,
                    link: result.link,
                    description: result.snippet
                })),
                instantAnswer: null,
                relatedSearches: [],
                totalResults: `${results.length} results`
            };
            
        } catch (fallbackError) {
            console.error('Fallback search error:', fallbackError);
            
            // Use a public API as last resort
            try {
                const apiUrl = `https://api.freeapi.app/api/v1/public/google/search?query=${encodeURIComponent(query)}&limit=8`;
                const response = await axios.get(apiUrl);
                
                if (response.data && response.data.data && response.data.data.data) {
                    return {
                        query: query,
                        results: response.data.data.data.map(item => ({
                            title: item.title,
                            link: item.link,
                            description: item.snippet
                        })),
                        instantAnswer: null,
                        relatedSearches: [],
                        totalResults: `${response.data.data.data.length} results`
                    };
                }
            } catch (apiError) {
                console.error('API search error:', apiError);
            }
        }
        
        return null;
    }
}

function buildResultsMessage(searchData, query) {
    const { results, instantAnswer, relatedSearches, totalResults } = searchData;
    
    let message = `🔍 **Google Search Results** 🔍\n\n`;
    message += `📝 **Query:** ${query}\n`;
    message += `📊 **${totalResults}**\n\n`;
    
    // Add instant answer if available
    if (instantAnswer) {
        message += `💡 **Instant Answer:**\n`;
        message += `${instantAnswer}\n\n`;
        message += `════════════════════════════\n\n`;
    }
    
    // Add search results
    message += `📄 **Top Results:**\n\n`;
    
    results.forEach((result, index) => {
        message += `${index + 1}. **${result.title}**\n`;
        
        // Truncate link if too long
        let displayLink = result.link;
        if (displayLink.length > 50) {
            displayLink = displayLink.substring(0, 47) + '...';
        }
        message += `   🔗 ${displayLink}\n`;
        
        message += `   📝 ${result.description}\n\n`;
    });
    
    // Add related searches if available
    if (relatedSearches.length > 0) {
        message += `🔗 **Related Searches:**\n`;
        relatedSearches.forEach((search, index) => {
            message += `${index + 1}. ${search}\n`;
        });
        message += `\n`;
    }
    
    message += `════════════════════════════\n`;
    message += `💡 **Tips:**\n`;
    message += `• Use quotes for exact phrase: "${global.config.prefix}google "artificial intelligence"\n`;
    message += `• Use site: for specific site: ${global.config.prefix}google site:wikipedia.org AI\n`;
    message += `• Use - to exclude: ${global.config.prefix}google apple -fruit\n`;
    message += `\n🔒 **Safe Search:** Enabled`;
    
    return message;
}