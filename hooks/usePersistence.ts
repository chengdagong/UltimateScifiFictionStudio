import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WorldData, WorldModel, StorySegment, ApiSettings } from '../types';
import { saveWorld, getWorlds, deleteWorld } from '../services/firebase';
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

    // Persistence State
    const [currentWorldId, setCurrentWorldId] = useState<string | undefined>(undefined);
    const [worldName, setWorldName] = useState("新世界");

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

    // 2. Save World Mutation
    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!worldName) throw new Error("请输入世界名称");
            const worldData: WorldData = {
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
            return await saveWorld(worldData);
        },
        onSuccess: (savedId) => {
            setCurrentWorldId(savedId);
            queryClient.invalidateQueries({ queryKey: ['worlds'] });
            setShowSaveModal(false);
            alert("保存成功！");
        },
        onError: (e: any) => {
            console.error(e);
            alert("保存失败: " + e.message);
        }
    });

    // 3. Delete World Mutation
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

    // 4. Create Empty World Mutation
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

    // 5. Import World Mutation
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

    // 6. Apply Preset Mutation
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

    const handleSaveWorld = () => {
        saveMutation.mutate();
    };

    const handleLoadWorldList = () => {
        refetchWorldList();
    };

    const handleLoadWorld = (world: WorldData) => {
        setCurrentWorldId(world.id);
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

    return {
        // State
        currentWorldId, setCurrentWorldId,
        worldName, setWorldName,
        isSaving: saveMutation.isPending,
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
        handleSaveWorld,
        handleLoadWorldList,
        handleLoadWorld,
        handleDeleteWorld,
        handleImportWorld,
        handleApplyPreset
    };
};
