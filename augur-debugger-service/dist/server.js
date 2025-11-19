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
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const multer_1 = __importDefault(require("multer"));
const undici_1 = require("undici");
const aiServiceFactory_1 = require("./aiServiceFactory");
const sessionManager_1 = require("./session/sessionManager");
const rateLimiter_1 = require("./rateLimiter"); // 导入速率限制器
// --- Server Initialization ---
dotenv.config();
const PORT = 4000;
const app = (0, express_1.default)();
// --- Proxy Config ---
const proxyUrl = process.env.PROXY_URL;
if (proxyUrl) {
    console.log(`[Server] 🛡️ Proxy enabled! Routing traffic through: ${proxyUrl}`);
    const dispatcher = new undici_1.ProxyAgent(proxyUrl);
    (0, undici_1.setGlobalDispatcher)(dispatcher);
}
// --- File Upload Config ---
const UPLOAD_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR);
}
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = (0, multer_1.default)({ storage: storage });
// --- Middleware ---
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// --- Routes ---
app.get('/', (req, res) => {
    res.send('🤖 Augur AI Debugger Service is running correctly!');
});
app.post('/api/v1/generateSimulation', async (req, res) => {
    try {
        const { code, model } = req.body;
        const agent = (0, aiServiceFactory_1.getAgentService)(model);
        const simulationSteps = await agent.generateSimulation(code);
        res.status(200).json(simulationSteps);
    }
    catch (error) {
        res.status(500).json({ error: error.name, message: error.message });
    }
});
app.post('/api/v1/getDebugAction', async (req, res) => {
    console.log(`\n[AI Service] === /getDebugAction Request Received ===`);
    try {
        const { context, model, plan } = req.body;
        console.log(`[AI Service] Model: ${model}, Plan: ${plan || 'paid (default)'}`);
        // 如果是免费套餐，则执行速率限制
        if (plan === 'free') {
            await (0, rateLimiter_1.enforceFreeTierLimit)();
        }
        console.log(`[AI Service] Context being sent to AI: \n--- START CONTEXT ---\n${context}\n--- END CONTEXT ---`);
        const agent = (0, aiServiceFactory_1.getAgentService)(model);
        const aiResponse = await agent.getAIDebugAction(context);
        console.log(`[AI Service] AI Response received:`, aiResponse);
        res.status(200).json(aiResponse);
    }
    catch (error) {
        console.error(`[AI Service] Error in /getDebugAction:`, error);
        res.status(500).json({ error: error.name, message: error.message });
    }
});
app.post('/api/v1/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    console.log(`[Server] File uploaded: ${req.file.path}`);
    res.json({
        filePath: req.file.path,
        fileName: req.file.originalname
    });
});
app.post('/api/v1/session/start', async (req, res) => {
    try {
        const { scriptPath } = req.body;
        if (!scriptPath)
            return res.status(400).json({ error: 'scriptPath is required' });
        let absolutePath = scriptPath;
        if (!path.isAbsolute(scriptPath)) {
            absolutePath = path.resolve(scriptPath);
        }
        const session = sessionManager_1.sessionManager.createSession();
        await session.start(absolutePath);
        res.status(200).json({ sessionId: session.id, status: 'started' });
    }
    catch (error) {
        console.error('[Server] Session Start Error:', error);
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/v1/session/:id/request', async (req, res) => {
    try {
        const { command, args } = req.body;
        const session = sessionManager_1.sessionManager.getSession(req.params.id);
        if (!session)
            return res.status(404).json({ error: 'Session not found' });
        const response = await session.sendRequest(command, args || {});
        res.json(response);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/v1/session/:id/events', (req, res) => {
    console.log(`[Event Service] === /events API called for session: ${req.params.id} ===`);
    const session = sessionManager_1.sessionManager.getSession(req.params.id);
    if (!session) {
        console.log(`[Event Service] Session not found.`);
        return res.status(404).json({ error: 'Session not found' });
    }
    const events = session.flushEvents();
    console.log(`[Event Service] Flushing ${events.length} events.`);
    if (events.length > 0) {
        // --- 修复：将 e 转换为 any 来访问 'event' 属性 ---
        console.log(`[Event Service] Events being sent:`, events.map((e) => e.event));
    }
    res.json(events);
});
app.delete('/api/v1/session/:id', (req, res) => {
    sessionManager_1.sessionManager.deleteSession(req.params.id);
    res.json({ status: 'stopped' });
});
app.listen(PORT, () => {
    console.log(`[Server] Augur AI Debugger Service is running on http://localhost:${PORT}`);
    if (proxyUrl)
        console.log(`[Server] 🛡️ Proxy enabled: ${proxyUrl}`);
});
