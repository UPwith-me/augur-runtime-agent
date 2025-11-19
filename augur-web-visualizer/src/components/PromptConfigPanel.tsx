import React, { useState } from 'react';
// Fix: Remove file extensions from imports to fix module resolution errors.
import { useI18n } from '../lib/i18n';
// FIX: Removed file extension from import for proper module resolution.
import type { PromptConfig } from '../types';
// Fix: Remove file extensions from imports to fix module resolution errors.
import { InformationCircleIcon, ChevronDownIcon, SparklesIcon } from './icons';

interface PromptConfigPanelProps {
    config: PromptConfig;
    onConfigChange: (newConfig: PromptConfig) => void;
}

export const PromptConfigPanel: React.FC<PromptConfigPanelProps> = ({ config, onConfigChange }) => {
    const { t } = useI18n();
    const [isOpen, setIsOpen] = useState(false);

    const handleSystemPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onConfigChange({ ...config, systemPrompt: e.target.value });
    };

    const handleContextWindowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onConfigChange({ ...config, codeContextWindow: parseInt(e.target.value, 10) });
    };

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg">
            <button
                className="w-full flex justify-between items-center p-3 text-left"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-controls="prompt-config-content"
            >
                <div className="flex items-center">
                    <SparklesIcon className="w-5 h-5 text-indigo-400 mr-3" />
                    <h3 className="font-semibold text-white">{t('promptConfig.title')}</h3>
                </div>
                <ChevronDownIcon className={`w-5 h-5 text-gray-400 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div id="prompt-config-content" className="p-4 space-y-4 border-t border-gray-700">
                    <div>
                        <label htmlFor="system-prompt" className="flex items-center text-sm font-medium text-gray-300 mb-1">
                            {t('promptConfig.systemPrompt.label')}
                            <span title={t('promptConfig.systemPrompt.tooltip')}>
                                <InformationCircleIcon className="w-4 h-4 ml-1.5 text-gray-500"/>
                            </span>
                        </label>
                        <textarea
                            id="system-prompt"
                            value={config.systemPrompt}
                            onChange={handleSystemPromptChange}
                            rows={5}
                            className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-sm text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label htmlFor="context-window" className="flex items-center text-sm font-medium text-gray-300 mb-1">
                            {t('promptConfig.codeContext.label')}
                             <span title={t('promptConfig.codeContext.tooltip')}>
                                <InformationCircleIcon className="w-4 h-4 ml-1.5 text-gray-500"/>
                            </span>
                        </label>
                        <input
                            type="number"
                            id="context-window"
                            value={config.codeContextWindow}
                            onChange={handleContextWindowChange}
                            min="1"
                            max="20"
                            className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-sm text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};