const axios = require('axios');
const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

module.exports = {
    config: {
        name: "editpic2",
        aliases: ["edit2", "imageedit2"],
        version: "2.0",
        author: "RANA",
        role: 0,
        category: "image",
        shortDescription: {
            en: "Advanced image editing with filters",
            bn: "ফিল্টার সহ উন্নত ইমেজ এডিটিং"
        },
        longDescription: {
            en: "Apply advanced filters and effects to images",
            bn: "ইমেজে উন্নত ফিল্টার এবং ইফেক্ট প্রয়োগ করুন"
        },
        guide: {
            en: "{pn} [filter] [parameter]\nReply to an image or attach one",
            bn: "{pn} [ফিল্টার] [প্যারামিটার]\nএকটি ইমেজ রিপ্লাই করুন বা অ্যাটাচ করুন"
        },
        cooldown: 25
    },

    onStart: async function({ api, event, args }) {
        try {
            const { threadID, messageID, type, messageReply } = event;
            
            let imageUrl = null;
            
            // Check for image in reply
            if (type === "message_reply") {
                if (messageReply.attachments && messageReply.attachments.length > 0) {
                    const attachment = messageReply.attachments[0];
                    if (attachment.type === "photo") {
                        imageUrl = attachment.url;
                    }
                }
            }
            
            // Check for attached image
            if (!imageUrl && event.attachments && event.attachments.length > 0) {
                const attachment = event.attachments[0];
                if (attachment.type === "photo") {
                    imageUrl = attachment.url;
                }
            }
            
            if (!imageUrl) {
                return showEditHelp(api, threadID, messageID);
            }
            
            if (args.length === 0 || args[0].toLowerCase() === 'list') {
                return showFiltersList(api, threadID, messageID, imageUrl);
            }
            
            const filterName = args[0].toLowerCase();
            const parameter = args[1] ? parseFloat(args[1]) : null;
            
            // Send processing message
            const processMsg = await api.sendMessage(
                `🎨 Applying ${filterName} filter...`,
                threadID,
                messageID
            );
            
            // Apply filter
            const editedImage = await applyAdvancedFilter(imageUrl, filterName, parameter);
            
            if (!editedImage) {
                api.editMessage(
                    `❌ Failed to apply ${filterName} filter.\n` +
                    `Use ${global.config.prefix}editpic2 list to see available filters.`,
                    processMsg.messageID
                );
                return;
            }
            
            // Send edited image
            api.sendMessage(
                {
                    body: `✅ Image edited successfully!\n\n` +
                          `🎨 **Filter:** ${filterName}\n` +
                          `${parameter ? `📏 **Parameter:** ${parameter}\n` : ''}` +
                          `💡 To edit again, use ${global.config.prefix}editpic2 list`,
                    attachment: fs.createReadStream(editedImage.path)
                },
                threadID,
                async () => {
                    // Clean up
                    try {
                        fs.unlinkSync(editedImage.path);
                    } catch (error) {
                        // Ignore cleanup errors
                    }
                }
            );
            
            // Delete processing message
            api.deleteMessage(processMsg.messageID);
            
        } catch (error) {
            console.error(error);
            api.sendMessage(
                "❌ Image editing failed.",
                event.threadID,
                event.messageID
            );
        }
    }
};

function showEditHelp(api, threadID, messageID) {
    const message = `
🎨 **ADVANCED IMAGE EDITOR** 🎨

📝 **Usage:**
1. Reply to an image or attach an image
2. Use ${global.config.prefix}editpic2 [filter] [parameter]

📋 **Examples:**
• ${global.config.prefix}editpic2 vintage
• ${global.config.prefix}editpic2 cartoon 5
• ${global.config.prefix}editpic2 sketch
• ${global.config.prefix}editpic2 glitch 0.3

🔧 **Available Commands:**
• ${global.config.prefix}editpic2 list - Show all filters
• ${global.config.prefix}editpic2 [filter] - Apply filter
• ${global.config.prefix}editpic2 [filter] [value] - Apply with parameter

💡 **Tips:**
• Some filters accept parameters (0.1 to 1.0)
• Higher values = stronger effects
• Experiment with different combinations
    `;
    
    api.sendMessage(message, threadID, messageID);
}

function showFiltersList(api, threadID, messageID, imageUrl) {
    const filters = [
        { name: 'vintage', desc: 'Vintage photo effect', param: 'Strength (0.1-1.0)' },
        { name: 'cartoon', desc: 'Cartoonize image', param: 'Level (1-10)' },
        { name: 'sketch', desc: 'Pencil sketch effect', param: 'Intensity (1-10)' },
        { name: 'oilpaint', desc: 'Oil painting effect', param: 'Brush size (1-10)' },
        { name: 'pixelart', desc: 'Pixel art effect', param: 'Pixel size (2-20)' },
        { name: 'poster', desc: 'Movie poster effect', param: 'Levels (2-8)' },
        { name: 'comic', desc: 'Comic book effect', param: 'Intensity (1-10)' },
        { name: 'neon', desc: 'Neon glow effect', param: 'Glow strength (1-10)' },
        { name: 'hdr', desc: 'HDR enhancement', param: 'Strength (0.1-2.0)' },
        { name: 'tiltShift', desc: 'Tilt-shift effect', param: 'Blur radius (1-20)' },
        { name: 'filmGrain', desc: 'Film grain effect', param: 'Grain amount (1-10)' },
        { name: 'vignette2', desc: 'Advanced vignette', param: 'Strength (0.1-1.0)' },
        { name: 'colorPop', desc: 'Color pop effect', param: 'Saturation boost (0.1-2.0)' },
        { name: 'doubleExposure', desc: 'Double exposure', param: 'Blend opacity (0.1-1.0)' },
        { name: 'watercolor', desc: 'Watercolor painting', param: 'Brush detail (1-10)' },
        { name: 'mosaic', desc: 'Mosaic effect', param: 'Tile size (5-50)' },
        { name: 'edgeDetect', desc: 'Edge detection', param: 'Threshold (1-10)' },
        { name: 'thermal', desc: 'Thermal camera effect', param: 'None' },
        { name: 'xray', desc: 'X-ray effect', param: 'None' },
        { name: 'glitch', desc: 'Digital glitch effect', param: 'Glitch amount (0.1-1.0)' }
    ];
    
    let message = `🎨 **ADVANCED FILTERS LIST** 🎨\n\n`;
    message += `📸 **Image ready for editing!**\n\n`;
    
    // Group filters
    const artisticFilters = filters.slice(0, 7);
    const styleFilters = filters.slice(7, 14);
    const specialFilters = filters.slice(14);
    
    message += `🖼️ **Artistic Filters:**\n`;
    artisticFilters.forEach(filter => {
        message += `• **${filter.name}** - ${filter.desc}\n`;
        if (filter.param !== 'None') {
            message += `  Parameter: ${filter.param}\n`;
        }
    });
    
    message += `\n🎭 **Style Filters:**\n`;
    styleFilters.forEach(filter => {
        message += `• **${filter.name}** - ${filter.desc}\n`;
        if (filter.param !== 'None') {
            message += `  Parameter: ${filter.param}\n`;
        }
    });
    
    message += `\n✨ **Special Effects:**\n`;
    specialFilters.forEach(filter => {
        message += `• **${filter.name}** - ${filter.desc}\n`;
        if (filter.param !== 'None') {
            message += `  Parameter: ${filter.param}\n`;
        }
    });
    
    message += `\n📝 **Usage Examples:**\n`;
    message += `• ${global.config.prefix}editpic2 vintage 0.7\n`;
    message += `• ${global.config.prefix}editpic2 cartoon 5\n`;
    message += `• ${global.config.prefix}editpic2 neon 3\n`;
    message += `• ${global.config.prefix}editpic2 glitch 0.5\n\n`;
    
    message += `💡 **Tip:** Higher parameter values create stronger effects.`;
    
    // Store image URL for quick access
    global.advancedEditImage = global.advancedEditImage || {};
    global.advancedEditImage[threadID] = {
        url: imageUrl,
        timestamp: Date.now()
    };
    
    api.sendMessage(message, threadID, messageID);
}

async function applyAdvancedFilter(imageUrl, filterName, param = null) {
    try {
        // Create temp directory
        const tempDir = path.join(__dirname, '../../cache/advanced');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // Download image
        const response = await axios({
            url: imageUrl,
            responseType: 'arraybuffer'
        });
        
        const buffer = Buffer.from(response.data, 'binary');
        
        // Load image with Jimp
        const image = await Jimp.read(buffer);
        
        // Apply filter based on name
        let resultImage;
        
        switch (filterName) {
            case 'vintage':
                resultImage = await applyVintageFilter(image, param || 0.5);
                break;
                
            case 'cartoon':
                resultImage = await applyCartoonFilter(image, param || 5);
                break;
                
            case 'sketch':
                resultImage = await applySketchFilter(image, param || 5);
                break;
                
            case 'oilpaint':
                resultImage = await applyOilPaintFilter(image, param || 5);
                break;
                
            case 'pixelart':
                resultImage = await applyPixelArtFilter(image, param || 10);
                break;
                
            case 'poster':
                resultImage = await applyPosterFilter(image, param || 4);
                break;
                
            case 'comic':
                resultImage = await applyComicFilter(image, param || 5);
                break;
                
            case 'neon':
                resultImage = await applyNeonFilter(image, param || 3);
                break;
                
            case 'hdr':
                resultImage = await applyHDRFilter(image, param || 1.0);
                break;
                
            case 'tiltshift':
                resultImage = await applyTiltShiftFilter(image, param || 10);
                break;
                
            case 'filmgrain':
                resultImage = await applyFilmGrainFilter(image, param || 5);
                break;
                
            case 'vignette2':
                resultImage = await applyAdvancedVignette(image, param || 0.7);
                break;
                
            case 'colorpop':
                resultImage = await applyColorPopFilter(image, param || 1.5);
                break;
                
            case 'doubleexposure':
                resultImage = await applyDoubleExposure(image, param || 0.5);
                break;
                
            case 'watercolor':
                resultImage = await applyWatercolorFilter(image, param || 5);
                break;
                
            case 'mosaic':
                resultImage = await applyMosaicFilter(image, param || 20);
                break;
                
            case 'edgedetect':
                resultImage = await applyEdgeDetectFilter(image, param || 5);
                break;
                
            case 'thermal':
                resultImage = await applyThermalFilter(image);
                break;
                
            case 'xray':
                resultImage = await applyXrayFilter(image);
                break;
                
            case 'glitch':
                resultImage = await applyGlitchFilter(image, param || 0.3);
                break;
                
            default:
                return null;
        }
        
        if (!resultImage) {
            return null;
        }
        
        // Generate filename and save
        const filename = `advanced_${Date.now()}_${filterName}.png`;
        const filePath = path.join(tempDir, filename);
        
        await resultImage.writeAsync(filePath);
        
        return {
            path: filePath,
            filter: filterName,
            parameter: param
        };
        
    } catch (error) {
        console.error('Advanced filter error:', error);
        return null;
    }
}

async function applyVintageFilter(image, strength) {
    try {
        const img = image.clone();
        
        // Apply sepia
        img.sepia();
        
        // Add slight blur
        const blurAmount = Math.floor(strength * 5);
        if (blurAmount > 0) {
            img.blur(blurAmount);
        }
        
        // Add vignette
        const width = img.bitmap.width;
        const height = img.bitmap.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const vignette = 1 - (distance / maxDistance) * strength;
                
                const color = Jimp.intToRGBA(img.getPixelColor(x, y));
                const newColor = {
                    r: Math.max(0, Math.min(255, color.r * vignette)),
                    g: Math.max(0, Math.min(255, color.g * vignette * 0.9)),
                    b: Math.max(0, Math.min(255, color.b * vignette * 0.8)),
                    a: color.a
                };
                
                img.setPixelColor(Jimp.rgbaToInt(
                    newColor.r, newColor.g, newColor.b, newColor.a
                ), x, y);
            }
        }
        
        // Add noise
        const noiseAmount = Math.floor(strength * 10);
        for (let i = 0; i < noiseAmount; i++) {
            const x = Math.floor(Math.random() * width);
            const y = Math.floor(Math.random() * height);
            
            if (Math.random() > 0.5) {
                img.setPixelColor(Jimp.rgbaToInt(255, 255, 255, 100), x, y);
            } else {
                img.setPixelColor(Jimp.rgbaToInt(0, 0, 0, 100), x, y);
            }
        }
        
        return img;
    } catch (error) {
        console.error('Vintage filter error:', error);
        return null;
    }
}

async function applyCartoonFilter(image, level) {
    try {
        const img = image.clone();
        
        // Reduce colors
        const colors = Math.max(2, Math.min(16, Math.floor(level)));
        img.posterize(colors);
        
        // Enhance edges
        img.convolute([
            [-1, -1, -1],
            [-1, 8 + level, -1],
            [-1, -1, -1]
        ]);
        
        // Smooth a bit
        img.blur(1);
        
        // Increase saturation
        img.color([{ apply: 'saturate', params: [level * 10] }]);
        
        return img;
    } catch (error) {
        console.error('Cartoon filter error:', error);
        return null;
    }
}

async function applySketchFilter(image, intensity) {
    try {
        const img = image.clone();
        
        // Convert to grayscale
        img.greyscale();
        
        // Invert
        img.invert();
        
        // Apply Gaussian blur
        const blurAmount = Math.max(1, Math.min(10, Math.floor(intensity / 2)));
        img.blur(blurAmount);
        
        // Dodge blend (divide)
        const original = image.clone().greyscale();
        
        for (let y = 0; y < img.bitmap.height; y++) {
            for (let x = 0; x < img.bitmap.width; x++) {
                const sketchColor = Jimp.intToRGBA(img.getPixelColor(x, y));
                const origColor = Jimp.intToRGBA(original.getPixelColor(x, y));
                
                let newValue;
                if (sketchColor.r === 0) {
                    newValue = 255;
                } else {
                    newValue = Math.min(255, (origColor.r * 255) / sketchColor.r);
                }
                
                // Adjust based on intensity
                newValue = newValue * (intensity / 10);
                
                img.setPixelColor(Jimp.rgbaToInt(
                    newValue, newValue, newValue, 255
                ), x, y);
            }
        }
        
        // Invert back
        img.invert();
        
        // Increase contrast
        img.contrast(0.5);
        
        return img;
    } catch (error) {
        console.error('Sketch filter error:', error);
        return null;
    }
}

async function applyOilPaintFilter(image, brushSize) {
    try {
        const img = image.clone();
        const size = Math.max(1, Math.min(10, brushSize));
        
        // Simple oil paint effect using convolution
        // This is a simplified version
        for (let i = 0; i < size; i++) {
            img.blur(1);
        }
        
        // Enhance colors
        img.color([
            { apply: 'saturate', params: [20] },
            { apply: 'contrast', params: [0.2] }
        ]);
        
        return img;
    } catch (error) {
        console.error('Oil paint filter error:', error);
        return null;
    }
}

async function applyPixelArtFilter(image, pixelSize) {
    try {
        const img = image.clone();
        const size = Math.max(2, Math.min(50, pixelSize));
        
        // Pixelate
        img.pixelate(size);
        
        // Reduce colors
        img.posterize(8);
        
        // Sharpen edges
        img.convolute([
            [0, -1, 0],
            [-1, 5, -1],
            [0, -1, 0]
        ]);
        
        return img;
    } catch (error) {
        console.error('Pixel art filter error:', error);
        return null;
    }
}

async function applyPosterFilter(image, levels) {
    try {
        const img = image.clone();
        const lvls = Math.max(2, Math.min(8, Math.floor(levels)));
        
        // Posterize
        img.posterize(lvls);
        
        // Increase contrast
        img.contrast(0.3);
        
        // Add halftone-like effect
        const width = img.bitmap.width;
        const height = img.bitmap.height;
        const dotSize = 3;
        
        for (let y = 0; y < height; y += dotSize * 2) {
            for (let x = 0; x < width; x += dotSize * 2) {
                const color = Jimp.intToRGBA(img.getPixelColor(
                    Math.min(x, width - 1),
                    Math.min(y, height - 1)
                ));
                
                const brightness = (color.r + color.g + color.b) / 3;
                const dotRadius = (brightness / 255) * dotSize;
                
                // Draw circle
                for (let dy = -dotSize; dy <= dotSize; dy++) {
                    for (let dx = -dotSize; dx <= dotSize; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            if (distance <= dotRadius) {
                                img.setPixelColor(Jimp.rgbaToInt(
                                    color.r, color.g, color.b, 255
                                ), nx, ny);
                            }
                        }
                    }
                }
            }
        }
        
        return img;
    } catch (error) {
        console.error('Poster filter error:', error);
        return null;
    }
}

async function applyComicFilter(image, intensity) {
    try {
        const img = image.clone();
        
        // Edge detection
        img.convolute([
            [-1, -1, -1],
            [-1, 8, -1],
            [-1, -1, -1]
        ]);
        
        // Invert
        img.invert();
        
        // Threshold
        const threshold = Math.floor(intensity * 25);
        img.scan(0, 0, img.bitmap.width, img.bitmap.height, function(x, y, idx) {
            const brightness = (this.bitmap.data[idx] + 
                              this.bitmap.data[idx + 1] + 
                              this.bitmap.data[idx + 2]) / 3;
            
            if (brightness > threshold) {
                this.bitmap.data[idx] = 255;     // R
                this.bitmap.data[idx + 1] = 255; // G
                this.bitmap.data[idx + 2] = 255; // B
            } else {
                this.bitmap.data[idx] = 0;       // R
                this.bitmap.data[idx + 1] = 0;   // G
                this.bitmap.data[idx + 2] = 0;   // B
            }
        });
        
        return img;
    } catch (error) {
        console.error('Comic filter error:', error);
        return null;
    }
}

async function applyNeonFilter(image, glow) {
    try {
        const img = image.clone();
        
        // Edge detection with color
        const width = img.bitmap.width;
        const height = img.bitmap.height;
        
        // Create edge map
        const edges = new Jimp(width, height, 0x000000FF);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const center = Jimp.intToRGBA(img.getPixelColor(x, y));
                
                // Get neighbors
                const neighbors = [
                    Jimp.intToRGBA(img.getPixelColor(x-1, y-1)),
                    Jimp.intToRGBA(img.getPixelColor(x, y-1)),
                    Jimp.intToRGBA(img.getPixelColor(x+1, y-1)),
                    Jimp.intToRGBA(img.getPixelColor(x-1, y)),
                    Jimp.intToRGBA(img.getPixelColor(x+1, y)),
                    Jimp.intToRGBA(img.getPixelColor(x-1, y+1)),
                    Jimp.intToRGBA(img.getPixelColor(x, y+1)),
                    Jimp.intToRGBA(img.getPixelColor(x+1, y+1))
                ];
                
                // Calculate gradient
                let maxDiff = 0;
                let edgeColor = { r: 0, g: 0, b: 0 };
                
                neighbors.forEach(neighbor => {
                    const diff = Math.abs(center.r - neighbor.r) +
                                Math.abs(center.g - neighbor.g) +
                                Math.abs(center.b - neighbor.b);
                    
                    if (diff > maxDiff) {
                        maxDiff = diff;
                        edgeColor = {
                            r: Math.abs(center.r - neighbor.r),
                            g: Math.abs(center.g - neighbor.g),
                            b: Math.abs(center.b - neighbor.b)
                        };
                    }
                });
                
                if (maxDiff > 30) {
                    // Boost colors for neon effect
                    const boost = glow * 2;
                    edges.setPixelColor(Jimp.rgbaToInt(
                        Math.min(255, edgeColor.r * boost),
                        Math.min(255, edgeColor.g * boost),
                        Math.min(255, edgeColor.b * boost),
                        255
                    ), x, y);
                }
            }
        }
        
        // Blur edges for glow effect
        edges.blur(Math.floor(glow));
        
        // Composite with original (darkened)
        img.brightness(-0.3);
        img.composite(edges, 0, 0, {
            mode: Jimp.BLEND_ADD,
            opacitySource: 0.7,
            opacityDest: 1
        });
        
        return img;
    } catch (error) {
        console.error('Neon filter error:', error);
        return null;
    }
}

async function applyHDRFilter(image, strength) {
    try {
        const img = image.clone();
        
        // Increase contrast
        img.contrast(strength * 0.3);
        
        // Adjust brightness
        img.brightness(strength * 0.1);
        
        // Increase saturation
        img.color([{ apply: 'saturate', params: [strength * 30] }]);
        
        // Sharpen
        img.convolute([
            [0, -1, 0],
            [-1, 5, -1],
            [0, -1, 0]
        ]);
        
        // Add vignette
        const width = img.bitmap.width;
        const height = img.bitmap.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const vignette = 1 - (distance / maxDistance) * 0.3;
                
                const color = Jimp.intToRGBA(img.getPixelColor(x, y));
                const newColor = {
                    r: Math.max(0, Math.min(255, color.r * vignette)),
                    g: Math.max(0, Math.min(255, color.g * vignette)),
                    b: Math.max(0, Math.min(255, color.b * vignette)),
                    a: color.a
                };
                
                img.setPixelColor(Jimp.rgbaToInt(
                    newColor.r, newColor.g, newColor.b, newColor.a
                ), x, y);
            }
        }
        
        return img;
    } catch (error) {
        console.error('HDR filter error:', error);
        return null;
    }
}

async function applyTiltShiftFilter(image, blurRadius) {
    try {
        const img = image.clone();
        const width = img.bitmap.width;
        const height = img.bitmap.height;
        
        const radius = Math.max(1, Math.min(20, blurRadius));
        
        // Create focus area (middle third)
        const focusStart = height / 3;
        const focusEnd = height * 2 / 3;
        const transition = height / 6;
        
        for (let y = 0; y < height; y++) {
            let blurAmount = radius;
            
            if (y > focusStart && y < focusEnd) {
                // In focus area - no blur
                blurAmount = 0;
            } else if (y <= focusStart) {
                // Top transition
                const distance = focusStart - y;
                blurAmount = radius * (distance / transition);
            } else {
                // Bottom transition
                const distance = y - focusEnd;
                blurAmount = radius * (distance / transition);
            }
            
            blurAmount = Math.min(radius, Math.max(0, blurAmount));
            
            if (blurAmount > 0) {
                // Apply horizontal blur to this row
                const rowImg = img.clone().crop(0, y, width, 1);
                rowImg.blur(blurAmount);
                
                // Copy back
                for (let x = 0; x < width; x++) {
                    const color = rowImg.getPixelColor(x, 0);
                    img.setPixelColor(color, x, y);
                }
            }
        }
        
        return img;
    } catch (error) {
        console.error('Tilt shift filter error:', error);
        return null;
    }
}

async function applyFilmGrainFilter(image, grainAmount) {
    try {
        const img = image.clone();
        const width = img.bitmap.width;
        const height = img.bitmap.height;
        
        const amount = Math.max(1, Math.min(10, grainAmount));
        
        for (let i = 0; i < amount * 1000; i++) {
            const x = Math.floor(Math.random() * width);
            const y = Math.floor(Math.random() * height);
            
            const color = Jimp.intToRGBA(img.getPixelColor(x, y));
            const noise = Math.random() * 50 - 25; // -25 to +25
            
            const newColor = {
                r: Math.max(0, Math.min(255, color.r + noise)),
                g: Math.max(0, Math.min(255, color.g + noise)),
                b: Math.max(0, Math.min(255, color.b + noise)),
                a: color.a
            };
            
            img.setPixelColor(Jimp.rgbaToInt(
                newColor.r, newColor.g, newColor.b, newColor.a
            ), x, y);
        }
        
        // Add slight sepia tone
        img.sepia();
        
        return img;
    } catch (error) {
        console.error('Film grain filter error:', error);
        return null;
    }
}

async function applyAdvancedVignette(image, strength) {
    try {
        const img = image.clone();
        const width = img.bitmap.width;
        const height = img.bitmap.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Exponential vignette
                const vignette = Math.pow(1 - (distance / maxDistance), strength * 2);
                
                const color = Jimp.intToRGBA(img.getPixelColor(x, y));
                const newColor = {
                    r: Math.max(0, Math.min(255, color.r * vignette)),
                    g: Math.max(0, Math.min(255, color.g * vignette)),
                    b: Math.max(0, Math.min(255, color.b * vignette)),
                    a: color.a
                };
                
                img.setPixelColor(Jimp.rgbaToInt(
                    newColor.r, newColor.g, newColor.b, newColor.a
                ), x, y);
            }
        }
        
        return img;
    } catch (error) {
        console.error('Advanced vignette error:', error);
        return null;
    }
}

async function applyColorPopFilter(image, saturationBoost) {
    try {
        const img = image.clone();
        
        // Convert to grayscale
        const grayscale = image.clone().greyscale();
        
        // Increase saturation of original
        img.color([{ apply: 'saturate', params: [saturationBoost * 100] }]);
        
        // Blend with grayscale based on color intensity
        const width = img.bitmap.width;
        const height = img.bitmap.height;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const color = Jimp.intToRGBA(img.getPixelColor(x, y));
                const gray = Jimp.intToRGBA(grayscale.getPixelColor(x, y));
                
                // Calculate colorfulness
                const colorfulness = Math.abs(color.r - gray.r) +
                                   Math.abs(color.g - gray.g) +
                                   Math.abs(color.b - gray.b);
                
                const threshold = 50;
                const blend = Math.min(1, colorfulness / threshold);
                
                const newColor = {
                    r: Math.floor(color.r * blend + gray.r * (1 - blend)),
                    g: Math.floor(color.g * blend + gray.g * (1 - blend)),
                    b: Math.floor(color.b * blend + gray.b * (1 - blend)),
                    a: color.a
                };
                
                img.setPixelColor(Jimp.rgbaToInt(
                    newColor.r, newColor.g, newColor.b, newColor.a
                ), x, y);
            }
        }
        
        return img;
    } catch (error) {
        console.error('Color pop filter error:', error);
        return null;
    }
}

async function applyDoubleExposure(image, opacity) {
    try {
        const img = image.clone();
        
        // Create a blurred, inverted version
        const effect = image.clone();
        effect.blur(5).invert();
        
        // Blend with original
        img.composite(effect, 0, 0, {
            mode: Jimp.BLEND_OVERLAY,
            opacitySource: opacity,
            opacityDest: 1 - opacity
        });
        
        return img;
    } catch (error) {
        console.error('Double exposure error:', error);
        return null;
    }
}

async function applyWatercolorFilter(image, detail) {
    try {
        const img = image.clone();
        
        // Apply multiple blurs at different scales
        const detailLevel = Math.max(1, Math.min(10, detail));
        
        // Large scale blur for watercolor wash
        img.blur(detailLevel);
        
        // Medium scale detail preservation
        const medium = image.clone().blur(2);
        img.composite(medium, 0, 0, {
            mode: Jimp.BLEND_OVERLAY,
            opacitySource: 0.3,
            opacityDest: 0.7
        });
        
        // Small scale detail for texture
        const small = image.clone().blur(1);
        img.composite(small, 0, 0, {
            mode: Jimp.BLEND_SOFT_LIGHT,
            opacitySource: 0.2,
            opacityDest: 0.8
        });
        
        // Boost saturation
        img.color([{ apply: 'saturate', params: [20] }]);
        
        return img;
    } catch (error) {
        console.error('Watercolor filter error:', error);
        return null;
    }
}

async function applyMosaicFilter(image, tileSize) {
    try {
        const img = image.clone();
        const size = Math.max(5, Math.min(50, tileSize));
        const width = img.bitmap.width;
        const height = img.bitmap.height;
        
        // Create mosaic effect
        for (let y = 0; y < height; y += size) {
            for (let x = 0; x < width; x += size) {
                // Calculate average color in this tile
                let totalR = 0, totalG = 0, totalB = 0, count = 0;
                
                for (let dy = 0; dy < size && y + dy < height; dy++) {
                    for (let dx = 0; dx < size && x + dx < width; dx++) {
                        const color = Jimp.intToRGBA(img.getPixelColor(x + dx, y + dy));
                        totalR += color.r;
                        totalG += color.g;
                        totalB += color.b;
                        count++;
                    }
                }
                
                const avgR = Math.floor(totalR / count);
                const avgG = Math.floor(totalG / count);
                const avgB = Math.floor(totalB / count);
                
                // Fill tile with average color
                for (let dy = 0; dy < size && y + dy < height; dy++) {
                    for (let dx = 0; dx < size && x + dx < width; dx++) {
                        img.setPixelColor(Jimp.rgbaToInt(avgR, avgG, avgB, 255), x + dx, y + dy);
                    }
                }
            }
        }
        
        return img;
    } catch (error) {
        console.error('Mosaic filter error:', error);
        return null;
    }
}

async function applyEdgeDetectFilter(image, threshold) {
    try {
        const img = image.clone().greyscale();
        
        // Sobel edge detection
        const sobelX = [
            [-1, 0, 1],
            [-2, 0, 2],
            [-1, 0, 1]
        ];
        
        const sobelY = [
            [-1, -2, -1],
            [0, 0, 0],
            [1, 2, 1]
        ];
        
        const width = img.bitmap.width;
        const height = img.bitmap.height;
        const edgeImg = new Jimp(width, height, 0x000000FF);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let gx = 0, gy = 0;
                
                // Apply Sobel operators
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const pixel = Jimp.intToRGBA(img.getPixelColor(x + kx, y + ky));
                        const intensity = pixel.r; // Since it's grayscale
                        
                        gx += intensity * sobelX[ky + 1][kx + 1];
                        gy += intensity * sobelY[ky + 1][kx + 1];
                    }
                }
                
                // Calculate gradient magnitude
                const magnitude = Math.sqrt(gx * gx + gy * gy);
                
                // Apply threshold
                const thresh = threshold * 25;
                if (magnitude > thresh) {
                    edgeImg.setPixelColor(Jimp.rgbaToInt(255, 255, 255, 255), x, y);
                }
            }
        }
        
        return edgeImg;
    } catch (error) {
        console.error('Edge detect filter error:', error);
        return null;
    }
}

async function applyThermalFilter(image) {
    try {
        const img = image.clone().greyscale();
        
        // Apply thermal color map
        const width = img.bitmap.width;
        const height = img.bitmap.height;
        
        // Thermal gradient colors (cold to hot)
        const thermalColors = [
            { r: 0, g: 0, b: 0 },       // Black
            { r: 0, g: 0, b: 128 },     // Navy
            { r: 0, g: 0, b: 255 },     // Blue
            { r: 0, g: 128, b: 255 },   // Light Blue
            { r: 0, g: 255, b: 255 },   // Cyan
            { r: 0, g: 255, b: 128 },   // Green-Cyan
            { r: 0, g: 255, b: 0 },     // Green
            { r: 128, g: 255, b: 0 },   // Yellow-Green
            { r: 255, g: 255, b: 0 },   // Yellow
            { r: 255, g: 128, b: 0 },   // Orange
            { r: 255, g: 0, b: 0 },     // Red
            { r: 255, g: 0, b: 128 },   // Pink
            { r: 255, g: 0, b: 255 },   // Magenta
            { r: 255, g: 255, b: 255 }  // White
        ];
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const color = Jimp.intToRGBA(img.getPixelColor(x, y));
                const intensity = color.r; // Grayscale value
                
                // Map intensity to thermal color
                const index = Math.floor((intensity / 255) * (thermalColors.length - 1));
                const thermalColor = thermalColors[Math.max(0, Math.min(thermalColors.length - 1, index))];
                
                img.setPixelColor(Jimp.rgbaToInt(
                    thermalColor.r, thermalColor.g, thermalColor.b, 255
                ), x, y);
            }
        }
        
        return img;
    } catch (error) {
        console.error('Thermal filter error:', error);
        return null;
    }
}

async function applyXrayFilter(image) {
    try {
        const img = image.clone();
        
        // Convert to grayscale
        img.greyscale();
        
        // Invert
        img.invert();
        
        // Add blue tint
        img.color([{ apply: 'blue', params: [50] }]);
        
        // Add slight blur for medical look
        img.blur(1);
        
        // Increase contrast
        img.contrast(0.3);
        
        return img;
    } catch (error) {
        console.error('X-ray filter error:', error);
        return null;
    }
}

async function applyGlitchFilter(image, amount) {
    try {
        const img = image.clone();
        const width = img.bitmap.width;
        const height = img.bitmap.height;
        
        const glitchAmount = Math.max(0.1, Math.min(1.0, amount));
        
        // Create multiple glitch effects
        const effects = Math.floor(glitchAmount * 10);
        
        for (let i = 0; i < effects; i++) {
            // Random glitch type
            const glitchType = Math.floor(Math.random() * 4);
            
            switch (glitchType) {
                case 0: // Horizontal shift
                    const shiftY = Math.floor(Math.random() * height * 0.1);
                    const shiftAmount = Math.floor(Math.random() * width * 0.05 * glitchAmount);
                    
                    for (let y = shiftY; y < Math.min(height, shiftY + height * 0.1); y++) {
                        const rowImg = img.clone().crop(0, y, width, 1);
                        
                        // Shift row
                        for (let x = 0; x < width; x++) {
                            const srcX = (x + shiftAmount) % width;
                            const color = rowImg.getPixelColor(srcX, 0);
                            img.setPixelColor(color, x, y);
                        }
                    }
                    break;
                    
                case 1: // Color channel shift
                    const channel = Math.floor(Math.random() * 3); // 0=R, 1=G, 2=B
                    const channelShift = Math.floor(Math.random() * 20 * glitchAmount);
                    
                    for (let y = 0; y < height; y++) {
                        for (let x = 0; x < width; x++) {
                            const color = Jimp.intToRGBA(img.getPixelColor(x, y));
                            const shiftX = (x + channelShift) % width;
                            const shiftColor = Jimp.intToRGBA(img.getPixelColor(shiftX, y));
                            
                            const newColor = { ...color };
                            if (channel === 0) newColor.r = shiftColor.r;
                            else if (channel === 1) newColor.g = shiftColor.g;
                            else newColor.b = shiftColor.b;
                            
                            img.setPixelColor(Jimp.rgbaToInt(
                                newColor.r, newColor.g, newColor.b, newColor.a
                            ), x, y);
                        }
                    }
                    break;
                    
                case 2: // Scan lines
                    const lineSpacing = Math.floor(2 + Math.random() * 10);
                    const lineThickness = Math.floor(1 + Math.random() * 3);
                    
                    for (let y = 0; y < height; y++) {
                        if (y % lineSpacing < lineThickness) {
                            for (let x = 0; x < width; x++) {
                                const color = Jimp.intToRGBA(img.getPixelColor(x, y));
                                const darken = 0.5 + Math.random() * 0.5;
                                
                                img.setPixelColor(Jimp.rgbaToInt(
                                    color.r * darken,
                                    color.g * darken,
                                    color.b * darken,
                                    color.a
                                ), x, y);
                            }
                        }
                    }
                    break;
                    
                case 3: // Pixel displacement
                    const blockSize = Math.floor(5 + Math.random() * 20 * glitchAmount);
                    const blocksX = Math.ceil(width / blockSize);
                    const blocksY = Math.ceil(height / blockSize);
                    
                    for (let by = 0; by < blocksY; by++) {
                        for (let bx = 0; bx < blocksX; bx++) {
                            if (Math.random() < glitchAmount * 0.3) {
                                const shiftX = Math.floor(Math.random() * blockSize * 2 - blockSize);
                                const shiftY = Math.floor(Math.random() * blockSize * 2 - blockSize);
                                
                                const startX = bx * blockSize;
                                const startY = by * blockSize;
                                
                                // Create temp block
                                const tempBlock = new Jimp(blockSize, blockSize);
                                for (let y = 0; y < blockSize; y++) {
                                    for (let x = 0; x < blockSize; x++) {
                                        const srcX = startX + x;
                                        const srcY = startY + y;
                                        
                                        if (srcX < width && srcY < height) {
                                            const color = img.getPixelColor(srcX, srcY);
                                            tempBlock.setPixelColor(color, x, y);
                                        }
                                    }
                                }
                                
                                // Paste shifted block
                                for (let y = 0; y < blockSize; y++) {
                                    for (let x = 0; x < blockSize; x++) {
                                        const destX = startX + x;
                                        const destY = startY + y;
                                        
                                        if (destX < width && destY < height) {
                                            const srcX = (x + shiftX + blockSize) % blockSize;
                                            const srcY = (y + shiftY + blockSize) % blockSize;
                                            const color = tempBlock.getPixelColor(srcX, srcY);
                                            img.setPixelColor(color, destX, destY);
                                        }
                                    }
                                }
                            }
                        }
                    }
                    break;
            }
        }
        
        // Add noise
        const noiseAmount = glitchAmount * 5000;
        for (let i = 0; i < noiseAmount; i++) {
            const x = Math.floor(Math.random() * width);
            const y = Math.floor(Math.random() * height);
            
            const color = Math.random() > 0.5 ? 
                Jimp.rgbaToInt(255, 255, 255, 255) : 
                Jimp.rgbaToInt(0, 0, 0, 255);
            
            img.setPixelColor(color, x, y);
        }
        
        return img;
    } catch (error) {
        console.error('Glitch filter error:', error);
        return null;
    }
}