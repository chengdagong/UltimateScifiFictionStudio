import { describe, it, expect, beforeEach } from 'vitest';
import { useStoryStore } from '../../stores/storyStore';

describe('storyStore', () => {
   beforeEach(() => {
      // Reset store before each test
      const store = useStoryStore.getState();
      store.resetStoryEngine();
   });

   describe('Agents Management', () => {
      it('should set agents', () => {
         const store = useStoryStore.getState();
         const testAgents = [
            { id: '1', name: 'Narrator', role: 'narrator', instructions: 'Tell the story' }
         ];
         
         store.setAgents(testAgents);
         
         expect(store.agents).toEqual(testAgents);
         expect(store.agents).toHaveLength(1);
      });

      it('should update agents array', () => {
         const store = useStoryStore.getState();
         const agents1 = [{ id: '1', name: 'Agent 1', role: 'role1', instructions: 'inst1' }];
         const agents2 = [
            { id: '1', name: 'Agent 1', role: 'role1', instructions: 'inst1' },
            { id: '2', name: 'Agent 2', role: 'role2', instructions: 'inst2' }
         ];
         
         store.setAgents(agents1);
         expect(store.agents).toHaveLength(1);
         
         store.setAgents(agents2);
         expect(store.agents).toHaveLength(2);
      });
   });

   describe('Workflow Management', () => {
      it('should set workflow', () => {
         const store = useStoryStore.getState();
         const testWorkflow = [
            { id: '1', agentId: 'agent1', action: 'analyze', prompt: 'Analyze this' }
         ];
         
         store.setWorkflow(testWorkflow);
         
         expect(store.workflow).toEqual(testWorkflow);
         expect(store.workflow).toHaveLength(1);
      });

      it('should update workflow steps', () => {
         const store = useStoryStore.getState();
         const workflow1 = [{ id: '1', agentId: 'a1', action: 'act1', prompt: 'p1' }];
         const workflow2 = [
            { id: '1', agentId: 'a1', action: 'act1', prompt: 'p1' },
            { id: '2', agentId: 'a2', action: 'act2', prompt: 'p2' }
         ];
         
         store.setWorkflow(workflow1);
         expect(store.workflow).toHaveLength(1);
         
         store.setWorkflow(workflow2);
         expect(store.workflow).toHaveLength(2);
      });
   });

   describe('Story Guidance', () => {
      it('should set story guidance', () => {
         const store = useStoryStore.getState();
         
         store.setStoryGuidance('Write a fantasy story');
         
         expect(store.storyGuidance).toBe('Write a fantasy story');
      });

      it('should update story guidance', () => {
         const store = useStoryStore.getState();
         
         store.setStoryGuidance('Initial guidance');
         expect(store.storyGuidance).toBe('Initial guidance');
         
         store.setStoryGuidance('Updated guidance');
         expect(store.storyGuidance).toBe('Updated guidance');
      });
   });

   describe('Workflow Status', () => {
      it('should set workflow status', () => {
         const store = useStoryStore.getState();
         
         store.setWorkflowStatus('running');
         
         expect(store.workflowStatus).toBe('running');
      });

      it('should transition between statuses', () => {
         const store = useStoryStore.getState();
         
         expect(store.workflowStatus).toBe('idle');
         
         store.setWorkflowStatus('running');
         expect(store.workflowStatus).toBe('running');
         
         store.setWorkflowStatus('completed');
         expect(store.workflowStatus).toBe('completed');
      });
   });

   describe('Workflow Execution', () => {
      it('should set current step index', () => {
         const store = useStoryStore.getState();
         
         store.setCurrentStepIndex(2);
         
         expect(store.currentStepIndex).toBe(2);
      });

      it('should set execution logs', () => {
         const store = useStoryStore.getState();
         const logs = { 'step1': 'Log for step 1', 'step2': 'Log for step 2' };
         
         store.setExecutionLogs(logs);
         
         expect(store.executionLogs).toEqual(logs);
      });

      it('should set step outputs', () => {
         const store = useStoryStore.getState();
         const outputs = { 'step1': 'Output 1', 'step2': 'Output 2' };
         
         store.setStepOutputs(outputs);
         
         expect(store.stepOutputs).toEqual(outputs);
      });
   });

   describe('Generated Draft', () => {
      it('should set generated draft', () => {
         const store = useStoryStore.getState();
         
         store.setGeneratedDraft('This is a generated story...');
         
         expect(store.generatedDraft).toBe('This is a generated story...');
      });
   });

   describe('Artifacts', () => {
      it('should set artifacts', () => {
         const store = useStoryStore.getState();
         const artifacts = [
            { id: '1', type: 'plot', content: 'Plot outline', createdAt: Date.now() }
         ];
         
         store.setArtifacts(artifacts);
         
         expect(store.artifacts).toEqual(artifacts);
         expect(store.artifacts).toHaveLength(1);
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
         store.resetStoryEngine();
         
         // Verify all reset to defaults
         expect(store.agents).toEqual([]);
         expect(store.workflow).toEqual([]);
         expect(store.storyGuidance).toBe('');
         expect(store.workflowStatus).toBe('idle');
         expect(store.currentStepIndex).toBe(-1);
         expect(store.executionLogs).toEqual({});
         expect(store.stepOutputs).toEqual({});
         expect(store.generatedDraft).toBe('');
         expect(store.artifacts).toEqual([]);
      });
   });
});
