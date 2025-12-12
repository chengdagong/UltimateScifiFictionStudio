import React, { useEffect, useState } from 'react';
import { X, CheckCircle, Info, AlertCircle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
    message: string;
    type?: ToastType;
    duration?: number;
    onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', duration = 3000, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300); // Wait for exit animation
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
            default: return <Info className="w-5 h-5 text-blue-500" />;
        }
    };

    const getStyles = () => {
        switch (type) {
            case 'success': return 'border-green-100 bg-green-50 text-green-800';
            case 'error': return 'border-red-100 bg-red-50 text-red-800';
            default: return 'border-blue-100 bg-blue-50 text-blue-800';
        }
    };

    return (
        <div className={`fixed bottom-6 right-6 z-[200] transition-all duration-300 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg ${getStyles()} min-w-[300px]`}>
                {getIcon()}
                <p className="text-sm font-medium flex-1">{message}</p>
                <button onClick={() => setIsVisible(false)} className="opacity-50 hover:opacity-100 p-1">
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};
