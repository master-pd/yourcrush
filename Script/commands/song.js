const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
    config: {
        name: "song",
        aliases: ["music", "play"],
        version: "2.0",
        author: "RANA",
        role: 0,
        category: "music",
        shortDescription: {
            en: "Download songs from YouTube",
            bn: "YouTube থেকে গান ডাউনলোড করুন"
        },
        longDescription: {
            en: "Search and download songs/music from YouTube",
            bn: "YouTube থেকে গান/সঙ্গীত অনুসন্ধান এবং ডাউনলোড করুন"
        },
        guide: {
            en: "{pn} [song name] or {pn} [YouTube URL]",
            bn: "{pn} [গানের নাম] অথবা {pn} [YouTube URL]"
        },
        cooldown: 30
    },

    onStart: async function({ api, event, args }) {
        try {
            const { threadID, messageID } = event;
            
            if (!args.length) {
                return api.sendMessage(
                    "🎵 **Music Downloader** 🎵\n\n" +
                    "Please provide a song name or YouTube URL.\n\n" +
                    `📝 **Usage:**\n` +
                    `• ${global.config.prefix}song [song name]\n` +
                    `• ${global.config.prefix}song [YouTube URL]\n\n` +
                    `📌 **Examples:**\n` +
                    `• ${global.config.prefix}song shape of you\n` +
                    `• ${global.config.prefix}song https://youtu.be/JGwWNGJdvx8\n\n` +
                    `🔍 **Supports:**\n` +
                    `• Song names\n` +
                    `• YouTube URLs\n` +
                    `• YouTube Shorts\n` +
                    `• Music videos`,
                    threadID,
                    messageID
                );
            }
            
            const query = args.join(" ");
            
            // Check if it's a YouTube URL
            const isUrl = query.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(.+)/);
            
            if (isUrl) {
                await downloadFromUrl(api, threadID, messageID, query);
            } else {
                await searchAndDownload(api, threadID, messageID, query);
            }
            
        } catch (error) {
            console.error(error);
            api.sendMessage(
                "❌ Failed to download song.",
                event.threadID,
                event.messageID
            );
        }
    }
};

async function searchAndDownload(api, threadID, messageID, query) {
    try {
        // Send searching message
        const searchMsg = await api.sendMessage(
            `🔍 Searching for: "${query}"...`,
            threadID,
            messageID
        );
        
        // Search YouTube
        const searchResults = await searchYouTube(query);
        
        if (!searchResults || searchResults.length === 0) {
            api.editMessage(
                "❌ No results found. Please try different keywords.",
                searchMsg.messageID
            );
            return;
        }
        
        // Show search results
        let resultsMessage = `🎵 **Search Results for "${query}"** 🎵\n\n`;
        
        searchResults.slice(0, 5).forEach((result, index) => {
            resultsMessage += `${index + 1}. ${result.title}\n`;
            resultsMessage += `   👤 ${result.channel}\n`;
            resultsMessage += `   ⏱️ ${result.duration}\n`;
            resultsMessage += `   👁️ ${result.views} views\n\n`;
        });
        
        resultsMessage += `📝 **Reply with number (1-5) to download**\n`;
        resultsMessage += `⏰ **Selection expires in 2 minutes**`;
        
        api.editMessage(resultsMessage, searchMsg.messageID);
        
        // Store search results for selection
        global.songSearchResults = global.songSearchResults || {};
        global.songSearchResults[threadID] = {
            results: searchResults,
            timestamp: Date.now()
        };
        
        // Set timeout to clear results
        setTimeout(() => {
            if (global.songSearchResults[threadID]) {
                delete global.songSearchResults[threadID];
                api.sendMessage(
                    "⏰ Song selection expired. Please search again.",
                    threadID
                );
            }
        }, 2 * 60 * 1000);
        
    } catch (error) {
        console.error('Search error:', error);
        api.sendMessage(
            "❌ Search failed. Please try again.",
            threadID,
            messageID
        );
    }
}

async function downloadFromUrl(api, threadID, messageID, url) {
    try {
        // Send processing message
        const processMsg = await api.sendMessage(
            "📥 Processing YouTube URL...",
            threadID,
            messageID
        );
        
        // Extract video ID
        let videoId = '';
        
        if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1].split('?')[0];
        } else if (url.includes('youtube.com/watch?v=')) {
            videoId = url.split('v=')[1].split('&')[0];
        } else if (url.includes('youtube.com/shorts/')) {
            videoId = url.split('shorts/')[1].split('?')[0];
        }
        
        if (!videoId) {
            api.editMessage(
                "❌ Invalid YouTube URL.",
                processMsg.messageID
            );
            return;
        }
        
        // Get video info
        const videoInfo = await getVideoInfo(videoId);
        
        if (!videoInfo) {
            api.editMessage(
                "❌ Failed to fetch video information.",
                processMsg.messageID
            );
            return;
        }
        
        // Check video duration (max 10 minutes for free tier)
        const duration = parseDuration(videoInfo.duration);
        if (duration > 600) { // 10 minutes
            api.editMessage(
                `❌ Video is too long (${Math.round(duration/60)} minutes).\n` +
                `Maximum allowed: 10 minutes for free download.`,
                processMsg.messageID
            );
            return;
        }
        
        api.editMessage(
            `📥 Downloading: ${videoInfo.title}\n` +
            `⏱️ Duration: ${videoInfo.duration}\n` +
            `📊 Quality: 128kbps MP3`,
            processMsg.messageID
        );
        
        // Download audio
        const audioFile = await downloadAudio(videoId, videoInfo.title);
        
        if (!audioFile) {
            api.editMessage(
                "❌ Download failed. The video may be restricted.",
                processMsg.messageID
            );
            return;
        }
        
        // Send the audio file
        api.sendMessage(
            {
                body: `✅ Download Complete!\n\n` +
                      `🎵 **Title:** ${videoInfo.title}\n` +
                      `👤 **Channel:** ${videoInfo.channel}\n` +
                      `⏱️ **Duration:** ${videoInfo.duration}\n` +
                      `📊 **Quality:** 128kbps MP3\n` +
                      `💾 **Size:** ${formatBytes(audioFile.size)}\n\n` +
                      `🎧 Enjoy your music!`,
                attachment: fs.createReadStream(audioFile.path)
            },
            threadID,
            async () => {
                // Clean up
                try {
                    fs.unlinkSync(audioFile.path);
                } catch (error) {
                    // Ignore cleanup errors
                }
            }
        );
        
        // Delete processing message
        api.deleteMessage(processMsg.messageID);
        
    } catch (error) {
        console.error('Download error:', error);
        api.sendMessage(
            "❌ Download failed. Please try again.",
            threadID,
            messageID
        );
    }
}

// Handle search result selection
module.exports.handleReply = async function({ api, event }) {
    try {
        const { threadID, messageID, body } = event;
        
        if (!global.songSearchResults || !global.songSearchResults[threadID]) {
            return;
        }
        
        const searchData = global.songSearchResults[threadID];
        
        // Check if selection expired
        if (Date.now() - searchData.timestamp > 2 * 60 * 1000) {
            delete global.songSearchResults[threadID];
            return api.sendMessage(
                "⏰ Selection expired. Please search again.",
                threadID,
                messageID
            );
        }
        
        const selection = parseInt(body.trim());
        
        if (isNaN(selection) || selection < 1 || selection > 5) {
            return api.sendMessage(
                "❌ Please reply with a number between 1 and 5.",
                threadID,
                messageID
            );
        }
        
        const selectedVideo = searchData.results[selection - 1];
        
        if (!selectedVideo) {
            return api.sendMessage(
                "❌ Invalid selection.",
                threadID,
                messageID
            );
        }
        
        // Send downloading message
        const downloadMsg = await api.sendMessage(
            `📥 Downloading: ${selectedVideo.title}\n` +
            `⏱️ Please wait...`,
            threadID,
            messageID
        );
        
        // Download the selected video
        const audioFile = await downloadAudio(selectedVideo.id, selectedVideo.title);
        
        if (!audioFile) {
            api.editMessage(
                "❌ Download failed. The video may be restricted.",
                downloadMsg.messageID
            );
            return;
        }
        
        // Send the audio file
        api.sendMessage(
            {
                body: `✅ Download Complete!\n\n` +
                      `🎵 **Title:** ${selectedVideo.title}\n` +
                      `👤 **Channel:** ${selectedVideo.channel}\n` +
                      `⏱️ **Duration:** ${selectedVideo.duration}\n` +
                      `📊 **Quality:** 128kbps MP3\n` +
                      `💾 **Size:** ${formatBytes(audioFile.size)}\n\n` +
                      `🎧 Enjoy your music!`,
                attachment: fs.createReadStream(audioFile.path)
            },
            threadID,
            async () => {
                // Clean up
                try {
                    fs.unlinkSync(audioFile.path);
                } catch (error) {
                    // Ignore cleanup errors
                }
            }
        );
        
        // Delete download message
        api.deleteMessage(downloadMsg.messageID);
        
        // Clear search results
        delete global.songSearchResults[threadID];
        
    } catch (error) {
        console.error('Selection error:', error);
        api.sendMessage(
            "❌ Failed to download selected song.",
            event.threadID,
            event.messageID
        );
    }
};

async function searchYouTube(query) {
    try {
        // Use YouTube search API
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`;
        
        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const html = response.data;
        
        // Parse search results (simplified parsing)
        const results = [];
        const regex = /"videoRenderer":{"videoId":"([^"]+)".*?"title":{"runs":\[{"text":"([^"]+)"}.*?"ownerText":{"runs":\[{"text":"([^"]+)"}.*?"lengthText":{"simpleText":"([^"]+)"}.*?"viewCountText":{"simpleText":"([^"]+)"}/g;
        
        let match;
        while ((match = regex.exec(html)) !== null && results.length < 10) {
            results.push({
                id: match[1],
                title: match[2].replace(/\\u([\d\w]{4})/gi, (match, grp) => 
                    String.fromCharCode(parseInt(grp, 16))),
                channel: match[3],
                duration: match[4],
                views: match[5]
            });
        }
        
        return results;
        
    } catch (error) {
        console.error('YouTube search error:', error);
        
        // Fallback to public API
        try {
            const fallbackUrl = `https://api.freeapi.app/api/v1/public/youtube/videos?query=${encodeURIComponent(query)}&limit=10`;
            const response = await axios.get(fallbackUrl);
            
            if (response.data && response.data.data && response.data.data.data) {
                return response.data.data.data.map(video => ({
                    id: video.videoId,
                    title: video.title,
                    channel: video.channelTitle,
                    duration: video.duration,
                    views: formatViews(video.viewCount)
                }));
            }
        } catch (fallbackError) {
            console.error('Fallback search error:', fallbackError);
        }
        
        return [];
    }
}

async function getVideoInfo(videoId) {
    try {
        // Use YouTube API or scraper
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const html = response.data;
        
        // Extract title
        const titleMatch = html.match(/<meta name="title" content="([^"]+)"/);
        const title = titleMatch ? titleMatch[1] : 'Unknown Title';
        
        // Extract channel
        const channelMatch = html.match(/<link itemprop="name" content="([^"]+)"/);
        const channel = channelMatch ? channelMatch[1] : 'Unknown Channel';
        
        // Extract duration
        const durationMatch = html.match(/"approxDurationMs":"(\d+)"/);
        let duration = 'Unknown';
        if (durationMatch) {
            const ms = parseInt(durationMatch[1]);
            const minutes = Math.floor(ms / 60000);
            const seconds = Math.floor((ms % 60000) / 1000);
            duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        
        return {
            title: title,
            channel: channel,
            duration: duration
        };
        
    } catch (error) {
        console.error('Video info error:', error);
        return null;
    }
}

async function downloadAudio(videoId, title) {
    try {
        // Create temp directory
        const tempDir = path.join(__dirname, '../../cache/music');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // Clean filename
        const cleanTitle = title
            .replace(/[^\w\s]/gi, '')
            .replace(/\s+/g, '_')
            .substring(0, 50);
        
        const filename = `${cleanTitle}_${Date.now()}.mp3`;
        const filePath = path.join(tempDir, filename);
        
        // Use y2mate or similar service
        const downloadUrl = await getDownloadLink(videoId);
        
        if (!downloadUrl) {
            throw new Error('No download link found');
        }
        
        // Download the file
        const response = await axios({
            method: 'GET',
            url: downloadUrl,
            responseType: 'stream',
            timeout: 300000 // 5 minutes
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
        console.error('Audio download error:', error);
        return null;
    }
}

async function getDownloadLink(videoId) {
    try {
        // Try multiple download services
        const services = [
            `https://api.freeapi.app/api/v1/public/youtube/download/audio?videoId=${videoId}`,
            `https://y2mate.is/api/convert`,
            `https://yt5s.com/api/ajaxSearch`
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
                        format: 'mp3'
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

function parseDuration(durationStr) {
    // Convert "MM:SS" or "HH:MM:SS" to seconds
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
    if (!views) return '0 views';
    
    const num = parseInt(views.replace(/\D/g, ''));
    
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