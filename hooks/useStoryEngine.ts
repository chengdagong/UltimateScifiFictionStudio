import { Dispatch, SetStateAction } from 'react';
import { StoryAgent, WorkflowStep, StepExecutionLog, StoryArtifact } from '../types';
import { useStoryStore } from '../stores/storyStore';

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

    // Helpers
    resetStoryEngine: () => void;
}

/**
 * 兼容层：包装 Zustand storyStore，保持原有 API 接口
 * 注意：为了完全兼容 React.Dispatch<SetStateAction<T>>，需要支持函数式更新
 */
export const useStoryEngine = (): UseStoryEngineReturn => {
    const store = useStoryStore();
    
    // 创建兼容 Dispatch<SetStateAction<T>> 的 setter
    // SetStateAction<T> = T | ((prevState: T) => T)
    const createStateSetter = <T,>(getValue: () => T, setValue: (value: T) => void): Dispatch<SetStateAction<T>> => {
        return (action: SetStateAction<T>) => {
            if (typeof action === 'function') {
                // 函数式更新
                const updateFn = action as (prevState: T) => T;
                setValue(updateFn(getValue()));
            } else {
                // 直接更新
                setValue(action);
            }
        };
    };
    
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
        
        resetStoryEngine: store.reset
    };
};
