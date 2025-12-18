const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
    config: {
        name: "youtube",
        aliases: ["yt", "ytsearch"],
        version: "2.0",
        author: "RANA",
        role: 0,
        category: "utility",
        shortDescription: {
            en: "Search YouTube videos",
            bn: "YouTube ভিডিও সার্চ করুন"
        },
        longDescription: {
            en: "Search YouTube videos and get information",
            bn: "YouTube ভিডিও সার্চ করুন এবং তথ্য পান"
        },
        guide: {
            en: "{pn} [search query] or {pn} info [video URL]",
            bn: "{pn} [সার্চ কুয়েরি] অথবা {pn} info [ভিডিও URL]"
        },
        cooldown: 10
    },

    onStart: async function({ api, event, args }) {
        try {
            const { threadID, messageID } = event;
            
            if (args.length === 0) {
                return showYTHelp(api, threadID, messageID);
            }
            
            const action = args[0].toLowerCase();
            
            if (action === 'info' || action === 'details') {
                if (args.length < 2) {
                    return api.sendMessage(
                        "❌ Please provide a YouTube URL.\n" +
                        `Example: ${global.config.prefix}yt info https://youtu.be/JGwWNGJdvx8`,
                        threadID,
                        messageID
                    );
                }
                
                const videoUrl = args[1];
                await getVideoInfo(api, threadID, messageID, videoUrl);
                
            } else if (action === 'download' || action === 'dl') {
                if (args.length < 2) {
                    return api.sendMessage(
                        "❌ Please provide a YouTube URL.\n" +
                        `Example: ${global.config.prefix}yt download https://youtu.be/JGwWNGJdvx8\n` +
                        `For music download, use ${global.config.prefix}song`,
                        threadID,
                        messageID
                    );
                }
                
                const videoUrl = args.slice(1).join(" ");
                await downloadVideo(api, threadID, messageID, videoUrl);
                
            } else {
                const query = args.join(" ");
                await searchVideos(api, threadID, messageID, query);
            }
            
        } catch (error) {
            console.error(error);
            api.sendMessage(
                "❌ YouTube command failed.",
                event.threadID,
                event.messageID
            );
        }
    }
};

function showYTHelp(api, threadID, messageID) {
    const message = `
📺 **YouTube Commands** 📺

🔍 **Search Videos:**
• ${global.config.prefix}yt [query] - Search YouTube videos
• Example: ${global.config.prefix}yt funny cats

📋 **Get Video Info:**
• ${global.config.prefix}yt info [URL] - Get video details
• Example: ${global.config.prefix}yt info https://youtu.be/VIDEO_ID

⬇️ **Download Video:**
• ${global.config.prefix}yt download [URL] - Download video
• Example: ${global.config.prefix}yt download https://youtu.be/VIDEO_ID

🎵 **For Music:**
• Use ${global.config.prefix}song [name] - Download music/audio

🔧 **Supported URLs:**
• youtube.com/watch?v=...
• youtu.be/...
• youtube.com/shorts/...

📊 **Features:**
• Video search with details
• Thumbnail preview
• Duration and views
• Channel information
• Related videos

💡 **Tip:** For best quality downloads, use video URLs directly.
    `;
    
    api.sendMessage(message, threadID, messageID);
}

async function searchVideos(api, threadID, messageID, query) {
    try {
        // Send searching message
        const searchMsg = await api.sendMessage(
            `🔍 Searching YouTube for: "${query}"...`,
            threadID,
            messageID
        );
        
        // Search YouTube
        const searchResults = await searchYouTubeVideos(query);
        
        if (!searchResults || searchResults.length === 0) {
            api.editMessage(
                "❌ No results found. Please try different keywords.",
                searchMsg.messageID
            );
            return;
        }
        
        // Build results message
        const message = buildSearchResultsMessage(searchResults, query);
        
        // Edit message with results
        api.editMessage(message, searchMsg.messageID);
        
    } catch (error) {
        console.error('YouTube search error:', error);
        api.sendMessage(
            "❌ Search failed. Please try again.",
            threadID,
            messageID
        );
    }
}

async function getVideoInfo(api, threadID, messageID, videoUrl) {
    try {
        // Extract video ID
        let videoId = '';
        
        if (videoUrl.includes('youtu.be/')) {
            videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
        } else if (videoUrl.includes('youtube.com/watch?v=')) {
            videoId = videoUrl.split('v=')[1].split('&')[0];
        } else if (videoUrl.includes('youtube.com/shorts/')) {
            videoId = videoUrl.split('shorts/')[1].split('?')[0];
        } else if (videoUrl.match(/[a-zA-Z0-9_-]{11}/)) {
            videoId = videoUrl.match(/[a-zA-Z0-9_-]{11}/)[0];
        }
        
        if (!videoId) {
            return api.sendMessage(
                "❌ Invalid YouTube URL.",
                threadID,
                messageID
            );
        }
        
        // Send processing message
        const infoMsg = await api.sendMessage(
            `📥 Fetching video information...`,
            threadID,
            messageID
        );
        
        // Get video info
        const videoInfo = await getYouTubeVideoInfo(videoId);
        
        if (!videoInfo) {
            api.editMessage(
                "❌ Failed to fetch video information.",
                infoMsg.messageID
            );
            return;
        }
        
        // Build info message
        const message = buildVideoInfoMessage(videoInfo);
        
        // Try to get thumbnail
        let thumbnailUrl = null;
        if (videoInfo.thumbnail) {
            thumbnailUrl = videoInfo.thumbnail;
        } else {
            // Default YouTube thumbnail
            thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        }
        
        // Download thumbnail
        try {
            const thumbnailPath = await downloadThumbnail(thumbnailUrl, videoId);
            
            api.sendMessage(
                {
                    body: message,
                    attachment: fs.createReadStream(thumbnailPath)
                },
                threadID,
                messageID,
                async () => {
                    // Clean up thumbnail
                    try {
                        fs.unlinkSync(thumbnailPath);
                    } catch (error) {
                        // Ignore cleanup errors
                    }
                }
            );
            
            // Delete processing message
            api.deleteMessage(infoMsg.messageID);
            
        } catch (thumbnailError) {
            // Send without thumbnail
            api.editMessage(message, infoMsg.messageID);
        }
        
    } catch (error) {
        console.error('Video info error:', error);
        api.sendMessage(
            "❌ Failed to get video information.",
            threadID,
            messageID
        );
    }
}

async function downloadVideo(api, threadID, messageID, videoUrl) {
    try {
        // Extract video ID
        let videoId = '';
        
        if (videoUrl.includes('youtu.be/')) {
            videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
        } else if (videoUrl.includes('youtube.com/watch?v=')) {
            videoId = videoUrl.split('v=')[1].split('&')[0];
        } else if (videoUrl.includes('youtube.com/shorts/')) {
            videoId = videoUrl.split('shorts/')[1].split('?')[0];
        }
        
        if (!videoId) {
            return api.sendMessage(
                "❌ Invalid YouTube URL.",
                threadID,
                messageID
            );
        }
        
        // Send processing message
        const downloadMsg = await api.sendMessage(
            `📥 Processing YouTube video...`,
            threadID,
            messageID
        );
        
        // Get video info first
        const videoInfo = await getYouTubeVideoInfo(videoId);
        
        if (!videoInfo) {
            api.editMessage(
                "❌ Failed to fetch video information.",
                downloadMsg.messageID
            );
            return;
        }
        
        // Check video duration (max 15 minutes for free download)
        const duration = parseDuration(videoInfo.duration);
        if (duration > 900) { // 15 minutes
            api.editMessage(
                `❌ Video is too long (${Math.round(duration/60)} minutes).\n` +
                `Maximum allowed: 15 minutes for free download.\n\n` +
                `💡 Try using ${global.config.prefix}song for audio only.`,
                downloadMsg.messageID
            );
            return;
        }
        
        api.editMessage(
            `📥 Downloading: ${videoInfo.title}\n` +
            `⏱️ Duration: ${videoInfo.duration}\n` +
            `📊 Quality: 720p MP4\n` +
            `📥 Please wait, this may take a while...`,
            downloadMsg.messageID
        );
        
        // Download video
        const videoFile = await downloadYouTubeVideo(videoId, videoInfo.title);
        
        if (!videoFile) {
            api.editMessage(
                "❌ Download failed. The video may be restricted or too large.",
                downloadMsg.messageID
            );
            return;
        }
        
        // Check file size (max 25MB for Facebook)
        const maxSize = 25 * 1024 * 1024; // 25MB
        if (videoFile.size > maxSize) {
            api.editMessage(
                `❌ Video file is too large (${formatBytes(videoFile.size)}).\n` +
                `Maximum allowed: 25MB for Facebook messenger.\n\n` +
                `💡 Try shorter videos or use ${global.config.prefix}song for audio only.`,
                downloadMsg.messageID
            );
            
            // Clean up
            try {
                fs.unlinkSync(videoFile.path);
            } catch (error) {
                // Ignore cleanup errors
            }
            
            return;
        }
        
        // Send the video file
        api.sendMessage(
            {
                body: `✅ Download Complete!\n\n` +
                      `📺 **Title:** ${videoInfo.title}\n` +
                      `👤 **Channel:** ${videoInfo.channel}\n` +
                      `⏱️ **Duration:** ${videoInfo.duration}\n` +
                      `👁️ **Views:** ${videoInfo.views || 'N/A'}\n` +
                      `📅 **Uploaded:** ${videoInfo.uploadDate || 'N/A'}\n` +
                      `📊 **Quality:** 720p MP4\n` +
                      `💾 **Size:** ${formatBytes(videoFile.size)}\n\n` +
                      `🎬 Enjoy your video!`,
                attachment: fs.createReadStream(videoFile.path)
            },
            threadID,
            async () => {
                // Clean up
                try {
                    fs.unlinkSync(videoFile.path);
                } catch (error) {
                    // Ignore cleanup errors
                }
            }
        );
        
        // Delete download message
        api.deleteMessage(downloadMsg.messageID);
        
    } catch (error) {
        console.error('Video download error:', error);
        api.sendMessage(
            "❌ Download failed. Please try again.",
            threadID,
            messageID
        );
    }
}

async function searchYouTubeVideos(query) {
    try {
        // Use YouTube search
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        
        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const html = response.data;
        
        const results = [];
        const regex = /"videoRenderer":{"videoId":"([^"]+)".*?"title":{"runs":\[{"text":"([^"]+)"}.*?"ownerText":{"runs":\[{"text":"([^"]+)"}.*?"lengthText":{"simpleText":"([^"]+)"}.*?"viewCountText":{"simpleText":"([^"]+)"}.*?"publishedTimeText":{"simpleText":"([^"]+)"}/g;
        
        let match;
        while ((match = regex.exec(html)) !== null && results.length < 8) {
            results.push({
                id: match[1],
                title: match[2].replace(/\\u([\d\w]{4})/gi, (match, grp) => 
                    String.fromCharCode(parseInt(grp, 16))),
                channel: match[3],
                duration: match[4],
                views: match[5],
                uploadDate: match[6]
            });
        }
        
        return results;
        
    } catch (error) {
        console.error('YouTube search error:', error);
        
        // Fallback to public API
        try {
            const apiUrl = `https://api.freeapi.app/api/v1/public/youtube/videos?query=${encodeURIComponent(query)}&limit=8`;
            const response = await axios.get(apiUrl);
            
            if (response.data && response.data.data && response.data.data.data) {
                return response.data.data.data.map(video => ({
                    id: video.videoId,
                    title: video.title,
                    channel: video.channelTitle,
                    duration: video.duration,
                    views: formatViews(video.viewCount),
                    uploadDate: video.publishedAt ? 
                        new Date(video.publishedAt).toLocaleDateString() : 'Unknown'
                }));
            }
        } catch (apiError) {
            console.error('API search error:', apiError);
        }
        
        return [];
    }
}

async function getYouTubeVideoInfo(videoId) {
    try {
        // Use YouTube API or oEmbed
        const oembedUrl = `https://www.youtube.com/oembed?url=https://youtube.com/watch?v=${videoId}&format=json`;
        
        const response = await axios.get(oembedUrl);
        
        if (response.data) {
            // Get additional info from YouTube page
            const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
            const pageResponse = await axios.get(videoUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            const html = pageResponse.data;
            
            // Extract duration
            let duration = 'Unknown';
            const durationMatch = html.match(/"approxDurationMs":"(\d+)"/);
            if (durationMatch) {
                const ms = parseInt(durationMatch[1]);
                const hours = Math.floor(ms / 3600000);
                const minutes = Math.floor((ms % 3600000) / 60000);
                const seconds = Math.floor((ms % 60000) / 1000);
                
                if (hours > 0) {
                    duration = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                } else {
                    duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                }
            }
            
            // Extract views
            let views = 'Unknown';
            const viewsMatch = html.match(/"viewCount":"(\d+)"/);
            if (viewsMatch) {
                views = formatViews(viewsMatch[1]);
            }
            
            // Extract upload date
            let uploadDate = 'Unknown';
            const dateMatch = html.match(/"uploadDate":"([^"]+)"/);
            if (dateMatch) {
                uploadDate = new Date(dateMatch[1]).toLocaleDateString();
            }
            
            // Extract channel
            let channel = response.data.author_name || 'Unknown';
            const channelMatch = html.match(/"ownerChannelName":"([^"]+)"/);
            if (channelMatch) {
                channel = channelMatch[1];
            }
            
            return {
                title: response.data.title,
                channel: channel,
                duration: duration,
                views: views,
                uploadDate: uploadDate,
                thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                url: videoUrl
            };
        }
        
    } catch (error) {
        console.error('Video info error:', error);
        
        // Fallback to scraping
        try {
            const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
            const response = await axios.get(videoUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            const html = response.data;
            
            // Extract title
            const titleMatch = html.match(/<meta name="title" content="([^"]+)"/);
            const title = titleMatch ? titleMatch[1] : 'Unknown Title';
            
            // Extract channel
            const channelMatch = html.match(/"ownerChannelName":"([^"]+)"/) ||
                               html.match(/<link itemprop="name" content="([^"]+)"/);
            const channel = channelMatch ? channelMatch[1] : 'Unknown Channel';
            
            // Extract duration
            let duration = 'Unknown';
            const durationMatch = html.match(/"approxDurationMs":"(\d+)"/);
            if (durationMatch) {
                const ms = parseInt(durationMatch[1]);
                const minutes = Math.floor(ms / 60000);
                const seconds = Math.floor((ms % 60000) / 1000);
                duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
            
            // Extract views
            let views = 'Unknown';
            const viewsMatch = html.match(/"viewCount":"(\d+)"/);
            if (viewsMatch) {
                views = formatViews(viewsMatch[1]);
            }
            
            return {
                title: title,
                channel: channel,
                duration: duration,
                views: views,
                uploadDate: 'Unknown',
                thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                url: videoUrl
            };
            
        } catch (scrapeError) {
            console.error('Scrape error:', scrapeError);
        }
    }
    
    return null;
}

async function downloadYouTubeVideo(videoId, title) {
    try {
        // Create temp directory
        const tempDir = path.join(__dirname, '../../cache/videos');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // Clean filename
        const cleanTitle = title
            .replace(/[^\w\s]/gi, '')
            .replace(/\s+/g, '_')
            .substring(0, 50);
        
        const filename = `${cleanTitle}_${Date.now()}.mp4`;
        const filePath = path.join(tempDir, filename);
        
        // Use y2mate or similar service
        const downloadUrl = await getVideoDownloadLink(videoId);
        
        if (!downloadUrl) {
            throw new Error('No download link found');
        }
        
        // Download the file
        const response = await axios({
            method: 'GET',
            url: downloadUrl,
            responseType: 'stream',
            timeout: 600000 // 10 minutes
        });
        
        // Save to file
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);
        
        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
        
        // Get file stats
        const stats = fs.statSync(filePath);
        
        return {
            path: filePath,
            size: stats.size
        };
        
    } catch (error) {
        console.error('Video download error:', error);
        return null;
    }
}

async function getVideoDownloadLink(videoId) {
    try {
        // Try multiple download services
        const services = [
            `https://api.freeapi.app/api/v1/public/youtube/download/video?videoId=${videoId}`,
            `https://y2mate.is/api/convert`,
            `https://yt5s.com/api/ajaxConvert`
        ];
        
        for (const serviceUrl of services) {
            try {
                if (serviceUrl.includes('freeapi')) {
                    const response = await axios.get(serviceUrl);
                    if (response.data && response.data.data && response.data.data.url) {
                        return response.data.data.url;
                    }
                } else if (serviceUrl.includes('y2mate')) {
                    const response = await axios.post(serviceUrl, {
                        url: `https://youtube.com/watch?v=${videoId}`,
                        format: 'mp4',
                        quality: '720'
                    });
                    if (response.data && response.data.url) {
                        return response.data.url;
                    }
                }
            } catch (error) {
                // Try next service
                continue;
            }
        }
        
        return null;
        
    } catch (error) {
        console.error('Download link error:', error);
        return null;
    }
}

async function downloadThumbnail(thumbnailUrl, videoId) {
    try {
        // Create temp directory
        const tempDir = path.join(__dirname, '../../cache/thumbnails');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const filename = `thumb_${videoId}_${Date.now()}.jpg`;
        const filePath = path.join(tempDir, filename);
        
        // Download thumbnail
        const response = await axios({
            method: 'GET',
            url: thumbnailUrl,
            responseType: 'stream',
            timeout: 30000
        });
        
        // Save to file
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);
        
        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
        
        return filePath;
        
    } catch (error) {
        console.error('Thumbnail download error:', error);
        throw error;
    }
}

function buildSearchResultsMessage(results, query) {
    let message = `📺 **YouTube Search Results** 📺\n\n`;
    message += `🔍 **Query:** ${query}\n`;
    message += `📊 **Found:** ${results.length} videos\n\n`;
    
    results.forEach((video, index) => {
        message += `${index + 1}. **${video.title}**\n`;
        message += `   👤 ${video.channel}\n`;
        message += `   ⏱️ ${video.duration} | 👁️ ${video.views}\n`;
        message += `   📅 ${video.uploadDate || 'Unknown date'}\n`;
        message += `   🔗 https://youtu.be/${video.id}\n\n`;
    });
    
    message += `📝 **How to use:**\n`;
    message += `• Reply with number to get video info\n`;
    message += `• Use ${global.config.prefix}yt info [URL] for details\n`;
    message += `• Use ${global.config.prefix}yt download [URL] to download\n\n`;
    
    message += `💡 **Tip:** For music, use ${global.config.prefix}song command`;
    
    // Store results for reply handling
    global.ytSearchResults = global.ytSearchResults || {};
    global.ytSearchResults[query] = results;
    
    return message;
}

function buildVideoInfoMessage(videoInfo) {
    let message = `📺 **YouTube Video Information** 📺\n\n`;
    
    message += `🎬 **Title:** ${videoInfo.title}\n`;
    message += `👤 **Channel:** ${videoInfo.channel}\n`;
    message += `⏱️ **Duration:** ${videoInfo.duration}\n`;
    message += `👁️ **Views:** ${videoInfo.views}\n`;
    
    if (videoInfo.uploadDate && videoInfo.uploadDate !== 'Unknown') {
        message += `📅 **Uploaded:** ${videoInfo.uploadDate}\n`;
    }
    
    message += `🔗 **URL:** ${videoInfo.url}\n\n`;
    
    message += `📝 **Commands:**\n`;
    message += `• ${global.config.prefix}yt download ${videoInfo.url}\n`;
    message += `• ${global.config.prefix}song ${videoInfo.title} (for audio)\n\n`;
    
    message += `💡 **Tip:** Videos longer than 15 minutes cannot be downloaded due to size limits.`;
    
    return message;
}

function parseDuration(durationStr) {
    // Convert "MM:SS" or "HH:MM:SS" to seconds
    if (!durationStr || durationStr === 'Unknown') return 0;
    
    const parts = durationStr.split(':').map(Number);
    
    if (parts.length === 2) {
        // MM:SS
        return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
        // HH:MM:SS
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    
    return 0;
}

function formatViews(views) {
    if (!views || views === 'Unknown') return 'Unknown views';
    
    const num = typeof views === 'string' ? parseInt(views.replace(/\D/g, '')) : views;
    
    if (isNaN(num)) return views;
    
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M views';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K views';
    }
    
    return num + ' views';
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}