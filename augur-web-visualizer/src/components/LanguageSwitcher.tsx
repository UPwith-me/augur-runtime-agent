import React from 'react';
// Fix: Remove file extensions from imports to fix module resolution errors.
import { useI18n } from '../lib/i18n';

export const LanguageSwitcher: React.FC = () => {
    const { language, setLanguage } = useI18n();

    const switchLanguage = (lang: 'en' | 'zh') => {
        setLanguage(lang);
    };

    return (
        <div className="flex items-center bg-gray-800 border border-gray-700 rounded-full p-1 text-sm">
            <button
                onClick={() => switchLanguage('en')}
                className={`px-3 py-1 rounded-full transition-colors ${language === 'en' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                aria-pressed={language === 'en'}
            >
                EN
            </button>
            <button
                onClick={() => switchLanguage('zh')}
                className={`px-3 py-1 rounded-full transition-colors ${language === 'zh' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                aria-pressed={language === 'zh'}
            >
                中文
            </button>
        </div>
    );
};