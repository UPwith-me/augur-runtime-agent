import React from 'react';
// Fix: Remove file extensions from imports to fix module resolution errors.
import { useI18n } from '../lib/i18n';

const PatternA: React.FC = () => (
    <svg width="100%" height="200" viewBox="0 0 400 120" className="max-w-md">
        <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#60a5fa" />
            </marker>
        </defs>
        
        {/* Boxes */}
        <rect x="10" y="35" width="100" height="50" rx="5" fill="#1f2937" stroke="#4b5563" />
        <text x="60" y="60" fontFamily="sans-serif" fontSize="12" fill="#d1d5db" textAnchor="middle">VS Code</text>
        <text x="60" y="74" fontFamily="sans-serif" fontSize="10" fill="#9ca3af" textAnchor="middle">(Debugger UI)</text>

        <rect x="290" y="35" width="100" height="50" rx="5" fill="#1f2937" stroke="#4b5563" />
        <text x="340" y="60" fontFamily="sans-serif" fontSize="12" fill="#d1d5db" textAnchor="middle">Python App</text>
         <text x="340" y="74" fontFamily="sans-serif" fontSize="10" fill="#9ca3af" textAnchor="middle">(debugpy)</text>

        <rect x="150" y="10" width="100" height="100" rx="5" fill="#374151" stroke="#6b7280" />
        <text x="200" y="30" fontFamily="sans-serif" fontSize="12" fill="white" textAnchor="middle">AI Agent Plugin</text>
        <text x="200" y="55" fontFamily="sans-serif" fontSize="10" fill="#d1d5db" textAnchor="middle">DAP Interceptor</text>
        <text x="200" y="75" fontFamily="sans-serif" fontSize="10" fill="#d1d5db" textAnchor="middle">Context Builder</text>
         <text x="200" y="95" fontFamily="sans-serif" fontSize="10" fill="#d1d5db" textAnchor="middle">Gemini Call</text>

        {/* Arrows */}
        <line x1="115" y1="60" x2="145" y2="60" stroke="#60a5fa" strokeWidth="2" markerEnd="url(#arrow)" />
        <line x1="255" y1="60" x2="285" y2="60" stroke="#60a5fa" strokeWidth="2" markerEnd="url(#arrow)" />

        <text x="130" y="53" fontFamily="sans-serif" fontSize="9" fill="#9ca3af">DAP</text>
        <text x="270" y="53" fontFamily="sans-serif" fontSize="9" fill="#9ca3af">DAP</text>
    </svg>
);

const PatternB: React.FC = () => (
    <svg width="100%" height="200" viewBox="0 0 400 120" className="max-w-md">
        {/* Boxes */}
        <rect x="10" y="35" width="80" height="50" rx="5" fill="#1f2937" stroke="#4b5563" />
        <text x="50" y="60" fontFamily="sans-serif" fontSize="12" fill="#d1d5db" textAnchor="middle">VS Code</text>
        <text x="50" y="74" fontFamily="sans-serif" fontSize="10" fill="#9ca3af" textAnchor="middle">(Thin Client)</text>

        <rect x="310" y="35" width="80" height="50" rx="5" fill="#1f2937" stroke="#4b5563" />
        <text x="350" y="60" fontFamily="sans-serif" fontSize="12" fill="#d1d5db" textAnchor="middle">Python App</text>
        <text x="350" y="74" fontFamily="sans-serif" fontSize="10" fill="#9ca3af" textAnchor="middle">(debugpy)</text>

        <rect x="110" y="10" width="180" height="100" rx="5" fill="#374151" stroke="#6b7280" />
        <text x="200" y="30" fontFamily="sans-serif" fontSize="12" fill="white" textAnchor="middle">AI Debugger Service (Server)</text>
        <text x="200" y="55" fontFamily="sans-serif" fontSize="10" fill="#d1d5db" textAnchor="middle">DAP Proxy</text>
        <text x="200" y="75" fontFamily="sans-serif" fontSize="10" fill="#d1d5db" textAnchor="middle">Context Pipeline</text>
        <text x="200" y="95" fontFamily="sans-serif" fontSize="10" fill="#d1d5db" textAnchor="middle">Gemini Call</text>

        {/* Arrows */}
        <line x1="95" y1="60" x2="105" y2="60" stroke="#60a5fa" strokeWidth="2" markerEnd="url(#arrow)" />
        <line x1="295" y1="60" x2="305" y2="60" stroke="#60a5fa" strokeWidth="2" markerEnd="url(#arrow)" />

        <text x="95" y="53" fontFamily="sans-serif" fontSize="9" fill="#9ca3af" textAnchor="middle">DAP</text>
        <text x="295" y="53" fontFamily="sans-serif" fontSize="9" fill="#9ca3af" textAnchor="middle">DAP</text>
    </svg>
);


export const ArchitectureDiagram: React.FC = () => {
    const { t } = useI18n();
    const [pattern, setPattern] = React.useState<'A' | 'B'>('B');

    return (
        <div className="bg-gray-800/50 rounded-lg shadow-lg border border-gray-700 p-6 h-full flex flex-col">
            <h3 className="text-xl font-bold text-white mb-2">{t('arch.title')}</h3>
            <p className="text-sm text-gray-400 mb-4">{t('arch.description')}</p>
            
            <div className="flex items-center bg-gray-900 border border-gray-700 rounded-full p-1 text-sm mb-4">
                <button
                    onClick={() => setPattern('A')}
                    className={`flex-1 text-center px-3 py-1 rounded-full transition-colors ${pattern === 'A' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                    aria-pressed={pattern === 'A'}
                >
                   {t('arch.patternA.title')}
                </button>
                <button
                    onClick={() => setPattern('B')}
                    className={`flex-1 text-center px-3 py-1 rounded-full transition-colors ${pattern === 'B' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                    aria-pressed={pattern === 'B'}
                >
                    {t('arch.patternB.title')}
                </button>
            </div>

            <div className="flex-grow flex flex-col justify-between">
                <div className="flex justify-center items-center bg-gray-900 rounded-md p-4 flex-grow">
                    {pattern === 'A' ? <PatternA /> : <PatternB />}
                </div>

                <div className="mt-4 text-sm text-gray-300 bg-gray-700/50 p-3 rounded-md">
                    <p>{pattern === 'A' ? t('arch.patternA.desc') : t('arch.patternB.desc')}</p>
                </div>
            </div>
        </div>
    );
};