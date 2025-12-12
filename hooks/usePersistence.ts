import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WorldData, WorldModel, StorySegment, ApiSettings } from '../types';
// import { saveWorld, getWorlds, deleteWorld } from '../services/firebase';
import { saveWorld, getWorlds, deleteWorld } from '../services/LocalStorageService';
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
    const [worldName, setWorldName] = useState("新世界");

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
        onError: (e) => {
            console.warn("Auto-save failed:", e);
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

    // --- Auto-Save Effect ---
    // Trigger auto-save only when data changes (Debounced 2s)
    useEffect(() => {
        // Construct data snapshot inside effect to capture current state
        const currentData = constructWorldData();

        // Prevent auto-save if unnamed or during initialization
        if (!worldName || worldName === "新世界") return;

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

    // 4. Delete World Mutation
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

    // 5. Create Empty World Mutation
    const createEmptyMutation = useMutation({
        mutationFn: async () => {
            setGenerationStatus(`正在初始化新世界...`);
            await new Promise(resolve => setTimeout(resolve, 800));
        },
        onSuccess: () => {
            worldModel.resetModel(INITIAL_CONTEXTS['general']);
            storyEngine.resetStoryEngine();
            // storyEngine.resetStoryEngine() already clears artifacts
            setCurrentWorldId(undefined);
            setWorldName("未命名世界");
            setActiveTab('participants');
            setShowNewWorldModal(false);
        }
    });

    // 6. Import World Mutation
    const importMutation = useMutation({
        mutationFn: async (importText: string) => {
            setGenerationStatus("正在深度分析文本架构...");
            return await importWorldFromText(importText, apiSettings);
        },
        onSuccess: (result, importText) => {
            // Intermediate UI update
            setGenerationStatus("正在生成实体网络...");

            worldModel.setWorldContext(result.context);
            worldModel.setModel({
                entities: result.entities,
                relationships: result.relationships,
                entityStates: result.entityStates || [],
                technologies: result.technologies || [],
                techDependencies: result.techDependencies || []
            });
            setWorldName("导入的世界");

            // Use extracted story segments if available, otherwise fallback to raw text
            if (result.storySegments && result.storySegments.length > 0) {
                worldModel.setStorySegments(result.storySegments);
            } else {
                worldModel.setStorySegments([{
                    id: crypto.randomUUID(),
                    timestamp: "原始文本",
                    content: importText,
                    influencedBy: []
                }]);
            }
            setActiveTab('story');
            setCurrentWorldId(undefined);
            storyEngine.resetStoryEngine();
            setShowNewWorldModal(false);
        },
        onError: (e: any) => {
            console.error(e);
            alert("导入失败: " + e.message);
            setShowNewWorldModal(true);
        }
    });

    // 7. Apply Preset Mutation
    const presetMutation = useMutation({
        mutationFn: async (preset: WorldPreset) => {
            setGenerationStatus(`正在构建【${preset.name}】的历史背景...`);
            const framework = FRAMEWORKS[preset.frameworkId];
            const result = await generateWorldFromScenario(preset.scenarioPrompt, framework, apiSettings);
            return { result, preset };
        },
        onSuccess: ({ result, preset }) => {
            worldModel.resetModel(INITIAL_CONTEXTS[preset.frameworkId]);
            storyEngine.resetStoryEngine();
            setCurrentWorldId(undefined);

            // Apply result
            setGenerationStatus("正在完善社会关系与历史图谱...");

            worldModel.setWorldContext(result.context);
            worldModel.setModel({
                entities: result.entities,
                relationships: result.relationships,
                entityStates: result.entityStates,
                technologies: result.technologies || [],
                techDependencies: result.techDependencies || []
            });

            if (result.storySegments && result.storySegments.length > 0) {
                worldModel.setStorySegments(result.storySegments);
                worldModel.setCurrentTimeSetting(result.storySegments[result.storySegments.length - 1].timestamp);
            }

            setWorldName(preset.name);
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

    const handleCreateEmptyWorld = () => {
        createEmptyMutation.mutate();
    };

    const handleSaveLocal = () => {
        const data = constructWorldData();
        saveMutation.mutate(data);
    };

    const handleLoadWorldList = () => {
        refetchWorldList();
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

    const handleImportWorld = (importText: string) => {
        if (!checkApiKey()) return;
        if (!importText.trim()) { alert("请输入需要分析的文本"); return; }
        setShowNewWorldModal(false);
        importMutation.mutate(importText);
    };

    const handleApplyPreset = (preset: WorldPreset) => {
        if (!checkApiKey()) return;
        setShowNewWorldModal(false);
        presetMutation.mutate(preset);
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
                }
            }
        }
    }, [isLoadingWorlds, savedWorlds, user]); // Run once when worlds loaded

    return {
        // State
        // State
        currentWorldId, setCurrentWorldId,
        worldName, setWorldName,
        isSaving: saveMutation.isPending,
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
        handleSaveWorld: handleSaveLocal,
        handleLoadWorldList,
        handleLoadWorld,
        handleDeleteWorld,
        handleImportWorld,
        handleApplyPreset
    };
};
