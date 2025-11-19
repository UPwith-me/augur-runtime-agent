import React from 'react';
// Fix: Remove file extensions from imports to fix module resolution errors.
import { useI18n } from '../lib/i18n';
// Fix: Remove file extensions from imports to fix module resolution errors.
import { PlayIcon, ArrowPathIcon, ForwardIcon } from './icons';

interface ControlsProps {
    isRunning: boolean;
    isPaused: boolean;
    isGeneratingSimulation: boolean;
    onStart: () => void;
    onReset: () => void;
    onNextStep: () => void;
    currentStep: number;
    totalSteps: number;
}

export const Controls: React.FC<ControlsProps> = ({ isRunning, isPaused, isGeneratingSimulation, onStart, onReset, onNextStep, currentStep, totalSteps }) => {
    const { t } = useI18n();
    const canStep = isRunning && isPaused;

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0 sm:space-x-4 p-3 bg-gray-700/50 rounded-lg">
            <div className="flex items-center space-x-2">
                <button
                    onClick={onStart}
                    disabled={isRunning || isGeneratingSimulation}
                    className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md shadow-md hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                >
                    <PlayIcon className="w-5 h-5 mr-2" />
                    {isGeneratingSimulation ? t('controls.generating') : t('controls.start')}
                </button>
                 <button
                    onClick={onReset}
                    disabled={(!isRunning && currentStep === 0) || isGeneratingSimulation}
                    className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-gray-600 rounded-md shadow-md hover:bg-gray-700 disabled:bg-gray-500/50 disabled:cursor-not-allowed transition-colors"
                >
                    <ArrowPathIcon className="w-5 h-5 mr-2" />
                    {t('controls.reset')}
                </button>
                 <button
                    onClick={onNextStep}
                    disabled={!canStep || isGeneratingSimulation}
                    className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md shadow-md hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                >
                    {t('controls.nextStep')}
                    <ForwardIcon className="w-5 h-5 ml-2" />
                </button>
            </div>
            <div className="text-sm text-gray-400 font-mono">
                {isGeneratingSimulation ? t('controls.generating') : (isRunning ? t('controls.stepProgress').replace('{current}', String(currentStep)).replace('{total}', String(totalSteps)) : t('controls.idle'))}
            </div>
        </div>
    );
};