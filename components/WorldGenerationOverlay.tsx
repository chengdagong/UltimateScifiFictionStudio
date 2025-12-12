import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe2, Loader2 } from 'lucide-react';

interface WorldGenerationOverlayProps {
    status: string;
}

export const WorldGenerationOverlay: React.FC<WorldGenerationOverlayProps> = ({ status }) => {
    const { t } = useTranslation();
    return (
        <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-md flex flex-col items-center justify-center animate-fadeIn">
            <div className="relative mb-8">
                <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center animate-pulse">
                    <Globe2 className="w-12 h-12 text-indigo-600 animate-spin-slow" />
                </div>
                <div className="absolute inset-0 border-4 border-indigo-100 rounded-full animate-ping opacity-20"></div>
            </div>

            <h2 className="text-2xl font-serif font-bold text-slate-800 mb-2">{t('world_gen_title')}</h2>
            <div className="flex items-center gap-2 text-indigo-600 font-medium bg-indigo-50 px-4 py-1.5 rounded-full">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">{status}</span>
            </div>

            <div className="mt-12 max-w-md text-center space-y-2">
                <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">{t('world_gen_engine_name')}</p>
                <div className="h-1 w-32 bg-slate-100 rounded-full mx-auto overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full w-1/2 animate-progress-indeterminate"></div>
                </div>
            </div>
        </div>
    );
};
