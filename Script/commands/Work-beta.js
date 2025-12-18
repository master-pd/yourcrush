const fs = require('fs-extra');
const path = require('path');

module.exports = {
    config: {
        name: "work-beta",
        version: "1.0",
        author: "RANA",
        countDown: 10,
        role: 0,
        shortDescription: {
            en: "Beta work system to earn money",
            bn: "টাকা উপার্জনের জন্য বিটা কাজের ব্যবস্থা"
        },
        longDescription: {
            en: "Work at different jobs to earn money. This is a beta version with limited features.",
            bn: "টাকা উপার্জনের জন্য বিভিন্ন কাজে কাজ করুন। এটি সীমিত বৈশিষ্ট্যযুক্ত একটি বিটা সংস্করণ।"
        },
        category: "economy",
        guide: {
            en: "{pn} [start/list/stats]",
            bn: "{pn} [start/list/stats]"
        }
    },

    onStart: async function ({ api, event, args, message, usersData, getLang }) {
        const action = args[0] || 'start';
        const userId = event.senderID;

        try {
            const userData = await usersData.get(userId);
            
            if (!userData.money) {
                await usersData.set(userId, { money: 0 });
            }

            switch (action.toLowerCase()) {
                case 'start':
                    return await startWork(userId, api, event, message, usersData, getLang);
                
                case 'list':
                    return await listJobs(message, getLang);
                
                case 'stats':
                    return await showStats(userId, message, usersData, getLang);
                
                default:
                    return message.reply(getLang("invalidAction"));
            }

        } catch (error) {
            console.error('Work system error:', error);
            return message.reply(getLang("error", { error: error.message }));
        }
    },

    langs: {
        en: {
            working: "💼 Working at {job}...",
            completed: "✅ Work completed!\n\nJob: {job}\nEarned: ${earned}\nNew Balance: ${balance}",
            cooldown: "⏳ You need to wait {time} before working again!",
            jobList: "💼 Available Jobs (Beta):\n\n1. Programmer - $100-200/hour\n2. Designer - $80-150/hour\n3. Writer - $50-100/hour\n4. Tutor - $60-120/hour\n5. Data Entry - $40-80/hour\n\nUse: {pn} start to begin working",
            stats: "📊 Work Statistics:\n\nTotal Earnings: ${total}\nJobs Completed: {jobs}\nCurrent Job: {current}\nWork Streak: {streak} days",
            invalidAction: "❌ Invalid action! Use: start, list, stats",
            error: "❌ Error: {error}"
        },
        bn: {
            working: "💼 {job} এ কাজ করছি...",
            completed: "✅ কাজ সম্পন্ন!\n\nচাকরি: {job}\nআয়: ${earned}\nনতুন ব্যালেন্স: ${balance}",
            cooldown: "⏳ আবার কাজ শুরু করার আগে আপনাকে {time} অপেক্ষা করতে হবে!",
            jobList: "💼 উপলব্ধ কাজগুলি (বিটা):\n\n১. প্রোগ্রামার - $১০০-২০০/ঘণ্টা\n২. ডিজাইনার - $৮০-১৫০/ঘণ্টা\n৩. লেখক - $৫০-১০০/ঘণ্টা\n৪. শিক্ষক - $৬০-১২০/ঘণ্টা\n৫. ডেটা এন্ট্রি - $৪০-৮০/ঘণ্টা\n\nব্যবহার: {pn} start কাজ শুরু করতে",
            stats: "📊 কাজের পরিসংখ্যান:\n\nমোট আয়: ${total}\nসম্পন্ন কাজ: {jobs}\nবর্তমান চাকরি: {current}\nকাজের ধারা: {streak} দিন",
            invalidAction: "❌ ভুল কাজ! ব্যবহার করুন: start, list, stats",
            error: "❌ ত্রুটি: {error}"
        }
    }
};

const jobs = [
    { name: "Programmer", min: 100, max: 200, cooldown: 3600000 },
    { name: "Designer", min: 80, max: 150, cooldown: 3000000 },
    { name: "Writer", min: 50, max: 100, cooldown: 2400000 },
    { name: "Tutor", min: 60, max: 120, cooldown: 2700000 },
    { name: "Data Entry", min: 40, max: 80, cooldown: 1800000 }
];

async function startWork(userId, api, event, message, usersData, getLang) {
    const workDataPath = path.join(__dirname, '..', '..', 'cache', 'work_data.json');
    let workData = {};
    
    if (fs.existsSync(workDataPath)) {
        workData = fs.readJsonSync(workDataPath);
    }
    
    if (!workData[userId]) {
        workData[userId] = {
            lastWork: 0,
            totalEarned: 0,
            jobsCompleted: 0,
            currentJob: null,
            streak: 0
        };
    }
    
    const userWorkData = workData[userId];
    const now = Date.now();
    const cooldownTime = 3600000;
    
    if (now - userWorkData.lastWork < cooldownTime) {
        const remainingTime = cooldownTime - (now - userWorkData.lastWork);
        const minutes = Math.floor(remainingTime / 60000);
        const seconds = Math.floor((remainingTime % 60000) / 1000);
        
        return message.reply(getLang("cooldown", { 
            time: `${minutes}m ${seconds}s` 
        }));
    }
    
    const randomJob = jobs[Math.floor(Math.random() * jobs.length)];
    const earned = Math.floor(Math.random() * (randomJob.max - randomJob.min + 1)) + randomJob.min;
    
    await message.reply(getLang("working", { job: randomJob.name }));
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const userData = await usersData.get(userId);
    const newBalance = (userData.money || 0) + earned;
    
    await usersData.set(userId, { money: newBalance });
    
    userWorkData.lastWork = now;
    userWorkData.totalEarned += earned;
    userWorkData.jobsCompleted += 1;
    userWorkData.currentJob = randomJob.name;
    
    const lastWorkDate = new Date(userWorkData.lastWorkDate || 0);
    const today = new Date();
    
    if (lastWorkDate.toDateString() === today.toDateString()) {
        userWorkData.streak += 1;
    } else {
        userWorkData.streak = 1;
    }
    
    userWorkData.lastWorkDate = now;
    
    fs.writeJsonSync(workDataPath, workData, { spaces: 2 });
    
    return message.reply(getLang("completed", {
        job: randomJob.name,
        earned: earned,
        balance: newBalance
    }));
}

async function listJobs(message, getLang) {
    return message.reply(getLang("jobList"));
}

async function showStats(userId, message, usersData, getLang) {
    const workDataPath = path.join(__dirname, '..', '..', 'cache', 'work_data.json');
    let workData = {};
    
    if (fs.existsSync(workDataPath)) {
        workData = fs.readJsonSync(workDataPath);
    }
    
    const userWorkData = workData[userId] || {
        totalEarned: 0,
        jobsCompleted: 0,
        currentJob: "None",
        streak: 0
    };
    
    return message.reply(getLang("stats", {
        total: userWorkData.totalEarned,
        jobs: userWorkData.jobsCompleted,
        current: userWorkData.currentJob,
        streak: userWorkData.streak
    }));
}