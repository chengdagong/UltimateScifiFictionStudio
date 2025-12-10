
import React, { useState, useEffect, useRef } from 'react';
import {
    Bot, GitMerge, Play, Edit, Trash2,
    Sparkles, Loader2,
    CheckCircle2, BookOpen, X,
    Sidebar, PlusCircle, BookText, Lightbulb, PenTool, Clock
} from 'lucide-react';
import { StoryAgent, WorkflowStep, WorldModel, FrameworkDefinition, ApiSettings, StorySegment } from '../types';
import { executeAgentTask, executeReviewTask } from '../services/geminiService';
import MilkdownEditor from './MilkdownEditor';

interface StoryAgentViewProps {
    agents: StoryAgent[];
    workflow: WorkflowStep[];
    model: WorldModel;
    framework: FrameworkDefinition;
    worldContext: string;
    storySegments: StorySegment[];
    settings: ApiSettings;
    currentTimeSetting: string;
    onUpdateAgents: (agents: StoryAgent[]) => void;
    onUpdateWorkflow: (workflow: WorkflowStep[]) => void;
    onAddStorySegment: (content: string) => void;
    onUpdateStorySegment: (id: string, content: string, timestamp?: string) => void;
    onRemoveStorySegment: (id: string) => void;
}

interface StepExecutionLog {
    status: 'pending' | 'generating' | 'reviewing' | 'revising' | 'completed' | 'failed';
    content: string;
    attempts: {
        round: number;
        output: string;
        critique?: string;
        verdict?: 'PASS' | 'FAIL';
    }[];
    error?: string;
}

const DEFAULT_AGENTS: StoryAgent[] = [
    { id: 'architect', name: '情节架构师', role: 'Plot Architect', systemPrompt: '你是一位精通叙事结构的小说架构师。你的任务是设计核心冲突、转折点和悬念。你需要确保故事符合逻辑且扣人心弦。', color: 'bg-indigo-500', icon: 'Box' },
    { id: 'writer', name: '文学撰稿人', role: 'Prose Writer', systemPrompt: '你是一位文笔优美的小说家。你的任务是将大纲转化为生动的场景描写、对话和心理活动。你的文字应具有感染力。', color: 'bg-pink-500', icon: 'Pen' },
    { id: 'sociologist', name: '社会观察员', role: 'Social Analyst', systemPrompt: '你是一位社会学家，专注于布伦纳生态系统或马克思主义分析。你的任务是确保故事中的事件深刻反映了社会结构、阶级矛盾或系统性压迫。', color: 'bg-blue-500', icon: 'Eye' },
    { id: 'historian', name: '历史记录官', role: 'Chronicler', systemPrompt: '你负责以客观、宏大的笔触记录事件，关注事件的深远影响和历史必然性。', color: 'bg-amber-500', icon: 'Scroll' },
    { id: 'editor', name: '主编', role: 'Editor', systemPrompt: '你是一位严厉但公正的文学编辑。你负责审查稿件的质量、逻辑一致性和风格。你会给出具体的修改意见。', color: 'bg-red-500', icon: 'CheckCircle2' }
];

const StoryAgentView: React.FC<StoryAgentViewProps> = ({
    agents, workflow, model, framework, worldContext, storySegments, settings, currentTimeSetting,
    onUpdateAgents, onUpdateWorkflow, onAddStorySegment, onUpdateStorySegment, onRemoveStorySegment
}) => {
    const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
    const [isCopilotOpen, setIsCopilotOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<'run' | 'workflow' | 'agents'>('run');

    // Workflow State
    const [storyGuidance, setStoryGuidance] = useState(""); // User's one-sentence prompt
    const [isRunning, setIsRunning] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(-1);
    const [executionLogs, setExecutionLogs] = useState<Record<string, StepExecutionLog>>({});
    const [generatedDraft, setGeneratedDraft] = useState("");

    const logContainerRef = useRef<HTMLDivElement>(null);
    const [editingAgent, setEditingAgent] = useState<StoryAgent | null>(null);
    const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);

    useEffect(() => {
        if (agents.length === 0) onUpdateAgents(DEFAULT_AGENTS);
        if (workflow.length === 0) {
            onUpdateWorkflow([
                { id: 'step1', name: '生成大纲', agentId: 'architect', instruction: '根据用户提供的剧情指引，以及前情提要，构思本章节的详细大纲。' },
                {
                    id: 'step2',
                    name: '撰写正文',
                    agentId: 'writer',
                    instruction: '根据生成的大纲，扩写成一篇完整的章节内容。注意环境描写和人物心理。',
                    validation: {
                        reviewerId: 'editor',
                        criteria: '内容必须超过500字，且必须包含至少两句人物对话，以及一段环境描写。',
                        maxRetries: 2
                    }
                },
                { id: 'step3', name: '社会学润色', agentId: 'sociologist', instruction: '检查正文，增强其中关于社会结构影响的描写，使其更具深度。' }
            ]);
        }
    }, []);

    const getAgentById = (id: string) => agents.find(a => a.id === id) || agents[0];
    const selectedSegment = storySegments.find(s => s.id === selectedSegmentId);

    const handleRunWorkflow = async () => {
        if (!settings.apiKey) return alert("请先配置 API Key");
        if (!storyGuidance.trim()) return alert("请输入本章的剧情指引或一句话描述。");

        setIsRunning(true);
        setExecutionLogs({});
        setCurrentStepIndex(0);
        setGeneratedDraft("");

        let contextSegments = storySegments;
        // Use segments up to current selected one as context
        if (selectedSegment) {
            const idx = storySegments.findIndex(s => s.id === selectedSegmentId);
            contextSegments = storySegments.slice(0, idx);
        }

        // Construct the context
        const contextText = contextSegments.length > 0
            ? `【前情提要】:\n${contextSegments[contextSegments.length - 1].content.slice(-2000)}`
            : "这是故事的开篇。";

        // Inject the user's guidance strongly into the initial input
        let previousOutput = `
${contextText}

【本章核心指令 (User Directive)】:
"${storyGuidance}"

请围绕上述指令开启创作。
    `;

        try {
            for (let i = 0; i < workflow.length; i++) {
                setCurrentStepIndex(i);
                const step = workflow[i];
                const agent = getAgentById(step.agentId);

                setExecutionLogs(prev => ({
                    ...prev,
                    [step.id]: { status: 'generating', content: '', attempts: [] }
                }));

                let currentRound = 1;
                let isApproved = false;
                let content = "";
                let critique = "";
                const maxRetries = step.validation ? (step.validation.maxRetries || 1) : 0;

                while (!isApproved && currentRound <= maxRetries + 1) {
                    const status = currentRound > 1 ? 'revising' : 'generating';
                    setExecutionLogs(prev => ({ ...prev, [step.id]: { ...prev[step.id]!, status } }));

                    content = await executeAgentTask(
                        agent,
                        step.instruction,
                        previousOutput,
                        model,
                        framework,
                        worldContext,
                        currentTimeSetting,
                        settings,
                        critique
                    );

                    setExecutionLogs(prev => {
                        const logs = prev[step.id]!;
                        const newAttempts = [...logs.attempts];
                        if (newAttempts[currentRound - 1]) {
                            newAttempts[currentRound - 1].output = content;
                        } else {
                            newAttempts.push({ round: currentRound, output: content });
                        }
                        return { ...prev, [step.id]: { ...logs, content, attempts: newAttempts } };
                    });

                    if (step.validation) {
                        setExecutionLogs(prev => ({ ...prev, [step.id]: { ...prev[step.id]!, status: 'reviewing' } }));
                        const reviewer = getAgentById(step.validation.reviewerId);
                        const reviewResult = await executeReviewTask(reviewer, content, step.validation.criteria, model, framework, worldContext, settings);

                        setExecutionLogs(prev => {
                            const logs = prev[step.id]!;
                            const newAttempts = [...logs.attempts];
                            newAttempts[currentRound - 1].critique = reviewResult.feedback;
                            newAttempts[currentRound - 1].verdict = reviewResult.verdict;
                            return { ...prev, [step.id]: { ...logs, attempts: newAttempts } };
                        });

                        if (reviewResult.verdict === 'PASS') isApproved = true;
                        else {
                            critique = reviewResult.feedback;
                            currentRound++;
                        }
                    } else {
                        isApproved = true;
                    }
                }

                setExecutionLogs(prev => ({ ...prev, [step.id]: { ...prev[step.id]!, status: 'completed' } }));
                // Pass the result of this step as input to the next step
                previousOutput = content;
            }

            setGeneratedDraft(previousOutput);
            setCurrentStepIndex(workflow.length);

        } catch (e: any) {
            alert(`执行出错: ${e.message}`);
            if (workflow[currentStepIndex]) {
                setExecutionLogs(prev => ({
                    ...prev,
                    [workflow[currentStepIndex].id]: { ...prev[workflow[currentStepIndex].id]!, status: 'failed', error: e.message }
                }));
            }
        } finally {
            setIsRunning(false);
        }
    };

    const handleApplyDraft = (mode: 'append' | 'new') => {
        if (mode === 'append' && selectedSegment) {
            onUpdateStorySegment(selectedSegment.id, selectedSegment.content + "\n\n" + generatedDraft);
        } else {
            onAddStorySegment(generatedDraft);
        }
        setGeneratedDraft("");
    };

    const renderCopilot = () => (
        <div className="flex flex-col h-full bg-slate-50 border-l border-slate-200 w-80 shrink-0">
            <div className="p-3 border-b border-slate-200 bg-white flex items-center justify-between">
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button onClick={() => setActiveTab('run')} className={`p-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'run' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`} title="运行"><Play className="w-4 h-4" /></button>
                    <button onClick={() => setActiveTab('workflow')} className={`p-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'workflow' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`} title="工作流"><GitMerge className="w-4 h-4" /></button>
                    <button onClick={() => setActiveTab('agents')} className={`p-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'agents' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`} title="Agents"><Bot className="w-4 h-4" /></button>
                </div>
                <button onClick={() => setIsCopilotOpen(false)} className="text-slate-400 hover:text-slate-600"><Sidebar className="w-4 h-4" /></button>
            </div>

            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'run' && (
                    <div className="flex flex-col h-full">
                        {generatedDraft && !isRunning ? (
                            <div className="p-4 overflow-y-auto flex-1 bg-emerald-50/50">
                                <div className="bg-white rounded-xl shadow-sm border border-emerald-100 p-4 animate-fadeIn">
                                    <h3 className="text-sm font-bold text-emerald-700 mb-2 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4" /> 生成结果
                                    </h3>
                                    <div className="text-xs text-slate-600 max-h-60 overflow-y-auto bg-slate-50 p-2 rounded mb-4 border border-slate-100 whitespace-pre-wrap">
                                        {generatedDraft}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {selectedSegment && (
                                            <button
                                                onClick={() => handleApplyDraft('append')}
                                                className="w-full py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                                            >
                                                插入到当前章节
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleApplyDraft('new')}
                                            className="w-full py-2 bg-white border border-emerald-200 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-50"
                                        >
                                            作为新章节保存
                                        </button>
                                        <button
                                            onClick={() => setGeneratedDraft("")}
                                            className="w-full py-2 text-slate-400 text-xs hover:text-slate-600"
                                        >
                                            丢弃
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="p-4 border-b border-slate-100 bg-white space-y-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
                                            <Lightbulb className="w-3 h-3 text-amber-500" /> 剧情指引 (Story Prompt)
                                        </label>
                                        <textarea
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:outline-none resize-none h-24"
                                            placeholder="例如：主角在雨夜潜入荒坂塔，却发现最好的朋友背叛了他..."
                                            value={storyGuidance}
                                            onChange={(e) => setStoryGuidance(e.target.value)}
                                        />
                                    </div>

                                    <button
                                        onClick={handleRunWorkflow}
                                        disabled={isRunning || !storyGuidance.trim()}
                                        className={`w-full py-3 rounded-xl font-bold text-white shadow-sm flex items-center justify-center gap-2 transition-all ${isRunning || !storyGuidance.trim() ? 'bg-slate-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                    >
                                        {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                        {isRunning ? 'Agents 协作中...' : '开始创作'}
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-3 space-y-3" ref={logContainerRef}>
                                    {workflow.map((step, index) => {
                                        const log = executionLogs[step.id];
                                        const status = log?.status || (index < currentStepIndex ? 'completed' : 'pending');
                                        const agent = getAgentById(step.agentId);

                                        return (
                                            <div key={step.id} className={`p-3 rounded-lg border text-xs ${status === 'pending' ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-indigo-100 shadow-sm'}`}>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-bold text-slate-700">{step.name}</span>
                                                    {status === 'generating' && <Loader2 className="w-3 h-3 text-indigo-500 animate-spin" />}
                                                    {status === 'completed' && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                                                    {status === 'failed' && <X className="w-3 h-3 text-red-500" />}
                                                </div>
                                                <div className="flex items-center gap-1 text-slate-500 mb-2">
                                                    <Bot className="w-3 h-3" /> {agent.name}
                                                </div>
                                                {log?.content && (
                                                    <div className="p-2 bg-slate-50 rounded border border-slate-100 text-slate-600 line-clamp-3 italic">
                                                        {log.content}
                                                    </div>
                                                )}
                                                {log?.attempts?.length > 1 && (
                                                    <div className="mt-2 text-orange-600 bg-orange-50 px-2 py-1 rounded inline-block">
                                                        已重试 {log.attempts.length - 1} 次
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                )}
                {activeTab === 'workflow' && (
                    <div className="flex flex-col h-full p-3 overflow-y-auto">
                        <button
                            onClick={() => {
                                const newStep: WorkflowStep = { id: crypto.randomUUID(), name: '新步骤', agentId: agents[0].id, instruction: '' };
                                onUpdateWorkflow([...workflow, newStep]);
                                setEditingStep(newStep);
                            }}
                            className="w-full py-2 mb-3 border border-dashed border-indigo-300 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-50"
                        >
                            + 添加步骤
                        </button>
                        <div className="space-y-2">
                            {workflow.map((step, idx) => (
                                <div key={step.id} className="bg-white border border-slate-200 rounded-lg p-3 group relative hover:border-indigo-300">
                                    <div className="font-bold text-xs text-slate-700 mb-1">{idx + 1}. {step.name}</div>
                                    <div className="text-[10px] text-slate-500 line-clamp-2">{step.instruction}</div>
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1">
                                        <button onClick={() => setEditingStep(step)} className="p-1 hover:text-indigo-600"><Edit className="w-3 h-3" /></button>
                                        <button onClick={() => onUpdateWorkflow(workflow.filter(s => s.id !== step.id))} className="p-1 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {activeTab === 'agents' && (
                    <div className="flex flex-col h-full p-3 overflow-y-auto">
                        <button
                            onClick={() => {
                                const newAgent: StoryAgent = { id: crypto.randomUUID(), name: '新 Agent', role: 'Role', systemPrompt: '', color: 'bg-slate-500', icon: 'Bot' };
                                onUpdateAgents([...agents, newAgent]);
                                setEditingAgent(newAgent);
                            }}
                            className="w-full py-2 mb-3 border border-dashed border-indigo-300 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-50"
                        >
                            + 新建 Agent
                        </button>
                        <div className="space-y-2">
                            {agents.map(agent => (
                                <div key={agent.id} className="bg-white border border-slate-200 rounded-lg p-2 flex items-center gap-2 group">
                                    <div className={`w-8 h-8 rounded flex items-center justify-center text-white ${agent.color}`}>
                                        <Bot className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-bold truncate">{agent.name}</div>
                                        <div className="text-[10px] text-slate-500 truncate">{agent.role}</div>
                                    </div>
                                    <button onClick={() => setEditingAgent(agent)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-indigo-600"><Edit className="w-3 h-3" /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Editor Modals for Steps/Agents */}
            {(editingStep || editingAgent) && (
                <div className="absolute inset-0 bg-white z-20 p-4 flex flex-col animate-fadeIn">
                    <div className="flex justify-between mb-4 border-b pb-2">
                        <h3 className="font-bold text-sm">{editingStep ? '编辑步骤' : '编辑 Agent'}</h3>
                        <button onClick={() => { setEditingStep(null); setEditingAgent(null); }}><X className="w-4 h-4" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3">
                        {editingStep && (
                            <>
                                <input className="w-full border p-2 text-xs rounded" value={editingStep.name} onChange={e => setEditingStep({ ...editingStep, name: e.target.value })} placeholder="步骤名称" />
                                <select className="w-full border p-2 text-xs rounded bg-white" value={editingStep.agentId} onChange={e => setEditingStep({ ...editingStep, agentId: e.target.value })}>
                                    {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                                <textarea className="w-full border p-2 text-xs rounded h-32" value={editingStep.instruction} onChange={e => setEditingStep({ ...editingStep, instruction: e.target.value })} placeholder="指令..." />
                                <button
                                    onClick={() => { onUpdateWorkflow(workflow.map(s => s.id === editingStep.id ? editingStep : s)); setEditingStep(null); }}
                                    className="w-full bg-indigo-600 text-white py-2 rounded text-xs font-bold"
                                >保存</button>
                            </>
                        )}
                        {editingAgent && (
                            <>
                                <input className="w-full border p-2 text-xs rounded" value={editingAgent.name} onChange={e => setEditingAgent({ ...editingAgent, name: e.target.value })} placeholder="名称" />
                                <input className="w-full border p-2 text-xs rounded" value={editingAgent.role} onChange={e => setEditingAgent({ ...editingAgent, role: e.target.value })} placeholder="角色" />
                                <textarea className="w-full border p-2 text-xs rounded h-32" value={editingAgent.systemPrompt} onChange={e => setEditingAgent({ ...editingAgent, systemPrompt: e.target.value })} placeholder="System Prompt..." />
                                <div className="flex gap-2 flex-wrap">
                                    {['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500'].map(c => (
                                        <button key={c} onClick={() => setEditingAgent({ ...editingAgent, color: c })} className={`w-5 h-5 rounded-full ${c} ${editingAgent.color === c ? 'ring-2 ring-offset-1' : ''}`} />
                                    ))}
                                </div>
                                <button
                                    onClick={() => { onUpdateAgents(agents.map(a => a.id === editingAgent.id ? editingAgent : a)); setEditingAgent(null); }}
                                    className="w-full bg-indigo-600 text-white py-2 rounded text-xs font-bold mt-4"
                                >保存</button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="flex h-full w-full bg-slate-100 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
            {/* LEFT: Chapter List (Enhanced) */}
            <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white sticky top-0 z-10">
                    <h2 className="font-serif font-bold text-slate-800 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-indigo-700" /> 章节管理
                    </h2>
                    <button
                        onClick={() => onAddStorySegment("新章节...")}
                        className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded transition-colors flex items-center gap-1 text-xs font-bold"
                        title="新建章节"
                    >
                        <PlusCircle className="w-4 h-4" /> 新建
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {storySegments.length === 0 && (
                        <div className="text-center py-8 text-slate-400 text-xs italic">
                            暂无章节，请新建
                        </div>
                    )}
                    {storySegments.map((segment, index) => (
                        <div
                            key={segment.id}
                            onClick={() => setSelectedSegmentId(segment.id)}
                            className={`
                        p-3 rounded-lg cursor-pointer transition-all border group relative select-none
                        ${selectedSegmentId === segment.id
                                    ? 'bg-white border-indigo-500 shadow-md ring-1 ring-indigo-500 z-10'
                                    : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200'
                                }
                    `}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className={`text-xs font-bold ${selectedSegmentId === segment.id ? 'text-indigo-700' : 'text-slate-500'}`}>Chapter {index + 1}</span>
                                <span className="text-[10px] text-slate-400">{segment.timestamp}</span>
                            </div>
                            <div className={`text-sm font-medium line-clamp-1 ${selectedSegmentId === segment.id ? 'text-slate-800' : 'text-slate-600'}`}>
                                {segment.content.split('\n')[0] || "无标题章节"}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1 truncate">
                                {segment.content.length} 字
                            </div>

                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm("确定要删除这一章吗？")) {
                                        onRemoveStorySegment(segment.id);
                                        if (selectedSegmentId === segment.id) setSelectedSegmentId(null);
                                    }
                                }}
                                className="absolute right-2 bottom-2 p-1.5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all z-20"
                                title="删除章节"
                            >
                                <Trash2 className="w-3.5 h-3.5 pointer-events-none" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* CENTER: Editor */}
            <div className="flex-1 flex flex-col bg-white min-w-0 relative">
                {selectedSegment ? (
                    <>
                        <div className="h-12 border-b border-slate-100 flex items-center justify-between px-4 shrink-0 bg-slate-50/30">
                            <div className="flex items-center gap-2 flex-1">
                                <Clock className="w-4 h-4 text-slate-400" />
                                <span className="text-xs font-bold text-slate-400 uppercase mr-2">时间节点:</span>
                                <input
                                    className="text-sm font-bold text-slate-700 border border-transparent hover:border-slate-300 rounded px-2 py-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-full max-w-xs transition-all bg-transparent"
                                    value={selectedSegment.timestamp}
                                    onChange={(e) => onUpdateStorySegment(selectedSegment.id, selectedSegment.content, e.target.value)}
                                    placeholder="例如：2077年 冬"
                                />
                            </div>
                            {!isCopilotOpen && (
                                <button onClick={() => setIsCopilotOpen(true)} className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors shadow-sm">
                                    <Bot className="w-4 h-4" /> 唤起 Copilot
                                </button>
                            )}
                        </div>
                        <div className="flex-1 overflow-hidden relative">
                            <MilkdownEditor
                                key={selectedSegment.id}
                                content={selectedSegment.content}
                                onChange={(text) => onUpdateStorySegment(selectedSegment.id, text)}
                            />
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300 bg-slate-50/20">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <BookText className="w-10 h-10 text-slate-300" />
                        </div>
                        <p className="font-medium text-slate-500">请选择或创建一个章节以开始写作</p>
                        <p className="text-sm mt-2 max-w-xs text-center text-slate-400">在左侧列表点击“新建”按钮，或选择已有章节。</p>
                        <button
                            onClick={() => onAddStorySegment("新章节...")}
                            className="mt-6 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
                        >
                            <PlusCircle className="w-4 h-4" /> 创建第一章
                        </button>
                    </div>
                )}
            </div>

            {/* RIGHT: Copilot */}
            {isCopilotOpen && renderCopilot()}
        </div>
    );
};

export default StoryAgentView;
