import React from 'react';
// Fix: Remove file extensions from imports to fix module resolution errors.
import { useAI } from '../contexts/AIProvider';
// Fix: Remove file extensions from imports to fix module resolution errors.
import { useI18n } from '../lib/i18n';
// FIX: Removed file extension from import for proper module resolution.
import type { AiModel } from '../types';

export const AIModelSelector: React.FC = () => {
    const { selectedModel, setSelectedModel } = useAI();
    const { t } = useI18n();

    const models: { id: AiModel, name: string }[] = [
        { id: 'gemini-2.5-flash', name: t('aiModel.gemini-2.5-flash') },
        { id: 'mock', name: t('aiModel.mock') },
        // Updated to Claude 4.5 Sonnet
        { id: 'claude-4-5-sonnet', name: t('aiModel.claude-4-5-sonnet') }
    ];

    const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedModel(event.target.value as AiModel);
    };

    return (
        <div className="flex items-center space-x-2 text-sm">
            <label htmlFor="ai-model-selector" className="text-gray-400">{t('aiModel.selector.label')}</label>
            <select
                id="ai-model-selector"
                value={selectedModel}
                onChange={handleChange}
                className="bg-gray-700 border border-gray-600 text-white rounded-md px-2 py-1 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
                {models.map(model => (
                    <option key={model.id} value={model.id}>
                        {model.name}
                    </option>
                ))}
            </select>
        </div>
    );
};