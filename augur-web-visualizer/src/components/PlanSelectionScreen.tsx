import React from 'react';
import { BeakerIcon, StarIcon } from '@/components/icons';
import { useI18n } from '@/lib/i18n';

interface PlanSelectionScreenProps {
    onSelect: (plan: 'free' | 'paid') => void;
}

export const PlanSelectionScreen: React.FC<PlanSelectionScreenProps> = ({ onSelect }) => {
    const { t } = useI18n();
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900/80 backdrop-blur-md animate-in fade-in duration-300">
            <h2 className="text-3xl font-bold text-white mb-4">{t('live.plan.title')}</h2>
            <p className="text-gray-400 mb-8">{t('live.plan.subtitle')}</p>
            <div className="flex space-x-6">
                <button
                    onClick={() => onSelect('free')}
                    className="flex flex-col items-center px-10 py-6 bg-gray-800 border-2 border-gray-700 rounded-lg hover:border-blue-500 hover:bg-gray-700 transition-all transform hover:scale-105"
                >
                    <BeakerIcon className="w-10 h-10 text-blue-400 mb-3" />
                    <h3 className="font-bold text-lg text-white">{t('live.plan.free')}</h3>
                    <p className="text-gray-400 text-sm">{t('live.plan.free.desc')}</p>
                </button>
                <button
                    onClick={() => onSelect('paid')}
                    className="flex flex-col items-center px-10 py-6 bg-gray-800 border-2 border-gray-700 rounded-lg hover:border-yellow-500 hover:bg-gray-700 transition-all transform hover:scale-105"
                >
                    <StarIcon className="w-10 h-10 text-yellow-400 mb-3" />
                    <h3 className="font-bold text-lg text-white">{t('live.plan.paid')}</h3>
                    <p className="text-gray-400 text-sm">{t('live.plan.paid.desc')}</p>
                </button>
            </div>
        </div>
    );
};
