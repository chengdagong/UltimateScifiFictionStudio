import React from 'react';
import { useTranslation } from 'react-i18next';
import {
   BookOpen, Settings2, Sparkles, Save, FolderOpen, RefreshCw, Loader2,
   Globe2, Activity, BookText, Menu, X, Network, Cpu, PanelLeftClose,
   PanelLeftOpen, User, MessageCircle, Inbox, GitBranch
} from 'lucide-react';

interface SidebarProps {
   activeTab: string;
   setActiveTab: (tab: 'participants' | 'timeline' | 'story' | 'chronicle' | 'tech' | 'characters' | 'brainstorm' | 'tasks' | 'git') => void;
   isMobileMenuOpen: boolean;
   setIsMobileMenuOpen: (open: boolean) => void;
   isMinimalUI: boolean;
   toggleMinimalUI: () => void;
   onNewWorld: () => void;
   onSaveWorld: () => void;
   onLoadWorld: () => void;
   onSync: () => void;
   isSyncing: boolean;
   onSettings: () => void;
   onToggleLanguage: () => void;
   runningTasksCount: number;
   completedTasksCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
   activeTab,
   setActiveTab,
   isMobileMenuOpen,
   setIsMobileMenuOpen,
   isMinimalUI,
   toggleMinimalUI,
   onNewWorld,
   onSaveWorld,
   onLoadWorld,
   onSync,
   isSyncing,
   onSettings,
   onToggleLanguage,
   runningTasksCount,
   completedTasksCount
}) => {
   const { t, i18n } = useTranslation();

   const handleTabClick = (tab: 'participants' | 'timeline' | 'story' | 'chronicle' | 'tech' | 'characters' | 'brainstorm' | 'tasks' | 'git') => {
      setActiveTab(tab);
      setIsMobileMenuOpen(false);
   };

   return (
      <nav className={`
         fixed inset-y-0 left-0 z-40 bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 transform 
         ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
         md:translate-x-0 md:static
         ${isMinimalUI ? 'w-20 items-center' : 'w-64'}
      `}>
         {/* Logo */}
         <div className={`p-6 flex items-center ${isMinimalUI ? 'justify-center' : 'gap-3'} text-white transition-all`}>
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center font-serif font-bold text-lg shadow-lg shadow-indigo-500/30 shrink-0">E</div>
            {!isMinimalUI && (
               <div>
                  <h1 className="font-serif font-bold text-lg tracking-wide whitespace-nowrap">{t('app_name')}</h1>
                  <p className="text-[10px] opacity-60 uppercase tracking-widest">{t('app_subtitle')}</p>
               </div>
            )}
         </div>

         {/* New World Button */}
         <div className={`px-4 py-2 ${isMinimalUI ? 'px-2' : ''}`}>
            <button
               onClick={onNewWorld}
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

         {/* CORE APPS */}
         <div className={`mt-4 ${isMinimalUI ? '' : 'px-3'} space-y-1`}>
            <button
               onClick={() => handleTabClick('tasks')}
               className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'tasks' ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800'} ${isMinimalUI ? 'justify-center px-0' : ''} relative`}
               title={isMinimalUI ? t('nav_tasks') : undefined}
            >
               <Inbox className="w-4 h-4" />
               {!isMinimalUI && t('nav_tasks')}
               {runningTasksCount > 0 && (
                  <span className="absolute right-2 top-2 bg-indigo-500 text-white text-[10px] px-1.5 rounded-full animate-pulse">
                     {t('status_running')}
                  </span>
               )}
               {!isMinimalUI && completedTasksCount > 0 && (
                  <span className="bg-green-500 text-white text-[10px] px-1.5 rounded-full ml-auto">
                     {completedTasksCount}
                  </span>
               )}
            </button>

            <button
               onClick={() => handleTabClick('brainstorm')}
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
               onClick={() => handleTabClick('participants')}
               className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'participants' ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800'} ${isMinimalUI ? 'justify-center px-0' : ''}`}
               title={isMinimalUI ? t('nav_participants') : undefined}
            >
               <Network className="w-4 h-4" />
               {!isMinimalUI && t('nav_participants')}
            </button>

            <button
               onClick={() => handleTabClick('characters')}
               className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'characters' ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800'} ${isMinimalUI ? 'justify-center px-0' : ''}`}
               title={isMinimalUI ? t('nav_characters') : undefined}
            >
               <User className="w-4 h-4" />
               {!isMinimalUI && t('nav_characters')}
            </button>

            <button
               onClick={() => handleTabClick('timeline')}
               className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'timeline' ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800'} ${isMinimalUI ? 'justify-center px-0' : ''}`}
               title={isMinimalUI ? t('nav_timeline') : undefined}
            >
               <Activity className="w-4 h-4" />
               {!isMinimalUI && t('nav_timeline')}
            </button>

            <button
               onClick={() => handleTabClick('tech')}
               className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'tech' ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800'} ${isMinimalUI ? 'justify-center px-0' : ''}`}
               title={isMinimalUI ? t('nav_techtree') : undefined}
            >
               <Cpu className="w-4 h-4" />
               {!isMinimalUI && t('nav_techtree')}
            </button>

            <button
               onClick={() => handleTabClick('chronicle')}
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
               onClick={() => handleTabClick('story')}
               className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'story' ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800'} ${isMinimalUI ? 'justify-center px-0' : ''}`}
               title={isMinimalUI ? t('nav_story_engine') : undefined}
            >
               <BookOpen className="w-4 h-4" />
               {!isMinimalUI && t('nav_story_engine')}
            </button>
         </div>

         {/* VERSION CONTROL */}
         <div className={`mt-6 ${isMinimalUI ? '' : 'px-3'}`}>
            {!isMinimalUI && <p className="px-3 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Version Control</p>}
            <button
               onClick={() => handleTabClick('git')}
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
               onClick={onSaveWorld}
               className={`w-full flex items-center gap-3 py-2 text-sm hover:text-white transition-colors ${isMinimalUI ? 'justify-center px-0' : 'px-3'}`}
               title={isMinimalUI ? t('action_save_world') : undefined}
            >
               <Save className="w-4 h-4" />
               {!isMinimalUI && t('action_save_world')}
            </button>
            <button
               onClick={onLoadWorld}
               className={`w-full flex items-center gap-3 py-2 text-sm hover:text-white transition-colors ${isMinimalUI ? 'justify-center px-0' : 'px-3'}`}
               title={isMinimalUI ? t('action_load_world') : undefined}
            >
               <FolderOpen className="w-4 h-4" />
               {!isMinimalUI && t('action_load_world')}
            </button>

            <button
               onClick={onSync}
               disabled={isSyncing}
               className={`w-full flex items-center gap-3 py-2 text-sm hover:text-white transition-colors ${isMinimalUI ? 'justify-center px-0' : 'px-3'}`}
               title={isMinimalUI ? t('action_sync') : undefined}
            >
               {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
               {!isMinimalUI && t('action_sync')}
            </button>
         </div>

         {/* Footer */}
         <div className={`mt-auto p-4 border-t border-slate-800 ${isMinimalUI ? 'flex flex-col gap-4 items-center' : 'flex items-center justify-between'}`}>
            <button
               onClick={onSettings}
               className={`flex items-center gap-3 text-slate-400 hover:text-white transition-colors text-sm ${isMinimalUI ? 'justify-center' : ''}`}
               title={isMinimalUI ? t('action_settings') : undefined}
            >
               <Settings2 className="w-4 h-4" />
               {!isMinimalUI && t('action_settings')}
            </button>

            <button
               onClick={onToggleLanguage}
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
   );
};
