const fs = require("fs-extra");
const path = require("path");

module.exports = async function handleReply(api, event) {
    const { body, senderID, threadID, messageID, messageReply } = event;
    
    try {
        // Check if reply is to bot's message
        if (messageReply && messageReply.senderID === api.getCurrentUserID()) {
            await handleBotMessageReply(api, event);
        }
        
        // Check if reply contains commands
        if (body && body.startsWith(global.config?.prefix || "!")) {
            await handleReplyCommand(api, event);
        }
        
        // Handle interactive replies (for games, quizzes, etc.)
        await handleInteractiveReply(api, event);
        
        // Log reply
        await logReply(event);
        
    } catch (error) {
        console.error("Reply handling error:", error);
    }
};

async function handleBotMessageReply(api, event) {
    const { body, senderID, threadID, messageID, messageReply } = event;
    const originalMessage = messageReply.body;
    
    // Load pending interactions
    const pendingPath = path.join(__dirname, "../../cache/pending_interactions.json");
    const pendingInteractions = await fs.readJson(pendingPath).catch(() => ({}));
    
    const interactionKey = `${senderID}_${threadID}_${messageReply.messageID}`;
    const interaction = pendingInteractions[interactionKey];
    
    if (interaction) {
        // Handle the interaction
        await processInteraction(api, event, interaction);
        
        // Remove from pending
        delete pendingInteractions[interactionKey];
        await fs.writeJson(pendingPath, pendingInteractions, { spaces: 2 });
        
        return;
    }
    
    // Check for common bot message patterns
    if (originalMessage.includes("?") || originalMessage.includes(":")) {
        // Bot asked a question or prompted for input
        await handleBotPromptResponse(api, event, originalMessage);
    }
    
    // Check for game responses
    if (originalMessage.includes("game") || originalMessage.includes("play")) {
        await handleGameResponse(api, event, originalMessage);
    }
    
    // Check for quiz responses
    if (originalMessage.includes("quiz") || originalMessage.includes("question")) {
        await handleQuizResponse(api, event, originalMessage);
    }
}

async function handleReplyCommand(api, event) {
    const { body, senderID, threadID, messageID } = event;
    const prefix = global.config?.prefix || "!";
    
    // Extract command from reply
    const args = body.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    
    // Load commands
    const commands = global.commands || {};
    const command = commands[commandName];
    
    if (!command) return;
    
    // Check if command can be used in reply
    if (command.config && command.config.allowReply !== false) {
        await executeReplyCommand(api, event, command, args);
    }
}

async function handleInteractiveReply(api, event) {
    const { body, senderID, threadID, messageID } = event;
    
    // Load interactive sessions
    const sessionsPath = path.join(__dirname, "../../cache/interactive_sessions.json");
    const sessions = await fs.readJson(sessionsPath).catch(() => ({}));
    
    const sessionKey = `${senderID}_${threadID}`;
    const session = sessions[sessionKey];
    
    if (session) {
        await processInteractiveSession(api, event, session);
    }
}

async function handleBotPromptResponse(api, event, originalMessage) {
    const { body, senderID, threadID } = event;
    
    // Common bot prompts and responses
    const prompts = {
        "What's your name?": async () => {
            await api.sendMessage(`My name is ${body}! Nice to meet you!`, threadID);
        },
        "How old are you?": async () => {
            const age = parseInt(body);
            if (!isNaN(age)) {
                await api.sendMessage(`Wow, ${age} years old!`, threadID);
            }
        },
        "Where are you from?": async () => {
            await api.sendMessage(`Cool! ${body} sounds like a nice place!`, threadID);
        },
        "Choose:": async () => {
            await handleChoiceResponse(api, event, originalMessage);
        },
        "Answer:": async () => {
            await handleAnswerResponse(api, event, originalMessage);
        }
    };
    
    for (const [prompt, handler] of Object.entries(prompts)) {
        if (originalMessage.includes(prompt)) {
            await handler();
            break;
        }
    }
}

async function handleGameResponse(api, event, originalMessage) {
    const { body, senderID, threadID } = event;
    
    // Game-specific response handling
    if (originalMessage.includes("Guess the number")) {
        await handleNumberGuess(api, event, body);
    }
    else if (originalMessage.includes("Rock, Paper, Scissors")) {
        await handleRPSResponse(api, event, body);
    }
    else if (originalMessage.includes("Word game")) {
        await handleWordGameResponse(api, event, body);
    }
}

async function handleQuizResponse(api, event, originalMessage) {
    const { body, senderID, threadID } = event;
    
    // Quiz response handling
    const quizPath = path.join(__dirname, "../../cache/active_quizzes.json");
    const quizzes = await fs.readJson(quizPath).catch(() => ({}));
    
    const quizKey = `${senderID}_${threadID}`;
    const quiz = quizzes[quizKey];
    
    if (quiz) {
        await processQuizAnswer(api, event, quiz, body);
    }
}

async function handleChoiceResponse(api, event, originalMessage) {
    const { body, senderID, threadID } = event;
    
    const choices = originalMessage.split('\n').filter(line => 
        line.trim().startsWith("•") || line.trim().startsWith("-")
    );
    
    const selectedChoice = body.trim().toLowerCase();
    
    for (const choice of choices) {
        const choiceText = choice.replace(/[•\-]\s*/, "").toLowerCase();
        if (choiceText.includes(selectedChoice) || selectedChoice.includes(choiceText)) {
            await api.sendMessage(`You chose: ${choiceText}`, threadID);
            break;
        }
    }
}

async function handleAnswerResponse(api, event, originalMessage) {
    const { body, senderID, threadID } = event;
    
    // Extract correct answer from original message
    const answerMatch = originalMessage.match(/Answer:\s*(.*)/i);
    if (!answerMatch) return;
    
    const correctAnswer = answerMatch[1].trim().toLowerCase();
    const userAnswer = body.trim().toLowerCase();
    
    if (userAnswer === correctAnswer) {
        await api.sendMessage("✅ Correct answer!", threadID);
        
        // Give reward
        await giveQuizReward(senderID, threadID);
    } else {
        await api.sendMessage(`❌ Wrong answer. The correct answer was: ${correctAnswer}`, threadID);
    }
}

async function handleNumberGuess(api, event, guess) {
    const { senderID, threadID } = event;
    const guessNum = parseInt(guess);
    
    if (isNaN(guessNum)) {
        await api.sendMessage("Please enter a valid number.", threadID);
        return;
    }
    
    // Load game state
    const gamePath = path.join(__dirname, "../../cache/number_games.json");
    const games = await fs.readJson(gamePath).catch(() => ({}));
    
    const gameKey = `${senderID}_${threadID}`;
    const game = games[gameKey];
    
    if (!game) {
        await api.sendMessage("No active number guessing game found.", threadID);
        return;
    }
    
    const { number, attempts } = game;
    
    if (guessNum === number) {
        await api.sendMessage(
            `🎉 Congratulations! You guessed the number ${number} in ${attempts + 1} attempts!`,
            threadID
        );
        
        // Give reward
        await giveGameReward(senderID, 100);
        
        // Remove game
        delete games[gameKey];
    } else {
        const hint = guessNum < number ? "higher" : "lower";
        await api.sendMessage(
            `Try again! The number is ${hint} than ${guessNum}.`,
            threadID
        );
        
        // Update attempts
        games[gameKey].attempts = attempts + 1;
    }
    
    await fs.writeJson(gamePath, games, { spaces: 2 });
}

async function handleRPSResponse(api, event, choice) {
    const { senderID, threadID } = event;
    
    const choices = ["rock", "paper", "scissors"];
    const userChoice = choice.toLowerCase();
    
    if (!choices.includes(userChoice)) {
        await api.sendMessage("Please choose: rock, paper, or scissors", threadID);
        return;
    }
    
    // Load game state
    const gamePath = path.join(__dirname, "../../cache/rps_games.json");
    const games = await fs.readJson(gamePath).catch(() => ({}));
    
    const gameKey = `${senderID}_${threadID}`;
    const game = games[gameKey];
    
    if (!game) {
        await api.sendMessage("No active Rock Paper Scissors game found.", threadID);
        return;
    }
    
    // Bot's choice
    const botChoice = choices[Math.floor(Math.random() * choices.length)];
    
    // Determine winner
    let result;
    if (userChoice === botChoice) {
        result = "It's a tie!";
    } else if (
        (userChoice === "rock" && botChoice === "scissors") ||
        (userChoice === "paper" && botChoice === "rock") ||
        (userChoice === "scissors" && botChoice === "paper")
    ) {
        result = "You win! 🎉";
        await giveGameReward(senderID, 50);
    } else {
        result = "I win! 😎";
    }
    
    await api.sendMessage(
        `You chose: ${userChoice}\n` +
        `I chose: ${botChoice}\n` +
        `Result: ${result}`,
        threadID
    );
    
    // Remove game
    delete games[gameKey];
    await fs.writeJson(gamePath, games, { spaces: 2 });
}

async function handleWordGameResponse(api, event, word) {
    const { senderID, threadID } = event;
    
    // Word game logic here
    // This is a placeholder for word-based games
    
    await api.sendMessage(`You said: "${word}"`, threadID);
}

async function processInteraction(api, event, interaction) {
    const { body, senderID, threadID } = event;
    const { type, data, callback } = interaction;
    
    try {
        if (typeof callback === "function") {
            await callback(body, event);
        }
    } catch (error) {
        console.error("Interaction processing error:", error);
        await api.sendMessage("❌ Error processing your response.", threadID);
    }
}

async function executeReplyCommand(api, event, command, args) {
    const { senderID, threadID, messageID } = event;
    
    try {
        // Execute command with reply context
        if (typeof command.onReply === "function") {
            await command.onReply({ api, event, args });
        } else if (typeof command.run === "function") {
            await command.run({ api, event, args });
        }
    } catch (error) {
        console.error("Reply command execution error:", error);
        await api.sendMessage(
            `❌ Error executing command in reply: ${error.message}`,
            threadID
        );
    }
}

async function processInteractiveSession(api, event, session) {
    const { body, senderID, threadID } = event;
    const { step, data, callback } = session;
    
    try {
        if (typeof callback === "function") {
            const result = await callback(body, session);
            
            if (result && result.nextStep) {
                // Update session
                const sessionsPath = path.join(__dirname, "../../cache/interactive_sessions.json");
                const sessions = await fs.readJson(sessionsPath).catch(() => ({}));
                
                const sessionKey = `${senderID}_${threadID}`;
                sessions[sessionKey] = {
                    ...session,
                    step: result.nextStep,
                    data: { ...session.data, ...result.data }
                };
                
                await fs.writeJson(sessionsPath, sessions, { spaces: 2 });
            } else {
                // End session
                await endInteractiveSession(senderID, threadID);
            }
        }
    } catch (error) {
        console.error("Interactive session processing error:", error);
        await api.sendMessage("❌ Error processing your response.", threadID);
        await endInteractiveSession(senderID, threadID);
    }
}

async function processQuizAnswer(api, event, quiz, answer) {
    const { senderID, threadID } = event;
    const { question, correctAnswer, reward } = quiz;
    
    if (answer.trim().toLowerCase() === correctAnswer.toLowerCase()) {
        await api.sendMessage("✅ Correct answer!", threadID);
        
        // Give reward
        if (reward) {
            await giveQuizReward(senderID, threadID, reward);
        }
    } else {
        await api.sendMessage(`❌ Wrong answer. The correct answer was: ${correctAnswer}`, threadID);
    }
    
    // Remove quiz
    const quizPath = path.join(__dirname, "../../cache/active_quizzes.json");
    const quizzes = await fs.readJson(quizPath).catch(() => ({}));
    
    const quizKey = `${senderID}_${threadID}`;
    delete quizzes[quizKey];
    
    await fs.writeJson(quizPath, quizzes, { spaces: 2 });
}

async function giveQuizReward(userID, threadID, amount = 50) {
    try {
        if (!global.db) return;
        
        await global.db.run(`
            UPDATE users SET money = money + ? WHERE user_id = ?
        `, [amount, userID]);
        
        // Log transaction
        await global.db.run(`
            INSERT INTO economy (user_id, transaction_type, amount, description) 
            VALUES (?, ?, ?, ?)
        `, [userID, "quiz_reward", amount, "Quiz reward"]);
        
    } catch (error) {
        console.error("Error giving quiz reward:", error);
    }
}

async function giveGameReward(userID, amount) {
    try {
        if (!global.db) return;
        
        await global.db.run(`
            UPDATE users SET money = money + ? WHERE user_id = ?
        `, [amount, userID]);
        
        // Log transaction
        await global.db.run(`
            INSERT INTO economy (user_id, transaction_type, amount, description) 
            VALUES (?, ?, ?, ?)
        `, [userID, "game_reward", amount, "Game reward"]);
        
    } catch (error) {
        console.error("Error giving game reward:", error);
    }
}

async function endInteractiveSession(userID, threadID) {
    try {
        const sessionsPath = path.join(__dirname, "../../cache/interactive_sessions.json");
        const sessions = await fs.readJson(sessionsPath).catch(() => ({}));
        
        const sessionKey = `${userID}_${threadID}`;
        delete sessions[sessionKey];
        
        await fs.writeJson(sessionsPath, sessions, { spaces: 2 });
        
    } catch (error) {
        console.error("Error ending interactive session:", error);
    }
}

async function logReply(event) {
    try {
        const { body, senderID, threadID, messageID, messageReply } = event;
        
        const logData = {
            type: "reply",
            userID: senderID,
            threadID,
            messageID,
            replyToID: messageReply?.messageID,
            replyToUser: messageReply?.senderID,
            message: body,
            timestamp: new Date().toISOString()
        };
        
        const logPath = path.join(__dirname, "../../logs/replies.json");
        const logs = await fs.readJson(logPath).catch(() => []);
        
        logs.push(logData);
        
        // Keep only last 1000 logs
        if (logs.length > 1000) {
            logs.splice(0, logs.length - 1000);
        }
        
        await fs.writeJson(logPath, logs, { spaces: 2 });
        
    } catch (error) {
        console.error("Error logging reply:", error);
    }
}

// Register an interaction
module.exports.registerInteraction = async function(userID, threadID, messageID, type, data, callback, timeout = 30000) {
    try {
        const pendingPath = path.join(__dirname, "../../cache/pending_interactions.json");
        const pendingInteractions = await fs.readJson(pendingPath).catch(() => ({}));
        
        const interactionKey = `${userID}_${threadID}_${messageID}`;
        
        pendingInteractions[interactionKey] = {
            type,
            data,
            callback,
            timestamp: Date.now(),
            expires: Date.now() + timeout
        };
        
        await fs.writeJson(pendingPath, pendingInteractions, { spaces: 2 });
        
        // Clean up after timeout
        setTimeout(async () => {
            const currentInteractions = await fs.readJson(pendingPath).catch(() => ({}));
            if (currentInteractions[interactionKey]) {
                delete currentInteractions[interactionKey];
                await fs.writeJson(pendingPath, currentInteractions, { spaces: 2 });
            }
        }, timeout);
        
    } catch (error) {
        console.error("Error registering interaction:", error);
    }
};

// Start an interactive session
module.exports.startInteractiveSession = async function(userID, threadID, step, data, callback) {
    try {
        const sessionsPath = path.join(__dirname, "../../cache/interactive_sessions.json");
        const sessions = await fs.readJson(sessionsPath).catch(() => ({}));
        
        const sessionKey = `${userID}_${threadID}`;
        
        sessions[sessionKey] = {
            step,
            data,
            callback,
            startedAt: Date.now(),
            lastActivity: Date.now()
        };
        
        await fs.writeJson(sessionsPath, sessions, { spaces: 2 });
        
    } catch (error) {
        console.error("Error starting interactive session:", error);
    }
};

// Clean up expired interactions and sessions
module.exports.cleanupExpired = async function() {
    try {
        const now = Date.now();
        
        // Clean up pending interactions
        const pendingPath = path.join(__dirname, "../../cache/pending_interactions.json");
        const pendingInteractions = await fs.readJson(pendingPath).catch(() => ({}));
        
        let pendingCleaned = 0;
        for (const [key, interaction] of Object.entries(pendingInteractions)) {
            if (interaction.expires < now) {
                delete pendingInteractions[key];
                pendingCleaned++;
            }
        }
        
        if (pendingCleaned > 0) {
            await fs.writeJson(pendingPath, pendingInteractions, { spaces: 2 });
            console.log(`Cleaned up ${pendingCleaned} expired interactions`);
        }
        
        // Clean up old sessions (inactive for 30 minutes)
        const sessionsPath = path.join(__dirname, "../../cache/interactive_sessions.json");
        const sessions = await fs.readJson(sessionsPath).catch(() => ({}));
        
        let sessionsCleaned = 0;
        for (const [key, session] of Object.entries(sessions)) {
            if (session.lastActivity < now - 30 * 60 * 1000) {
                delete sessions[key];
                sessionsCleaned++;
            }
        }
        
        if (sessionsCleaned > 0) {
            await fs.writeJson(sessionsPath, sessions, { spaces: 2 });
            console.log(`Cleaned up ${sessionsCleaned} inactive sessions`);
        }
        
    } catch (error) {
        console.error("Error cleaning up expired data:", error);
    }
};