import React from 'react';
import { Github, AlertCircle, CheckCircle2, Wifi, WifiOff } from 'lucide-react';
import { useGitHub } from './GitHubContext';

interface StatusBarProps {
    isOnline?: boolean;
    onBranchClick?: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({ isOnline = true, onBranchClick }) => {
    const { user, login, logout, isLoading, currentRepo, currentBranch } = useGitHub();
    const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);

    const handleLogoutClick = () => {
        setShowLogoutConfirm(true);
    };

    const confirmLogout = () => {
        logout();
        setShowLogoutConfirm(false);
    };

    return (
        <>
            <div className="h-8 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-4 text-xs select-none shrink-0 z-50 relative">
                <div className="flex items-center gap-4 text-slate-400">
                    <div className="flex items-center gap-1.5 hover:text-slate-200 transition-colors cursor-help" title="System Status">
                        {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5 text-red-500" />}
                        <span>{isOnline ? "System Online" : "Offline"}</span>
                    </div>
                    <span>v1.0.0</span>
                </div>

                <div className="flex items-center gap-4">
                    {isLoading ? (
                        <span className="text-slate-500">Checking GitHub status...</span>
                    ) : user ? (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onBranchClick}
                                className="flex items-center gap-1.5 text-green-400 font-medium hover:text-green-300 transition-colors group"
                                title="Manage Branches"
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <Github className="w-3.5 h-3.5" />
                                <div className="flex items-center gap-1">
                                    <span>{user.login}</span>
                                    {currentRepo && (
                                        <>
                                            <span className="text-slate-600">/</span>
                                            <span className="font-bold underline decoration-dotted underline-offset-2 group-hover:text-white transition-colors">
                                                {currentRepo}
                                            </span>
                                            <span className="text-slate-500 ml-1 font-mono bg-slate-800 px-1.5 rounded text-[10px]">
                                                {currentBranch || 'main'}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </button>

                            <div className="h-3 w-px bg-slate-700 mx-1"></div>

                            <button
                                onClick={handleLogoutClick}
                                className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                                title="Disconnect"
                            >
                                Disconnect
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={login}
                            className="flex items-center gap-1.5 text-red-400 hover:text-red-300 transition-colors font-medium animate-pulse hover:animate-none"
                            title="Click to Connect GitHub"
                        >
                            <AlertCircle className="w-3.5 h-3.5" />
                            <Github className="w-3.5 h-3.5" />
                            <span>GitHub Not Connected</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-80 transform transition-all scale-100">
                        <h3 className="text-lg font-bold text-slate-800 mb-2">断开连接？</h3>
                        <p className="text-slate-500 text-sm mb-6">
                            通常情况下无需登出 GitHub。断开连接后，您将无法保存世界数据到云端。
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={confirmLogout}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                确认断开
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
