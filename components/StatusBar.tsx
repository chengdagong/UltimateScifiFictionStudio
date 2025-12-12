import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

interface StatusBarProps {
    isOnline?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({ isOnline = true }) => {
    return (
        <div className="h-8 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-4 text-xs select-none shrink-0 z-50 relative">
            <div className="flex items-center gap-4 text-slate-400">
                <div className="flex items-center gap-1.5 hover:text-slate-200 transition-colors cursor-help" title="System Status">
                    {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5 text-red-500" />}
                    <span>{isOnline ? "System Online" : "Offline"}</span>
                </div>
                <span>v1.0.0</span>
            </div>
            <div className="text-slate-500">
                Local-First Mode
            </div>
        </div>
    );
};
