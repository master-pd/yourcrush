const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

module.exports = {
    config: {
        name: "art",
        version: "3.0",
        author: "RANA",
        countDown: 30,
        role: 0,
        shortDescription: {
            en: "Generate AI art from text",
            bn: "টেক্সট থেকে AI আর্ট তৈরি করুন"
        },
        longDescription: {
            en: "Generate AI-powered artwork from text descriptions using various styles",
            bn: "বিভিন্ন শৈলী ব্যবহার করে টেক্সট বর্ণনা থেকে AI-চালিত আর্টওয়ার্ক তৈরি করুন"
        },
        category: "ai",
        guide: {
            en: "{pn} [prompt] -style [style]",
            bn: "{pn} [প্রম্পট] -style [শৈলী]"
        }
    },

    onStart: async function ({ api, event, args, message, getLang }) {
        let prompt = args.join(" ");
        let style = "digital art";

        if (prompt.includes('-style')) {
            const parts = prompt.split('-style');
            prompt = parts[0].trim();
            style = parts[1]?.trim() || "digital art";
        }

        if (!prompt) {
            return message.reply(getLang("noPrompt"));
        }

        try {
            await message.reply(getLang("generating", { prompt, style }));

            const imageUrl = await generateArt(prompt, style);
            
            if (!imageUrl) {
                return message.reply(getLang("generationFailed"));
            }

            const tempPath = await downloadImage(imageUrl);
            
            await message.reply({
                body: getLang("generated", { prompt, style }),
                attachment: fs.createReadStream(tempPath)
            });
            
            fs.unlinkSync(tempPath);

        } catch (error) {
            console.error('Art generation error:', error);
            await message.reply(getLang("error", { error: error.message }));
        }
    },

    langs: {
        en: {
            noPrompt: "❌ Please provide a description for the art\nExample: {pn} a beautiful sunset over mountains",
            generating: "🎨 Generating AI art...\n\nPrompt: {prompt}\nStyle: {style}\n\nThis may take up to 30 seconds.",
            generated: "🖼️ AI Art Generated!\n\nPrompt: {prompt}\nStyle: {style}",
            generationFailed: "❌ Failed to generate art. Please try again with a different prompt.",
            styles: "🎨 Available Styles:\n\n• anime\n• digital art\n• watercolor\n• oil painting\n• pixel art\n• cyberpunk\n• fantasy\n• realistic\n• cartoon\n• abstract",
            error: "❌ Error: {error}"
        },
        bn: {
            noPrompt: "❌ দয়া করে আর্টের জন্য একটি বর্ণনা দিন\nউদাহরণ: {pn} পর্বতের উপর একটি সুন্দর সূর্যাস্ত",
            generating: "🎨 AI আর্ট তৈরি হচ্ছে...\n\nপ্রম্পট: {prompt}\nশৈলী: {style}\n\nএটি ৩০ সেকেন্ড পর্যন্ত সময় নিতে পারে।",
            generated: "🖼️ AI আর্ট তৈরি হয়েছে!\n\nপ্রম্পট: {prompt}\nশৈলী: {style}",
            generationFailed: "❌ আর্ট তৈরি করতে ব্যর্থ হয়েছে। দয়া করে একটি ভিন্ন প্রম্পট দিয়ে আবার চেষ্টা করুন।",
            styles: "🎨 উপলব্ধ শৈলী:\n\n• এনিমে\n• ডিজিটাল আর্ট\n• ওয়াটারকালার\n• অয়েল পেইন্টিং\n• পিক্সেল আর্ট\n• সাইবারপাঙ্ক\n• ফ্যান্টাসি\n• বাস্তবসম্মত\n• কার্টুন\n• বিমূর্ত",
            error: "❌ ত্রুটি: {error}"
        }
    }
};

async function generateArt(prompt, style) {
    const styles = {
        'anime': 'anime style, vibrant colors, detailed',
        'digital art': 'digital painting, concept art, detailed',
        'watercolor': 'watercolor painting, soft edges, translucent',
        'oil painting': 'oil on canvas, textured, classical',
        'pixel art': '8-bit pixel art, retro, video game style',
        'cyberpunk': 'cyberpunk, neon lights, futuristic',
        'fantasy': 'fantasy art, magical, epic',
        'realistic': 'photorealistic, detailed, realistic lighting',
        'cartoon': 'cartoon style, bright colors, simplified',
        'abstract': 'abstract art, geometric, colorful'
    };

    const stylePrompt = styles[style] || styles['digital art'];
    const fullPrompt = `${prompt}, ${stylePrompt}, high quality, masterpiece`;

    try {
        const response = await axios.post('https://api.openai.com/v1/images/generations', {
            prompt: fullPrompt,
            n: 1,
            size: "512x512",
            model: "dall-e-2"
        }, {
            headers: {
                'Authorization': `Bearer YOUR_OPENAI_API_KEY`,
                'Content-Type': 'application/json'
            }
        });

        return response.data.data[0].url;
    } catch (error) {
        console.error('OpenAI API error:', error);
        
        try {
            const stableDiffusionResponse = await axios.post('https://api.stability.ai/v1/generation/stable-diffusion-512-v2-1/text-to-image', {
                text_prompts: [{ text: fullPrompt }],
                cfg_scale: 7,
                height: 512,
                width: 512,
                samples: 1,
                steps: 30
            }, {
                headers: {
                    'Authorization': `Bearer YOUR_STABILITY_API_KEY`,
                    'Content-Type': 'application/json'
                }
            });

            return `data:image/png;base64,${stableDiffusionResponse.data.artifacts[0].base64}`;
        } catch (sdError) {
            console.error('Stability AI error:', sdError);
            return null;
        }
    }
}

async function downloadImage(url) {
    const tempPath = path.join(__dirname, '..', '..', 'cache', `art_${Date.now()}.png`);
    
    let buffer;
    
    if (url.startsWith('data:image')) {
        const base64Data = url.replace(/^data:image\/\w+;base64,/, '');
        buffer = Buffer.from(base64Data, 'base64');
    } else {
        const response = await axios({
            url: url,
            method: 'GET',
            responseType: 'arraybuffer'
        });
        buffer = Buffer.from(response.data, 'binary');
    }
    
    fs.writeFileSync(tempPath, buffer);
    return tempPath;
}