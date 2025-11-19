import React, { createContext, useState, useContext, useMemo } from 'react';
// FIX: Removed file extension from import for proper module resolution.
import type { AiModel } from '../types';

interface AIContextType {
    selectedModel: AiModel;
    setSelectedModel: (model: AiModel) => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export const AIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [selectedModel, setSelectedModel] = useState<AiModel>('gemini-2.5-flash');

    const value = useMemo(() => ({
        selectedModel,
        setSelectedModel,
    }), [selectedModel]);

    return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
};

export const useAI = (): AIContextType => {
    const context = useContext(AIContext);
    if (!context) {
        throw new Error('useAI must be used within an AIProvider');
    }
    return context;
};
