import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Loader2, User as UserIcon, LogOut } from 'lucide-react';

interface HeaderProps {
   worldName: string;
   entitiesCount: number;
   chaptersCount: number;
   isAutoSaving: boolean;
   lastAutoSaveTime: number;
   isSyncing: boolean;
   onSync: () => void;
   user: string | null;
   onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
   worldName,
   entitiesCount,
   chaptersCount,
   isAutoSaving,
   lastAutoSaveTime,
   isSyncing,
   onSync,
   user,
   onLogout
}) => {
   const { t } = useTranslation();
   const [showUserMenu, setShowUserMenu] = useState(false);

   return (
      <header className="hidden md:flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 shrink-0 shadow-sm z-20">
         <div className="flex items-center gap-6">
            <div>
               <h2 className="text-lg font-serif font-bold text-slate-800">{worldName}</h2>
               <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{entitiesCount} {t('label_entities')}</span>
                  <span>•</span>
                  <span>{chaptersCount} {t('label_chapters')}</span>
               </div>
            </div>
         </div>

         <div className="flex items-center gap-3">
            {/* Auto Save Status */}
            <div className="hidden lg:flex items-center gap-2 text-[10px] text-slate-400 mr-2">
               {isAutoSaving ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> {t('status_saving_local')}</>
               ) : (
                  <span title={`${t('label_last_auto_save')}: ${new Date(lastAutoSaveTime).toLocaleTimeString()}`}>
                     {t('status_local_backup')}
                  </span>
               )}
            </div>

            <div className="h-6 w-px bg-slate-200"></div>

            <button
               onClick={onSync}
               disabled={isSyncing}
               className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200"
            >
               {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
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
                        <UserIcon className="w-4 h-4" />
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
                              onLogout();
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
      </header>
   );
};
