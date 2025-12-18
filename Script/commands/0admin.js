const fs = require('fs-extra');
const path = require('path');

module.exports = {
    config: {
        name: "0admin",
        version: "2.5",
        author: "RANA",
        countDown: 5,
        role: 2,
        shortDescription: {
            en: "Bot Admin Management System",
            bn: "বট অ্যাডমিন ব্যবস্থাপনা সিস্টেম"
        },
        longDescription: {
            en: "Add/remove/list bot admins",
            bn: "বট অ্যাডমিন যোগ, সরান এবং তালিকা দেখুন"
        },
        category: "admin",
        guide: {
            en: "{pn} [add/remove/list] [userID]",
            bn: "{pn} [add/remove/list] [ইউজার আইডি]"
        }
    },

    onStart: async function ({ api, event, args, message, usersData, threadsData, getLang }) {
        const { threadID, messageID, senderID } = event;
        const action = args[0];
        const targetID = args[1];

        if (!action) {
            return message.reply(getLang("invalidSyntax"));
        }

        const configPath = path.join(__dirname, '..', '..', 'config.json');
        const config = fs.readJsonSync(configPath);
        
        if (!Array.isArray(config.adminBot)) {
            config.adminBot = [];
        }

        switch (action.toLowerCase()) {
            case 'add':
                if (!targetID) {
                    return message.reply(getLang("provideUserID"));
                }

                const uidToAdd = targetID.replace(/[@<>]/g, '');
                
                if (config.adminBot.includes(uidToAdd)) {
                    return message.reply(getLang("alreadyAdmin"));
                }

                try {
                    const userInfo = await api.getUserInfo(uidToAdd);
                    const userName = userInfo[uidToAdd]?.name || uidToAdd;
                    
                    config.adminBot.push(uidToAdd);
                    fs.writeJsonSync(configPath, config, { spaces: 2 });
                    
                    return message.reply(getLang("adminAdded", { name: userName, id: uidToAdd, total: config.adminBot.length }));
                } catch (error) {
                    return message.reply(getLang("userNotFound"));
                }

            case 'remove':
                if (!targetID) {
                    return message.reply(getLang("provideUserID"));
                }

                const uidToRemove = targetID.replace(/[@<>]/g, '');
                const index = config.adminBot.indexOf(uidToRemove);
                
                if (index === -1) {
                    return message.reply(getLang("notAdmin"));
                }

                config.adminBot.splice(index, 1);
                fs.writeJsonSync(configPath, config, { spaces: 2 });
                
                return message.reply(getLang("adminRemoved", { id: uidToRemove, total: config.adminBot.length }));

            case 'list':
                if (config.adminBot.length === 0) {
                    return message.reply(getLang("noAdmins"));
                }

                let adminList = "👑 Bot Admin List:\n\n";
                let count = 1;

                for (const adminID of config.adminBot) {
                    try {
                        const userInfo = await api.getUserInfo(adminID);
                        const userName = userInfo[adminID]?.name || "Unknown User";
                        adminList += `${count}. ${userName}\n   ↳ ID: ${adminID}\n\n`;
                    } catch {
                        adminList += `${count}. Unknown User\n   ↳ ID: ${adminID}\n\n`;
                    }
                    count++;
                }

                adminList += `📊 Total Admins: ${config.adminBot.length}`;
                return message.reply(adminList);

            default:
                return message.reply(getLang("invalidSyntax"));
        }
    },

    langs: {
        en: {
            invalidSyntax: "❌ Invalid syntax!\nUsage: {pn} add/remove/list [userID]",
            provideUserID: "❌ Please provide user ID",
            alreadyAdmin: "✅ This user is already an admin",
            userNotFound: "❌ User not found",
            adminAdded: "✅ Admin added successfully!\n👤 Name: {name}\n🆔 ID: {id}\n📊 Total Admins: {total}",
            notAdmin: "❌ This user is not an admin",
            adminRemoved: "✅ Admin removed successfully!\n🆔 ID: {id}\n📊 Total Admins: {total}",
            noAdmins: "📭 No admins found",
            error: "❌ An error occurred: {error}"
        },
        bn: {
            invalidSyntax: "❌ ভুল সিনট্যাক্স!\nব্যবহার: {pn} add/remove/list [ইউজার আইডি]",
            provideUserID: "❌ ইউজার আইডি দিন",
            alreadyAdmin: "✅ এই ইউজার ইতিমধ্যে অ্যাডমিন",
            userNotFound: "❌ ইউজার খুঁজে পাওয়া যায়নি",
            adminAdded: "✅ অ্যাডমিন যোগ করা হয়েছে!\n👤 নাম: {name}\n🆔 আইডি: {id}\n📊 মোট অ্যাডমিন: {total}",
            notAdmin: "❌ এই ইউজার অ্যাডমিন নয়",
            adminRemoved: "✅ অ্যাডমিন সরানো হয়েছে!\n🆔 আইডি: {id}\n📊 মোট অ্যাডমিন: {total}",
            noAdmins: "📭 কোন অ্যাডমিন নেই",
            error: "❌ ত্রুটি হয়েছে: {error}"
        }
    }
};