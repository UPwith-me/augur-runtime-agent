import React from 'react';
// Fix: Remove file extensions from imports to fix module resolution errors.
import { useI18n } from '../lib/i18n';
// Fix: Remove file extensions from imports to fix module resolution errors.
import { Bars3Icon, VariableIcon } from './icons';

interface StatePanelProps {
    callStack: string[];
    variables: Record<string, any>;
    highlightedVariable: string | null;
}

export const StatePanel: React.FC<StatePanelProps> = ({ callStack, variables, highlightedVariable }) => {
    const { t } = useI18n();

    return (
        <div className="bg-gray-800/50 rounded-lg shadow-lg border border-gray-700 h-full flex flex-col">
            <div className="p-3 bg-gray-700/50 border-b border-gray-600">
                <div className="flex items-center">
                    <Bars3Icon className="w-5 h-5 text-indigo-400 mr-2" />
                    <h3 className="font-semibold text-white">{t('state.title')}</h3>
                </div>
            </div>
            <div className="p-4 space-y-4 flex-grow">
                <div>
                    <h4 className="font-medium text-sm text-gray-300 mb-2">{t('state.callStack')}</h4>
                    <ul className="space-y-1 text-sm text-gray-400">
                        {callStack.length > 0 ? callStack.map((frame, index) => (
                            <li key={index} className="bg-gray-700/60 p-2 rounded-md">
                                {frame}
                            </li>
                        )) : <li className="italic">{t('state.noStack')}</li>}
                    </ul>
                </div>
                 <div>
                    <h4 className="font-medium text-sm text-gray-300 mb-2 flex items-center"><VariableIcon className="w-4 h-4 mr-2"/>{t('state.localVars')}</h4>
                    <div className="space-y-1 text-sm font-mono bg-gray-900 p-3 rounded-md overflow-x-auto">
                        {Object.entries(variables).length > 0 ? Object.entries(variables).map(([key, value]) => (
                            <div key={key} className={`p-1 rounded transition-colors ${key === highlightedVariable ? 'bg-yellow-900/50 ring-1 ring-yellow-500' : ''}`}>
                                <span className="text-cyan-400">{key}</span>: <span className="text-orange-300">{JSON.stringify(value)}</span>
                            </div>
                        )) : <div className="italic text-gray-500">{t('state.noVars')}</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};