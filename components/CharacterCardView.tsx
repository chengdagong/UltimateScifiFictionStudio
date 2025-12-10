
import React, { useState } from 'react';
import { User, Plus, Trash2, Edit2, Sparkles, Loader2, Save, X, Calendar, FileText } from 'lucide-react'; // Using User icon for Person
import { SocialEntity, EntityCategory, ApiSettings } from '../types';
import { generateCharacterProfile } from '../services/geminiService';

interface CharacterCardViewProps {
    entities: SocialEntity[];
    settings: ApiSettings;
    onAddEntity: (name: string, desc: string, category: EntityCategory) => string;
    onUpdateEntity: (id: string, name: string, desc: string, category: EntityCategory, validFrom?: string, validTo?: string) => void;
    onRemoveEntity: (id: string) => void;
}

const CharacterCardView: React.FC<CharacterCardViewProps> = ({
    entities,
    settings,
    onAddEntity,
    onUpdateEntity,
    onRemoveEntity
}) => {
    // Filter only PEOPLE
    const characters = entities.filter(e => e.category === EntityCategory.PERSON);

    const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Edit Form State
    const [editForm, setEditForm] = useState<Partial<SocialEntity>>({});

    // AI Gen State
    const [isGenerating, setIsGenerating] = useState(false);
    const [genPrompt, setGenPrompt] = useState("");
    const [showGenModal, setShowGenModal] = useState(false);

    const handleSelectChar = (char: SocialEntity) => {
        setSelectedCharId(char.id);
        setIsEditing(false);
        setEditForm(char);
    };

    const handleCreateNew = () => {
        const newId = onAddEntity("新人物", "暂无描述", EntityCategory.PERSON);
        // Find the new entity object to set it as selected
        // Since onAddEntity doesn't return the full object, just ID, and parent state update might be async, 
        // we might not find it immediately. But typically React state updates trigger re-render.
        // For now, we'll try to set it, but user might need to click it if it doesn't auto-select.
        setSelectedCharId(newId);
        setIsEditing(true);
        // Mock the form state until re-render
        setEditForm({ id: newId, name: "新人物", description: "暂无描述", category: EntityCategory.PERSON });
    };

    const handleSave = () => {
        if (selectedCharId && editForm.name) {
            onUpdateEntity(
                selectedCharId,
                editForm.name,
                editForm.description || "",
                EntityCategory.PERSON,
                editForm.validFrom,
                editForm.validTo
            );
            setIsEditing(false);
        }
    };

    const handleGenerate = async () => {
        if (!settings.apiKey) return alert("请先配置 API Key");
        if (!genPrompt.trim()) return alert("请输入人物描述");

        setIsGenerating(true);
        try {
            const newChar = await generateCharacterProfile(genPrompt, entities, settings);
            const id = onAddEntity(newChar.name, newChar.description, EntityCategory.PERSON);
            // Updating the newly created entity with more details (validFrom, etc) if onAddEntity didn't cover it
            if (newChar.validFrom) {
                onUpdateEntity(id, newChar.name, newChar.description, EntityCategory.PERSON, newChar.validFrom);
            }
            setSelectedCharId(id);
            setIsEditing(false);
            setEditForm(newChar);
            setShowGenModal(false);
            setGenPrompt("");
        } catch (e: any) {
            alert("生成失败: " + e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const selectedChar = characters.find(c => c.id === selectedCharId);

    return (
        <div className="flex h-full bg-slate-100 overflow-hidden rounded-xl border border-slate-200 shadow-sm relative">

            {/* List Sidebar */}
            <div className="w-1/3 min-w-[250px] bg-white border-r border-slate-200 flex flex-col">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                        <User className="w-5 h-5 text-indigo-600" />
                        人物名册
                        <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{characters.length}</span>
                    </h2>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setShowGenModal(true)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="AI 生成人物"
                        >
                            <Sparkles className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleCreateNew}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="手动新建"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {characters.map(char => (
                        <div
                            key={char.id}
                            onClick={() => handleSelectChar(char)}
                            className={`p-3 rounded-lg cursor-pointer transition-all border flex items-start gap-3
                                ${selectedCharId === char.id
                                    ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                                    : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-50'}
                            `}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${selectedCharId === char.id ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                                <User className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className={`font-bold text-sm truncate ${selectedCharId === char.id ? 'text-indigo-900' : 'text-slate-700'}`}>{char.name}</h3>
                                <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{char.description}</p>
                            </div>
                        </div>
                    ))}
                    {characters.length === 0 && (
                        <div className="text-center py-10 text-slate-400 text-sm">
                            <p>暂无人物</p>
                            <p className="text-xs mt-1">点击右上角 + 创建</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Detail View */}
            <div className="flex-1 bg-slate-50 flex flex-col relative">
                {selectedChar || isEditing ? (
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                        {/* Header */}
                        <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
                            <div>
                                {isEditing ? (
                                    <input
                                        className="text-xl font-bold text-slate-800 border-b border-indigo-300 focus:outline-none focus:border-indigo-600 bg-transparent px-1 placeholder:text-slate-300"
                                        value={editForm.name || ""}
                                        onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="人物姓名"
                                    />
                                ) : (
                                    <h1 className="text-2xl font-serif font-bold text-slate-800">{selectedChar?.name}</h1>
                                )}
                            </div>

                            <div className="flex gap-2">
                                {isEditing ? (
                                    <>
                                        <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-500 text-sm font-bold hover:text-slate-700">取消</button>
                                        <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-indigo-700 flex items-center gap-2">
                                            <Save className="w-4 h-4" /> 保存
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => { setIsEditing(true); setEditForm(selectedChar!); }} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="编辑">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (window.confirm(`确定要删除 ${selectedChar?.name} 吗?`)) {
                                                    onRemoveEntity(selectedChar!.id);
                                                    setSelectedCharId(null);
                                                }
                                            }}
                                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="删除"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 max-w-3xl mx-auto">
                                <div className="flex items-center gap-2 mb-4">
                                    <Calendar className="w-4 h-4 text-slate-400" />
                                    <span className="text-xs font-bold text-slate-400 uppercase">活跃时期</span>
                                    {isEditing ? (
                                        <input
                                            className="text-sm border-b border-slate-200 focus:border-indigo-500 outline-none text-slate-600 w-32"
                                            value={editForm.validFrom || ""}
                                            onChange={e => setEditForm(prev => ({ ...prev, validFrom: e.target.value }))}
                                            placeholder="例如：第一章"
                                        />
                                    ) : (
                                        <span className="text-sm text-slate-600">{selectedChar?.validFrom || "未知"}</span>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-slate-400" />
                                        <span className="text-xs font-bold text-slate-400 uppercase">人物小传</span>
                                    </div>
                                    {isEditing ? (
                                        <textarea
                                            className="w-full h-96 p-4 border border-slate-200 rounded-lg text-slate-700 leading-relaxed focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none resize-none"
                                            value={editForm.description || ""}
                                            onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                            placeholder="输入人物背景故事、性格特征、外貌描写..."
                                        />
                                    ) : (
                                        <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap">
                                            {selectedChar?.description}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <User className="w-10 h-10 text-slate-300" />
                        </div>
                        <p>选择一个人物查看详情</p>
                    </div>
                )}
            </div>

            {/* AI Generator Modal */}
            {showGenModal && (
                <div className="absolute inset-0 z-20 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-indigo-600" />
                                AI 生成人物
                            </h3>
                            <button onClick={() => setShowGenModal(false)}><X className="w-4 h-4 text-slate-400 hover:text-slate-600" /></button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">简单描述或原型 (Prompt)</label>
                                <textarea
                                    className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none h-32 resize-none"
                                    placeholder="例如：一个有着机械义眼的赛博朋克侦探，性格冷漠但正义，喜欢在雨夜出没..."
                                    value={genPrompt}
                                    onChange={e => setGenPrompt(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || !genPrompt.trim()}
                                className={`w-full py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2
                                    ${isGenerating ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200'}
                                `}
                            >
                                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                {isGenerating ? "正在构建人物..." : "生成"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CharacterCardView;
