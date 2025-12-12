import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { StoryAgent, WorkflowStep, StepExecutionLog, StoryArtifact } from '../types';

interface StoryState {
  // Core Data
  agents: StoryAgent[];
  workflow: WorkflowStep[];
  artifacts: StoryArtifact[];
  
  // Workflow Execution State
  storyGuidance: string;
  workflowStatus: 'idle' | 'running' | 'paused' | 'completed';
  currentStepIndex: number;
  executionLogs: Record<string, StepExecutionLog>;
  stepOutputs: Record<string, string>;
  generatedDraft: string;
  
  // Actions
  setAgents: (agents: StoryAgent[]) => void;
  setWorkflow: (workflow: WorkflowStep[]) => void;
  setArtifacts: (artifacts: StoryArtifact[]) => void;
  setStoryGuidance: (guidance: string) => void;
  setWorkflowStatus: (status: 'idle' | 'running' | 'paused' | 'completed') => void;
  setCurrentStepIndex: (index: number) => void;
  setExecutionLogs: (logs: Record<string, StepExecutionLog>) => void;
  setStepOutputs: (outputs: Record<string, string>) => void;
  setGeneratedDraft: (draft: string) => void;
  
  // Global Reset
  reset: () => void;
}

export const useStoryStore = create<StoryState>()(
  devtools(
    (set) => ({
      // Initial State
      agents: [],
      workflow: [],
      artifacts: [],
      storyGuidance: '',
      workflowStatus: 'idle',
      currentStepIndex: -1,
      executionLogs: {},
      stepOutputs: {},
      generatedDraft: '',
      
      // Simple Setters
      setAgents: (agents) => set({ agents }),
      setWorkflow: (workflow) => set({ workflow }),
      setArtifacts: (artifacts) => set({ artifacts }),
      setStoryGuidance: (storyGuidance) => set({ storyGuidance }),
      setWorkflowStatus: (workflowStatus) => set({ workflowStatus }),
      setCurrentStepIndex: (currentStepIndex) => set({ currentStepIndex }),
      setExecutionLogs: (executionLogs) => set({ executionLogs }),
      setStepOutputs: (stepOutputs) => set({ stepOutputs }),
      setGeneratedDraft: (generatedDraft) => set({ generatedDraft }),
      
      // Reset
      reset: () => set({
        agents: [],
        workflow: [],
        artifacts: [],
        storyGuidance: '',
        workflowStatus: 'idle',
        currentStepIndex: -1,
        executionLogs: {},
        stepOutputs: {},
        generatedDraft: ''
      })
    }),
    { name: 'StoryStore' }
  )
);
