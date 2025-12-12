import React from 'react';
import { Github, X } from 'lucide-react';
import { useGitHub } from './GitHubContext';

interface GitHubConnectModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const GitHubConnectModal: React.FC<GitHubConnectModalProps> = ({ isOpen, onClose }) => {
    const { login } = useGitHub();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-slate-900/20">
                        <Github className="w-8 h-8 text-white" />
                    </div>

                    <h2 className="text-2xl font-bold text-slate-800 mb-2">连接 GitHub 仓库</h2>
                    <p className="text-slate-500 mb-8 leading-relaxed">
                        为了确保您的世界设定、故事线和 Artifacts 能够安全保存并支持版本回溯，我们需要您连接 GitHub 账号。
                        <br /><br />
                        <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded border border-red-100">
                            未连接状态下无法保存数据
                        </span>
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={login}
                            className="w-full py-3 bg-[#24292F] text-white font-bold rounded-lg hover:bg-slate-700 transition-all flex items-center justify-center gap-2 shadow-lg hover:transform hover:scale-[1.02]"
                        >
                            <Github className="w-5 h-5" />
                            立即连接 GitHub
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-3 text-slate-500 font-bold hover:text-slate-700 transition-colors text-sm"
                        >
                            跳过，稍后设置
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
