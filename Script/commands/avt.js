const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage, registerFont } = require('canvas');

module.exports = {
    config: {
        name: "avt",
        aliases: ["avatar", "profilepic"],
        version: "2.0",
        author: "RANA",
        role: 0,
        category: "image",
        shortDescription: {
            en: "Create profile picture/avatar",
            bn: "প্রোফাইল পিকচার/অ্যাভাটার তৈরি করুন"
        },
        longDescription: {
            en: "Create custom profile pictures with frames and effects",
            bn: "ফ্রেম এবং ইফেক্ট সহ কাস্টম প্রোফাইল পিকচার তৈরি করুন"
        },
        guide: {
            en: "{pn} [text] | [style] or {pn} list\nReply to user's message to use their profile pic",
            bn: "{pn} [টেক্সট] | [স্টাইল] অথবা {pn} list\nব্যবহারকারীর প্রোফাইল পিক ব্যবহার করতে তাদের মেসেজ রিপ্লাই করুন"
        },
        cooldown: 20
    },

    onStart: async function({ api, event, args }) {
        try {
            const { threadID, messageID, type, messageReply, senderID } = event;
            
            let profilePicUrl = null;
            let userName = "User";
            
            // Check if replied to someone
            if (type === "message_reply") {
                const repliedUserID = messageReply.senderID;
                
                // Get user info
                const userInfo = await api.getUserInfo(repliedUserID);
                userName = userInfo[repliedUserID]?.name || "User";
                
                // Get profile picture
                try {
                    profilePicUrl = `https://graph.facebook.com/${repliedUserID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
                } catch (error) {
                    console.error('Failed to get profile pic:', error);
                }
            } else {
                // Use sender's profile pic
                const userInfo = await api.getUserInfo(senderID);
                userName = userInfo[senderID]?.name || "User";
                
                try {
                    profilePicUrl = `https://graph.facebook.com/${senderID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
                } catch (error) {
                    console.error('Failed to get profile pic:', error);
                }
            }
            
            if (args.length === 0 || args[0].toLowerCase() === 'list') {
                return showAvatarStyles(api, threadID, messageID, profilePicUrl, userName);
            }
            
            const input = args.join(" ");
            const parts = input.split("|").map(part => part.trim());
            
            const text = parts[0] || userName;
            const style = parts[1] || "1";
            const frameColor = parts[2] || null;
            
            // Send processing message
            api.sendMessage(
                "🖼️ Creating profile picture...",
                threadID,
                messageID
            );
            
            // Create avatar
            const avatarPath = await createAvatar(profilePicUrl, text, style, frameColor);
            
            if (!avatarPath) {
                return api.sendMessage(
                    "❌ Failed to create profile picture.",
                    threadID,
                    messageID
                );
            }
            
            // Send the avatar image
            api.sendMessage(
                {
                    body: `✅ Profile Picture Created!\n\n` +
                          `👤 For: ${userName}\n` +
                          `📝 Text: ${text}\n` +
                          `🎨 Style: ${style}\n` +
                          `${frameColor ? `🎨 Frame Color: ${frameColor}\n` : ''}` +
                          `💡 Tip: Reply to someone's message to use their profile picture.`,
                    attachment: fs.createReadStream(avatarPath)
                },
                threadID,
                messageID,
                async () => {
                    // Clean up temp file
                    try {
                        fs.unlinkSync(avatarPath);
                    } catch (error) {
                        // Ignore cleanup errors
                    }
                }
            );
            
        } catch (error) {
            console.error(error);
            api.sendMessage(
                "❌ Failed to create profile picture.",
                event.threadID,
                event.messageID
            );
        }
    }
};

function showAvatarStyles(api, threadID, messageID, profilePicUrl, userName) {
    const styles = [
        { id: 1, name: "Circle Frame", desc: "Circular avatar with frame" },
        { id: 2, name: "Square Modern", desc: "Modern square design" },
        { id: 3, name: "Heart Shape", desc: "Heart shaped avatar" },
        { id: 4, name: "Star Frame", desc: "Star shaped frame" },
        { id: 5, name: "Diamond Cut", desc: "Diamond shaped avatar" },
        { id: 6, name: "Hexagon Tech", desc: "Hexagon tech style" },
        { id: 7, name: "Oval Elegant", desc: "Elegant oval frame" },
        { id: 8, name: "Rounded Square", desc: "Rounded square corners" },
        { id: 9, name: "Double Ring", desc: "Double ring frame" },
        { id: 10, name: "Gradient Border", desc: "Gradient color border" },
        { id: 11, name: "Neon Glow", desc: "Neon glow effect" },
        { id: 12, name: "Vintage Frame", desc: "Vintage style frame" },
        { id: 13, name: "Anime Style", desc: "Anime inspired frame" },
        { id: 14, name: "Gold Luxury", desc: "Gold luxury frame" },
        { id: 15, name: "Sparkle Effect", desc: "Sparkle effects added" }
    ];
    
    let message = `🖼️ **AVATAR/ PROFILE PICTURE STYLES** 🖼️\n\n`;
    message += `👤 **Preview for:** ${userName}\n\n`;
    
    styles.forEach(style => {
        message += `**Style ${style.id}: ${style.name}**\n`;
        message += `${style.desc}\n`;
        message += `Usage: ${global.config.prefix}avt ${userName} | ${style.id} | [color]\n\n`;
    });
    
    message += `🎨 **Color Options:**\n`;
    message += `• red, blue, green, yellow, purple, pink, gold, silver\n`;
    message += `• Or use hex colors: #FF0000, #00FF00, #0000FF\n\n`;
    
    message += `📝 **Examples:**\n`;
    message += `• ${global.config.prefix}avt ${userName} | 1\n`;
    message += `• ${global.config.prefix}avt ${userName} | 5 | gold\n`;
    message += `• ${global.config.prefix}avt My Name | 10 | #FF5733\n\n`;
    
    message += `💡 **How to use:**\n`;
    message += `1. Reply to someone's message to use their profile picture\n`;
    message += `2. Or use your own profile picture\n`;
    message += `3. Add text and choose style\n\n`;
    
    message += `🎯 **Perfect for:**\n`;
    message += `• Facebook profile pictures\n`;
    message += `• Gaming avatars\n`;
    message += `• Social media profiles\n`;
    message += `• Group admin badges`;
    
    api.sendMessage(message, threadID, messageID);
}

async function createAvatar(profilePicUrl, text, styleId, frameColor = null) {
    try {
        // Create temp directory
        const tempDir = path.join(__dirname, '../../cache/avatars');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // Generate filename
        const filename = `avatar_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`;
        const filePath = path.join(tempDir, filename);
        
        // Avatar dimensions
        const size = 512;
        const canvas = createCanvas(size, size);
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
        
        // Try to load profile picture
        let profileImage = null;
        if (profilePicUrl) {
            try {
                const response = await axios.get(profilePicUrl, { responseType: 'arraybuffer' });
                profileImage = await loadImage(Buffer.from(response.data, 'binary'));
            } catch (error) {
                console.error('Failed to load profile picture:', error);
            }
        }
        
        // If no profile picture, create a placeholder
        if (!profileImage) {
            // Create gradient background
            const gradient = ctx.createLinearGradient(0, 0, size, size);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(1, '#764ba2');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, size, size);
            
            // Draw initial letter
            const initial = text.charAt(0).toUpperCase();
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${size/2}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(initial, size/2, size/2);
        } else {
            // Draw profile picture
            ctx.save();
            
            // Create clipping path based on style
            createClippingPath(ctx, size, styleId);
            ctx.clip();
            
            // Draw the profile picture
            ctx.drawImage(profileImage, 0, 0, size, size);
            ctx.restore();
        }
        
        // Draw frame based on style
        await drawAvatarFrame(ctx, size, styleId, frameColor);
        
        // Add text if provided
        if (text && text.length > 0) {
            drawAvatarText(ctx, size, text, styleId);
        }
        
        // Add effects based on style
        drawAvatarEffects(ctx, size, styleId);
        
        // Save image
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(filePath, buffer);
        
        return filePath;
        
    } catch (error) {
        console.error('Avatar creation error:', error);
        return null;
    }
}

function createClippingPath(ctx, size, styleId) {
    const center = size / 2;
    const radius = size / 2 - 20;
    
    ctx.beginPath();
    
    switch (parseInt(styleId)) {
        case 1: // Circle
            ctx.arc(center, center, radius, 0, Math.PI * 2);
            break;
            
        case 2: // Square
            const squareSize = size - 40;
            ctx.rect(20, 20, squareSize, squareSize);
            break;
            
        case 3: // Heart
            drawHeartPath(ctx, center, center, radius);
            break;
            
        case 4: // Star
            drawStarPath(ctx, center, center, 5, radius, radius * 0.5);
            break;
            
        case 5: // Diamond
            ctx.moveTo(center, 20);
            ctx.lineTo(size - 20, center);
            ctx.lineTo(center, size - 20);
            ctx.lineTo(20, center);
            ctx.closePath();
            break;
            
        case 6: // Hexagon
            drawPolygonPath(ctx, center, center, 6, radius);
            break;
            
        case 7: // Oval
            ctx.ellipse(center, center, radius * 0.8, radius, 0, 0, Math.PI * 2);
            break;
            
        case 8: // Rounded Square
            const roundedSize = size - 40;
            const cornerRadius = 50;
            ctx.roundRect(20, 20, roundedSize, roundedSize, cornerRadius);
            break;
            
        default: // Circle (default)
            ctx.arc(center, center, radius, 0, Math.PI * 2);
    }
}

async function drawAvatarFrame(ctx, size, styleId, frameColor = null) {
    const center = size / 2;
    const outerRadius = size / 2;
    const innerRadius = outerRadius - 20;
    
    // Get frame color
    let color;
    if (frameColor) {
        color = getColorFromName(frameColor);
    } else {
        // Default colors based on style
        const defaultColors = [
            '#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', '#118AB2',
            '#EF476F', '#FFD166', '#06D6A0', '#118AB2', '#073B4C',
            '#7209B7', '#3A86FF', '#FB5607', '#8338EC', '#FF006E'
        ];
        color = defaultColors[(parseInt(styleId) - 1) % defaultColors.length];
    }
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 10;
    
    switch (parseInt(styleId)) {
        case 1: // Circle Frame
            ctx.beginPath();
            ctx.arc(center, center, innerRadius + 5, 0, Math.PI * 2);
            ctx.stroke();
            break;
            
        case 2: // Square Frame
            const squareSize = size - 40;
            ctx.strokeRect(15, 15, squareSize + 10, squareSize + 10);
            break;
            
        case 3: // Heart Frame
            ctx.beginPath();
            drawHeartPath(ctx, center, center, innerRadius);
            ctx.stroke();
            break;
            
        case 4: // Star Frame
            ctx.beginPath();
            drawStarPath(ctx, center, center, 5, innerRadius, innerRadius * 0.5);
            ctx.stroke();
            break;
            
        case 5: // Diamond Frame
            ctx.beginPath();
            ctx.moveTo(center, 25);
            ctx.lineTo(size - 25, center);
            ctx.lineTo(center, size - 25);
            ctx.lineTo(25, center);
            ctx.closePath();
            ctx.stroke();
            break;
            
        case 6: // Hexagon Frame
            ctx.beginPath();
            drawPolygonPath(ctx, center, center, 6, innerRadius);
            ctx.stroke();
            break;
            
        case 7: // Oval Frame
            ctx.beginPath();
            ctx.ellipse(center, center, innerRadius * 0.8, innerRadius, 0, 0, Math.PI * 2);
            ctx.stroke();
            break;
            
        case 8: // Rounded Square Frame
            const roundedSize = size - 40;
            const cornerRadius = 50;
            ctx.beginPath();
            ctx.roundRect(15, 15, roundedSize + 10, roundedSize + 10, cornerRadius);
            ctx.stroke();
            break;
            
        case 9: // Double Ring
            ctx.beginPath();
            ctx.arc(center, center, innerRadius + 5, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(center, center, innerRadius - 5, 0, Math.PI * 2);
            ctx.stroke();
            break;
            
        case 10: // Gradient Border
            const gradient = ctx.createLinearGradient(0, 0, size, size);
            gradient.addColorStop(0, '#FF6B6B');
            gradient.addColorStop(0.5, '#4ECDC4');
            gradient.addColorStop(1, '#FFD166');
            
            ctx.strokeStyle = gradient;
            ctx.beginPath();
            ctx.arc(center, center, innerRadius + 5, 0, Math.PI * 2);
            ctx.stroke();
            break;
            
        case 11: // Neon Glow
            ctx.shadowColor = color;
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(center, center, innerRadius + 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            break;
            
        case 12: // Vintage Frame
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 15;
            ctx.setLineDash([10, 5]);
            ctx.beginPath();
            ctx.arc(center, center, innerRadius + 7, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            break;
            
        case 14: // Gold Luxury
            const goldGradient = ctx.createLinearGradient(0, 0, size, 0);
            goldGradient.addColorStop(0, '#FFD700');
            goldGradient.addColorStop(0.5, '#FFF8DC');
            goldGradient.addColorStop(1, '#FFD700');
            
            ctx.strokeStyle = goldGradient;
            ctx.lineWidth = 15;
            ctx.beginPath();
            ctx.arc(center, center, innerRadius + 7, 0, Math.PI * 2);
            ctx.stroke();
            break;
            
        default: // Simple Circle Frame
            ctx.beginPath();
            ctx.arc(center, center, innerRadius + 5, 0, Math.PI * 2);
            ctx.stroke();
    }
}

function drawAvatarText(ctx, size, text, styleId) {
    const center = size / 2;
    
    // Text properties based on style
    let fontSize, yPosition, color, hasBackground;
    
    switch (parseInt(styleId)) {
        case 1:
        case 2:
        case 3:
            fontSize = 24;
            yPosition = size - 40;
            color = '#ffffff';
            hasBackground = true;
            break;
            
        case 4:
        case 5:
            fontSize = 28;
            yPosition = size - 30;
            color = '#FFD700';
            hasBackground = false;
            break;
            
        case 6:
        case 7:
            fontSize = 22;
            yPosition = 40;
            color = '#ffffff';
            hasBackground = true;
            break;
            
        case 8:
        case 9:
            fontSize = 26;
            yPosition = size - 35;
            color = '#333333';
            hasBackground = false;
            break;
            
        case 10:
        case 11:
            fontSize = 30;
            yPosition = size - 30;
            color = '#ffffff';
            hasBackground = true;
            break;
            
        case 12:
        case 13:
            fontSize = 24;
            yPosition = 45;
            color = '#8B4513';
            hasBackground = false;
            break;
            
        case 14:
        case 15:
            fontSize = 32;
            yPosition = size - 35;
            color = '#FFD700';
            hasBackground = true;
            break;
            
        default:
            fontSize = 24;
            yPosition = size - 40;
            color = '#ffffff';
            hasBackground = true;
    }
    
    // Truncate text if too long
    let displayText = text;
    if (displayText.length > 15) {
        displayText = displayText.substring(0, 12) + '...';
    }
    
    // Draw text background if needed
    if (hasBackground) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        const textWidth = ctx.measureText(displayText).width;
        const padding = 10;
        ctx.fillRect(
            center - textWidth/2 - padding,
            yPosition - fontSize - padding/2,
            textWidth + padding*2,
            fontSize + padding
        );
    }
    
    // Draw text shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Draw text
    ctx.font = `bold ${fontSize}px Play Bold, Arial, sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayText, center, yPosition);
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
}

function drawAvatarEffects(ctx, size, styleId) {
    switch (parseInt(styleId)) {
        case 11: // Neon Glow - Add extra glow
            ctx.shadowColor = '#00FFFF';
            ctx.shadowBlur = 30;
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(size/2, size/2, size/2 - 25, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            break;
            
        case 13: // Anime Style - Add sparkles
            ctx.fillStyle = '#ffffff';
            for (let i = 0; i < 20; i++) {
                const x = Math.random() * size;
                const y = Math.random() * size;
                const sparkleSize = Math.random() * 4 + 1;
                
                // Draw small cross for sparkle
                ctx.fillRect(x - sparkleSize/2, y, sparkleSize, 1);
                ctx.fillRect(x, y - sparkleSize/2, 1, sparkleSize);
            }
            break;
            
        case 15: // Sparkle Effect - Add more sparkles
            for (let i = 0; i < 30; i++) {
                const x = Math.random() * size;
                const y = Math.random() * size;
                const sizeStar = Math.random() * 6 + 2;
                const angle = Math.random() * Math.PI * 2;
                
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle);
                ctx.fillStyle = i % 3 === 0 ? '#FFD700' : (i % 3 === 1 ? '#FFFFFF' : '#FF6B6B');
                
                // Draw star
                for (let j = 0; j < 5; j++) {
                    ctx.rotate((Math.PI * 2) / 5);
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(sizeStar, 0);
                    ctx.lineTo(sizeStar * 0.5, -sizeStar * 0.3);
                    ctx.closePath();
                    ctx.fill();
                }
                ctx.restore();
            }
            break;
    }
}

function drawHeartPath(ctx, x, y, size) {
    const topCurveHeight = size * 0.3;
    
    ctx.moveTo(x, y + topCurveHeight);
    ctx.bezierCurveTo(x, y, x - size/2, y, x - size/2, y + topCurveHeight);
    ctx.bezierCurveTo(
        x - size/2, y + (size + topCurveHeight)/2,
        x, y + (size + topCurveHeight)/2,
        x, y + size
    );
    ctx.bezierCurveTo(
        x, y + (size + topCurveHeight)/2,
        x + size/2, y + (size + topCurveHeight)/2,
        x + size/2, y + topCurveHeight
    );
    ctx.bezierCurveTo(x + size/2, y, x, y, x, y + topCurveHeight);
}

function drawStarPath(ctx, x, y, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let step = Math.PI / spikes;

    ctx.moveTo(x, y - outerRadius);
    
    for (let i = 0; i < spikes; i++) {
        // Outer point
        ctx.lineTo(
            x + Math.cos(rot) * outerRadius,
            y + Math.sin(rot) * outerRadius
        );
        rot += step;

        // Inner point
        ctx.lineTo(
            x + Math.cos(rot) * innerRadius,
            y + Math.sin(rot) * innerRadius
        );
        rot += step;
    }
    
    ctx.closePath();
}

function drawPolygonPath(ctx, x, y, sides, radius) {
    ctx.moveTo(
        x + radius * Math.cos(0),
        y + radius * Math.sin(0)
    );

    for (let i = 1; i <= sides; i++) {
        ctx.lineTo(
            x + radius * Math.cos(i * 2 * Math.PI / sides),
            y + radius * Math.sin(i * 2 * Math.PI / sides)
        );
    }
    
    ctx.closePath();
}

function getColorFromName(colorName) {
    const colors = {
        'red': '#FF0000',
        'green': '#00FF00',
        'blue': '#0000FF',
        'yellow': '#FFFF00',
        'purple': '#800080',
        'pink': '#FFC0CB',
        'orange': '#FFA500',
        'gold': '#FFD700',
        'silver': '#C0C0C0',
        'black': '#000000',
        'white': '#FFFFFF',
        'cyan': '#00FFFF',
        'magenta': '#FF00FF',
        'lime': '#00FF00',
        'maroon': '#800000',
        'navy': '#000080',
        'teal': '#008080',
        'olive': '#808000'
    };
    
    // Check if it's a hex color
    if (colorName.startsWith('#')) {
        return colorName;
    }
    
    return colors[colorName.toLowerCase()] || '#FF6B6B';
}