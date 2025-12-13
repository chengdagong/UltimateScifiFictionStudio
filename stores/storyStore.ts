import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { StoryAgent, WorkflowStep, StepExecutionLog, StoryArtifact, WorkflowStatus, ExecutionLog } from '../types';

interface StoryState {
  // Core Data
  agents: StoryAgent[];
  workflow: WorkflowStep[];
  artifacts: StoryArtifact[];
  
  // Workflow Execution State
  storyGuidance: string;
  workflowStatus: WorkflowStatus;
  currentStepIndex: number;
  executionLogs: Record<string, StepExecutionLog>;
  stepOutputs: Record<string, string>;
  generatedDraft: string;
  
  // Actions
  setAgents: (agents: StoryAgent[]) => void;
  setWorkflow: (workflow: WorkflowStep[]) => void;
  setArtifacts: (artifacts: StoryArtifact[]) => void;
  setStoryGuidance: (guidance: string) => void;
  setWorkflowStatus: (status: WorkflowStatus) => void;
  setCurrentStepIndex: (index: number) => void;
  setExecutionLogs: (logs: Record<string, StepExecutionLog>) => void;
  setStepOutputs: (outputs: Record<string, string>) => void;
  setGeneratedDraft: (draft: string) => void;

  // Granular Actions
  updateStepStatus: (stepId: string, status: StepExecutionLog['status']) => void;
  addLogEntry: (stepId: string, entry: ExecutionLog) => void;
  updateStepOutput: (stepId: string, output: string) => void;
  addArtifact: (artifact: StoryArtifact) => void;
  resetExecutionState: () => void;
  
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

      // Granular Actions
      updateStepStatus: (stepId, status) => set((state) => {
        const currentLog = state.executionLogs[stepId] || {
          status: 'pending',
          content: '',
          attempts: [],
          logs: []
        };
        return {
          executionLogs: {
            ...state.executionLogs,
            [stepId]: { ...currentLog, status }
          }
        };
      }),

      addLogEntry: (stepId, entry) => set((state) => {
        const currentLog = state.executionLogs[stepId] || {
          status: 'pending',
          content: '',
          attempts: [],
          logs: []
        };
        return {
          executionLogs: {
            ...state.executionLogs,
            [stepId]: {
              ...currentLog,
              logs: [...(currentLog.logs || []), entry]
            }
          }
        };
      }),

      updateStepOutput: (stepId, output) => set((state) => ({
        stepOutputs: {
          ...state.stepOutputs,
          [stepId]: output
        }
      })),

      addArtifact: (artifact) => set((state) => ({
        artifacts: [...state.artifacts, artifact]
      })),

      resetExecutionState: () => set({
        workflowStatus: 'idle',
        currentStepIndex: -1,
        executionLogs: {},
        stepOutputs: {},
        generatedDraft: ''
      }),
      
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
