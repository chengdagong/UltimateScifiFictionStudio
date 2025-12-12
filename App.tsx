import React, { useState } from 'react';
import { BookOpen, Settings2, Sparkles, Save, FolderOpen, X, Loader2, Globe2, Activity, BookText, RefreshCw, Trash2, Menu, Network, Cpu, PanelLeftClose, PanelLeftOpen, User, MessageCircle, Inbox } from 'lucide-react';
import { extractEntitiesFromSnippet } from './services/geminiService';
import { SocialEntity } from './types';

// Components
import ParticipantsView from './components/ParticipantsView';
import TimelineView from './components/TimelineView';
import ChronicleView from './components/ChronicleView';
import StoryAgentView from './components/StoryAgentView';
import TechTreeView from './components/TechTreeView';
import CharacterCardView from './components/CharacterCardView';
import BrainstormView from './components/BrainstormView';
import SettingsModal from './components/SettingsModal';
import { WorldGenerationOverlay } from './components/WorldGenerationOverlay';
import WorldAdminDialog from './components/WorldAdminDialog';
import { Toast, ToastType } from './components/Toast';

// Hooks
import { useApiSettings } from './hooks/useApiSettings';
import { useWorldModel } from './hooks/useWorldModel';
import { useStoryEngine } from './hooks/useStoryEngine';
import { usePersistence } from './hooks/usePersistence';

// Constants
import { WORLD_PRESETS } from './constants/presets';
import { FRAMEWORKS } from './constants/frameworks';

const App: React.FC = () => {
   // App UI State
   const [activeTab, setActiveTab] = useState<'participants' | 'timeline' | 'story' | 'chronicle' | 'tech' | 'characters' | 'brainstorm'>('participants');
   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
   const [newWorldTab, setNewWorldTab] = useState<'empty' | 'presets' | 'import'>('empty');
   const [importText, setImportText] = useState("");
   const [showWelcomeModal, setShowWelcomeModal] = useState(true);

   // --- Hooks Initialization ---
   const {
      apiSettings,
      showSettingsModal,
      setShowSettingsModal,
      toggleMinimalUI,
      checkApiKey,
      setApiSettings: handleSaveSettings // Rename for consistency
   } = useApiSettings();

   const isMinimalUI = apiSettings.minimalUI;

   const worldModel = useWorldModel(apiSettings, checkApiKey);
   const storyEngine = useStoryEngine();
   const persistence = usePersistence({
      worldModel,
      storyEngine,
      apiSettings,
      checkApiKey,
      setActiveTab
   });

   // --- Derived State for UI Rendering ---
   const {
      model,
      currentFramework,
      storySegments,
      worldContext,
      currentTimeSetting,
   } = worldModel;

   // --- World Admin Analysis Integration ---
   const [isInboxOpen, setIsInboxOpen] = useState(false);
   const [inboxEntities, setInboxEntities] = useState<SocialEntity[]>([]);
   const [isAnalyzing, setIsAnalyzing] = useState(false);

   // Toast State
   const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

   const showToast = (message: string, type: ToastType = 'info') => {
      setToast({ message, type });
   };

   const handleRequestAnalysis = async (text: string) => {
      console.log("App: handleRequestAnalysis called", text);
      setIsAnalyzing(true);
      showToast("正在后台分析文本... 请稍候", 'info');

      try {
         const results = await extractEntitiesFromSnippet(text, model.entities, apiSettings);
         if (results.length > 0) {
            setInboxEntities(prev => [...prev, ...results]);
            showToast(`分析完成！已生成 ${results.length} 个新实体，请查看收件箱`, 'success');
         } else {
            showToast("分析完成，但未能从文本中提取到有效实体。", 'info');
         }
      } catch (e: any) {
         console.error("Analysis failed", e);
         showToast("分析失败: " + e.message, 'error');
      } finally {
         setIsAnalyzing(false);
      }
   };

   // Wait, worldName is in persistence hook, NOT worldModel.
   // I need to destructure carefully.

   return (
      <div className="flex h-screen bg-slate-100 text-slate-800 font-sans overflow-hidden">

         {persistence.isGeneratingWorld && <WorldGenerationOverlay status={persistence.generationStatus} />}

         <WorldAdminDialog
            isOpen={isInboxOpen}
            onClose={() => setIsInboxOpen(false)}
            inboxEntities={inboxEntities}
            onAddEntities={(entitiesToAdd) => {
               // Add to world
               entitiesToAdd.forEach(e => worldModel.handleAddEntity(e.name, e.description, e.category));
               // Remove from inbox
               const addedIds = new Set(entitiesToAdd.map(e => e.id));
               setInboxEntities(prev => prev.filter(e => !addedIds.has(e.id)));
            }}
            onDiscardEntities={(idsToRemove) => {
               setInboxEntities(prev => prev.filter(e => !idsToRemove.has(e.id)));
            }}
            apiSettings={apiSettings}
         />

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
                  onClick={() => persistence.setShowNewWorldModal(true)}
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

            <div className={`mt-4 ${isMinimalUI ? '' : 'px-3'}`}>
               {!isMinimalUI && <p className="px-3 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">世界构建 (World)</p>}

               <button
                  onClick={() => { setIsInboxOpen(true); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isInboxOpen ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800'} ${isMinimalUI ? 'justify-center px-0' : ''} relative`}
                  title={isMinimalUI ? "收件箱" : undefined}
               >
                  <Inbox className="w-4 h-4" />
                  {!isMinimalUI && "收件箱"}
                  {inboxEntities.length > 0 && (
                     <span className="absolute right-2 top-2 bg-red-500 text-white text-[10px] px-1.5 rounded-full min-w-[16px] text-center">
                        {inboxEntities.length}
                     </span>
                  )}
                  {isAnalyzing && (
                     <span className="absolute right-2 top-2 bg-indigo-500 text-white text-[10px] px-1.5 rounded-full animate-pulse">
                        ...
                     </span>
                  )}
               </button>

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
            </div>

            <div className={`mt-6 ${isMinimalUI ? '' : 'px-3'}`}>
               {!isMinimalUI && <p className="px-3 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">故事构建 (Story)</p>}

               <button
                  onClick={() => { setActiveTab('brainstorm'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'brainstorm' ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800'} ${isMinimalUI ? 'justify-center px-0' : ''}`}
                  title={isMinimalUI ? "头脑风暴" : undefined}
               >
                  <MessageCircle className="w-4 h-4" />
                  {!isMinimalUI && "头脑风暴"}
               </button>

               <button
                  onClick={() => { setActiveTab('characters'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'characters' ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800'} ${isMinimalUI ? 'justify-center px-0' : ''}`}
                  title={isMinimalUI ? "人物卡管理" : undefined}
               >
                  <User className="w-4 h-4" />
                  {!isMinimalUI && "人物卡管理"}
               </button>

               <button
                  onClick={() => { setActiveTab('story'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'story' ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800'} ${isMinimalUI ? 'justify-center px-0' : ''}`}
                  title={isMinimalUI ? "故事引擎" : undefined}
               >
                  <BookOpen className="w-4 h-4" />
                  {!isMinimalUI && "故事引擎"}
               </button>
            </div>

            <div className={`mt-8 ${isMinimalUI ? '' : 'px-3'}`}>
               {!isMinimalUI && <p className="px-3 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">数据管理</p>}
               <button
                  onClick={() => { persistence.setShowSaveModal(true); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 py-2 text-sm hover:text-white transition-colors ${isMinimalUI ? 'justify-center px-0' : 'px-3'}`}
                  title={isMinimalUI ? "保存当前世界" : undefined}
               >
                  <Save className="w-4 h-4" />
                  {!isMinimalUI && "保存当前世界"}
               </button>
               <button
                  onClick={() => { persistence.handleLoadWorldList(); persistence.setShowLoadModal(true); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 py-2 text-sm hover:text-white transition-colors ${isMinimalUI ? 'justify-center px-0' : 'px-3'}`}
                  title={isMinimalUI ? "加载存档" : undefined}
               >
                  <FolderOpen className="w-4 h-4" />
                  {!isMinimalUI && "加载存档"}
               </button>
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
                     <h2 className="text-lg font-serif font-bold text-slate-800">{persistence.worldName}</h2>
                     <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{worldModel.model.entities.length} 个实体</span>
                        <span>•</span>
                        <span>{worldModel.storySegments.length} 个章节</span>
                     </div>
                  </div>
               </div>

               <div className="flex items-center gap-3">
                  <button
                     onClick={persistence.handleSaveWorld}
                     disabled={persistence.isSaving}
                     className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors"
                     title="保存"
                  >
                     <Save className="w-4 h-4" />
                  </button>
                  <div className="h-6 w-px bg-slate-200"></div>
                  <button
                     onClick={worldModel.handleGlobalSync}
                     disabled={worldModel.isSyncing}
                     className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200"
                  >
                     {worldModel.isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                     <span>同步世界状态</span>
                  </button>
               </div>
            </header>

            {/* View Container */}
            <div className="flex-1 overflow-hidden p-4 md:p-6 bg-slate-50/50">
               {activeTab === 'participants' && (
                  <ParticipantsView
                     model={worldModel.model}
                     framework={worldModel.currentFramework}
                     onAddEntity={worldModel.handleAddEntity}
                     onUpdateEntity={worldModel.handleUpdateEntity}
                     onRemoveEntity={worldModel.handleRemoveEntity}
                     onGenerateLayer={worldModel.handleGenerateLayer}
                     onAddRelationship={worldModel.handleAddRelationship}
                     onRemoveRelationship={worldModel.handleRemoveRelationship}
                     onAddEntityState={worldModel.handleAddEntityState}
                     onUpdateEntityState={worldModel.handleUpdateEntityState}
                     onRemoveEntityState={worldModel.handleRemoveEntityState}
                     loadingLayerId={worldModel.loadingLayer}
                     isMinimalUI={isMinimalUI}
                  />
               )}

               {
                  activeTab === 'timeline' && (
                     <TimelineView
                        model={worldModel.model}
                        storySegments={worldModel.storySegments}
                        framework={worldModel.currentFramework}
                     />
                  )
               }

               {
                  activeTab === 'tech' && (
                     <TechTreeView
                        technologies={worldModel.model.technologies || []}
                        dependencies={worldModel.model.techDependencies || []}
                        onAddNode={worldModel.handleAddTechNode}
                        onUpdateNode={worldModel.handleUpdateTechNode}
                        onRemoveNode={worldModel.handleRemoveTechNode}
                        onAddDependency={worldModel.handleAddTechDependency}
                        onRemoveDependency={worldModel.handleRemoveTechDependency}
                        onGenerateRelatedNode={worldModel.handleGenerateRelatedTech}
                        onManualCreateAndLink={worldModel.handleAddTechNodeWithLink}
                        onUpdateNodeLayout={worldModel.handleUpdateTechNodeLayout}
                        generatingNodeId={worldModel.generatingTechId}
                     />
                  )
               }

               {
                  activeTab === 'chronicle' && (
                     <ChronicleView
                        model={worldModel.model}
                        storySegments={worldModel.storySegments}
                        context={worldModel.worldContext}
                        chronicleText={worldModel.chronicleText}
                        setChronicleText={worldModel.setChronicleText}
                        isSyncing={worldModel.isSyncing}
                     />
                  )
               }
               {
                  activeTab === 'characters' && (
                     <CharacterCardView
                        entities={worldModel.model.entities}
                        settings={apiSettings}
                        onAddEntity={worldModel.handleAddEntity}
                        onUpdateEntity={worldModel.handleUpdateEntity}
                        onRemoveEntity={worldModel.handleRemoveEntity}
                     />
                  )
               }

               {
                  activeTab === 'story' && (
                     <StoryAgentView
                        agents={storyEngine.agents}
                        workflow={storyEngine.workflow}
                        model={worldModel.model}
                        framework={worldModel.currentFramework}
                        worldContext={worldModel.worldContext}
                        storySegments={worldModel.storySegments}
                        settings={apiSettings}
                        currentTimeSetting={worldModel.currentTimeSetting}
                        onUpdateAgents={storyEngine.setAgents}
                        onUpdateWorkflow={storyEngine.setWorkflow}
                        onAddStorySegment={worldModel.handleAddStorySegment}
                        onUpdateStorySegment={worldModel.handleUpdateStorySegment}
                        onRemoveStorySegment={worldModel.handleRemoveStorySegment}

                        // Analysis
                        onAnalysisRequest={handleRequestAnalysis}

                        // Lifted State Methods
                        storyGuidance={storyEngine.storyGuidance}
                        onUpdateStoryGuidance={storyEngine.setStoryGuidance}
                        workflowStatus={storyEngine.workflowStatus}
                        onUpdateWorkflowStatus={storyEngine.setWorkflowStatus}
                        currentStepIndex={storyEngine.currentStepIndex}
                        onUpdateCurrentStepIndex={storyEngine.setCurrentStepIndex}
                        executionLogs={storyEngine.executionLogs}
                        onUpdateExecutionLogs={storyEngine.setExecutionLogs}
                        stepOutputs={storyEngine.stepOutputs}
                        onUpdateStepOutputs={storyEngine.setStepOutputs}
                        generatedDraft={storyEngine.generatedDraft}
                        onUpdateGeneratedDraft={storyEngine.setGeneratedDraft}
                        artifacts={storyEngine.artifacts}
                        onUpdateArtifacts={storyEngine.setArtifacts}
                     />
                  )
               }

               {
                  activeTab === 'brainstorm' && (
                     <BrainstormView
                        globalApiSettings={apiSettings}
                        onAnalysisRequest={handleRequestAnalysis}
                     />
                  )
               }
               {
                  toast && (
                     <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                     />
                  )
               }

            </div >
         </main >

         <SettingsModal
            isOpen={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
            settings={apiSettings}
            onSave={handleSaveSettings}
         />

         {
            persistence.showNewWorldModal && !persistence.isGeneratingWorld && (
               <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                  <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                     <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                        <h2 className="text-xl font-bold text-slate-800">构建新世界</h2>
                        <button onClick={() => persistence.setShowNewWorldModal(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
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
                                 onClick={persistence.handleCreateEmptyWorld}
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
                                       onClick={() => persistence.handleApplyPreset(preset)}
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
                                    onClick={() => persistence.handleImportWorld(importText)}
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
            )
         }

         {
            persistence.showSaveModal && (
               <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                  <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm animate-fadeIn">
                     <h3 className="font-bold text-lg mb-4">保存世界</h3>
                     <input
                        autoFocus
                        className="w-full p-2 border rounded mb-4"
                        value={persistence.worldName}
                        onChange={e => persistence.setWorldName(e.target.value)}
                        placeholder="世界名称..."
                     />
                     <div className="flex justify-end gap-2">
                        <button onClick={() => persistence.setShowSaveModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded">取消</button>
                        <button onClick={persistence.handleSaveWorld} disabled={persistence.isSaving} className="px-4 py-2 bg-indigo-600 text-white rounded font-bold">
                           {persistence.isSaving ? "保存中..." : "确认保存"}
                        </button>
                     </div>
                  </div>
               </div>
            )
         }

         {
            persistence.showLoadModal && (
               <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                  <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
                     <div className="p-4 border-b flex justify-between items-center">
                        <h3 className="font-bold text-lg">加载世界存档</h3>
                        <button onClick={() => persistence.setShowLoadModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
                     </div>
                     <div className="flex-1 overflow-y-auto p-2">
                        {persistence.isLoadingWorlds ? (
                           <div className="flex justify-center py-8"><Loader2 className="animate-spin text-indigo-500" /></div>
                        ) : persistence.savedWorlds.length === 0 ? (
                           <div className="text-center py-8 text-slate-400">暂无存档</div>
                        ) : (
                           <div className="space-y-2">
                              {persistence.savedWorlds.map(w => (
                                 <div key={w.id} className="flex gap-2 relative group">
                                    <button
                                       onClick={() => persistence.handleLoadWorld(w)}
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
                                          if (w.id) persistence.handleDeleteWorld(w.id);
                                       }}
                                       className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center z-10"
                                       title="删除存档"
                                    >
                                       <Trash2 className="w-4 h-4 pointer-events-none" />
                                    </button>
                                 </div>
                              ))}
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            )
         }

         {
            showWelcomeModal && !persistence.isGeneratingWorld && (
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
                           onClick={() => { setShowWelcomeModal(false); persistence.setShowNewWorldModal(true); }}
                           className="py-4 bg-white text-slate-900 rounded-xl font-bold hover:bg-indigo-50 transition-colors flex flex-col items-center gap-2"
                        >
                           <Sparkles className="w-6 h-6 text-indigo-600" />
                           <span>创建新世界</span>
                        </button>
                        <button
                           onClick={() => { setShowWelcomeModal(false); persistence.setShowLoadModal(true); persistence.handleLoadWorldList(); }}
                           className="py-4 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700 transition-colors flex flex-col items-center gap-2 border border-slate-700"
                        >
                           <FolderOpen className="w-6 h-6" />
                           <span>加载存档</span>
                        </button>
                     </div>
                     <p className="text-xs text-slate-600 mt-8">v1.0 MVP • Built with Google Gemini</p>
                  </div>
               </div>
            )
         }

      </div >
   );
};

export default App;
