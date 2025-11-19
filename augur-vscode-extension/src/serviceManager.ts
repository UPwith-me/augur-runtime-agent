import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import fetch from 'node-fetch';

export class ServiceManager {
    private serverProcess: cp.ChildProcess | null = null;
    private webProcess: cp.ChildProcess | null = null;
    private outputChannel: vscode.OutputChannel;
    private projectRoot: string;

    constructor(context: vscode.ExtensionContext) {
        this.outputChannel = vscode.window.createOutputChannel("Augur Services");

        // Assuming the extension is installed in the monorepo structure during dev,
        // or packaged with the services.
        // For dev environment (F5), we navigate up from 'src' or 'out'.
        // Adjust this path based on your actual deployment structure.
        // In dev: extension path is /augur-vscode-extension. Parent is root.
        this.projectRoot = path.resolve(context.extensionPath, '..');
    }

    public async ensureServicesRunning(): Promise<boolean> {
        if (await this.checkServerHealth()) {
            return true; // Already running
        }

        return await this.startServices();
    }

    private async startServices(): Promise<boolean> {
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

    private monitorProcess(process: cp.ChildProcess, name: string) {
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

    private log(message: string) {
        this.outputChannel.appendLine(message);
    }

    private async checkServerHealth(): Promise<boolean> {
        try {
            const res = await fetch('http://localhost:4000/');
            return res.ok;
        } catch (e) {
            return false;
        }
    }

    private async waitForServerReady(timeoutMs = 15000): Promise<boolean> {
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

    public stopServices() {
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