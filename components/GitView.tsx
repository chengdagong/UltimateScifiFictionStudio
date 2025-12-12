import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { GitBranch, GitCommit, GitPullRequest, History, Play, AlertCircle, CheckCircle } from 'lucide-react';

interface GitChange {
    status: string;
    path: string;
}

interface GitLog {
    hash: string;
    author: string;
    message: string;
    date: string;
}

export const GitView: React.FC = () => {
    const [changes, setChanges] = useState<GitChange[]>([]);
    const [logs, setLogs] = useState<GitLog[]>([]);
    const [commitMessage, setCommitMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isRepo, setIsRepo] = useState(true);

    const fetchStatus = async () => {
        try {
            const res = await axios.get('/api/git/status');
            setChanges(res.data.changes || []);
            setIsRepo(true);
        } catch (err) {
            setIsRepo(false);
        }
    };

    const fetchLog = async () => {
        try {
            const res = await axios.get('/api/git/log');
            setLogs(res.data.logs || []);
        } catch (err) {
            // Ignore if not repo
        }
    };

    const handleInit = async () => {
        setLoading(true);
        try {
            await axios.post('/api/git/init');
            setIsRepo(true);
            fetchStatus();
            fetchLog();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Init failed');
        } finally {
            setLoading(false);
        }
    };

    const handleCommit = async () => {
        if (!commitMessage) return;
        setLoading(true);
        try {
            await axios.post('/api/git/commit', { message: commitMessage });
            setCommitMessage('');
            fetchStatus();
            fetchLog();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Commit failed');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        fetchLog();
    }, []);

    if (!isRepo) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <GitBranch className="w-16 h-16 mb-4 text-slate-300" />
                <h3 className="text-xl font-bold text-slate-700">Not a Git Repository</h3>
                <p className="mb-6">Initialize a local Git repository to track your world building progress.</p>
                <button
                    onClick={handleInit}
                    disabled={loading}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold"
                >
                    {loading ? 'Initializing...' : 'Initialize Repository'}
                </button>
            </div>
        );
    }

    return (
        <div className="flex h-full gap-6">
            {/* Changes Column */}
            <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2 text-slate-700">
                        <GitPullRequest className="w-4 h-4" />
                        Changes
                    </h3>
                    <button onClick={fetchStatus} className="text-xs text-indigo-600 hover:underline">Refresh</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                    {changes.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-sm">No changes detected</div>
                    ) : (
                        <div className="space-y-2">
                            {changes.map((c, i) => (
                                <div key={i} className="flex items-center gap-3 text-sm p-2 bg-slate-50 rounded border border-slate-100">
                                    <span className={`font-mono font-bold w-6 text-center ${c.status === 'M' ? 'text-yellow-600' : c.status === '??' ? 'text-green-600' : 'text-blue-600'}`}>
                                        {c.status}
                                    </span>
                                    <span className="truncate flex-1">{c.path}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50">
                    <textarea
                        className="w-full p-2 border rounded-lg text-sm mb-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        rows={3}
                        placeholder="Commit message..."
                        value={commitMessage}
                        onChange={e => setCommitMessage(e.target.value)}
                    />
                    {error && <div className="text-xs text-red-500 mb-2">{error}</div>}
                    <button
                        onClick={handleCommit}
                        disabled={loading || changes.length === 0 || !commitMessage}
                        className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        {loading ? 'Committing...' : <><GitCommit className="w-4 h-4" /> Commit Changes</>}
                    </button>
                </div>
            </div>

            {/* History Column */}
            <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2 text-slate-700">
                        <History className="w-4 h-4" />
                        History
                    </h3>
                    <button onClick={fetchLog} className="text-xs text-indigo-600 hover:underline">Refresh</button>
                </div>
                <div className="flex-1 overflow-y-auto p-0">
                    {logs.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-sm">No commit history</div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {logs.map((log) => (
                                <div key={log.hash} className="p-4 hover:bg-slate-50">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-slate-800 text-sm">{log.message}</span>
                                        <span className="text-xs font-mono text-slate-400">{log.hash}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-slate-500">
                                        <span>{log.author}</span>
                                        <span>{new Date(log.date).toLocaleString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
