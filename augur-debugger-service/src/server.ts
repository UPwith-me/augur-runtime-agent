import express, { Request, Response } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import multer from 'multer'; 
import { setGlobalDispatcher, ProxyAgent } from 'undici';
import { GenerateSimulationRequest, GetDebugActionRequest, AiModel } from './types';
import { getAgentService } from './aiServiceFactory';
import { sessionManager } from './session/sessionManager';
import { enforceFreeTierLimit } from './rateLimiter'; // 导入速率限制器

// --- Server Initialization ---
dotenv.config();

const PORT = 4000;
const app = express();

// --- Proxy Config ---
const proxyUrl = process.env.PROXY_URL;
if (proxyUrl) {
    console.log(`[Server] 🛡️ Proxy enabled! Routing traffic through: ${proxyUrl}`);
    const dispatcher = new ProxyAgent(proxyUrl);
    setGlobalDispatcher(dispatcher);
}

// --- File Upload Config ---
const UPLOAD_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOAD_DIR)
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
})
const upload = multer({ storage: storage });

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Routes ---
app.get('/', (req: Request, res: Response) => {
    res.send('🤖 Augur AI Debugger Service is running correctly!');
});

app.post('/api/v1/generateSimulation', async (req: Request, res: Response) => {
    try {
        const { code, model } = req.body as GenerateSimulationRequest;
        const agent = getAgentService(model);
        const simulationSteps = await agent.generateSimulation(code);
        res.status(200).json(simulationSteps);
    } catch (error: any) {
        res.status(500).json({ error: error.name, message: error.message });
    }
});

app.post('/api/v1/getDebugAction', async (req: Request, res: Response) => {
    console.log(`\n[AI Service] === /getDebugAction Request Received ===`);
    try {
        const { context, model, plan } = req.body as GetDebugActionRequest;

        console.log(`[AI Service] Model: ${model}, Plan: ${plan || 'paid (default)'}`);

        // 如果是免费套餐，则执行速率限制
        if (plan === 'free') {
            await enforceFreeTierLimit();
        }

        console.log(`[AI Service] Context being sent to AI: \n--- START CONTEXT ---\n${context}\n--- END CONTEXT ---`);

        const agent = getAgentService(model);
        const aiResponse = await agent.getAIDebugAction(context);

        console.log(`[AI Service] AI Response received:`, aiResponse);
        res.status(200).json(aiResponse);

    } catch (error: any) {
        console.error(`[AI Service] Error in /getDebugAction:`, error);
        res.status(500).json({ error: error.name, message: error.message });
    }
});


app.post('/api/v1/upload', upload.single('file'), (req: Request, res: Response) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    console.log(`[Server] File uploaded: ${req.file.path}`);
    res.json({
        filePath: req.file.path,
        fileName: req.file.originalname
    });
});

app.post('/api/v1/session/start', async (req: Request, res: Response) => {
    try {
        const { scriptPath } = req.body;
        if (!scriptPath) return res.status(400).json({ error: 'scriptPath is required' });

        let absolutePath = scriptPath;
        if (!path.isAbsolute(scriptPath)) {
             absolutePath = path.resolve(scriptPath);
        }

        const session = sessionManager.createSession();
        await session.start(absolutePath);

        res.status(200).json({ sessionId: session.id, status: 'started' });
    } catch (error: any) {
        console.error('[Server] Session Start Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/v1/session/:id/request', async (req: Request, res: Response) => {
    try {
        const { command, args } = req.body;
        const session = sessionManager.getSession(req.params.id);
        if (!session) return res.status(404).json({ error: 'Session not found' });
        const response = await session.sendRequest(command, args || {});
        res.json(response);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/v1/session/:id/events', (req: Request, res: Response) => {
    console.log(`[Event Service] === /events API called for session: ${req.params.id} ===`);
    const session = sessionManager.getSession(req.params.id);
    if (!session) {
        console.log(`[Event Service] Session not found.`);
        return res.status(404).json({ error: 'Session not found' });
    }
    const events = session.flushEvents();
    console.log(`[Event Service] Flushing ${events.length} events.`);
    if (events.length > 0) {
        // --- 修复：将 e 转换为 any 来访问 'event' 属性 ---
        console.log(`[Event Service] Events being sent:`, events.map((e: any) => e.event));
    }
    res.json(events);
});

app.delete('/api/v1/session/:id', (req: Request, res: Response) => {
    sessionManager.deleteSession(req.params.id);
    res.json({ status: 'stopped' });
});

app.listen(PORT, () => {
    console.log(`[Server] Augur AI Debugger Service is running on http://localhost:${PORT}`);
    if (proxyUrl) console.log(`[Server] 🛡️ Proxy enabled: ${proxyUrl}`);
});