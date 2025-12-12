import React from 'react';
import { AiTask, AiTaskStatus, AiTaskResult } from '../types/taskTypes';
import { SocialEntity } from '../types';
import { X, ListTodo, Loader2, CheckCircle2, AlertCircle, Clock, Trash2, ArrowRight, Play } from 'lucide-react';

interface TaskListDialogProps {
    isOpen: boolean;
    onClose: () => void;
    tasks: AiTask[];
    onClearCompleted: () => void;
    onRemoveTask: (id: string) => void;
    // Actions for analysis results
    onAddEntities: (entities: SocialEntity[]) => void;
    onDiscardEntities: (ids: Set<string>) => void; // Actually checks IDs
}

const TaskListDialog: React.FC<TaskListDialogProps> = ({
    isOpen, onClose, tasks, onClearCompleted, onRemoveTask, onAddEntities, onDiscardEntities
}) => {
    if (!isOpen) return null;

    const getStatusIcon = (status: AiTaskStatus) => {
        switch (status) {
            case 'running': return <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />;
            case 'completed': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            case 'failed': return <AlertCircle className="w-5 h-5 text-red-500" />;
            case 'paused': return <Play className="w-5 h-5 text-amber-500" />;
            default: return <Clock className="w-5 h-5 text-slate-400" />;
        }
    };

    const handleAction = (task: AiTask) => {
        if (task.type === 'analysis' && task.status === 'completed' && task.result?.data) {
            // If it's entities, we just add them all for now (simplification for "one-click collect")
            // Or better, alerting user "This adds all".
            const entities = task.result.data as SocialEntity[];
            onAddEntities(entities);
            onRemoveTask(task.id);
        } else {
            console.log("No specific action for this task type yet.", task);
        }
    };

    // Sort: Running first, then recent
    const sortedTasks = [...tasks].sort((a, b) => {
        if (a.status === 'running' && b.status !== 'running') return -1;
        if (a.status !== 'running' && b.status === 'running') return 1;
        return b.createdAt - a.createdAt;
    });

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-2 text-slate-800">
                        <ListTodo className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-bold">AI 任务队列 ({tasks.length})</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {tasks.some(t => t.status === 'completed' || t.status === 'failed') && (
                            <button
                                onClick={onClearCompleted}
                                className="text-xs text-slate-500 hover:text-indigo-600 px-2 py-1 hover:bg-slate-100 rounded"
                            >
                                清除已完成
                            </button>
                        )}
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200/50 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Task List */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-3">
                    {sortedTasks.length === 0 && (
                        <div className="text-center py-12 text-slate-400">
                            <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>暂时没有任务</p>
                        </div>
                    )}

                    {sortedTasks.map(task => (
                        <div key={task.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    {getStatusIcon(task.status)}
                                    <h4 className="font-bold text-slate-800">{task.name}</h4>
                                </div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                    {task.type}
                                </span>
                            </div>

                            <p className="text-sm text-slate-600 mb-3">{task.description}</p>

                            {/* Progress Bar */}
                            {task.status === 'running' && (
                                <div className="w-full bg-slate-100 rounded-full h-1.5 mb-3 overflow-hidden">
                                    <div
                                        className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
                                        style={{ width: `${task.progress || 5}%` }}
                                    ></div>
                                </div>
                            )}

                            {/* Result Area */}
                            {task.status === 'completed' && task.result?.summary && (
                                <div className="bg-green-50 text-green-800 text-xs p-2 rounded mb-3 border border-green-100">
                                    {task.result.summary}
                                </div>
                            )}

                            {task.status === 'failed' && task.result?.error && (
                                <div className="bg-red-50 text-red-800 text-xs p-2 rounded mb-3 border border-red-100">
                                    Error: {task.result.error}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-slate-50">
                                <button
                                    onClick={() => onRemoveTask(task.id)}
                                    className="text-slate-400 hover:text-red-500 p-1.5 rounded hover:bg-red-50 transition-colors"
                                    title="删除任务"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>

                                {task.type === 'analysis' && task.status === 'completed' && (
                                    <button
                                        onClick={() => handleAction(task)}
                                        className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-md font-bold hover:bg-indigo-100 transition-colors"
                                    >
                                        <span>收取实体</span>
                                        <ArrowRight className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TaskListDialog;
