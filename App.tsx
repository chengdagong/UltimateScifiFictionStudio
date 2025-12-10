
import React, { useState, useMemo, useEffect } from 'react';
import { BookOpen, Layers, Clock, Settings2, Sparkles, Save, FolderOpen, X, Loader2, Wand2, Globe2, PlusCircle, LayoutTemplate, Activity, Users, BookText, ArrowRight, RefreshCw, Eye, ChevronDown, FileText, UploadCloud, MoreVertical, Trash2, Menu, ArrowLeft, Home, Network, Library, Cpu, PanelLeftClose, PanelLeftOpen, MessageCircle } from 'lucide-react';
import ParticipantsView from './components/ParticipantsView';
import TimelineView from './components/TimelineView';
import ChronicleView from './components/ChronicleView';
import StoryAgentView from './components/StoryAgentView';
import TechTreeView from './components/TechTreeView';
import BrainstormView from './components/BrainstormView';
import SettingsModal from './components/SettingsModal';
import { WorldModel, StorySegment, SocialEntity, EntityCategory, WorldData, ApiSettings, EntityRelationship, EntityState, StoryAgent, WorkflowStep, TechNode, TechDependency } from './types';
import { generateEntitiesForLayer, generateStorySegment, generateWorldChronicle, importWorldFromText, generateWorldFromScenario, generateRelatedTechNode } from './services/geminiService';
import { saveWorld, getWorlds, deleteWorld } from './services/firebase';
import { FRAMEWORKS, INITIAL_CONTEXTS } from './constants/frameworks';
import { WORLD_PRESETS, WorldPreset } from './constants/presets';

// --- Unified Generation Overlay Component ---
const WorldGenerationOverlay: React.FC<{ status: string }> = ({ status }) => {
   return (
      <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-md flex flex-col items-center justify-center animate-fadeIn">
         <div className="relative mb-8">
            <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center animate-pulse">
               <Globe2 className="w-12 h-12 text-indigo-600 animate-spin-slow" />
            </div>
            <div className="absolute inset-0 border-4 border-indigo-100 rounded-full animate-ping opacity-20"></div>
         </div>

         <h2 className="text-2xl font-serif font-bold text-slate-800 mb-2">正在构建世界模型</h2>
         <div className="flex items-center gap-2 text-indigo-600 font-medium bg-indigo-50 px-4 py-1.5 rounded-full">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">{status}</span>
         </div>

         <div className="mt-12 max-w-md text-center space-y-2">
            <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">ECO-NARRATIVE ENGINE</p>
            <div className="h-1 w-32 bg-slate-100 rounded-full mx-auto overflow-hidden">
               <div className="h-full bg-indigo-500 rounded-full w-1/2 animate-progress-indeterminate"></div>
            </div>
         </div>
      </div>
   );
};

const App: React.FC = () => {
   // App State
   const [activeTab, setActiveTab] = useState<'participants' | 'timeline' | 'story' | 'chronicle' | 'tech' | 'brainstorm'>('participants');
   const [loadingLayer, setLoadingLayer] = useState<string | null>(null);
   const [isSyncing, setIsSyncing] = useState(false);
   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

   // Global Generation State (The Unified Progress Page)
   const [isGeneratingWorld, setIsGeneratingWorld] = useState(false);
   const [generationStatus, setGenerationStatus] = useState("正在初始化...");

   // Tech Tree specialized loading
   const [generatingTechId, setGeneratingTechId] = useState<string | null>(null);

   // API Config State with robust persistence
   const [apiSettings, setApiSettings] = useState<ApiSettings>(() => {
      const defaultSettings: ApiSettings = {
         provider: 'google',
         apiKey: process.env.API_KEY || '',
         baseUrl: '',
         model: 'gemini-2.5-flash',
         minimalUI: false
      };

      if (typeof window !== 'undefined') {
         const stored = localStorage.getItem('ecoNarrative_apiSettings');
         if (stored) {
            try {
               const parsed = JSON.parse(stored);
               return {
                  provider: parsed.provider || defaultSettings.provider,
                  apiKey: parsed.apiKey || defaultSettings.apiKey,
                  baseUrl: parsed.baseUrl !== undefined ? parsed.baseUrl : defaultSettings.baseUrl,
                  model: parsed.model || defaultSettings.model,
                  minimalUI: parsed.minimalUI !== undefined ? parsed.minimalUI : defaultSettings.minimalUI
               };
            } catch (e) {
               console.error("Failed to parse settings from local storage", e);
            }
         }
      }
      return defaultSettings;
   });

   const [showSettingsModal, setShowSettingsModal] = useState(false);

   const handleSaveSettings = (newSettings: ApiSettings) => {
      setApiSettings(newSettings);
      localStorage.setItem('ecoNarrative_apiSettings', JSON.stringify(newSettings));
   };

   const toggleMinimalUI = () => {
      const newSettings = { ...apiSettings, minimalUI: !apiSettings.minimalUI };
      setApiSettings(newSettings);
      localStorage.setItem('ecoNarrative_apiSettings', JSON.stringify(newSettings));
   };

   const isMinimalUI = apiSettings.minimalUI;

   // World State (Flat Model)
   const [currentFrameworkId, setCurrentFrameworkId] = useState<string>('general');
   // Initialize with entities, relationships, entityStates, technologies, techDependencies
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

   // New Agent & Workflow State
   const [agents, setAgents] = useState<StoryAgent[]>([]);
   const [workflow, setWorkflow] = useState<WorkflowStep[]>([]);

   // Persistence State
   const [currentWorldId, setCurrentWorldId] = useState<string | undefined>(undefined);
   const [worldName, setWorldName] = useState("新世界");
   const [isSaving, setIsSaving] = useState(false);

   // Modals
   const [showWelcomeModal, setShowWelcomeModal] = useState(true);
   const [showLoadModal, setShowLoadModal] = useState(false);
   const [showSaveModal, setShowSaveModal] = useState(false);
   const [showNewWorldModal, setShowNewWorldModal] = useState(false);
   const [savedWorlds, setSavedWorlds] = useState<WorldData[]>([]);
   const [isLoadingWorlds, setIsLoadingWorlds] = useState(false);
   const [deletingWorldId, setDeletingWorldId] = useState<string | null>(null);

   // New World Modal State
   const [newWorldTab, setNewWorldTab] = useState<'empty' | 'presets' | 'import'>('empty');
   const [importText, setImportText] = useState("");

   // Derived State: Current Framework Definition
   const currentFramework = useMemo(() =>
      FRAMEWORKS[currentFrameworkId] || FRAMEWORKS['general'],
      [currentFrameworkId]);

   // Handlers
   const resetWorldState = (frameworkId: string) => {
      setCurrentFrameworkId(frameworkId);
      setModel({ entities: [], relationships: [], entityStates: [], technologies: [], techDependencies: [] });
      setWorldContext(INITIAL_CONTEXTS['general'] || "");
      setStorySegments([]);
      setChronicleText("");
      setCurrentTimeSetting("第一章：序幕");
      setCurrentWorldId(undefined);
      setWorldName("未命名世界");
      setAgents([]);
      setWorkflow([]);
      setActiveTab('participants');
   };

   const handleCreateEmptyWorld = async () => {
      setShowNewWorldModal(false);
      setIsMobileMenuOpen(false);
      setIsGeneratingWorld(true);
      setGenerationStatus(`正在初始化新世界...`);
      await new Promise(resolve => setTimeout(resolve, 800));
      resetWorldState('general');
      setIsGeneratingWorld(false);
   };

   const checkApiKey = () => {
      if (!apiSettings.apiKey) {
         setShowSettingsModal(true);
         return false;
      }
      return true;
   };

   const handleImportWorld = async (frameworkId: string) => {
      if (!checkApiKey()) return;
      if (!importText.trim()) { alert("请输入需要分析的文本"); return; }

      setShowNewWorldModal(false);
      setIsGeneratingWorld(true);
      setGenerationStatus("正在深度分析文本架构...");

      try {
         resetWorldState(frameworkId);
         const result = await importWorldFromText(importText, apiSettings);
         setGenerationStatus("正在生成实体网络...");
         await new Promise(resolve => setTimeout(resolve, 500));

         setWorldContext(result.context);
         setModel({
            entities: result.entities,
            relationships: [],
            entityStates: [],
            technologies: [],
            techDependencies: []
         });
         setWorldName("导入的世界");

         const newSegment: StorySegment = {
            id: crypto.randomUUID(),
            timestamp: "原始文本",
            content: importText,
            influencedBy: []
         };
         setStorySegments([newSegment]);
         setActiveTab('story');
      } catch (e: any) {
         console.error(e);
         alert("导入失败: " + e.message);
         setShowNewWorldModal(true);
      } finally {
         setIsGeneratingWorld(false);
      }
   };

   const handleApplyPreset = async (preset: WorldPreset) => {
      if (!checkApiKey()) return;

      setShowNewWorldModal(false);
      setIsGeneratingWorld(true);
      setGenerationStatus(`正在构建【${preset.name}】的历史背景...`);

      try {
         resetWorldState(preset.frameworkId);

         const framework = FRAMEWORKS[preset.frameworkId];
         const result = await generateWorldFromScenario(preset.scenarioPrompt, framework, apiSettings);

         setGenerationStatus("正在完善社会关系与历史图谱...");

         setWorldContext(result.context);
         setModel({
            entities: result.entities,
            relationships: result.relationships,
            entityStates: result.entityStates,
            technologies: result.technologies || [],
            techDependencies: result.techDependencies || []
         });

         if (result.storySegments && result.storySegments.length > 0) {
            setStorySegments(result.storySegments);
            setCurrentTimeSetting(result.storySegments[result.storySegments.length - 1].timestamp);
         }

         setWorldName(preset.name);
         setActiveTab('timeline');

      } catch (e: any) {
         console.error(e);
         alert("剧本生成失败: " + e.message);
         setShowNewWorldModal(true);
      } finally {
         setIsGeneratingWorld(false);
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

   // --- Tech Tree Handlers ---
   const handleAddTechNode = (name: string, desc: string, era: string, type: 'military' | 'civil' | 'abstract') => {
      const newNode: TechNode = {
         id: crypto.randomUUID(),
         name, description: desc, era, type, status: 'concept'
      };
      setModel(prev => ({ ...prev, technologies: [...(prev.technologies || []), newNode] }));
   };

   // Add a node and immediately link it (Atomic operation)
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

   // New Layout Handler
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
      // Prevent duplicates
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

   // --- Global Handlers ---

   const handleGlobalSync = async () => {
      if (!checkApiKey()) return;
      setIsSyncing(true);
      try {
         const chronicle = await generateWorldChronicle(model, currentFramework, storySegments, worldContext, apiSettings);
         setChronicleText(chronicle);
         setActiveTab('chronicle');
      } catch (e: any) {
         alert(e.message);
      } finally {
         setIsSyncing(false);
      }
   };

   const handleAddStorySegment = (content: string) => {
      const newSegment: StorySegment = { id: crypto.randomUUID(), timestamp: currentTimeSetting, content: content, influencedBy: [] };
      setStorySegments(prev => [...prev, newSegment]);
   };

   const handleUpdateStorySegment = (id: string, content: string, timestamp?: string) => {
      setStorySegments(prev => prev.map(s => s.id === id ? { ...s, content, timestamp: timestamp || s.timestamp } : s));
   };

   const handleRemoveStorySegment = (id: string) => {
      console.log("[App] Removing story segment:", id);
      setStorySegments(prev => prev.filter(s => s.id !== id));
   };

   // Persistence Handlers
   const handleSaveWorld = async () => {
      if (!worldName) return;
      setIsSaving(true);
      try {
         const worldData: WorldData = {
            id: currentWorldId,
            name: worldName,
            frameworkId: currentFrameworkId,
            createdAt: Date.now(),
            lastModified: Date.now(),
            context: worldContext,
            model,
            storySegments,
            currentTimeSetting,
            chronicleText,
            agents,
            workflow
         };
         const savedId = await saveWorld(worldData);
         setCurrentWorldId(savedId);
         setShowSaveModal(false);
         alert("保存成功！");
      } catch (e: any) {
         console.error(e);
         alert("保存失败: " + e.message);
      } finally {
         setIsSaving(false);
      }
   };

   const handleLoadWorldList = async () => {
      setIsLoadingWorlds(true);
      try {
         const worlds = await getWorlds();
         setSavedWorlds(worlds);
      } catch (e: any) {
         alert("无法加载存档列表: " + e.message);
      } finally {
         setIsLoadingWorlds(false);
      }
   };

   const handleLoadWorld = (world: WorldData) => {
      setCurrentWorldId(world.id);
      setWorldName(world.name);
      setCurrentFrameworkId(world.frameworkId || 'general'); // Default for legacy
      setWorldContext(world.context);
      setModel(world.model || { entities: [], relationships: [], entityStates: [], technologies: [], techDependencies: [] });
      setStorySegments(world.storySegments);
      setCurrentTimeSetting(world.currentTimeSetting);
      setChronicleText(world.chronicleText || "");
      setAgents(world.agents || []);
      setWorkflow(world.workflow || []);
      setShowLoadModal(false);
      setShowWelcomeModal(false);
      setIsMobileMenuOpen(false);
   };

   const handleDeleteWorld = async (id: string) => {
      if (!id) {
         alert("Error: Invalid World ID");
         return;
      }
      if (!window.confirm("确定要删除这个存档吗？此操作无法撤销。")) return;

      setDeletingWorldId(id);
      try {
         // 1. Optimistic Update: Remove from UI immediately
         setSavedWorlds(prev => prev.filter(w => w.id !== id));

         // 2. Perform API delete
         await deleteWorld(id);

         // 3. Re-fetch from server to ensure state consistency
         await handleLoadWorldList();
      } catch (e: any) {
         console.error("Delete failed:", e);
         alert("删除失败: " + e.message);
         // Rollback UI if failed
         await handleLoadWorldList();
      } finally {
         setDeletingWorldId(null);
      }
   };

   // UI Components
   return (
      <div className="flex h-screen bg-slate-100 text-slate-800 font-sans overflow-hidden">

         {isGeneratingWorld && <WorldGenerationOverlay status={generationStatus} />}

         {/* Mobile Header */}
         <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-50">
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-serif font-bold">E</div>
               <span className="font-serif font-bold text-slate-800">EcoNarrative</span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600">
               {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
         </div>

         {/* Sidebar Navigation */}
         <nav className={`
        fixed inset-y-0 left-0 z-40 bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 transform 
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 md:static
        ${isMinimalUI ? 'w-20 items-center' : 'w-64'}
      `}>
            <div className={`p-6 flex items-center ${isMinimalUI ? 'justify-center' : 'gap-3'} text-white transition-all`}>
               <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center font-serif font-bold text-lg shadow-lg shadow-indigo-500/30 shrink-0">E</div>
               {!isMinimalUI && (
                  <div>
                     <h1 className="font-serif font-bold text-lg tracking-wide whitespace-nowrap">EcoNarrative</h1>
                     <p className="text-[10px] opacity-60 uppercase tracking-widest">Studio</p>
                  </div>
               )}
            </div>

            <div className={`px-4 py-2 ${isMinimalUI ? 'px-2' : ''}`}>
               <button
                  onClick={() => setShowNewWorldModal(true)}
                  className={`
               w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-indigo-900/50 transition-all hover:scale-[1.02]
               ${isMinimalUI ? 'p-3 rounded-2xl' : 'py-3 px-4'}
             `}
                  title={isMinimalUI ? "新建世界" : undefined}
               >
                  <Sparkles className="w-4 h-4" />
                  {!isMinimalUI && "新建世界"}
               </button>
            </div>

            <div className={`flex-1 overflow-y-auto py-4 space-y-1 ${isMinimalUI ? 'px-2' : 'px-3'}`}>
               {!isMinimalUI && <p className="px-3 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">视图</p>}

               <button
                  onClick={() => { setActiveTab('participants'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'participants' ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800'} ${isMinimalUI ? 'justify-center px-0' : ''}`}
                  title={isMinimalUI ? "社会解剖学" : undefined}
               >
                  <Network className="w-4 h-4" />
                  {!isMinimalUI && "社会解剖学"}
               </button>

               <button
                  onClick={() => { setActiveTab('timeline'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'timeline' ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800'} ${isMinimalUI ? 'justify-center px-0' : ''}`}
                  title={isMinimalUI ? "时间轴视图" : undefined}
               >
                  <Activity className="w-4 h-4" />
                  {!isMinimalUI && "时间轴视图"}
               </button>

               <button
                  onClick={() => { setActiveTab('brainstorm'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'brainstorm' ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800'} ${isMinimalUI ? 'justify-center px-0' : ''}`}
                  title={isMinimalUI ? "头脑风暴" : undefined}
               >
                  <MessageCircle className="w-4 h-4" />
                  {!isMinimalUI && "头脑风暴"}
               </button>

               <button
                  onClick={() => { setActiveTab('tech'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'tech' ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800'} ${isMinimalUI ? 'justify-center px-0' : ''}`}
                  title={isMinimalUI ? "科技树" : undefined}
               >
                  <Cpu className="w-4 h-4" />
                  {!isMinimalUI && "科技树"}
               </button>

               <button
                  onClick={() => { setActiveTab('chronicle'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'chronicle' ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800'} ${isMinimalUI ? 'justify-center px-0' : ''}`}
                  title={isMinimalUI ? "史书视图" : undefined}
               >
                  <BookText className="w-4 h-4" />
                  {!isMinimalUI && "史书视图"}
               </button>

               <button
                  onClick={() => { setActiveTab('story'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'story' ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800'} ${isMinimalUI ? 'justify-center px-0' : ''}`}
                  title={isMinimalUI ? "故事引擎" : undefined}
               >
                  <BookOpen className="w-4 h-4" />
                  {!isMinimalUI && "故事引擎"}
               </button>

               <div className={`mt-8 ${isMinimalUI ? '' : 'px-3'}`}>
                  {!isMinimalUI && <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">数据管理</p>}
                  <button
                     onClick={() => { setShowSaveModal(true); setIsMobileMenuOpen(false); }}
                     className={`w-full flex items-center gap-3 py-2 text-sm hover:text-white transition-colors ${isMinimalUI ? 'justify-center px-0' : 'px-3'}`}
                     title={isMinimalUI ? "保存当前世界" : undefined}
                  >
                     <Save className="w-4 h-4" />
                     {!isMinimalUI && "保存当前世界"}
                  </button>
                  <button
                     onClick={() => { handleLoadWorldList(); setShowLoadModal(true); setIsMobileMenuOpen(false); }}
                     className={`w-full flex items-center gap-3 py-2 text-sm hover:text-white transition-colors ${isMinimalUI ? 'justify-center px-0' : 'px-3'}`}
                     title={isMinimalUI ? "加载存档" : undefined}
                  >
                     <FolderOpen className="w-4 h-4" />
                     {!isMinimalUI && "加载存档"}
                  </button>
               </div>
            </div>

            <div className={`p-4 border-t border-slate-800 ${isMinimalUI ? 'flex flex-col gap-4 items-center' : 'flex items-center justify-between'}`}>
               <button
                  onClick={() => { setShowSettingsModal(true); setIsMobileMenuOpen(false); }}
                  className={`flex items-center gap-3 text-slate-400 hover:text-white transition-colors text-sm ${isMinimalUI ? 'justify-center' : ''}`}
                  title={isMinimalUI ? "全局设置" : undefined}
               >
                  <Settings2 className="w-4 h-4" />
                  {!isMinimalUI && "全局设置"}
               </button>

               <button
                  onClick={toggleMinimalUI}
                  className="text-slate-500 hover:text-white transition-colors p-1 rounded-md hover:bg-slate-800"
                  title={isMinimalUI ? "展开侧边栏" : "折叠侧边栏"}
               >
                  {isMinimalUI ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
               </button>
            </div>
         </nav>

         {/* Main Content */}
         <main className="flex-1 flex flex-col h-full overflow-hidden relative pt-14 md:pt-0">

            {/* GLOBAL HEADER */}
            <header className="hidden md:flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 shrink-0 shadow-sm z-20">
               <div className="flex items-center gap-6">
                  <div>
                     <h2 className="text-lg font-serif font-bold text-slate-800">{worldName}</h2>
                     <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{model.entities.length} 个实体</span>
                        <span>•</span>
                        <span>{storySegments.length} 个章节</span>
                     </div>
                  </div>
               </div>

               <div className="flex items-center gap-3">
                  <button
                     onClick={handleSaveWorld}
                     disabled={isSaving}
                     className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors"
                     title="保存"
                  >
                     <Save className="w-4 h-4" />
                  </button>
                  <div className="h-6 w-px bg-slate-200"></div>
                  <button
                     onClick={handleGlobalSync}
                     disabled={isSyncing}
                     className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200"
                  >
                     {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                     <span>同步世界状态</span>
                  </button>
               </div>
            </header>

            {/* View Container */}
            <div className="flex-1 overflow-hidden p-4 md:p-6 bg-slate-50/50">
               {activeTab === 'participants' && (
                  <ParticipantsView
                     model={model}
                     framework={currentFramework}
                     onAddEntity={handleAddEntity}
                     onUpdateEntity={handleUpdateEntity}
                     onRemoveEntity={handleRemoveEntity}
                     onGenerateLayer={handleGenerateLayer}
                     onAddRelationship={handleAddRelationship}
                     onRemoveRelationship={handleRemoveRelationship}
                     onAddEntityState={handleAddEntityState}
                     onUpdateEntityState={handleUpdateEntityState}
                     onRemoveEntityState={handleRemoveEntityState}
                     loadingLayerId={loadingLayer}
                     isMinimalUI={isMinimalUI}
                  />
               )}

               {activeTab === 'timeline' && (
                  <TimelineView
                     model={model}
                     storySegments={storySegments}
                     framework={currentFramework}
                  />
               )}

               {activeTab === 'tech' && (
                  <TechTreeView
                     technologies={model.technologies || []}
                     dependencies={model.techDependencies || []}
                     onAddNode={handleAddTechNode}
                     onUpdateNode={handleUpdateTechNode}
                     onRemoveNode={handleRemoveTechNode}
                     onAddDependency={handleAddTechDependency}
                     onRemoveDependency={handleRemoveTechDependency}
                     onGenerateRelatedNode={handleGenerateRelatedTech}
                     onManualCreateAndLink={handleAddTechNodeWithLink}
                     onUpdateNodeLayout={handleUpdateTechNodeLayout}
                     generatingNodeId={generatingTechId}
                  />
               )}

               {activeTab === 'chronicle' && (
                  <ChronicleView
                     model={model}
                     storySegments={storySegments}
                     context={worldContext}
                     chronicleText={chronicleText}
                     setChronicleText={setChronicleText}
                     isSyncing={isSyncing}
                  />
               )}

               {activeTab === 'brainstorm' && (
                  <BrainstormView globalApiSettings={apiSettings} />
               )}

               {activeTab === 'story' && (
                  <StoryAgentView
                     agents={agents}
                     workflow={workflow}
                     model={model}
                     framework={currentFramework}
                     worldContext={worldContext}
                     storySegments={storySegments}
                     settings={apiSettings}
                     currentTimeSetting={currentTimeSetting}
                     onUpdateAgents={setAgents}
                     onUpdateWorkflow={setWorkflow}
                     onAddStorySegment={handleAddStorySegment}
                     onUpdateStorySegment={handleUpdateStorySegment}
                     onRemoveStorySegment={handleRemoveStorySegment}
                  />
               )}
            </div>
         </main>

         <SettingsModal
            isOpen={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
            settings={apiSettings}
            onSave={handleSaveSettings}
         />

         {showNewWorldModal && !isGeneratingWorld && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                     <h2 className="text-xl font-bold text-slate-800">构建新世界</h2>
                     <button onClick={() => setShowNewWorldModal(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
                  </div>

                  <div className="flex border-b border-slate-100 shrink-0">
                     <button
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${newWorldTab === 'empty' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                        onClick={() => setNewWorldTab('empty')}
                     >
                        创建空白世界
                     </button>
                     <button
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${newWorldTab === 'presets' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                        onClick={() => setNewWorldTab('presets')}
                     >
                        预设剧本 (Presets)
                     </button>
                     <button
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${newWorldTab === 'import' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                        onClick={() => setNewWorldTab('import')}
                     >
                        导入文本分析
                     </button>
                  </div>

                  <div className="p-6 overflow-y-auto">
                     {newWorldTab === 'empty' && (
                        <div className="space-y-4 text-center py-8">
                           <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Sparkles className="w-8 h-8 text-indigo-600" />
                           </div>
                           <h3 className="text-lg font-bold text-slate-800">从零开始</h3>
                           <p className="text-slate-500 text-sm max-w-sm mx-auto">
                              创建一个完全空白的通用世界模型。您可以手动添加实体，或使用 AI 辅助生成各个层级的内容。
                           </p>
                           <button
                              onClick={handleCreateEmptyWorld}
                              className="mt-4 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200/50 transition-all"
                           >
                              立即创建
                           </button>
                        </div>
                     )}

                     {newWorldTab === 'presets' && (
                        <div className="space-y-4">
                           <p className="text-sm text-slate-500 mb-2">选择一个经典的历史或虚构场景，AI 将为您生成完整的社会结构。</p>
                           <div className="grid grid-cols-1 gap-4">
                              {WORLD_PRESETS.map(preset => (
                                 <button
                                    key={preset.id}
                                    onClick={() => handleApplyPreset(preset)}
                                    className="flex flex-col text-left p-4 border border-slate-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                                 >
                                    <div className="flex justify-between items-start mb-2">
                                       <h3 className="font-bold text-slate-800 group-hover:text-indigo-700">{preset.name}</h3>
                                    </div>
                                    <p className="text-sm text-slate-600 mb-3">{preset.description}</p>
                                 </button>
                              ))}
                           </div>
                        </div>
                     )}

                     {newWorldTab === 'import' && (
                        <div className="space-y-4">
                           <p className="text-sm text-slate-500">粘贴您的小说大纲或正文，AI 将自动分析并提取社会实体。</p>
                           <textarea
                              className="w-full h-48 p-4 border rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              placeholder="在此粘贴文本..."
                              value={importText}
                              onChange={e => setImportText(e.target.value)}
                           />
                           <div className="flex justify-end">
                              <button
                                 onClick={() => handleImportWorld(currentFrameworkId)}
                                 className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                              >
                                 开始分析
                              </button>
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            </div>
         )}

         {showSaveModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
               <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm animate-fadeIn">
                  <h3 className="font-bold text-lg mb-4">保存世界</h3>
                  <input
                     autoFocus
                     className="w-full p-2 border rounded mb-4"
                     value={worldName}
                     onChange={e => setWorldName(e.target.value)}
                     placeholder="世界名称..."
                  />
                  <div className="flex justify-end gap-2">
                     <button onClick={() => setShowSaveModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded">取消</button>
                     <button onClick={handleSaveWorld} disabled={isSaving} className="px-4 py-2 bg-indigo-600 text-white rounded font-bold">
                        {isSaving ? "保存中..." : "确认保存"}
                     </button>
                  </div>
               </div>
            </div>
         )}

         {showLoadModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
               <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
                  <div className="p-4 border-b flex justify-between items-center">
                     <h3 className="font-bold text-lg">加载世界存档</h3>
                     <button onClick={() => setShowLoadModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                     {isLoadingWorlds ? (
                        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-indigo-500" /></div>
                     ) : savedWorlds.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">暂无存档</div>
                     ) : (
                        <div className="space-y-2">
                           {savedWorlds.map(w => (
                              <div key={w.id} className="flex gap-2 relative group">
                                 <button
                                    onClick={() => handleLoadWorld(w)}
                                    className="flex-1 text-left p-3 hover:bg-indigo-50 rounded-lg border border-transparent hover:border-indigo-100 transition-all"
                                 >
                                    <div className="font-bold text-slate-800">{w.name}</div>
                                    <div className="text-xs text-slate-500 flex justify-between mt-1">
                                       <span>{FRAMEWORKS[w.frameworkId || 'general']?.name || '未知框架'}</span>
                                       <span>{new Date(w.lastModified).toLocaleDateString()}</span>
                                    </div>
                                 </button>
                                 <button
                                    type="button"
                                    onClick={(e) => {
                                       e.stopPropagation();
                                       if (w.id) handleDeleteWorld(w.id);
                                    }}
                                    disabled={deletingWorldId === w.id}
                                    className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center z-10"
                                    title="删除存档"
                                 >
                                    {deletingWorldId === w.id ? (
                                       <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                                    ) : (
                                       <Trash2 className="w-4 h-4 pointer-events-none" />
                                    )}
                                 </button>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               </div>
            </div>
         )}

         {showWelcomeModal && !isGeneratingWorld && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900 text-white p-6">
               <div className="max-w-lg w-full text-center space-y-8 animate-fadeIn">
                  <div className="w-20 h-20 bg-indigo-500 rounded-2xl mx-auto flex items-center justify-center shadow-2xl shadow-indigo-500/50 mb-6">
                     <span className="font-serif text-5xl font-bold">E</span>
                  </div>
                  <div>
                     <h1 className="text-4xl font-serif font-bold mb-2">EcoNarrative Studio</h1>
                     <p className="text-slate-400 text-lg">基于社会生态系统的深度故事引擎</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                     <button
                        onClick={() => { setShowWelcomeModal(false); setShowNewWorldModal(true); }}
                        className="py-4 bg-white text-slate-900 rounded-xl font-bold hover:bg-indigo-50 transition-colors flex flex-col items-center gap-2"
                     >
                        <Sparkles className="w-6 h-6 text-indigo-600" />
                        <span>创建新世界</span>
                     </button>
                     <button
                        onClick={() => { setShowWelcomeModal(false); setShowLoadModal(true); handleLoadWorldList(); }}
                        className="py-4 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700 transition-colors flex flex-col items-center gap-2 border border-slate-700"
                     >
                        <FolderOpen className="w-6 h-6" />
                        <span>加载存档</span>
                     </button>
                  </div>
                  <p className="text-xs text-slate-600 mt-8">v1.0 MVP • Built with Google Gemini</p>
               </div>
            </div>
         )}

      </div>
   );
};

export default App;
