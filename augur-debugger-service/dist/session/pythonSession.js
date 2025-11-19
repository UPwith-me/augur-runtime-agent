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
exports.PythonSession = void 0;
const child_process_1 = require("child_process");
const net = __importStar(require("net"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const streamParser_1 = require("../dap/streamParser");
class PythonSession {
    constructor(id) {
        this.process = null;
        this.socket = null;
        this.seq = 1;
        this.scriptPath = '';
        this.pendingRequests = new Map();
        this.eventQueue = [];
        this.id = id;
        this.parser = new streamParser_1.DapStreamParser();
        this.initializedPromise = new Promise(resolve => {
            this.resolveInitialized = resolve;
        });
    }
    async start(targetPath) {
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
                    }
                    else {
                        return reject(new Error(`Could not find a standard entry point (main.py, app.py) in folder: ${targetPath}`));
                    }
                }
                else {
                    scriptToRun = targetPath;
                    cwd = path.dirname(targetPath);
                }
            }
            catch (e) {
                return reject(new Error(`Invalid path: ${targetPath}. ${e.message}`));
            }
            // 我们坚持使用绝对路径，这是正确的
            this.scriptPath = scriptToRun.replace(/\\/g, '/');
            console.log(`[PythonSession:${this.id}] Spawning python at port ${port}...`);
            console.log(`[PythonSession:${this.id}] CWD: ${cwd}`);
            const pythonExecutable = 'python';
            this.process = (0, child_process_1.spawn)(pythonExecutable, [
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
                }
                else {
                    console.error(`[Target-STDERR] ${d}`);
                }
            });
            setTimeout(() => {
                this.connectToDebugger(port, resolve, reject);
            }, 5000);
        });
    }
    connectToDebugger(port, onReady, onError) {
        this.socket = new net.Socket();
        this.socket.connect(port, '127.0.0.1', async () => {
            console.log(`[PythonSession:${this.id}] Connected to debugpy! Starting handshake...`);
            try {
                console.log(`[Handshake] 1. Sending 'initialize'...`);
                const initResponse = await this.sendRequest('initialize', { adapterID: 'python' });
                if (!initResponse.success)
                    throw new Error('Handshake failed at "initialize"');
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
                if (!bpResponse.success)
                    throw new Error('Handshake failed at "setBreakpoints"');
                console.log(`[Handshake] 4. 'setBreakpoints' responded.`);
                console.log(`[Handshake] 5. Sending 'setExceptionBreakpoints'`);
                const exResponse = await this.sendRequest('setExceptionBreakpoints', {
                    filters: [],
                    filterOptions: []
                });
                if (!exResponse.success)
                    throw new Error('Handshake failed at "setExceptionBreakpoints"');
                console.log(`[Handshake] 5. 'setExceptionBreakpoints' responded.`);
                console.log(`[Handshake] 6. Sending 'configurationDone'...`);
                const configResponse = await this.sendRequest('configurationDone', {});
                if (!configResponse.success)
                    throw new Error('Handshake failed at "configurationDone"');
                console.log(`[Handshake] 6. 'configurationDone' responded.`);
                console.log(`[PythonSession:${this.id}] Handshake complete. Debugger Ready.`);
                onReady();
            }
            catch (e) {
                console.error(`[Handshake] Error during handshake:`, e);
                onError(e);
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
    handleDapMessage(msg) {
        // 这个日志现在是关键：我们在这里等待 'module' 事件
        console.log(`[DAP Message IN] type: ${msg.type}, seq: ${msg.seq}, event: ${msg.event}, req_seq: ${msg.request_seq}`);
        if (msg.type === 'response') {
            if (msg.success === false) {
                console.error(`[DAP Error] Request (req_seq: ${msg.request_seq}) FAILED!`);
                console.error(`[DAP Error] Command: ${msg.command}`);
                console.error(`[DAP Error] Message: ${msg.message}`);
                console.error(`[DAP Error] Body:`, JSON.stringify(msg.body, null, 2));
            }
            else {
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
    sendRequest(command, args) {
        return new Promise((resolve, reject) => {
            if (!this.socket)
                return reject(new Error('Socket not connected'));
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
    flushEvents() {
        const events = [...this.eventQueue];
        this.eventQueue = [];
        return events;
    }
    async stop() {
        this.socket?.destroy();
        this.process?.kill();
    }
}
exports.PythonSession = PythonSession;
