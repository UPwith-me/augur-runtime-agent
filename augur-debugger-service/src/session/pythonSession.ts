import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import { DapStreamParser } from '../dap/streamParser';
import { DapMessage } from '../types';

export class PythonSession {
    public readonly id: string;
    private process: ChildProcess | null = null;
    private socket: net.Socket | null = null;
    private parser: DapStreamParser;
    private seq: number = 1;
    private scriptPath: string = '';

    private pendingRequests = new Map<number, (response: any) => void>();
    private eventQueue: DapMessage[] = [];

    private initializedPromise: Promise<void>;
    private resolveInitialized!: () => void;

    constructor(id: string) {
        this.id = id;
        this.parser = new DapStreamParser();
        this.initializedPromise = new Promise(resolve => {
            this.resolveInitialized = resolve;
        });
    }

    public async start(targetPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const port = 5678 + Math.floor(Math.random() * 1000);

            let scriptToRun = targetPath;
            let cwd = process.cwd();

            try {
                if (fs.statSync(targetPath).isDirectory()) {
                    console.log(`[PythonSession:${this.id}] Target is a directory. Looking for entry point...`);
                    cwd = targetPath;
                    const candidates = ['main.py', 'app.py', 'index.py', 'manage.py', 'run.py'];
                    const found = candidates.find(f => fs.existsSync(path.join(targetPath, f)));

                    if (found) {
                        scriptToRun = path.join(targetPath, found);
                        console.log(`[PythonSession:${this.id}] Auto-detected entry point: ${found}`);
                    } else {
                        return reject(new Error(`Could not find a standard entry point (main.py, app.py) in folder: ${targetPath}`));
                    }
                } else {
                    scriptToRun = targetPath;
                    cwd = path.dirname(targetPath);
                }
            } catch (e: any) {
                return reject(new Error(`Invalid path: ${targetPath}. ${e.message}`));
            }

            // 我们坚持使用绝对路径，这是正确的
            this.scriptPath = scriptToRun.replace(/\\/g, '/');

            console.log(`[PythonSession:${this.id}] Spawning python at port ${port}...`);
            console.log(`[PythonSession:${this.id}] CWD: ${cwd}`);

            const pythonExecutable = 'python';

            this.process = spawn(pythonExecutable, [
                '-m', 'debugpy',
                '--listen', `127.0.0.1:${port}`,
                '--wait-for-client',
                this.scriptPath
            ], {
                cwd: cwd,
                // --- 最终修复：响应 debugpy 警告，禁用文件验证 ---
                env: {
                    ...process.env, // 继承当前环境
                    PYDEVD_DISABLE_FILE_VALIDATION: '1'
                }
                // --- 修复结束 ---
            });

            this.process.stdout?.on('data', d => console.log(`[Target-STDOUT] ${d}`));
            this.process.stderr?.on('data', d => {
                const stderrStr = d.toString();
                if (stderrStr.includes("PYDEVD_DISABLE_FILE_VALIDATION")) {
                    console.warn(`[Target-STDERR] ${stderrStr}`);
                } else {
                    console.error(`[Target-STDERR] ${d}`);
                }
            });

            setTimeout(() => {
                this.connectToDebugger(port, resolve, reject);
            }, 5000);
        });
    }

    private connectToDebugger(port: number, onReady: () => void, onError: (e: any) => void) {
        this.socket = new net.Socket();

        this.socket.connect(port, '127.0.0.1', async () => {
            console.log(`[PythonSession:${this.id}] Connected to debugpy! Starting handshake...`);

            try {
                console.log(`[Handshake] 1. Sending 'initialize'...`);
                const initResponse = await this.sendRequest('initialize', { adapterID: 'python' });
                if (!initResponse.success) throw new Error('Handshake failed at "initialize"');
                console.log(`[Handshake] 1. 'initialize' responded.`);

                console.log(`[Handshake] 2. Sending 'attach' (fire-and-forget)...`);
                this.sendRequest('attach', {
                    name: 'Augur Headless',
                    type: 'python',
                    request: 'attach'
                });

                console.log(`[Handshake] 3. Waiting for 'initialized' event from debugpy...`);
                await this.initializedPromise;
                console.log(`[Handshake] 3. 'initialized' event received.`);

                console.log(`[Handshake] 4. Sending 'setBreakpoints' (at line 1)`);
                const bpResponse = await this.sendRequest('setBreakpoints', {
                    source: { path: this.scriptPath },
                    breakpoints: [{ line: 1 }]
                });
                if (!bpResponse.success) throw new Error('Handshake failed at "setBreakpoints"');
                console.log(`[Handshake] 4. 'setBreakpoints' responded.`);

                console.log(`[Handshake] 5. Sending 'setExceptionBreakpoints'`);
                const exResponse = await this.sendRequest('setExceptionBreakpoints', {
                    filters: [],
                    filterOptions: []
                });
                if (!exResponse.success) throw new Error('Handshake failed at "setExceptionBreakpoints"');
                console.log(`[Handshake] 5. 'setExceptionBreakpoints' responded.`);

                console.log(`[Handshake] 6. Sending 'configurationDone'...`);
                const configResponse = await this.sendRequest('configurationDone', {});
                if (!configResponse.success) throw new Error('Handshake failed at "configurationDone"');
                console.log(`[Handshake] 6. 'configurationDone' responded.`);

                console.log(`[PythonSession:${this.id}] Handshake complete. Debugger Ready.`);
                onReady();
            } catch (e) {
                console.error(`[Handshake] Error during handshake:`, e);
                onError(e as Error);
            }
        });

        this.socket.on('data', (data) => {
            const messages = this.parser.handleData(data);
            messages.forEach(msg => this.handleDapMessage(msg));
        });

        this.socket.on('error', (err) => {
            console.error(`[Socket Error] ${err.message}`);
            onError(err);
        });
    }

    private handleDapMessage(msg: any) {
        // 这个日志现在是关键：我们在这里等待 'module' 事件
        console.log(`[DAP Message IN] type: ${msg.type}, seq: ${msg.seq}, event: ${msg.event}, req_seq: ${msg.request_seq}`);

        if (msg.type === 'response') {
            if (msg.success === false) {
                console.error(`[DAP Error] Request (req_seq: ${msg.request_seq}) FAILED!`);
                console.error(`[DAP Error] Command: ${msg.command}`);
                console.error(`[DAP Error] Message: ${msg.message}`);
                console.error(`[DAP Error] Body:`, JSON.stringify(msg.body, null, 2));
            } else {
                console.log(`[DAP Response] Got response for req_seq: ${msg.request_seq}, success: true`);
            }
        }

        if (msg.type === 'event' && msg.event === 'initialized') {
            console.log(`[DAP Event] Received 'initialized' event! Resolving promise.`);
            this.resolveInitialized(); 
        }

        if (msg.type === 'response' && this.pendingRequests.has(msg.request_seq)) {
            const response = msg;
            const resolve = this.pendingRequests.get(msg.request_seq);
            resolve?.(response);
            this.pendingRequests.delete(msg.request_seq);
        }
        if (msg.type === 'event') {
            this.eventQueue.push(msg);
        }
    }

    public sendRequest(command: string, args: any): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.socket) return reject(new Error('Socket not connected'));

            const message = {
                seq: this.seq++,
                type: 'request',
                command: command,
                arguments: args
            };

            const json = JSON.stringify(message);
            const contentLength = Buffer.byteLength(json, 'utf8');
            const packet = `Content-Length: ${contentLength}\r\n\r\n${json}`;

            console.log(`[DAP Message OUT] seq: ${message.seq}, command: ${command}`);
            this.pendingRequests.set(message.seq, resolve);
            this.socket.write(packet);
        });
    }

    public flushEvents(): DapMessage[] {
        const events = [...this.eventQueue];
        this.eventQueue = [];
        return events as DapMessage[];
    }

    public async stop() {
        this.socket?.destroy();
        this.process?.kill();
    }
}