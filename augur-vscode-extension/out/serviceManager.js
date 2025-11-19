"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceManager = void 0;
const vscode = __importStar(require("vscode"));
const cp = __importStar(require("child_process"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const node_fetch_1 = __importDefault(require("node-fetch"));
class ServiceManager {
    constructor(context) {
        this.serverProcess = null;
        this.webProcess = null;
        this.outputChannel = vscode.window.createOutputChannel("Augur Services");
        // Assuming the extension is installed in the monorepo structure during dev,
        // or packaged with the services.
        // For dev environment (F5), we navigate up from 'src' or 'out'.
        // Adjust this path based on your actual deployment structure.
        // In dev: extension path is /augur-vscode-extension. Parent is root.
        this.projectRoot = path.resolve(context.extensionPath, '..');
    }
    async ensureServicesRunning() {
        if (await this.checkServerHealth()) {
            return true; // Already running
        }
        return await this.startServices();
    }
    async startServices() {
        vscode.window.showInformationMessage("Augur: Starting background services...");
        this.outputChannel.show();
        const serverPath = path.join(this.projectRoot, 'augur-debugger-service');
        const webPath = path.join(this.projectRoot, 'augur-web-visualizer');
        // Check if paths exist
        if (!fs.existsSync(serverPath) || !fs.existsSync(webPath)) {
            vscode.window.showErrorMessage(`Augur Error: Could not find service directories at ${this.projectRoot}. Please ensure you are opening the full project.`);
            return false;
        }
        // 1. Start Server
        this.log("Starting Augur Server...");
        this.serverProcess = cp.spawn('npm', ['start'], {
            cwd: serverPath,
            shell: true
        });
        this.monitorProcess(this.serverProcess, 'Server');
        // 2. Start Web (Optional: In production you might serve static build from Server)
        // For dev, we start vite
        this.log("Starting Augur Web Interface...");
        this.webProcess = cp.spawn('npm', ['run', 'dev'], {
            cwd: webPath,
            shell: true
        });
        this.monitorProcess(this.webProcess, 'Web');
        // 3. Wait for health check
        return await this.waitForServerReady();
    }
    monitorProcess(process, name) {
        process.stdout?.on('data', (data) => {
            this.log(`[${name}] ${data.toString().trim()}`);
        });
        process.stderr?.on('data', (data) => {
            this.log(`[${name} ERR] ${data.toString().trim()}`);
        });
        process.on('exit', (code) => {
            this.log(`[${name}] Process exited with code ${code}`);
        });
    }
    log(message) {
        this.outputChannel.appendLine(message);
    }
    async checkServerHealth() {
        try {
            const res = await (0, node_fetch_1.default)('http://localhost:4000/');
            return res.ok;
        }
        catch (e) {
            return false;
        }
    }
    async waitForServerReady(timeoutMs = 15000) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeoutMs) {
            if (await this.checkServerHealth()) {
                this.log("Augur Server is ready!");
                return true;
            }
            await new Promise(r => setTimeout(r, 1000));
        }
        vscode.window.showErrorMessage("Augur: Services failed to start within timeout.");
        return false;
    }
    stopServices() {
        if (this.serverProcess) {
            this.log("Stopping Server...");
            this.serverProcess.kill(); // Might need tree-kill for windows shell spawning
            this.serverProcess = null;
        }
        if (this.webProcess) {
            this.log("Stopping Web Interface...");
            this.webProcess.kill();
            this.webProcess = null;
        }
    }
}
exports.ServiceManager = ServiceManager;
//# sourceMappingURL=serviceManager.js.map