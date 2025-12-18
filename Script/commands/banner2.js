const Canvas = require('canvas');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

module.exports = {
    config: {
        name: "banner2",
        version: "3.5",
        author: "RANA",
        countDown: 20,
        role: 0,
        shortDescription: {
            en: "Advanced banner creator with templates",
            bn: "টেমপ্লেট সহ উন্নত ব্যানার তৈরি কারী"
        },
        longDescription: {
            en: "Create advanced banners with templates, custom colors, fonts, and effects",
            bn: "টেমপ্লেট, কাস্টম রং, ফন্ট এবং ইফেক্ট সহ উন্নত ব্যানার তৈরি করুন"
        },
        category: "image",
        guide: {
            en: "{pn} [text] -template [template_name] -color [hex_color] -font [font_name]",
            bn: "{pn} [টেক্সট] -template [টেমপ্লেট_নাম] -color [হেক্স_রং] -font [ফন্ট_নাম]"
        }
    },

    onStart: async function ({ api, event, args, message, getLang }) {
        let text = args.join(" ");
        let template = "modern";
        let color = "#667eea";
        let font = "Arial";
        let size = "1200x400";

        if (!text) {
            return message.reply(getLang("noText"));
        }

        // Parse parameters
        const params = parseParameters(text);
        text = params.text;
        template = params.template || template;
        color = params.color || color;
        font = params.font || font;
        size = params.size || size;

        try {
            await message.reply(getLang("creating", { template, size }));

            const [width, height] = size.split('x').map(Number);
            const banner = await createAdvancedBanner(text, {
                template,
                color,
                font,
                width,
                height
            });
            
            await message.reply({
                body: getLang("created", { 
                    text: text.length > 50 ? text.substring(0, 50) + "..." : text,
                    template 
                }),
                attachment: banner
            });

        } catch (error) {
            console.error('Advanced banner error:', error);
            await message.reply(getLang("error", { error: error.message }));
        }
    },

    langs: {
        en: {
            noText: "❌ Please provide text for the banner\nExample: {pn} Hello World -template modern -color #FF0000",
            creating: "🎨 Creating advanced banner...\nTemplate: {template}\nSize: {size}",
            created: "🖼️ Advanced Banner Created!\n\nText: {text}\nTemplate: {template}",
            templates: "📋 Available Templates:\n\n• modern - Modern design\n• elegant - Elegant style\n• gaming - Gaming theme\n• business - Professional business\n• birthday - Birthday celebration\n• wedding - Wedding theme\n• abstract - Abstract art\n• futuristic - Futuristic design\n• nature2 - Nature theme v2\n• minimal2 - Minimalist v2",
            colors: "🎨 Color Options:\n\nUse hex colors: #FF0000 (red), #00FF00 (green), #0000FF (blue)\nOr color names: red, blue, green, purple, orange, pink",
            fonts: "🔤 Font Options:\n\n• Arial\n• Times New Roman\n• Courier New\n• Georgia\n• Verdana\n• Comic Sans MS\n• Impact\n• Trebuchet MS",
            sizes: "📐 Size Options:\n\n• 1200x400 (Default)\n• 1920x1080 (HD)\n• 1080x1920 (Portrait)\n• 800x200 (Small)\n• 1600x900 (Widescreen)",
            help: "🆘 Advanced Banner Help:\n\n{pn} [text] -template [name] -color [hex] -font [name] -size [WxH]\n\nExamples:\n• {pn} Hello World -template modern\n• {pn} Welcome -template gaming -color #FF0000\n• {pn} Birthday! -template birthday -size 1920x1080\n\nUse: {pn} templates, {pn} colors, {pn} fonts, {pn} sizes",
            error: "❌ Error: {error}"
        },
        bn: {
            noText: "❌ দয়া করে ব্যানারের জন্য টেক্সট দিন\nউদাহরণ: {pn} Hello World -template modern -color #FF0000",
            creating: "🎨 উন্নত ব্যানার তৈরি হচ্ছে...\nটেমপ্লেট: {template}\nসাইজ: {size}",
            created: "🖼️ উন্নত ব্যানার তৈরি হয়েছে!\n\nটেক্সট: {text}\nটেমপ্লেট: {template}",
            templates: "📋 উপলব্ধ টেমপ্লেট:\n\n• modern - আধুনিক ডিজাইন\n• elegant - মার্জিত শৈলী\n• gaming - গেমিং থিম\n• business - পেশাদার ব্যবসা\n• birthday - জন্মদিন উদযাপন\n• wedding - বিবাহ থিম\n• abstract - বিমূর্ত শিল্প\n• futuristic - ভবিষ্যতবাদী ডিজাইন\n• nature2 - প্রকৃতি থিম v2\n• minimal2 - মিনিমালিস্ট v2",
            colors: "🎨 রং অপশন:\n\nহেক্স রং ব্যবহার করুন: #FF0000 (লাল), #00FF00 (সবুজ), #0000FF (নীল)\nবা রংয়ের নাম: red, blue, green, purple, orange, pink",
            fonts: "🔤 ফন্ট অপশন:\n\n• Arial\n• Times New Roman\n• Courier New\n• Georgia\n• Verdana\n• Comic Sans MS\n• Impact\n• Trebuchet MS",
            sizes: "📐 সাইজ অপশন:\n\n• 1200x400 (ডিফল্ট)\n• 1920x1080 (এইচডি)\n• 1080x1920 (পোর্ট্রেট)\n• 800x200 (ছোট)\n• 1600x900 (ওয়াইডস্ক্রিন)",
            help: "🆘 উন্নত ব্যানার সাহায্য:\n\n{pn} [টেক্সট] -template [নাম] -color [হেক্স] -font [নাম] -size [WxH]\n\nউদাহরণ:\n• {pn} Hello World -template modern\n• {pn} Welcome -template gaming -color #FF0000\n• {pn} Birthday! -template birthday -size 1920x1080\n\nব্যবহার করুন: {pn} templates, {pn} colors, {pn} fonts, {pn} sizes",
            error: "❌ ত্রুটি: {error}"
        }
    },

    onChat: async function ({ event, message, getLang }) {
        const body = event.body?.toLowerCase() || '';
        
        if (body.includes('banner2 templates')) {
            return message.reply(getLang("templates"));
        }
        
        if (body.includes('banner2 colors')) {
            return message.reply(getLang("colors"));
        }
        
        if (body.includes('banner2 fonts')) {
            return message.reply(getLang("fonts"));
        }
        
        if (body.includes('banner2 sizes')) {
            return message.reply(getLang("sizes"));
        }
        
        if (body.includes('banner2 help')) {
            return message.reply(getLang("help"));
        }
    }
};

function parseParameters(text) {
    const params = {
        text: text,
        template: null,
        color: null,
        font: null,
        size: null
    };

    const patterns = {
        template: /-template\s+(\S+)/i,
        color: /-color\s+(\S+)/i,
        font: /-font\s+(\S+)/i,
        size: /-size\s+(\d+x\d+)/i
    };

    for (const [key, pattern] of Object.entries(patterns)) {
        const match = text.match(pattern);
        if (match) {
            params[key] = match[1];
            params.text = params.text.replace(match[0], '').trim();
        }
    }

    return params;
}

async function createAdvancedBanner(text, options) {
    const { template, color, font, width, height } = options;
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Load template
    await applyTemplate(ctx, width, height, template, color);

    // Add text with specified font
    ctx.font = `bold ${Math.min(width / 15, 72)}px "${font}"`;
    ctx.fillStyle = getTextColor(color);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Add text shadow for better visibility
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    
    // Handle long text by wrapping
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];
    
    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const testLine = currentLine + ' ' + word;
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width < width * 0.8) {
            currentLine = testLine;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    
    // Draw text lines
    const lineHeight = Math.min(width / 15, 72) * 1.2;
    const startY = height / 2 - (lines.length - 1) * lineHeight / 2;
    
    lines.forEach((line, index) => {
        ctx.fillText(line, width / 2, startY + index * lineHeight);
    });
    
    // Reset shadow
    ctx.shadowBlur = 0;
    
    // Add footer
    ctx.font = '16px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText('Created with YOUR CRUSH BOT', width / 2, height - 30);

    const tempPath = path.join(__dirname, '..', '..', 'cache', `banner2_${Date.now()}.png`);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(tempPath, buffer);

    return fs.createReadStream(tempPath);
}

async function applyTemplate(ctx, width, height, template, color) {
    const templates = {
        'modern': drawModernTemplate,
        'elegant': drawElegantTemplate,
        'gaming': drawGamingTemplate,
        'business': drawBusinessTemplate,
        'birthday': drawBirthdayTemplate,
        'wedding': drawWeddingTemplate,
        'abstract': drawAbstractTemplate,
        'futuristic': drawFuturisticTemplate,
        'nature2': drawNature2Template,
        'minimal2': drawMinimal2Template
    };

    const drawFunction = templates[template] || drawModernTemplate;
    await drawFunction(ctx, width, height, color);
}

function drawModernTemplate(ctx, width, height, color) {
    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    const color2 = lightenColor(color, 30);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, color2);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Geometric pattern overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    const patternSize = 50;
    
    for (let x = 0; x < width; x += patternSize) {
        for (let y = 0; y < height; y += patternSize) {
            if ((x + y) % (patternSize * 2) === 0) {
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}

function drawElegantTemplate(ctx, width, height, color) {
    // Soft background
    ctx.fillStyle = lightenColor(color, 80);
    ctx.fillRect(0, 0, width, height);

    // Decorative borders
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    
    // Top and bottom borders
    ctx.beginPath();
    ctx.moveTo(50, 50);
    ctx.lineTo(width - 50, 50);
    ctx.moveTo(50, height - 50);
    ctx.lineTo(width - 50, height - 50);
    ctx.stroke();

    // Corner ornaments
    drawCornerOrnament(ctx, 50, 50, color);
    drawCornerOrnament(ctx, width - 50, 50, color);
    drawCornerOrnament(ctx, 50, height - 50, color);
    drawCornerOrnament(ctx, width - 50, height - 50, color);
}

function drawGamingTemplate(ctx, width, height, color) {
    // Dark background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // Neon glow effects
    const neonColors = [color, '#ffffff', lightenColor(color, 50)];
    
    for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = neonColors[i];
        ctx.lineWidth = 3 - i;
        ctx.shadowColor = neonColors[i];
        ctx.shadowBlur = 20 - i * 5;
        
        // Border
        ctx.strokeRect(20 + i * 5, 20 + i * 5, width - 40 - i * 10, height - 40 - i * 10);
    }
    
    ctx.shadowBlur = 0;

    // Pixel grid
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    const pixelSize = 10;
    
    for (let x = 0; x < width; x += pixelSize) {
        for (let y = 0; y < height; y += pixelSize) {
            if ((x + y) % (pixelSize * 4) === 0) {
                ctx.fillRect(x, y, pixelSize - 1, pixelSize - 1);
            }
        }
    }
}

function drawBusinessTemplate(ctx, width, height, color) {
    // Professional gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#f8fafc');
    gradient.addColorStop(1, '#e2e8f0');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Accent color bars
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, 10);
    ctx.fillRect(0, height - 10, width, 10);

    // Subtle grid
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    
    const gridSize = 50;
    for (let x = gridSize; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    
    for (let y = gridSize; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }

    // Company logo placeholder
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(width - 150, 20, 120, 40);
    
    ctx.fillStyle = color;
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('COMPANY', width - 90, 40);
}

function drawBirthdayTemplate(ctx, width, height, color) {
    // Celebration background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#fbbf24');
    gradient.addColorStop(0.5, '#f87171');
    gradient.addColorStop(1, '#60a5fa');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Confetti
    for (let i = 0; i < 100; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = 5 + Math.random() * 10;
        const confettiColor = getRandomBirthdayColor();
        
        ctx.fillStyle = confettiColor;
        
        if (Math.random() > 0.5) {
            // Square confetti
            ctx.fillRect(x, y, size, size);
        } else {
            // Circle confetti
            ctx.beginPath();
            ctx.arc(x, y, size / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Balloons
    drawBalloon(ctx, width * 0.2, height * 0.3, '#ef4444');
    drawBalloon(ctx, width * 0.4, height * 0.4, '#3b82f6');
    drawBalloon(ctx, width * 0.6, height * 0.3, '#10b981');
    drawBalloon(ctx, width * 0.8, height * 0.4, '#f59e0b');
}

function drawWeddingTemplate(ctx, width, height, color) {
    // Romantic background
    ctx.fillStyle = '#fff5f5';
    ctx.fillRect(0, 0, width, height);

    // Floral pattern
    ctx.fillStyle = '#fecdd3';
    drawFloralPattern(ctx, width, height);

    // Gold accents
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    
    // Border
    ctx.strokeRect(20, 20, width - 40, height - 40);
    
    // Heart shapes
    drawHeart(ctx, width * 0.2, height * 0.3, 30, '#fbbf24');
    drawHeart(ctx, width * 0.8, height * 0.3, 30, '#fbbf24');
    drawHeart(ctx, width * 0.5, height * 0.7, 40, '#f87171');

    // Dotted line
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(width * 0.3, height * 0.5);
    ctx.lineTo(width * 0.7, height * 0.5);
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawAbstractTemplate(ctx, width, height, color) {
    // Base color
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);

    // Abstract shapes
    const shapes = 20;
    
    for (let i = 0; i < shapes; i++) {
        const shapeType = Math.floor(Math.random() * 3);
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = 30 + Math.random() * 70;
        const shapeColor = getRandomColor();
        const alpha = 0.3 + Math.random() * 0.4;
        
        ctx.fillStyle = shapeColor;
        ctx.globalAlpha = alpha;
        
        switch (shapeType) {
            case 0: // Circle
                ctx.beginPath();
                ctx.arc(x, y, size / 2, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 1: // Triangle
                drawRandomTriangle(ctx, x, y, size);
                break;
            case 2: // Irregular polygon
                drawIrregularPolygon(ctx, x, y, size);
                break;
        }
    }
    
    ctx.globalAlpha = 1;

    // Connecting lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < 10; i++) {
        const x1 = Math.random() * width;
        const y1 = Math.random() * height;
        const x2 = Math.random() * width;
        const y2 = Math.random() * height;
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
}

function drawFuturisticTemplate(ctx, width, height, color) {
    // Dark futuristic background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.lineWidth = 1;
    
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    
    for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }

    // Glowing orbs
    for (let i = 0; i < 5; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const radius = 20 + Math.random() * 30;
        
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // Binary rain
    ctx.fillStyle = 'rgba(59, 130, 246, 0.5)';
    ctx.font = '14px monospace';
    
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const binary = Math.random() > 0.5 ? '1' : '0';
        ctx.fillText(binary, x, y);
    }
}

function drawNature2Template(ctx, width, height, color) {
    // Sky
    const skyGradient = ctx.createLinearGradient(0, 0, 0, height / 2);
    skyGradient.addColorStop(0, '#38bdf8');
    skyGradient.addColorStop(1, '#bae6fd');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, width, height / 2);

    // Grass
    const grassGradient = ctx.createLinearGradient(0, height / 2, 0, height);
    grassGradient.addColorStop(0, '#4ade80');
    grassGradient.addColorStop(1, '#16a34a');
    ctx.fillStyle = grassGradient;
    ctx.fillRect(0, height / 2, width, height / 2);

    // Sun
    ctx.beginPath();
    ctx.arc(width - 100, 100, 50, 0, Math.PI * 2);
    ctx.fillStyle = '#fbbf24';
    ctx.fill();

    // Clouds
    drawCloud(ctx, 100, 80, 60);
    drawCloud(ctx, 300, 120, 80);
    drawCloud(ctx, 500, 90, 70);

    // Mountains
    drawMountain(ctx, 0, height / 2, width, height / 2, '#475569');
    drawMountain(ctx, width / 3, height / 2, width, height / 2, '#64748b');

    // Trees
    for (let i = 0; i < 8; i++) {
        const x = 80 + i * 140;
        drawDetailedTree(ctx, x, height / 2, 40 + Math.random() * 30);
    }
}

function drawMinimal2Template(ctx, width, height, color) {
    // Clean white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Single accent line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    
    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(width * 0.1, height * 0.5);
    ctx.lineTo(width * 0.9, height * 0.5);
    ctx.stroke();

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(width * 0.5, height * 0.3);
    ctx.lineTo(width * 0.5, height * 0.7);
    ctx.stroke();

    // Small dots at intersections
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(width * 0.1, height * 0.5, 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(width * 0.9, height * 0.5, 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(width * 0.5, height * 0.3, 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(width * 0.5, height * 0.7, 3, 0, Math.PI * 2);
    ctx.fill();

    // Corner marks
    ctx.fillRect(20, 20, 2, 20);
    ctx.fillRect(20, 20, 20, 2);
    
    ctx.fillRect(width - 20, 20, 2, 20);
    ctx.fillRect(width - 40, 20, 20, 2);
    
    ctx.fillRect(20, height - 20, 2, -20);
    ctx.fillRect(20, height - 20, 20, -2);
    
    ctx.fillRect(width - 20, height - 20, 2, -20);
    ctx.fillRect(width - 40, height - 20, 20, -2);
}

// Helper Functions
function lightenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    
    return "#" + (
        0x1000000 +
        (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)
    ).toString(16).slice(1);
}

function getTextColor(bgColor) {
    // Convert hex to RGB
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate brightness
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    // Return black or white based on brightness
    return brightness > 125 ? '#000000' : '#FFFFFF';
}

function getRandomColor() {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#FFE66D', '#FF8E53', '#9B5DE5',
        '#00BBF9', '#00F5D4', '#FEE440', '#FB5607', '#8338EC'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

function getRandomBirthdayColor() {
    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#9B5DE5', '#FF8E53'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function drawCornerOrnament(ctx, x, y, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(20, 0);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 20);
    ctx.stroke();
    
    ctx.restore();
}

function drawBalloon(ctx, x, y, color) {
    // Balloon body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, 30, 40, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Balloon tip
    ctx.beginPath();
    ctx.moveTo(x, y + 40);
    ctx.lineTo(x - 5, y + 50);
    ctx.lineTo(x + 5, y + 50);
    ctx.closePath();
    ctx.fill();
    
    // String
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + 50);
    ctx.lineTo(x, y + 80);
    ctx.stroke();
}

function drawHeart(ctx, x, y, size, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    
    ctx.beginPath();
    ctx.moveTo(0, size / 4);
    ctx.bezierCurveTo(-size / 2, -size / 2, -size, size / 4, 0, size);
    ctx.bezierCurveTo(size, size / 4, size / 2, -size / 2, 0, size / 4);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
}

function drawFloralPattern(ctx, width, height) {
    const flowers = 30;
    
    for (let i = 0; i < flowers; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = 5 + Math.random() * 15;
        
        ctx.beginPath();
        for (let j = 0; j < 5; j++) {
            const angle = (j * Math.PI * 2) / 5;
            const petalX = x + size * Math.cos(angle);
            const petalY = y + size * Math.sin(angle);
            
            if (j === 0) {
                ctx.moveTo(petalX, petalY);
            } else {
                ctx.lineTo(petalX, petalY);
            }
        }
        ctx.closePath();
        ctx.fill();
    }
}

function drawRandomTriangle(ctx, x, y, size) {
    ctx.beginPath();
    ctx.moveTo(x + size * Math.cos(0), y + size * Math.sin(0));
    ctx.lineTo(x + size * Math.cos(2 * Math.PI / 3), y + size * Math.sin(2 * Math.PI / 3));
    ctx.lineTo(x + size * Math.cos(4 * Math.PI / 3), y + size * Math.sin(4 * Math.PI / 3));
    ctx.closePath();
    ctx.fill();
}

function drawIrregularPolygon(ctx, x, y, size) {
    const sides = 3 + Math.floor(Math.random() * 5);
    ctx.beginPath();
    
    for (let i = 0; i < sides; i++) {
        const angle = (i * Math.PI * 2) / sides + Math.random() * 0.5;
        const radius = size / 2 * (0.7 + Math.random() * 0.6);
        const px = x + radius * Math.cos(angle);
        const py = y + radius * Math.sin(angle);
        
        if (i === 0) {
            ctx.moveTo(px, py);
        } else {
            ctx.lineTo(px, py);
        }
    }
    
    ctx.closePath();
    ctx.fill();
}

function drawCloud(ctx, x, y, size) {
    ctx.fillStyle = '#ffffff';
    
    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    ctx.arc(x + size * 0.4, y - size * 0.2, size * 0.4, 0, Math.PI * 2);
    ctx.arc(x + size * 0.8, y, size * 0.5, 0, Math.PI * 2);
    ctx.arc(x + size * 0.4, y + size * 0.2, size * 0.4, 0, Math.PI * 2);
    ctx.fill();
}

function drawMountain(ctx, x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y + height);
    ctx.lineTo(x + width / 2, y);
    ctx.lineTo(x + width, y + height);
    ctx.closePath();
    ctx.fill();
}

function drawDetailedTree(ctx, x, y, size) {
    // Trunk
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x - size / 10, y, size / 5, size);
    
    // Leaves layers
    const leafColors = ['#14532d', '#166534', '#15803d'];
    
    for (let i = 0; i < 3; i++) {
        ctx.fillStyle = leafColors[i];
        ctx.beginPath();
        ctx.ellipse(x, y - i * size / 3, size / 2, size / 3, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}