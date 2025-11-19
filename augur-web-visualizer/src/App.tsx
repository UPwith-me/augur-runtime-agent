import React, { useState, useEffect } from 'react';
import { GithubIcon, ServerStackIcon, PlayIcon } from '@/components/icons';
import { CodePanel } from '@/components/CodePanel';
import { StatePanel } from '@/components/StatePanel';
import { DapLogPanel } from '@/components/DapLogPanel';
import { AIAgentPanel } from '@/components/AIAgentPanel';
import { Controls } from '@/components/Controls';
import { UsageGuide } from '@/components/UsageGuide';
import { ArchitectureDiagram } from '@/components/ArchitectureDiagram';
import { Roadmap } from '@/components/Roadmap';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { AIModelSelector } from '@/components/AIModelSelector';
import { PromptConfigPanel } from '@/components/PromptConfigPanel';
import { LiveExecutionPanel } from '@/components/LiveExecutionPanel';
import { PlanSelectionScreen } from '@/components/PlanSelectionScreen';
import { useI18n } from '@/lib/i18n';
import { useSimulation } from '@/hooks/useSimulation';

const App: React.FC = () => {
    const { t } = useI18n();
    const [activeTab, setActiveTab] = useState<'simulate' | 'live'>('simulate');
    const [apiPlan, setApiPlan] = useState<'free' | 'paid' | null>(null);

    const {
        code,
        setCode,
        simulationSteps,
        state,
        promptConfig,
        setPromptConfig,
        resetSimulation,
        startSimulation,
        handleNextStep,
        handleApplyFix
    } = useSimulation();

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('sessionId')) {
            setActiveTab('live');
        }
    }, []);

    const currentStep = state.isRunning ? simulationSteps[state.currentStepIndex] : null;

    return (
        <div className="bg-slate-950 min-h-screen text-slate-200 font-sans selection:bg-indigo-500/30">
            {activeTab === 'live' && !apiPlan && <PlanSelectionScreen onSelect={setApiPlan} />}

            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 lg:top-8 lg:right-8 z-20 flex items-center space-x-4">
                <AIModelSelector />
                <LanguageSwitcher />
            </div>

            <header className="text-center py-12 bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800/50">
                <div className="flex justify-center items-center gap-4 mb-4">
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 tracking-tight drop-shadow-sm">
                        {t('title')}
                    </h1>
                    <a href="https://github.com/google/generative-ai-docs" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-white transition-colors duration-300">
                        <GithubIcon className="w-8 h-8" />
                    </a>
                </div>
                <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">{t('subtitle')}</p>
            </header>

            <main className="space-y-8 max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex justify-center mb-10">
                    <div className="bg-slate-900/50 p-1.5 rounded-full flex space-x-1 border border-slate-800 backdrop-blur-sm shadow-xl">
                        <button
                            onClick={() => setActiveTab('simulate')}
                            className={`px-8 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 flex items-center ${activeTab === 'simulate'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-400/50'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                        >
                            <PlayIcon className="w-4 h-4 mr-2.5" /> Simulation Mode
                        </button>
                        <button
                            onClick={() => setActiveTab('live')}
                            className={`px-8 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 flex items-center ${activeTab === 'live'
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20 ring-1 ring-purple-400/50'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                        >
                            <ServerStackIcon className="w-4 h-4 mr-2.5" /> Live Execution Mode
                        </button>
                    </div>
                </div>

                {activeTab === 'simulate' ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                        <UsageGuide />

                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                            {/* Left Column: Controls & Code */}
                            <div className="xl:col-span-7 space-y-6">
                                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl shadow-black/20">
                                    <Controls
                                        isRunning={state.isRunning}
                                        isPaused={state.isPaused}
                                        isGeneratingSimulation={state.isGeneratingSimulation}
                                        onStart={startSimulation}
                                        onReset={resetSimulation}
                                        onNextStep={handleNextStep}
                                        currentStep={state.currentStepIndex + 1}
                                        totalSteps={simulationSteps.length}
                                    />
                                </div>
                                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl shadow-black/20">
                                    <CodePanel
                                        code={code}
                                        onCodeChange={setCode}
                                        isReadOnly={state.isRunning || state.isGeneratingSimulation}
                                        activeLine={currentStep?.line || null}
                                    />
                                </div>
                            </div>

                            {/* Right Column: State & AI */}
                            <div className="xl:col-span-5 space-y-6">
                                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl shadow-black/20 h-[500px] overflow-hidden flex flex-col">
                                    <StatePanel
                                        callStack={currentStep?.callStack || []}
                                        variables={currentStep?.variables || {}}
                                        highlightedVariable={state.highlightedVariable}
                                    />
                                </div>
                                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl shadow-black/20">
                                    <AIAgentPanel
                                        context={state.aiContext}
                                        rawDapPayloads={state.rawDapPayloads}
                                        response={state.aiResponse}
                                        isLoading={state.isAwaitingAI || state.isGeneratingSimulation}
                                        error={state.error}
                                        onApplyFix={handleApplyFix}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8">
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                                <PromptConfigPanel config={promptConfig} onConfigChange={setPromptConfig} />
                            </div>
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                                <DapLogPanel log={state.dapLog} />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 mb-8 backdrop-blur-sm">
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                                <ServerStackIcon className="w-8 h-8 mr-4 text-purple-400" />
                                {t('live.title')}
                            </h2>
                            <p className="text-slate-400 mb-8 text-lg" dangerouslySetInnerHTML={{ __html: t('live.description') }} />

                            {apiPlan && <LiveExecutionPanel apiPlan={apiPlan} />}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-16 pt-12 border-t border-slate-800/50">
                    <ArchitectureDiagram />
                    <Roadmap />
                </div>
            </main>

            <footer className="text-center py-12 text-sm text-slate-600 bg-slate-950 border-t border-slate-900">
                <p className="mb-2">{t('footer.builtWith')}</p>
                <p>{t('footer.disclaimer')}</p>
            </footer>
        </div>
    );
};

export default App;