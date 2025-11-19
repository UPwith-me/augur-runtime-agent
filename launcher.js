const fs = require('fs');
const path = require('path');
// 'spawnSync' 是新加入的，用于同步运行 npm install
const { spawn, exec, spawnSync } = require('child_process');
const http = require('http');

// --- Configuration ---
const PROJECT_ROOT = __dirname;
const SERVER_DIR = path.join(PROJECT_ROOT, 'augur-debugger-service');
const WEB_DIR = path.join(PROJECT_ROOT, 'augur-web-visualizer');
const SERVER_URL = 'http://localhost:4000';
const WEB_URL = 'http://localhost:5173';

// ANSI Colors
const cyan = '\x1b[36m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const red = '\x1b[31m';
const reset = '\x1b[0m';

function log(msg) {
    console.log(`${cyan}[Augur Launcher]${reset} ${msg}`);
}

function logStep(msg) {
    console.log(`\n${yellow}--- ${msg} ---${reset}`);
}

function error(msg) {
    console.error(`${red}[Augur Error]${reset} ${msg}`);
}

// 1. Parse Arguments
const targetPath = process.argv[2];
if (!targetPath) {
    error("No target file provided.");
    console.log("Usage: node launcher.js <path_to_python_file_or_folder>");
    process.exit(1);
}

const absoluteTargetPath = path.resolve(targetPath);
log(`Target: ${absoluteTargetPath}`);

// 2. Helper: Check if a port is in use
function checkService(url) {
    return new Promise((resolve) => {
        http.get(url, (res) => {
            resolve(res.statusCode === 200);
        }).on('error', () => {
            resolve(false);
        });
    });
}

// 3. Helper: Wait for service to be ready
async function waitForService(url, name, timeout = 30000) { // Increased timeout for Vite
    process.stdout.write(`${cyan}[Augur Launcher]${reset} Waiting for ${name}... `);
    const start = Date.now();
    while (Date.now() - start < timeout) {
        if (await checkService(url)) {
            console.log(`${green}Ready!${reset}`);
            return true;
        }
        await new Promise(r => setTimeout(r, 1000));
        process.stdout.write(".");
    }
    console.log(`${red}Timeout!${reset}`);
    return false;
}

// 4. Helper: Start a process in background
function startProcess(name, command, args, cwd) {
    log(`Starting ${name} in background...`);
    const proc = spawn(command, args, {
        cwd: cwd,
        shell: true,
        stdio: 'ignore', 
        detached: true   
    });
    proc.unref(); 
}

// 5. Helper: Open Browser
function openBrowser(url) {
    log(`Attempting to open browser to: ${yellow}${url}${reset}`);
    let command;
    if (process.platform === 'win32') {
        command = `explorer "${url}"`;
    } else if (process.platform === 'darwin') {
        command = `open "${url}"`;
    } else {
        command = `xdg-open "${url}"`;
    }
    exec(command, (err) => {
        if (err) error(`Failed to auto-open browser: ${err.message}`);
    });
}

// --- (NEW) 6. Helper: Ensure Dependencies ---
function ensureDependencies(name, cwd) {
    logStep(`Checking dependencies for ${name}...`);
    const nodeModulesPath = path.join(cwd, 'node_modules');
    
    if (fs.existsSync(nodeModulesPath)) {
        log(`${green}node_modules found.${reset}`);
        return true;
    }

    log(`${yellow}node_modules not found. Running 'npm install'...${reset}`);
    log(`This may take a moment. Please wait...`);

    // We use spawnSync (synchronous) because we *must* wait for this
    // to finish before starting the server.
    const npmInstall = spawnSync('npm', ['install'], {
        cwd: cwd,
        shell: true,
        stdio: 'inherit' // Show output directly in the launcher window
    });

    if (npmInstall.status === 0) {
        log(`${green}Dependencies installed successfully for ${name}.${reset}`);
        return true;
    } else {
        error(`'npm install' failed for ${name}.`);
        
        // 检查 spawnSync 本身是否出错（例如 "npm" 命令找不到）
        if (npmInstall.error) {
             error(`Spawn error: ${npmInstall.error.message}`);
        }
        
        // 因为 stdio: 'inherit'，npm install 的具体错误已经打印在上面的控制台了。
        // 我们不需要（也不能）再打印 npmInstall.stderr。
        // error(npmInstall.stderr.toString()); // <-- 原始的错误行
        
        log("Please check the 'npm install' output above for details.");
        return false;
    }
}

async function main() {
    // --- Step A: Check & Install Dependencies ---
    if (!ensureDependencies('Augur Server', SERVER_DIR)) {
        exec("pause"); process.exit(1);
    }
    if (!ensureDependencies('Augur Web', WEB_DIR)) {
        exec("pause"); process.exit(1);
    }

    // --- Step B: Ensure Services are Running ---
    logStep('Starting Services...');
    
    // Check Server
    const isServerRunning = await checkService(SERVER_URL);
    if (!isServerRunning) {
        startProcess('Augur Server', 'npm', ['start'], SERVER_DIR);
        const serverReady = await waitForService(SERVER_URL, "Augur Server"); 
        if (!serverReady) {
            error("Server failed to start. Check if port 4000 is free.");
            exec("pause"); process.exit(1);
        }
    } else {
        log("Server is already running.");
    }

    // Check Web
    const isWebRunning = await checkService(WEB_URL);
    if (!isWebRunning) {
        startProcess('Augur Web', 'npm', ['run', 'dev'], WEB_DIR);
        const webReady = await waitForService(WEB_URL, "Augur Web", 30000); // Give Vite more time
        if (!webReady) {
            error("Web interface failed to start. Check if port 5173 is free.");
            exec("pause"); process.exit(1);
        }
    } else {
        log("Web Interface is already running.");
    }

    // --- Step C: Submit Session ---
    logStep('Initializing Debug Session...');
    
    const postData = JSON.stringify({ scriptPath: absoluteTargetPath });
    
    const req = http.request(`${SERVER_URL}/api/v1/session/start`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            if (res.statusCode === 200) {
                const response = JSON.parse(data);
                const sessionId = response.sessionId;
                
                // --- Step D: Open Browser ---
                const finalUrl = `${WEB_URL}/?sessionId=${sessionId}&mode=live`;
                
                console.log("\n" + "=".repeat(50));
                console.log(` ${green}SESSION STARTED SUCCESSFULLY!${reset}`);
                console.log(` ID: ${cyan}${sessionId}${reset}`);
                console.log("=".repeat(50));
                console.log(`\n👉 If browser doesn't open, CTRL+CLICK here:\n\n   ${yellow}${finalUrl}${reset}\n`);
                
                openBrowser(finalUrl);
                
                // Keep launcher window open for logging (user closes it manually)
                log("Launcher window will stay open for logging. You can close this window when done.");

            } else {
                error(`Failed to start session (Status: ${res.statusCode}): ${data}`);
                exec("pause");
            }
        });
    });

    req.on('error', (e) => {
        error(`Connection error to Augur Server: ${e.message}`);
        exec("pause");
    });

    req.write(postData);
    req.end();
}

main();