
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Bot, GitMerge, Play, Edit, Trash2,
    Sparkles, Loader2,
    CheckCircle2, BookOpen, X,
    Sidebar, PlusCircle, BookText, Lightbulb, PenTool, Clock,
    ChevronUp, ChevronDown, ArrowRight, RotateCcw, ArrowLeft
} from 'lucide-react';
import { StoryAgent, WorkflowStep, WorldModel, FrameworkDefinition, ApiSettings, StorySegment, StepExecutionLog, StoryArtifact } from '../types';
import { executeAgentTask, executeReviewTask } from '../services/geminiService';
import MilkdownEditor from './MilkdownEditor';
import { Book, FileText, Code2, Database } from 'lucide-react';

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

    // Lifted State
    storyGuidance: string;
    onUpdateStoryGuidance: (val: string) => void;
    workflowStatus: 'idle' | 'running' | 'paused' | 'completed';
    onUpdateWorkflowStatus: (val: 'idle' | 'running' | 'paused' | 'completed') => void;
    currentStepIndex: number;
    onUpdateCurrentStepIndex: (val: number) => void;
    executionLogs: Record<string, StepExecutionLog>;
    onUpdateExecutionLogs: (val: Record<string, StepExecutionLog> | ((prev: Record<string, StepExecutionLog>) => Record<string, StepExecutionLog>)) => void;
    stepOutputs: Record<string, string>;
    onUpdateStepOutputs: (val: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
    generatedDraft: string;
    onUpdateGeneratedDraft: (val: string) => void;
    // Artifacts State
    artifacts: StoryArtifact[];
    onUpdateArtifacts: (val: StoryArtifact[]) => void;
    onAnalysisRequest?: (text: string, action?: 'analyze' | 'explain' | 'expand') => void;
    taskManager?: any; // Use weak type for now or import ReturnType. Ideally import Hook return type.
}

// REMOVED: DEFAULT_AGENTS moved inside component for i18n

const StoryAgentView: React.FC<StoryAgentViewProps> = ({
    agents: agentsProp,
    workflow: workflowProp,
    model,
    framework,
    worldContext,
    storySegments: storySegmentsProp,
    settings,
    currentTimeSetting,
    onUpdateAgents,
    onUpdateWorkflow,
    onAddStorySegment,
    onUpdateStorySegment,
    onRemoveStorySegment,
    // De-structure new props
    storyGuidance,
    onUpdateStoryGuidance,
    workflowStatus,
    onUpdateWorkflowStatus,
    currentStepIndex,
    onUpdateCurrentStepIndex,
    executionLogs,
    onUpdateExecutionLogs,
    stepOutputs,
    onUpdateStepOutputs,
    generatedDraft,
    onUpdateGeneratedDraft,
    artifacts: artifactsProp,
    onUpdateArtifacts,
    onAnalysisRequest,
    taskManager
}) => {
    // 防御性处理：确保数组prop始终有默认值
    const agents = agentsProp || [];
    const workflow = workflowProp || [];
    const storySegments = storySegmentsProp || [];
    const artifacts = artifactsProp || [];
    const { t } = useTranslation();
    const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
    const [isCopilotOpen, setIsCopilotOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<'workflow' | 'artifacts'>('workflow');

    // View State
    const [viewMode, setViewMode] = useState<'segment' | 'step' | 'artifact' | 'agent'>('segment');
    const [activeStepId, setActiveStepId] = useState<string | null>(null);
    const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);

    // Derived UI State
    const [editingAgent, setEditingAgent] = useState<StoryAgent | null>(null);
    const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
    // Notification State
    const [latestArtifact, setLatestArtifact] = useState<StoryArtifact | null>(null);

    // Floating Window View State
    const [agentWindowView, setAgentWindowView] = useState<'list' | 'edit'>('list');

    // Floating Window State - Initialize directly from localStorage to avoid flash
    const [agentWindowPos, setAgentWindowPos] = useState(() => {
        const savedPos = localStorage.getItem('story_agent_window_pos');
        const width = 400;
        const padding = 20;
        const defaultX = Math.max(20, window.innerWidth - width - padding);
        const defaultY = 80;

        if (savedPos) {
            try {
                let { x, y } = JSON.parse(savedPos);
                
                // Only reset if window is completely off-screen (truly invisible)
                const windowCompletelyOffRight = x > window.innerWidth;
                const windowCompletelyOffLeft = x + width < 0;
                const windowCompletelyOffBottom = y > window.innerHeight;
                const windowCompletelyOffTop = y < -50;

                if (windowCompletelyOffRight || windowCompletelyOffLeft || windowCompletelyOffBottom || windowCompletelyOffTop) {
                    return { x: defaultX, y: defaultY };
                } else {
                    return { x, y };
                }
            } catch (e) {
                console.error("Failed to parse saved window position", e);
                return { x: defaultX, y: defaultY };
            }
        }
        return { x: defaultX, y: defaultY };
    });
    
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const prevDragging = useRef(false); // Track previous dragging state

    // Save position ONLY when dragging transitions from true to false
    useEffect(() => {
        if (prevDragging.current === true && isDragging === false) {
            // Dragging just ended, save position
            localStorage.setItem('story_agent_window_pos', JSON.stringify(agentWindowPos));
        }
        prevDragging.current = isDragging;
    }, [isDragging, agentWindowPos]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setAgentWindowPos({
                    x: e.clientX - dragOffset.current.x,
                    y: e.clientY - dragOffset.current.y
                });
            }
        };
        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    // Adjust window position when switching to edit mode to prevent off-screen
    useEffect(() => {
        if (agentWindowView === 'edit') {
            const width = 800;
            const padding = 20;
            // Check if current position + new width exceeds window width
            if (agentWindowPos.x + width > window.innerWidth) {
                setAgentWindowPos(prev => ({
                    ...prev,
                    x: Math.max(padding, window.innerWidth - width - padding)
                }));
            }
        }
    }, [agentWindowView]);

    useEffect(() => {
        if (agents.length === 0) {
            const defaultAgents: StoryAgent[] = [
                { id: 'screenwriter', name: t('agent_screenwriter_name'), role: t('agent_screenwriter_role'), systemPrompt: t('agent_screenwriter_prompt'), color: 'bg-indigo-500', icon: 'Pen' },
                { id: 'script_doctor', name: t('agent_script_doctor_name'), role: t('agent_script_doctor_role'), systemPrompt: t('agent_script_doctor_prompt'), color: 'bg-red-500', icon: 'Activity' },
                { id: 'producer', name: t('agent_producer_name'), role: t('agent_producer_role'), systemPrompt: t('agent_producer_prompt'), color: 'bg-amber-500', icon: 'Briefcase' },
                { id: 'director', name: t('agent_director_name'), role: t('agent_director_role'), systemPrompt: t('agent_director_prompt'), color: 'bg-purple-500', icon: 'Video' },
                { id: 'character_psych', name: t('agent_character_psych_name'), role: t('agent_character_psych_role'), systemPrompt: t('agent_character_psych_prompt'), color: 'bg-pink-500', icon: 'Heart' },
                { id: 'dialogue_specialist', name: t('agent_dialogue_specialist_name'), role: t('agent_dialogue_specialist_role'), systemPrompt: t('agent_dialogue_specialist_prompt'), color: 'bg-teal-500', icon: 'MessageSquare' }
            ];
            onUpdateAgents(defaultAgents);
        }
        if (workflow.length === 0) {
            onUpdateWorkflow([
                { id: 'step_concept', name: t('step_concept_name'), agentId: 'producer', instruction: t('step_concept_instruction') },
                { id: 'step_outline', name: t('step_outline_name'), agentId: 'screenwriter', instruction: t('step_outline_instruction') },
                {
                    id: 'step_writing',
                    name: t('step_writing_name'),
                    agentId: 'screenwriter',
                    instruction: t('step_writing_instruction')
                },
                {
                    id: 'step_review',
                    name: t('step_review_name'),
                    agentId: 'script_doctor',
                    instruction: t('step_review_instruction'),
                    validation: {
                        reviewerId: 'script_doctor',
                        criteria: t('step_review_criteria'),
                        maxRetries: 2
                    }
                },
                { id: 'step_dialogue', name: t('step_dialogue_name'), agentId: 'dialogue_specialist', instruction: t('step_dialogue_instruction') }
            ]);
        }
    }, []); // eslint-disable-next-line react-hooks/exhaustive-deps

    const getAgentById = (id: string) => agents.find(a => a.id === id) || agents[0];
    const selectedSegment = storySegments.find(s => s.id === selectedSegmentId);

    // --- Execution Logic ---

    const executeStep = async (index: number, inputContext: string) => {
        if (index >= workflow.length) {
            onUpdateWorkflowStatus('completed');
            return;
        }

        const step = workflow[index];
        const agent = getAgentById(step.agentId);
        onUpdateCurrentStepIndex(index);
        onUpdateWorkflowStatus('running');

        onUpdateCurrentStepIndex(index);
        onUpdateWorkflowStatus('running');

        // REMOVED: Auto-switch to Detail View
        // setViewMode('step');
        // setActiveStepId(step.id);

        onUpdateExecutionLogs(prev => ({ // Updated
            ...prev,
            [step.id]: { status: 'generating', content: '', attempts: [] }
        }));

        let taskId = "";
        if (taskManager) {
            taskId = taskManager.addTask('story_step', `执行步骤: ${step.name}`, step.instruction, undefined, { stepId: step.id });
            taskManager.updateTask(taskId, { status: 'running', progress: 0 });
        }

        try {
            let currentRound = 1;
            let isApproved = false;
            let content = "";
            let critique = "";
            const maxRetries = step.validation ? (step.validation.maxRetries || 1) : 0;

            // Iteration Loop (Internal to the step)
            while (!isApproved && currentRound <= maxRetries + 1) {
                const status = currentRound > 1 ? 'revising' : 'generating';
                onUpdateExecutionLogs(prev => {
                    const currentLog = prev[step.id] || { status: 'generating', content: '', attempts: [] };
                    return { ...prev, [step.id]: { ...currentLog, status } };
                });

                // 1. Generate
                content = await executeAgentTask(
                    agent,
                    step.instruction,
                    inputContext, // Input is the result of previous step (or guidance)
                    model,
                    framework,
                    worldContext,
                    currentTimeSetting,
                    settings,
                    critique
                );

                // Update Log
                onUpdateExecutionLogs(prev => {
                    const logs = prev[step.id] || { status: 'generating', content: '', attempts: [] };
                    const newAttempts = logs.attempts ? [...logs.attempts] : [];
                    if (newAttempts[currentRound - 1]) newAttempts[currentRound - 1].output = content;
                    else newAttempts.push({ round: currentRound, output: content });
                    return { ...prev, [step.id]: { ...logs, content, attempts: newAttempts } };
                });

                // 2. Validate (if needed)
                if (step.validation) {
                    onUpdateExecutionLogs(prev => {
                        const currentLog = prev[step.id] || { status: 'generating', content: '', attempts: [] };
                        return { ...prev, [step.id]: { ...currentLog, status: 'reviewing' } };
                    });
                    
                    const reviewer = getAgentById(step.validation.reviewerId);
                    const reviewResult = await executeReviewTask(reviewer, content, step.validation.criteria, model, framework, worldContext, settings);

                    onUpdateExecutionLogs(prev => {
                        const logs = prev[step.id] || { status: 'generating', content: '', attempts: [] };
                        const newAttempts = logs.attempts ? [...logs.attempts] : [];
                        if (!newAttempts[currentRound - 1]) {
                             newAttempts.push({ round: currentRound, output: content });
                        }
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

            onUpdateExecutionLogs(prev => {
                const currentLog = prev[step.id] || { status: 'generating', content: '', attempts: [] };
                return { ...prev, [step.id]: { ...currentLog, status: 'completed' } };
            });

            // Initial save of the output to editable state
            onUpdateStepOutputs(prev => ({ ...prev, [step.id]: content })); // Updated

            // Artifact Generation
            const newArtifact: StoryArtifact = {
                id: crypto.randomUUID(),
                title: `${step.name} Output`,
                type: step.outputArtifactType || 'markdown',
                content: content,
                sourceStepId: step.id,
                createdAt: Date.now()
            };

            onUpdateArtifacts([...artifacts, newArtifact]);

            if (taskId && taskManager) {
                taskManager.completeTask(taskId, { summary: '步骤执行完成', data: content });
            }

            // Trigger Notification
            setLatestArtifact(newArtifact);
            // Auto-dismiss after 5 seconds
            setTimeout(() => setLatestArtifact(null), 5000);

            // PAUSE here for user intervention
            onUpdateWorkflowStatus('paused'); // Updated

        } catch (e: any) {
            console.error(e);
            onUpdateExecutionLogs(prev => {
                const currentLog = prev[step.id] || { status: 'generating', content: '', attempts: [] };
                return {
                    ...prev,
                    [step.id]: { ...currentLog, status: 'failed', error: e.message }
                };
            });

            if (taskId && taskManager) {
                taskManager.failTask(taskId, e.message);
            }

            onUpdateWorkflowStatus('paused'); // Allow retry?
        }
    };

    const getInitialInput = () => {
        let contextSegments = storySegments;
        if (selectedSegment) {
            const idx = storySegments.findIndex(s => s.id === selectedSegmentId);
            contextSegments = storySegments.slice(0, idx);
        }
        const contextText = contextSegments.length > 0
            ? `【前情提要】:\n${contextSegments[contextSegments.length - 1].content.slice(-2000)}`
            : "这是故事的开篇。";

        return `
${contextText}

【本章核心指令 (User Directive)】:
"${storyGuidance}"
`;
    };

    const handleStartWorkflow = () => {
        if (!settings.apiKey) return alert("Please configure API Key first");
        if (!storyGuidance.trim()) return alert("Please enter story directive");

        // Reset
        onUpdateExecutionLogs({});
        onUpdateStepOutputs({});
        onUpdateCurrentStepIndex(-1);

        // Start Step 0
        executeStep(0, getInitialInput());
    };

    const handleRetry = () => {
        if (currentStepIndex < 0) return;
        const input = currentStepIndex === 0
            ? getInitialInput()
            : stepOutputs[workflow[currentStepIndex - 1].id] || "";
        executeStep(currentStepIndex, input);
    };

    const handleContinue = (fromIndex: number) => {
        const currentStep = workflow[fromIndex];
        // The input for the next step is the (potentially edited) output of the current step
        const outputOfCurrentStep = stepOutputs[currentStep.id] || "";

        executeStep(fromIndex + 1, outputOfCurrentStep);
    };

    const handleApplyResult = (content: string) => {
        if (selectedSegment) {
            onUpdateStorySegment(selectedSegment.id, selectedSegment.content + "\n\n" + content);
        } else {
            onAddStorySegment(content);
        }
        onUpdateGeneratedDraft(""); // Updated
        onUpdateWorkflowStatus('idle'); // Updated
    };

    // --- Render Helpers ---

    const renderCopilot = () => (
        <div className="flex flex-col h-full bg-slate-50 border-l border-slate-200 w-[350px] shrink-0 transition-all">
            <div className="p-3 border-b border-slate-200 bg-white flex items-center justify-between">
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button onClick={() => setActiveTab('workflow')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'workflow' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>{t('story_copilot_tab_workflow')}</button>
                    <button onClick={() => setActiveTab('artifacts')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'artifacts' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>{t('story_copilot_tab_artifacts')}</button>
                </div>
                <button onClick={() => setIsCopilotOpen(false)} className="text-slate-400 hover:text-slate-600"><Sidebar className="w-4 h-4" /></button>
            </div>

            <div className="flex-1 overflow-hidden relative flex flex-col">
                {activeTab === 'workflow' && (
                    <>
                        {/* Header Prompt Area */}
                        <div className="p-4 bg-white border-b border-slate-100 shrink-0 space-y-3">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
                                    <Lightbulb className="w-3 h-3 text-amber-500" /> {t('story_guidance_label')}
                                </label>
                                <textarea
                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:outline-none resize-none h-16"
                                    placeholder={t('story_guidance_placeholder')}
                                    value={storyGuidance}
                                    onChange={(e) => onUpdateStoryGuidance(e.target.value)}
                                    disabled={workflowStatus === 'running'}
                                />
                            </div>
                            {(() => {
                                const currentStep = workflow[currentStepIndex];
                                const currentLog = currentStep ? executionLogs[currentStep.id] : null;
                                const isFailed = currentLog?.status === 'failed';

                                if (isFailed) {
                                    return (
                                        <button
                                            onClick={handleRetry}
                                            className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                                        >
                                            <RotateCcw className="w-4 h-4" /> 重试当前步骤
                                        </button>
                                    );
                                }

                                if (workflowStatus === 'idle' || workflowStatus === 'completed') {
                                    return (
                                        <button
                                            onClick={handleStartWorkflow}
                                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                                        >
                                            <Play className="w-4 h-4" /> {t('action_start_workflow')}
                                        </button>
                                    );
                                }

                                return (
                                    <div className="w-full py-2 bg-slate-100 text-slate-500 rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                                        {workflowStatus === 'running' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                                        {workflowStatus === 'running' ? t('workflow_status_running') : t('workflow_status_waiting')}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Workflow Steps List */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">
                            {workflow.map((step, idx) => {
                                const isCurrent = idx === currentStepIndex;
                                const isPast = idx < currentStepIndex;
                                const isPending = idx > currentStepIndex;
                                const log = executionLogs[step.id];
                                const output = stepOutputs[step.id];

                                return (
                                    <div key={step.id} className={`
                                        rounded-xl border transition-all duration-300
                                        ${isCurrent ? 'bg-white border-indigo-400 shadow-md ring-1 ring-indigo-400' : ''}
                                        ${isPast ? 'bg-white border-slate-200 opacity-80' : ''}
                                        ${isPending ? 'bg-slate-100 border-slate-200' : ''}
                                        ${log?.status === 'completed' ? 'cursor-pointer hover:border-indigo-300 focus:ring-2 focus:ring-indigo-200' : 'cursor-default'}
                                    `}
                                        onClick={() => {
                                            if (log?.status === 'completed') {
                                                setViewMode('step');
                                                setActiveStepId(step.id);
                                            }
                                        }}
                                    >
                                        {/* Step Header */}
                                        <div className="p-2 flex items-start justify-between border-b border-slate-50">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${isCurrent ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-slate-900">{step.name}</div>
                                                    <div className="text-[9px] text-slate-500 flex items-center gap-1">
                                                        <Bot className="w-2.5 h-2.5" /> {getAgentById(step.agentId)?.name}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {/* Step Status Badges */}
                                                {log?.status === 'generating' && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
                                                {log?.status === 'reviewing' && <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-bold">{t('status_reviewing')}</span>}
                                                {log?.status === 'revising' && <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded font-bold">{t('status_revising')} ({log.attempts.length})</span>}
                                                {log?.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}

                                                {/* Edit Controls (Only if idle and not running) */}
                                                {(workflowStatus === 'idle' || workflowStatus === 'paused') && (
                                                    <div className="flex gap-1 ml-2">
                                                        <button disabled={idx === 0} onClick={() => { const n = [...workflow];[n[idx - 1], n[idx]] = [n[idx], n[idx - 1]]; onUpdateWorkflow(n); }} className="text-slate-400 hover:text-indigo-600 p-1"><ChevronUp className="w-3 h-3" /></button>
                                                        <button disabled={idx === workflow.length - 1} onClick={() => { const n = [...workflow];[n[idx + 1], n[idx]] = [n[idx], n[idx + 1]]; onUpdateWorkflow(n); }} className="text-slate-400 hover:text-indigo-600 p-1"><ChevronDown className="w-3 h-3" /></button>
                                                        <button onClick={() => setEditingStep(step)} className="text-slate-400 hover:text-indigo-600 p-1"><Edit className="w-3 h-3" /></button>
                                                        <button onClick={() => onUpdateWorkflow(workflow.filter(s => s.id !== step.id))} className="text-slate-400 hover:text-red-600 p-1"><Trash2 className="w-3 h-3" /></button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Step Content / Editor */}
                                        <div className="p-2 pt-0">
                                            {/* Logic: 
                                                If running -> show live logs
                                                If completed -> show Editor with "output"
                                                If pending -> show instruction preview
                                            */}

                                            {/* Preview Instruction */}
                                            {(!log && isPending) && (
                                                <div className="text-xs text-slate-600 italic mt-1">{step.instruction}</div>
                                            )}

                                            {/* Reviewer Badge */}
                                            {step.validation && (
                                                <div className="mt-2 flex items-center gap-1.5 text-[9px] font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-md border border-orange-100 max-w-fit">
                                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                                    <span>审查: {getAgentById(step.validation.reviewerId).name}</span>
                                                </div>
                                            )}

                                            {/* Error Message */}
                                            {log?.status === 'failed' && log.error && (
                                                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600 whitespace-pre-wrap animate-fadeIn">
                                                    <div className="font-bold flex items-center gap-1 mb-1">
                                                        <X className="w-3 h-3" /> 执行失败
                                                    </div>
                                                    {log.error}
                                                </div>
                                            )}

                                            {/* Live Logs */}
                                            {log?.status !== 'completed' && log?.attempts && log.attempts.length > 0 && (
                                                <div className="mt-2 space-y-2">
                                                    {log.attempts.map((att, i) => (
                                                        <div key={i} className="text-[10px] bg-slate-50 p-2 rounded border border-slate-100">
                                                            <div className="font-bold text-slate-500 mb-1">Round {att.round}</div>
                                                            {att.critique && <div className="text-orange-600 mb-1 bg-orange-50 p-1 rounded">Critique: {att.critique}</div>}
                                                            {i === log.attempts.length - 1 && log.status !== 'generating' && <div className="line-clamp-3 text-slate-600">{att.output}</div>}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {log?.status === 'completed' && (
                                                <div className="mt-2 animate-fadeIn">
                                                    {(() => {
                                                        const artifact = artifacts.find(a => a.sourceStepId === step.id);
                                                        if (artifact) {
                                                            return (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setViewMode('artifact');
                                                                        setActiveArtifactId(artifact.id);
                                                                    }}
                                                                    className="w-full py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-md text-[10px] font-bold hover:bg-indigo-100 flex items-center justify-center gap-1 mb-1"
                                                                >
                                                                    <Sparkles className="w-2.5 h-2.5" /> {t('action_view_artifact')}
                                                                </button>
                                                            );
                                                        }
                                                        return null;
                                                    })()}

                                                    {/* Actions (Only show for current step when paused) */}
                                                    {isCurrent && workflowStatus === 'paused' && (
                                                        <div className="mt-2 flex gap-2">
                                                            <button
                                                                onClick={() => handleContinue(idx)}
                                                                className="flex-1 py-1.5 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 flex items-center justify-center gap-1"
                                                            >
                                                                <ArrowRight className="w-3 h-3" />
                                                                {idx === workflow.length - 1 ? t('action_finish_all') : t('action_next_step')}
                                                            </button>
                                                            {idx === workflow.length - 1 && (
                                                                <button
                                                                    onClick={() => handleApplyResult(output || "")}
                                                                    className="px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded text-xs font-bold hover:bg-emerald-100"
                                                                >
                                                                    {t('action_apply_to_story')}
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {workflowStatus === 'idle' && (
                                <button
                                    onClick={() => {
                                        const newStep: WorkflowStep = { id: crypto.randomUUID(), name: '新步骤', agentId: agents[0].id, instruction: '' };
                                        onUpdateWorkflow([...workflow, newStep]);
                                        setEditingStep(newStep);
                                    }}
                                    className="w-full py-3 border border-dashed border-slate-300 rounded-xl text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-all font-bold text-xs"
                                >
                                    {t('action_add_step')}
                                </button>
                            )}
                        </div>
                    </>
                )}

                {activeTab === 'artifacts' && (
                    <div className="flex flex-col h-full p-4 overflow-y-auto bg-slate-50 space-y-3">
                        {artifacts.length === 0 ? (
                            <div className="text-center text-slate-400 text-xs mt-10">{t('graph_no_data')}</div>
                        ) : (
                            artifacts.map(art => (
                                <div
                                    key={art.id}
                                    onClick={() => {
                                        setViewMode('artifact');
                                        setActiveArtifactId(art.id);
                                    }}
                                    className="bg-white p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-md cursor-pointer transition-all group"
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        {art.type === 'markdown' ? <FileText className="w-4 h-4 text-emerald-500" /> :
                                            art.type === 'code' ? <Code2 className="w-4 h-4 text-amber-500" /> :
                                                art.type === 'json' ? <Database className="w-4 h-4 text-purple-500" /> :
                                                    <Book className="w-4 h-4 text-indigo-500" />}
                                        <div className="text-xs font-bold text-slate-700 truncate">{art.title}</div>
                                    </div>
                                    <div className="text-[10px] text-slate-400 flex justify-between">
                                        <span>{new Date(art.createdAt).toLocaleTimeString()}</span>
                                        <span className="uppercase">{art.type}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Editor Modals for Steps (Agents moved to main view) */}
            {
                editingStep && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 p-6 flex flex-col animate-fadeIn">
                        <div className="bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col max-h-full overflow-hidden w-full max-w-lg mx-auto">
                            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
                                <h3 className="font-bold text-sm text-slate-700">{t('modal_edit_step')}</h3>
                                <button onClick={() => setEditingStep(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">{t('label_step_name')}</label>
                                    <input className="w-full border p-2 text-xs rounded" value={editingStep.name} onChange={e => setEditingStep({ ...editingStep, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">{t('label_exec_agent')}</label>
                                    <select className="w-full border p-2 text-xs rounded bg-white" value={editingStep.agentId} onChange={e => setEditingStep({ ...editingStep, agentId: e.target.value })}>
                                        {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">{t('label_instruction')}</label>
                                    <textarea className="w-full border p-2 text-xs rounded h-32" value={editingStep.instruction} onChange={e => setEditingStep({ ...editingStep, instruction: e.target.value })} />
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">{t('label_output_type')}</label>
                                    <select
                                        className="w-full border p-2 text-xs rounded bg-white"
                                        value={editingStep.outputArtifactType || 'markdown'}
                                        onChange={e => setEditingStep({ ...editingStep, outputArtifactType: e.target.value as any })}
                                    >
                                        <option value="markdown">{t('option_markdown')}</option>
                                        <option value="text">{t('option_text')}</option>
                                        <option value="code">{t('option_code')}</option>
                                        <option value="json">{t('option_json')}</option>
                                    </select>
                                </div>

                                <div className="border border-slate-200 rounded p-3 bg-slate-50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <input
                                            type="checkbox"
                                            id="enableValidation"
                                            checked={!!editingStep.validation}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setEditingStep({
                                                        ...editingStep,
                                                        validation: {
                                                            reviewerId: agents[0]?.id || 'architect',
                                                            criteria: '请检查内容的逻辑性和一致性。',
                                                            maxRetries: 3
                                                        }
                                                    });
                                                } else {
                                                    setEditingStep({ ...editingStep, validation: undefined });
                                                }
                                            }}
                                            className="rounded text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <label htmlFor="enableValidation" className="text-xs font-bold text-slate-700 select-none cursor-pointer flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" /> 启用审查迭代 (Reviewer Loop)
                                        </label>
                                    </div>

                                    {editingStep.validation && (
                                        <div className="space-y-3 pl-1 mt-3 pt-3 border-t border-slate-200 animate-fadeIn">
                                            <div>
                                                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Reviewer Agent</label>
                                                <select
                                                    className="w-full border border-slate-300 p-2 text-xs rounded bg-white"
                                                    value={editingStep.validation.reviewerId}
                                                    onChange={e => setEditingStep({
                                                        ...editingStep,
                                                        validation: { ...editingStep.validation!, reviewerId: e.target.value }
                                                    })}
                                                >
                                                    {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">审查标准 (Criteria)</label>
                                                <textarea
                                                    className="w-full border border-slate-300 p-2 text-xs rounded h-20 resize-none"
                                                    value={editingStep.validation.criteria}
                                                    onChange={e => setEditingStep({
                                                        ...editingStep,
                                                        validation: { ...editingStep.validation!, criteria: e.target.value }
                                                    })}
                                                    placeholder="例如：检查是否有逻辑漏洞..."
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">最大重试次数 (Max Retries)</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="10"
                                                    className="w-full border border-slate-300 p-2 text-xs rounded"
                                                    value={editingStep.validation.maxRetries}
                                                    onChange={e => setEditingStep({
                                                        ...editingStep,
                                                        validation: { ...editingStep.validation!, maxRetries: parseInt(e.target.value) || 1 }
                                                    })}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => { onUpdateWorkflow(workflow.map(s => s.id === editingStep.id ? editingStep : s)); setEditingStep(null); }}
                                    className="w-full bg-indigo-600 text-white py-2 rounded text-xs font-bold"
                                >保存更改</button>
                            </div>
                        </div>
                    </div>

                )
            }
        </div >

    );

    const renderFloatingAgentWindow = () => {
        const isEditMode = agentWindowView === 'edit';
        const windowWidth = isEditMode ? 'w-[800px]' : 'w-[400px]';

        return (
            <div
                data-testid="agent-floating-window"
                style={{ left: agentWindowPos.x, top: agentWindowPos.y }}
                className={`absolute ${windowWidth} h-[600px] max-h-[80vh] bg-white border border-slate-200 shadow-2xl rounded-xl flex flex-col z-40 overflow-hidden ${isDragging ? '' : 'transition-all duration-300 ease-in-out'}`}
            >
                <div
                    onMouseDown={(e) => {
                        setIsDragging(true);
                        dragOffset.current = {
                            x: e.clientX - agentWindowPos.x,
                            y: e.clientY - agentWindowPos.y
                        };
                    }}
                    className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between cursor-move select-none shrink-0"
                >
                    <h3 className="font-bold text-base text-slate-700 flex items-center gap-2">
                        {isEditMode && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setAgentWindowView('list'); }}
                                className="mr-2 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        <Bot className="w-5 h-5 text-indigo-500" />
                        {agentWindowView === 'list' ? t('story_copilot_tab_agents') : (editingAgent?.name || 'Edit Agent')}
                    </h3>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50">
                    {agentWindowView === 'list' ? (
                        <div className="p-4">
                            <button
                                onClick={() => {
                                    const newAgent: StoryAgent = { id: crypto.randomUUID(), name: '新 Agent', role: 'Role', systemPrompt: '', color: 'bg-slate-500', icon: 'Bot' };
                                    onUpdateAgents([...agents, newAgent]);
                                    setEditingAgent(newAgent);
                                    setAgentWindowView('edit');
                                }}
                                className="w-full py-3 mb-4 border border-dashed border-indigo-300 text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <PlusCircle className="w-4 h-4" />
                                {t('action_new_agent')}
                            </button>
                            <div className="space-y-3">
                                {agents.map(agent => (
                                    <div key={agent.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 group hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer" onClick={() => { setEditingAgent(agent); setAgentWindowView('edit'); }}>
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${agent.color} shadow-sm`}>
                                            <Bot className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-slate-800 truncate">{agent.name}</div>
                                            <div className="text-xs text-slate-500 truncate">{agent.role}</div>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setEditingAgent(agent); setAgentWindowView('edit'); }}
                                            className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        editingAgent && (
                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">名称</label>
                                        <input
                                            className="w-full border border-slate-300 p-3 text-sm rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 focus:outline-none transition-all"
                                            value={editingAgent.name}
                                            onChange={e => setEditingAgent({ ...editingAgent, name: e.target.value })}
                                            placeholder="给 Agent 起个名字"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">角色</label>
                                        <input
                                            className="w-full border border-slate-300 p-3 text-sm rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 focus:outline-none transition-all"
                                            value={editingAgent.role}
                                            onChange={e => setEditingAgent({ ...editingAgent, role: e.target.value })}
                                            placeholder="定义 Agent 的角色"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">System Prompt (核心指令)</label>
                                    <textarea
                                        className="w-full border border-slate-300 p-4 text-sm rounded-xl h-64 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 focus:outline-none font-mono resize-none leading-relaxed"
                                        value={editingAgent.systemPrompt}
                                        onChange={e => setEditingAgent({ ...editingAgent, systemPrompt: e.target.value })}
                                        placeholder="在这里定义 Agent 的行为模式、语气和专业领域..."
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-3 block">标识颜色</label>
                                    <div className="flex gap-3 flex-wrap bg-white p-4 rounded-xl border border-slate-200">
                                        {['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'].map(c => (
                                            <button
                                                key={c}
                                                onClick={() => setEditingAgent({ ...editingAgent, color: c })}
                                                className={`w-8 h-8 rounded-full ${c} transition-all ${editingAgent.color === c ? 'ring-4 ring-offset-2 ring-slate-200 scale-110 shadow-md' : 'hover:scale-110 hover:shadow-sm'}`}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end gap-3">
                                    <button
                                        onClick={() => setAgentWindowView('list')}
                                        className="px-6 py-2.5 border border-slate-300 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
                                    >
                                        取消
                                    </button>
                                    <button
                                        onClick={() => {
                                            onUpdateAgents(agents.map(a => a.id === editingAgent.id ? editingAgent : a));
                                            setAgentWindowView('list');
                                        }}
                                        className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 hover:shadow-xl transition-all"
                                    >
                                        保存更改
                                    </button>
                                </div>
                            </div>
                        )
                    )}
                </div>
            </div>
        );
    };

    // Toast Notification Component
    const renderNotification = () => {
        if (!latestArtifact) return null;
        return (
            <div className="absolute bottom-6 right-6 z-50 animate-slideUp">
                <div className="bg-slate-900/90 text-white p-4 rounded-xl shadow-2xl backdrop-blur-sm border border-slate-700 flex items-center gap-4 max-w-sm">
                    <div className="bg-indigo-500/20 p-2 rounded-lg">
                        <Sparkles className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm">Artifact Generated</h4>
                        <p className="text-xs text-slate-300 truncate">{latestArtifact.title}</p>
                    </div>
                    <div className="flex items-center gap-2 border-l border-slate-700 pl-3">
                        <button
                            onClick={() => {
                                setViewMode('artifact');
                                setActiveArtifactId(latestArtifact.id);
                                setLatestArtifact(null);
                            }}
                            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                            Open
                        </button>
                        <button
                            onClick={() => setLatestArtifact(null)}
                            className="text-slate-500 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-full w-full bg-white overflow-hidden relative">
            {renderCopilot()}
            <div className="flex-1 flex flex-col h-full bg-slate-50 relative border-l border-slate-200 shadow-sm">
                {/* Main Content Area */}
                {viewMode === 'segment' && (
                    <div className="flex-1 flex items-center justify-center text-slate-400">
                        <p>Select a story segment to edit (Editor Integration Pending)</p>
                    </div>
                )}

                {viewMode === 'step' && (
                    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
                        {activeStepId && workflow.find(s => s.id === activeStepId) ? (
                            (() => {
                                const step = workflow.find(s => s.id === activeStepId)!;
                                const agent = getAgentById(step.agentId);
                                const output = stepOutputs[step.id] || "";
                                const log = executionLogs[step.id];

                                return (
                                    <div className="flex flex-col h-full animate-fadeIn">
                                        {/* Detail Header */}
                                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
                                            <div>
                                                <div className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                    {step.name}
                                                    {(log?.status === 'generating' || log?.status === 'reviewing' || log?.status === 'revising') && <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />}
                                                </div>
                                                <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                                                    <span className={`px-2 py-0.5 rounded-full text-white font-bold ${agent.color} flex items-center gap-1`}>
                                                        <Bot className="w-3 h-3" /> {agent.name}
                                                    </span>
                                                    <span>•</span>
                                                    <span className="italic">"{step.instruction.slice(0, 50)}..."</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => setViewMode('segment')} className="text-slate-400 hover:text-slate-600">
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Large Output Editor */}
                                        <div className="flex-1 bg-slate-50 overflow-hidden relative">
                                            <div className="absolute inset-0 pb-16"> {/* Padding for footer */}
                                                <MilkdownEditor
                                                    content={output}
                                                    onChange={(val) => onUpdateStepOutputs(prev => ({ ...prev, [step.id]: val }))}
                                                    onAnalysisRequest={onAnalysisRequest}
                                                />
                                            </div>
                                        </div>

                                        {/* Footer Actions */}
                                        <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3">
                                            {log?.status === 'completed' && workflowStatus === 'paused' && currentStepIndex === workflow.findIndex(s => s.id === step.id) && (
                                                <button
                                                    onClick={() => handleContinue(currentStepIndex)}
                                                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl transition-all flex items-center gap-2"
                                                >
                                                    <ArrowRight className="w-4 h-4" /> 确认并继续 (Confirm & Continue)
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400">
                                <p>Select a step to view details</p>
                            </div>
                        )}
                    </div>
                )}

                {viewMode === 'artifact' && (
                <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
                    {activeArtifactId && artifacts.find(a => a.id === activeArtifactId) ? (
                        <ArtifactEditor
                            artifact={artifacts.find(a => a.id === activeArtifactId)!}
                            onUpdate={(content) => {
                                onUpdateArtifacts(artifacts.map(a => a.id === activeArtifactId ? { ...a, content } : a));
                            }}
                            onClose={() => setViewMode('segment')}
                            onAnalysisRequest={onAnalysisRequest}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400">
                                <p>Select an artifact to view</p>
                            </div>
                        )}
                    </div>
                )}

            </div>
            {renderFloatingAgentWindow()}
        </div>
    );
};

// Sub-component for Artifact Editing with Save Status
const ArtifactEditor: React.FC<{
    artifact: StoryArtifact;
    onUpdate: (content: string) => void;
    onClose: () => void;
    onAnalysisRequest?: (text: string, action?: 'analyze' | 'explain' | 'expand') => void;
}> = ({ artifact, onUpdate, onClose, onAnalysisRequest }) => {
    const [content, setContent] = useState(artifact.content);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');

    // Sync local state when artifact ID changes
    useEffect(() => {
        setContent(artifact.content);
        setSaveStatus('saved');
    }, [artifact.id]);

    const executeSave = React.useCallback(() => {
        onUpdate(content);
        setSaveStatus('saved');
    }, [content, onUpdate]);

    useEffect(() => {
        if (content === artifact.content) {
            setSaveStatus('saved');
            return;
        }
        setSaveStatus('saving');
        const timer = setTimeout(() => { executeSave(); }, 2000);
        return () => clearTimeout(timer);
    }, [content, artifact.content]);

    return (
        <div className="flex flex-col h-full animate-fadeIn">
            {/* Artifact Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div>
                    <div className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        {artifact.title}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-500 uppercase flex items-center gap-1">
                            {artifact.type} • {new Date(artifact.createdAt).toLocaleString()}
                        </span>

                        {/* Save Status Indicator */}
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 border-l border-slate-200 pl-3">
                            {saveStatus === 'saving' && <><Loader2 className="w-3 h-3 animate-spin" /> 保存中...</>}
                            {saveStatus === 'saved' && <><CheckCircle2 className="w-3 h-3 text-emerald-500" /> 已保存</>}
                        </span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Artifact Content */}
            <div className="flex-1 bg-slate-50 overflow-hidden relative">
                <div className="absolute inset-0 pb-16">
                    <MilkdownEditor
                        content={content}
                        onChange={(val) => setContent(val)}
                        onAnalysisRequest={onAnalysisRequest}
                    />
                </div>
            </div>
        </div>
    );
};

export default StoryAgentView;
