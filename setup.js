const fs = require("fs-extra");
const path = require("path");
const readline = require("readline");
const { exec } = require("child_process");
const chalk = require("chalk");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(chalk.cyan.bold("🎯 YOUR CRUSH BOT SETUP WIZARD"));
console.log(chalk.cyan("===================================\n"));

const questions = [
  "Facebook Email: ",
  "Facebook Password: ",
  "Bot Prefix (default: !): ",
  "Your Facebook ID (for admin): ",
  "Language (bn/en/vi): ",
  "Timezone (default: Asia/Dhaka): ",
  "OpenAI API Key (optional): ",
  "Google API Key (optional): "
];

const answers = {};

function askQuestion(i) {
  if (i < questions.length) {
    rl.question(chalk.yellow(questions[i]), (answer) => {
      answers[i] = answer || getDefaultAnswer(i);
      askQuestion(i + 1);
    });
  } else {
    createConfig();
    rl.close();
  }
}

function getDefaultAnswer(index) {
  const defaults = ["", "", "!", "", "bn", "Asia/Dhaka", "", ""];
  return defaults[index];
}

function createConfig() {
  console.log(chalk.green("\n📝 Creating configuration files..."));
  
  // Create config.json
  const config = {
    developmentMode: false,
    autoRestart: false,
    restartInterval: 60,
    admins: [answers[3] || "61578706761898"],
    adminOnly: false,
    approveThreads: true,
    approveTimeout: 10,
    prefix: answers[2] || "!",
    language: answers[4] || "bn",
    timezone: answers[5] || "Asia/Dhaka",
    maxUploadSize: 26214400,
    
    apiConfig: {
      openai: answers[6] || "",
      gemini: answers[7] || "",
      antifb: "",
      imgbb: "",
      tenor: "",
      unsplash: ""
    },
    
    botInfo: {
      name: "𝗬𝗢𝗨𝗥 𝗖𝗥𝗨𝗦𝗛 ⟵𝗼_𝟬",
      version: "2.0.0",
      author: "𝗥𝗔𝗡𝗔 (𝗠𝗔𝗦𝗧𝗘𝗥 🪓)",
      contact: {
        email: "ranaeditz333@gmail.com",
        telegram: "@rana_editz_00",
        phone: "01847634486"
      }
    }
  };
  
  fs.writeFileSync("config.json", JSON.stringify(config, null, 2));
  console.log(chalk.green("✅ config.json created"));
  
  // Create .env file
  const envContent = `FACEBOOK_EMAIL=${answers[0]}
FACEBOOK_PASSWORD=${answers[1]}
BOT_PREFIX=${answers[2] || "!"}
ADMIN_ID=${answers[3] || "61578706761898"}
LANGUAGE=${answers[4] || "bn"}
TIMEZONE=${answers[5] || "Asia/Dhaka"}
OPENAI_API_KEY=${answers[6] || ""}
GOOGLE_API_KEY=${answers[7] || ""}`;
  
  fs.writeFileSync(".env", envContent);
  console.log(chalk.green("✅ .env file created"));
  
  // Create necessary directories
  const dirs = [
    "cache",
    "cache/canvas", 
    "cache/rankup",
    "Script/commands",
    "Script/events",
    "Script/noprefix",
    "includes",
    "includes/database",
    "includes/controllers",
    "includes/handle",
    "languages",
    "utils",
    "logs",
    "backups"
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(chalk.blue(`📁 Created: ${dir}`));
    }
  });
  
  // Create empty appstate.json
  fs.writeFileSync("appstate.json", "[]");
  console.log(chalk.green("✅ appstate.json created"));
  
  // Create README.md
  const readmeContent = `# 🎯 YOUR CRUSH BOT

Advanced Facebook Messenger Bot with 300+ commands.

## 📦 Installation

1. Install Node.js (v16 or higher)
2. Run: \`npm install\`
3. Run: \`npm run setup\`
4. Edit \`config.json\` with your credentials
5. Run: \`npm start\`

## ⚙️ Configuration

- Bot Prefix: ${answers[2] || "!"}
- Language: ${answers[4] || "bn"}
- Admin ID: ${answers[3] || "61578706761898"}

## 📁 Project Structure

\`\`\`
YOUR_CRUSH/
├── Master.js              # Main entry point
├── config.json           # Configuration
├── appstate.json         # Login session
├── package.json          # Dependencies
├── Script/               # Commands & Events
├── includes/             # Core modules
├── languages/            # Language files
├── utils/                # Utilities
├── cache/               # Temporary files
└── logs/                # Log files
\`\`\`

## 👨‍💻 Developer

**RANA (MASTER 🪓)**
- 📧 Email: ranaeditz333@gmail.com
- 📱 Phone: 01847634486
- 📱 Telegram: @rana_editz_00
- 🌍 Location: Faridpur, Dhaka, Bangladesh

## ⚠️ Disclaimer

This bot is for educational purposes only. Use at your own risk.

## 📄 License

MIT License - See LICENSE file for details
`;

  fs.writeFileSync("README.md", readmeContent);
  console.log(chalk.green("✅ README.md created"));
  
  console.log(chalk.green.bold("\n✅ Setup completed successfully!"));
  console.log(chalk.yellow("\n📝 Next steps:"));
  console.log(chalk.yellow("1. Edit config.json with your API keys"));
  console.log(chalk.yellow("2. Run: npm install"));
  console.log(chalk.yellow("3. Run: npm start"));
  console.log(chalk.yellow("\n🎯 Enjoy using YOUR CRUSH BOT!"));
  
  // Ask to install dependencies
  rl.question(chalk.cyan("\nInstall dependencies now? (y/n): "), (answer) => {
    if (answer.toLowerCase() === 'y') {
      console.log(chalk.yellow("📦 Installing dependencies..."));
      exec("npm install", (error, stdout, stderr) => {
        if (error) {
          console.error(chalk.red("❌ Error installing dependencies:"), error);
        } else {
          console.log(chalk.green("✅ Dependencies installed successfully!"));
        }
        process.exit(0);
      });
    } else {
      console.log(chalk.yellow("⚠️  Remember to run 'npm install' before starting the bot"));
      process.exit(0);
    }
  });
}

// Start setup
askQuestion(0);