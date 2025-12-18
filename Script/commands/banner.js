const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage, registerFont } = require('canvas');

module.exports = {
    config: {
        name: "banner",
        version: "2.0",
        author: "RANA",
        role: 0,
        category: "image",
        shortDescription: {
            en: "Create custom banners",
            bn: "কাস্টম ব্যানার তৈরি করুন"
        },
        longDescription: {
            en: "Create beautiful banners with text and images",
            bn: "টেক্সট এবং ইমেজ সহ সুন্দর ব্যানার তৈরি করুন"
        },
        guide: {
            en: "{pn} [text] | [style] or {pn} list",
            bn: "{pn} [টেক্সট] | [স্টাইল] অথবা {pn} list"
        },
        cooldown: 30
    },

    onStart: async function({ api, event, args }) {
        try {
            const { threadID, messageID } = event;
            
            if (args.length === 0 || args[0].toLowerCase() === 'list') {
                return showBannerStyles(api, threadID, messageID);
            }
            
            const input = args.join(" ");
            const parts = input.split("|").map(part => part.trim());
            
            const text = parts[0] || "Your Text";
            const style = parts[1] || "1";
            const subtext = parts[2] || "";
            
            // Send processing message
            api.sendMessage(
                "🎨 Creating banner... Please wait.",
                threadID,
                messageID
            );
            
            // Create banner
            const bannerPath = await createBanner(text, subtext, style);
            
            if (!bannerPath) {
                return api.sendMessage(
                    "❌ Failed to create banner.",
                    threadID,
                    messageID
                );
            }
            
            // Send the banner image
            api.sendMessage(
                {
                    body: `✅ Banner Created!\n\n` +
                          `📝 Text: ${text}\n` +
                          `${subtext ? `📝 Subtext: ${subtext}\n` : ''}` +
                          `🎨 Style: ${style}\n\n` +
                          `💡 Tip: Use ${global.config.prefix}banner list to see all styles.`,
                    attachment: fs.createReadStream(bannerPath)
                },
                threadID,
                messageID,
                async () => {
                    // Clean up temp file
                    try {
                        fs.unlinkSync(bannerPath);
                    } catch (error) {
                        // Ignore cleanup errors
                    }
                }
            );
            
        } catch (error) {
            console.error(error);
            api.sendMessage(
                "❌ Failed to create banner.",
                event.threadID,
                event.messageID
            );
        }
    }
};

function showBannerStyles(api, threadID, messageID) {
    const styles = [
        { id: 1, name: "Modern Gradient", size: "1000x400", desc: "Modern gradient with shadow effects" },
        { id: 2, name: "Elegant Gold", size: "1200x500", desc: "Gold elegant design with borders" },
        { id: 3, name: "Tech Blue", size: "1000x350", desc: "Technology theme with blue colors" },
        { id: 4, name: "Nature Green", size: "1100x450", desc: "Nature theme with leaves" },
        { id: 5, name: "Minimal White", size: "900x300", desc: "Clean minimal design" },
        { id: 6, name: "Abstract Color", size: "1000x400", desc: "Abstract colorful background" },
        { id: 7, name: "Gaming Red", size: "1200x500", desc: "Gaming theme with red colors" },
        { id: 8, name: "Love Pink", size: "1000x400", desc: "Romantic pink theme" },
        { id: 9, name: "Business Professional", size: "1100x450", desc: "Professional business design" },
        { id: 10, name: "Celebration Party", size: "1200x500", desc: "Festive celebration theme" },
        { id: 11, name: "Anime Style", size: "1000x400", desc: "Anime inspired design" },
        { id: 12, name: "Music Theme", size: "1100x450", desc: "Music notes and instruments" },
        { id: 13, name: "Space Cosmic", size: "1200x500", desc: "Space and stars theme" },
        { id: 14, name: "Water Ocean", size: "1000x400", desc: "Ocean water theme" },
        { id: 15, name: "Fire Flame", size: "1000x400", desc: "Fire and flame effects" }
    ];
    
    let message = `🎨 **BANNER STYLES** 🎨\n\n`;
    
    styles.forEach(style => {
        message += `**Style ${style.id}: ${style.name}**\n`;
        message += `Size: ${style.size}\n`;
        message += `${style.desc}\n`;
        message += `Usage: ${global.config.prefix}banner Text | ${style.id} | Subtext\n\n`;
    });
    
    message += `📝 **Examples:**\n`;
    message += `• ${global.config.prefix}banner Welcome | 1\n`;
    message += `• ${global.config.prefix}banner Happy Birthday | 6 | To You!\n`;
    message += `• ${global.config.prefix}banner Congratulations | 9\n\n`;
    
    message += `🎯 **Perfect for:**\n`;
    message += `• Social media posts\n`;
    message += `• Group announcements\n`;
    message += `• Event promotions\n`;
    message += `• Profile headers`;
    
    api.sendMessage(message, threadID, messageID);
}

async function createBanner(text, subtext, styleId) {
    try {
        // Create temp directory
        const tempDir = path.join(__dirname, '../../cache/banners');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // Generate filename
        const filename = `banner_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`;
        const filePath = path.join(tempDir, filename);
        
        // Get dimensions based on style
        const dimensions = getBannerDimensions(styleId);
        const width = dimensions.width;
        const height = dimensions.height;
        
        // Create canvas
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        
        // Load fonts if available
        try {
            const fontPath = path.join(__dirname, '../../cache/Play-Bold.ttf');
            if (fs.existsSync(fontPath)) {
                registerFont(fontPath, { family: 'Play Bold' });
            }
        } catch (error) {
            // Use default font
        }
        
        // Draw background based on style
        await drawBannerBackground(ctx, width, height, styleId);
        
        // Draw text
        drawBannerText(ctx, width, height, text, subtext, styleId);
        
        // Draw additional elements
        await drawBannerElements(ctx, width, height, styleId);
        
        // Save image
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(filePath, buffer);
        
        return filePath;
        
    } catch (error) {
        console.error('Banner creation error:', error);
        return null;
    }
}

function getBannerDimensions(styleId) {
    const style = parseInt(styleId) || 1;
    
    switch (style) {
        case 2:
        case 7:
        case 10:
        case 13:
            return { width: 1200, height: 500 };
        case 4:
        case 9:
        case 12:
            return { width: 1100, height: 450 };
        case 3:
        case 6:
        case 8:
        case 11:
        case 14:
        case 15:
            return { width: 1000, height: 400 };
        case 1:
            return { width: 1000, height: 400 };
        case 5:
            return { width: 900, height: 300 };
        default:
            return { width: 1000, height: 400 };
    }
}

async function drawBannerBackground(ctx, width, height, styleId) {
    const style = parseInt(styleId) || 1;
    
    switch (style) {
        case 1: // Modern Gradient
            const gradient1 = ctx.createLinearGradient(0, 0, width, height);
            gradient1.addColorStop(0, '#8A2387');
            gradient1.addColorStop(0.5, '#E94057');
            gradient1.addColorStop(1, '#F27121');
            ctx.fillStyle = gradient1;
            break;
            
        case 2: // Elegant Gold
            ctx.fillStyle = '#1a1a2e';
            
            // Draw gold border
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 10;
            ctx.strokeRect(5, 5, width - 10, height - 10);
            break;
            
        case 3: // Tech Blue
            const gradient3 = ctx.createLinearGradient(0, 0, width, 0);
            gradient3.addColorStop(0, '#0f0c29');
            gradient3.addColorStop(0.5, '#302b63');
            gradient3.addColorStop(1, '#24243e');
            ctx.fillStyle = gradient3;
            break;
            
        case 4: // Nature Green
            const gradient4 = ctx.createLinearGradient(0, 0, 0, height);
            gradient4.addColorStop(0, '#0ba360');
            gradient4.addColorStop(1, '#3cba92');
            ctx.fillStyle = gradient4;
            break;
            
        case 5: // Minimal White
            ctx.fillStyle = '#ffffff';
            break;
            
        case 6: // Abstract Color
            // Draw multiple gradient circles
            for (let i = 0; i < 8; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height;
                const radius = Math.random() * 150 + 100;
                
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
                const colors = [
                    ['#FF512F', '#DD2476'],
                    ['#DA22FF', '#9733EE'],
                    ['#FF8008', '#FFC837'],
                    ['#1D976C', '#93F9B9'],
                    ['#FF5F6D', '#FFC371']
                ];
                const [color1, color2] = colors[Math.floor(Math.random() * colors.length)];
                
                gradient.addColorStop(0, color1);
                gradient.addColorStop(1, color2);
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
            }
            return;
            
        case 7: // Gaming Red
            const gradient7 = ctx.createLinearGradient(0, 0, width, height);
            gradient7.addColorStop(0, '#8B0000');
            gradient7.addColorStop(1, '#FF0000');
            ctx.fillStyle = gradient7;
            break;
            
        case 8: // Love Pink
            const gradient8 = ctx.createLinearGradient(0, 0, width, height);
            gradient8.addColorStop(0, '#FFAFBD');
            gradient8.addColorStop(1, '#FFC3A0');
            ctx.fillStyle = gradient8;
            break;
            
        case 9: // Business Professional
            const gradient9 = ctx.createLinearGradient(0, 0, width, 0);
            gradient9.addColorStop(0, '#2C3E50');
            gradient9.addColorStop(1, '#4CA1AF');
            ctx.fillStyle = gradient9;
            break;
            
        case 10: // Celebration Party
            const gradient10 = ctx.createLinearGradient(0, 0, width, height);
            gradient10.addColorStop(0, '#FF4E50');
            gradient10.addColorStop(1, '#F9D423');
            ctx.fillStyle = gradient10;
            break;
            
        case 11: // Anime Style
            // Try to load anime background
            try {
                const animeBg = await loadImage('https://i.imgur.com/8B6yW9N.png');
                ctx.drawImage(animeBg, 0, 0, width, height);
                return;
            } catch {
                // Fallback gradient
                const gradient11 = ctx.createLinearGradient(0, 0, width, height);
                gradient11.addColorStop(0, '#FF9A9E');
                gradient11.addColorStop(1, '#FAD0C4');
                ctx.fillStyle = gradient11;
            }
            break;
            
        case 12: // Music Theme
            const gradient12 = ctx.createLinearGradient(0, 0, width, 0);
            gradient12.addColorStop(0, '#1E3C72');
            gradient12.addColorStop(1, '#2A5298');
            ctx.fillStyle = gradient12;
            break;
            
        case 13: // Space Cosmic
            ctx.fillStyle = '#000428';
            
            // Draw stars
            ctx.fillStyle = '#ffffff';
            for (let i = 0; i < 200; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height;
                const size = Math.random() * 3;
                
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = '#000428';
            break;
            
        case 14: // Water Ocean
            const gradient14 = ctx.createLinearGradient(0, 0, 0, height);
            gradient14.addColorStop(0, '#1CB5E0');
            gradient14.addColorStop(1, '#000851');
            ctx.fillStyle = gradient14;
            break;
            
        case 15: // Fire Flame
            const gradient15 = ctx.createLinearGradient(0, 0, width, 0);
            gradient15.addColorStop(0, '#F7971E');
            gradient15.addColorStop(1, '#FFD200');
            ctx.fillStyle = gradient15;
            break;
            
        default:
            ctx.fillStyle = '#667eea';
    }
    
    if (style !== 6 && style !== 11 && style !== 13) {
        ctx.fillRect(0, 0, width, height);
    }
}

function drawBannerText(ctx, width, height, text, subtext, styleId) {
    const style = parseInt(styleId) || 1;
    
    // Set font properties based on style
    let fontSize1, fontSize2, fontFamily, color1, color2, textShadow;
    
    switch (style) {
        case 1: // Modern
            fontSize1 = Math.min(80, width / text.length * 2);
            fontSize2 = fontSize1 * 0.5;
            fontFamily = 'Play Bold, Arial, sans-serif';
            color1 = '#ffffff';
            color2 = '#f0f0f0';
            textShadow = true;
            break;
            
        case 2: // Elegant Gold
            fontSize1 = 70;
            fontSize2 = 35;
            fontFamily = 'Play Bold, Georgia, serif';
            color1 = '#FFD700';
            color2 = '#FFEC8B';
            textShadow = true;
            break;
            
        case 5: // Minimal White
            fontSize1 = 60;
            fontSize2 = 30;
            fontFamily = 'Play Bold, Arial, sans-serif';
            color1 = '#333333';
            color2 = '#666666';
            textShadow = false;
            break;
            
        case 13: // Space Cosmic
            fontSize1 = 65;
            fontSize2 = 32;
            fontFamily = 'Play Bold, Arial, sans-serif';
            color1 = '#ffffff';
            color2 = '#cccccc';
            textShadow = true;
            break;
            
        default:
            fontSize1 = Math.min(70, width / text.length * 2);
            fontSize2 = fontSize1 * 0.5;
            fontFamily = 'Play Bold, Arial, sans-serif';
            color1 = '#ffffff';
            color2 = '#f0f0f0';
            textShadow = true;
    }
    
    // Draw text shadow for better visibility
    if (textShadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
    }
    
    // Draw main text
    ctx.font = `bold ${fontSize1}px ${fontFamily}`;
    ctx.fillStyle = color1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const y1 = subtext ? height * 0.4 : height / 2;
    ctx.fillText(text, width / 2, y1);
    
    // Draw subtext if exists
    if (subtext) {
        ctx.font = `bold ${fontSize2}px ${fontFamily}`;
        ctx.fillStyle = color2;
        
        const y2 = y1 + fontSize1 + 20;
        ctx.fillText(subtext, width / 2, y2);
    }
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
}

async function drawBannerElements(ctx, width, height, styleId) {
    const style = parseInt(styleId) || 1;
    
    switch (style) {
        case 4: // Nature Green - Draw leaves
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            for (let i = 0; i < 20; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height;
                const size = Math.random() * 30 + 10;
                drawLeaf(ctx, x, y, size);
            }
            break;
            
        case 8: // Love Pink - Draw hearts
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            for (let i = 0; i < 15; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height;
                const size = Math.random() * 25 + 15;
                drawHeart(ctx, x, y, size);
            }
            break;
            
        case 11: // Anime Style - Draw cherry blossoms
            ctx.fillStyle = 'rgba(255, 182, 193, 0.5)';
            for (let i = 0; i < 30; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height;
                const size = Math.random() * 20 + 5;
                drawCherryBlossom(ctx, x, y, size);
            }
            break;
            
        case 12: // Music Theme - Draw music notes
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            for (let i = 0; i < 10; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height;
                const size = Math.random() * 30 + 20;
                drawMusicNote(ctx, x, y, size);
            }
            break;
            
        case 14: // Water Ocean - Draw waves
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            
            for (let i = 0; i < 5; i++) {
                const y = height - 50 - (i * 30);
                drawWave(ctx, width, y, 100);
            }
            break;
            
        case 15: // Fire Flame - Draw flames
            for (let i = 0; i < 8; i++) {
                const x = Math.random() * width;
                const y = height - 50;
                const size = Math.random() * 40 + 30;
                drawFlame(ctx, x, y, size);
            }
            break;
    }
}

function drawLeaf(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    
    // Simple leaf shape
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(size, -size/2, 0, -size);
    ctx.quadraticCurveTo(-size, -size/2, 0, 0);
    ctx.closePath();
    ctx.fill();
    
    // Leaf stem
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = size/10;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, size/2);
    ctx.stroke();
    
    ctx.restore();
}

function drawHeart(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    
    const topCurveHeight = size * 0.3;
    
    ctx.beginPath();
    ctx.moveTo(0, topCurveHeight);
    
    // Left top curve
    ctx.bezierCurveTo(0, 0, -size/2, 0, -size/2, topCurveHeight);
    
    // Left bottom curve
    ctx.bezierCurveTo(
        -size/2, (size + topCurveHeight)/2,
        0, (size + topCurveHeight)/2,
        0, size
    );
    
    // Right bottom curve
    ctx.bezierCurveTo(
        0, (size + topCurveHeight)/2,
        size/2, (size + topCurveHeight)/2,
        size/2, topCurveHeight
    );
    
    // Right top curve
    ctx.bezierCurveTo(size/2, 0, 0, 0, 0, topCurveHeight);
    
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
}

function drawCherryBlossom(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    
    // Draw 5 petals
    for (let i = 0; i < 5; i++) {
        ctx.save();
        ctx.rotate((i * 72) * Math.PI / 180);
        
        // Petal shape
        ctx.beginPath();
        ctx.ellipse(0, -size/2, size/3, size/2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    // Center
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(0, 0, size/6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

function drawMusicNote(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    
    // Note head
    ctx.beginPath();
    ctx.ellipse(0, 0, size/4, size/6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Note stem
    ctx.fillRect(size/4 - 2, -size/2, 4, size/2);
    
    // Note flag
    ctx.beginPath();
    ctx.moveTo(size/4 + 2, -size/2);
    ctx.quadraticCurveTo(size/2, -size/2 + size/4, size/4, -size/2 + size/2);
    ctx.quadraticCurveTo(0, -size/2 + size/4, size/4 + 2, -size/2);
    ctx.fill();
    
    ctx.restore();
}

function drawWave(ctx, width, y, amplitude) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    
    for (let x = 0; x <= width; x += 10) {
        const waveY = y + Math.sin(x * 0.02) * amplitude;
        ctx.lineTo(x, waveY);
    }
    
    ctx.stroke();
}

function drawFlame(ctx, x, y, height) {
    const width = height * 0.6;
    
    ctx.save();
    ctx.translate(x, y);
    
    // Flame gradient
    const gradient = ctx.createLinearGradient(0, -height, 0, 0);
    gradient.addColorStop(0, '#FFFF00');
    gradient.addColorStop(0.5, '#FF4500');
    gradient.addColorStop(1, '#8B0000');
    
    ctx.fillStyle = gradient;
    
    // Flame shape
    ctx.beginPath();
    ctx.moveTo(0, -height);
    ctx.bezierCurveTo(width/2, -height/2, width/2, 0, 0, 0);
    ctx.bezierCurveTo(-width/2, 0, -width/2, -height/2, 0, -height);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
}