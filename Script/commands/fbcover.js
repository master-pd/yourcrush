const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage, registerFont } = require('canvas');

module.exports = {
    config: {
        name: "fbcover",
        aliases: ["cover", "coverfb"],
        version: "2.0",
        author: "RANA",
        role: 0,
        category: "image",
        shortDescription: {
            en: "Create Facebook cover",
            bn: "Facebook কভার তৈরি করুন"
        },
        longDescription: {
            en: "Create custom Facebook cover images with text and effects",
            bn: "টেক্সট এবং ইফেক্ট সহ কাস্টম Facebook কভার ইমেজ তৈরি করুন"
        },
        guide: {
            en: "{pn} [text1] | [text2] or {pn} list",
            bn: "{pn} [টেক্সট১] | [টেক্সট২] অথবা {pn} list"
        },
        cooldown: 30
    },

    onStart: async function({ api, event, args }) {
        try {
            const { threadID, messageID } = event;
            
            if (args.length === 0 || args[0].toLowerCase() === 'list') {
                return showCoverList(api, threadID, messageID);
            }
            
            const input = args.join(" ");
            const parts = input.split("|").map(part => part.trim());
            
            const text1 = parts[0] || "Your Text Here";
            const text2 = parts[1] || "";
            const style = parts[2] || "1";
            
            // Send processing message
            api.sendMessage(
                "🎨 Creating Facebook cover... Please wait.",
                threadID,
                messageID
            );
            
            // Create cover
            const coverPath = await createFBCover(text1, text2, style);
            
            if (!coverPath) {
                return api.sendMessage(
                    "❌ Failed to create cover.",
                    threadID,
                    messageID
                );
            }
            
            // Send the cover image
            api.sendMessage(
                {
                    body: `✅ Facebook Cover Created!\n\n` +
                          `📝 Text 1: ${text1}\n` +
                          `📝 Text 2: ${text2 || "N/A"}\n` +
                          `🎨 Style: ${style}\n\n` +
                          `💡 Tip: Use ${global.config.prefix}fbcover list to see all styles.`,
                    attachment: fs.createReadStream(coverPath)
                },
                threadID,
                messageID,
                async () => {
                    // Clean up temp file
                    try {
                        fs.unlinkSync(coverPath);
                    } catch (error) {
                        // Ignore cleanup errors
                    }
                }
            );
            
        } catch (error) {
            console.error(error);
            api.sendMessage(
                "❌ Failed to create Facebook cover.",
                event.threadID,
                event.messageID
            );
        }
    }
};

function showCoverList(api, threadID, messageID) {
    const styles = [
        { id: 1, name: "Modern Gradient", desc: "Modern gradient background with shadow text" },
        { id: 2, name: "Elegant Dark", desc: "Dark elegant theme with gold accents" },
        { id: 3, name: "Minimal White", desc: "Clean minimal white background" },
        { id: 4, name: "Nature Theme", desc: "Nature background with green tones" },
        { id: 5, name: "Tech Blue", desc: "Technology theme with blue colors" },
        { id: 6, name: "Love Red", desc: "Romantic red theme with heart effects" },
        { id: 7, name: "Abstract Art", desc: "Abstract colorful background" },
        { id: 8, name: "Gaming Theme", desc: "Gaming style with controller elements" },
        { id: 9, name: "Business Professional", desc: "Professional business theme" },
        { id: 10, name: "Festive Celebration", desc: "Festive theme for celebrations" }
    ];
    
    let message = `🎨 **FACEBOOK COVER STYLES** 🎨\n\n`;
    
    styles.forEach(style => {
        message += `**Style ${style.id}: ${style.name}**\n`;
        message += `${style.desc}\n`;
        message += `Usage: ${global.config.prefix}fbcover Text1 | Text2 | ${style.id}\n\n`;
    });
    
    message += `📝 **Examples:**\n`;
    message += `• ${global.config.prefix}fbcover Welcome | Home | 1\n`;
    message += `• ${global.config.prefix}fbcover My Profile | 3\n`;
    message += `• ${global.config.prefix}fbcover Happy Birthday! | 6\n\n`;
    
    message += `📏 **Cover Size:** 820 x 312 pixels\n`;
    message += `🎯 **Perfect for Facebook profile cover photo**`;
    
    api.sendMessage(message, threadID, messageID);
}

async function createFBCover(text1, text2, styleId) {
    try {
        // Create temp directory
        const tempDir = path.join(__dirname, '../../cache/covers');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // Generate filename
        const filename = `cover_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`;
        const filePath = path.join(tempDir, filename);
        
        // Facebook cover dimensions
        const width = 820;
        const height = 312;
        
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
        drawBackground(ctx, width, height, styleId);
        
        // Draw text
        drawText(ctx, width, height, text1, text2, styleId);
        
        // Draw additional elements
        drawElements(ctx, width, height, styleId);
        
        // Save image
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(filePath, buffer);
        
        return filePath;
        
    } catch (error) {
        console.error('Cover creation error:', error);
        return null;
    }
}

function drawBackground(ctx, width, height, styleId) {
    // Create gradient or solid background based on style
    const style = parseInt(styleId) || 1;
    
    switch (style) {
        case 1: // Modern Gradient
            const gradient1 = ctx.createLinearGradient(0, 0, width, height);
            gradient1.addColorStop(0, '#667eea');
            gradient1.addColorStop(1, '#764ba2');
            ctx.fillStyle = gradient1;
            break;
            
        case 2: // Elegant Dark
            ctx.fillStyle = '#1a1a2e';
            break;
            
        case 3: // Minimal White
            ctx.fillStyle = '#ffffff';
            break;
            
        case 4: // Nature Theme
            const gradient4 = ctx.createLinearGradient(0, 0, width, height);
            gradient4.addColorStop(0, '#0ba360');
            gradient4.addColorStop(1, '#3cba92');
            ctx.fillStyle = gradient4;
            break;
            
        case 5: // Tech Blue
            const gradient5 = ctx.createLinearGradient(0, 0, width, 0);
            gradient5.addColorStop(0, '#2193b0');
            gradient5.addColorStop(1, '#6dd5ed');
            ctx.fillStyle = gradient5;
            break;
            
        case 6: // Love Red
            const gradient6 = ctx.createLinearGradient(0, 0, width, height);
            gradient6.addColorStop(0, '#ff758c');
            gradient6.addColorStop(1, '#ff7eb3');
            ctx.fillStyle = gradient6;
            break;
            
        case 7: // Abstract Art
            // Draw multiple gradient circles
            for (let i = 0; i < 5; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height;
                const radius = Math.random() * 100 + 50;
                
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
                const colors = [
                    ['#ff9a9e', '#fad0c4'],
                    ['#a1c4fd', '#c2e9fb'],
                    ['#ffecd2', '#fcb69f'],
                    ['#84fab0', '#8fd3f4'],
                    ['#d4fc79', '#96e6a1']
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
            
        case 8: // Gaming Theme
            ctx.fillStyle = '#0f0f23';
            break;
            
        case 9: // Business Professional
            const gradient9 = ctx.createLinearGradient(0, 0, width, 0);
            gradient9.addColorStop(0, '#2c3e50');
            gradient9.addColorStop(1, '#4ca1af');
            ctx.fillStyle = gradient9;
            break;
            
        case 10: // Festive Celebration
            const gradient10 = ctx.createLinearGradient(0, 0, width, height);
            gradient10.addColorStop(0, '#f46b45');
            gradient10.addColorStop(1, '#eea849');
            ctx.fillStyle = gradient10;
            break;
            
        default:
            ctx.fillStyle = '#667eea';
    }
    
    if (style !== 7) {
        ctx.fillRect(0, 0, width, height);
    }
}

function drawText(ctx, width, height, text1, text2, styleId) {
    const style = parseInt(styleId) || 1;
    
    // Set font properties based on style
    let fontSize1, fontSize2, fontFamily, color1, color2;
    
    switch (style) {
        case 1: // Modern
            fontSize1 = 48;
            fontSize2 = 32;
            fontFamily = 'Play Bold, Arial, sans-serif';
            color1 = '#ffffff';
            color2 = '#f0f0f0';
            break;
            
        case 2: // Elegant Dark
            fontSize1 = 42;
            fontSize2 = 28;
            fontFamily = 'Play Bold, Georgia, serif';
            color1 = '#f8f8f8';
            color2 = '#e6e6e6';
            break;
            
        case 3: // Minimal White
            fontSize1 = 44;
            fontSize2 = 30;
            fontFamily = 'Play Bold, Arial, sans-serif';
            color1 = '#333333';
            color2 = '#666666';
            break;
            
        default:
            fontSize1 = 40;
            fontSize2 = 26;
            fontFamily = 'Play Bold, Arial, sans-serif';
            color1 = '#ffffff';
            color2 = '#f0f0f0';
    }
    
    // Draw text shadow for better visibility
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Draw first text
    ctx.font = `bold ${fontSize1}px ${fontFamily}`;
    ctx.fillStyle = color1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const y1 = height / (text2 ? 3 : 2);
    ctx.fillText(text1, width / 2, y1);
    
    // Draw second text if exists
    if (text2) {
        ctx.font = `bold ${fontSize2}px ${fontFamily}`;
        ctx.fillStyle = color2;
        
        const y2 = y1 + fontSize1 + 20;
        ctx.fillText(text2, width / 2, y2);
    }
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
}

function drawElements(ctx, width, height, styleId) {
    const style = parseInt(styleId) || 1;
    
    switch (style) {
        case 6: // Love Red - Draw hearts
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            for (let i = 0; i < 8; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height;
                const size = Math.random() * 20 + 10;
                drawHeart(ctx, x, y, size);
            }
            break;
            
        case 7: // Abstract - Draw geometric shapes
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 2;
            
            for (let i = 0; i < 15; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height;
                const size = Math.random() * 40 + 20;
                
                ctx.beginPath();
                if (Math.random() > 0.5) {
                    // Circle
                    ctx.arc(x, y, size, 0, Math.PI * 2);
                } else {
                    // Triangle
                    ctx.moveTo(x, y - size);
                    ctx.lineTo(x - size, y + size);
                    ctx.lineTo(x + size, y + size);
                    ctx.closePath();
                }
                ctx.stroke();
            }
            break;
            
        case 8: // Gaming - Draw controller elements
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            
            // Draw circles like controller buttons
            for (let i = 0; i < 4; i++) {
                const x = 100 + (i * 150);
                const y = height - 80;
                const radius = 25;
                
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
                
                // Inner circle
                ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
                ctx.beginPath();
                ctx.arc(x, y, radius * 0.6, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            }
            break;
            
        case 10: // Festive - Draw confetti
            for (let i = 0; i < 50; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height;
                const size = Math.random() * 8 + 2;
                
                const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'];
                ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
                
                ctx.beginPath();
                if (Math.random() > 0.5) {
                    // Square confetti
                    ctx.fillRect(x, y, size, size);
                } else {
                    // Circle confetti
                    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            break;
    }
}

function drawHeart(ctx, x, y, size) {
    ctx.save();
    ctx.beginPath();
    
    const topCurveHeight = size * 0.3;
    
    ctx.moveTo(x, y + topCurveHeight);
    // Left top curve
    ctx.bezierCurveTo(
        x, y, 
        x - size / 2, y, 
        x - size / 2, y + topCurveHeight
    );
    
    // Left bottom curve
    ctx.bezierCurveTo(
        x - size / 2, y + (size + topCurveHeight) / 2, 
        x, y + (size + topCurveHeight) / 2, 
        x, y + size
    );
    
    // Right bottom curve
    ctx.bezierCurveTo(
        x, y + (size + topCurveHeight) / 2, 
        x + size / 2, y + (size + topCurveHeight) / 2, 
        x + size / 2, y + topCurveHeight
    );
    
    // Right top curve
    ctx.bezierCurveTo(
        x + size / 2, y, 
        x, y, 
        x, y + topCurveHeight
    );
    
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}