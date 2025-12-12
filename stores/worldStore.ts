import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { WorldModel, StorySegment, SocialEntity, EntityCategory, EntityRelationship, EntityState, TechNode, TechDependency, ApiSettings } from '../types';
import { FRAMEWORKS, INITIAL_CONTEXTS } from '../constants/frameworks';
import { generateEntitiesForLayer, generateRelatedTechNode, generateWorldChronicle } from '../services/geminiService';

interface WorldState {
  // Model Data
  model: WorldModel;
  worldContext: string;
  storySegments: StorySegment[];
  currentTimeSetting: string;
  chronicleText: string;
  
  // Framework State
  currentFrameworkId: string;
  
  // Loading States
  loadingLayer: string | null;
  generatingTechId: string | null;
  isSyncing: boolean;
  
  // Setters (简单状态更新)
  setModel: (model: WorldModel) => void;
  setWorldContext: (context: string) => void;
  setStorySegments: (segments: StorySegment[]) => void;
  setCurrentTimeSetting: (time: string) => void;
  setChronicleText: (text: string) => void;
  setCurrentFrameworkId: (id: string) => void;
  
  // Entity Actions
  addEntity: (name: string, desc: string, category: EntityCategory) => string;
  updateEntity: (entityId: string, name: string, desc: string, category?: EntityCategory, validFrom?: string, validTo?: string) => void;
  removeEntity: (entityId: string) => void;
  generateLayer: (layerId: string, apiSettings: ApiSettings, checkApiKey: () => boolean, taskManager?: any) => Promise<void>;
  
  // Relationship Actions
  addRelationship: (sourceId: string, targetId: string, type: string, description: string, timestamp?: string, validFrom?: string, validTo?: string) => void;
  removeRelationship: (relId: string) => void;
  
  // Entity State Actions
  addEntityState: (entityId: string, timestamp: string, description: string) => void;
  updateEntityState: (stateId: string, description: string) => void;
  removeEntityState: (stateId: string) => void;
  
  // Tech Tree Actions
  addTechNode: (name: string, desc: string, era: string, type: 'military' | 'civil' | 'abstract') => void;
  addTechNodeWithLink: (name: string, desc: string, era: string, type: 'military' | 'civil' | 'abstract', linkedNodeId: string, direction: 'dependency' | 'unlock') => void;
  updateTechNode: (id: string, name: string, desc: string, era: string, type: 'military' | 'civil' | 'abstract', status: 'concept' | 'prototype' | 'production' | 'obsolete') => void;
  updateTechNodeLayout: (id: string, x: number, y: number) => void;
  removeTechNode: (id: string) => void;
  addTechDependency: (sourceId: string, targetId: string) => void;
  removeTechDependency: (id: string) => void;
  generateRelatedTech: (baseNodeId: string, relation: 'dependency' | 'unlock', apiSettings: ApiSettings, checkApiKey: () => boolean, taskManager?: any) => Promise<void>;
  
  // Story Segment Actions
  addStorySegment: (content: string) => void;
  updateStorySegment: (id: string, content: string, timestamp?: string) => void;
  removeStorySegment: (id: string) => void;
  
  // Global Actions
  syncChronicle: (apiSettings: ApiSettings, checkApiKey: () => boolean) => Promise<boolean>;
  reset: (initialContext?: string) => void;
}

export const useWorldStore = create<WorldState>()(
  devtools(
    (set, get) => ({
      // Initial State
      model: {
        entities: [],
        relationships: [],
        entityStates: [],
        technologies: [],
        techDependencies: []
      },
      worldContext: '',
      storySegments: [],
      currentTimeSetting: '第一章：序幕',
      chronicleText: '',
      currentFrameworkId: 'general',
      loadingLayer: null,
      generatingTechId: null,
      isSyncing: false,
      
      // Simple Setters
      setModel: (model) => set({ model }),
      setWorldContext: (worldContext) => set({ worldContext }),
      setStorySegments: (storySegments) => set({ storySegments }),
      setCurrentTimeSetting: (currentTimeSetting) => set({ currentTimeSetting }),
      setChronicleText: (chronicleText) => set({ chronicleText }),
      setCurrentFrameworkId: (currentFrameworkId) => set({ currentFrameworkId }),
      
      // Entity Actions
      addEntity: (name, desc, category) => {
        const newEntity: SocialEntity = {
          id: crypto.randomUUID(),
          name,
          description: desc,
          category
        };
        
        set((state) => ({
          model: {
            ...state.model,
            entities: [...state.model.entities, newEntity]
          }
        }));
        
        return newEntity.id;
      },
      
      updateEntity: (entityId, name, desc, category, validFrom, validTo) => {
        set((state) => ({
          model: {
            ...state.model,
            entities: state.model.entities.map(e =>
              e.id === entityId
                ? { ...e, name, description: desc, category: category || e.category, validFrom, validTo }
                : e
            )
          }
        }));
      },
      
      removeEntity: (entityId) => {
        set((state) => ({
          model: {
            ...state.model,
            entities: state.model.entities.filter(e => e.id !== entityId),
            relationships: state.model.relationships.filter(
              r => r.sourceId !== entityId && r.targetId !== entityId
            ),
            entityStates: state.model.entityStates.filter(s => s.entityId !== entityId)
          }
        }));
      },
      
      generateLayer: async (layerId, apiSettings, checkApiKey, taskManager) => {
        if (!checkApiKey()) return;
        
        set({ loadingLayer: layerId });
        
        let taskId = '';
        const state = get();
        const framework = FRAMEWORKS[state.currentFrameworkId] || FRAMEWORKS['general'];
        
        if (taskManager) {
          const layerDef = framework.layers.find(l => l.id === layerId);
          const layerName = layerDef ? layerDef.title : layerId;
          taskId = taskManager.addTask('generation', `生成层级：${layerName}`, 'AI 正在构建社会结构...', undefined, { layerId });
          taskManager.updateTask(taskId, { status: 'running', progress: 10 });
        }
        
        try {
          const layerDef = framework.layers.find(l => l.id === layerId);
          if (!layerDef) return;
          
          const newEntities = await generateEntitiesForLayer(layerDef, state.worldContext, 0, apiSettings);
          
          set((state) => ({
            model: {
              ...state.model,
              entities: [...state.model.entities, ...newEntities]
            }
          }));
          
          if (taskId && taskManager) {
            taskManager.completeTask(taskId, { summary: `生成了 ${newEntities.length} 个实体` });
          }
        } catch (e: any) {
          alert(e.message);
          if (taskId && taskManager) {
            taskManager.failTask(taskId, e.message);
          }
        } finally {
          set({ loadingLayer: null });
        }
      },
      
      // Relationship Actions
      addRelationship: (sourceId, targetId, type, description, timestamp, validFrom, validTo) => {
        const newRel: EntityRelationship = {
          id: crypto.randomUUID(),
          sourceId,
          targetId,
          type,
          description,
          timestamp,
          validFrom,
          validTo
        };
        
        set((state) => ({
          model: {
            ...state.model,
            relationships: [...state.model.relationships, newRel]
          }
        }));
      },
      
      removeRelationship: (relId) => {
        set((state) => ({
          model: {
            ...state.model,
            relationships: state.model.relationships.filter(r => r.id !== relId)
          }
        }));
      },
      
      // Entity State Actions
      addEntityState: (entityId, timestamp, description) => {
        const newState: EntityState = {
          id: crypto.randomUUID(),
          entityId,
          timestamp,
          description
        };
        
        set((state) => ({
          model: {
            ...state.model,
            entityStates: [...state.model.entityStates, newState]
          }
        }));
      },
      
      updateEntityState: (stateId, description) => {
        set((state) => ({
          model: {
            ...state.model,
            entityStates: state.model.entityStates.map(s =>
              s.id === stateId ? { ...s, description } : s
            )
          }
        }));
      },
      
      removeEntityState: (stateId) => {
        set((state) => ({
          model: {
            ...state.model,
            entityStates: state.model.entityStates.filter(s => s.id !== stateId)
          }
        }));
      },
      
      // Tech Tree Actions
      addTechNode: (name, desc, era, type) => {
        const newNode: TechNode = {
          id: crypto.randomUUID(),
          name,
          description: desc,
          era,
          type,
          status: 'concept'
        };
        
        set((state) => ({
          model: {
            ...state.model,
            technologies: [...(state.model.technologies || []), newNode]
          }
        }));
      },
      
      addTechNodeWithLink: (name, desc, era, type, linkedNodeId, direction) => {
        const newNode: TechNode = {
          id: crypto.randomUUID(),
          name,
          description: desc,
          era,
          type,
          status: 'concept'
        };
        
        const newDependency: TechDependency = {
          id: crypto.randomUUID(),
          sourceId: direction === 'dependency' ? newNode.id : linkedNodeId,
          targetId: direction === 'dependency' ? linkedNodeId : newNode.id
        };
        
        set((state) => ({
          model: {
            ...state.model,
            technologies: [...(state.model.technologies || []), newNode],
            techDependencies: [...(state.model.techDependencies || []), newDependency]
          }
        }));
      },
      
      updateTechNode: (id, name, desc, era, type, status) => {
        set((state) => ({
          model: {
            ...state.model,
            technologies: (state.model.technologies || []).map(t =>
              t.id === id ? { ...t, name, description: desc, era, type, status } : t
            )
          }
        }));
      },
      
      updateTechNodeLayout: (id, x, y) => {
        set((state) => ({
          model: {
            ...state.model,
            technologies: (state.model.technologies || []).map(t =>
              t.id === id ? { ...t, x, y } : t
            )
          }
        }));
      },
      
      removeTechNode: (id) => {
        set((state) => ({
          model: {
            ...state.model,
            technologies: (state.model.technologies || []).filter(t => t.id !== id),
            techDependencies: (state.model.techDependencies || []).filter(
              d => d.sourceId !== id && d.targetId !== id
            )
          }
        }));
      },
      
      addTechDependency: (sourceId, targetId) => {
        const state = get();
        if (state.model.techDependencies?.some(d => d.sourceId === sourceId && d.targetId === targetId)) {
          return;
        }
        
        const newDep: TechDependency = {
          id: crypto.randomUUID(),
          sourceId,
          targetId
        };
        
        set((state) => ({
          model: {
            ...state.model,
            techDependencies: [...(state.model.techDependencies || []), newDep]
          }
        }));
      },
      
      removeTechDependency: (id) => {
        set((state) => ({
          model: {
            ...state.model,
            techDependencies: (state.model.techDependencies || []).filter(d => d.id !== id)
          }
        }));
      },
      
      generateRelatedTech: async (baseNodeId, relation, apiSettings, checkApiKey, taskManager) => {
        if (!checkApiKey()) return;
        
        const state = get();
        const baseNode = state.model.technologies.find(t => t.id === baseNodeId);
        if (!baseNode) return;
        
        set({ generatingTechId: baseNodeId });
        
        let taskId = '';
        if (taskManager) {
          taskId = taskManager.addTask('generation', `研发科技：基于 ${baseNode.name}`, 'AI 正在推演科技树...', undefined, { baseNodeId });
          taskManager.updateTask(taskId, { status: 'running', progress: 10 });
        }
        
        try {
          const generatedNode = await generateRelatedTechNode(baseNode, relation, state.worldContext, apiSettings);
          const newNode: TechNode = { id: crypto.randomUUID(), ...generatedNode };
          
          set((state) => {
            const newTechs = [...(state.model.technologies || []), newNode];
            const newDeps = [...(state.model.techDependencies || [])];
            
            if (relation === 'dependency') {
              newDeps.push({ id: crypto.randomUUID(), sourceId: newNode.id, targetId: baseNode.id });
            } else {
              newDeps.push({ id: crypto.randomUUID(), sourceId: baseNode.id, targetId: newNode.id });
            }
            
            return {
              model: {
                ...state.model,
                technologies: newTechs,
                techDependencies: newDeps
              }
            };
          });
          
          if (taskId && taskManager) {
            taskManager.completeTask(taskId, { summary: `已研发新科技：${generatedNode.name}` });
          }
        } catch (e: any) {
          alert(e.message);
          if (taskId && taskManager) {
            taskManager.failTask(taskId, e.message);
          }
        } finally {
          set({ generatingTechId: null });
        }
      },
      
      // Story Segment Actions
      addStorySegment: (content) => {
        const state = get();
        const newSegment: StorySegment = {
          id: crypto.randomUUID(),
          timestamp: state.currentTimeSetting,
          content,
          influencedBy: []
        };
        
        set((state) => ({
          storySegments: [...state.storySegments, newSegment]
        }));
      },
      
      updateStorySegment: (id, content, timestamp) => {
        set((state) => ({
          storySegments: state.storySegments.map(s =>
            s.id === id ? { ...s, content, timestamp: timestamp || s.timestamp } : s
          )
        }));
      },
      
      removeStorySegment: (id) => {
        set((state) => ({
          storySegments: state.storySegments.filter(s => s.id !== id)
        }));
      },
      
      // Global Actions
      syncChronicle: async (apiSettings, checkApiKey) => {
        if (!checkApiKey()) return false;
        
        set({ isSyncing: true });
        
        try {
          const state = get();
          const framework = FRAMEWORKS[state.currentFrameworkId] || FRAMEWORKS['general'];
          const chronicle = await generateWorldChronicle(
            state.model,
            framework,
            state.storySegments,
            state.worldContext,
            apiSettings
          );
          
          set({ chronicleText: chronicle });
          return true;
        } catch (e: any) {
          alert(e.message);
          return false;
        } finally {
          set({ isSyncing: false });
        }
      },
      
      reset: (initialContext = '') => {
        set({
          model: {
            entities: [],
            relationships: [],
            entityStates: [],
            technologies: [],
            techDependencies: []
          },
          worldContext: initialContext,
          storySegments: [],
          chronicleText: '',
          currentTimeSetting: '第一章：序幕'
          // Note: currentFrameworkId is NOT reset, as it's usually set before reset
        });
      }
    }),
    { name: 'WorldStore' }
  )
);
