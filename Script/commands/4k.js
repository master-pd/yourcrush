const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

module.exports = {
    config: {
        name: "4k",
        version: "2.0",
        author: "RANA",
        countDown: 30,
        role: 0,
        shortDescription: {
            en: "Enhance image to 4K quality",
            bn: "ছবি 4K কোয়ালিটিতে উন্নত করুন"
        },
        longDescription: {
            en: "Enhance and upscale any image to 4K resolution",
            bn: "যেকোনো ছবি 4K রেজুলেশনে উন্নত করুন"
        },
        category: "image",
        guide: {
            en: "{pn} [reply to image]",
            bn: "{pn} [ছবিতে রিপ্লাই দিন]"
        }
    },

    onStart: async function ({ api, event, message, args, getLang }) {
        try {
            if (event.type !== "message_reply" || !event.messageReply.attachments || event.messageReply.attachments.length === 0) {
                return message.reply(getLang("noImage"));
            }

            const attachment = event.messageReply.attachments[0];
            
            if (attachment.type !== "photo") {
                return message.reply(getLang("notImage"));
            }

            await message.reply(getLang("processing"));

            const imageUrl = attachment.url;
            
            const tempPath = path.join(__dirname, 'cache', `enhance_${Date.now()}.jpg`);
            
            const enhancedImage = await enhanceImage(imageUrl, tempPath);
            
            if (enhancedImage) {
                await message.reply({
                    body: getLang("success"),
                    attachment: fs.createReadStream(enhancedImage)
                });
                
                fs.unlinkSync(enhancedImage);
            } else {
                await message.reply(getLang("enhanceFailed"));
            }

        } catch (error) {
            console.error('4K Enhancement Error:', error);
            await message.reply(getLang("error", { error: error.message }));
        }
    },

    langs: {
        en: {
            noImage: "❌ Please reply to an image message",
            notImage: "❌ Only images are supported",
            processing: "🔄 Enhancing image to 4K... This may take a moment",
            success: "✅ Image enhanced to 4K successfully!",
            enhanceFailed: "❌ Failed to enhance image. Please try another image",
            error: "❌ Error: {error}"
        },
        bn: {
            noImage: "❌ একটি ছবির বার্তায় উত্তর দিন",
            notImage: "❌ শুধুমাত্র ছবি সমর্থিত",
            processing: "🔄 ছবি 4K তে উন্নত করা হচ্ছে... একটু সময় লাগতে পারে",
            success: "✅ ছবি সফলভাবে 4K তে উন্নত হয়েছে!",
            enhanceFailed: "❌ ছবি উন্নত করতে ব্যর্থ হয়েছে। অন্য একটি ছবি চেষ্টা করুন",
            error: "❌ ত্রুটি: {error}"
        }
    }
};

async function enhanceImage(imageUrl, outputPath) {
    try {
        const formData = new FormData();
        formData.append('image', imageUrl);
        
        const response = await axios.post('https://api.rembg.ai/remove', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            responseType: 'arraybuffer'
        });

        if (response.status === 200) {
            fs.writeFileSync(outputPath, Buffer.from(response.data));
            return outputPath;
        }
    } catch (error) {
        console.error('Image enhancement error:', error);
    }
    
    return null;
}