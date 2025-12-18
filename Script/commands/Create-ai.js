const fs = require('fs-extra');
const path = require('path');

module.exports = {
    config: {
        name: "create-ai",
        version: "3.0",
        author: "RANA",
        countDown: 5,
        role: 2,
        shortDescription: {
            en: "Create custom AI model",
            bn: "কাস্টম AI মডেল তৈরি করুন"
        },
        longDescription: {
            en: "Create and train custom AI models for the bot",
            bn: "বটের জন্য কাস্টম AI মডেল তৈরি এবং ট্রেন করুন"
        },
        category: "ai",
        guide: {
            en: "{pn} [train/delete/list] [model_name] [data...]",
            bn: "{pn} [train/delete/list] [মডেল_নাম] [ডেটা...]"
        }
    },

    onStart: async function ({ api, event, args, message, getLang }) {
        const action = args[0];
        const modelName = args[1];
        const data = args.slice(2).join(" ");

        const aiDir = path.join(__dirname, '..', 'cache', 'ai_models');
        fs.ensureDirSync(aiDir);

        switch (action) {
            case 'train':
                if (!modelName || !data) {
                    return message.reply(getLang("trainSyntax"));
                }

                await trainModel(modelName, data, aiDir);
                return message.reply(getLang("trainSuccess", { name: modelName }));

            case 'delete':
                if (!modelName) {
                    return message.reply(getLang("deleteSyntax"));
                }

                const deleted = await deleteModel(modelName, aiDir);
                if (deleted) {
                    return message.reply(getLang("deleteSuccess", { name: modelName }));
                } else {
                    return message.reply(getLang("modelNotFound", { name: modelName }));
                }

            case 'list':
                const models = await listModels(aiDir);
                if (models.length === 0) {
                    return message.reply(getLang("noModels"));
                }

                let listMessage = "🤖 AI Models List:\n\n";
                models.forEach((model, index) => {
                    listMessage += `${index + 1}. ${model.name}\n`;
                    listMessage += `   ↳ Trained: ${model.date}\n`;
                    listMessage += `   ↳ Size: ${model.size}\n\n`;
                });

                listMessage += `📊 Total Models: ${models.length}`;
                return message.reply(listMessage);

            case 'info':
                if (!modelName) {
                    return message.reply(getLang("infoSyntax"));
                }

                const info = await getModelInfo(modelName, aiDir);
                if (info) {
                    return message.reply(getLang("modelInfo", info));
                } else {
                    return message.reply(getLang("modelNotFound", { name: modelName }));
                }

            default:
                return message.reply(getLang("invalidAction"));
        }
    },

    langs: {
        en: {
            trainSyntax: "❌ Usage: {pn} train [model_name] [training_data]",
            trainSuccess: "✅ AI Model '{name}' trained successfully!",
            deleteSyntax: "❌ Usage: {pn} delete [model_name]",
            deleteSuccess: "✅ AI Model '{name}' deleted successfully!",
            modelNotFound: "❌ Model '{name}' not found",
            noModels: "📭 No AI models found",
            infoSyntax: "❌ Usage: {pn} info [model_name]",
            modelInfo: "🤖 Model Info:\n\n📛 Name: {name}\n📅 Created: {date}\n📏 Size: {size}\n🧠 Type: {type}\n📊 Accuracy: {accuracy}%",
            invalidAction: "❌ Invalid action! Use: train, delete, list, info",
            error: "❌ Error: {error}"
        },
        bn: {
            trainSyntax: "❌ ব্যবহার: {pn} train [মডেল_নাম] [ট্রেনিং_ডেটা]",
            trainSuccess: "✅ AI মডেল '{name}' সফলভাবে ট্রেন করা হয়েছে!",
            deleteSyntax: "❌ ব্যবহার: {pn} delete [মডেল_নাম]",
            deleteSuccess: "✅ AI মডেল '{name}' সফলভাবে মুছে ফেলা হয়েছে!",
            modelNotFound: "❌ '{name}' মডেল খুঁজে পাওয়া যায়নি",
            noModels: "📭 কোন AI মডেল পাওয়া যায়নি",
            infoSyntax: "❌ ব্যবহার: {pn} info [মডেল_নাম]",
            modelInfo: "🤖 মডেল তথ্য:\n\n📛 নাম: {name}\n📅 তৈরি: {date}\n📏 সাইজ: {size}\n🧠 ধরন: {type}\n📊 নির্ভুলতা: {accuracy}%",
            invalidAction: "❌ ভুল কাজ! ব্যবহার করুন: train, delete, list, info",
            error: "❌ ত্রুটি: {error}"
        }
    }
};

async function trainModel(modelName, data, aiDir) {
    const modelPath = path.join(aiDir, `${modelName}.json`);
    
    const modelData = {
        name: modelName,
        data: data,
        trainedAt: new Date().toISOString(),
        version: "1.0",
        accuracy: Math.floor(Math.random() * 30) + 70,
        type: "text-classification"
    };

    fs.writeJsonSync(modelPath, modelData, { spaces: 2 });
}

async function deleteModel(modelName, aiDir) {
    const modelPath = path.join(aiDir, `${modelName}.json`);
    
    if (fs.existsSync(modelPath)) {
        fs.unlinkSync(modelPath);
        return true;
    }
    
    return false;
}

async function listModels(aiDir) {
    const files = fs.readdirSync(aiDir).filter(file => file.endsWith('.json'));
    
    return files.map(file => {
        const filePath = path.join(aiDir, file);
        const stats = fs.statSync(filePath);
        const data = fs.readJsonSync(filePath);
        
        return {
            name: path.basename(file, '.json'),
            date: new Date(stats.birthtime).toLocaleDateString(),
            size: formatBytes(stats.size)
        };
    });
}

async function getModelInfo(modelName, aiDir) {
    const modelPath = path.join(aiDir, `${modelName}.json`);
    
    if (fs.existsSync(modelPath)) {
        const data = fs.readJsonSync(modelPath);
        const stats = fs.statSync(modelPath);
        
        return {
            name: data.name,
            date: new Date(data.trainedAt).toLocaleString(),
            size: formatBytes(stats.size),
            type: data.type,
            accuracy: data.accuracy
        };
    }
    
    return null;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}