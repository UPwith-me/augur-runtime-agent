import * as vscode from 'vscode';
import { AugurDebugAdapterTrackerFactory } from './tracker';
import { ServiceManager } from './serviceManager'; // Import the manager
import fetch from 'node-fetch';

let serviceManager: ServiceManager;

export function activate(context: vscode.ExtensionContext) {
    console.log('Augur AI Debugger is now active.');

    // Initialize Service Manager
    serviceManager = new ServiceManager(context);

    // 1. Register Tracker Factory (Pattern A)
    context.subscriptions.push(
        vscode.debug.registerDebugAdapterTrackerFactory('*', new AugurDebugAdapterTrackerFactory())
    );

    // 2. Register Headless Session Command (Pattern B)
    const disposable = vscode.commands.registerCommand('augur.startHeadlessSession', async (uri: vscode.Uri) => {
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

                const response = await fetch(serverUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ scriptPath: targetPath })
                });

                if (!response.ok) {
                    const err = await response.json() as any;
                    throw new Error(err.error || response.statusText);
                }

                const data = await response.json() as any;
                const sessionId = data.sessionId;

                // --- STEP 3: OPEN WEB UI ---
                progress.report({ message: "Opening Interface..." });
                const panelUrl = `${webUiUrl}?sessionId=${sessionId}&mode=live`;
                vscode.env.openExternal(vscode.Uri.parse(panelUrl));

                vscode.window.showInformationMessage(`Augur Session Started!`);

            } catch (error: any) {
                vscode.window.showErrorMessage(`Augur Error: ${error.message}`);
            }
        });
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {
    console.log('Augur AI Debugger deactivated.');
    // Optional: Stop services when VS Code closes
    // serviceManager?.stopServices();
}