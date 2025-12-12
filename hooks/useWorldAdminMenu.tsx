
import React, { useState, useCallback, useEffect } from 'react';
import { Globe2 } from 'lucide-react';

interface WorldAdminMenuProps {
    onAnalyze: (text: string) => void;
}

export const useWorldAdminMenu = ({ onAnalyze }: WorldAdminMenuProps) => {
    const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
    const [selectedText, setSelectedText] = useState("");
    const [contextText, setContextText] = useState(""); // Full text of the container if no selection

    // Global click listener to close menu
    useEffect(() => {
        const handleClick = () => setMenuPosition(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    const handleContextMenu = useCallback((e: React.MouseEvent, fullTextContent?: string) => {
        e.preventDefault();
        e.stopPropagation();

        const selection = window.getSelection()?.toString() || "";
        setSelectedText(selection);
        setContextText(fullTextContent || "");

        setMenuPosition({
            x: e.clientX,
            y: e.clientY
        });
    }, []);

    const renderMenu = () => {
        if (!menuPosition) return null;

        const handleAction = (type: 'selection' | 'full') => {
            const textToAnalyze = type === 'selection' ? selectedText : contextText;
            if (!textToAnalyze.trim()) return;
            onAnalyze(textToAnalyze);
            setMenuPosition(null);
        };

        return (
            <div
                className="fixed z-[9999] bg-white rounded-lg shadow-xl border border-slate-200 py-1 min-w-[200px] animate-in fade-in zoom-in-95 duration-100"
                style={{ top: menuPosition.y, left: menuPosition.x }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-3 py-2 border-b border-slate-100 mb-1 flex items-center gap-2 text-indigo-600 font-bold text-xs bg-indigo-50/50">
                    <Globe2 className="w-3 h-3" /> 世界管理员 (World Admin)
                </div>

                {selectedText && (
                    <button
                        onClick={() => handleAction('selection')}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-indigo-600 flex items-center gap-2"
                    >
                        <span>🔍 剖析选中文字</span>
                    </button>
                )}

                {contextText && (
                    <button
                        onClick={() => handleAction('full')}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-indigo-600 flex items-center gap-2"
                    >
                        <span>📑 剖析全文内容</span>
                    </button>
                )}

                {(!selectedText && !contextText) && (
                    <div className="px-4 py-2 text-xs text-slate-400 italic">没有可分析的内容</div>
                )}
            </div>
        );
    };

    return { handleContextMenu, renderMenu };
};
