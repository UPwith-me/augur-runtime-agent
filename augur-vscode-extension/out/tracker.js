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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AugurDebugAdapterTrackerFactory = void 0;
const vscode = __importStar(require("vscode"));
const GeminiAgent_1 = require("./agents/GeminiAgent");
const ClaudeAgent_1 = require("./agents/ClaudeAgent");
// Factory class to create our custom tracker
class AugurDebugAdapterTrackerFactory {
    createDebugAdapterTracker(session) {
        return new AugurDebugAdapterTracker(session);
    }
}
exports.AugurDebugAdapterTrackerFactory = AugurDebugAdapterTrackerFactory;
class AugurDebugAdapterTracker {
    constructor(session) {
        this.isProcessing = false;
        this.session = session;
        console.log(`[Augur] Tracker attached to session: ${this.session.id}`);
        const config = vscode.workspace.getConfiguration('augur');
        // Default to 'gemini' if not set, cast to specific type
        const selectedModel = config.get('model') || 'gemini';
        // Note: We pass an empty string for apiKey because the Agent classes
        // are now thin clients that don't need the key locally.
        // The server (augur-debugger-service) handles authentication.
        switch (selectedModel) {
            case 'gemini':
                this.agent = new GeminiAgent_1.GeminiAgent("");
                console.log('[Augur] Gemini Agent initialized (Connected to Service).');
                break;
            case 'claude':
                this.agent = new ClaudeAgent_1.ClaudeAgent("");
                console.log('[Augur] Claude Agent initialized (Connected to Service).');
                break;
            default:
                vscode.window.showErrorMessage(`Augur Error: Unknown model "${selectedModel}". Defaulting to Gemini.`);
                this.agent = new GeminiAgent_1.GeminiAgent("");
        }
    }
    async onDidSendMessage(message) {
        if (message.type === 'event' && message.event === 'stopped') {
            if (this.isProcessing || !this.agent)
                return;
            this.isProcessing = true;
            try {
                console.log('[Augur] Execution stopped. Reason:', message.body.reason);
                await this.handleStoppedEvent(message.body.threadId);
            }
            catch (error) {
                console.error('[Augur] Error processing stopped event:', error);
                // Show a user-friendly error message
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                if (errorMsg.includes('ECONNREFUSED')) {
                    vscode.window.showErrorMessage('Augur Service Error: Could not connect to server. Is augur-debugger-service running on port 4000?');
                }
                else {
                    vscode.window.showErrorMessage(`Augur Error: ${errorMsg}`);
                }
            }
            finally {
                this.isProcessing = false;
            }
        }
    }
    async handleStoppedEvent(threadId) {
        if (!this.agent) {
            console.warn('[Augur] AI Agent not initialized, skipping action.');
            return;
        }
        const context = await this.buildGoldenContext(threadId);
        if (!context) {
            console.warn('[Augur] Could not build context. Skipping AI action.');
            return;
        }
        console.log('[Augur] Golden Context built. Sending to AI Service...');
        const aiAction = await this.agent.getAIDebugAction(context);
        console.log(`[Augur] AI decided action: ${aiAction.tool}`, aiAction);
        await this.executeAIAction(threadId, aiAction);
    }
    async buildGoldenContext(threadId) {
        try {
            const stackTraceResponse = await this.session.customRequest('stackTrace', { threadId, startFrame: 0, levels: 1 });
            const topFrame = stackTraceResponse.stackFrames[0];
            if (!topFrame)
                return null;
            const scopesResponse = await this.session.customRequest('scopes', { frameId: topFrame.id });
            const localScope = scopesResponse.scopes.find((s) => s.name === 'Locals' || s.name === 'Local');
            if (!localScope)
                return null;
            const variablesResponse = await this.session.customRequest('variables', { variablesReference: localScope.variablesReference });
            const variables = variablesResponse.variables.reduce((acc, v) => {
                if (!v.name.startsWith('__')) {
                    acc[v.name] = v.value;
                }
                return acc;
            }, {});
            const sourceCode = await this.getSourceCode(topFrame.source, topFrame.line);
            const prompt = `You are an expert debugging assistant. Your goal is to decide the next best debugging action.
Based on the current state, choose a tool: 'next' (step over), 'stepIn', 'stepOut', 'continue', or 'proposeFix'.
If you choose 'proposeFix', you MUST provide the single, complete line of corrected code in 'fixSuggestion'.
Provide a brief, one-sentence explanation for your choice.

Current state:
- File: ${topFrame.source.path}
- Paused at line: ${topFrame.line}

Code Context:
\`\`\`
${sourceCode}
\`\`\`

Local Variables:
${JSON.stringify(variables, null, 2)}
`;
            return prompt;
        }
        catch (error) {
            console.error('[Augur] Failed to build golden context:', error);
            return null;
        }
    }
    async getSourceCode(source, currentLine) {
        if (!source || !source.path)
            return "Source code not available.";
        try {
            const uri = vscode.Uri.file(source.path);
            const document = await vscode.workspace.openTextDocument(uri);
            const startLine = Math.max(0, currentLine - 6);
            const endLine = Math.min(document.lineCount, currentLine + 5);
            let context = '';
            for (let i = startLine; i < endLine; i++) {
                const line = document.lineAt(i);
                const prefix = (i + 1) === currentLine ? '>' : ' ';
                context += `${prefix} ${i + 1}: ${line.text}\n`;
            }
            return context;
        }
        catch {
            return "Could not read source file.";
        }
    }
    async executeAIAction(threadId, action) {
        let command = action.tool;
        // --- Fix: Map AI terminology to DAP commands ---
        // This fixes the issue where 'stepInto' was considered invalid
        if (command === 'stepInto') {
            command = 'stepIn';
        }
        if (command === 'stepOver') {
            command = 'next';
        }
        const validCommands = ['next', 'stepIn', 'stepOut', 'continue'];
        if (validCommands.includes(command)) {
            console.log(`[Augur] Executing command: ${command}`);
            await this.session.customRequest(command, { threadId });
        }
        else if (action.tool === 'proposeFix' && action.fixSuggestion) {
            console.log(`[Augur] AI proposing fix: ${action.fixSuggestion}`);
            await this.applyCodeFix(action.fixSuggestion, threadId);
            // Notify user and let them review before continuing
            vscode.window.showInformationMessage("Augur AI has applied the code fix. Please review the change and continue debugging manually.");
        }
        else {
            console.warn(`[Augur] AI returned an invalid tool: ${command}. Defaulting to 'next'.`);
            await this.session.customRequest('next', { threadId });
        }
    }
    async applyCodeFix(fixText, threadId) {
        const editor = vscode.window.activeTextEditor;
        // We need to find the current line again because it might have changed or we need to be sure
        let stackTrace;
        try {
            stackTrace = await this.session.customRequest('stackTrace', { threadId, startFrame: 0, levels: 1 });
        }
        catch (e) {
            vscode.window.showErrorMessage(`Augur AI could not apply fix: Failed to get stack trace. ${e.message}`);
            return;
        }
        const currentLine = stackTrace?.stackFrames?.[0]?.line;
        if (editor && currentLine && currentLine > 0) {
            const lineIndex = currentLine - 1; // VS Code lines are 0-based
            const lineText = editor.document.lineAt(lineIndex);
            const edit = new vscode.WorkspaceEdit();
            // Preserve indentation
            const originalIndentation = lineText.text.match(/^\s*/)?.[0] || '';
            // Replace the entire line
            const range = new vscode.Range(new vscode.Position(lineIndex, 0), new vscode.Position(lineIndex, lineText.range.end.character));
            edit.replace(editor.document.uri, range, originalIndentation + fixText.trim());
            const success = await vscode.workspace.applyEdit(edit);
            if (success) {
                // Save the document to reflect changes immediately in the debugger context
                await editor.document.save();
                vscode.window.showInformationMessage(`Augur AI has applied the fix to line ${currentLine}.`);
            }
            else {
                vscode.window.showErrorMessage("Augur AI failed to apply the fix.");
            }
        }
        else {
            vscode.window.showErrorMessage("Augur AI cannot apply fix: No active editor or valid stack frame found.");
        }
    }
}
//# sourceMappingURL=tracker.js.map