module.exports = {
    config: {
        name: "work",
        version: "2.0",
        author: "RANA",
        role: 0,
        category: "economy",
        shortDescription: {
            en: "Work to earn coins",
            bn: "কয়েন উপার্জন করতে কাজ করুন"
        },
        longDescription: {
            en: "Work at various jobs to earn coins. Different jobs have different pay rates and cooldowns.",
            bn: "বিভিন্ন চাকরিতে কাজ করে কয়েন উপার্জন করুন। বিভিন্ন চাকরির বিভিন্ন বেতন হার এবং কুলডাউন আছে।"
        },
        guide: {
            en: "{pn} [job number]",
            bn: "{pn} [চাকরি নম্বর]"
        },
        cooldown: 30
    },

    onStart: async function({ api, event, args, database }) {
        try {
            const { threadID, messageID, senderID } = event;
            
            if (!database || !database.models) {
                return api.sendMessage(
                    "❌ Database is not available. Please try again later.",
                    threadID,
                    messageID
                );
            }
            
            const User = database.models.User;
            const user = await User.findByPk(senderID);
            
            if (!user) {
                return api.sendMessage(
                    "❌ User not found. Please try another command first.",
                    threadID,
                    messageID
                );
            }
            
            // Check work cooldown
            const workCooldown = 30 * 60 * 1000; // 30 minutes in milliseconds
            const lastWork = user.data?.lastWork || 0;
            const now = Date.now();
            
            if (now - lastWork < workCooldown) {
                const timeLeft = Math.ceil((workCooldown - (now - lastWork)) / 60000); // in minutes
                return api.sendMessage(
                    `⏰ You need to wait ${timeLeft} more minute${timeLeft > 1 ? 's' : ''} before working again.`,
                    threadID,
                    messageID
                );
            }
            
            // Available jobs
            const jobs = [
                {
                    id: 1,
                    name: "👨‍💼 Office Worker",
                    description: "Work in an office doing paperwork",
                    minPay: 50,
                    maxPay: 150,
                    energyCost: 10,
                    successRate: 90
                },
                {
                    id: 2,
                    name: "👨‍🍳 Chef",
                    description: "Cook delicious meals in a restaurant",
                    minPay: 80,
                    maxPay: 200,
                    energyCost: 15,
                    successRate: 85
                },
                {
                    id: 3,
                    name: "👨‍🔧 Mechanic",
                    description: "Fix cars and machinery",
                    minPay: 100,
                    maxPay: 250,
                    energyCost: 20,
                    successRate: 80
                },
                {
                    id: 4,
                    name: "👨‍💻 Programmer",
                    description: "Write code and develop software",
                    minPay: 150,
                    maxPay: 350,
                    energyCost: 25,
                    successRate: 75
                },
                {
                    id: 5,
                    name: "👨‍🚀 Astronaut",
                    description: "Explore space and conduct experiments",
                    minPay: 300,
                    maxPay: 600,
                    energyCost: 40,
                    successRate: 60
                }
            ];
            
            // Show job list if no job specified
            if (args.length === 0) {
                return showJobList(api, threadID, messageID, jobs);
            }
            
            const jobId = parseInt(args[0]);
            
            // Validate job ID
            if (isNaN(jobId) || jobId < 1 || jobId > jobs.length) {
                return api.sendMessage(
                    `❌ Invalid job. Please choose a job between 1 and ${jobs.length}.\n` +
                    `Use "${global.config.prefix}work" to see available jobs.`,
                    threadID,
                    messageID
                );
            }
            
            const selectedJob = jobs[jobId - 1];
            
            // Check if user has enough level for the job
            const requiredLevel = jobId * 2; // Higher jobs require higher levels
            if (user.level < requiredLevel) {
                return api.sendMessage(
                    `❌ You need to be at least level ${requiredLevel} to work as ${selectedJob.name}.\n` +
                    `Your current level: ${user.level}`,
                    threadID,
                    messageID
                );
            }
            
            // Simulate work
            const workResult = simulateWork(selectedJob, user.level);
            
            // Update user data
            const earnings = workResult.earned;
            const expGained = Math.floor(earnings / 10);
            
            user.addMoney(earnings);
            user.addExp(expGained);
            
            // Update last work time
            const userData = user.data || {};
            userData.lastWork = now;
            user.data = userData;
            
            await user.save();
            
            // Send work result
            const message = buildWorkMessage(selectedJob, workResult, earnings, expGained, user);
            
            api.sendMessage(message, threadID, messageID);
            
        } catch (error) {
            console.error(error);
            api.sendMessage(
                "❌ Failed to complete work.",
                event.threadID,
                event.messageID
            );
        }
    }
};

function showJobList(api, threadID, messageID, jobs) {
    let message = `💼 **AVAILABLE JOBS** 💼\n\n`;
    message += `💰 Work to earn coins and experience!\n\n`;
    
    jobs.forEach(job => {
        const avgPay = Math.round((job.minPay + job.maxPay) / 2);
        message += `${job.id}. ${job.name}\n`;
        message += `   📝 ${job.description}\n`;
        message += `   💰 Pay: ${job.minPay}-${job.maxPay} coins (avg: ${avgPay})\n`;
        message += `   ⚡ Energy: ${job.energyCost}\n`;
        message += `   📊 Success Rate: ${job.successRate}%\n`;
        message += `   📈 Min Level: ${job.id * 2}\n\n`;
    });
    
    message += `📝 **Usage:** ${global.config.prefix}work [job number]\n`;
    message += `📌 **Example:** ${global.config.prefix}work 1\n`;
    message += `⏰ **Cooldown:** 30 minutes\n`;
    message += `💡 **Tip:** Higher level jobs pay more but require higher levels!`;
    
    api.sendMessage(message, threadID, messageID);
}

function simulateWork(job, userLevel) {
    const successRate = job.successRate + (userLevel * 0.5); // Level increases success rate
    
    // Determine if work is successful
    const isSuccessful = Math.random() * 100 <= successRate;
    
    if (!isSuccessful) {
        return {
            success: false,
            earned: 0,
            message: getRandomFailMessage(job.name)
        };
    }
    
    // Calculate earnings with level bonus
    const levelBonus = userLevel * 2;
    const minEarn = job.minPay + levelBonus;
    const maxEarn = job.maxPay + levelBonus;
    const earned = Math.floor(Math.random() * (maxEarn - minEarn + 1)) + minEarn;
    
    // Chance for bonus
    let bonus = 0;
    let bonusMessage = "";
    if (Math.random() < 0.1) { // 10% chance for bonus
        bonus = Math.floor(earned * 0.5);
        bonusMessage = getRandomBonusMessage();
    }
    
    const totalEarned = earned + bonus;
    
    return {
        success: true,
        earned: totalEarned,
        baseEarned: earned,
        bonus: bonus,
        message: getRandomSuccessMessage(job.name),
        bonusMessage: bonusMessage
    };
}

function buildWorkMessage(job, result, totalEarned, expGained, user) {
    let message = `💼 **WORK COMPLETE!** 💼\n\n`;
    
    if (result.success) {
        message += `✅ **Successfully worked as ${job.name}!**\n\n`;
        message += `💰 **Earnings:**\n`;
        message += `• Base Pay: ${result.baseEarned} coins\n`;
        
        if (result.bonus > 0) {
            message += `• Bonus: ${result.bonus} coins\n`;
            message += `• ${result.bonusMessage}\n`;
        }
        
        message += `• **Total:** ${totalEarned} coins\n\n`;
        
        message += `📈 **Rewards:**\n`;
        message += `• Coins: +${totalEarned}\n`;
        message += `• Experience: +${expGained}\n\n`;
        
        message += `📊 **Your Stats:**\n`;
        message += `• New Balance: ${user.money} coins\n`;
        message += `• Experience: ${user.exp}/${user.level * 100}\n`;
        message += `• Level: ${user.level}\n\n`;
        
        // Check if leveled up
        const leveledUp = user.exp >= user.level * 100;
        if (leveledUp) {
            message += `🎉 **LEVEL UP!** You are now level ${user.level + 1}!\n\n`;
        }
        
        message += result.message;
        
    } else {
        message += `❌ **Work Failed!**\n\n`;
        message += `You tried to work as ${job.name} but ${result.message}\n\n`;
        message += `😔 Better luck next time!\n\n`;
    }
    
    message += `\n⏰ **Next work available in 30 minutes**\n`;
    message += `💡 **Tip:** Level up to unlock better paying jobs!`;
    
    return message;
}

function getRandomSuccessMessage(job) {
    const messages = [
        `Great work at ${job}! You did an excellent job!`,
        `Excellent performance as ${job}! Keep it up!`,
        `Outstanding work at ${job}! You're a natural!`,
        `Fantastic job as ${job}! Your skills are impressive!`,
        `Superb work at ${job}! You're getting better every day!`
    ];
    return messages[Math.floor(Math.random() * messages.length)];
}

function getRandomFailMessage(job) {
    const messages = [
        `you made a mistake and had to redo your work.`,
        `there was an accident and you had to pay for damages.`,
        `your boss wasn't satisfied with your work.`,
        `you fell asleep on the job.`,
        `there was a misunderstanding with your supervisor.`,
        `the equipment malfunctioned during your shift.`,
        `you got distracted and didn't complete your tasks.`
    ];
    return messages[Math.floor(Math.random() * messages.length)];
}

function getRandomBonusMessage() {
    const messages = [
        "You received a tip from a happy customer!",
        "Your boss gave you a performance bonus!",
        "You found some extra money while cleaning!",
        "You completed an extra task and got rewarded!",
        "You worked overtime and got paid extra!"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
}