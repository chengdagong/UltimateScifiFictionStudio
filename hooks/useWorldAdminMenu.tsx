import React, { useState, useCallback, useEffect } from 'react';
import { Globe2, Sparkles, Zap, ChevronRight, X } from 'lucide-react';

interface WorldAdminMenuProps {
    onAction: (action: 'analyze' | 'explain' | 'expand', text: string) => void;
}

export const useWorldAdminMenu = ({ onAction }: WorldAdminMenuProps) => {
    const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
    const [selectedText, setSelectedText] = useState("");
    const [contextText, setContextText] = useState(""); // Full text of the container if no selection
    const [triggerType, setTriggerType] = useState<'right-click' | 'selection'>('right-click');

    // Global click listener to close menu (if clicking outside)
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            // If clicking inside menu, don't close
            if ((e.target as HTMLElement).closest('.world-admin-menu')) return;
            setMenuPosition(null);
        };
        window.addEventListener('mousedown', handleClick);
        return () => window.removeEventListener('mousedown', handleClick);
    }, []);

    const handleContextMenu = useCallback((e: React.MouseEvent, fullTextContent?: string) => {
        e.preventDefault();
        e.stopPropagation();

        const selection = window.getSelection()?.toString() || "";
        setSelectedText(selection);
        setContextText(fullTextContent || "");
        setTriggerType('right-click');

        setMenuPosition({
            x: e.clientX,
            y: e.clientY
        });
    }, []);

    // New: Handle Mouse Up for Selection
    const handleMouseUp = useCallback((e: React.MouseEvent) => {
        const selection = window.getSelection();
        const text = selection?.toString().trim();

        if (text && text.length > 0) {
            // Get selection coordinates
            const range = selection?.getRangeAt(0);
            const rect = range?.getBoundingClientRect();

            if (rect) {
                // Determine position (BELOW the selection)
                const x = rect.left + (rect.width / 2); // Center
                const y = rect.bottom; // right below

                setSelectedText(text);
                setContextText("");
                setTriggerType('selection');

                setMenuPosition({ x, y });
            }
        }
        // Note: We don't clear menu here because clicking usually clears selection.
        // The global mousedown listener handles closing.
    }, []);

    const renderMenu = () => {
        if (!menuPosition) return null;

        const handleMenuAction = (action: 'analyze' | 'explain' | 'expand', type: 'selection' | 'full') => {
            const textToAnalyze = type === 'selection' ? selectedText : contextText;
            if (!textToAnalyze?.trim()) return;

            onAction(action, textToAnalyze);
            setMenuPosition(null);

            // Clear selection after action
            window.getSelection()?.removeAllRanges();
        };

        // Different style for selection menu (floating tooltip style) vs context menu
        const isSelectionMode = triggerType === 'selection';

        return (
            <div
                className={`
                    world-admin-menu fixed z-[9999] 
                    ${isSelectionMode
                        ? 'bg-slate-900 text-white rounded-lg shadow-2xl flex items-center p-1 -translate-x-1/2 mt-2 animate-in fade-in slide-in-from-top-2 duration-200 ring-1 ring-white/10'
                        : 'bg-white text-slate-700 rounded-lg shadow-xl border border-slate-200 py-1 min-w-[200px] animate-in fade-in zoom-in-95 duration-100'}
                `}
                style={{ top: menuPosition.y, left: menuPosition.x }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header only for context menu */}
                {!isSelectionMode && (
                    <div className="px-3 py-2 border-b border-slate-100 mb-1 flex items-center gap-2 text-indigo-600 font-bold text-xs bg-indigo-50/50">
                        <Globe2 className="w-3 h-3" /> 世界管理员
                    </div>
                )}

                {/* Selection Mode: Notion-like Toolbar with Multiple Actions */}
                {isSelectionMode && (
                    <div className="flex items-center gap-1">
                        <div className="px-2 text-xs text-slate-400 font-mono border-r border-slate-700 mr-1">
                            {selectedText.length} 字符
                        </div>

                        <button
                            onClick={() => handleMenuAction('explain', 'selection')}
                            className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium hover:bg-slate-700 rounded-md transition-colors text-slate-200 hover:text-white"
                            title="解释这段文本"
                        >
                            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                            <span>解释</span>
                        </button>

                        <button
                            onClick={() => handleMenuAction('expand', 'selection')}
                            className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium hover:bg-slate-700 rounded-md transition-colors text-slate-200 hover:text-white"
                            title="扩写这段文本"
                        >
                            <Zap className="w-3.5 h-3.5 text-amber-400" />
                            <span>扩写</span>
                        </button>

                        <button
                            onClick={() => handleMenuAction('analyze', 'selection')}
                            className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium hover:bg-slate-700 rounded-md transition-colors text-slate-200 hover:text-white"
                            title="分析并提取实体"
                        >
                            <Globe2 className="w-3.5 h-3.5 text-blue-400" />
                            <span>解剖</span>
                        </button>
                    </div>
                )}

                {/* Right Click Mode: Full Menu */}
                {!isSelectionMode && (
                    <>
                        {selectedText && (
                            <button
                                onClick={() => handleMenuAction('analyze', 'selection')}
                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-indigo-600 flex items-center gap-2"
                            >
                                <span>🔍 剖析选中文字</span>
                            </button>
                        )}

                        {contextText && (
                            <button
                                onClick={() => handleMenuAction('analyze', 'full')}
                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-indigo-600 flex items-center gap-2"
                            >
                                <span>📑 剖析全文内容</span>
                            </button>
                        )}

                        {(!selectedText && !contextText) && (
                            <div className="px-4 py-2 text-xs text-slate-400 italic">没有可分析的内容</div>
                        )}
                    </>
                )}
            </div>
        );
    };

    return { handleContextMenu, handleMouseUp, renderMenu };
};
