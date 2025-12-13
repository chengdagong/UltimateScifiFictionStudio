import { Dispatch, SetStateAction, useCallback } from 'react';
import { StoryAgent, WorkflowStep, StepExecutionLog, StoryArtifact } from '../types';
import { useStoryStore } from '../stores/storyStore';
import { useWorldModel } from './useWorldModel';
import { useApiSettings } from './useApiSettings';
import { useTaskStore } from '../stores/taskStore';
import { useAppStore } from '../stores/appStore';
import { executeAgentTask, executeReviewTask } from '../services/geminiService';

export interface UseStoryEngineReturn {
    agents: StoryAgent[];
    setAgents: Dispatch<SetStateAction<StoryAgent[]>>;
    workflow: WorkflowStep[];
    setWorkflow: Dispatch<SetStateAction<WorkflowStep[]>>;

    // Lifted Execution State
    storyGuidance: string;
    setStoryGuidance: Dispatch<SetStateAction<string>>;
    workflowStatus: 'idle' | 'running' | 'paused' | 'completed';
    setWorkflowStatus: Dispatch<SetStateAction<'idle' | 'running' | 'paused' | 'completed'>>;
    currentStepIndex: number;
    setCurrentStepIndex: Dispatch<SetStateAction<number>>;
    executionLogs: Record<string, StepExecutionLog>;
    setExecutionLogs: Dispatch<SetStateAction<Record<string, StepExecutionLog>>>;
    stepOutputs: Record<string, string>;
    setStepOutputs: Dispatch<SetStateAction<Record<string, string>>>;
    generatedDraft: string;
    setGeneratedDraft: Dispatch<SetStateAction<string>>;
    artifacts: StoryArtifact[];
    setArtifacts: Dispatch<SetStateAction<StoryArtifact[]>>;

    // Actions
    startWorkflow: (selectedSegmentId?: string | null) => Promise<void>;
    continueWorkflow: (fromIndex: number) => Promise<void>;
    applyResult: (content: string, selectedSegmentId?: string | null) => void;
    resetStoryEngine: () => void;
}

/**
 * 核心业务逻辑 Hook：Story Engine
 * 包含工作流执行、AI 调用、状态管理
 */
export const useStoryEngine = (): UseStoryEngineReturn => {
    const store = useStoryStore();
    const { 
        model, 
        currentFramework: framework, 
        worldContext, 
        storySegments, 
        currentTimeSetting,
        handleAddStorySegment,
        handleUpdateStorySegment
    } = useWorldModel();
    const { apiSettings: settings } = useApiSettings();
    const taskStore = useTaskStore();
    const { addToast } = useAppStore();

    // 创建兼容 Dispatch<SetStateAction<T>> 的 setter
    const createStateSetter = <T,>(getValue: () => T, setValue: (value: T) => void): Dispatch<SetStateAction<T>> => {
        return (action: SetStateAction<T>) => {
            if (typeof action === 'function') {
                const updateFn = action as (prevState: T) => T;
                setValue(updateFn(getValue()));
            } else {
                setValue(action);
            }
        };
    };

    const getAgentById = (id: string) => store.agents.find(a => a.id === id) || store.agents[0];

    // --- Core Execution Logic ---

    const executeStep = async (index: number, inputContext: string) => {
        if (index >= store.workflow.length) {
            store.setWorkflowStatus('completed');
            return;
        }

        const step = store.workflow[index];
        const agent = getAgentById(step.agentId);
        
        store.setCurrentStepIndex(index);
        store.setWorkflowStatus('running');

        // Initialize Log
        store.updateStepStatus(step.id, 'generating');
        
        let taskId = "";
        if (taskStore) {
            taskId = taskStore.addTask({
                type: 'story_step',
                name: `执行步骤: ${step.name}`,
                description: step.instruction,
                metadata: { stepId: step.id }
            });
            taskStore.updateTask(taskId, { status: 'running', progress: 0 });
        }

        try {
            let currentRound = 1;
            let isApproved = false;
            let content = "";
            let critique = "";
            const maxRetries = step.validation ? (step.validation.maxRetries || 1) : 0;

            // Iteration Loop
            while (!isApproved && currentRound <= maxRetries + 1) {
                const status = currentRound > 1 ? 'revising' : 'generating';
                store.updateStepStatus(step.id, status);

                // 1. Generate
                content = await executeAgentTask(
                    agent,
                    step.instruction,
                    inputContext,
                    model,
                    framework,
                    worldContext,
                    currentTimeSetting,
                    settings,
                    critique
                );

                // Update Log with Attempt
                store.addLogEntry(step.id, {
                    round: currentRound,
                    output: content
                });
                
                // Also update the main content in log for easy access
                store.setExecutionLogs({
                    ...store.executionLogs,
                    [step.id]: {
                        ...store.executionLogs[step.id],
                        content: content
                    }
                });

                // 2. Validate (if needed)
                if (step.validation) {
                    store.updateStepStatus(step.id, 'reviewing');
                    const reviewer = getAgentById(step.validation.reviewerId);
                    const reviewResult = await executeReviewTask(
                        reviewer, 
                        content, 
                        step.validation.criteria, 
                        model, 
                        framework, 
                        worldContext, 
                        settings
                    );

                    // Update Log with Critique
                    const currentLog = store.executionLogs[step.id];
                    const attempts = [...(currentLog.attempts || [])];
                    // Ensure we are updating the correct attempt (last one)
                    if (attempts.length > 0) {
                        attempts[attempts.length - 1].critique = reviewResult.feedback;
                        attempts[attempts.length - 1].verdict = reviewResult.verdict;
                    }
                    
                    store.setExecutionLogs({
                        ...store.executionLogs,
                        [step.id]: {
                            ...currentLog,
                            attempts
                        }
                    });

                    if (reviewResult.verdict === 'PASS') {
                        isApproved = true;
                    } else {
                        critique = reviewResult.feedback;
                        currentRound++;
                    }
                } else {
                    isApproved = true;
                }
            }

            store.updateStepStatus(step.id, 'completed');
            store.updateStepOutput(step.id, content);

            // Artifact Generation
            const newArtifact: StoryArtifact = {
                id: crypto.randomUUID(),
                title: `${step.name} Output`,
                type: step.outputArtifactType || 'markdown',
                content: content,
                sourceStepId: step.id,
                createdAt: Date.now()
            };

            store.addArtifact(newArtifact);

            if (taskId && taskStore) {
                taskStore.updateTask(taskId, {
                    status: 'completed',
                    progress: 100,
                    result: { summary: '步骤执行完成', data: content },
                    updatedAt: Date.now()
                });
            }

            addToast({
                type: 'success',
                message: `步骤 "${step.name}" 执行完成`,
                duration: 3000
            });

            store.setWorkflowStatus('paused');

        } catch (e: any) {
            console.error(e);
            store.updateStepStatus(step.id, 'failed');
            // store.setExecutionLogs... error message? 
            // The store.updateStepStatus doesn't take error message, let's manually update
            store.setExecutionLogs({
                ...store.executionLogs,
                [step.id]: {
                    ...store.executionLogs[step.id],
                    status: 'failed',
                    error: e.message
                }
            });

            if (taskId && taskStore) {
                taskStore.updateTask(taskId, {
                    status: 'failed',
                    result: { error: e.message },
                    updatedAt: Date.now()
                });
            }

            store.setWorkflowStatus('paused');
            addToast({
                type: 'error',
                message: `步骤执行失败: ${e.message}`,
                duration: 5000
            });
        }
    };

    const startWorkflow = useCallback(async (selectedSegmentId?: string | null) => {
        if (!settings.apiKey) {
            addToast({ type: 'error', message: "请先配置 API Key" });
            return;
        }
        if (!store.storyGuidance.trim()) {
            addToast({ type: 'warning', message: "请输入故事指令" });
            return;
        }

        // Reset
        store.setExecutionLogs({});
        store.setStepOutputs({});
        store.setCurrentStepIndex(-1);

        // Prepare initial context
        let contextSegments = storySegments;
        if (selectedSegmentId) {
            const idx = storySegments.findIndex(s => s.id === selectedSegmentId);
            if (idx !== -1) {
                contextSegments = storySegments.slice(0, idx);
            }
        }
        
        const contextText = contextSegments.length > 0
            ? `【前情提要】:\n${contextSegments[contextSegments.length - 1].content.slice(-2000)}`
            : "这是故事的开篇。";

        const initialInput = `
${contextText}

【本章核心指令 (User Directive)】:
"${store.storyGuidance}"
`;
        // Start Step 0
        await executeStep(0, initialInput);
    }, [settings.apiKey, store.storyGuidance, storySegments, store.workflow]);

    const continueWorkflow = useCallback(async (fromIndex: number) => {
        const currentStep = store.workflow[fromIndex];
        // The input for the next step is the (potentially edited) output of the current step
        const outputOfCurrentStep = store.stepOutputs[currentStep.id] || "";

        await executeStep(fromIndex + 1, outputOfCurrentStep);
    }, [store.workflow, store.stepOutputs]);

    const applyResult = useCallback((content: string, selectedSegmentId?: string | null) => {
        if (selectedSegmentId) {
            const segment = storySegments.find(s => s.id === selectedSegmentId);
            if (segment) {
                handleUpdateStorySegment(selectedSegmentId, segment.content + "\n\n" + content);
            }
        } else {
            handleAddStorySegment(content);
        }
        store.setGeneratedDraft("");
        store.setWorkflowStatus('idle');
        addToast({ type: 'success', message: "内容已应用到故事" });
    }, [storySegments, handleUpdateStorySegment, handleAddStorySegment]);

    return {
        agents: store.agents,
        setAgents: createStateSetter(() => store.agents, store.setAgents),
        
        workflow: store.workflow,
        setWorkflow: createStateSetter(() => store.workflow, store.setWorkflow),
        
        storyGuidance: store.storyGuidance,
        setStoryGuidance: createStateSetter(() => store.storyGuidance, store.setStoryGuidance),
        
        workflowStatus: store.workflowStatus,
        setWorkflowStatus: createStateSetter(() => store.workflowStatus, store.setWorkflowStatus),
        
        currentStepIndex: store.currentStepIndex,
        setCurrentStepIndex: createStateSetter(() => store.currentStepIndex, store.setCurrentStepIndex),
        
        executionLogs: store.executionLogs,
        setExecutionLogs: createStateSetter(() => store.executionLogs, store.setExecutionLogs),
        
        stepOutputs: store.stepOutputs,
        setStepOutputs: createStateSetter(() => store.stepOutputs, store.setStepOutputs),
        
        generatedDraft: store.generatedDraft,
        setGeneratedDraft: createStateSetter(() => store.generatedDraft, store.setGeneratedDraft),
        
        artifacts: store.artifacts,
        setArtifacts: createStateSetter(() => store.artifacts, store.setArtifacts),
        
        startWorkflow,
        continueWorkflow,
        applyResult,
        resetStoryEngine: store.reset
    };
};
