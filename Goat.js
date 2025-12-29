/**
 * @author NTKhang
 * ! The source code is written by NTKhang, please don't change the author's name everywhere. Thank you for using
 * ! Official source code: https://github.com/ntkhang03/Goat-Bot-V2
 */

// --- PRO OPTIMIZATION: PROCESS RECOVERY ---
process.on('unhandledRejection', (reason, promise) => {
    console.log(global.utils.colors.red('⚠️ Unhandled Rejection at:'), promise, global.utils.colors.red('reason:'), reason);
});
process.on('uncaughtException', (err, origin) => {
    console.log(global.utils.colors.red('❌ Critical Exception:'), err, global.utils.colors.red('Origin:'), origin);
});

const axios = require("axios");
const fs = require("fs-extra");
const google = require("googleapis").google;
const nodemailer = require("nodemailer");
const { execSync } = require('child_process');
const log = require('./logger/log.js');
const path = require("path");
const chalk = require("chalk");

process.env.BLUEBIRD_W_FORGOTTEN_RETURN = 0;

// --- PRO FEATURE: HIGH-SPEED JSON VALIDATOR ---
function validJSON(pathDir) {
    try {
        if (!fs.existsSync(pathDir)) throw new Error(`File "${pathDir}" not found`);
        const content = fs.readFileSync(pathDir, 'utf8');
        JSON.parse(content); // Rapid check before heavy jsonlint
        return true;
    } catch (err) {
        try {
            execSync(`npx jsonlint "${pathDir}"`, { stdio: 'pipe' });
        } catch (lintErr) {
            let msgError = lintErr.message.split("\n").slice(1).join("\n");
            throw new Error(msgError);
        }
    }
}

const { NODE_ENV } = process.env;
const isDev = ['production', 'development'].includes(NODE_ENV);
const dirConfig = path.normalize(`${__dirname}/config${isDev ? '.dev.json' : '.json'}`);
const dirConfigCommands = path.normalize(`${__dirname}/configCommands${isDev ? '.dev.json' : '.json'}`);
const dirAccount = path.normalize(`${__dirname}/account${isDev ? '.dev.txt' : '.txt'}`);

// Validate core configs
for (const pathDir of [dirConfig, dirConfigCommands]) {
    try {
        validJSON(pathDir);
    } catch (err) {
        log.error("CORE-CONFIG", `Critical JSON Error in ${path.basename(pathDir)}: ${err.message}`);
        process.exit(0);
    }
}

const config = require(dirConfig);
const configCommands = require(dirConfigCommands);

// ———————————————— GLOBAL INITIALIZATION ———————————————— //
global.GoatBot = {
    startTime: Date.now(),
    commands: new Map(),
    eventCommands: new Map(),
    aliases: new Map(),
    onChat: [],
    onEvent: [],
    onReply: new Map(),
    onReaction: new Map(),
    config,
    configCommands,
    // --- PRO ADDITION: SYSTEM HEALTH ---
    status: {
        totalRequests: 0,
        cpuUsage: 0,
        ramUsage: () => (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + "MB"
    },
    reLoginBot: function () { },
    fcaApi: null,
    botID: null
};

global.db = {
    allThreadData: [], allUserData: [], allDashBoardData: [], allGlobalData: [],
    threadModel: null, userModel: null, dashboardModel: null, globalModel: null,
    threadsData: null, usersData: null, dashBoardData: null, globalData: null
};

// Load Utilities
const utils = require("./utils.js");
global.utils = utils;

// ———————————————— SMART WATCHER ———————————————— //
const watchAndReload = (dir, prop, logName) => {
    fs.watchFile(dir, { interval: 1000 }, (curr, prev) => {
        if (curr.mtimeMs !== prev.mtimeMs) {
            try {
                global.GoatBot[prop] = JSON.parse(fs.readFileSync(dir, 'utf-8'));
                log.success(logName, `Hot-Reloaded: ${path.basename(dir)}`);
            } catch (e) {
                log.error(logName, `Hot-Reload Failed: ${e.message}`);
            }
        }
    });
};
watchAndReload(dirConfigCommands, 'configCommands', 'WATCHER-CMDS');
watchAndReload(dirConfig, 'config', 'WATCHER-CORE');

// ———————————————— PRO AUTO-RESTART ———————————————— //
if (config.autoRestart) {
    const restartTime = config.autoRestart.time;
    if (restartTime > 0) {
        setTimeout(() => {
            log.info("SYSTEM", "Executing scheduled restart for performance optimization...");
            process.exit(2);
        }, restartTime);
    }
}

// ———————————————— ASYNC INITIALIZER ———————————————— //
(async () => {
    try {
        console.log(chalk.cyan.bold(`\n==== Mahiru-kaoruko Engine Starting ====`));
        
        // Setup Google/Mail APIs
        const { gmailAccount } = config.credentials;
        if (gmailAccount && gmailAccount.email) {
            const OAuth2 = google.auth.OAuth2;
            const OAuth2_client = new OAuth2(gmailAccount.clientId, gmailAccount.clientSecret);
            OAuth2_client.setCredentials({ refresh_token: gmailAccount.refreshToken });
            const { token } = await OAuth2_client.getAccessToken();
            
            global.utils.transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    type: 'OAuth2',
                    user: gmailAccount.email,
                    clientId: gmailAccount.clientId,
                    clientSecret: gmailAccount.clientSecret,
                    refreshToken: gmailAccount.refreshToken,
                    accessToken: token
                }
            });
        }

        // Check Version
        const { data: remotePackage } = await axios.get("https://raw.githubusercontent.com/ntkhang03/Goat-Bot-V2/main/package.json");
        const localPackage = require("./package.json");
        if (remotePackage.version !== localPackage.version) {
            log.warn("UPDATE", `New version available: ${remotePackage.version}. Current: ${localPackage.version}`);
        }

        // Initialize Google Drive
        const parentId = await utils.drive.checkAndCreateParentFolder("GoatBot");
        utils.drive.parentID = parentId;

        // Final Boot-up
        console.log(chalk.green(`[SYSTEM] Environment: ${NODE_ENV || 'Standard'}`));
        console.log(chalk.green(`[SYSTEM] RAM: ${global.GoatBot.status.ramUsage()}`));
        
        require(`./bot/login/login${NODE_ENV === 'development' ? '.dev.js' : '.js'}`);
        
    } catch (err) {
        log.error("BOOT-FAILED", err.message);
    }
})();
