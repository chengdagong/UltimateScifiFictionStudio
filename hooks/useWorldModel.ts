import { useMemo } from 'react';
import { WorldModel, StorySegment, SocialEntity, EntityCategory, EntityRelationship, EntityState, TechNode, TechDependency, FrameworkDefinition, ApiSettings } from '../types';
import { FRAMEWORKS } from '../constants/frameworks';
import { useWorldStore } from '../stores/worldStore';
import { useApiSettings } from './useApiSettings';
import { useTaskStore } from '../stores/taskStore';
import { AiTaskType, AiTaskResult } from '../types/taskTypes';

export interface UseWorldModelReturn {
    model: WorldModel;
    setModel: (model: WorldModel) => void;
    worldContext: string;
    setWorldContext: (context: string) => void;
    storySegments: StorySegment[];
    setStorySegments: (segments: StorySegment[]) => void;
    currentTimeSetting: string;
    setCurrentTimeSetting: (time: string) => void;
    chronicleText: string;
    setChronicleText: (text: string) => void;
    isSyncing: boolean;
    handleGlobalSync: () => Promise<boolean>;

    // Framework State
    currentFrameworkId: string;
    setCurrentFrameworkId: (id: string) => void;
    currentFramework: FrameworkDefinition;

    // Loading States
    loadingLayer: string | null;
    generatingTechId: string | null;

    // Entity Handlers
    handleAddEntity: (name: string, desc: string, category: EntityCategory) => string;
    handleUpdateEntity: (entityId: string, name: string, desc: string, category?: EntityCategory, validFrom?: string, validTo?: string) => void;
    handleRemoveEntity: (entityId: string) => void;
    handleGenerateLayer: (layerId: string) => Promise<void>;

    // Relationship Handlers
    handleAddRelationship: (sourceId: string, targetId: string, type: string, description: string, timestamp?: string, validFrom?: string, validTo?: string) => void;
    handleRemoveRelationship: (relId: string) => void;

    // Entity State Handlers
    handleAddEntityState: (entityId: string, timestamp: string, description: string) => void;
    handleUpdateEntityState: (stateId: string, description: string) => void;
    handleRemoveEntityState: (stateId: string) => void;

    // Tech Tree Handlers
    handleAddTechNode: (name: string, desc: string, era: string, type: 'military' | 'civil' | 'abstract') => void;
    handleAddTechNodeWithLink: (name: string, desc: string, era: string, type: 'military' | 'civil' | 'abstract', linkedNodeId: string, direction: 'dependency' | 'unlock') => void;
    handleUpdateTechNode: (id: string, name: string, desc: string, era: string, type: 'military' | 'civil' | 'abstract', status: 'concept' | 'prototype' | 'production' | 'obsolete') => void;
    handleUpdateTechNodeLayout: (id: string, x: number, y: number) => void;
    handleRemoveTechNode: (id: string) => void;
    handleAddTechDependency: (sourceId: string, targetId: string) => void;
    handleRemoveTechDependency: (id: string) => void;
    handleGenerateRelatedTech: (baseNodeId: string, relation: 'dependency' | 'unlock') => Promise<void>;

    // Story Segment Handlers
    handleAddStorySegment: (content: string) => void;
    handleUpdateStorySegment: (id: string, content: string, timestamp?: string) => void;
    handleRemoveStorySegment: (id: string) => void;

    // Global Reset
    resetModel: (initialContext?: string) => void;
}

/**
 * 兼容层：包装 Zustand worldStore，保持原有 API 接口
 * 这样现有组件无需修改即可使用新的 Zustand 状态管理
 */
export const useWorldModel = (): UseWorldModelReturn => {
    // 从 Zustand store 获取状态和 actions
    const store = useWorldStore();
    const { apiSettings, checkApiKey } = useApiSettings();
    const taskStore = useTaskStore();
    
    // Derived Framework (使用 useMemo 优化)
    const currentFramework = useMemo(() =>
        FRAMEWORKS[store.currentFrameworkId] || FRAMEWORKS['general'],
        [store.currentFrameworkId]
    );

    // Adapter for taskManager expected by worldStore
    const taskManagerAdapter = useMemo(() => ({
        addTask: (type: string, name: string, description: string, sourceId?: string, metadata?: any) => {
            return taskStore.addTask({
                type: type as AiTaskType,
                name,
                description,
                sourceId,
                metadata
            });
        },
        updateTask: (id: string, updates: any) => {
            taskStore.updateTask(id, updates);
        },
        completeTask: (id: string, result: AiTaskResult) => {
            taskStore.updateTask(id, {
                status: 'completed',
                progress: 100,
                result,
                updatedAt: Date.now()
            });
        },
        failTask: (id: string, error: string) => {
            taskStore.updateTask(id, {
                status: 'failed',
                result: { error },
                updatedAt: Date.now()
            });
        }
    }), [taskStore]);

    // 包装 actions 以注入依赖（apiSettings, checkApiKey, taskManager）
    const handleGenerateLayer = async (layerId: string) => {
        await store.generateLayer(layerId, apiSettings, checkApiKey, taskManagerAdapter);
    };

    const handleGenerateRelatedTech = async (baseNodeId: string, relation: 'dependency' | 'unlock') => {
        await store.generateRelatedTech(baseNodeId, relation, apiSettings, checkApiKey, taskManagerAdapter);
    };

    const handleGlobalSync = async (): Promise<boolean> => {
        return await store.syncChronicle(apiSettings, checkApiKey);
    };

    return {
        // State
        model: store.model,
        setModel: store.setModel,
        worldContext: store.worldContext,
        setWorldContext: store.setWorldContext,
        storySegments: store.storySegments,
        setStorySegments: store.setStorySegments,
        currentTimeSetting: store.currentTimeSetting,
        setCurrentTimeSetting: store.setCurrentTimeSetting,
        chronicleText: store.chronicleText,
        setChronicleText: store.setChronicleText,
        isSyncing: store.isSyncing,
        
        // Framework
        currentFrameworkId: store.currentFrameworkId,
        setCurrentFrameworkId: store.setCurrentFrameworkId,
        currentFramework,
        
        // Loading
        loadingLayer: store.loadingLayer,
        generatingTechId: store.generatingTechId,
        
        // Entity Actions (直接映射)
        handleAddEntity: store.addEntity,
        handleUpdateEntity: store.updateEntity,
        handleRemoveEntity: store.removeEntity,
        handleGenerateLayer,
        
        // Relationship Actions
        handleAddRelationship: store.addRelationship,
        handleRemoveRelationship: store.removeRelationship,
        
        // Entity State Actions
        handleAddEntityState: store.addEntityState,
        handleUpdateEntityState: store.updateEntityState,
        handleRemoveEntityState: store.removeEntityState,
        
        // Tech Tree Actions
        handleAddTechNode: store.addTechNode,
        handleAddTechNodeWithLink: store.addTechNodeWithLink,
        handleUpdateTechNode: store.updateTechNode,
        handleUpdateTechNodeLayout: store.updateTechNodeLayout,
        handleRemoveTechNode: store.removeTechNode,
        handleAddTechDependency: store.addTechDependency,
        handleRemoveTechDependency: store.removeTechDependency,
        handleGenerateRelatedTech,
        
        // Story Segment Actions
        handleAddStorySegment: store.addStorySegment,
        handleUpdateStorySegment: store.updateStorySegment,
        handleRemoveStorySegment: store.removeStorySegment,
        
        // Global Actions
        handleGlobalSync,
        resetModel: store.reset
    };
};
