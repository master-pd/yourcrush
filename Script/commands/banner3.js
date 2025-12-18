const Canvas = require('canvas');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

module.exports = {
    config: {
        name: "banner3",
        version: "4.0",
        author: "RANA",
        countDown: 25,
        role: 0,
        shortDescription: {
            en: "Professional banner generator with AI",
            bn: "AI সহ পেশাদার ব্যানার জেনারেটর"
        },
        longDescription: {
            en: "Create professional banners with AI-powered design suggestions, multiple layouts, and advanced effects",
            bn: "AI-পাওয়ার্ড ডিজাইন পরামর্শ, একাধিক লেআউট এবং উন্নত ইফেক্ট সহ পেশাদার ব্যানার তৈরি করুন"
        },
        category: "image",
        guide: {
            en: "{pn} [text] -style [style_number] -layout [layout] -theme [theme]",
            bn: "{pn} [টেক্সট] -style [স্টাইল_নম্বর] -layout [লেআউট] -theme [থিম]"
        }
    },

    onStart: async function ({ api, event, args, message, getLang }) {
        let text = args.join(" ");
        
        if (!text) {
            return message.reply(getLang("noText"));
        }

        // Parse advanced parameters
        const params = parseAdvancedParameters(text);
        text = params.text;
        
        const style = params.style || "1";
        const layout = params.layout || "center";
        const theme = params.theme || "professional";
        const bgImage = params.bgImage;
        const size = params.size || "1200x400";

        try {
            await message.reply(getLang("creating", { 
                style: `Style ${style}`, 
                layout, 
                theme 
            }));

            const [width, height] = size.split('x').map(Number);
            const banner = await createProfessionalBanner(text, {
                style: parseInt(style),
                layout,
                theme,
                bgImage,
                width,
                height
            });
            
            await message.reply({
                body: getLang("created", { 
                    text: text.length > 30 ? text.substring(0, 30) + "..." : text,
                    style,
                    layout 
                }),
                attachment: banner
            });

        } catch (error) {
            console.error('Professional banner error:', error);
            await message.reply(getLang("error", { error: error.message }));
        }
    },

    langs: {
        en: {
            noText: "❌ Please provide text for the banner\nExample: {pn} Company Name -style 2 -layout left -theme dark",
            creating: "🎨 Creating professional banner...\n\n⚡ Style: {style}\n📐 Layout: {layout}\n🎨 Theme: {theme}",
            created: "🖼️ Professional Banner Created!\n\n📝 Text: {text}\n🎭 Style: {style}\n📐 Layout: {layout}",
            styles: "🎭 Available Styles (1-10):\n\n1. Modern Corporate\n2. Creative Agency\n3. Tech Startup\n4. Elegant Luxury\n5. Minimalist Design\n6. Bold Marketing\n7. Social Media\n8. Event Promotion\n9. Educational\n10. Artistic",
            layouts: "📐 Layout Options:\n\n• center - Centered text\n• left - Left aligned\n• right - Right aligned\n• split - Split screen\n• overlay - Text overlay\n• diagonal - Diagonal layout",
            themes: "🎨 Theme Options:\n\n• professional - Professional theme\n• creative - Creative theme\n• tech - Technology theme\n• luxury - Luxury theme\n• minimal - Minimalist theme\n• vibrant - Vibrant colors\n• dark - Dark mode\n• light - Light mode\n• nature - Nature theme\n• abstract - Abstract art",
            help: "🆘 Professional Banner Help:\n\n{pn} [text] -style [1-10] -layout [type] -theme [theme] -size [WxH] -bg [image_url]\n\nExamples:\n• {pn} Tech Conference -style 3 -layout center -theme tech\n• {pn} Summer Sale -style 6 -layout split -theme vibrant\n• {pn} Welcome -style 1 -layout left -theme professional -size 1920x1080\n\nUse: {pn} styles, {pn} layouts, {pn} themes for more options",
            error: "❌ Error: {error}"
        },
        bn: {
            noText: "❌ দয়া করে ব্যানারের জন্য টেক্সট দিন\nউদাহরণ: {pn} Company Name -style 2 -layout left -theme dark",
            creating: "🎨 পেশাদার ব্যানার তৈরি হচ্ছে...\n\n⚡ স্টাইল: {style}\n📐 লেআউট: {layout}\n🎨 থিম: {theme}",
            created: "🖼️ পেশাদার ব্যানার তৈরি হয়েছে!\n\n📝 টেক্সট: {text}\n🎭 স্টাইল: {style}\n📐 লেআউট: {layout}",
            styles: "🎭 উপলব্ধ স্টাইল (1-10):\n\n১. আধুনিক কর্পোরেট\n২. ক্রিয়েটিভ এজেন্সি\n৩. টেক স্টার্টআপ\n৪. মার্জিত লাক্সারি\n৫. মিনিমালিস্ট ডিজাইন\n৬. সাহসী মার্কেটিং\n৭. সোশ্যাল মিডিয়া\n৮. ইভেন্ট প্রমোশন\n৯. শিক্ষামূলক\n১০. শৈল্পিক",
            layouts: "📐 লেআউট অপশন:\n\n• center - কেন্দ্রীভূত টেক্সট\n• left - বাম সারিবদ্ধ\n• right - ডান সারিবদ্ধ\n• split - স্প্লিট স্ক্রিন\n• overlay - টেক্সট ওভারলে\n• diagonal - কর্ণ লেআউট",
            themes: "🎨 থিম অপশন:\n\n• professional - পেশাদার থিম\n• creative - সৃজনশীল থিম\n• tech - প্রযুক্তি থিম\n• luxury - বিলাসিতা থিম\n• minimal - মিনিমালিস্ট থিম\n• vibrant - প্রাণবন্ত রং\n• dark - ডার্ক মোড\n• light - লাইট মোড\n• nature - প্রকৃতি থিম\n• abstract - বিমূর্ত শিল্প",
            help: "🆘 পেশাদার ব্যানার সাহায্য:\n\n{pn} [টেক্সট] -style [1-10] -layout [type] -theme [theme] -size [WxH] -bg [image_url]\n\nউদাহরণ:\n• {pn} Tech Conference -style 3 -layout center -theme tech\n• {pn} Summer Sale -style 6 -layout split -theme vibrant\n• {pn} Welcome -style 1 -layout left -theme professional -size 1920x1080\n\nব্যবহার করুন: {pn} styles, {pn} layouts, {pn} themes আরও অপশনের জন্য",
            error: "❌ ত্রুটি: {error}"
        }
    },

    onChat: async function ({ event, message, getLang }) {
        const body = event.body?.toLowerCase() || '';
        
        if (body.includes('banner3 styles')) {
            return message.reply(getLang("styles"));
        }
        
        if (body.includes('banner3 layouts')) {
            return message.reply(getLang("layouts"));
        }
        
        if (body.includes('banner3 themes')) {
            return message.reply(getLang("themes"));
        }
        
        if (body.includes('banner3 help')) {
            return message.reply(getLang("help"));
        }
    }
};

function parseAdvancedParameters(text) {
    const params = {
        text: text,
        style: null,
        layout: null,
        theme: null,
        bgImage: null,
        size: null
    };

    const patterns = {
        style: /-style\s+(\d+)/i,
        layout: /-layout\s+(\S+)/i,
        theme: /-theme\s+(\S+)/i,
        bgImage: /-bg\s+(\S+)/i,
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

async function createProfessionalBanner(text, options) {
    const { style, layout, theme, bgImage, width, height } = options;
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Apply theme and background
    await applyThemeBackground(ctx, width, height, theme, bgImage);

    // Apply style-specific design
    await applyStyleDesign(ctx, width, height, style, theme);

    // Apply layout
    await applyTextLayout(ctx, width, height, text, layout, style, theme);

    // Add professional elements
    addProfessionalElements(ctx, width, height, style);

    const tempPath = path.join(__dirname, '..', '..', 'cache', `banner3_${Date.now()}.png`);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(tempPath, buffer);

    return fs.createReadStream(tempPath);
}

async function applyThemeBackground(ctx, width, height, theme, bgImage) {
    if (bgImage) {
        try {
            const image = await loadImageFromUrl(bgImage);
            ctx.drawImage(image, 0, 0, width, height);
            return;
        } catch (error) {
            console.error('Failed to load background image:', error);
        }
    }

    switch (theme.toLowerCase()) {
        case 'professional':
            drawProfessionalBackground(ctx, width, height);
            break;
        case 'creative':
            drawCreativeBackground(ctx, width, height);
            break;
        case 'tech':
            drawTechBackground(ctx, width, height);
            break;
        case 'luxury':
            drawLuxuryBackground(ctx, width, height);
            break;
        case 'minimal':
            drawMinimalBackground(ctx, width, height);
            break;
        case 'vibrant':
            drawVibrantBackground(ctx, width, height);
            break;
        case 'dark':
            drawDarkBackground(ctx, width, height);
            break;
        case 'light':
            drawLightBackground(ctx, width, height);
            break;
        case 'nature':
            drawNatureBackground(ctx, width, height);
            break;
        case 'abstract':
            drawAbstractBackground(ctx, width, height);
            break;
        default:
            drawProfessionalBackground(ctx, width, height);
    }
}

async function applyStyleDesign(ctx, width, height, style, theme) {
    const styleFunctions = {
        1: drawStyle1,
        2: drawStyle2,
        3: drawStyle3,
        4: drawStyle4,
        5: drawStyle5,
        6: drawStyle6,
        7: drawStyle7,
        8: drawStyle8,
        9: drawStyle9,
        10: drawStyle10
    };

    const drawFunction = styleFunctions[style] || drawStyle1;
    drawFunction(ctx, width, height, theme);
}

async function applyTextLayout(ctx, width, height, text, layout, style, theme) {
    const textColor = getTextColorForTheme(theme);
    const fontFamily = getFontForStyle(style);
    const fontSize = calculateFontSize(width, height, text.length);
    
    ctx.font = `bold ${fontSize}px "${fontFamily}"`;
    ctx.fillStyle = textColor;
    ctx.textBaseline = 'middle';

    // Add text shadow for better visibility
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 10;

    const textLines = wrapText(ctx, text, width * 0.8);
    const lineHeight = fontSize * 1.2;
    const totalTextHeight = textLines.length * lineHeight;

    let startY;
    switch (layout.toLowerCase()) {
        case 'center':
            ctx.textAlign = 'center';
            startY = (height - totalTextHeight) / 2 + lineHeight / 2;
            textLines.forEach((line, index) => {
                ctx.fillText(line, width / 2, startY + index * lineHeight);
            });
            break;
        
        case 'left':
            ctx.textAlign = 'left';
            startY = (height - totalTextHeight) / 2 + lineHeight / 2;
            textLines.forEach((line, index) => {
                ctx.fillText(line, width * 0.1, startY + index * lineHeight);
            });
            break;
        
        case 'right':
            ctx.textAlign = 'right';
            startY = (height - totalTextHeight) / 2 + lineHeight / 2;
            textLines.forEach((line, index) => {
                ctx.fillText(line, width * 0.9, startY + index * lineHeight);
            });
            break;
        
        case 'split':
            ctx.textAlign = 'left';
            startY = (height - totalTextHeight) / 2 + lineHeight / 2;
            
            // Draw a vertical line in the middle
            ctx.strokeStyle = textColor;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(width / 2, height * 0.2);
            ctx.lineTo(width / 2, height * 0.8);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Draw text on left side
            const leftText = textLines.slice(0, Math.ceil(textLines.length / 2));
            leftText.forEach((line, index) => {
                ctx.fillText(line, width * 0.1, startY + index * lineHeight);
            });
            
            // Draw text on right side
            const rightText = textLines.slice(Math.ceil(textLines.length / 2));
            ctx.textAlign = 'right';
            rightText.forEach((line, index) => {
                ctx.fillText(line, width * 0.9, startY + (leftText.length + index) * lineHeight);
            });
            break;
        
        case 'overlay':
            ctx.textAlign = 'center';
            
            // Semi-transparent overlay
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(width * 0.1, height * 0.3, width * 0.8, totalTextHeight + 40);
            
            // Text on overlay
            ctx.fillStyle = textColor;
            startY = height * 0.3 + 20 + lineHeight / 2;
            textLines.forEach((line, index) => {
                ctx.fillText(line, width / 2, startY + index * lineHeight);
            });
            break;
        
        case 'diagonal':
            ctx.textAlign = 'left';
            
            // Rotate context for diagonal text
            ctx.save();
            ctx.translate(width * 0.1, height * 0.7);
            ctx.rotate(-Math.PI / 6);
            
            textLines.forEach((line, index) => {
                ctx.fillText(line, 0, index * lineHeight);
            });
            
            ctx.restore();
            break;
        
        default:
            ctx.textAlign = 'center';
            startY = (height - totalTextHeight) / 2 + lineHeight / 2;
            textLines.forEach((line, index) => {
                ctx.fillText(line, width / 2, startY + index * lineHeight);
            });
    }

    // Reset shadow
    ctx.shadowBlur = 0;
}

function addProfessionalElements(ctx, width, height, style) {
    // Add logo/watermark
    ctx.font = '16px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.textAlign = 'right';
    ctx.fillText('YOUR CRUSH BOT • Professional Banner', width - 20, height - 20);

    // Style-specific decorations
    switch (style) {
        case 1:
        case 4:
        case 9:
            // Add subtle corner accents
            drawCornerAccents(ctx, width, height);
            break;
        case 2:
        case 7:
        case 10:
            // Add creative elements
            addCreativeElements(ctx, width, height);
            break;
        case 3:
        case 6:
        case 8:
            // Add geometric patterns
            addGeometricPatterns(ctx, width, height);
            break;
    }
}

// Background Functions
function drawProfessionalBackground(ctx, width, height) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#1e3a8a');
    gradient.addColorStop(1, '#0ea5e9');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Subtle grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    const gridSize = 50;
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
}

function drawCreativeBackground(ctx, width, height) {
    // Colorful gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#ec4899');
    gradient.addColorStop(0.5, '#8b5cf6');
    gradient.addColorStop(1, '#3b82f6');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Paint splatter effect
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = 10 + Math.random() * 40;
        const color = getRandomCreativeColor();
        const alpha = 0.1 + Math.random() * 0.2;
        
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        
        ctx.beginPath();
        for (let j = 0; j < 20; j++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = size * (0.5 + Math.random() * 0.5);
            const px = x + radius * Math.cos(angle);
            const py = y + radius * Math.sin(angle);
            
            if (j === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.closePath();
        ctx.fill();
    }
    
    ctx.globalAlpha = 1;
}

function drawTechBackground(ctx, width, height) {
    // Dark tech background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Circuit board pattern
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;

    // Horizontal lines
    for (let i = 0; i < 10; i++) {
        const y = 50 + i * 80;
        ctx.beginPath();
        ctx.moveTo(0, y);
        
        for (let x = 0; x < width; x += 40) {
            if (Math.random() > 0.7) {
                ctx.lineTo(x, y + Math.sin(x * 0.01) * 20);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    }

    ctx.globalAlpha = 1;

    // Glowing dots
    for (let i = 0; i < 20; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const radius = 2 + Math.random() * 4;
        
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 3);
        gradient.addColorStop(0, '#3b82f6');
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius * 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawLuxuryBackground(ctx, width, height) {
    // Gold gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#1a1a1a');
    gradient.addColorStop(1, '#2d2d2d');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Gold accents
    ctx.fillStyle = '#d4af37';
    
    // Border
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#d4af37';
    ctx.strokeRect(10, 10, width - 20, height - 20);
    
    // Corner ornaments
    drawLuxuryCorner(ctx, 30, 30, 20);
    drawLuxuryCorner(ctx, width - 30, 30, 20);
    drawLuxuryCorner(ctx, 30, height - 30, 20);
    drawLuxuryCorner(ctx, width - 30, height - 30, 20);

    // Subtle pattern
    ctx.fillStyle = 'rgba(212, 175, 55, 0.1)';
    const patternSize = 40;
    
    for (let x = 0; x < width; x += patternSize) {
        for (let y = 0; y < height; y += patternSize) {
            if ((x + y) % (patternSize * 2) === 0) {
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}

function drawMinimalBackground(ctx, width, height) {
    // Clean white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Single thin line
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    
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
}

function drawVibrantBackground(ctx, width, height) {
    // Multiple vibrant gradients
    const gradients = [
        { x1: 0, y1: 0, x2: width, y2: 0, colors: ['#ef4444', '#f97316'] },
        { x1: width, y1: 0, x2: 0, y2: height, colors: ['#f59e0b', '#84cc16'] },
        { x1: 0, y1: height, x2: width, y2: 0, colors: ['#10b981', '#06b6d4'] },
        { x1: 0, y1: 0, x2: 0, y2: height, colors: ['#3b82f6', '#8b5cf6'] }
    ];

    gradients.forEach((grad, index) => {
        const gradient = ctx.createLinearGradient(grad.x1, grad.y1, grad.x2, grad.y2);
        gradient.addColorStop(0, grad.colors[0]);
        gradient.addColorStop(1, grad.colors[1]);
        
        ctx.fillStyle = gradient;
        ctx.globalAlpha = 0.25;
        ctx.fillRect(0, 0, width, height);
    });

    ctx.globalAlpha = 1;
}

function drawDarkBackground(ctx, width, height) {
    // Dark gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#000000');
    gradient.addColorStop(1, '#1f2937');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Stars effect
    for (let i = 0; i < 200; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = Math.random() * 2;
        const brightness = 100 + Math.random() * 155;
        
        ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawLightBackground(ctx, width, height) {
    // Light gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#f8fafc');
    gradient.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Subtle texture
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    const textureSize = 100;
    
    for (let x = 0; x < width; x += textureSize) {
        for (let y = 0; y < height; y += textureSize) {
            if ((x + y) % (textureSize * 2) === 0) {
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + textureSize, y);
                ctx.lineTo(x, y + textureSize);
                ctx.closePath();
                ctx.fill();
            }
        }
    }
}

function drawNatureBackground(ctx, width, height) {
    // Sky
    const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.6);
    skyGradient.addColorStop(0, '#38bdf8');
    skyGradient.addColorStop(1, '#bae6fd');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, width, height * 0.6);

    // Hills
    ctx.fillStyle = '#16a34a';
    drawHill(ctx, 0, height * 0.6, width, height * 0.4, 3);
    
    ctx.fillStyle = '#15803d';
    drawHill(ctx, width * 0.3, height * 0.65, width, height * 0.35, 4);

    // Sun
    ctx.beginPath();
    ctx.arc(width * 0.8, height * 0.2, 40, 0, Math.PI * 2);
    ctx.fillStyle = '#fbbf24';
    ctx.fill();

    // Clouds
    drawDetailedCloud(ctx, width * 0.2, height * 0.15, 60);
    drawDetailedCloud(ctx, width * 0.4, height * 0.25, 80);
    drawDetailedCloud(ctx, width * 0.6, height * 0.2, 70);
}

function drawAbstractBackground(ctx, width, height) {
    // Base color
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Abstract shapes with transparency
    const shapes = 30;
    
    for (let i = 0; i < shapes; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = 50 + Math.random() * 150;
        const color = getRandomVibrantColor();
        const alpha = 0.1 + Math.random() * 0.3;
        const rotation = Math.random() * Math.PI * 2;
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        
        // Random abstract shape
        const shapeType = Math.floor(Math.random() * 4);
        switch (shapeType) {
            case 0: // Blob
                drawBlobShape(ctx, 0, 0, size);
                break;
            case 1: // Spiral
                drawSpiralShape(ctx, 0, 0, size);
                break;
            case 2: // Wave
                drawWaveShape(ctx, 0, 0, size);
                break;
            case 3: // Organic
                drawOrganicShape(ctx, 0, 0, size);
                break;
        }
        
        ctx.restore();
    }
    
    ctx.globalAlpha = 1;
}

// Style Design Functions
function drawStyle1(ctx, width, height, theme) {
    // Modern Corporate - Clean lines and grids
    ctx.strokeStyle = getAccentColor(theme);
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    // Border
    ctx.strokeRect(30, 30, width - 60, height - 60);
    ctx.setLineDash([]);
    
    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    const gridSize = 60;
    for (let x = gridSize; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 30);
        ctx.lineTo(x, height - 30);
        ctx.stroke();
    }
}

function drawStyle2(ctx, width, height, theme) {
    // Creative Agency - Dynamic elements
    const accentColor = getAccentColor(theme);
    
    // Curved lines
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    
    for (let i = 0; i < 3; i++) {
        const y = 50 + i * 100;
        ctx.beginPath();
        ctx.moveTo(0, y);
        
        for (let x = 0; x < width; x += 20) {
            ctx.lineTo(x, y + Math.sin(x * 0.01 + i) * 30);
        }
        ctx.stroke();
    }
    
    // Dots
    ctx.fillStyle = accentColor;
    for (let i = 0; i < 20; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = 3 + Math.random() * 7;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawStyle3(ctx, width, height, theme) {
    // Tech Startup - Digital elements
    const accentColor = getAccentColor(theme);
    
    // Binary code stream
    ctx.fillStyle = accentColor;
    ctx.font = '14px monospace';
    ctx.globalAlpha = 0.3;
    
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const binary = Math.floor(Math.random() * 2);
        ctx.fillText(binary.toString(), x, y);
    }
    
    ctx.globalAlpha = 1;
    
    // Data points
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1;
    
    const points = [];
    for (let i = 0; i < 10; i++) {
        const x = (i + 1) * (width / 11);
        const y = height * 0.3 + Math.sin(i) * 50;
        points.push({ x, y });
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = accentColor;
        ctx.fill();
    }
    
    // Connect points
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
}

function drawStyle4(ctx, width, height, theme) {
    // Elegant Luxury - Gold accents
    const accentColor = '#d4af37';
    
    // Ornate border
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, width - 40, height - 40);
    
    // Corner flourishes
    drawCornerFlourish(ctx, 40, 40, 30, accentColor);
    drawCornerFlourish(ctx, width - 40, 40, 30, accentColor);
    drawCornerFlourish(ctx, 40, height - 40, 30, accentColor);
    drawCornerFlourish(ctx, width - 40, height - 40, 30, accentColor);
    
    // Pattern overlay
    ctx.fillStyle = `rgba(212, 175, 55, 0.05)`;
    const patternSize = 30;
    
    for (let x = 0; x < width; x += patternSize) {
        for (let y = 0; y < height; y += patternSize) {
            if ((x + y) % (patternSize * 4) === 0) {
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}

function drawStyle5(ctx, width, height, theme) {
    // Minimalist Design - Negative space
    ctx.strokeStyle = getTextColorForTheme(theme);
    ctx.lineWidth = 1;
    
    // Simple geometric shapes
    const shapes = 5;
    for (let i = 0; i < shapes; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = 20 + Math.random() * 40;
        
        ctx.beginPath();
        if (Math.random() > 0.5) {
            // Circle
            ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        } else {
            // Square
            ctx.rect(x - size / 2, y - size / 2, size, size);
        }
        ctx.stroke();
    }
}

function drawStyle6(ctx, width, height, theme) {
    // Bold Marketing - Strong elements
    const accentColor = getAccentColor(theme);
    
    // Bold diagonal stripes
    ctx.fillStyle = accentColor;
    ctx.globalAlpha = 0.1;
    
    const stripeWidth = 40;
    for (let i = -height; i < width + height; i += stripeWidth * 2) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + stripeWidth, 0);
        ctx.lineTo(i, height);
        ctx.lineTo(i - stripeWidth, height);
        ctx.closePath();
        ctx.fill();
    }
    
    ctx.globalAlpha = 1;
    
    // Strong border
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 5;
    ctx.strokeRect(10, 10, width - 20, height - 20);
}

function drawStyle7(ctx, width, height, theme) {
    // Social Media - Modern elements
    const accentColor = getAccentColor(theme);
    
    // Hashtag pattern
    ctx.fillStyle = accentColor;
    ctx.font = 'bold 24px Arial';
    ctx.globalAlpha = 0.1;
    
    for (let i = 0; i < 20; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const angle = Math.random() * Math.PI * 2;
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillText('#', 0, 0);
        ctx.restore();
    }
    
    ctx.globalAlpha = 1;
    
    // Social icons placeholder
    const icons = ['f', 't', 'i', 'y']; // Facebook, Twitter, Instagram, YouTube
    const iconSize = 30;
    const spacing = 60;
    const startX = width / 2 - (icons.length - 1) * spacing / 2;
    
    ctx.fillStyle = accentColor;
    ctx.font = `bold ${iconSize}px Arial`;
    ctx.textAlign = 'center';
    
    icons.forEach((icon, index) => {
        const x = startX + index * spacing;
        const y = height - 60;
        ctx.fillText(icon, x, y);
    });
}

function drawStyle8(ctx, width, height, theme) {
    // Event Promotion - Celebration elements
    const accentColor = getAccentColor(theme);
    
    // Confetti
    for (let i = 0; i < 100; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = 3 + Math.random() * 8;
        const color = getRandomVibrantColor();
        const rotation = Math.random() * Math.PI * 2;
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.7;
        
        // Different confetti shapes
        if (Math.random() > 0.5) {
            // Rectangle
            ctx.fillRect(-size/2, -size/4, size, size/2);
        } else {
            // Circle
            ctx.beginPath();
            ctx.arc(0, 0, size/2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    ctx.globalAlpha = 1;
    
    // Celebration border
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.strokeRect(15, 15, width - 30, height - 30);
    ctx.setLineDash([]);
}

function drawStyle9(ctx, width, height, theme) {
    // Educational - Academic elements
    const accentColor = getAccentColor(theme);
    
    // Graph paper background
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
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
    
    // Book/graduation elements
    ctx.fillStyle = accentColor;
    
    // Book
    ctx.fillRect(width * 0.2, height * 0.7, 40, 30);
    ctx.fillRect(width * 0.2 + 35, height * 0.7 - 5, 5, 40);
    
    // Graduation cap
    ctx.beginPath();
    ctx.moveTo(width * 0.8, height * 0.7);
    ctx.lineTo(width * 0.8 + 30, height * 0.7);
    ctx.lineTo(width * 0.8 + 15, height * 0.7 - 20);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(width * 0.8 + 15, height * 0.7 - 20, 15, 0, Math.PI, true);
    ctx.fill();
}

function drawStyle10(ctx, width, height, theme) {
    // Artistic - Paint stroke effect
    const accentColor = getAccentColor(theme);
    
    // Paint strokes
    for (let i = 0; i < 10; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const length = 100 + Math.random() * 200;
        const thickness = 10 + Math.random() * 30;
        const angle = Math.random() * Math.PI * 2;
        const colorVariation = Math.random() * 50 - 25;
        
        const strokeColor = adjustColorBrightness(accentColor, colorVariation);
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillStyle = strokeColor;
        ctx.globalAlpha = 0.3 + Math.random() * 0.4;
        
        // Paint stroke shape
        ctx.beginPath();
        ctx.moveTo(-length/2, -thickness/2);
        ctx.quadraticCurveTo(0, -thickness, length/2, -thickness/2);
        ctx.quadraticCurveTo(length/2 + 20, 0, length/2, thickness/2);
        ctx.quadraticCurveTo(0, thickness, -length/2, thickness/2);
        ctx.quadraticCurveTo(-length/2 - 20, 0, -length/2, -thickness/2);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
    
    ctx.globalAlpha = 1;
    
    // Artist signature style
    ctx.fillStyle = accentColor;
    ctx.font = 'italic 20px "Brush Script MT", cursive';
    ctx.textAlign = 'right';
    ctx.fillText('~ Artwork ~', width - 30, height - 30);
}

// Helper Functions
async function loadImageFromUrl(url) {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const image = new Canvas.Image();
    image.src = Buffer.from(response.data);
    return image;
}

function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + ' ' + word).width;
        
        if (width < maxWidth) {
            currentLine += ' ' + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    
    lines.push(currentLine);
    return lines;
}

function calculateFontSize(width, height, textLength) {
    const baseSize = Math.min(width, height) / 15;
    const maxSize = Math.min(baseSize * 2, 72);
    const minSize = Math.max(baseSize / 2, 24);
    
    // Adjust based on text length
    const lengthFactor = Math.max(0.5, Math.min(1, 50 / textLength));
    return Math.min(maxSize, Math.max(minSize, baseSize * lengthFactor));
}

function getTextColorForTheme(theme) {
    const darkThemes = ['dark', 'tech', 'luxury', 'abstract'];
    const lightThemes = ['light', 'minimal', 'nature', 'professional'];
    
    if (darkThemes.includes(theme.toLowerCase())) {
        return '#FFFFFF';
    } else if (lightThemes.includes(theme.toLowerCase())) {
        return '#000000';
    } else {
        return '#FFFFFF';
    }
}

function getFontForStyle(style) {
    const fonts = {
        1: 'Arial',
        2: 'Verdana',
        3: 'Courier New',
        4: 'Georgia',
        5: 'Trebuchet MS',
        6: 'Impact',
        7: 'Comic Sans MS',
        8: 'Arial Black',
        9: 'Times New Roman',
        10: 'Brush Script MT'
    };
    return fonts[style] || 'Arial';
}

function getAccentColor(theme) {
    const colorMap = {
        'professional': '#3b82f6',
        'creative': '#8b5cf6',
        'tech': '#06b6d4',
        'luxury': '#d4af37',
        'minimal': '#6b7280',
        'vibrant': '#ef4444',
        'dark': '#60a5fa',
        'light': '#3b82f6',
        'nature': '#10b981',
        'abstract': '#ec4899'
    };
    return colorMap[theme.toLowerCase()] || '#3b82f6';
}

function getRandomCreativeColor() {
    const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function getRandomVibrantColor() {
    const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FF8000', '#8000FF'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function adjustColorBrightness(color, amount) {
    const hex = color.replace('#', '');
    const r = Math.min(255, Math.max(0, parseInt(hex.substr(0, 2), 16) + amount));
    const g = Math.min(255, Math.max(0, parseInt(hex.substr(2, 2), 16) + amount));
    const b = Math.min(255, Math.max(0, parseInt(hex.substr(4, 2), 16) + amount));
    
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function drawCornerAccents(ctx, width, height) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    
    // Top-left
    ctx.beginPath();
    ctx.moveTo(20, 20);
    ctx.lineTo(50, 20);
    ctx.moveTo(20, 20);
    ctx.lineTo(20, 50);
    ctx.stroke();
    
    // Top-right
    ctx.beginPath();
    ctx.moveTo(width - 20, 20);
    ctx.lineTo(width - 50, 20);
    ctx.moveTo(width - 20, 20);
    ctx.lineTo(width - 20, 50);
    ctx.stroke();
    
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(20, height - 20);
    ctx.lineTo(50, height - 20);
    ctx.moveTo(20, height - 20);
    ctx.lineTo(20, height - 50);
    ctx.stroke();
    
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(width - 20, height - 20);
    ctx.lineTo(width - 50, height - 20);
    ctx.moveTo(width - 20, height - 20);
    ctx.lineTo(width - 20, height - 50);
    ctx.stroke();
}

function addCreativeElements(ctx, width, height) {
    // Add random creative dots
    for (let i = 0; i < 15; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = 2 + Math.random() * 6;
        const color = getRandomCreativeColor();
        
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

function addGeometricPatterns(ctx, width, height) {
    // Add geometric pattern in corners
    const patternSize = 30;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    
    // Top-left pattern
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if ((i + j) % 2 === 0) {
                ctx.fillRect(20 + i * patternSize, 20 + j * patternSize, patternSize, patternSize);
            }
        }
    }
    
    // Bottom-right pattern
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if ((i + j) % 2 === 0) {
                ctx.fillRect(width - 20 - (3 - i) * patternSize, height - 20 - (3 - j) * patternSize, patternSize, patternSize);
            }
        }
    }
}

function drawLuxuryCorner(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    
    // Ornate corner design
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size, 0);
    ctx.lineTo(0, size);
    ctx.closePath();
    ctx.fill();
    
    // Inner accent
    ctx.beginPath();
    ctx.moveTo(size/3, 0);
    ctx.lineTo(0, size/3);
    ctx.stroke();
    
    ctx.restore();
}

function drawCornerFlourish(ctx, x, y, size, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    
    // Curved flourish
    ctx.beginPath();
    ctx.arc(-size/2, -size/2, size/2, 0, Math.PI/2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2, Math.PI, Math.PI*1.5);
    ctx.stroke();
    
    ctx.restore();
}

function drawHill(ctx, x, y, width, height, complexity) {
    ctx.beginPath();
    ctx.moveTo(x, y + height);
    
    for (let i = 0; i <= complexity; i++) {
        const px = x + (i * width) / complexity;
        const py = y + Math.sin(i * 0.5) * (height / 4) + (height / 2);
        ctx.lineTo(px, py);
    }
    
    ctx.lineTo(x + width, y + height);
    ctx.closePath();
    ctx.fill();
}

function drawDetailedCloud(ctx, x, y, size) {
    ctx.fillStyle = '#ffffff';
    
    ctx.beginPath();
    ctx.arc(x, y, size * 0.3, 0, Math.PI * 2);
    ctx.arc(x + size * 0.25, y - size * 0.15, size * 0.25, 0, Math.PI * 2);
    ctx.arc(x + size * 0.5, y, size * 0.35, 0, Math.PI * 2);
    ctx.arc(x + size * 0.25, y + size * 0.15, size * 0.25, 0, Math.PI * 2);
    ctx.fill();
}

function drawBlobShape(ctx, x, y, size) {
    ctx.beginPath();
    
    for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI * 2) / 8;
        const radius = size * (0.5 + Math.random() * 0.3);
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

function drawSpiralShape(ctx, x, y, size) {
    ctx.beginPath();
    const turns = 3;
    
    for (let i = 0; i <= 360 * turns; i += 5) {
        const angle = (i * Math.PI) / 180;
        const radius = size * (0.1 + (i / (360 * turns)) * 0.9);
        const px = x + radius * Math.cos(angle);
        const py = y + radius * Math.sin(angle);
        
        if (i === 0) {
            ctx.moveTo(px, py);
        } else {
            ctx.lineTo(px, py);
        }
    }
    
    ctx.fill();
}

function drawWaveShape(ctx, x, y, size) {
    ctx.beginPath();
    ctx.moveTo(x - size/2, y);
    
    for (let i = -size/2; i <= size/2; i += 5) {
        const px = x + i;
        const py = y + Math.sin(i * 0.1) * (size / 4);
        ctx.lineTo(px, py);
    }
    
    ctx.lineTo(x + size/2, y + size/2);
    ctx.lineTo(x - size/2, y + size/2);
    ctx.closePath();
    ctx.fill();
}

function drawOrganicShape(ctx, x, y, size) {
    ctx.beginPath();
    const points = 12;
    
    for (let i = 0; i <= points; i++) {
        const angle = (i * Math.PI * 2) / points;
        const radius = size * (0.3 + Math.random() * 0.4);
        const px = x + radius * Math.cos(angle);
        const py = y + radius * Math.sin(angle);
        
        if (i === 0) {
            ctx.moveTo(px, py);
        } else {
            ctx.quadraticCurveTo(
                x + radius * Math.cos(angle - Math.PI/points) * 1.2,
                y + radius * Math.sin(angle - Math.PI/points) * 1.2,
                px, py
            );
        }
    }
    
    ctx.closePath();
    ctx.fill();
}