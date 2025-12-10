import { useState, Dispatch, SetStateAction, useMemo } from 'react';
import { WorldModel, StorySegment, SocialEntity, EntityCategory, EntityRelationship, EntityState, TechNode, TechDependency, FrameworkDefinition, ApiSettings } from '../types';
import { INITIAL_CONTEXTS, FRAMEWORKS } from '../constants/frameworks';
import { generateEntitiesForLayer, generateRelatedTechNode, generateWorldChronicle } from '../services/geminiService';

export interface UseWorldModelReturn {
    model: WorldModel;
    setModel: Dispatch<SetStateAction<WorldModel>>;
    worldContext: string;
    setWorldContext: Dispatch<SetStateAction<string>>;
    storySegments: StorySegment[];
    setStorySegments: Dispatch<SetStateAction<StorySegment[]>>;
    currentTimeSetting: string;
    setCurrentTimeSetting: Dispatch<SetStateAction<string>>;
    chronicleText: string;
    setChronicleText: Dispatch<SetStateAction<string>>;
    isSyncing: boolean;
    handleGlobalSync: () => Promise<boolean>;

    // Framework State
    currentFrameworkId: string;
    setCurrentFrameworkId: Dispatch<SetStateAction<string>>;
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

export const useWorldModel = (apiSettings: ApiSettings, checkApiKey: () => boolean): UseWorldModelReturn => {
    // Initial State
    const [currentFrameworkId, setCurrentFrameworkId] = useState<string>('general');
    const [model, setModel] = useState<WorldModel>({
        entities: [],
        relationships: [],
        entityStates: [],
        technologies: [],
        techDependencies: []
    });
    const [worldContext, setWorldContext] = useState("");
    const [storySegments, setStorySegments] = useState<StorySegment[]>([]);
    const [currentTimeSetting, setCurrentTimeSetting] = useState("第一章：序幕");
    const [chronicleText, setChronicleText] = useState("");

    // Loading States
    const [loadingLayer, setLoadingLayer] = useState<string | null>(null);
    const [generatingTechId, setGeneratingTechId] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    // Derived Framework
    const currentFramework = useMemo(() =>
        FRAMEWORKS[currentFrameworkId] || FRAMEWORKS['general'],
        [currentFrameworkId]);

    // --- Global Sync ---
    const handleGlobalSync = async (): Promise<boolean> => {
        if (!checkApiKey()) return false;
        setIsSyncing(true);
        try {
            const chronicle = await generateWorldChronicle(model, currentFramework, storySegments, worldContext, apiSettings);
            setChronicleText(chronicle);
            return true;
        } catch (e: any) {
            alert(e.message);
            return false;
        } finally {
            setIsSyncing(false);
        }
    };

    // --- Entity Handlers ---
    const handleAddEntity = (name: string, desc: string, category: EntityCategory): string => {
        const newEntity: SocialEntity = { id: crypto.randomUUID(), name, description: desc, category };
        setModel(prev => ({ ...prev, entities: [...prev.entities, newEntity] }));
        return newEntity.id;
    };

    const handleUpdateEntity = (entityId: string, name: string, desc: string, category?: EntityCategory, validFrom?: string, validTo?: string) => {
        setModel(prev => ({
            ...prev,
            entities: prev.entities.map(e => e.id === entityId ? { ...e, name, description: desc, category: category || e.category, validFrom, validTo } : e)
        }));
    };

    const handleRemoveEntity = (entityId: string) => {
        setModel(prev => ({
            ...prev,
            entities: prev.entities.filter(e => e.id !== entityId),
            relationships: prev.relationships.filter(r => r.sourceId !== entityId && r.targetId !== entityId),
            entityStates: prev.entityStates.filter(s => s.entityId !== entityId)
        }));
    };

    const handleGenerateLayer = async (layerId: string) => {
        if (!checkApiKey()) return;
        setLoadingLayer(layerId);
        try {
            const layerDef = currentFramework.layers.find(l => l.id === layerId);
            if (!layerDef) return;
            const newEntities = await generateEntitiesForLayer(layerDef, worldContext, 0, apiSettings);
            setModel(prev => ({ ...prev, entities: [...prev.entities, ...newEntities] }));
        } catch (e: any) {
            alert(e.message);
        } finally {
            setLoadingLayer(null);
        }
    };

    const handleAddRelationship = (sourceId: string, targetId: string, type: string, description: string, timestamp?: string, validFrom?: string, validTo?: string) => {
        const newRel: EntityRelationship = { id: crypto.randomUUID(), sourceId, targetId, type, description, timestamp, validFrom, validTo };
        setModel(prev => ({ ...prev, relationships: [...prev.relationships, newRel] }));
    };

    const handleRemoveRelationship = (relId: string) => {
        setModel(prev => ({ ...prev, relationships: prev.relationships.filter(r => r.id !== relId) }));
    };

    const handleAddEntityState = (entityId: string, timestamp: string, description: string) => {
        const newState: EntityState = { id: crypto.randomUUID(), entityId, timestamp, description };
        setModel(prev => ({ ...prev, entityStates: [...prev.entityStates, newState] }));
    };

    const handleUpdateEntityState = (stateId: string, description: string) => {
        setModel(prev => ({ ...prev, entityStates: prev.entityStates.map(s => s.id === stateId ? { ...s, description } : s) }));
    };

    const handleRemoveEntityState = (stateId: string) => {
        setModel(prev => ({ ...prev, entityStates: prev.entityStates.filter(s => s.id !== stateId) }));
    };

    // --- Tech Tree Handlers ---
    const handleAddTechNode = (name: string, desc: string, era: string, type: 'military' | 'civil' | 'abstract') => {
        const newNode: TechNode = {
            id: crypto.randomUUID(),
            name, description: desc, era, type, status: 'concept'
        };
        setModel(prev => ({ ...prev, technologies: [...(prev.technologies || []), newNode] }));
    };

    const handleAddTechNodeWithLink = (
        name: string, desc: string, era: string, type: 'military' | 'civil' | 'abstract',
        linkedNodeId: string,
        direction: 'dependency' | 'unlock'
    ) => {
        const newNode: TechNode = {
            id: crypto.randomUUID(),
            name, description: desc, era, type, status: 'concept'
        };

        const newDependency: TechDependency = {
            id: crypto.randomUUID(),
            sourceId: direction === 'dependency' ? newNode.id : linkedNodeId,
            targetId: direction === 'dependency' ? linkedNodeId : newNode.id
        };

        setModel(prev => ({
            ...prev,
            technologies: [...(prev.technologies || []), newNode],
            techDependencies: [...(prev.techDependencies || []), newDependency]
        }));
    };

    const handleUpdateTechNode = (id: string, name: string, desc: string, era: string, type: 'military' | 'civil' | 'abstract', status: 'concept' | 'prototype' | 'production' | 'obsolete') => {
        setModel(prev => ({
            ...prev,
            technologies: (prev.technologies || []).map(t => t.id === id ? { ...t, name, description: desc, era, type, status } : t)
        }));
    };

    const handleUpdateTechNodeLayout = (id: string, x: number, y: number) => {
        setModel(prev => ({
            ...prev,
            technologies: (prev.technologies || []).map(t => t.id === id ? { ...t, x, y } : t)
        }));
    };

    const handleRemoveTechNode = (id: string) => {
        setModel(prev => ({
            ...prev,
            technologies: (prev.technologies || []).filter(t => t.id !== id),
            techDependencies: (prev.techDependencies || []).filter(d => d.sourceId !== id && d.targetId !== id)
        }));
    };

    const handleAddTechDependency = (sourceId: string, targetId: string) => {
        if (model.techDependencies?.some(d => d.sourceId === sourceId && d.targetId === targetId)) return;
        const newDep: TechDependency = { id: crypto.randomUUID(), sourceId, targetId };
        setModel(prev => ({ ...prev, techDependencies: [...(prev.techDependencies || []), newDep] }));
    };

    const handleRemoveTechDependency = (id: string) => {
        setModel(prev => ({ ...prev, techDependencies: (prev.techDependencies || []).filter(d => d.id !== id) }));
    };

    const handleGenerateRelatedTech = async (baseNodeId: string, relation: 'dependency' | 'unlock') => {
        if (!checkApiKey()) return;
        const baseNode = model.technologies.find(t => t.id === baseNodeId);
        if (!baseNode) return;

        setGeneratingTechId(baseNodeId);
        try {
            const generatedNode = await generateRelatedTechNode(baseNode, relation, worldContext, apiSettings);
            const newNode: TechNode = { id: crypto.randomUUID(), ...generatedNode };

            // Update Model: Add Node AND Link
            setModel(prev => {
                const newTechs = [...(prev.technologies || []), newNode];
                const newDeps = [...(prev.techDependencies || [])];

                if (relation === 'dependency') {
                    // New Node -> Base Node
                    newDeps.push({ id: crypto.randomUUID(), sourceId: newNode.id, targetId: baseNode.id });
                } else {
                    // Base Node -> New Node
                    newDeps.push({ id: crypto.randomUUID(), sourceId: baseNode.id, targetId: newNode.id });
                }

                return { ...prev, technologies: newTechs, techDependencies: newDeps };
            });

        } catch (e: any) {
            alert(e.message);
        } finally {
            setGeneratingTechId(null);
        }
    };

    // --- Story Segment Handlers ---
    const handleAddStorySegment = (content: string) => {
        const newSegment: StorySegment = { id: crypto.randomUUID(), timestamp: currentTimeSetting, content: content, influencedBy: [] };
        setStorySegments(prev => [...prev, newSegment]);
    };

    const handleUpdateStorySegment = (id: string, content: string, timestamp?: string) => {
        setStorySegments(prev => prev.map(s => s.id === id ? { ...s, content, timestamp: timestamp || s.timestamp } : s));
    };

    const handleRemoveStorySegment = (id: string) => {
        setStorySegments(prev => prev.filter(s => s.id !== id));
    };

    // --- Reset ---
    const resetModel = (initialContext = "") => {
        setModel({ entities: [], relationships: [], entityStates: [], technologies: [], techDependencies: [] });
        setWorldContext(initialContext);
        setStorySegments([]);
        setChronicleText("");
        setCurrentTimeSetting("第一章：序幕");
        // Don't reset framework Id here, it might be passed or kept. 
        // Usage pattern usually: setFramework then reset.
    };

    return {
        model, setModel,
        worldContext, setWorldContext,
        storySegments, setStorySegments,
        currentTimeSetting, setCurrentTimeSetting,
        chronicleText, setChronicleText,
        isSyncing, handleGlobalSync,
        currentFrameworkId, setCurrentFrameworkId,
        currentFramework,
        loadingLayer,
        generatingTechId,
        handleAddEntity, handleUpdateEntity, handleRemoveEntity, handleGenerateLayer,
        handleAddRelationship, handleRemoveRelationship,
        handleAddEntityState, handleUpdateEntityState, handleRemoveEntityState,
        handleAddTechNode, handleAddTechNodeWithLink, handleUpdateTechNode, handleUpdateTechNodeLayout, handleRemoveTechNode,
        handleAddTechDependency, handleRemoveTechDependency, handleGenerateRelatedTech,
        handleAddStorySegment, handleUpdateStorySegment, handleRemoveStorySegment,
        resetModel
    };
};
