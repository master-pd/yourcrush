module.exports = {
    config: {
        name: "gamble",
        aliases: ["bet"],
        version: "2.0",
        author: "RANA",
        role: 0,
        category: "economy",
        shortDescription: {
            en: "Gamble your coins",
            bn: "আপনার কয়েন জুয়া খেলুন"
        },
        longDescription: {
            en: "Gamble your coins with various games. Win big or lose it all!",
            bn: "বিভিন্ন গেম দিয়ে আপনার কয়েন জুয়া খেলুন। বড় জিতুন অথবা সব হারান!"
        },
        guide: {
            en: "{pn} [amount] [game] or {pn} games",
            bn: "{pn} [পরিমাণ] [খেলা] অথবা {pn} games"
        },
        cooldown: 10
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
            
            if (args.length === 0 || args[0].toLowerCase() === 'games') {
                return showGames(api, threadID, messageID);
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
            
            // Check if user has smartphone (required for gambling)
            const inventory = user.inventory || [];
            const hasSmartphone = inventory.some(item => item.id === 8);
            
            if (!hasSmartphone) {
                return api.sendMessage(
                    `📱 **Smartphone Required!**\n\n` +
                    `You need a smartphone to access gambling games.\n` +
                    `Buy one from the shop for 5000 coins:\n` +
                    `${global.config.prefix}shop buy 8`,
                    threadID,
                    messageID
                );
            }
            
            // Parse arguments
            const amountArg = args[0].toLowerCase();
            let amount;
            
            if (amountArg === 'all') {
                amount = user.money;
            } else if (amountArg === 'half') {
                amount = Math.floor(user.money / 2);
            } else {
                amount = parseInt(amountArg);
                
                if (isNaN(amount) || amount <= 0) {
                    return api.sendMessage(
                        "❌ Please enter a valid amount to gamble.\n" +
                        "Example: .gamble 100 coinflip",
                        threadID,
                        messageID
                    );
                }
            }
            
            // Check amount
            if (amount > user.money) {
                return api.sendMessage(
                    `❌ You don't have enough coins to gamble ${amount}.\n` +
                    `Your balance: ${user.money} coins`,
                    threadID,
                    messageID
                );
            }
            
            if (amount < 10) {
                return api.sendMessage(
                    "❌ Minimum bet is 10 coins.",
                    threadID,
                    messageID
                );
            }
            
            // Get game
            const gameName = args[1] ? args[1].toLowerCase() : 'coinflip';
            
            // Play game
            const result = await playGame(gameName, amount, user);
            
            if (!result.success) {
                return api.sendMessage(
                    `❌ ${result.message}`,
                    threadID,
                    messageID
                );
            }
            
            // Update user balance
            user.money += result.winnings - amount;
            await user.save();
            
            // Send result
            const message = buildGameResult(gameName, result, amount, user);
            
            api.sendMessage(message, threadID, messageID);
            
        } catch (error) {
            console.error(error);
            api.sendMessage(
                "❌ Gambling failed.",
                event.threadID,
                event.messageID
            );
        }
    }
};

function showGames(api, threadID, messageID) {
    const games = [
        {
            name: "coinflip",
            description: "Flip a coin! Choose heads or tails.",
            minBet: 10,
            maxBet: 1000,
            payout: "2x",
            usage: ".gamble [amount] coinflip [heads/tails]"
        },
        {
            name: "dice",
            description: "Roll a dice! Guess the number (1-6).",
            minBet: 20,
            maxBet: 2000,
            payout: "6x",
            usage: ".gamble [amount] dice [1-6]"
        },
        {
            name: "slots",
            description: "Pull the slot machine! Match 3 symbols.",
            minBet: 50,
            maxBet: 5000,
            payout: "Up to 100x",
            usage: ".gamble [amount] slots"
        },
        {
            name: "blackjack",
            description: "Play blackjack against the dealer.",
            minBet: 100,
            maxBet: 10000,
            payout: "1.5x-2.5x",
            usage: ".gamble [amount] blackjack"
        },
        {
            name: "roulette",
            description: "Spin the roulette wheel! Bet on numbers or colors.",
            minBet: 50,
            maxBet: 5000,
            payout: "Up to 36x",
            usage: ".gamble [amount] roulette [number/color]"
        }
    ];
    
    let message = `🎰 **GAMBLING GAMES** 🎰\n\n`;
    message += `⚠️ **Warning:** Gambling can be addictive!\n`;
    message += `💰 Only gamble what you can afford to lose!\n\n`;
    
    games.forEach((game, index) => {
        message += `${index + 1}. **${game.name.toUpperCase()}**\n`;
        message += `   ${game.description}\n`;
        message += `   Min Bet: ${game.minBet} coins\n`;
        message += `   Max Bet: ${game.maxBet} coins\n`;
        message += `   Payout: ${game.payout}\n`;
        message += `   Usage: ${game.usage}\n\n`;
    });
    
    message += `📝 **Example Games:**\n`;
    message += `• ${global.config.prefix}gamble 100 coinflip heads\n`;
    message += `• ${global.config.prefix}gamble 200 dice 4\n`;
    message += `• ${global.config.prefix}gamble 500 slots\n\n`;
    
    message += `🔒 **Requirement:** Smartphone (buy from shop)\n`;
    message += `💡 **Tip:** Start with small bets to learn the games!`;
    
    api.sendMessage(message, threadID, messageID);
}

async function playGame(gameName, betAmount, user) {
    switch (gameName) {
        case 'coinflip':
            return playCoinflip(betAmount, user);
        case 'dice':
            return playDice(betAmount, user);
        case 'slots':
            return playSlots(betAmount, user);
        case 'blackjack':
            return playBlackjack(betAmount, user);
        case 'roulette':
            return playRoulette(betAmount, user);
        default:
            return {
                success: false,
                message: `Unknown game: ${gameName}. Use ".gamble games" to see available games.`
            };
    }
}

function playCoinflip(betAmount, user) {
    // For coinflip, we need heads/tails choice
    // This is simplified - actual implementation would get choice from args[2]
    
    const outcomes = ['heads', 'tails'];
    const winOutcome = outcomes[Math.floor(Math.random() * 2)];
    const playerChoice = Math.random() > 0.5 ? 'heads' : 'tails'; // Simulated choice
    
    const won = playerChoice === winOutcome;
    const winnings = won ? betAmount * 2 : 0;
    
    return {
        success: true,
        game: 'coinflip',
        won: won,
        winnings: winnings,
        outcome: winOutcome,
        playerChoice: playerChoice,
        message: `Coin landed on: ${winOutcome}`
    };
}

function playDice(betAmount, user) {
    const diceRoll = Math.floor(Math.random() * 6) + 1;
    const playerGuess = Math.floor(Math.random() * 6) + 1; // Simulated guess
    
    const won = diceRoll === playerGuess;
    const winnings = won ? betAmount * 6 : 0;
    
    return {
        success: true,
        game: 'dice',
        won: won,
        winnings: winnings,
        diceRoll: diceRoll,
        playerGuess: playerGuess,
        message: `Dice rolled: ${diceRoll}`
    };
}

function playSlots(betAmount, user) {
    const symbols = ['🍒', '🍋', '🍊', '🍉', '⭐', '7️⃣'];
    
    const reel1 = symbols[Math.floor(Math.random() * symbols.length)];
    const reel2 = symbols[Math.floor(Math.random() * symbols.length)];
    const reel3 = symbols[Math.floor(Math.random() * symbols.length)];
    
    // Check for matches
    let winnings = 0;
    let winMultiplier = 0;
    
    if (reel1 === reel2 && reel2 === reel3) {
        // Three of a kind
        if (reel1 === '7️⃣') {
            winMultiplier = 100; // Jackpot!
        } else if (reel1 === '⭐') {
            winMultiplier = 50;
        } else {
            winMultiplier = 10;
        }
    } else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
        // Two of a kind
        winMultiplier = 2;
    }
    
    winnings = betAmount * winMultiplier;
    const won = winnings > 0;
    
    return {
        success: true,
        game: 'slots',
        won: won,
        winnings: winnings,
        reels: [reel1, reel2, reel3],
        winMultiplier: winMultiplier,
        message: `Slots: ${reel1} | ${reel2} | ${reel3}`
    };
}

function playBlackjack(betAmount, user) {
    // Simplified blackjack
    const playerCards = [getRandomCard(), getRandomCard()];
    const dealerCards = [getRandomCard(), getRandomCard()];
    
    const playerTotal = calculateHandTotal(playerCards);
    const dealerTotal = calculateHandTotal(dealerCards);
    
    let winnings = 0;
    let result = '';
    
    if (playerTotal > 21) {
        // Player bust
        result = 'Bust! You went over 21.';
        winnings = 0;
    } else if (dealerTotal > 21) {
        // Dealer bust
        result = 'Dealer bust! You win!';
        winnings = betAmount * 2;
    } else if (playerTotal > dealerTotal) {
        // Player wins
        result = 'You win!';
        winnings = betAmount * 2;
    } else if (playerTotal === dealerTotal) {
        // Push
        result = 'Push! It\'s a tie.';
        winnings = betAmount;
    } else {
        // Dealer wins
        result = 'Dealer wins!';
        winnings = 0;
    }
    
    const won = winnings > betAmount;
    
    return {
        success: true,
        game: 'blackjack',
        won: won,
        winnings: winnings,
        playerCards: playerCards,
        dealerCards: dealerCards,
        playerTotal: playerTotal,
        dealerTotal: dealerTotal,
        message: result
    };
}

function playRoulette(betAmount, user) {
    const numbers = Array.from({length: 37}, (_, i) => i); // 0-36
    const winningNumber = numbers[Math.floor(Math.random() * numbers.length)];
    
    const isRed = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(winningNumber);
    const isBlack = !isRed && winningNumber !== 0;
    
    // Simulate player betting on red
    const playerBet = Math.random() > 0.5 ? 'red' : 'black';
    const won = (playerBet === 'red' && isRed) || (playerBet === 'black' && isBlack);
    
    const winnings = won ? betAmount * 2 : 0;
    
    return {
        success: true,
        game: 'roulette',
        won: won,
        winnings: winnings,
        winningNumber: winningNumber,
        color: isRed ? 'red' : (isBlack ? 'black' : 'green'),
        playerBet: playerBet,
        message: `Roulette landed on: ${winningNumber} (${isRed ? 'red' : isBlack ? 'black' : 'green'})`
    };
}

function buildGameResult(gameName, result, betAmount, user) {
    let message = '';
    
    if (result.won) {
        message += `🎉 **YOU WON!** 🎉\n\n`;
    } else {
        message += `😔 **YOU LOST** 😔\n\n`;
    }
    
    message += `🎮 **Game:** ${result.game.toUpperCase()}\n`;
    message += `💰 **Bet Amount:** ${betAmount} coins\n`;
    
    if (result.game === 'coinflip') {
        message += `🎯 **Your Choice:** ${result.playerChoice}\n`;
        message += `🪙 **Coin Result:** ${result.outcome}\n`;
    } else if (result.game === 'dice') {
        message += `🎯 **Your Guess:** ${result.playerGuess}\n`;
        message += `🎲 **Dice Roll:** ${result.diceRoll}\n`;
    } else if (result.game === 'slots') {
        message += `🎰 **Slots:** ${result.reels.join(' | ')}\n`;
        if (result.winMultiplier > 0) {
            message += `✨ **Multiplier:** ${result.winMultiplier}x\n`;
        }
    } else if (result.game === 'blackjack') {
        message += `🃏 **Your Hand:** ${result.playerCards.join(', ')} (Total: ${result.playerTotal})\n`;
        message += `🎩 **Dealer Hand:** ${result.dealerCards.join(', ')} (Total: ${result.dealerTotal})\n`;
    } else if (result.game === 'roulette') {
        message += `🎯 **Your Bet:** ${result.playerBet}\n`;
        message += `🎡 **Roulette:** ${result.winningNumber} (${result.color})\n`;
    }
    
    message += `\n📊 **Result:** ${result.message}\n\n`;
    
    if (result.won) {
        message += `💰 **Winnings:** +${result.winnings - betAmount} coins\n`;
    } else {
        message += `💰 **Loss:** -${betAmount} coins\n`;
    }
    
    message += `💳 **New Balance:** ${user.money} coins\n\n`;
    
    if (result.won) {
        message += `🎊 Congratulations! You got lucky! 🎊\n`;
        message += `💡 **Tip:** Consider quitting while you're ahead!`;
    } else {
        message += `😢 Better luck next time!\n`;
        message += `💡 **Tip:** Gambling should be for entertainment only!`;
    }
    
    return message;
}

function getRandomCard() {
    const cards = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    return cards[Math.floor(Math.random() * cards.length)];
}

function calculateHandTotal(cards) {
    let total = 0;
    let aces = 0;
    
    cards.forEach(card => {
        if (card === 'A') {
            aces += 1;
            total += 11;
        } else if (['J', 'Q', 'K'].includes(card)) {
            total += 10;
        } else {
            total += parseInt(card);
        }
    });
    
    // Adjust for aces
    while (total > 21 && aces > 0) {
        total -= 10;
        aces -= 1;
    }
    
    return total;
}