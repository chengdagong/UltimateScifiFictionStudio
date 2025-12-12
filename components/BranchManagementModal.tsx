import React, { useState, useEffect } from 'react';
import { GitBranch, Plus, Search, Check, Loader2, RefreshCw, GitCommit } from 'lucide-react';
import { useGitHub } from './GitHubContext';

interface BranchManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const BranchManagementModal: React.FC<BranchManagementModalProps> = ({ isOpen, onClose }) => {
    const { user, currentRepo, currentBranch, listBranches, createBranch, switchBranch } = useGitHub();
    const [branches, setBranches] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // New Branch Form
    const [newBranchName, setNewBranchName] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadBranches();
            setNewBranchName("");
            setCreateError(null);
        }
    }, [isOpen]);

    const loadBranches = async () => {
        setIsLoading(true);
        try {
            const data = await listBranches();
            setBranches(data);
        } catch (error) {
            console.error("Failed to load branches", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSwitch = (branchName: string) => {
        switchBranch(branchName);
        onClose();
    };

    const handleCreate = async () => {
        if (!newBranchName) return;
        setIsCreating(true);
        setCreateError(null);
        try {
            await createBranch(newBranchName);
            onClose();
        } catch (error: any) {
            console.error("Failed to create branch", error);
            setCreateError(error.message || "Failed to create branch");
        } finally {
            setIsCreating(false);
        }
    };

    if (!isOpen) return null;

    const filteredBranches = branches.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">

                {/* Header */}
                <div className="p-5 border-b border-slate-100 bg-slate-50">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <GitBranch className="w-5 h-5 text-indigo-600" />
                        分支管理
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                        仓库: <span className="font-mono text-slate-700">{user?.login}/{currentRepo}</span>
                    </p>
                </div>

                {/* Create New Branch Section */}
                <div className="p-5 bg-white border-b border-slate-100">
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">新建分支 (基于当前 {currentBranch})</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newBranchName}
                            onChange={e => setNewBranchName(e.target.value.replace(/\s+/g, '-'))}
                            placeholder="feature/new-plot"
                            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                        />
                        <button
                            onClick={handleCreate}
                            disabled={isCreating || !newBranchName}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                        >
                            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            创建
                        </button>
                    </div>
                    {createError && (
                        <p className="text-xs text-red-500 mt-2">{createError}</p>
                    )}
                </div>

                {/* Branch List */}
                <div className="flex-1 overflow-y-auto bg-slate-50/50 flex flex-col min-h-[300px]">
                    <div className="p-3 sticky top-0 bg-white/90 backdrop-blur border-b border-slate-100 z-10">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="搜索分支..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded text-sm bg-slate-50 focus:border-indigo-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center flex-1 text-slate-400 gap-2 py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                            <span className="text-xs">加载分支列表...</span>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filteredBranches.map(branch => {
                                const isCurrent = currentBranch === branch.name;
                                return (
                                    <button
                                        key={branch.name}
                                        onClick={() => handleSwitch(branch.name)}
                                        disabled={isCurrent}
                                        className={`w-full text-left px-5 py-3 hover:bg-white transition-colors flex items-center justify-between group ${isCurrent ? 'bg-indigo-50/50 cursor-default' : ''}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <GitCommit className={`w-4 h-4 ${isCurrent ? 'text-indigo-600' : 'text-slate-400'}`} />
                                            <div>
                                                <div className={`font-mono text-sm ${isCurrent ? 'font-bold text-indigo-700' : 'text-slate-700'}`}>
                                                    {branch.name}
                                                </div>
                                            </div>
                                        </div>
                                        {isCurrent && (
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-white border border-indigo-100 px-2 py-0.5 rounded-full shadow-sm">
                                                <Check className="w-3 h-3" />
                                                CURRENT
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm transition-colors">
                        关闭
                    </button>
                </div>
            </div>
        </div>
    );
};
