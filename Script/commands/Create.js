const fs = require('fs-extra');
const path = require('path');

module.exports = {
    config: {
        name: "create",
        version: "2.0",
        author: "RANA",
        countDown: 5,
        role: 2,
        shortDescription: {
            en: "Create new bot features",
            bn: "নতুন বট ফিচার তৈরি করুন"
        },
        longDescription: {
            en: "Create custom commands, events, or features",
            bn: "কাস্টম কমান্ড, ইভেন্ট বা ফিচার তৈরি করুন"
        },
        category: "developer",
        guide: {
            en: "{pn} [command/event] [name] [code...]",
            bn: "{pn} [command/event] [নাম] [কোড...]"
        }
    },

    onStart: async function ({ api, event, args, message, getLang }) {
        const type = args[0];
        const name = args[1];
        const code = args.slice(2).join(" ");

        if (!type || !name) {
            return message.reply(getLang("invalidSyntax"));
        }

        try {
            switch (type.toLowerCase()) {
                case 'command':
                    await createCommand(name, code);
                    return message.reply(getLang("commandCreated", { name }));

                case 'event':
                    await createEvent(name, code);
                    return message.reply(getLang("eventCreated", { name }));

                case 'feature':
                    await createFeature(name, code);
                    return message.reply(getLang("featureCreated", { name }));

                default:
                    return message.reply(getLang("invalidType"));
            }
        } catch (error) {
            return message.reply(getLang("error", { error: error.message }));
        }
    },

    langs: {
        en: {
            invalidSyntax: "❌ Usage: {pn} [command/event/feature] [name] [code]",
            commandCreated: "✅ Command '{name}' created successfully!\nUse: .{name} to execute",
            eventCreated: "✅ Event '{name}' created successfully!",
            featureCreated: "✅ Feature '{name}' created successfully!",
            invalidType: "❌ Invalid type! Use: command, event, or feature",
            error: "❌ Error: {error}"
        },
        bn: {
            invalidSyntax: "❌ ব্যবহার: {pn} [command/event/feature] [নাম] [কোড]",
            commandCreated: "✅ কমান্ড '{name}' সফলভাবে তৈরি হয়েছে!\nব্যবহার: .{name}",
            eventCreated: "✅ ইভেন্ট '{name}' সফলভাবে তৈরি হয়েছে!",
            featureCreated: "✅ ফিচার '{name}' সফলভাবে তৈরি হয়েছে!",
            invalidType: "❌ ভুল ধরন! ব্যবহার করুন: command, event, feature",
            error: "❌ ত্রুটি: {error}"
        }
    }
};

async function createCommand(name, code) {
    const commandsDir = path.join(__dirname, '..', 'commands');
    fs.ensureDirSync(commandsDir);

    const commandPath = path.join(commandsDir, `${name}.js`);
    
    const template = `module.exports = {
    config: {
        name: "${name}",
        version: "1.0",
        author: "User Created",
        countDown: 5,
        role: 0,
        shortDescription: {
            en: "User created command",
            bn: "ব্যবহারকারী তৈরি করা কমান্ড"
        },
        longDescription: {
            en: "This is a user created command",
            bn: "এটি একটি ব্যবহারকারী তৈরি করা কমান্ড"
        },
        category: "custom",
        guide: {
            en: "{pn}",
            bn: "{pn}"
        }
    },

    onStart: async function ({ api, event, args, message, getLang }) {
        ${code || '// Add your code here\nawait message.reply("Command executed!");'}
    },

    langs: {
        en: {
            message: "Command executed successfully!"
        },
        bn: {
            message: "কমান্ড সফলভাবে এক্সিকিউট হয়েছে!"
        }
    }
};`;

    fs.writeFileSync(commandPath, template);
}

async function createEvent(name, code) {
    const eventsDir = path.join(__dirname, '..', 'events');
    fs.ensureDirSync(eventsDir);

    const eventPath = path.join(eventsDir, `${name}.js`);
    
    const template = `module.exports = {
    onEvent: async function ({ api, event, args, message, usersData, threadsData, getLang }) {
        ${code || '// Add your event handling code here\nconsole.log("Event triggered:", event.type);'}
    }
};`;

    fs.writeFileSync(eventPath, template);
}

async function createFeature(name, code) {
    const featuresDir = path.join(__dirname, '..', 'features');
    fs.ensureDirSync(featuresDir);

    const featurePath = path.join(featuresDir, `${name}.js`);
    
    const template = `module.exports = {
    name: "${name}",
    version: "1.0",
    author: "User Created",
    
    init: async function ({ api, config, logger }) {
        ${code || '// Feature initialization code\nconsole.log("Feature ${name} initialized");'}
    },
    
    execute: async function ({ api, event, args }) {
        // Feature execution code
        return "Feature executed!";
    }
};`;

    fs.writeFileSync(featurePath, template);
}