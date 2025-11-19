import fetch from 'node-fetch';
import * as path from 'path';
import * as fs from 'fs';

// Configuration
const SERVER_URL = 'http://localhost:4000/api/v1';
const TARGET_SCRIPT = path.resolve(__dirname, '../../buggy_test.py');

// Types
interface AiResponse {
    tool: string;
    explanation: string;
    fixSuggestion?: string;
    breakpointLine?: number; // New field
}

async function main() {
    console.log('🕵️  Augur CI Agent starting (Autonomous Mode)...');
    console.log(`🎯 Target Script: ${TARGET_SCRIPT}`);

    try {
        // 1. Read Source Code
        if (!fs.existsSync(TARGET_SCRIPT)) throw new Error(`Script not found: ${TARGET_SCRIPT}`);
        const sourceCode = fs.readFileSync(TARGET_SCRIPT, 'utf-8');

        // 2. Start Session
        console.log('🔌 Connecting to Augur Debugger Service...');
        const startRes = await fetch(`${SERVER_URL}/session/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scriptPath: TARGET_SCRIPT })
        });

        if (!startRes.ok) throw new Error(`Failed to start session: ${await startRes.text()}`);
        const { sessionId } = await startRes.json() as any;
        console.log(`✅ Session started! ID: ${sessionId}`);

        // 3. [NEW] AI Auto-Breakpoint Phase
        console.log('🧠 Analyzing code to find entry point...');

        const analysisContext = `
You are setting up a debugging session.
Analyze the following Python code and identify the best line to set an initial breakpoint.
Usually, this is the first line of the 'main' function or the entry point logic.
Choose the tool 'setBreakpoint' and provide the 'breakpointLine'.

Code:
\`\`\`python
${sourceCode}
\`\`\`
`;
        // We reuse the getDebugAction endpoint for this "planning" phase
        const planRes = await fetch(`${SERVER_URL}/getDebugAction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ context: analysisContext, model: 'gemini-2.5-flash' })
        });

        const plan: AiResponse = await planRes.json() as AiResponse;

        if (plan.tool === 'setBreakpoint' && plan.breakpointLine) {
            console.log(`📍 AI decided to set breakpoint at line ${plan.breakpointLine}: ${plan.explanation}`);

            // Send DAP setBreakpoints request
            await sendDapRequest(sessionId, 'setBreakpoints', {
                source: { path: TARGET_SCRIPT },
                breakpoints: [{ line: plan.breakpointLine }]
            });
            console.log('✅ Breakpoint set successfully.');
        } else {
            console.warn('⚠️ AI did not suggest a breakpoint. Execution might finish without stopping.');
        }

        // 4. Main Event Loop
        let isRunning = true;

        while (isRunning) {
            // Poll for events every 500ms
            await new Promise(r => setTimeout(r, 500));

            const eventsRes = await fetch(`${SERVER_URL}/session/${sessionId}/events`);
            const events = await eventsRes.json() as any[];

            for (const event of events) {
                // Filter out noisy output events
                if (event.event !== 'output') {
                    console.log(`📨 Event: ${event.event}`);
                }

                import fetch from 'node-fetch';
                import * as path from 'path';
                import * as fs from 'fs';

                // Configuration
                const SERVER_URL = 'http://localhost:4000/api/v1';
                const TARGET_SCRIPT = path.resolve(__dirname, '../../buggy_test.py');

                // Types
                interface AiResponse {
                    tool: string;
                    explanation: string;
                    fixSuggestion?: string;
                    breakpointLine?: number; // New field
                }

                async function main() {
                    console.log('🕵️  Augur CI Agent starting (Autonomous Mode)...');
                    console.log(`🎯 Target Script: ${TARGET_SCRIPT}`);

                    try {
                        // 1. Read Source Code
                        if (!fs.existsSync(TARGET_SCRIPT)) throw new Error(`Script not found: ${TARGET_SCRIPT}`);
                        const sourceCode = fs.readFileSync(TARGET_SCRIPT, 'utf-8');

                        // 2. Start Session
                        console.log('🔌 Connecting to Augur Debugger Service...');
                        const startRes = await fetch(`${SERVER_URL}/session/start`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ scriptPath: TARGET_SCRIPT })
                        });

                        if (!startRes.ok) throw new Error(`Failed to start session: ${await startRes.text()}`);
                        const { sessionId } = await startRes.json() as any;
                        console.log(`✅ Session started! ID: ${sessionId}`);

                        // 3. [NEW] AI Auto-Breakpoint Phase
                        console.log('🧠 Analyzing code to find entry point...');

                        const analysisContext = `
You are setting up a debugging session.
Analyze the following Python code and identify the best line to set an initial breakpoint.
Usually, this is the first line of the 'main' function or the entry point logic.
Choose the tool 'setBreakpoint' and provide the 'breakpointLine'.

Code:
\`\`\`python
${sourceCode}
\`\`\`
`;
                        // We reuse the getDebugAction endpoint for this "planning" phase
                        const planRes = await fetch(`${SERVER_URL}/getDebugAction`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ context: analysisContext, model: 'gemini-2.5-flash' })
                        });

                        const plan: AiResponse = await planRes.json() as AiResponse;

                        if (plan.tool === 'setBreakpoint' && plan.breakpointLine) {
                            console.log(`📍 AI decided to set breakpoint at line ${plan.breakpointLine}: ${plan.explanation}`);

                            // Send DAP setBreakpoints request
                            await sendDapRequest(sessionId, 'setBreakpoints', {
                                source: { path: TARGET_SCRIPT },
                                breakpoints: [{ line: plan.breakpointLine }]
                            });
                            console.log('✅ Breakpoint set successfully.');
                        } else {
                            console.warn('⚠️ AI did not suggest a breakpoint. Execution might finish without stopping.');
                        }

                        // 4. Main Event Loop
                        let isRunning = true;

                        while (isRunning) {
                            // Poll for events every 500ms
                            await new Promise(r => setTimeout(r, 500));

                            const eventsRes = await fetch(`${SERVER_URL}/session/${sessionId}/events`);
                            const events = await eventsRes.json() as any[];

                            for (const event of events) {
                                // Filter out noisy output events
                                if (event.event !== 'output') {
                                    console.log(`📨 Event: ${event.event}`);
                                }

                                if (event.event === 'terminated' || event.event === 'exited') {
                                    console.log('🛑 Target process terminated.');
                                    isRunning = false;
                                    break;
                                }

                                if (event.event === 'stopped') {
                                    console.log(`⏸️  Execution stopped (Reason: ${event.body.reason}). AI is investigating...`);

                                    try {
                                        // 1. Fetch Stack Trace
                                        const stackRes = await sendDapRequest(sessionId, 'stackTrace', { threadId: event.body.threadId });
                                        const topFrame = stackRes.body.stackFrames[0];

                                        // 2. Fetch Scopes & Variables
                                        const scopesRes = await sendDapRequest(sessionId, 'scopes', { frameId: topFrame.id });
                                        const localScope = scopesRes.body.scopes.find((s: any) => s.name === 'Locals' || s.name === 'Local');

                                        let variables = {};
                                        if (localScope) {
                                            const varsRes = await sendDapRequest(sessionId, 'variables', { variablesReference: localScope.variablesReference });
                                            variables = varsRes.body.variables.reduce((acc: any, v: any) => {
                                                if (!v.name.startsWith('__')) acc[v.name] = v.value;
                                                return acc;
                                            }, {});
                                        }

                                        // 3. Build Context
                                        const context = `
Current state:
- File: ${topFrame.source ? topFrame.source.path : 'Unknown'}
- Paused at line: ${topFrame.line}

Local Variables:
${JSON.stringify(variables, null, 2)}
`;
                                        // 4. Ask AI
                                        console.log('🧠 Asking AI for next step...');
                                        const actionRes = await fetch(`${SERVER_URL}/getDebugAction`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ context, model: 'gemini-2.5-flash' })
                                        });
                                        const action: AiResponse = await actionRes.json() as AiResponse;

                                        console.log(`🤖 AI Decision: ${action.tool} (${action.explanation})`);

                                        // 5. Execute Action
                                        if (action.tool === 'proposeFix') {
                                            console.log(`🎉 AI FOUND THE BUG! Fix: ${action.fixSuggestion}`);
                                            // In a real CI, we might apply the fix or fail the build with a report.
                                            // For now, we terminate.
                                            await sendDapRequest(sessionId, 'disconnect');
                                            isRunning = false;
                                        } else {
                                            // Map AI tool to DAP command
                                            const cmdMap: Record<string, string> = {
                                                'stepOver': 'next',
                                                'stepInto': 'stepIn',
                                                'stepOut': 'stepOut',
                                                'continue': 'continue'
                                            };
                                            const dapCmd = cmdMap[action.tool] || 'next';
                                            await sendDapRequest(sessionId, dapCmd, { threadId: event.body.threadId });
                                        }

                                    } catch (err) {
                                        console.error('💥 Error during AI loop:', err);
                                        await sendDapRequest(sessionId, 'next', { threadId: event.body.threadId });
                                    }
                                }
                            }
                        }

                        console.log('👋 Augur CI Agent finished.');

                    } catch (error) {
                        console.error('❌ Error:', error);
                    }
                }

                async function sendDapRequest(sessionId: string, command: string, args?: any) {
                    // console.log(`🤖 Sending command: ${command}`);
                    const res = await fetch(`${SERVER_URL}/session/${sessionId}/request`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ command, args })
                    });
                    return res.json();
                }

                main();