import { describe, it, expect, beforeEach } from 'vitest';
import { useStoryStore } from '../../stores/storyStore';

describe('storyStore', () => {
   beforeEach(() => {
      // Reset store before each test
      const store = useStoryStore.getState();
      store.reset();
   });

   describe('Agents Management', () => {
      it('should set agents', () => {
         const testAgents = [
            { id: '1', name: 'Narrator', role: 'narrator', instructions: 'Tell the story' }
         ];
         
         useStoryStore.getState().setAgents(testAgents);
         
         expect(useStoryStore.getState().agents).toEqual(testAgents);
         expect(useStoryStore.getState().agents).toHaveLength(1);
      });

      it('should update agents array', () => {
         const agents1 = [{ id: '1', name: 'Agent 1', role: 'role1', instructions: 'inst1' }];
         const agents2 = [
            { id: '1', name: 'Agent 1', role: 'role1', instructions: 'inst1' },
            { id: '2', name: 'Agent 2', role: 'role2', instructions: 'inst2' }
         ];
         
         useStoryStore.getState().setAgents(agents1);
         expect(useStoryStore.getState().agents).toHaveLength(1);
         
         useStoryStore.getState().setAgents(agents2);
         expect(useStoryStore.getState().agents).toHaveLength(2);
      });
   });

   describe('Workflow Management', () => {
      it('should set workflow', () => {
         const testWorkflow = [
            { id: '1', agentId: 'agent1', action: 'analyze', prompt: 'Analyze this' }
         ];
         
         useStoryStore.getState().setWorkflow(testWorkflow);
         
         expect(useStoryStore.getState().workflow).toEqual(testWorkflow);
         expect(useStoryStore.getState().workflow).toHaveLength(1);
      });

      it('should update workflow steps', () => {
         const workflow1 = [{ id: '1', agentId: 'a1', action: 'act1', prompt: 'p1' }];
         const workflow2 = [
            { id: '1', agentId: 'a1', action: 'act1', prompt: 'p1' },
            { id: '2', agentId: 'a2', action: 'act2', prompt: 'p2' }
         ];
         
         useStoryStore.getState().setWorkflow(workflow1);
         expect(useStoryStore.getState().workflow).toHaveLength(1);
         
         useStoryStore.getState().setWorkflow(workflow2);
         expect(useStoryStore.getState().workflow).toHaveLength(2);
      });
   });

   describe('Story Guidance', () => {
      it('should set story guidance', () => {
         useStoryStore.getState().setStoryGuidance('Write a fantasy story');
         
         expect(useStoryStore.getState().storyGuidance).toBe('Write a fantasy story');
      });

      it('should update story guidance', () => {
         useStoryStore.getState().setStoryGuidance('Initial guidance');
         expect(useStoryStore.getState().storyGuidance).toBe('Initial guidance');
         
         useStoryStore.getState().setStoryGuidance('Updated guidance');
         expect(useStoryStore.getState().storyGuidance).toBe('Updated guidance');
      });
   });

   describe('Workflow Status', () => {
      it('should set workflow status', () => {
         useStoryStore.getState().setWorkflowStatus('running');
         
         expect(useStoryStore.getState().workflowStatus).toBe('running');
      });

      it('should transition between statuses', () => {
         expect(useStoryStore.getState().workflowStatus).toBe('idle');
         
         useStoryStore.getState().setWorkflowStatus('running');
         expect(useStoryStore.getState().workflowStatus).toBe('running');
         
         useStoryStore.getState().setWorkflowStatus('completed');
         expect(useStoryStore.getState().workflowStatus).toBe('completed');
      });
   });

   describe('Workflow Execution', () => {
      it('should set current step index', () => {
         useStoryStore.getState().setCurrentStepIndex(2);
         
         expect(useStoryStore.getState().currentStepIndex).toBe(2);
      });

      it('should set execution logs', () => {
         const logs = { 'step1': 'Log for step 1', 'step2': 'Log for step 2' };
         
         useStoryStore.getState().setExecutionLogs(logs);
         
         expect(useStoryStore.getState().executionLogs).toEqual(logs);
      });

      it('should set step outputs', () => {
         const outputs = { 'step1': 'Output 1', 'step2': 'Output 2' };
         
         useStoryStore.getState().setStepOutputs(outputs);
         
         expect(useStoryStore.getState().stepOutputs).toEqual(outputs);
      });
   });

   describe('Generated Draft', () => {
      it('should set generated draft', () => {
         useStoryStore.getState().setGeneratedDraft('This is a generated story...');
         
         expect(useStoryStore.getState().generatedDraft).toBe('This is a generated story...');
      });
   });

   describe('Artifacts', () => {
      it('should set artifacts', () => {
         const artifacts = [
            { id: '1', type: 'plot', content: 'Plot outline', createdAt: Date.now() }
         ];
         
         useStoryStore.getState().setArtifacts(artifacts);
         
         expect(useStoryStore.getState().artifacts).toEqual(artifacts);
         expect(useStoryStore.getState().artifacts).toHaveLength(1);
      });
   });

   describe('Reset Story Engine', () => {
      it('should reset all story engine state', () => {
         const store = useStoryStore.getState();
         
         // Set some state
         store.setAgents([{ id: '1', name: 'Agent', role: 'role', instructions: 'inst' }]);
         store.setStoryGuidance('Some guidance');
         store.setWorkflowStatus('running');
         store.setCurrentStepIndex(5);
         store.setGeneratedDraft('Draft content');
         
         // Reset
         store.reset();
         
         // Verify all reset to defaults
         const resetStore = useStoryStore.getState();
         expect(resetStore.agents).toEqual([]);
         expect(resetStore.workflow).toEqual([]);
         expect(resetStore.storyGuidance).toBe('');
         expect(resetStore.workflowStatus).toBe('idle');
         expect(resetStore.currentStepIndex).toBe(-1);
         expect(resetStore.executionLogs).toEqual({});
         expect(resetStore.stepOutputs).toEqual({});
         expect(resetStore.generatedDraft).toBe('');
         expect(resetStore.artifacts).toEqual([]);
      });
   });

   describe('Granular Actions', () => {
      it('should update step status', () => {
         const stepId = 'step-1';
         useStoryStore.getState().updateStepStatus(stepId, 'generating');
         
         const logs = useStoryStore.getState().executionLogs;
         expect(logs[stepId]).toBeDefined();
         expect(logs[stepId].status).toBe('generating');
      });

      it('should add log entry', () => {
         const stepId = 'step-1';
         useStoryStore.getState().addLogEntry(stepId, 'Log 1');
         useStoryStore.getState().addLogEntry(stepId, 'Log 2');
         
         const logs = useStoryStore.getState().executionLogs;
         expect(logs[stepId].logs).toEqual(['Log 1', 'Log 2']);
      });

      it('should update step output', () => {
         const stepId = 'step-1';
         useStoryStore.getState().updateStepOutput(stepId, 'Output content');
         
         expect(useStoryStore.getState().stepOutputs[stepId]).toBe('Output content');
      });

      it('should add artifact', () => {
         const artifact = { id: 'art-1', title: 'Art 1', type: 'text', content: 'Content', createdAt: 123 } as any;
         useStoryStore.getState().addArtifact(artifact);
         
         expect(useStoryStore.getState().artifacts).toContainEqual(artifact);
      });

      it('should reset execution state only', () => {
         const store = useStoryStore.getState();
         
         // Set config and execution state
         store.setAgents([{ id: '1', name: 'Agent', role: 'role', systemPrompt: 'prompt', color: 'red', icon: 'icon' }]);
         store.setWorkflowStatus('running');
         store.setCurrentStepIndex(2);
         store.updateStepStatus('step-1', 'completed');
         
         // Reset execution state
         store.resetExecutionState();
         
         const newStore = useStoryStore.getState();
         // Config should remain
         expect(newStore.agents).toHaveLength(1);
         // Execution state should be reset
         expect(newStore.workflowStatus).toBe('idle');
         expect(newStore.currentStepIndex).toBe(-1);
         expect(newStore.executionLogs).toEqual({});
      });
   });
});
