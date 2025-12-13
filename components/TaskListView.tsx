import React from 'react';
import { AiTaskStatus } from '../types/taskTypes';
import { SocialEntity } from '../types';
import { ListTodo, Loader2, CheckCircle2, AlertCircle, Clock, Trash2, ArrowRight, Play } from 'lucide-react';
import TaskResultViewer from './TaskResultViewer';
import { useTaskStore } from '../stores/taskStore';

interface TaskListViewProps {
    onAddEntities: (taskId: string, entities: SocialEntity[]) => void;
}

const TaskListView: React.FC<TaskListViewProps> = ({ onAddEntities }) => {
    const { tasks, removeTask: onRemoveTask, clearCompletedTasks: onClearCompleted, updateTask: onUpdateTask } = useTaskStore();

    // Debug logging
    // console.log("TaskListView Rendered. Total Tasks:", tasks.length);

    // Sort tasks: Running first, then Pending, then Completed/Failed. Newest first within status.
    const sortedTasks = [...tasks].sort((a, b) => {
        const getScore = (status: AiTaskStatus) => {
            if (status === 'running') return 3;
            if (status === 'pending') return 2;
            if (status === 'paused') return 1;
            return 0; // completed/failed
        };

        const scoreA = getScore(a.status);
        const scoreB = getScore(b.status);

        if (scoreA !== scoreB) return scoreB - scoreA;
        return b.createdAt - a.createdAt;
    });

    const getStatusIcon = (status: AiTaskStatus) => {
        switch (status) {
            case 'running': return <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />;
            case 'completed': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            case 'failed': return <AlertCircle className="w-5 h-5 text-red-500" />;
            case 'pending': return <Clock className="w-5 h-5 text-slate-400" />;
            case 'paused': return <Play className="w-5 h-5 text-amber-500" />;
        }
    };

    const getStatusText = (status: AiTaskStatus) => {
        switch (status) {
            case 'running': return '进行中';
            case 'completed': return '已完成';
            case 'failed': return '失败';
            case 'pending': return '等待中';
            case 'paused': return '暂停';
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50/50">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                        <ListTodo className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-serif font-bold text-slate-800">AI 任务列表</h2>
                        <p className="text-xs text-slate-500">追踪所有后台生成、分析与推演进程</p>
                    </div>
                </div>

                {tasks.some(t => t.status === 'completed' || t.status === 'failed') && (
                    <button
                        onClick={onClearCompleted}
                        className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-white transition-colors border border-transparent hover:border-slate-200"
                    >
                        <Trash2 className="w-4 h-4" />
                        清除已完成
                    </button>
                )}
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto p-1">
                {sortedTasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <Clock className="w-10 h-10 opacity-40" />
                        </div>
                        <h3 className="font-bold text-lg text-slate-500">暂无任务</h3>
                        <p className="text-sm max-w-xs text-center mt-2">当你执行文本分析、头脑风暴或生成内容时，任务会显示在这里。</p>
                    </div>
                )}

                <div className="max-w-4xl mx-auto space-y-4">
                    {sortedTasks.map(task => (
                        <div key={task.id} className={`
                            bg-white p-5 rounded-xl border shadow-sm transition-all
                            ${task.status === 'running' ? 'border-indigo-500 shadow-indigo-100 ring-1 ring-indigo-500/20' : 'border-slate-200 hover:border-indigo-200'}
                        `}>
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-start gap-4">
                                    <div className="mt-1">{getStatusIcon(task.status)}</div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-slate-800 text-lg">{task.name}</h4>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider
                                                ${task.status === 'running' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}
                                            `}>
                                                {getStatusText(task.status)}
                                            </span>
                                            <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full tracking-wider uppercase">
                                                {task.type}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 mt-1">{task.description}</p>

                                        {/* Progress Bar */}
                                        {task.status === 'running' && (
                                            <div className="mt-3 w-64">
                                                <div className="flex justify-between text-xs text-slate-500 mb-1">
                                                    <span>处理中...</span>
                                                    <span>{task.progress}%</span>
                                                </div>
                                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-indigo-500 rounded-full transition-all duration-500 ease-out"
                                                        style={{ width: `${task.progress}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                                            <span>ID: {task.id.slice(0, 8)}</span>
                                            <span>Started: {new Date(task.createdAt).toLocaleTimeString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => onRemoveTask(task.id)}
                                    className="text-slate-300 hover:text-red-500 transition-colors p-2"
                                    title="移除任务"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Result Area */}
                            {task.result && (
                                <div className="ml-11 mt-3 p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm">
                                    {task.result.summary && <p className="font-bold text-slate-700 mb-2">{task.result.summary}</p>}
                                    {task.result.error && <p className="text-red-600 mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {task.result.error}</p>}

                                    {/* Action Buttons based on context */}
                                    {task.type === 'analysis' && task.result.data && (
                                        <TaskResultViewer
                                            entities={task.result.data as SocialEntity[]}
                                            onConfirm={(selectedEntities) => onAddEntities(task.id, selectedEntities)}
                                            onUpdateEntities={(newEntities) => {
                                                onUpdateTask(task.id, {
                                                    result: { ...task.result, data: newEntities }
                                                });
                                            }}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TaskListView;
