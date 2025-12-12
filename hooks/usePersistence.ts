import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WorldData, WorldModel, StorySegment, ApiSettings } from '../types';
// import { saveWorld, getWorlds, deleteWorld } from '../services/firebase';
import { saveWorld, getWorlds, deleteWorld, commitProject } from '../services/LocalStorageService';
import { useAuth } from '../context/AuthContext';
import { useMemo } from 'react';
import { importWorldFromText, generateWorldFromScenario } from '../services/geminiService';
import { UseWorldModelReturn } from './useWorldModel';
import { UseStoryEngineReturn } from './useStoryEngine';
import { FRAMEWORKS, INITIAL_CONTEXTS } from '../constants/frameworks';
import { WorldPreset } from '../constants/presets';

interface UsePersistenceProps {
    worldModel: UseWorldModelReturn;
    storyEngine: UseStoryEngineReturn;
    apiSettings: ApiSettings;
    checkApiKey: () => boolean;
    setActiveTab: (tab: any) => void;
}

export const usePersistence = ({
    worldModel,
    storyEngine,
    apiSettings,
    checkApiKey,
    setActiveTab
}: UsePersistenceProps) => {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    // Persistence State
    const [currentWorldId, setCurrentWorldId] = useState<string | undefined>(undefined);
    const [worldName, setWorldName] = useState("");
    const [commitMessage, setCommitMessage] = useState("");

    // Auto-save State
    const [lastAutoSaveTime, setLastAutoSaveTime] = useState<number>(Date.now());
    const [isAutoSaving, setIsAutoSaving] = useState(false);

    // Generation Status State (shared for display)
    const [generationStatus, setGenerationStatus] = useState("正在初始化...");

    // Modals Control
    const [showLoadModal, setShowLoadModal] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showNewWorldModal, setShowNewWorldModal] = useState(false);

    // --- React Query Hooks ---

    // 1. Load World List
    const {
        data: savedWorlds = [],
        isLoading: isLoadingWorlds,
        refetch: refetchWorldList
    } = useQuery({
        queryKey: ['worlds'],
        queryFn: getWorlds,
        // Only fetch when user is authenticated
        enabled: !!user,
        // Don't refetch automatically on window focus to avoid screen jumping if user is editing
        refetchOnWindowFocus: false
    });

    // Helper: Construct World Data Object
    const constructWorldData = (): WorldData => {
        return {
            id: currentWorldId,
            name: worldName,
            frameworkId: 'general', // Defaulting as prior assumption
            createdAt: Date.now(),
            lastModified: Date.now(),
            context: worldModel.worldContext,
            model: worldModel.model,
            storySegments: worldModel.storySegments,
            currentTimeSetting: worldModel.currentTimeSetting,
            chronicleText: worldModel.chronicleText,
            agents: storyEngine.agents,
            workflow: storyEngine.workflow,
            artifacts: storyEngine.artifacts
        };
    };

    // 2. Auto Save Mutation (Local / Firebase Only)
    const autoSaveMutation = useMutation({
        mutationFn: async (data: WorldData) => {
            if (!data.name) return;
            // Only save to Firebase (or Local DB)
            return await saveWorld(data);
        },
        onSuccess: (savedId) => {
            if (!currentWorldId && savedId) {
                // First save, set ID
                setCurrentWorldId(savedId);
            }
            setLastAutoSaveTime(Date.now());
            // We don't necessarily invalidate queries on every auto-save to avoid UI flicker,
            // but we might want to update the list occasionally.
            // queryClient.invalidateQueries({ queryKey: ['worlds'] });
        },
        onError: (e: any) => {
            console.warn("Auto-save failed:", e);
            // If project not found, clear the ID so next save creates a new project
            if (e?.message?.includes('Project not found')) {
                console.warn("Project not found, clearing currentWorldId");
                setCurrentWorldId(undefined);
            }
        }
    });

    // 3. Save to Local Mutation (Replaces previous GitHub Sync)
    const saveMutation = useMutation({
        mutationFn: async (data: WorldData) => {
            if (!data.name) throw new Error("请输入世界名称");
            // Just save locally
            return await saveWorld(data);
        },
        onSuccess: (savedId) => {
            setCurrentWorldId(savedId);
            queryClient.invalidateQueries({ queryKey: ['worlds'] });
            setShowSaveModal(false);
            alert("保存成功 (Saved Successfully)！");
        },
        onError: (e: any) => {
            console.error(e);
            alert("保存失败: " + e.message);
        }
    });

    // 4. Git Commit Mutation
    const commitMutation = useMutation({
        mutationFn: async ({ projectId, message }: { projectId: string; message: string }) => {
            if (!message.trim()) throw new Error("请输入节点说明");
            return await commitProject(projectId, message);
        },
        onSuccess: () => {
            setShowSaveModal(false);
            setCommitMessage("");
            alert("版本节点创建成功！");
        },
        onError: (e: any) => {
            console.error(e);
            alert("创建节点失败: " + e.message);
        }
    });

    // --- Auto-Save Effect ---
    // Trigger auto-save only when data changes (Debounced 2s)
    useEffect(() => {
        // Construct data snapshot inside effect to capture current state
        const currentData = constructWorldData();

        // Prevent auto-save if unnamed (user must name their world)
        if (!worldName) return;
        
        // Prevent auto-save if no currentWorldId (project doesn't exist yet)
        if (!currentWorldId) return;

        const timer = setTimeout(() => {
            if (!autoSaveMutation.isPending && !saveMutation.isPending) {
                setIsAutoSaving(true);
                autoSaveMutation.mutate(currentData, {
                    onSettled: () => setIsAutoSaving(false)
                });
            }
        }, 2000);

        return () => clearTimeout(timer);
    }, [
        // Only run when these data values change
        worldName,
        worldModel.worldContext,
        worldModel.model,
        worldModel.storySegments,
        worldModel.currentTimeSetting,
        worldModel.chronicleText,
        storyEngine.agents,
        storyEngine.workflow,
        storyEngine.artifacts
    ]);

    // 5. Delete World Mutation
    const deleteMutation = useMutation({
        mutationFn: deleteWorld,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['worlds'] });
        },
        onError: (e: any) => {
            console.error("Delete failed:", e);
            alert("删除失败: " + e.message);
        }
    });

    // 6. Create Empty World Mutation
    const createEmptyMutation = useMutation({
        mutationFn: async (name: string) => {
            setGenerationStatus(`正在初始化新世界...`);
            
            // Construct initial empty world data (without ID - let backend generate it)
            const newWorld: WorldData = {
                id: undefined,
                name: name,
                frameworkId: 'general',
                createdAt: Date.now(),
                lastModified: Date.now(),
                context: '',
                model: { entities: [], relationships: [], entityStates: [], technologies: [], techDependencies: [] },
                storySegments: [],
                currentTimeSetting: '',
                chronicleText: '',
                agents: storyEngine.agents,
                workflow: storyEngine.workflow,
                artifacts: []
            };

            // Save to backend - saveWorld will call createProject which returns the new ID
            const newId = await saveWorld(newWorld);
            return { ...newWorld, id: newId };
        },
        onSuccess: (newWorld) => {
            worldModel.resetModel(INITIAL_CONTEXTS['general']);
            storyEngine.resetStoryEngine();
            
            setCurrentWorldId(newWorld.id);
            setWorldName(newWorld.name);
            
            queryClient.invalidateQueries({ queryKey: ['worlds'] });
            
            setActiveTab('participants');
            setShowNewWorldModal(false);
        }
    });

    // 7. Import World Mutation
    const importMutation = useMutation({
        mutationFn: async ({ importText, name }: { importText: string; name: string }) => {
            setGenerationStatus("正在深度分析文本架构...");
            const result = await importWorldFromText(importText, apiSettings);
            
            // Construct and save (without ID - let backend generate it)
            const newWorld: WorldData = {
                id: undefined,
                name: name,
                frameworkId: 'general',
                createdAt: Date.now(),
                lastModified: Date.now(),
                context: result.context,
                model: {
                    entities: result.entities,
                    relationships: result.relationships,
                    entityStates: result.entityStates || [],
                    technologies: result.technologies || [],
                    techDependencies: result.techDependencies || []
                },
                storySegments: result.storySegments && result.storySegments.length > 0 ? result.storySegments : [{
                    id: crypto.randomUUID(),
                    timestamp: "原始文本",
                    content: importText,
                    influencedBy: []
                }],
                currentTimeSetting: '',
                chronicleText: '',
                agents: storyEngine.agents,
                workflow: storyEngine.workflow,
                artifacts: []
            };

            const newId = await saveWorld(newWorld);
            return { ...newWorld, id: newId };
        },
        onSuccess: (newWorld) => {
            setGenerationStatus("正在生成实体网络...");

            worldModel.setWorldContext(newWorld.context);
            worldModel.setModel(newWorld.model);
            worldModel.setStorySegments(newWorld.storySegments);
            
            setWorldName(newWorld.name);
            setCurrentWorldId(newWorld.id);
            
            storyEngine.resetStoryEngine();
            queryClient.invalidateQueries({ queryKey: ['worlds'] });
            
            setActiveTab('story');
            setShowNewWorldModal(false);
        },
        onError: (e: any) => {
            console.error(e);
            setShowNewWorldModal(true);
        }
    });

    // 8. Apply Preset Mutation
    const presetMutation = useMutation({
        mutationFn: async ({ preset, name }: { preset: WorldPreset; name: string }) => {
            setGenerationStatus(`正在构建【${preset.name}】的历史背景...`);
            const framework = FRAMEWORKS[preset.frameworkId];
            const result = await generateWorldFromScenario(preset.scenarioPrompt, framework, apiSettings);
            
            const newWorld: WorldData = {
                id: undefined,
                name: name,
                frameworkId: preset.frameworkId,
                createdAt: Date.now(),
                lastModified: Date.now(),
                context: result.context,
                model: {
                    entities: result.entities,
                    relationships: result.relationships,
                    entityStates: result.entityStates,
                    technologies: result.technologies || [],
                    techDependencies: result.techDependencies || []
                },
                storySegments: result.storySegments || [],
                currentTimeSetting: result.storySegments && result.storySegments.length > 0 ? result.storySegments[result.storySegments.length - 1].timestamp : '',
                chronicleText: '',
                agents: storyEngine.agents,
                workflow: storyEngine.workflow,
                artifacts: []
            };

            const newId = await saveWorld(newWorld);
            return { ...newWorld, id: newId };
        },
        onSuccess: (newWorld) => {
            worldModel.resetModel(INITIAL_CONTEXTS[newWorld.frameworkId]);
            storyEngine.resetStoryEngine();
            
            setGenerationStatus("正在完善社会关系与历史图谱...");

            worldModel.setWorldContext(newWorld.context);
            worldModel.setModel(newWorld.model);
            worldModel.setStorySegments(newWorld.storySegments);
            worldModel.setCurrentTimeSetting(newWorld.currentTimeSetting);

            setWorldName(newWorld.name);
            setCurrentWorldId(newWorld.id);
            
            queryClient.invalidateQueries({ queryKey: ['worlds'] });

            setActiveTab('timeline');
            setShowNewWorldModal(false);
        },
        onError: (e: any) => {
            console.error(e);
            alert("剧本生成失败: " + e.message);
            setShowNewWorldModal(true);
        }
    });


    // --- Handlers (Adapters for UI) ---

    const handleCreateEmptyWorld = (name: string) => {
        createEmptyMutation.mutate(name);
    };

    const handleSaveLocal = () => {
        const data = constructWorldData();
        saveMutation.mutate(data);
    };

    const handleCommit = () => {
        if (!currentWorldId) {
            alert("请先创建或加载世界");
            return;
        }
        commitMutation.mutate({ projectId: currentWorldId, message: commitMessage });
    };

    const handleLoadWorldList = async () => {
        await refetchWorldList();
    };

    const handleLoadWorld = (world: WorldData) => {
        setCurrentWorldId(world.id);
        if (user && world.id) {
            localStorage.setItem(`lastWorld_${user}`, world.id);
        }
        setWorldName(world.name);

        worldModel.setModel(world.model || { entities: [], relationships: [], entityStates: [], technologies: [], techDependencies: [] });
        worldModel.setWorldContext(world.context);
        worldModel.setStorySegments(world.storySegments);
        worldModel.setCurrentTimeSetting(world.currentTimeSetting);
        worldModel.setChronicleText(world.chronicleText || "");

        storyEngine.setAgents(world.agents || []);
        storyEngine.setWorkflow(world.workflow || []);
        storyEngine.setArtifacts(world.artifacts || []);

        storyEngine.setStoryGuidance("");
        storyEngine.setWorkflowStatus('idle');
        storyEngine.setCurrentStepIndex(-1);
        storyEngine.setExecutionLogs({});

        setShowLoadModal(false);
        setActiveTab('participants');
    };

    const handleDeleteWorld = (id: string) => {
        if (!window.confirm("确定要删除这个存档吗？此操作无法撤销。")) return;
        deleteMutation.mutate(id);
    };

    const handleImportWorld = (importText: string, name: string) => {
        if (!checkApiKey()) return;
        if (!importText.trim()) { alert("请输入需要分析的文本"); return; }
        setShowNewWorldModal(false);
        importMutation.mutate({ importText, name });
    };

    const handleApplyPreset = (preset: WorldPreset, name: string) => {
        if (!checkApiKey()) return;
        setShowNewWorldModal(false);
        presetMutation.mutate({ preset, name });
    };

    // Aggregated Loading State
    const isGeneratingWorld = createEmptyMutation.isPending || importMutation.isPending || presetMutation.isPending;

    // Auto-load last world
    useEffect(() => {
        if (!isLoadingWorlds && savedWorlds.length > 0 && user && !currentWorldId) {
            const lastId = localStorage.getItem(`lastWorld_${user}`);
            if (lastId) {
                const world = savedWorlds.find(w => w.id === lastId);
                if (world) {
                    handleLoadWorld(world);
                } else {
                    // If the last world doesn't exist anymore, clear the reference
                    console.warn(`Last world ${lastId} not found in saved worlds, clearing reference`);
                    localStorage.removeItem(`lastWorld_${user}`);
                }
            }
        }
    }, [isLoadingWorlds, savedWorlds, user]); // Run once when worlds loaded

    return {
        // State
        currentWorldId, setCurrentWorldId,
        worldName, setWorldName,
        commitMessage, setCommitMessage,
        isSaving: saveMutation.isPending || commitMutation.isPending,
        isAutoSaving,
        lastAutoSaveTime,
        savedWorlds,
        isLoadingWorlds,
        isGeneratingWorld,
        generationStatus,

        // Modal States
        showLoadModal, setShowLoadModal,
        showSaveModal, setShowSaveModal,
        showNewWorldModal, setShowNewWorldModal,

        // Handlers
        handleCreateEmptyWorld,
        handleSaveWorld: handleCommit,
        handleLoadWorldList,
        handleLoadWorld,
        handleDeleteWorld,
        handleImportWorld,
        handleApplyPreset
    };
};
