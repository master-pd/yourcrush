const axios = require('axios');
const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

module.exports = {
    config: {
        name: "editpic",
        aliases: ["editimage", "imageedit"],
        version: "2.0",
        author: "RANA",
        role: 0,
        category: "image",
        shortDescription: {
            en: "Edit images with various effects",
            bn: "বিভিন্ন ইফেক্ট সহ ইমেজ এডিট করুন"
        },
        longDescription: {
            en: "Apply filters, effects, and edits to images",
            bn: "ইমেজে ফিল্টার, ইফেক্ট এবং এডিট প্রয়োগ করুন"
        },
        guide: {
            en: "{pn} [effect] or {pn} list\nReply to an image or attach one",
            bn: "{pn} [ইফেক্ট] অথবা {pn} list\nএকটি ইমেজ রিপ্লাই করুন বা অ্যাটাচ করুন"
        },
        cooldown: 20
    },

    onStart: async function({ api, event }) {
        try {
            const { threadID, messageID, type, messageReply } = event;
            
            if (type === "message_reply") {
                if (messageReply.attachments.length > 0) {
                    const attachment = messageReply.attachments[0];
                    if (attachment.type === "photo") {
                        return showEditOptions(api, threadID, messageID, attachment.url);
                    }
                }
            }
            
            // Check for attached image
            if (event.attachments && event.attachments.length > 0) {
                const attachment = event.attachments[0];
                if (attachment.type === "photo") {
                    return showEditOptions(api, threadID, messageID, attachment.url);
                }
            }
            
            return api.sendMessage(
                "🖼️ **Image Editor**\n\n" +
                "Please reply to an image or attach an image to edit.\n\n" +
                `📝 **Usage:**\n` +
                `1. Send an image or reply to an image\n` +
                `2. Type ${global.config.prefix}editpic [effect]\n\n` +
                `📋 **Effects List:** ${global.config.prefix}editpic list`,
                threadID,
                messageID
            );
            
        } catch (error) {
            console.error(error);
            api.sendMessage(
                "❌ Image edit command failed.",
                event.threadID,
                event.messageID
            );
        }
    }
};

async function showEditOptions(api, threadID, messageID, imageUrl) {
    const effects = [
        { id: 'blur', name: 'Blur', desc: 'Apply blur effect' },
        { id: 'brightness', name: 'Brightness', desc: 'Adjust brightness' },
        { id: 'contrast', name: 'Contrast', desc: 'Adjust contrast' },
        { id: 'greyscale', name: 'Grayscale', desc: 'Convert to black and white' },
        { id: 'invert', name: 'Invert', desc: 'Invert colors' },
        { id: 'sepia', name: 'Sepia', desc: 'Apply sepia tone' },
        { id: 'pixelate', name: 'Pixelate', desc: 'Pixelate image' },
        { id: 'mirror', name: 'Mirror', desc: 'Mirror image horizontally' },
        { id: 'flip', name: 'Flip', desc: 'Flip image vertically' },
        { id: 'rotate', name: 'Rotate', desc: 'Rotate image' },
        { id: 'resize', name: 'Resize', desc: 'Resize image' },
        { id: 'circle', name: 'Circle', desc: 'Make circular crop' },
        { id: 'border', name: 'Border', desc: 'Add border' },
        { id: 'vignette', name: 'Vignette', desc: 'Add vignette effect' },
        { id: 'posterize', name: 'Posterize', desc: 'Posterize effect' },
        { id: 'sharpen', name: 'Sharpen', desc: 'Sharpen image' },
        { id: 'red', name: 'Red Tint', desc: 'Apply red tint' },
        { id: 'blue', name: 'Blue Tint', desc: 'Apply blue tint' },
        { id: 'green', name: 'Green Tint', desc: 'Apply green tint' },
        { id: 'comic', name: 'Comic Effect', desc: 'Comic book effect' }
    ];
    
    let message = `🎨 **IMAGE EDITOR - Available Effects** 🎨\n\n`;
    message += `📷 **Image ready for editing!**\n\n`;
    
    // Group effects
    const basicEffects = effects.slice(0, 7);
    const transformEffects = effects.slice(7, 12);
    const styleEffects = effects.slice(12);
    
    message += `🔧 **Basic Effects:**\n`;
    basicEffects.forEach(effect => {
        message += `• ${effect.name} (${effect.id}) - ${effect.desc}\n`;
    });
    
    message += `\n🔄 **Transform Effects:**\n`;
    transformEffects.forEach(effect => {
        message += `• ${effect.name} (${effect.id}) - ${effect.desc}\n`;
    });
    
    message += `\n🎭 **Style Effects:**\n`;
    styleEffects.forEach(effect => {
        message += `• ${effect.name} (${effect.id}) - ${effect.desc}\n`;
    });
    
    message += `\n📝 **Usage Examples:**\n`;
    message += `• ${global.config.prefix}editpic blur\n`;
    message += `• ${global.config.prefix}editpic greyscale\n`;
    message += `• ${global.config.prefix}editpic sepia 0.5\n`;
    message += `• ${global.config.prefix}editpic rotate 90\n`;
    message += `• ${global.config.prefix}editpic resize 500\n`;
    
    message += `\n💡 **Tip:** Some effects accept parameters (e.g., ${global.config.prefix}editpic blur 5)`;
    
    // Store image URL for later use
    global.editImageData = global.editImageData || {};
    global.editImageData[threadID] = {
        imageUrl: imageUrl,
        timestamp: Date.now()
    };
    
    // Set timeout to clear data after 5 minutes
    setTimeout(() => {
        if (global.editImageData[threadID]) {
            delete global.editImageData[threadID];
        }
    }, 5 * 60 * 1000);
    
    api.sendMessage(message, threadID, messageID);
}

// Handle effect application
module.exports.handleReply = async function({ api, event, args }) {
    try {
        const { threadID, messageID, body } = event;
        
        if (!global.editImageData || !global.editImageData[threadID]) {
            return api.sendMessage(
                "❌ No image selected or selection expired.\n" +
                "Please send/reply to an image again.",
                threadID,
                messageID
            );
        }
        
        const imageData = global.editImageData[threadID];
        
        // Check if data is expired (5 minutes)
        if (Date.now() - imageData.timestamp > 5 * 60 * 1000) {
            delete global.editImageData[threadID];
            return api.sendMessage(
                "❌ Image selection expired. Please select again.",
                threadID,
                messageID
            );
        }
        
        const effectArgs = body.trim().split(/\s+/);
        const effectName = effectArgs[0].toLowerCase();
        const effectParam = effectArgs[1] ? parseFloat(effectArgs[1]) : null;
        
        // Send processing message
        api.sendMessage(
            `🎨 Applying ${effectName} effect...`,
            threadID,
            messageID
        );
        
        // Apply effect
        const editedImage = await applyImageEffect(
            imageData.imageUrl,
            effectName,
            effectParam
        );
        
        if (!editedImage) {
            return api.sendMessage(
                `❌ Failed to apply ${effectName} effect.\n` +
                `Use ${global.config.prefix}editpic list to see available effects.`,
                threadID,
                messageID
            );
        }
        
        // Send edited image
        api.sendMessage(
            {
                body: `✅ Image edited successfully!\n\n` +
                      `🎨 **Effect:** ${effectName}\n` +
                      `📏 **Parameter:** ${effectParam || 'default'}\n\n` +
                      `💡 To edit again, send/reply to another image.`,
                attachment: fs.createReadStream(editedImage)
            },
            threadID,
            messageID,
            async () => {
                // Clean up
                try {
                    fs.unlinkSync(editedImage);
                } catch (error) {
                    // Ignore cleanup errors
                }
            }
        );
        
        // Clear image data
        delete global.editImageData[threadID];
        
    } catch (error) {
        console.error(error);
        api.sendMessage(
            "❌ Failed to edit image.",
            event.threadID,
            event.messageID
        );
    }
};

async function applyImageEffect(imageUrl, effectName, param = null) {
    try {
        // Create temp directory
        const tempDir = path.join(__dirname, '../../cache/edited');
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
        
        // Apply effect based on name
        switch (effectName) {
            case 'blur':
                const blurAmount = param || 5;
                image.blur(Math.min(Math.max(blurAmount, 1), 20));
                break;
                
            case 'brightness':
                const brightness = param || 0;
                image.brightness(brightness); // -1 to 1
                break;
                
            case 'contrast':
                const contrast = param || 0;
                image.contrast(contrast); // -1 to 1
                break;
                
            case 'greyscale':
            case 'grayscale':
                image.greyscale();
                break;
                
            case 'invert':
                image.invert();
                break;
                
            case 'sepia':
                const sepiaAmount = param || 1;
                image.sepia();
                if (sepiaAmount !== 1) {
                    image.color([
                        { apply: 'mix', params: ['#704214', sepiaAmount] }
                    ]);
                }
                break;
                
            case 'pixelate':
                const pixelSize = param || 10;
                image.pixelate(Math.min(Math.max(pixelSize, 2), 50));
                break;
                
            case 'mirror':
                image.mirror(true, false);
                break;
                
            case 'flip':
                image.flip(false, true);
                break;
                
            case 'rotate':
                const angle = param || 90;
                image.rotate(angle);
                break;
                
            case 'resize':
                const size = param || 500;
                const width = image.bitmap.width;
                const height = image.bitmap.height;
                
                if (width > height) {
                    image.resize(size, Jimp.AUTO);
                } else {
                    image.resize(Jimp.AUTO, size);
                }
                break;
                
            case 'circle':
                // Create circular mask
                const diameter = Math.min(image.bitmap.width, image.bitmap.height);
                const circle = new Jimp(diameter, diameter, 0x0);
                
                for (let y = 0; y < diameter; y++) {
                    for (let x = 0; x < diameter; x++) {
                        const dx = x - diameter / 2;
                        const dy = y - diameter / 2;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance <= diameter / 2) {
                            const srcX = x + (image.bitmap.width - diameter) / 2;
                            const srcY = y + (image.bitmap.height - diameter) / 2;
                            
                            if (srcX >= 0 && srcX < image.bitmap.width && 
                                srcY >= 0 && srcY < image.bitmap.height) {
                                const color = image.getPixelColor(srcX, srcY);
                                circle.setPixelColor(color, x, y);
                            }
                        }
                    }
                }
                
                // Replace image with circle
                image.bitmap = circle.bitmap;
                break;
                
            case 'border':
                const borderSize = param || 10;
                const borderColor = 0xFFFFFFFF; // White
                
                const bordered = new Jimp(
                    image.bitmap.width + borderSize * 2,
                    image.bitmap.height + borderSize * 2,
                    borderColor
                );
                
                bordered.composite(image, borderSize, borderSize);
                image.bitmap = bordered.bitmap;
                break;
                
            case 'vignette':
                const vignetteStrength = param || 0.7;
                const centerX = image.bitmap.width / 2;
                const centerY = image.bitmap.height / 2;
                const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
                
                for (let y = 0; y < image.bitmap.height; y++) {
                    for (let x = 0; x < image.bitmap.width; x++) {
                        const dx = x - centerX;
                        const dy = y - centerY;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        const vignette = 1 - (distance / maxDistance) * vignetteStrength;
                        
                        const color = Jimp.intToRGBA(image.getPixelColor(x, y));
                        const newColor = {
                            r: Math.max(0, Math.min(255, color.r * vignette)),
                            g: Math.max(0, Math.min(255, color.g * vignette)),
                            b: Math.max(0, Math.min(255, color.b * vignette)),
                            a: color.a
                        };
                        
                        image.setPixelColor(Jimp.rgbaToInt(
                            newColor.r, newColor.g, newColor.b, newColor.a
                        ), x, y);
                    }
                }
                break;
                
            case 'posterize':
                const levels = param || 4;
                image.posterize(levels);
                break;
                
            case 'sharpen':
                const sharpenAmount = param || 5;
                image.convolute([
                    [0, -1, 0],
                    [-1, sharpenAmount, -1],
                    [0, -1, 0]
                ]);
                break;
                
            case 'red':
                const redStrength = param || 0.3;
                image.color([
                    { apply: 'red', params: [redStrength * 100] }
                ]);
                break;
                
            case 'blue':
                const blueStrength = param || 0.3;
                image.color([
                    { apply: 'blue', params: [blueStrength * 100] }
                ]);
                break;
                
            case 'green':
                const greenStrength = param || 0.3;
                image.color([
                    { apply: 'green', params: [greenStrength * 100] }
                ]);
                break;
                
            case 'comic':
                // Comic effect: posterize + edge detect
                image.posterize(6);
                image.convolute([
                    [-1, -1, -1],
                    [-1, 8, -1],
                    [-1, -1, -1]
                ]);
                break;
                
            default:
                return null;
        }
        
        // Generate filename and save
        const filename = `edited_${Date.now()}_${effectName}.png`;
        const filePath = path.join(tempDir, filename);
        
        await image.writeAsync(filePath);
        
        return filePath;
        
    } catch (error) {
        console.error('Image effect error:', error);
        return null;
    }
}