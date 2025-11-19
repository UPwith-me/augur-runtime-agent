import { PythonSession } from './pythonSession';
import * as crypto from 'crypto';

class SessionManager {
    private sessions = new Map<string, PythonSession>();

    public createSession(): PythonSession {
        const id = crypto.randomUUID();
        const session = new PythonSession(id);
        this.sessions.set(id, session);
        return session;
    }

    public getSession(id: string): PythonSession | undefined {
        return this.sessions.get(id);
    }

    public deleteSession(id: string) {
        const session = this.sessions.get(id);
        if (session) {
            session.stop();
            this.sessions.delete(id);
        }
    }
}

export const sessionManager = new SessionManager();