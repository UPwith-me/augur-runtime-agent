import React from 'react';
// FIX: Removed file extension from import for proper module resolution.
import { useI18n } from '@/lib/i18n';

interface RoadmapItemProps {
    title: string;
    description: string;
    status: 'done' | 'in-progress' | 'planned';
}

const RoadmapItem: React.FC<RoadmapItemProps> = ({ title, description, status }) => {
    const { t } = useI18n();

    const statusStyles = {
        done: {
            bg: 'bg-green-900/50',
            text: 'text-green-300',
            label: t('roadmap.status.done'),
        },
        'in-progress': {
            bg: 'bg-yellow-900/50',
            text: 'text-yellow-300',
            label: t('roadmap.status.inProgress'),
        },
        planned: {
            bg: 'bg-blue-900/50',
            text: 'text-blue-300',
            label: t('roadmap.status.planned'),
        },
    };

    const styles = statusStyles[status];

    return (
        <div className={`p-4 rounded-lg border border-gray-700 ${styles.bg}`}>
            <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-white">{title}</h4>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles.text} ${styles.bg.replace('900/50', '800')}`}>{styles.label}</span>
            </div>
            <p className="text-sm text-gray-400">{description}</p>
        </div>
    );
};

export const Roadmap: React.FC = () => {
    const { t } = useI18n();

    const roadmapItems: RoadmapItemProps[] = [
        {
            title: t('roadmap.item1.title'),
            description: t('roadmap.item1.desc'),
            status: 'done',
        },
        {
            title: t('roadmap.item2.title'),
            description: t('roadmap.item2.desc'),
            status: 'done',
        },
        {
            title: t('roadmap.item3.title'),
            description: t('roadmap.item3.desc'),
            status: 'done',
        },
         {
            title: t('roadmap.item5.title'),
            description: t('roadmap.item5.desc'),
            status: 'done',
        },
        {
            title: t('roadmap.item6.title'),
            description: t('roadmap.item6.desc'),
            status: 'done', // 已完成：augur-vscode-extension
        },
        {
            title: t('roadmap.item7.title'),
            description: t('roadmap.item7.desc'),
            status: 'done', // 已完成：augur-debugger-service
        },
        {
            title: t('roadmap.item8.title'),
            description: t('roadmap.item8.desc'),
            status: 'done', // 已完成：augur-ci-agent
        },
    ];

    return (
        <div className="bg-gray-800/50 rounded-lg shadow-lg border border-gray-700 p-6 h-full">
            <h3 className="text-xl font-bold text-white mb-4">{t('roadmap.title')}</h3>
            <div className="space-y-4">
                {roadmapItems.map((item, index) => (
                    <RoadmapItem key={index} {...item} />
                ))}
            </div>
        </div>
    );
};