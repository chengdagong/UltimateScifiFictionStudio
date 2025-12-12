import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Send, Plus, MessageSquare, Trash2, Settings2,
    Bot, User, Sparkles, MoreVertical, X, Save
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BrainstormSession, BrainstormMessage, BrainstormConfig, ApiSettings } from '../types';
import { sendChatMessage } from '../services/chatService';
import { useWorldAdminMenu } from '../hooks/useWorldAdminMenu';

interface BrainstormViewProps {
    globalApiSettings: ApiSettings;
    onSaveSession?: (session: BrainstormSession) => void;
    onAnalysisRequest?: (text: string, action?: 'analyze' | 'explain' | 'expand') => void;
    taskManager?: any;
}

const DEFAULT_CONFIG: BrainstormConfig = {
    provider: 'google',
    apiKey: '',
    baseUrl: '',
    model: 'gemini-1.5-flash',
    temperature: 0.7,
    maxOutputTokens: 2048
};

const BrainstormView: React.FC<BrainstormViewProps> = ({
    globalApiSettings,
    onSaveSession,
    onAnalysisRequest,
    taskManager
}) => {
    const { t } = useTranslation();
    // State
    const [sessions, setSessions] = useState<BrainstormSession[]>(() => {
        const saved = localStorage.getItem('ecoNarrative_brainstorm_sessions');
        return saved ? JSON.parse(saved) : [];
    });

    // Create a new session if none exists
    useEffect(() => {
        if (sessions.length === 0) {
            handleNewSession();
        }
    }, []);

    // Persist sessions
    useEffect(() => {
        localStorage.setItem('ecoNarrative_brainstorm_sessions', JSON.stringify(sessions));
    }, [sessions]);

    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [input, setInput] = useState("");
    const [isSending, setIsSending] = useState(false);

    // Sidebar open state for mobile
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    // Config panel state
    const [showConfig, setShowConfig] = useState(false);

    const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [activeSession?.messages, activeSessionId]);

    // Initial load selection
    useEffect(() => {
        if (!activeSessionId && sessions.length > 0) {
            setActiveSessionId(sessions[0].id);
        }
    }, [sessions, activeSessionId]);

    // Handlers
    const handleNewSession = () => {
        const newSession: BrainstormSession = {
            id: crypto.randomUUID(),
            name: `${t('brainstorm_new_session')} ${sessions.length + 1}`,
            messages: [],
            config: {
                ...DEFAULT_CONFIG,
                // Inherit global keys if available, but allow override
                apiKey: globalApiSettings.apiKey,
                provider: globalApiSettings.provider,
                baseUrl: globalApiSettings.baseUrl,
                model: globalApiSettings.model || DEFAULT_CONFIG.model
            },
            createdAt: Date.now(),
            lastModified: Date.now()
        };
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
        if (window.innerWidth < 768) setIsSidebarOpen(false);
    };

    const handleDeleteSession = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm(t('brainstorm_confirm_delete'))) {
            setSessions(prev => prev.filter(s => s.id !== id));
            if (activeSessionId === id) {
                setActiveSessionId(sessions.find(s => s.id !== id)?.id || null);
            }
        }
    };

    const handleSendMessage = async () => {
        if (!input.trim() || !activeSession || isSending) return;

        const currentInput = input;
        setInput("");
        setIsSending(true);

        // 0. Register Task
        let taskId = "";
        if (taskManager) {
            taskId = taskManager.addTask('custom', t('brainstorm_task_name'), t('brainstorm_task_desc'), activeSession.id);
            taskManager.updateTask(taskId, { status: 'running', progress: 0 });
        }

        // 1. Add User Message
        const userMsg: BrainstormMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: currentInput,
            timestamp: Date.now()
        };

        const updatedSession = {
            ...activeSession,
            messages: [...activeSession.messages, userMsg],
            lastModified: Date.now()
        };

        // Optimistic update
        setSessions(prev => prev.map(s => s.id === activeSession.id ? updatedSession : s));

        try {
            // 2. Call API
            const responseText = await sendChatMessage(
                updatedSession.messages,
                currentInput, // Redundant but passed for convenience in service if needed
                activeSession.config
            );

            // 3. Add AI Message
            const aiMsg: BrainstormMessage = {
                id: crypto.randomUUID(),
                role: 'model',
                content: responseText,
                timestamp: Date.now()
            };

            setSessions(prev => prev.map(s => s.id === activeSession.id ? {
                ...s,
                messages: [...s.messages, aiMsg],
                lastModified: Date.now()
            } : s));

            if (taskId && taskManager) {
                taskManager.completeTask(taskId, { summary: t('brainstorm_task_complete') });
            }

        } catch (error: any) {
            console.error(error);
            alert(`${t('brainstorm_send_fail')}: ` + error.message);
            if (taskId && taskManager) {
                taskManager.failTask(taskId, error.message || 'Error');
            }
            setInput(currentInput);
        } finally {
            setIsSending(false);
        }
    };

    const handleUpdateConfig = (key: keyof BrainstormConfig, value: any) => {
        if (!activeSession) return;
        setSessions(prev => prev.map(s => s.id === activeSession.id ? {
            ...s,
            config: { ...s.config, [key]: value }
        } : s));
    };

    const handleRenameSession = (id: string, newName: string) => {
        setSessions(prev => prev.map(s => s.id === id ? { ...s, name: newName } : s));
    };

    const { handleContextMenu, handleMouseUp, renderMenu } = useWorldAdminMenu({
        onAction: (action, text) => onAnalysisRequest?.(text, action)
    });

    if (!activeSession) {
        return <div className="flex items-center justify-center h-full text-slate-400">Loading...</div>;
    }

    return (
        <div className="flex h-full bg-white overflow-hidden shadow-sm rounded-xl border border-slate-200">
            {/* Left Sidebar: Session List */}
            <div className={`
                ${isSidebarOpen ? 'w-64 border-r' : 'w-0'} 
                bg-slate-50 flex flex-col transition-all duration-300 shrink-0 overflow-hidden
            `}>
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="font-bold text-slate-700">{t('brainstorm_session_list')}</h3>
                    <button onClick={handleNewSession} className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors">
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {sessions.map(session => (
                        <div
                            key={session.id}
                            onClick={() => setActiveSessionId(session.id)}
                            className={`
                                group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border
                                ${activeSessionId === session.id ? 'bg-white border-indigo-200 shadow-sm' : 'bg-transparent border-transparent hover:bg-slate-200/50'}
                            `}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${activeSessionId === session.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
                                <Bot className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <input
                                    className="bg-transparent font-medium text-sm text-slate-700 w-full outline-none truncate"
                                    value={session.name}
                                    onChange={(e) => handleRenameSession(session.id, e.target.value)}
                                    onClick={(e) => e.stopPropagation()} // Prevent activation when renaming
                                />
                                <p className="text-xs text-slate-400 truncate">
                                    {new Date(session.lastModified).toLocaleTimeString()}
                                </p>
                            </div>
                            <button
                                onClick={(e) => handleDeleteSession(e, session.id)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 transition-opacity"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">
                {/* Header */}
                <div className="h-14 border-b border-slate-100 flex items-center justify-between px-4 shrink-0">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                            {isSidebarOpen ? <X className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                        </button>
                        <div>
                            <h2 className="font-bold text-slate-800">{activeSession.name}</h2>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <span className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">{activeSession.config.model}</span>
                                <span>Temp: {activeSession.config.temperature}</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowConfig(!showConfig)}
                        className={`p-2 rounded-lg transition-colors ${showConfig ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-100 text-slate-500'}`}
                    >
                        <Settings2 className="w-5 h-5" />
                    </button>
                </div>

                {/* Messages List */}
                <div
                    className="flex-1 overflow-y-auto p-4 space-y-6 relative"
                    onContextMenu={(e) => {
                        // Prevent context menu on empty space unless selected
                        const selection = window.getSelection()?.toString();
                        if (onAnalysisRequest && selection) {
                            handleContextMenu(e, "");
                        }
                    }}
                    onMouseUp={handleMouseUp}
                >
                    {renderMenu()}
                    {activeSession.messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-slate-300 space-y-4">
                            <Sparkles className="w-12 h-12" />
                            <p>{t('brainstorm_start_prompt')}</p>
                        </div>
                    )}

                    {activeSession.messages.map((msg) => (
                        <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.role === 'user' ? 'bg-slate-800 text-white' : 'bg-indigo-600 text-white'}`}>
                                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                            </div>
                            <div
                                className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-slate-100 text-slate-800 rounded-tr-none' : 'bg-indigo-50/50 text-slate-800 border border-indigo-100 rounded-tl-none prose prose-sm max-w-none'}`}
                                onContextMenu={(e) => {
                                    if (onAnalysisRequest) {
                                        handleContextMenu(e, msg.content);
                                    }
                                }}
                            >
                                {msg.role === 'user' ? (
                                    <div className="whitespace-pre-wrap">{msg.content}</div>
                                ) : (
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {msg.content}
                                    </ReactMarkdown>
                                )}
                                <div className="mt-2 text-[10px] opacity-40 text-right">
                                    {new Date(msg.timestamp).toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isSending && (
                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-1 animate-pulse">
                                <Bot className="w-4 h-4" />
                            </div>
                            <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl rounded-tl-none p-4 flex items-center gap-2">
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-slate-100 bg-white">
                    <div className="relative flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300 transition-all">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            onContextMenu={(e) => {
                                if (onAnalysisRequest && input.trim()) {
                                    handleContextMenu(e, input);
                                }
                            }}
                            placeholder={t('brainstorm_placeholder')}
                            className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-32 text-sm p-2"
                            rows={1}
                            style={{ minHeight: '40px' }}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={!input.trim() || isSending}
                            className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg transition-colors shrink-0"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Config Panel */}
            {showConfig && (
                <div className="w-72 border-l border-slate-200 bg-slate-50 flex flex-col overflow-y-auto shrink-0 animate-in slide-in-from-right duration-300">
                    <div className="p-4 border-b border-slate-200 font-bold text-slate-700 flex justify-between items-center">
                        <span>{t('brainstorm_settings_title')}</span>
                        <button onClick={() => setShowConfig(false)}><X className="w-4 h-4 text-slate-400" /></button>
                    </div>

                    <div className="p-4 space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">{t('brainstorm_model')}</label>
                            <input
                                className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none"
                                value={activeSession.config.model}
                                onChange={(e) => handleUpdateConfig('model', e.target.value)}
                                placeholder="gemini-1.5-flash"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase flex justify-between">
                                <span>{t('brainstorm_temp')}</span>
                                <span>{activeSession.config.temperature}</span>
                            </label>
                            <input
                                type="range"
                                min="0" max="2" step="0.1"
                                className="w-full"
                                value={activeSession.config.temperature}
                                onChange={(e) => handleUpdateConfig('temperature', parseFloat(e.target.value))}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">{t('brainstorm_system_prompt')}</label>
                            <textarea
                                className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none min-h-[100px]"
                                value={activeSession.config.systemInstruction || ""}
                                onChange={(e) => handleUpdateConfig('systemInstruction', e.target.value)}
                                placeholder="你是..."
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">{t('brainstorm_provider')}</label>
                            <select
                                className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none"
                                value={activeSession.config.provider}
                                onChange={(e) => handleUpdateConfig('provider', e.target.value as any)}
                            >
                                <option value="google">Google Gemini</option>
                                <option value="openai">OpenAI Compatible</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">{t('brainstorm_api_key_override')}</label>
                            <input
                                type="password"
                                className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none"
                                value={activeSession.config.apiKey}
                                onChange={(e) => handleUpdateConfig('apiKey', e.target.value)}
                                placeholder="Leave empty to use global"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BrainstormView;
