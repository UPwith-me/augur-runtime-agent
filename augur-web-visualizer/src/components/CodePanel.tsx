import React from 'react';
// Fix: Remove file extensions from imports to fix module resolution errors.
import { useI18n } from '../lib/i18n';
// Fix: Remove file extensions from imports to fix module resolution errors.
import { CodeBracketIcon, MapPinIcon } from './icons';

interface CodePanelProps {
    code: string;
    activeLine: number | null;
    onCodeChange: (newCode: string) => void;
    isReadOnly: boolean;
}

export const CodePanel: React.FC<CodePanelProps> = ({ code, activeLine, onCodeChange, isReadOnly }) => {
    const { t } = useI18n();
    const lines = code.split('\n');
    const lineNumbersRef = React.useRef<HTMLDivElement>(null);
    const textAreaRef = React.useRef<HTMLTextAreaElement>(null);

    const handleScroll = () => {
        if (lineNumbersRef.current && textAreaRef.current) {
            lineNumbersRef.current.scrollTop = textAreaRef.current.scrollTop;
        }
    };

    return (
        <div className="bg-gray-800/50 rounded-lg shadow-lg overflow-hidden border border-gray-700">
            <div className="flex items-center justify-between p-3 bg-gray-700/50 border-b border-gray-600">
                <div className="flex items-center">
                    <CodeBracketIcon className="w-5 h-5 text-indigo-400 mr-2" />
                    <h3 className="font-semibold text-white">{t('code.file')}</h3>
                </div>
                <div className="flex items-center text-sm text-gray-400">
                    {activeLine && <>
                        <MapPinIcon className="w-4 h-4 mr-1.5" />
                        <span>{t('code.breakpoint').replace('{line}', String(activeLine))}</span>
                    </>}
                </div>
            </div>
            <div className="flex font-mono text-sm">
                <div ref={lineNumbersRef} className="p-4 bg-gray-800 text-right overflow-y-hidden select-none">
                    {lines.map((_, index) => {
                        const lineNumber = index + 1;
                        const isActive = lineNumber === activeLine;
                        return (
                             <div
                                key={lineNumber}
                                className={`h-[21px] ${isActive ? 'text-indigo-300' : 'text-gray-500'}`}
                            >
                                {lineNumber}
                            </div>
                        )
                    })}
                </div>
                 <textarea
                    ref={textAreaRef}
                    value={code}
                    onChange={(e) => onCodeChange(e.target.value)}
                    onScroll={handleScroll}
                    readOnly={isReadOnly}
                    spellCheck="false"
                    className="flex-1 p-4 bg-transparent text-gray-200 resize-none outline-none leading-[21px] w-full h-[300px] font-mono border-l border-gray-700 disabled:opacity-70"
                    placeholder="Enter your Python code here..."
                 />
            </div>
        </div>
    );
};