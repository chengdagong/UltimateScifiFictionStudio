import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Loader2, Trash2 } from 'lucide-react';
import { FRAMEWORKS } from '../constants/frameworks';
import { WorldData } from '../types';

interface SaveModalProps {
   isOpen: boolean;
   onClose: () => void;
   commitMessage: string;
   onCommitMessageChange: (message: string) => void;
   onSave: () => void;
   isSaving: boolean;
}

export const SaveModal: React.FC<SaveModalProps> = ({
   isOpen,
   onClose,
   commitMessage,
   onCommitMessageChange,
   onSave,
   isSaving
}) => {
   const { t } = useTranslation();

   if (!isOpen) return null;

   return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
         <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm animate-fadeIn">
            <h3 className="font-bold text-lg mb-4">{t('modal_save_world_title')}</h3>
            <input
               autoFocus
               className="w-full p-2 border rounded mb-4"
               value={commitMessage}
               onChange={e => onCommitMessageChange(e.target.value)}
               placeholder={t('placeholder_commit_message')}
            />
            <div className="flex justify-end gap-2">
               <button
                  onClick={onClose}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded"
               >
                  {t('action_cancel')}
               </button>
               <button
                  onClick={onSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded font-bold"
               >
                  {isSaving ? t('status_saving') : t('action_confirm_save')}
               </button>
            </div>
         </div>
      </div>
   );
};

interface LoadModalProps {
   isOpen: boolean;
   onClose: () => void;
   savedWorlds: WorldData[];
   isLoading: boolean;
   onLoadWorld: (world: WorldData) => void;
   onDeleteWorld: (id: string) => void;
}

export const LoadModal: React.FC<LoadModalProps> = ({
   isOpen,
   onClose,
   savedWorlds,
   isLoading,
   onLoadWorld,
   onDeleteWorld
}) => {
   const { t } = useTranslation();

   if (!isOpen) return null;

   return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
         <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
               <h3 className="font-bold text-lg">{t('modal_load_world_title')}</h3>
               <button onClick={onClose}>
                  <X className="w-5 h-5 text-slate-400" />
               </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
               {isLoading ? (
                  <div className="flex justify-center py-8">
                     <Loader2 className="animate-spin text-indigo-500" />
                  </div>
               ) : savedWorlds.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">{t('empty_no_saves')}</div>
               ) : (
                  <div className="space-y-2">
                     {[...savedWorlds].sort((a, b) => b.lastModified - a.lastModified).map(w => (
                        <div key={w.id} className="flex gap-2 relative group">
                           <button
                              onClick={() => onLoadWorld(w)}
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
                                 if (w.id) onDeleteWorld(w.id);
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
   );
};
