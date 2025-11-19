import React, { useRef, useEffect } from 'react';
// FIX: Removed file extension from import for proper module resolution.
import type { DapMessage } from '../types';
// Fix: Remove file extensions from imports to fix module resolution errors.
import { useI18n } from '../lib/i18n';
// Fix: Remove file extensions from imports to fix module resolution errors.
import { ArrowDownTrayIcon, ArrowUpTrayIcon, ChatBubbleLeftRightIcon } from './icons';

interface DapLogPanelProps {
    log: DapMessage[];
}

const MessageTypeIcon: React.FC<{ type: DapMessage['type'], direction: DapMessage['direction'] }> = ({ type, direction }) => {
    const { t } = useI18n();
    if (direction === 'out') {
        return <ArrowUpTrayIcon className="w-4 h-4 text-blue-400" title={t('dap.request')} />;
    }
    if (type === 'event') {
        return <ArrowDownTrayIcon className="w-4 h-4 text-purple-400" title={t('dap.event')} />;
    }
    return <ArrowDownTrayIcon className="w-4 h-4 text-green-400" title={t('dap.response')} />;
};

export const DapLogPanel: React.FC<DapLogPanelProps> = ({ log }) => {
    const { t } = useI18n();
    const logContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [log]);

    const getMessageColor = (type: DapMessage['type'], direction: DapMessage['direction']) => {
        if (direction === 'out') return 'text-blue-300'; // Request
        if (type === 'event') return 'text-purple-300'; // Event
        return 'text-green-300'; // Response
    };

    return (
        <div className="bg-gray-800/50 rounded-lg shadow-lg border border-gray-700 flex flex-col h-96">
            <div className="flex items-center p-3 bg-gray-700/50 border-b border-gray-600">
                <ChatBubbleLeftRightIcon className="w-5 h-5 text-indigo-400 mr-2" />
                <h3 className="font-semibold text-white">{t('dap.title')}</h3>
            </div>
            <div ref={logContainerRef} className="flex-grow p-4 overflow-y-auto font-mono text-xs">
                {log.length === 0 && <p className="text-gray-500 italic">{t('dap.initial')}</p>}
                {log.map((msg) => (
                    <div key={msg.id} className="mb-2 flex items-start">
                        <div className="w-8 flex-shrink-0"><MessageTypeIcon type={msg.type} direction={msg.direction} /></div>
                        <div className="flex-grow">
                            <span className={`font-bold ${getMessageColor(msg.type, msg.direction)}`}>{msg.command}</span>
                            <span className="text-gray-500 ml-2">({msg.type})</span>
                            <div className="text-gray-400 pl-2 border-l border-gray-700 ml-1 mt-1">
                                {JSON.stringify(msg.payload)}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};