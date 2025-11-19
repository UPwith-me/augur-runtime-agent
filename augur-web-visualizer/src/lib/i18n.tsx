import React, { createContext, useState, useContext, useCallback, useMemo } from 'react';

type Language = 'en' | 'zh';

// 1. 定义变量的类型
type TranslationVariables = Record<string, string | number>;

interface I18nContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    // 2. 升级 t 函数的类型定义，使其接受可选的第二个参数
    t: (key: string, variables?: TranslationVariables) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

import enTranslations from '@/locales/en.json';
import zhTranslations from '@/locales/zh.json';

const translationsData = {
    en: enTranslations,
    zh: zhTranslations,
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState<Language>('en');

    // 3. 升级 t 函数的实现逻辑
    const t = useCallback((key: string, variables?: TranslationVariables): string => {
        const langFile = translationsData[language];

        const translation = langFile[key as keyof typeof langFile];

        if (translation === undefined) {
            console.warn(`Translation key not found: ${key} in language ${language}`);
            return key;
        }

        let result = String(translation);

        // 如果传入了变量，就进行替换
        if (variables) {
            for (const variableKey in variables) {
                // 使用正则表达式全局替换占位符，例如将 {sessionId} 替换为真实值
                const regex = new RegExp(`\\{${variableKey}\\}`, 'g');
                result = result.replace(regex, String(variables[variableKey]));
            }
        }

        return result;
    }, [language]);

    const value = useMemo(() => ({
        language,
        setLanguage,
        t
    }), [language, t]);

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextType => {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useI18n must be used within an I18nProvider');
    }
    return context;
};