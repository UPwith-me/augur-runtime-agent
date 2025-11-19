import React, { useState } from 'react';
// Fix: Remove file extensions from imports to fix module resolution errors.
import { useI18n } from '../lib/i18n';
// Fix: Remove file extensions from imports to fix module resolution errors.
import { InformationCircleIcon, ChevronDownIcon } from './icons';

export const UsageGuide: React.FC = () => {
    const { t } = useI18n();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="mb-8 bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg">
            <button
                className="w-full flex justify-between items-center p-4 text-left"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-controls="usage-guide-content"
            >
                <div className="flex items-center">
                    <InformationCircleIcon className="w-6 h-6 text-indigo-400 mr-3" />
                    <h2 className="text-xl font-bold text-white">{t('usage.title')}</h2>
                </div>
                <div className="flex items-center text-sm text-gray-400">
                    <span>{isOpen ? t('usage.toggle.hide') : t('usage.toggle.show')}</span>
                    <ChevronDownIcon className={`w-5 h-5 ml-2 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>
            {isOpen && (
                <div id="usage-guide-content" className="p-6 border-t border-gray-700">
                    <p className="text-gray-300 mb-4">{t('usage.intro')}</p>
                    <ol className="list-decimal list-inside space-y-3 text-gray-400">
                        <li><span dangerouslySetInnerHTML={{ __html: t('usage.step1') }} /></li>
                        <li><span dangerouslySetInnerHTML={{ __html: t('usage.step2') }} /></li>
                        <li><span dangerouslySetInnerHTML={{ __html: t('usage.step3') }} /></li>
                        <li><span dangerouslySetInnerHTML={{ __html: t('usage.step4') }} /></li>
                        <li><span dangerouslySetInnerHTML={{ __html: t('usage.step5') }} /></li>
                        <li><span dangerouslySetInnerHTML={{ __html: t('usage.step6') }} /></li>
                        <li><span dangerouslySetInnerHTML={{ __html: t('usage.step7') }} /></li>
                        <li><span dangerouslySetInnerHTML={{ __html: t('usage.step8') }} /></li>
                    </ol>
                </div>
            )}
        </div>
    );
};