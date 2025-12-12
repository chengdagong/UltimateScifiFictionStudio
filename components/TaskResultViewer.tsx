import React, { useState } from 'react';
import { SocialEntity } from '../types';
import { ArrowRight, CheckSquare, Square, Tag, Users, MapPin, Building2, Ticket, Zap, Database, BookOpen, Pencil, Save, X, Trash2 } from 'lucide-react';
import { ENTITY_CATEGORIES } from '../constants/categories'; // Assuming this exists or I'll define options manually

interface TaskResultViewerProps {
    entities: SocialEntity[];
    onConfirm: (selectedEntities: SocialEntity[]) => void;
    onUpdateEntities?: (entities: SocialEntity[]) => void;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
    'person': Users,
    'organization': Building2,
    'location': MapPin,
    'event': Ticket,
    'technology': Zap,
    'resource': Database,
    'belief': BookOpen
};

const CATEGORY_OPTIONS = [
    { value: 'person', label: '人物' },
    { value: 'organization', label: '组织' },
    { value: 'location', label: '地点' },
    { value: 'event', label: '事件' },
    { value: 'technology', label: '技术' },
    { value: 'resource', label: '资源' },
    { value: 'belief', label: '信仰' },
];

const TaskResultViewer: React.FC<TaskResultViewerProps> = ({ entities, onConfirm, onUpdateEntities }) => {
    // Selection state
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
        new Set(entities.map((_, i) => i))
    );

    // Editing state
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<SocialEntity | null>(null);

    const toggleSelection = (index: number) => {
        if (editingIndex !== null) return; // Disable toggling while editing
        const newSet = new Set(selectedIndices);
        if (newSet.has(index)) {
            newSet.delete(index);
        } else {
            newSet.add(index);
        }
        setSelectedIndices(newSet);
    };

    const toggleAll = () => {
        if (editingIndex !== null) return;
        if (selectedIndices.size === entities.length) {
            setSelectedIndices(new Set());
        } else {
            setSelectedIndices(new Set(entities.map((_, i) => i)));
        }
    };

    const handleConfirm = () => {
        const selected = entities.filter((_, i) => selectedIndices.has(i));
        onConfirm(selected);
    };

    // --- Editing Handlers ---

    const startEditing = (e: React.MouseEvent, index: number, entity: SocialEntity) => {
        e.stopPropagation();
        setEditingIndex(index);
        setEditForm({ ...entity });
    };

    const cancelEditing = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setEditingIndex(null);
        setEditForm(null);
    };

    const saveEditing = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!editForm || editingIndex === null || !onUpdateEntities) return;

        const newEntities = [...entities];
        newEntities[editingIndex] = editForm;
        onUpdateEntities(newEntities);

        setEditingIndex(null);
        setEditForm(null);
    };

    const removeEntity = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        if (!onUpdateEntities) return;
        if (!confirm('确定要删除这个实体吗？')) return;

        const newEntities = entities.filter((_, i) => i !== index);
        onUpdateEntities(newEntities);

        // Adjust selection indices implies re-init somewhat, or just clearing invalid ones
        // Simplest is to just reset selection or filter out the index
        const newSelection = new Set<number>();
        // Re-map selection is complex because indices shift. 
        // For simplicity, we just keep what matches or reset? 
        // Let's just remove the deleted index and shift others? 
        // Easier: Just select all again or keep relative.
        // Actually, let's just let the user re-select if they delete.
        const newSet = new Set(selectedIndices);
        if (newSet.has(index)) newSet.delete(index);
        // Indices > index need to shift down
        // This is getting complex. Let's just reset selection to all or current valid.
        const adjustedSet = new Set<number>();
        Array.from(selectedIndices).sort().forEach(oldIdx => {
            if (oldIdx < index) adjustedSet.add(oldIdx);
            if (oldIdx > index) adjustedSet.add(oldIdx - 1);
        });
        setSelectedIndices(adjustedSet);
    };

    if (!entities || entities.length === 0) return null;

    return (
        <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-bold">生成了 {entities.length} 个潜在实体：</span>
                <div className="flex gap-2">
                    <button
                        onClick={toggleAll}
                        disabled={editingIndex !== null}
                        className="flex items-center gap-1 hover:text-indigo-600 transition-colors disabled:opacity-50"
                    >
                        {selectedIndices.size === entities.length ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                        {selectedIndices.size === entities.length ? '全选' : '全选'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                {entities.map((entity, index) => {
                    const isSelected = selectedIndices.has(index);
                    const isEditing = editingIndex === index;
                    const Icon = CATEGORY_ICONS[entity.category] || Tag;

                    if (isEditing && editForm) {
                        return (
                            <div key={index} className="bg-white p-4 rounded-lg border-2 border-indigo-500 shadow-md animate-fadeIn">
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">名称</label>
                                            <input
                                                value={editForm.name}
                                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                                className="w-full p-2 border rounded text-sm font-bold focus:outline-none focus:border-indigo-500"
                                                autoFocus
                                            />
                                        </div>
                                        <div className="w-1/3">
                                            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">类型</label>
                                            <select
                                                value={editForm.category}
                                                onChange={e => setEditForm({ ...editForm, category: e.target.value as any })}
                                                className="w-full p-2 border rounded text-sm focus:outline-none focus:border-indigo-500"
                                            >
                                                {CATEGORY_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">描述</label>
                                        <textarea
                                            value={editForm.description}
                                            onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                            className="w-full p-2 border rounded text-sm h-24 resize-none focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <button
                                            onClick={cancelEditing}
                                            className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded text-xs font-bold"
                                        >
                                            取消
                                        </button>
                                        <button
                                            onClick={saveEditing}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 shadow-sm"
                                        >
                                            <Save className="w-3 h-3" />
                                            保存修改
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div
                            key={index}
                            onClick={() => toggleSelection(index)}
                            className={`
                                cursor-pointer flex items-start gap-3 p-3 rounded-lg border text-left transition-all group
                                ${isSelected
                                    ? 'bg-indigo-50/50 border-indigo-200 shadow-sm'
                                    : 'bg-white border-slate-100 hover:border-slate-300 opacity-60 hover:opacity-100'}
                            `}
                        >
                            <div className={`mt-0.5 shrink-0 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>
                                {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <div className={`
                                            w-6 h-6 rounded flex items-center justify-center shrink-0
                                            ${entity.category === 'person' ? 'bg-blue-100 text-blue-600' :
                                                entity.category === 'organization' ? 'bg-purple-100 text-purple-600' :
                                                    entity.category === 'location' ? 'bg-emerald-100 text-emerald-600' :
                                                        entity.category === 'event' ? 'bg-amber-100 text-amber-600' :
                                                            'bg-slate-100 text-slate-500'}
                                        `}>
                                            <Icon className="w-3.5 h-3.5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className={`font-bold text-sm truncate ${isSelected ? 'text-slate-800' : 'text-slate-600'}`}>
                                                    {entity.name}
                                                </span>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                                                    {CATEGORY_OPTIONS.find(opt => opt.value === entity.category)?.label || entity.category}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Edit Tools - Visible on Hover */}
                                    {onUpdateEntities && (
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => startEditing(e, index, entity)}
                                                className="p-1 hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 rounded"
                                                title="编辑"
                                            >
                                                <Pencil className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={(e) => removeEntity(e, index)}
                                                className="p-1 hover:bg-red-100 text-slate-400 hover:text-red-500 rounded"
                                                title="删除"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed group-hover:line-clamp-none transition-all">
                                    {entity.description}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                    onClick={handleConfirm}
                    disabled={selectedIndices.size === 0 || editingIndex !== null}
                    className={`
                        flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-md
                        ${selectedIndices.size > 0
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200/50'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
                    `}
                >
                    <span>写入 {selectedIndices.size} 个选中实体</span>
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default TaskResultViewer;
