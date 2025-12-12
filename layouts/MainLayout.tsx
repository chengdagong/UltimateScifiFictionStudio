import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Menu, X } from 'lucide-react';
import { extractEntitiesFromSnippet } from '../services/geminiService';
import { SocialEntity } from '../types';

// Components
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { WelcomeModal } from '../components/WelcomeModal';
import { NewWorldModal } from '../components/NewWorldModal';
import { SaveModal, LoadModal } from '../components/WorldModals';
import ParticipantsView from '../components/ParticipantsView';
import TimelineView from '../components/TimelineView';
import ChronicleView from '../components/ChronicleView';
import StoryAgentView from '../components/StoryAgentView';
import TechTreeView from '../components/TechTreeView';
import CharacterCardView from '../components/CharacterCardView';
import BrainstormView from '../components/BrainstormView';
import { GitView } from '../components/GitView';
import SettingsModal from '../components/SettingsModal';
import { WorldGenerationOverlay } from '../components/WorldGenerationOverlay';
import { StatusBar } from '../components/StatusBar';
import TaskListView from '../components/TaskListView';
import { Toast, ToastType } from '../components/Toast';

// Hooks
import { useApiSettings } from '../hooks/useApiSettings';
import { useWorldModel } from '../hooks/useWorldModel';
import { useStoryEngine } from '../hooks/useStoryEngine';
import { usePersistence } from '../hooks/usePersistence';
import { useAiTaskManager } from '../hooks/useAiTaskManager';

export const MainLayout: React.FC = () => {
   // App UI State
   const [activeTab, setActiveTab] = useState<'participants' | 'timeline' | 'story' | 'chronicle' | 'tech' | 'characters' | 'brainstorm' | 'tasks' | 'git'>('participants');
   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
   const [showWelcomeModal, setShowWelcomeModal] = useState(true);
   const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

   const { user, login, logout, isAuthenticated } = useAuth();
   const { t, i18n } = useTranslation();

   const toggleLanguage = () => {
      const newLang = i18n.language === 'zh' ? 'en' : 'zh';
      i18n.changeLanguage(newLang);
   };

   // --- Hooks Initialization ---
   const {
      apiSettings,
      showSettingsModal,
      setShowSettingsModal,
      toggleMinimalUI,
      checkApiKey,
      setApiSettings: handleSaveSettings
   } = useApiSettings();

   const isMinimalUI = apiSettings.minimalUI;

   const taskManager = useAiTaskManager();
   const worldModel = useWorldModel(apiSettings, checkApiKey, taskManager);
   const storyEngine = useStoryEngine();
   const persistence = usePersistence({
      worldModel,
      storyEngine,
      apiSettings,
      checkApiKey,
      setActiveTab
   });

   // Auto-close welcome modal when a world is loaded
   useEffect(() => {
      if (persistence.currentWorldId) {
         setShowWelcomeModal(false);
      }
   }, [persistence.currentWorldId]);

   const showToast = (message: string, type: ToastType = 'info') => {
      setToast({ message, type });
   };

   // 用户确认后的实体写回
   const handleAddEntitiesFromTask = (taskId: string, entities: SocialEntity[]) => {
      entities.forEach(entity => {
         worldModel.handleAddEntity(entity.name, entity.description, entity.category);
      });
      taskManager.removeTask(taskId);
      showToast(`已写入 ${entities.length} 个实体`, 'success');
   };

   // Check if world name conflicts with existing projects
   const isNameConflict = (name: string): boolean => {
      return persistence.savedWorlds.some(w => w.name === name);
   };

   // Wrappers for world creation that apply the name
   const handleCreateEmptyWithName = async (name: string) => {
      await persistence.handleLoadWorldList();
      
      if (isNameConflict(name)) {
         throw new Error("该名称已存在，请使用其他名称");
      }
      
      await persistence.handleCreateEmptyWorld(name);
   };

   const handleImportWithName = async (text: string, name: string) => {
      await persistence.handleLoadWorldList();
      
      if (isNameConflict(name)) {
         throw new Error("该名称已存在，请使用其他名称");
      }
      
      await persistence.handleImportWorld(text, name);
   };

   const handleApplyPresetWithName = async (preset: any, name: string) => {
      await persistence.handleLoadWorldList();
      
      if (isNameConflict(name)) {
         throw new Error("该名称已存在，请使用其他名称");
      }
      
      await persistence.handleApplyPreset(preset, name);
   };

   const handleRequestAnalysis = async (text: string, action: 'analyze' | 'explain' | 'expand' = 'analyze') => {
      console.log("App: handleRequestAnalysis called", text, action);

      let taskId = '';

      if (action === 'analyze') {
         taskId = taskManager.addTask('analysis', '文本社会解剖', '正在从选中文本中提取社会实体...', undefined, { text });
         showToast("正在后台分析文本... 请稍候", 'info');

         try {
            taskManager.updateTask(taskId, { status: 'running', progress: 10 });
            const results = await extractEntitiesFromSnippet(text, worldModel.model.entities, apiSettings);

            if (results.length > 0) {
               taskManager.completeTask(taskId, { summary: `提取了 ${results.length} 个新实体`, data: results });
               showToast(`分析完成！已生成 ${results.length} 个新实体`, 'success');
            } else {
               taskManager.completeTask(taskId, { summary: "未提取到有效实体" });
               showToast("分析完成，但未能从文本中提取到有效实体。", 'info');
            }
         } catch (e: any) {
            console.error("Analysis failed", e);
            taskManager.failTask(taskId, e.message);
            showToast("分析失败: " + e.message, 'error');
         }
      }
      else if (action === 'explain') {
         taskId = taskManager.addTask('custom', '文本智能解释', '正在解释选中的文本...', undefined, { text });
         taskManager.updateTask(taskId, { status: 'running', progress: 0 });

         setTimeout(() => {
            taskManager.completeTask(taskId, {
               summary: "解释完成 (Demo)",
               error: "AI 解释功能即将上线... (目前仅演示 UI)"
            });
         }, 1500);
      }
      else if (action === 'expand') {
         taskId = taskManager.addTask('custom', '文本智能扩写', '正在基于选中文本进行扩写...', undefined, { text });
         taskManager.updateTask(taskId, { status: 'running', progress: 0 });

         setTimeout(() => {
            taskManager.completeTask(taskId, {
               summary: "扩写完成 (Demo)",
               error: "AI 扩写功能即将上线... (目前仅演示 UI)"
            });
         }, 1500);
      }
   };

   return (
      <div className="flex flex-col h-screen bg-slate-100 text-slate-800 font-sans overflow-hidden">
         <div className="flex-1 flex overflow-hidden">
            {/* World Generation Overlay */}
            {persistence.isGeneratingWorld && (
               <WorldGenerationOverlay status={persistence.generationStatus} />
            )}

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-50">
               <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-serif font-bold">E</div>
                  <span className="font-serif font-bold text-slate-800">{t('app_name')}</span>
               </div>
               <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600">
                  {isMobileMenuOpen ? <X /> : <Menu />}
               </button>
            </div>

            {/* Sidebar Navigation */}
            <Sidebar
               activeTab={activeTab}
               setActiveTab={setActiveTab}
               isMobileMenuOpen={isMobileMenuOpen}
               setIsMobileMenuOpen={setIsMobileMenuOpen}
               isMinimalUI={isMinimalUI}
               toggleMinimalUI={toggleMinimalUI}
               onNewWorld={() => persistence.setShowNewWorldModal(true)}
               onSaveWorld={() => persistence.setShowSaveModal(true)}
               onLoadWorld={() => {
                  persistence.handleLoadWorldList();
                  persistence.setShowLoadModal(true);
               }}
               onSync={worldModel.handleGlobalSync}
               isSyncing={worldModel.isSyncing}
               onSettings={() => setShowSettingsModal(true)}
               onToggleLanguage={toggleLanguage}
               runningTasksCount={taskManager.tasks.filter(t => t.status === 'running').length}
               completedTasksCount={taskManager.tasks.filter(t => t.status === 'completed').length}
            />

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative pt-14 md:pt-0">
               {/* Header */}
               <Header
                  worldName={persistence.worldName}
                  entitiesCount={worldModel.model?.entities?.length ?? 0}
                  chaptersCount={worldModel.storySegments?.length ?? 0}
                  isAutoSaving={persistence.isAutoSaving}
                  lastAutoSaveTime={persistence.lastAutoSaveTime}
                  isSyncing={worldModel.isSyncing}
                  onSync={worldModel.handleGlobalSync}
                  user={user}
                  onLogout={logout}
               />

               {/* View Container */}
               <div className="flex-1 overflow-hidden p-4 md:p-6 bg-slate-50/50">
                  {activeTab === 'tasks' && (
                     <TaskListView
                        tasks={taskManager.tasks}
                        onClearCompleted={taskManager.clearCompleted}
                        onRemoveTask={taskManager.removeTask}
                        onAddEntities={handleAddEntitiesFromTask}
                        onUpdateTask={taskManager.updateTask}
                     />
                  )}

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

                  {activeTab === 'timeline' && (
                     <TimelineView
                        model={worldModel.model}
                        storySegments={worldModel.storySegments}
                        framework={worldModel.currentFramework}
                     />
                  )}

                  {activeTab === 'tech' && (
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
                  )}

                  {activeTab === 'chronicle' && (
                     <ChronicleView
                        model={worldModel.model}
                        storySegments={worldModel.storySegments}
                        context={worldModel.worldContext}
                        chronicleText={worldModel.chronicleText}
                        setChronicleText={worldModel.setChronicleText}
                        isSyncing={worldModel.isSyncing}
                     />
                  )}

                  {activeTab === 'characters' && (
                     <CharacterCardView
                        entities={worldModel.model.entities}
                        settings={apiSettings}
                        onAddEntity={worldModel.handleAddEntity}
                        onUpdateEntity={worldModel.handleUpdateEntity}
                        onRemoveEntity={worldModel.handleRemoveEntity}
                     />
                  )}

                  {activeTab === 'story' && (
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
                        onAnalysisRequest={(text, action) => handleRequestAnalysis(text, action)}
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
                        taskManager={taskManager}
                     />
                  )}

                  {activeTab === 'brainstorm' && (
                     <BrainstormView
                        globalApiSettings={apiSettings}
                        onAnalysisRequest={handleRequestAnalysis}
                        taskManager={taskManager}
                     />
                  )}

                  {activeTab === 'git' && (
                     <GitView projectId={persistence.currentWorldId} />
                  )}
               </div>
            </main>
         </div>

         <StatusBar isOnline={true} />

         {/* Modals */}
         <SettingsModal
            isOpen={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
            settings={apiSettings}
            onSave={handleSaveSettings}
         />

         <NewWorldModal
            isOpen={persistence.showNewWorldModal && !persistence.isGeneratingWorld}
            onClose={() => {
               persistence.setShowNewWorldModal(false);
               if (!persistence.currentWorldId) setShowWelcomeModal(true);
            }}
            onCreateEmpty={handleCreateEmptyWithName}
            onCreateFromPreset={handleApplyPresetWithName}
            onImport={handleImportWithName}
         />

         <SaveModal
            isOpen={persistence.showSaveModal}
            onClose={() => persistence.setShowSaveModal(false)}
            commitMessage={persistence.commitMessage}
            onCommitMessageChange={persistence.setCommitMessage}
            onSave={persistence.handleSaveWorld}
            isSaving={persistence.isSaving}
         />

         <LoadModal
            isOpen={persistence.showLoadModal}
            onClose={() => {
               persistence.setShowLoadModal(false);
               if (!persistence.currentWorldId) setShowWelcomeModal(true);
            }}
            savedWorlds={persistence.savedWorlds}
            isLoading={persistence.isLoadingWorlds}
            onLoadWorld={persistence.handleLoadWorld}
            onDeleteWorld={persistence.handleDeleteWorld}
         />

         {showWelcomeModal && !persistence.isGeneratingWorld && (
            <WelcomeModal
               isAuthenticated={isAuthenticated}
               user={user}
               onLogin={login}
               onLogout={logout}
               onNewWorld={() => {
                  setShowWelcomeModal(false);
                  persistence.setShowNewWorldModal(true);
               }}
               onLoadWorld={(world) => {
                  setShowWelcomeModal(false);
                  persistence.handleLoadWorld(world);
               }}
               savedWorlds={persistence.savedWorlds}
               isLoadingWorlds={persistence.isLoadingWorlds}
               onLoadWorldList={persistence.handleLoadWorldList}
            />
         )}

         {/* Toast */}
         {toast && (
            <Toast
               message={toast.message}
               type={toast.type}
               onClose={() => setToast(null)}
            />
         )}
      </div>
   );
};
