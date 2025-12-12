
import React, { useState, useEffect } from 'react';
import { SocialEntity, ApiSettings, EntityCategory } from '../types';
import { X, Network, Check, Loader2, Plus, Trash2, Globe2 } from 'lucide-react';

interface WorldAdminDialogProps {
    isOpen: boolean;
    onClose: () => void;
    inboxEntities: SocialEntity[];
    onAddEntities: (entities: SocialEntity[]) => void;
    onDiscardEntities: (entityIds: Set<string>) => void;
    apiSettings: ApiSettings;
}

const WorldAdminDialog: React.FC<WorldAdminDialogProps> = ({
    isOpen, onClose, inboxEntities, onAddEntities, onDiscardEntities, apiSettings
}) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Auto-select new entities when opened or list changes
    useEffect(() => {
        if (isOpen) {
            setSelectedIds(new Set(inboxEntities.map(e => e.id)));
        }
    }, [isOpen, inboxEntities.length]);

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleConfirm = () => {
        const toAdd = inboxEntities.filter(e => selectedIds.has(e.id));
        onAddEntities(toAdd);
        if (inboxEntities.length === toAdd.length) {
            onClose();
        }
    };

    const handleDiscard = () => {
        onDiscardEntities(selectedIds);
        setSelectedIds(new Set()); // Clear selection
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
                    <div className="flex items-center gap-2 text-indigo-800">
                        <Network className="w-5 h-5" />
                        <h3 className="font-bold">收件箱: 社会实体待办 ({inboxEntities.length})</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200/50 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col p-6 bg-slate-50">
                    {/* Results Area */}
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                待处理实体
                                <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full text-[10px]">{inboxEntities.length}</span>
                            </label>
                            {inboxEntities.length > 0 && (
                                <button
                                    onClick={() => setSelectedIds(selectedIds.size === inboxEntities.length ? new Set() : new Set(inboxEntities.map(e => e.id)))}
                                    className="text-xs text-indigo-600 hover:underline"
                                >
                                    {selectedIds.size === inboxEntities.length ? '取消全选' : '全选'}
                                </button>
                            )}
                        </div>

                        {inboxEntities.length === 0 && (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                                <Globe2 className="w-12 h-12 mb-4 opacity-20" />
                                <p>收件箱是空的。</p>
                                <p className="text-xs mt-2">在文本区域右键点击“剖析”以生成新实体。</p>
                            </div>
                        )}

                        {inboxEntities.length > 0 && (
                            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3 pr-2">
                                {inboxEntities.map(entity => {
                                    const isSelected = selectedIds.has(entity.id);
                                    return (
                                        <div
                                            key={entity.id}
                                            onClick={() => toggleSelection(entity.id)}
                                            className={`
                                                relative p-3 rounded-lg border cursor-pointer transition-all group
                                                ${isSelected ? 'bg-white border-indigo-500 shadow-md ring-1 ring-indigo-500' : 'bg-slate-100 border-transparent hover:bg-white hover:border-slate-300'}
                                            `}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                                    {entity.name}
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded uppercase font-medium">
                                                        {entity.category}
                                                    </span>
                                                </div>
                                                <div className={`
                                                    w-5 h-5 rounded-full flex items-center justify-center border transition-colors
                                                    ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300 text-transparent group-hover:border-indigo-300'}
                                                `}>
                                                    <Check className="w-3 h-3" />
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                                                {entity.description}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3">
                    <button
                        onClick={handleDiscard}
                        disabled={selectedIds.size === 0}
                        className="px-4 py-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                        丢弃选中 ({selectedIds.size})
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={selectedIds.size === 0}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        添加选中实体 ({selectedIds.size})
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WorldAdminDialog;
