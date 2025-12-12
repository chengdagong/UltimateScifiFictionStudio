import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';
import { useTranslation } from 'react-i18next';
import { BookOpen, Settings2, Sparkles, Save, FolderOpen, X, Loader2, Globe2, Activity, BookText, RefreshCw, Trash2, Menu, Network, Cpu, PanelLeftClose, PanelLeftOpen, User, MessageCircle, Inbox, GitBranch, LogOut } from 'lucide-react';
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
import { GitView } from './components/GitView';
import SettingsModal from './components/SettingsModal';
import { WorldGenerationOverlay } from './components/WorldGenerationOverlay';
import { StatusBar } from './components/StatusBar';
import TaskListView from './components/TaskListView';
import { Toast, ToastType } from './components/Toast';

// Hooks
import { useApiSettings } from './hooks/useApiSettings';
import { useWorldModel } from './hooks/useWorldModel';
import { useStoryEngine } from './hooks/useStoryEngine';
import { usePersistence } from './hooks/usePersistence';
import { useAiTaskManager } from './hooks/useAiTaskManager';

// Constants
import { WORLD_PRESETS } from './constants/presets';
import { FRAMEWORKS } from './constants/frameworks';

// Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
   const { isAuthenticated } = useAuth();
   return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const DashboardContent: React.FC = () => {
   // App UI State - includes both 'tasks' and 'git' tabs
   const [activeTab, setActiveTab] = useState<'participants' | 'timeline' | 'story' | 'chronicle' | 'tech' | 'characters' | 'brainstorm' | 'tasks' | 'git'>('participants');
   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
   const [newWorldTab, setNewWorldTab] = useState<'empty' | 'presets' | 'import'>('empty');
   const [importText, setImportText] = useState("");
   const [showWelcomeModal, setShowWelcomeModal] = useState(true);
   const [showUserMenu, setShowUserMenu] = useState(false);

   const { user, logout } = useAuth();


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
      setApiSettings: handleSaveSettings // Rename for consistency
   } = useApiSettings();

   const isMinimalUI = apiSettings.minimalUI;

   const taskManager = useAiTaskManager(); // Init Task Manager
   const worldModel = useWorldModel(apiSettings, checkApiKey, taskManager);
   const storyEngine = useStoryEngine();
   const persistence = usePersistence({
      worldModel,
      storyEngine,
      apiSettings,
      checkApiKey,
      setActiveTab
   });

   // Auto-close welcome modal when a world is loaded (e.g. auto-load)
   useEffect(() => {
      if (persistence.currentWorldId) {
         setShowWelcomeModal(false);
      }
   }, [persistence.currentWorldId]);

   // --- Derived State for UI Rendering ---
   const {
      model,
      currentFramework,
      storySegments,
      worldContext,
      currentTimeSetting,
   } = worldModel;

   // 用户确认后的实体写回
   const handleAddEntitiesFromTask = (taskId: string, entities: SocialEntity[]) => {
      entities.forEach(entity => {
         worldModel.handleAddEntity(entity.name, entity.description, entity.category);
      });
      taskManager.removeTask(taskId);
      showToast(`已写入 ${entities.length} 个实体`, 'success');
   };

   // --- Task Manager Integration ---

   // Toast State
   const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

   const showToast = (message: string, type: ToastType = 'info') => {
      setToast({ message, type });
   };

   const handleRequestAnalysis = async (text: string, action: 'analyze' | 'explain' | 'expand' = 'analyze') => {
      console.log("App: handleRequestAnalysis called", text, action);

      let taskId = '';

      if (action === 'analyze') {
         taskId = taskManager.addTask('analysis', '文本社会解剖', '正在从选中文本中提取社会实体...', undefined, { text });
         showToast("正在后台分析文本... 请稍候", 'info');

         try {
            taskManager.updateTask(taskId, { status: 'running', progress: 10 });
            const results = await extractEntitiesFromSnippet(text, model.entities, apiSettings);

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

            {/* --- Modals/Overlays --- */}
            {persistence.isGeneratingWorld && (
               <WorldGenerationOverlay
                  status={persistence.generationStatus}
               />
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
                        <h1 className="font-serif font-bold text-lg tracking-wide whitespace-nowrap">{t('app_name')}</h1>
                        <p className="text-[10px] opacity-60 uppercase tracking-widest">{t('app_subtitle')}</p>
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
                     title={isMinimalUI ? t('new_world') : undefined}
                  >
                     <Sparkles className="w-4 h-4" />
                     {!isMinimalUI && t('new_world')}
                  </button>
               </div>

               {/* CORE APPS (AI Tasks & Brainstorm) */}
               <div className={`mt-4 ${isMinimalUI ? '' : 'px-3'} space-y-1`}>
                  <button
                     onClick={() => { setActiveTab('tasks'); setIsMobileMenuOpen(false); }}
                     className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'tasks' ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800'} ${isMinimalUI ? 'justify-center px-0' : ''} relative`}
                     title={isMinimalUI ? t('nav_tasks') : undefined}
                  >
                     <Inbox className="w-4 h-4" />
                     {!isMinimalUI && t('nav_tasks')}
                     {taskManager.tasks.some(t => t.status === 'running') && (
                        <span className="absolute right-2 top-2 bg-indigo-500 text-white text-[10px] px-1.5 rounded-full animate-pulse">
                           {t('status_running')}
                        </span>
                     )}
                     {!isMinimalUI && taskManager.tasks.filter(t => t.status === 'completed').length > 0 && (
                        <span className="bg-green-500 text-white text-[10px] px-1.5 rounded-full ml-auto">
                           {taskManager.tasks.filter(t => t.status === 'completed').length}
                        </span>
                     )}
                  </button>

                  <button
                     onClick={() => { setActiveTab('brainstorm'); setIsMobileMenuOpen(false); }}
                     className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'brainstorm' ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800'} ${isMinimalUI ? 'justify-center px-0' : ''}`}
                     title={isMinimalUI ? t('nav_brainstorm') : undefined}
                  >
                     <MessageCircle className="w-4 h-4" />
                     {!isMinimalUI && t('nav_brainstorm')}
                  </button>
               </div>

               {/* WORLD ENGINE SECTION */}
               <div className={`mt-4 ${isMinimalUI ? '' : 'px-3'}`}>
                  {!isMinimalUI && <p className="px-3 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('section_world')}</p>}

                  <button
                     onClick={() => { setActiveTab('participants'); setIsMobileMenuOpen(false); }}
                     className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'participants' ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800'} ${isMinimalUI ? 'justify-center px-0' : ''}`}
                     title={isMinimalUI ? t('nav_participants') : undefined}
                  >
                     <Network className="w-4 h-4" />
                     {!isMinimalUI && t('nav_participants')}
                  </button>

                  <button
                     onClick={() => { setActiveTab('characters'); setIsMobileMenuOpen(false); }}
                     className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'characters' ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800'} ${isMinimalUI ? 'justify-center px-0' : ''}`}
                     title={isMinimalUI ? t('nav_characters') : undefined}
                  >
                     <User className="w-4 h-4" />
                     {!isMinimalUI && t('nav_characters')}
                  </button>

                  <button
                     onClick={() => { setActiveTab('timeline'); setIsMobileMenuOpen(false); }}
                     className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'timeline' ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800'} ${isMinimalUI ? 'justify-center px-0' : ''}`}
                     title={isMinimalUI ? t('nav_timeline') : undefined}
                  >
                     <Activity className="w-4 h-4" />
                     {!isMinimalUI && t('nav_timeline')}
                  </button>

                  <button
                     onClick={() => { setActiveTab('tech'); setIsMobileMenuOpen(false); }}
                     className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'tech' ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800'} ${isMinimalUI ? 'justify-center px-0' : ''}`}
                     title={isMinimalUI ? t('nav_techtree') : undefined}
                  >
                     <Cpu className="w-4 h-4" />
                     {!isMinimalUI && t('nav_techtree')}
                  </button>

                  <button
                     onClick={() => { setActiveTab('chronicle'); setIsMobileMenuOpen(false); }}
                     className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'chronicle' ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800'} ${isMinimalUI ? 'justify-center px-0' : ''}`}
                     title={isMinimalUI ? t('nav_chronicle') : undefined}
                  >
                     <BookText className="w-4 h-4" />
                     {!isMinimalUI && t('nav_chronicle')}
                  </button>
               </div>

               {/* STORY ENGINE SECTION */}
               <div className={`mt-6 ${isMinimalUI ? '' : 'px-3'}`}>
                  {!isMinimalUI && <p className="px-3 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('section_story')}</p>}

                  <button
                     onClick={() => { setActiveTab('story'); setIsMobileMenuOpen(false); }}
                     className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'story' ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800'} ${isMinimalUI ? 'justify-center px-0' : ''}`}
                     title={isMinimalUI ? t('nav_story_engine') : undefined}
                  >
                     <BookOpen className="w-4 h-4" />
                     {!isMinimalUI && t('nav_story_engine')}
                  </button>
               </div>

               {/* VERSION CONTROL (Local Git) */}
               <div className={`mt-6 ${isMinimalUI ? '' : 'px-3'}`}>
                  {!isMinimalUI && <p className="px-3 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Version Control</p>}
                  <button
                     onClick={() => { setActiveTab('git'); setIsMobileMenuOpen(false); }}
                     className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'git' ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800'} ${isMinimalUI ? 'justify-center px-0' : ''}`}
                     title={isMinimalUI ? 'Version Control' : undefined}
                  >
                     <GitBranch className="w-4 h-4" />
                     {!isMinimalUI && 'Version Control'}
                  </button>
               </div>

               {/* DATA */}
               <div className={`mt-8 ${isMinimalUI ? '' : 'px-3'}`}>
                  {!isMinimalUI && <p className="px-3 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('section_data')}</p>}
                  <button
                     onClick={() => { persistence.setShowSaveModal(true); setIsMobileMenuOpen(false); }}
                     className={`w-full flex items-center gap-3 py-2 text-sm hover:text-white transition-colors ${isMinimalUI ? 'justify-center px-0' : 'px-3'}`}
                     title={isMinimalUI ? t('action_save_world') : undefined}
                  >
                     <Save className="w-4 h-4" />
                     {!isMinimalUI && t('action_save_world')}
                  </button>
                  <button
                     onClick={() => { persistence.handleLoadWorldList(); persistence.setShowLoadModal(true); setIsMobileMenuOpen(false); }}
                     className={`w-full flex items-center gap-3 py-2 text-sm hover:text-white transition-colors ${isMinimalUI ? 'justify-center px-0' : 'px-3'}`}
                     title={isMinimalUI ? t('action_load_world') : undefined}
                  >
                     <FolderOpen className="w-4 h-4" />
                     {!isMinimalUI && t('action_load_world')}
                  </button>

                  <button
                     onClick={worldModel.handleGlobalSync}
                     disabled={worldModel.isSyncing}
                     className={`w-full flex items-center gap-3 py-2 text-sm hover:text-white transition-colors ${isMinimalUI ? 'justify-center px-0' : 'px-3'}`}
                     title={isMinimalUI ? t('action_sync') : undefined}
                  >
                     {worldModel.isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                     {!isMinimalUI && t('action_sync')}
                  </button>
               </div>

               <div className={`mt-auto p-4 border-t border-slate-800 ${isMinimalUI ? 'flex flex-col gap-4 items-center' : 'flex items-center justify-between'}`}>
                  <button
                     onClick={() => { setShowSettingsModal(true); setIsMobileMenuOpen(false); }}
                     className={`flex items-center gap-3 text-slate-400 hover:text-white transition-colors text-sm ${isMinimalUI ? 'justify-center' : ''}`}
                     title={isMinimalUI ? t('action_settings') : undefined}
                  >
                     <Settings2 className="w-4 h-4" />
                     {!isMinimalUI && t('action_settings')}
                  </button>

                  <button
                     onClick={toggleLanguage}
                     className={`flex items-center gap-3 text-slate-400 hover:text-white transition-colors text-sm ${isMinimalUI ? 'justify-center' : ''}`}
                     title={isMinimalUI ? (i18n.language === 'zh' ? t('action_switch_to_en') : t('action_switch_to_zh')) : undefined}
                  >
                     <Globe2 className="w-4 h-4" />
                     {!isMinimalUI && <span className="text-xs font-bold uppercase">{i18n.language}</span>}
                  </button>

                  <button
                     onClick={toggleMinimalUI}
                     className="text-slate-500 hover:text-white transition-colors p-1 rounded-md hover:bg-slate-800"
                     title={isMinimalUI ? t('action_expand_sidebar') : t('action_collapse_sidebar')}
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
                           <span>{worldModel.model.entities.length} {t('label_entities')}</span>
                           <span>•</span>
                           <span>{worldModel.storySegments.length} {t('label_chapters')}</span>
                        </div>
                     </div>
                  </div>

                  <div className="flex items-center gap-3">
                     {/* Auto Save Status */}
                     <div className="hidden lg:flex items-center gap-2 text-[10px] text-slate-400 mr-2">
                        {persistence.isAutoSaving ? (
                           <><Loader2 className="w-3 h-3 animate-spin" /> {t('status_saving_local')}</>
                        ) : (
                           <span title={`${t('label_last_auto_save')}: ${new Date(persistence.lastAutoSaveTime).toLocaleTimeString()}`}>
                              {t('status_local_backup')}
                           </span>
                        )}
                     </div>

                     <div className="h-6 w-px bg-slate-200"></div>

                     <button
                        onClick={worldModel.handleGlobalSync}
                        disabled={worldModel.isSyncing}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200"
                     >
                        {worldModel.isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        <span>{t('action_refresh_status')}</span>
                     </button>

                     <div className="h-6 w-px bg-slate-200 mx-2"></div>

                     {user && (
                        <div className="relative">
                           <button
                              onClick={() => setShowUserMenu(!showUserMenu)}
                              className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg transition-colors outline-none focus:ring-2 focus:ring-indigo-100"
                           >
                              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 border border-indigo-200">
                                 <User className="w-4 h-4" />
                              </div>
                              <span className="font-bold text-slate-700 text-sm hidden lg:block">{user}</span>
                           </button>

                           {/* User Dropdown Menu */}
                           {showUserMenu && (
                              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                                 <div className="px-4 py-3 border-b border-slate-50 mb-1">
                                    <p className="text-sm font-bold text-slate-700">已登录</p>
                                    <p className="text-xs text-slate-500 truncate">{user}</p>
                                 </div>
                                 <button
                                    onClick={() => {
                                       setShowUserMenu(false);
                                       logout();
                                    }}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                                 >
                                    <LogOut className="w-4 h-4" />
                                    <span>退出登录 (Logout)</span>
                                 </button>
                              </div>
                           )}
                        </div>
                     )}
                  </div>
               </header >

               {/* View Container */}
               < div className="flex-1 overflow-hidden p-4 md:p-6 bg-slate-50/50" >
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
                           onAnalysisRequest={(text, action) => handleRequestAnalysis(text, action)}

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
                           taskManager={taskManager}
                        />
                     )
                  }

                  {
                     activeTab === 'brainstorm' && (
                        <BrainstormView
                           globalApiSettings={apiSettings}
                           onAnalysisRequest={handleRequestAnalysis}
                           taskManager={taskManager}
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

                  {
                     activeTab === 'git' && (
                        <GitView projectId={persistence.currentWorldId} />
                     )
                  }
               </div >
            </main >
         </div >

         <StatusBar isOnline={true} />

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
                        <h2 className="text-xl font-bold text-slate-800">{t('modal_new_world_title')}</h2>
                        <button onClick={() => persistence.setShowNewWorldModal(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
                     </div>

                     <div className="flex border-b border-slate-100 shrink-0">
                        <button
                           className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${newWorldTab === 'empty' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                           onClick={() => setNewWorldTab('empty')}
                        >
                           {t('tab_new_world_empty')}
                        </button>
                        <button
                           className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${newWorldTab === 'presets' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                           onClick={() => setNewWorldTab('presets')}
                        >
                           {t('tab_new_world_presets')}
                        </button>
                        <button
                           className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${newWorldTab === 'import' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                           onClick={() => setNewWorldTab('import')}
                        >
                           {t('tab_new_world_import')}
                        </button>
                     </div>

                     <div className="p-6 overflow-y-auto">
                        {newWorldTab === 'empty' && (
                           <div className="space-y-4 text-center py-8">
                              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                 <Sparkles className="w-8 h-8 text-indigo-600" />
                              </div>
                              <h3 className="text-lg font-bold text-slate-800">{t('new_world_from_scratch_title')}</h3>
                              <p className="text-slate-500 text-sm max-w-sm mx-auto">
                                 {t('new_world_from_scratch_desc')}
                              </p>
                              <button
                                 onClick={persistence.handleCreateEmptyWorld}
                                 className="mt-4 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200/50 transition-all"
                              >
                                 {t('action_create_now')}
                              </button>
                           </div>
                        )}

                        {newWorldTab === 'presets' && (
                           <div className="space-y-4">
                              <p className="text-sm text-slate-500 mb-2">{t('preset_selection_desc')}</p>
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
                              <p className="text-sm text-slate-500">{t('import_text_desc')}</p>
                              <textarea
                                 className="w-full h-48 p-4 border rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                 placeholder={t('placeholder_import_text')}
                                 value={importText}
                                 onChange={e => setImportText(e.target.value)}
                              />
                              <div className="flex justify-end">
                                 <button
                                    onClick={() => persistence.handleImportWorld(importText)}
                                    className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                                 >
                                    {t('action_start_analysis')}
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
                     <h3 className="font-bold text-lg mb-4">{t('modal_save_world_title')}</h3>
                     <input
                        autoFocus
                        className="w-full p-2 border rounded mb-4"
                        value={persistence.worldName}
                        onChange={e => persistence.setWorldName(e.target.value)}
                        placeholder={t('placeholder_world_name')}
                     />
                     <div className="flex justify-end gap-2">
                        <button onClick={() => persistence.setShowSaveModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded">{t('action_cancel')}</button>
                        <button onClick={persistence.handleSaveWorld} disabled={persistence.isSaving} className="px-4 py-2 bg-indigo-600 text-white rounded font-bold">
                           {persistence.isSaving ? t('status_saving') : t('action_confirm_save')}
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
                        <h3 className="font-bold text-lg">{t('modal_load_world_title')}</h3>
                        <button onClick={() => persistence.setShowLoadModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
                     </div>
                     <div className="flex-1 overflow-y-auto p-2">
                        {persistence.isLoadingWorlds ? (
                           <div className="flex justify-center py-8"><Loader2 className="animate-spin text-indigo-500" /></div>
                        ) : persistence.savedWorlds.length === 0 ? (
                           <div className="text-center py-8 text-slate-400">{t('empty_no_saves')}</div>
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
                                          <span>{FRAMEWORKS[w.frameworkId || 'general']?.name || t('framework_unknown')}</span>
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
                                       title={t('action_delete_save')}
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
                        <h1 className="text-4xl font-serif font-bold mb-2">{t('welcome_title')}</h1>
                        <p className="text-slate-400 text-lg">{t('welcome_subtitle')}</p>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                        <button
                           onClick={() => { setShowWelcomeModal(false); persistence.setShowNewWorldModal(true); }}
                           className="py-4 bg-white text-slate-900 rounded-xl font-bold hover:bg-indigo-50 transition-colors flex flex-col items-center gap-2"
                        >
                           <Sparkles className="w-6 h-6 text-indigo-600" />
                           <span>{t('new_world')}</span>
                        </button>
                        <button
                           onClick={() => { setShowWelcomeModal(false); persistence.setShowLoadModal(true); persistence.handleLoadWorldList(); }}
                           className="py-4 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700 transition-colors flex flex-col items-center gap-2 border border-slate-700"
                        >
                           <FolderOpen className="w-6 h-6" />
                           <span>{t('action_load_world')}</span>
                        </button>
                     </div>
                     <p className="text-xs text-slate-600 mt-8">{t('welcome_version')}</p>
                  </div>
               </div>
            )
         }

      </div >
   );
};

const App: React.FC = () => {
   return (
      <AuthProvider>
         <BrowserRouter>
            <Routes>
               <Route path="/login" element={<LoginPage />} />
               <Route path="/*" element={
                  <ProtectedRoute>
                     <DashboardContent />
                  </ProtectedRoute>
               } />
            </Routes>
         </BrowserRouter>
      </AuthProvider>
   );
};

export default App;
