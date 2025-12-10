import { useState, Dispatch, SetStateAction } from 'react';
import { StoryAgent, WorkflowStep, StepExecutionLog, StoryArtifact } from '../types';

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

export const useStoryEngine = (): UseStoryEngineReturn => {
    const [agents, setAgents] = useState<StoryAgent[]>([]);
    const [workflow, setWorkflow] = useState<WorkflowStep[]>([]);

    // Lifted Workflow Execution State (Persisted across tabs)
    const [storyGuidance, setStoryGuidance] = useState("");
    const [workflowStatus, setWorkflowStatus] = useState<'idle' | 'running' | 'paused' | 'completed'>('idle');
    const [currentStepIndex, setCurrentStepIndex] = useState(-1);
    const [executionLogs, setExecutionLogs] = useState<Record<string, StepExecutionLog>>({});
    const [stepOutputs, setStepOutputs] = useState<Record<string, string>>({});
    const [generatedDraft, setGeneratedDraft] = useState("");
    const [artifacts, setArtifacts] = useState<StoryArtifact[]>([]);

    const resetStoryEngine = () => {
        setAgents([]);
        setWorkflow([]);
        setStoryGuidance("");
        setWorkflowStatus('idle');
        setCurrentStepIndex(-1);
        setExecutionLogs({});
        setStepOutputs({});
        setGeneratedDraft("");
        setArtifacts([]);
    };

    return {
        agents, setAgents,
        workflow, setWorkflow,
        storyGuidance, setStoryGuidance,
        workflowStatus, setWorkflowStatus,
        currentStepIndex, setCurrentStepIndex,
        executionLogs, setExecutionLogs,
        stepOutputs, setStepOutputs,
        generatedDraft, setGeneratedDraft,
        artifacts, setArtifacts,
        resetStoryEngine
    };
};
