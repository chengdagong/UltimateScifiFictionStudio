import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, FolderOpen, Loader2, LogOut } from 'lucide-react';
import axios from 'axios';
import { getAvatarByUsername } from '../constants/avatars';
import { FRAMEWORKS } from '../constants/frameworks';
import { WorldData } from '../types';

interface WelcomeModalProps {
   isAuthenticated: boolean;
   user: string | null;
   onLogin: (username: string, token: string) => void;
   onLogout: () => void;
   onNewWorld: () => void;
   onLoadWorld: (world: WorldData) => void;
   savedWorlds: WorldData[];
   isLoadingWorlds: boolean;
   onLoadWorldList: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
   isAuthenticated,
   user,
   onLogin,
   onLogout,
   onNewWorld,
   onLoadWorld,
   savedWorlds,
   isLoadingWorlds,
   onLoadWorldList
}) => {
   const { t } = useTranslation();
   const [isRegister, setIsRegister] = useState(false);
   const [loginUsername, setLoginUsername] = useState('');
   const [loginPassword, setLoginPassword] = useState('');
   const [loginError, setLoginError] = useState('');

   const handleLoginSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoginError('');

      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';

      try {
         const response = await axios.post(endpoint, { username: loginUsername, password: loginPassword });
         if (isRegister) {
            setIsRegister(false);
            setLoginError('注册成功，请登录');
            setLoginPassword('');
         } else {
            const { token, username: user } = response.data;
            onLogin(user, token);
            onLoadWorldList();
         }
      } catch (err: any) {
         setLoginError(err.response?.data?.error || '操作失败，请重试');
      }
   };

   return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900 text-white p-6">
         <div className="max-w-lg w-full space-y-6 animate-fadeIn max-h-[90vh] overflow-y-auto">
            {!isAuthenticated ? (
               /* Login Form */
               <>
                  <div className="text-center">
                     <div className="w-20 h-20 bg-indigo-500 rounded-2xl mx-auto flex items-center justify-center shadow-2xl shadow-indigo-500/50 mb-6">
                        <span className="font-serif text-5xl font-bold">E</span>
                     </div>
                     <div>
                        <h1 className="text-4xl font-serif font-bold mb-2">{t('welcome_title')}</h1>
                        <p className="text-slate-400 text-lg">{t('welcome_subtitle')}</p>
                     </div>
                  </div>

                  <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                     <h3 className="text-lg font-bold mb-4 text-center">
                        {isRegister ? '注册账号' : '登录账号'}
                     </h3>

                     {loginError && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg mb-4 text-sm">
                           {loginError}
                        </div>
                     )}

                     <form onSubmit={handleLoginSubmit} className="space-y-4">
                        <div>
                           <label className="block text-sm font-medium text-slate-300 mb-2">
                              用户名
                           </label>
                           <input
                              type="text"
                              value={loginUsername}
                              onChange={e => setLoginUsername(e.target.value)}
                              required
                              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-white"
                              placeholder="请输入用户名"
                           />
                        </div>

                        <div>
                           <label className="block text-sm font-medium text-slate-300 mb-2">
                              密码
                           </label>
                           <input
                              type="password"
                              value={loginPassword}
                              onChange={e => setLoginPassword(e.target.value)}
                              required
                              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-white"
                              placeholder="请输入密码"
                           />
                        </div>

                        <button
                           type="submit"
                           className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-lg transition-all shadow-lg"
                        >
                           {isRegister ? '注册' : '登录'}
                        </button>
                     </form>

                     <div className="mt-4 text-center text-sm text-slate-400">
                        {isRegister ? '已有账号？' : '没有账号？'}
                        <button
                           onClick={() => {
                              setIsRegister(!isRegister);
                              setLoginError('');
                              setLoginPassword('');
                           }}
                           className="ml-2 text-indigo-400 hover:text-indigo-300 font-medium"
                        >
                           {isRegister ? '去登录' : '去注册'}
                        </button>
                     </div>
                  </div>

                  <p className="text-xs text-slate-600 text-center">{t('welcome_version')}</p>
               </>
            ) : (
               /* Logged In View */
               <>
                  <div className="text-center">
                     {/* User Avatar */}
                     {(() => {
                        const avatar = getAvatarByUsername(user || '');
                        const AvatarIcon = avatar.icon;
                        return (
                           <div className={`w-20 h-20 ${avatar.bg} rounded-2xl mx-auto flex items-center justify-center shadow-2xl shadow-indigo-500/50 mb-4`}>
                              <AvatarIcon className="w-10 h-10 text-white" />
                           </div>
                        );
                     })()}
                     <div>
                        <h1 className="text-2xl font-bold mb-1">欢迎回来, {user}</h1>
                        <p className="text-slate-400 text-sm">{getAvatarByUsername(user || '').label}</p>
                     </div>
                  </div>

                  {/* New World Button with Logout */}
                  <div className="flex gap-2">
                     <button
                        onClick={onNewWorld}
                        className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-600/50"
                     >
                        <Sparkles className="w-6 h-6" />
                        <span>{t('new_world')}</span>
                     </button>
                     <button
                        onClick={() => {
                           onLogout();
                           setLoginUsername('');
                           setLoginPassword('');
                        }}
                        className="px-4 py-4 bg-slate-800/50 hover:bg-slate-700/70 text-slate-300 hover:text-red-400 rounded-xl font-medium transition-all border border-slate-700 hover:border-red-500/50"
                        title="退出登录"
                     >
                        <LogOut className="w-5 h-5" />
                     </button>
                  </div>

                  {/* Existing Projects Section */}
                  <div className="mt-6">
                     <div className="flex items-center gap-2 mb-4">
                        <div className="h-px flex-1 bg-slate-700"></div>
                        <span className="text-sm text-slate-400 uppercase tracking-wider font-bold">已有项目</span>
                        <div className="h-px flex-1 bg-slate-700"></div>
                     </div>

                     {isLoadingWorlds ? (
                        <div className="flex justify-center py-8">
                           <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                        </div>
                     ) : savedWorlds.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 bg-slate-800/50 rounded-xl border border-slate-700">
                           <p className="text-sm">{t('empty_no_saves')}</p>
                           <p className="text-xs mt-2 text-slate-600">点击上方按钮创建你的第一个世界</p>
                        </div>
                     ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                           {[...savedWorlds].sort((a, b) => b.lastModified - a.lastModified).map(w => (
                              <button
                                 key={w.id}
                                 onClick={() => onLoadWorld(w)}
                                 className="w-full text-left p-4 bg-slate-800/50 hover:bg-slate-700/70 rounded-xl border border-slate-700 hover:border-indigo-500 transition-all group"
                              >
                                 <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                       <div className="font-bold text-white group-hover:text-indigo-300 transition-colors">{w.name}</div>
                                       <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                                          <span>{FRAMEWORKS[w.frameworkId || 'general']?.name || t('framework_unknown')}</span>
                                          <span>•</span>
                                          <span>最后访问: {new Date(w.lastModified).toLocaleString('zh-CN', {
                                             year: 'numeric',
                                             month: '2-digit',
                                             day: '2-digit',
                                             hour: '2-digit',
                                             minute: '2-digit'
                                          })}</span>
                                       </div>
                                    </div>
                                    <FolderOpen className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                                 </div>
                              </button>
                           ))}
                        </div>
                     )}
                  </div>

                  <p className="text-xs text-slate-600 text-center mt-6">{t('welcome_version')}</p>
               </>
            )}
         </div>
      </div>
   );
};
