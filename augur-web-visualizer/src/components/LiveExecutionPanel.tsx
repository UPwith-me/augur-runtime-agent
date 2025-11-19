import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import { ArrowUpTrayIcon, PlayIcon, StopIcon, ServerStackIcon, WrenchScrewdriverIcon } from './icons';

interface LogEntry {
    timestamp: string;
    source: 'System' | 'Debugger' | 'AI' | 'Error';
    message: string;
    details?: any;
}

const API_BASE_URL = '/api/v1';

interface LiveExecutionPanelProps {
    apiPlan: 'free' | 'paid';
}

export const LiveExecutionPanel: React.FC<LiveExecutionPanelProps> = ({ apiPlan }) => {
    const { t } = useI18n();
    const [file, setFile] = useState<File | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [pendingFix, setPendingFix] = useState<string | null>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const [userCodePath, setUserCodePath] = useState<string | null>(null);
    const [pendingStoppedEventBody, setPendingStoppedEventBody] = useState<any | null>(null);

    const addLog = useCallback((source: LogEntry['source'], message: string, details?: any) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, { timestamp, source, message, details }]);
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const urlSessionId = params.get('sessionId');
        if (urlSessionId && !sessionId) {
            setSessionId(urlSessionId);
            setIsRunning(true);
            addLog('System', `Connected to existing session from URL. ID: ${urlSessionId.substring(0, 8)}...`);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [sessionId, addLog]);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const sendDapRequest = useCallback(async (command: string, args: any = {}): Promise<any> => {
        if (!sessionId) {
            addLog('Error', 'Session ID is missing, cannot send command.');
            return null;
        }
        addLog('System', `Executing command: ${command}`, args);
        try {
            const res = await fetch(`${API_BASE_URL}/session/${sessionId}/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command, args })
            });
            const responseData = await res.json();
            if (!res.ok) {
                throw new Error(responseData.error || `DAP command '${command}' failed`);
            }
            addLog('System', `Command '${command}' acknowledged.`);
            return responseData;
        } catch (e: any) {
            addLog('Error', `DAP command failed: ${e.message}`);
            return null;
        }
    }, [sessionId, addLog]);

    const fetchRichContext = useCallback(async (threadId: number, mainCodePath: string): Promise<any> => {
        try {
            addLog('System', 'Fetching full stack trace...');
            const stackTraceRes = await sendDapRequest('stackTrace', { threadId: threadId, startFrame: 0, levels: 20 });
            addLog('Debugger', 'Received stackTrace response body', stackTraceRes?.body);
            if (!stackTraceRes?.body?.stackFrames || stackTraceRes.body.stackFrames.length === 0) {
                throw new Error('Failed to get stack trace or stack is empty.');
            }

            const frames = stackTraceRes.body.stackFrames || [];

            const normalizePath = (p: string | undefined): string => p ? p.replace(/\\/g, '/') : '';
            const normalizedMainCodePath = normalizePath(mainCodePath);
            const mainCodeName = mainCodePath.split(/[\\/]/).pop();
            addLog('System', `Normalized user path for comparison: ${normalizedMainCodePath}`);

            let frame: any = null;
            frame = frames.find((f: any) => normalizePath(f.source?.path) === normalizedMainCodePath);
            if (!frame) {
                addLog('System', 'Path match failed. Trying fallback: presentationHint or name match...');
                frame = frames.find((f: any) =>
                    f.source?.presentationHint === 'normal' ||
                    f.source?.name === mainCodeName
                );
            }
            if (!frame) {
                addLog('Error', 'Could not find a confident user stack frame. Falling back to frame 0.');
                frame = frames[0];
            }
            if (!frame) throw new Error('Stack is empty after all checks.');

            const frameId = frame.id;
            const line = frame.line;
            const sourceName = mainCodeName || frame.source?.name || 'unknown_file';

            addLog('System', `Found target frame: ${sourceName} at line ${line} (Frame ID: ${frameId})`);

            addLog('System', 'Fetching scopes...');
            const scopesRes = await sendDapRequest('scopes', { frameId: frameId });
            if (!scopesRes?.body?.scopes) throw new Error('Failed to get scopes.');

            let localScope = scopesRes.body.scopes.find((s: any) => s.name === 'Locals');
            if (!localScope) {
                addLog('System', "No 'Locals' scope found, falling back to first available scope.");
                localScope = scopesRes.body.scopes[0];
                if (!localScope) throw new Error("Could not find any variable scopes.");
            }
            const variablesReference = localScope.variablesReference;

            addLog('System', 'Fetching variables...');
            const variablesRes = await sendDapRequest('variables', { variablesReference: variablesReference });
            if (!variablesRes) throw new Error('Failed to get variables.');

            const variables = (variablesRes.body?.variables || []).reduce((acc: any, v: any) => {
                if (v.name.startsWith('__') && v.name.endsWith('__')) return acc;
                acc[v.name] = v.value;
                return acc;
            }, {});

            const richContext = {
                reason: 'stopped',
                line: line,
                source: sourceName,
                variables: variables
            };
            addLog('System', 'Rich context built successfully.');
            return richContext;

        } catch (e: any) {
            addLog('Error', `Failed to fetch rich context: ${e.message}`);
            return {
                reason: 'stopped',
                error: `Failed to fetch context: ${e.message}`
            };
        }
    }, [addLog, sendDapRequest]);

    const getAiAction = useCallback(async (context: any, threadId: number) => {
        if (!apiPlan) {
            addLog('Error', 'API plan prop is missing. This is a bug.');
            return;
        }
        addLog('AI', 'Analyzing runtime state...', context);

        const MAX_RETRIES = 3;
        const RETRY_DELAY = 2000;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const res = await fetch(`${API_BASE_URL}/getDebugAction`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: 'gemini-2.5-pro',
                        context: JSON.stringify(context),
                        plan: apiPlan
                    })
                });

                if (res.status >= 500) {
                    throw new Error(`Server error: ${res.status}. Retrying...`);
                }

                const aiResponse = await res.json();
                if (res.ok) {
                    addLog('AI', `Suggestion: ${aiResponse.tool}. ${aiResponse.explanation}`, aiResponse);

                    if (!threadId) {
                        addLog('Error', 'No active thread ID passed to getAiAction.');
                        return;
                    }

                    switch (aiResponse.tool) {
                        case 'stepOver':
                            sendDapRequest('next', { threadId: threadId });
                            break;
                        case 'stepIn':
                        case 'stepInto':
                            sendDapRequest('stepIn', { threadId: threadId });
                            break;
                        case 'stepOut':
                            sendDapRequest('stepOut', { threadId: threadId });
                            break;
                        case 'continue':
                            sendDapRequest('continue', { threadId: threadId });
                            break;
                        default:
                            addLog('AI', `AI tool '${aiResponse.tool}' not yet implemented.`);
                    }
                    return;
                } else {
                    throw new Error(aiResponse.error || 'Unknown AI error (non-500)');
                }

            } catch (e: any) {
                if (attempt < MAX_RETRIES) {
                    addLog('System', `Reconnecting... (Attempt ${attempt}/${MAX_RETRIES}) - ${e.message}`);
                    await new Promise(r => setTimeout(r, RETRY_DELAY));
                } else {
                    addLog('Error', `AI Action failed (all retries): ${e.message}`);
                }
            }
        }
    }, [addLog, sendDapRequest, apiPlan]);

    useEffect(() => {
        if (userCodePath && pendingStoppedEventBody) {
            addLog('System', `Path is ready. Processing pending 'stopped' event.`);
            const threadId = pendingStoppedEventBody.threadId;
            if (threadId) {
                fetchRichContext(threadId, userCodePath)
                    .then(richContext => {
                        getAiAction(richContext, threadId);
                    });
            } else {
                 addLog('Error', 'Pending stopped event was missing a threadId.');
            }
            setPendingStoppedEventBody(null);
        }
    }, [userCodePath, pendingStoppedEventBody, addLog, fetchRichContext, getAiAction]);

    useEffect(() => {
        let intervalId: any;
        if (sessionId && isRunning) {
            intervalId = setInterval(async () => {
                try {
                    const res = await fetch(`/api/v1/session/${sessionId}/events`);
                    if (res.ok) {
                        const events = await res.json();
                        if (events && events.length > 0) {
                            for (const e of events) {
                                addLog('Debugger', `Event: ${e.event}`, e.body);

                                if (e.event === 'process' || e.event === 'module') {
                                    const path = e.body?.name || e.body?.module?.path;
                                    if (path && !userCodePath) {
                                        setUserCodePath(path);
                                    }
                                } else if (e.event === 'stopped') {
                                    setPendingStoppedEventBody(e.body);
                                } else if (e.event === 'terminated') {
                                    addLog('System', 'Session terminated. Python script finished execution.');
                                    setIsRunning(false);
                                    clearInterval(intervalId);
                                    setSessionId(null);
                                    setUserCodePath(null);
                                    setPendingStoppedEventBody(null);
                                    break;
                                }
                            }
                        }
                    } else if (res.status === 404) {
                        setIsRunning(false);
                        addLog('System', 'Session disconnected or terminated by server.');
                        clearInterval(intervalId);
                    }
                } catch (e) {
                    console.error("Polling error", e);
                }
            }, 1000);
        }
        return () => clearInterval(intervalId);
    }, [sessionId, isRunning, userCodePath, addLog]);

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.name.endsWith('.py')) {
                setFile(droppedFile);
                addLog('System', `File loaded: ${droppedFile.name}`);
                await uploadFile(droppedFile);
            } else {
                addLog('Error', 'Only .py files are supported via drag & drop. Use VS Code extension for folders.');
            }
        }
    };

    const uploadFile = async (f: File) => {
        const formData = new FormData();
        formData.append('file', f);
        addLog('System', 'Uploading file to server...');
        try {
            const res = await fetch(`/api/v1/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                addLog('System', 'Upload successful.', { path: data.filePath });
                return data.filePath;
            } else {
                throw new Error(data.error);
            }
        } catch (e: any) {
            addLog('Error', `Upload failed: ${e.message}`);
            return null;
        }
    };

    const startSession = async () => {
        if (!file) return;
        const filePath = await uploadFile(file);
        if (!filePath) return;

        addLog('System', 'Initializing headless debug session...');
        try {
            const res = await fetch(`/api/v1/session/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scriptPath: filePath })
            });
            const data = await res.json();

            if (res.ok) {
                setSessionId(data.sessionId);
                setIsRunning(true);
                addLog('System', `Session started. ID: ${data.sessionId.substring(0, 8)}...`);
            } else {
                throw new Error(data.error);
            }
        } catch (e: any) {
            addLog('Error', `Failed to start session: ${e.message}`);
        }
    };

    const stopSession = async () => {
        if (!sessionId) return;
        try {
            await fetch(`/api/v1/session/${sessionId}`, { method: 'DELETE' });
            addLog('System', 'Session terminated by user.');
            setIsRunning(false);
            setSessionId(null);
            setUserCodePath(null);
            setPendingStoppedEventBody(null);
        } catch (e: any) {
            addLog('Error', `Failed to stop session: ${e.message}`);
        }
    };

    const simulateAiFix = () => {
        setPendingFix(`def calculate_sum(n):\n-    return n * n\n+    return n * (n + 1) // 2`);
        addLog('AI', 'Proposing a fix for logic error at line 42.');
    };

    const acceptFix = () => {
        addLog('System', 'Fix accepted. Patching file...');
        addLog('System', 'Restarting session with patched code...');
        setPendingFix(null);
    };

    return (
        <div className="flex flex-col h-[600px] bg-gray-900 text-white rounded-xl overflow-hidden border border-gray-700 shadow-2xl">
            <div className="bg-gray-800 p-4 flex items-center justify-between border-b border-gray-700">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 bg-black/30 px-3 py-1.5 rounded-lg border border-gray-600">
                        <span className="text-gray-400 text-sm">{t('live.target')}</span>
                        <span className="font-mono text-blue-400 font-bold">
                            {sessionId ? t('live.target.remoteSession', { sessionId: sessionId.substring(0,6) }) : (file ? file.name : t('live.target.noFile'))}
                        </span>
                    </div>
                    {!isRunning ? (
                        <button
                            onClick={startSession}
                            disabled={!file}
                            className="flex items-center px-4 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-medium transition-colors"
                        >
                            <PlayIcon className="w-4 h-4 mr-2"/> {t('live.run')}
                        </button>
                    ) : (
                        <button
                            onClick={stopSession}
                            className="flex items-center px-4 py-1.5 bg-red-600 hover:bg-red-500 rounded-md font-medium transition-colors animate-pulse"
                        >
                            <StopIcon className="w-4 h-4 mr-2"/> {t('live.stop')}
                        </button>
                    )}
                </div>
                <div className="text-xs text-gray-500 flex items-center">
                    <ServerStackIcon className="w-4 h-4 mr-1"/>
                    {t('live.connectedTo')}
                </div>
            </div>

            <div className="flex-1 flex relative min-h-0">
                {(!file && !sessionId) && (
                     <div
                        className={`absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-900/90 border-2 border-dashed transition-colors ${isDragging ? 'border-blue-500 bg-blue-900/20' : 'border-gray-600'}`}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                    >
                        <ArrowUpTrayIcon className="w-16 h-16 text-gray-500 mb-4"/>
                        <p className="text-xl text-gray-300 font-medium">{t('live.drop.title')}</p>
                        <p className="text-gray-500 mt-2">{t('live.drop.subtitle')}</p>
                        <input
                            type="file"
                            className="hidden"
                            id="file-upload"
                            accept=".py"
                            onChange={(e) => e.target.files?.[0] && handleDrop({ preventDefault:()=>{}, dataTransfer: { files: e.target.files } } as any)}
                        />
                        <label htmlFor="file-upload" className="mt-6 px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded cursor-pointer text-sm">
                            {t('live.drop.browse')}
                        </label>
                    </div>
                )}

                <div className="flex-1 bg-black font-mono text-sm p-4 overflow-y-auto font-ligatures-contextual">
                    {logs.length === 0 && (file || sessionId) && <div className="text-gray-600 italic">{t('live.log.initializing')}</div>}

                    {logs.map((log, i) => (
                        <div key={i} className="mb-1.5 animate-in fade-in slide-in-from-left-2 duration-300">
                            <span className="text-gray-600 mr-2">[{log.timestamp}]</span>
                            <span className={`font-bold mr-2 ${
                                log.source === 'AI' ? 'text-purple-400' :
                                log.source === 'Debugger' ? 'text-blue-400' :
                                log.source === 'Error' ? 'text-red-500' : 'text-green-400'
                            }`}>
                                [{log.source}]
                            </span>
                            <span className="text-gray-300">{log.message}</span>
                            {log.details && (
                                <pre className="mt-1 ml-8 text-xs text-gray-500 bg-gray-900/50 p-1 rounded overflow-x-auto">
                                    {JSON.stringify(log.details, null, 2)}
                                </pre>
                            )}
                        </div>
                    ))}

                    {isRunning && !pendingFix && (
                        <button onClick={simulateAiFix} className="mt-10 text-xs text-gray-800 hover:text-gray-600">
                            [Dev: Simulate Fix Event]
                        </button>
                    )}

                    <div ref={logsEndRef} />
                </div>

                {pendingFix && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gray-800/95 border-t-2 border-yellow-500 p-6 backdrop-blur-sm animate-in slide-in-from-bottom-10 duration-300">
                        <div className="flex items-start space-x-4">
                            <div className="bg-yellow-500/20 p-3 rounded-full">
                                <WrenchScrewdriverIcon className="w-8 h-8 text-yellow-500"/>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-white mb-1">{t('live.fix.propose.title')}</h3>
                                <p className="text-gray-400 text-sm mb-3">{t('live.fix.propose.desc')}</p>
                                <div className="bg-black p-3 rounded border border-gray-700 font-mono text-sm mb-4">
                                    <code className="text-green-400">{pendingFix}</code>
                                </div>
                                <div className="flex space-x-3">
                                    <button
                                        onClick={acceptFix}
                                        className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded shadow-lg transition-transform hover:scale-105"
                                    >
                                        {t('live.fix.accept')}
                                    </button>
                                    <button
                                        onClick={() => setPendingFix(null)}
                                        className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium rounded"
                                    >
                                        {t('live.fix.reject')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};