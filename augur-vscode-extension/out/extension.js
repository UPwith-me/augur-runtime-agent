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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const tracker_1 = require("./tracker");
const serviceManager_1 = require("./serviceManager"); // Import the manager
const node_fetch_1 = __importDefault(require("node-fetch"));
let serviceManager;
function activate(context) {
    console.log('Augur AI Debugger is now active.');
    // Initialize Service Manager
    serviceManager = new serviceManager_1.ServiceManager(context);
    // 1. Register Tracker Factory (Pattern A)
    context.subscriptions.push(vscode.debug.registerDebugAdapterTrackerFactory('*', new tracker_1.AugurDebugAdapterTrackerFactory()));
    // 2. Register Headless Session Command (Pattern B)
    const disposable = vscode.commands.registerCommand('augur.startHeadlessSession', async (uri) => {
        if (!uri) {
            vscode.window.showErrorMessage('Please right-click a file or folder to start Augur.');
            return;
        }
        const targetPath = uri.fsPath;
        const serverUrl = 'http://localhost:4000/api/v1/session/start';
        const webUiUrl = 'http://localhost:5173';
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Starting Augur...",
            cancellable: false
        }, async (progress) => {
            try {
                // --- STEP 1: AUTO-START SERVICES ---
                progress.report({ message: "Checking background services..." });
                const servicesReady = await serviceManager.ensureServicesRunning();
                if (!servicesReady) {
                    throw new Error("Failed to start background services. Check 'Augur Services' output.");
                }
                // --- STEP 2: START DEBUG SESSION ---
                progress.report({ message: "Initializing Debugger on Server..." });
                const response = await (0, node_fetch_1.default)(serverUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ scriptPath: targetPath })
                });
                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || response.statusText);
                }
                const data = await response.json();
                const sessionId = data.sessionId;
                // --- STEP 3: OPEN WEB UI ---
                progress.report({ message: "Opening Interface..." });
                const panelUrl = `${webUiUrl}?sessionId=${sessionId}&mode=live`;
                vscode.env.openExternal(vscode.Uri.parse(panelUrl));
                vscode.window.showInformationMessage(`Augur Session Started!`);
            }
            catch (error) {
                vscode.window.showErrorMessage(`Augur Error: ${error.message}`);
            }
        });
    });
    context.subscriptions.push(disposable);
}
function deactivate() {
    console.log('Augur AI Debugger deactivated.');
    // Optional: Stop services when VS Code closes
    // serviceManager?.stopServices();
}
//# sourceMappingURL=extension.js.map