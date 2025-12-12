import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Sparkles } from 'lucide-react';
import { WORLD_PRESETS } from '../constants/presets';

interface NewWorldModalProps {
   isOpen: boolean;
   onClose: () => void;
   onCreateEmpty: (name: string) => Promise<void>;
   onCreateFromPreset: (preset: any, name: string) => Promise<void>;
   onImport: (text: string, name: string) => Promise<void>;
}

export const NewWorldModal: React.FC<NewWorldModalProps> = ({
   isOpen,
   onClose,
   onCreateEmpty,
   onCreateFromPreset,
   onImport
}) => {
   const { t } = useTranslation();
   const [activeTab, setActiveTab] = useState<'empty' | 'presets' | 'import'>('empty');
   const [worldName, setWorldName] = useState('新世界');
   const [importText, setImportText] = useState('');
   const [error, setError] = useState('');

   if (!isOpen) return null;

   const handleCreateEmpty = async () => {
      setError('');
      if (!worldName.trim()) {
         setError('请输入世界名称');
         return;
      }
      try {
         await onCreateEmpty(worldName);
         setWorldName('新世界');
         setError('');
      } catch (err: any) {
         setError(err.message || '创建失败，请重试');
      }
   };

   const handleCreateFromPreset = async (preset: any) => {
      setError('');
      if (!worldName.trim()) {
         setError('请输入世界名称');
         return;
      }
      try {
         await onCreateFromPreset(preset, worldName);
         setWorldName('新世界');
         setError('');
      } catch (err: any) {
         setError(err.message || '创建失败，请重试');
      }
   };

   const handleImport = async () => {
      setError('');
      if (!worldName.trim()) {
         setError('请输入世界名称');
         return;
      }
      try {
         await onImport(importText, worldName);
         setWorldName('新世界');
         setImportText('');
         setError('');
      } catch (err: any) {
         setError(err.message || '导入失败，请重试');
      }
   };

   return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
         <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
               <h2 className="text-xl font-bold text-slate-800">{t('modal_new_world_title')}</h2>
               <button
                  onClick={() => {
                     onClose();
                     setError('');
                  }}
                  className="text-slate-400 hover:text-slate-600"
               >
                  <X />
               </button>
            </div>

            <div className="flex border-b border-slate-100 shrink-0">
               <button
                  className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'empty' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                  onClick={() => setActiveTab('empty')}
               >
                  {t('tab_new_world_empty')}
               </button>
               <button
                  className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'presets' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                  onClick={() => setActiveTab('presets')}
               >
                  {t('tab_new_world_presets')}
               </button>
               <button
                  className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'import' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                  onClick={() => setActiveTab('import')}
               >
                  {t('tab_new_world_import')}
               </button>
            </div>

            <div className="p-6 overflow-y-auto">
               {activeTab === 'empty' && (
                  <div className="space-y-4 py-4">
                     <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="w-8 h-8 text-indigo-600" />
                     </div>
                     <h3 className="text-lg font-bold text-slate-800 text-center">{t('new_world_from_scratch_title')}</h3>
                     <p className="text-slate-500 text-sm max-w-sm mx-auto text-center">
                        {t('new_world_from_scratch_desc')}
                     </p>

                     <div className="max-w-md mx-auto mt-6">
                        <label className="block text-sm font-bold text-slate-700 mb-2">世界名称</label>
                        <input
                           type="text"
                           value={worldName}
                           onChange={(e) => {
                              setWorldName(e.target.value);
                              setError('');
                           }}
                           className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                           placeholder="输入世界名称..."
                        />
                        {error && (
                           <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                              <span>⚠️</span>
                              <span>{error}</span>
                           </p>
                        )}
                     </div>

                     <div className="text-center">
                        <button
                           onClick={handleCreateEmpty}
                           disabled={!worldName.trim()}
                           className="mt-4 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                           {t('action_create_now')}
                        </button>
                     </div>
                  </div>
               )}

               {activeTab === 'presets' && (
                  <div className="space-y-4">
                     <div className="max-w-md mx-auto mb-4">
                        <label className="block text-sm font-bold text-slate-700 mb-2">世界名称</label>
                        <input
                           type="text"
                           value={worldName}
                           onChange={(e) => {
                              setWorldName(e.target.value);
                              setError('');
                           }}
                           className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                           placeholder="输入世界名称..."
                        />
                        {error && (
                           <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                              <span>⚠️</span>
                              <span>{error}</span>
                           </p>
                        )}
                     </div>

                     <p className="text-sm text-slate-500 mb-2">{t('preset_selection_desc')}</p>
                     <div className="grid grid-cols-1 gap-4">
                        {WORLD_PRESETS.map(preset => (
                           <button
                              key={preset.id}
                              onClick={() => handleCreateFromPreset(preset)}
                              disabled={!worldName.trim()}
                              className="flex flex-col text-left p-4 border border-slate-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:bg-transparent"
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

               {activeTab === 'import' && (
                  <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">世界名称</label>
                        <input
                           type="text"
                           value={worldName}
                           onChange={(e) => {
                              setWorldName(e.target.value);
                              setError('');
                           }}
                           className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                           placeholder="输入世界名称..."
                        />
                        {error && (
                           <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                              <span>⚠️</span>
                              <span>{error}</span>
                           </p>
                        )}
                     </div>

                     <div>
                        <p className="text-sm text-slate-500 mb-2">{t('import_text_desc')}</p>
                        <textarea
                           className="w-full h-48 p-4 border rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                           placeholder={t('placeholder_import_text')}
                           value={importText}
                           onChange={e => setImportText(e.target.value)}
                        />
                     </div>

                     <div className="flex justify-end">
                        <button
                           onClick={handleImport}
                           disabled={!worldName.trim()}
                           className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                           {t('action_start_analysis')}
                        </button>
                     </div>
                  </div>
               )}
            </div>
         </div>
      </div>
   );
};
