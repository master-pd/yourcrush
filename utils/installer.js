const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const chalk = require('chalk');
const axios = require('axios');

class AutoInstaller {
    constructor() {
        this.dependencies = [
            'fca-unofficial',
            'axios',
            'fs-extra',
            'moment-timezone',
            'chalk',
            'jimp',
            'sqlite3',
            'node-cron',
            'form-data',
            'cheerio',
            'ytdl-core',
            'google-it',
            'translate-google',
            'lyrics-finder',
            'qrcode',
            'crypto-js',
            'random',
            'figlet',
            'weather-js'
        ];

        this.devDependencies = [
            'nodemon'
        ];

        this.utils = require('./index');
        this.logger = require('./log');
    }

    async checkNodeVersion() {
        try {
            const { stdout } = await execPromise('node --version');
            const version = stdout.trim().replace('v', '');
            const majorVersion = parseInt(version.split('.')[0]);

            console.log(chalk.blue(`📦 Node.js version: ${version}`));

            if (majorVersion < 16) {
                console.log(chalk.red('❌ Node.js version 16 or higher is required'));
                console.log(chalk.yellow('👉 Please update Node.js from: https://nodejs.org'));
                return false;
            }

            return true;
        } catch (error) {
            console.log(chalk.red('❌ Node.js is not installed'));
            console.log(chalk.yellow('👉 Please install Node.js from: https://nodejs.org'));
            return false;
        }
    }

    async checkNpmVersion() {
        try {
            const { stdout } = await execPromise('npm --version');
            console.log(chalk.blue(`📦 npm version: ${stdout.trim()}`));
            return true;
        } catch (error) {
            console.log(chalk.red('❌ npm is not installed'));
            return false;
        }
    }

    async checkInternetConnection() {
        try {
            await axios.get('https://www.google.com', { timeout: 5000 });
            return true;
        } catch (error) {
            console.log(chalk.red('❌ No internet connection'));
            return false;
        }
    }

    async createPackageJson() {
        const packageJson = {
            name: "your-crush-bot",
            version: "2.0.0",
            description: "Advanced Facebook Messenger Bot",
            main: "Master.js",
            scripts: {
                start: "node Master.js",
                setup: "npm install && node setup.js",
                dev: "nodemon Master.js",
                login: "node login.js",
                backup: "node utils/backup.js",
                test: "node test.js"
            },
            keywords: ["facebook", "bot", "messenger", "chatbot"],
            author: "RANA (MASTER 🪓)",
            license: "MIT",
            dependencies: {},
            devDependencies: {}
        };

        // Add dependencies
        this.dependencies.forEach(dep => {
            packageJson.dependencies[dep] = "latest";
        });

        this.devDependencies.forEach(dep => {
            packageJson.devDependencies[dep] = "latest";
        });

        packageJson.engines = {
            node: ">=16.0.0",
            npm: ">=7.0.0"
        };

        await fs.writeJson('package.json', packageJson, { spaces: 2 });
        console.log(chalk.green('✅ package.json created'));
    }

    async installDependencies() {
        console.log(chalk.yellow('📦 Installing dependencies...'));

        try {
            // Install production dependencies
            console.log(chalk.blue('Installing production dependencies...'));
            await execPromise('npm install --save ' + this.dependencies.join(' '));

            // Install dev dependencies
            console.log(chalk.blue('Installing development dependencies...'));
            await execPromise('npm install --save-dev ' + this.devDependencies.join(' '));

            console.log(chalk.green('✅ All dependencies installed successfully!'));
            return true;
        } catch (error) {
            console.log(chalk.red('❌ Error installing dependencies:'));
            console.error(error);
            return false;
        }
    }

    async createProjectStructure() {
        console.log(chalk.yellow('📁 Creating project structure...'));

        const directories = [
            'cache',
            'cache/canvas',
            'cache/rankup',
            'Script/commands',
            'Script/events',
            'Script/noprefix',
            'includes/database',
            'includes/controllers',
            'includes/handle',
            'languages',
            'utils',
            'logs',
            'backups',
            'templates'
        ];

        for (const dir of directories) {
            const dirPath = path.join(__dirname, '..', dir);
            if (!fs.existsSync(dirPath)) {
                await fs.mkdir(dirPath, { recursive: true });
                console.log(chalk.blue(`📁 Created: ${dir}`));
            }
        }

        // Create empty files
        const files = [
            'config.json',
            'appstate.json',
            'Master.js',
            'setup.js',
            'login.js',
            'README.md',
            '.gitignore',
            '.env.example'
        ];

        for (const file of files) {
            const filePath = path.join(__dirname, '..', file);
            if (!fs.existsSync(filePath)) {
                await fs.writeFile(filePath, '');
                console.log(chalk.blue(`📄 Created: ${file}`));
            }
        }

        console.log(chalk.green('✅ Project structure created'));
    }

    async createSampleCommands() {
        console.log(chalk.yellow('📝 Creating sample commands...'));

        const commandsDir = path.join(__dirname, '../Script/commands');

        // Sample ping command
        const pingCommand = `module.exports = {
    config: {
        name: "ping",
        version: "1.0.0",
        author: "RANA",
        description: "Check bot latency",
        category: "utility"
    },
    
    onStart: async function({ api, event, args }) {
        const startTime = Date.now();
        
        await api.sendMessage("🏓 Pong!", event.threadID, (err) => {
            if (err) return;
            
            const latency = Date.now() - startTime;
            api.sendMessage(\`🚀 Bot latency: \${latency}ms\\n⏰ Uptime: \${require('../../utils/index').formatDuration(Date.now() - global.startTime)}\`, event.threadID);
        });
    }
};`;

        await fs.writeFile(path.join(commandsDir, 'ping.js'), pingCommand);

        // Sample help command
        const helpCommand = `module.exports = {
    config: {
        name: "help",
        version: "1.0.0",
        author: "RANA",
        description: "Show all commands",
        category: "utility",
        aliases: ["commands", "menu"]
    },
    
    onStart: async function({ api, event, args }) {
        const commands = global.commands || {};
        const prefix = global.config?.prefix || '!';
        
        let message = "🎯 *YOUR CRUSH BOT COMMANDS*\\n\\n";
        
        // Group commands by category
        const categories = {};
        
        for (const [name, cmd] of Object.entries(commands)) {
            if (cmd.config) {
                const category = cmd.config.category || 'general';
                if (!categories[category]) categories[category] = [];
                categories[category].push(\`\${prefix}\${name}\`);
            }
        }
        
        for (const [category, cmdList] of Object.entries(categories)) {
            message += \`*${category.toUpperCase()}*\\n\`;
            message += \`\${cmdList.join(', ')}\\n\\n\`;
        }
        
        message += \`\\nTotal commands: \${Object.keys(commands).length}\\n\`;
        message += \`Prefix: \${prefix}\\n\`;
        message += \`👑 Owner: RANA (MASTER 🪓)\\n\`;
        message += \`📞 Contact: 01847634486\`;
        
        api.sendMessage(message, event.threadID);
    }
};`;

        await fs.writeFile(path.join(commandsDir, 'help.js'), helpCommand);

        console.log(chalk.green('✅ Sample commands created'));
    }

    async createConfigTemplate() {
        console.log(chalk.yellow('⚙️ Creating config template...'));

        const configTemplate = {
            developmentMode: false,
            autoRestart: false,
            restartInterval: 60,
            admins: ["61578706761898"],
            adminOnly: false,
            approveThreads: true,
            approveTimeout: 10,
            prefix: "!",
            language: "bn",
            timezone: "Asia/Dhaka",
            maxUploadSize: 26214400,
            
            apiConfig: {
                openai: "",
                gemini: "",
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

        await fs.writeJson(path.join(__dirname, '../config.json'), configTemplate, { spaces: 2 });
        console.log(chalk.green('✅ config.json template created'));
    }

    async createGitIgnore() {
        const gitignoreContent = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Directory for instrumented libs generated by jscoverage/JSCover
lib-cov

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Grunt intermediate storage (https://gruntjs.com/creating-plugins#storing-task-files)
.grunt

# Bower dependency directory (https://bower.io/)
bower_components

# node-waf configuration
.lock-wscript

# Compiled binary addons (https://nodejs.org/api/addons.html)
build/Release

# Dependency directories
node_modules/
jspm_packages/

# TypeScript v1 declaration files
typings/

# TypeScript cache
*.tsbuildinfo

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env
.env.test

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next

# Nuxt.js build / generate output
.nuxt
dist

# Gatsby files
.cache/
public

# Vuepress build output
.vuepress/dist

# Serverless directories
.serverless/

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port

# Stores VSCode versions used for testing VSCode extensions
.vscode-test

# Temporary folders
tmp/
temp/

# Cache
cache/
!cache/canvas/
!cache/rankup/

# Logs
logs/

# Backups
backups/

# Facebook appstate
appstate.json

# Session data
session.json
*.session

# Personal files
*.pem
*.key
*.crt

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Bot specific
data.sqlite-journal
*.log
*.bak`;

        await fs.writeFile(path.join(__dirname, '../.gitignore'), gitignoreContent);
        console.log(chalk.green('✅ .gitignore created'));
    }

    async createEnvExample() {
        const envExample = `# Facebook Credentials
FACEBOOK_EMAIL=your_email@gmail.com
FACEBOOK_PASSWORD=your_password

# Bot Configuration
BOT_PREFIX=!
ADMIN_ID=61578706761898
LANGUAGE=bn
TIMEZONE=Asia/Dhaka

# API Keys
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WEATHER_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TENOR_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Database
DATABASE_PATH=./includes/data.sqlite

# Security
ENCRYPTION_KEY=your_encryption_key_here

# Server
PORT=3000
HOST=0.0.0.0

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/bot.log

# Features
AUTO_BACKUP=true
AUTO_UPDATE=false
ECONOMY_SYSTEM=true`;

        await fs.writeFile(path.join(__dirname, '../.env.example'), envExample);
        console.log(chalk.green('✅ .env.example created'));
    }

    async createReadme() {
        const readmeContent = `# 🎯 YOUR CRUSH BOT

Advanced Facebook Messenger Bot with 300+ commands created by RANA (MASTER 🪓).

## 🚀 Quick Installation

1. Make sure you have Node.js v16+ installed
2. Clone/download this bot
3. Run the setup wizard:
\`\`\`bash
npm run setup
\`\`\`

4. Follow the setup instructions
5. Start the bot:
\`\`\`bash
npm start
\`\`\`

## 📁 Project Structure

\`\`\`
your-crush-bot/
├── Master.js              # Main entry point
├── config.json           # Configuration
├── appstate.json         # Facebook session
├── package.json          # Dependencies
├── setup.js             # Setup wizard
├── login.js             # Manual login
├── Script/              # Commands & Events
├── includes/            # Core modules
├── languages/           # Language files
├── utils/               # Utilities
├── cache/              # Cache files
├── logs/               # Log files
└── backups/            # Backup files
\`\`\`

## ⚙️ Configuration

Edit \`config.json\` to customize:
- Facebook credentials
- Bot prefix (! by default)
- Admin user IDs
- API keys
- Feature toggles

## 🎮 Available Commands

- \`!help\` - Show all commands
- \`!ping\` - Check bot latency
- \`!info\` - Bot information
- \`!weather [city]\` - Weather information
- \`!ai [question]\` - Ask AI
- \`!image [query]\` - Search images
- \`!music [song]\` - Play music
- \`!game\` - Play games
- And 300+ more commands!

## 👨‍💻 Developer

**RANA (MASTER 🪓)**
- 📧 Email: ranaeditz333@gmail.com
- 📱 Phone: 01847634486
- 📱 Telegram: @rana_editz_00
- 🌍 Location: Faridpur, Dhaka, Bangladesh

## ⚠️ Important Notes

- Keep your \`appstate.json\` file secure
- Don't share your API keys
- Use the bot responsibly
- Follow Facebook's Terms of Service

## 🔧 Maintenance

- The bot auto-backs up daily
- Logs are stored in \`logs/\` directory
- Use \`npm run backup\` for manual backup
- Use \`npm run dev\` for development

## 🤝 Support

For support and questions:
- Telegram: @rana_editz_00
- Email: ranaeditz333@gmail.com
- Phone: 01847634486

## 📄 License

MIT License

---

**Made with ❤️ by RANA (MASTER 🪓) in Bangladesh**`;

        await fs.writeFile(path.join(__dirname, '../README.md'), readmeContent);
        console.log(chalk.green('✅ README.md created'));
    }

    async runFullInstallation() {
        console.log(chalk.cyan.bold('🎯 YOUR CRUSH BOT AUTO INSTALLER'));
        console.log(chalk.cyan('====================================\n'));

        // Check prerequisites
        console.log(chalk.yellow('🔍 Checking prerequisites...'));
        
        const nodeOk = await this.checkNodeVersion();
        if (!nodeOk) return false;
        
        const npmOk = await this.checkNpmVersion();
        if (!npmOk) return false;
        
        const internetOk = await this.checkInternetConnection();
        if (!internetOk) {
            console.log(chalk.yellow('⚠️  Continuing without internet connection...'));
        }

        // Create project structure
        await this.createProjectStructure();
        
        // Create package.json
        await this.createPackageJson();
        
        // Install dependencies
        if (internetOk) {
            await this.installDependencies();
        } else {
            console.log(chalk.yellow('⚠️  Skipping dependency installation (no internet)'));
        }
        
        // Create config template
        await this.createConfigTemplate();
        
        // Create sample commands
        await this.createSampleCommands();
        
        // Create .gitignore
        await this.createGitIgnore();
        
        // Create .env.example
        await this.createEnvExample();
        
        // Create README
        await this.createReadme();

        console.log(chalk.green.bold('\n✅ INSTALLATION COMPLETED SUCCESSFULLY!\n'));
        console.log(chalk.yellow('📝 Next steps:'));
        console.log(chalk.yellow('1. Edit config.json with your Facebook credentials'));
        console.log(chalk.yellow('2. Run: npm install (if dependencies were not installed)'));
        console.log(chalk.yellow('3. Run: npm start'));
        console.log(chalk.yellow('\n🎯 Enjoy using YOUR CRUSH BOT!'));
        
        return true;
    }
}

// If this file is run directly
if (require.main === module) {
    const installer = new AutoInstaller();
    installer.runFullInstallation().catch(console.error);
}

module.exports = new AutoInstaller();