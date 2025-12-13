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
import { usePersistence } from '../hooks/usePersistence';
import { useTaskStore } from '../stores/taskStore';
import { useAppStore } from '../stores/appStore';

export const MainLayout: React.FC = () => {
   // App UI State
   const { activeTab, setActiveTab, currentWorldId } = useAppStore();
   
   // Initialize activeTab from localStorage
   useEffect(() => {
      const savedTab = localStorage.getItem('active_tab');
      if (savedTab) {
         setActiveTab(savedTab);
      }
   }, []);

   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
   const [showWelcomeModal, setShowWelcomeModal] = useState(true);
   const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

   const { user, login, logout, isAuthenticated, isInitializing } = useAuth();
   const { t, i18n } = useTranslation();

   // Persist activeTab to localStorage
   useEffect(() => {
      localStorage.setItem('active_tab', activeTab);
   }, [activeTab]);



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

   const taskStore = useTaskStore();
   const worldModel = useWorldModel();

   // Persistence logic for tasks
   useEffect(() => {
      if (!currentWorldId) {
         taskStore.setTasks([]);
         return;
      }
      try {
         const saved = localStorage.getItem(`ecoNarrative_tasks_${currentWorldId}`);
         if (saved) {
            taskStore.setTasks(JSON.parse(saved));
         } else {
            taskStore.setTasks([]);
         }
      } catch (e) {
         console.error("Failed to load tasks", e);
         taskStore.setTasks([]);
      }
   }, [currentWorldId]);

   useEffect(() => {
      if (!currentWorldId) return;
      try {
         localStorage.setItem(`ecoNarrative_tasks_${currentWorldId}`, JSON.stringify(taskStore.tasks));
      } catch (e) {
         console.error("Failed to save tasks", e);
      }
   }, [taskStore.tasks, currentWorldId]);

   const persistence = usePersistence();

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
      taskStore.removeTask(taskId);
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
         taskId = taskStore.addTask({
            type: 'analysis',
            name: '文本社会解剖',
            description: '正在从选中文本中提取社会实体...',
            metadata: { text }
         });
         showToast("正在后台分析文本... 请稍候", 'info');

         try {
            taskStore.updateTask(taskId, { status: 'running', progress: 10 });
            const results = await extractEntitiesFromSnippet(text, worldModel.model.entities, apiSettings);

            if (results.length > 0) {
               taskStore.updateTask(taskId, {
                  status: 'completed',
                  progress: 100,
                  result: { summary: `提取了 ${results.length} 个新实体`, data: results },
                  updatedAt: Date.now()
               });
               showToast(`分析完成！已生成 ${results.length} 个新实体`, 'success');
            } else {
               taskStore.updateTask(taskId, {
                  status: 'completed',
                  progress: 100,
                  result: { summary: "未提取到有效实体" },
                  updatedAt: Date.now()
               });
               showToast("分析完成，但未能从文本中提取到有效实体。", 'info');
            }
         } catch (e: any) {
            console.error("Analysis failed", e);
            taskStore.updateTask(taskId, {
               status: 'failed',
               result: { error: e.message },
               updatedAt: Date.now()
            });
            showToast("分析失败: " + e.message, 'error');
         }
      }
      else if (action === 'explain') {
         taskId = taskStore.addTask({
            type: 'custom',
            name: '文本智能解释',
            description: '正在解释选中的文本...',
            metadata: { text }
         });
         taskStore.updateTask(taskId, { status: 'running', progress: 0 });

         setTimeout(() => {
            taskStore.updateTask(taskId, {
               status: 'completed',
               progress: 100,
               result: {
                  summary: "解释完成 (Demo)",
                  error: "AI 解释功能即将上线... (目前仅演示 UI)"
               },
               updatedAt: Date.now()
            });
         }, 1500);
      }
      else if (action === 'expand') {
         taskId = taskStore.addTask({
            type: 'custom',
            name: '文本智能扩写',
            description: '正在基于选中文本进行扩写...',
            metadata: { text }
         });
         taskStore.updateTask(taskId, { status: 'running', progress: 0 });

         setTimeout(() => {
            taskStore.updateTask(taskId, {
               status: 'completed',
               progress: 100,
               result: {
                  summary: "扩写完成 (Demo)",
                  error: "AI 扩写功能即将上线... (目前仅演示 UI)"
               },
               updatedAt: Date.now()
            });
         }, 1500);
      }
   };

   // --- Conditional Rendering for Splash Screen ---
   // Must be placed after all hooks are called
   if (isInitializing) {
      return (
         <div className="flex flex-col h-screen bg-slate-900 text-white items-center justify-center">
            <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center animate-bounce mb-4 shadow-xl shadow-indigo-500/50">
               <span className="font-serif text-3xl font-bold">E</span>
            </div>
            <h2 className="text-xl font-medium animate-pulse">EcoNarrative Studio</h2>
            <p className="text-slate-400 text-sm mt-2">Checking Neural Link...</p>
         </div>
      );
   }

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
               onSettings={() => setShowSettingsModal(true)}
               onToggleLanguage={toggleLanguage}
            />

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative pt-14 md:pt-0">
               {/* Header */}
               <Header
                  worldName={persistence.worldName}
                  isAutoSaving={persistence.isAutoSaving}
                  lastAutoSaveTime={persistence.lastAutoSaveTime}
                  user={user}
                  onLogout={logout}
               />

               {/* View Container */}
               <div className="flex-1 overflow-hidden p-4 md:p-6 bg-slate-50/50">
                  {activeTab === 'tasks' && (
                     <TaskListView
                        onAddEntities={handleAddEntitiesFromTask}
                     />
                  )}

                  {activeTab === 'participants' && (
                     <ParticipantsView
                        isMinimalUI={isMinimalUI}
                     />
                  )}

                  {activeTab === 'timeline' && (
                     <TimelineView />
                  )}

                  {activeTab === 'tech' && (
                     <TechTreeView />
                  )}

                  {activeTab === 'chronicle' && (
                     <ChronicleView />
                  )}

                  {activeTab === 'characters' && (
                     <CharacterCardView />
                  )}

                  {activeTab === 'story' && (
                     <StoryAgentView />
                  )}

                  {activeTab === 'brainstorm' && (
                     <BrainstormView
                        onAnalysisRequest={handleRequestAnalysis}
                        worldId={currentWorldId}
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
