import { useState, useCallback, useEffect } from 'react';
import { AiTask, AiTaskStatus, AiTaskType, AiTaskResult } from '../types/taskTypes';

export const useAiTaskManager = () => {
    const [tasks, setTasks] = useState<AiTask[]>(() => {
        try {
            const saved = localStorage.getItem('ecoNarrative_tasks');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Failed to load tasks", e);
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('ecoNarrative_tasks', JSON.stringify(tasks));
        } catch (e) {
            console.error("Failed to save tasks", e);
        }
    }, [tasks]);

    const addTask = useCallback((
        type: AiTaskType,
        name: string,
        description: string,
        sourceId?: string,
        metadata?: any
    ): string => {
        const id = crypto.randomUUID();
        const newTask: AiTask = {
            id,
            type,
            status: 'pending',
            name,
            description,
            progress: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            sourceId,
            metadata
        };
        setTasks(prev => [newTask, ...prev]);
        return id;
    }, []);

    const updateTask = useCallback((id: string, updates: Partial<AiTask>) => {
        setTasks(prev => prev.map(t =>
            t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
        ));
    }, []);

    const completeTask = useCallback((id: string, result: AiTaskResult) => {
        setTasks(prev => prev.map(t =>
            t.id === id ? {
                ...t,
                status: 'completed',
                progress: 100,
                result,
                updatedAt: Date.now()
            } : t
        ));
    }, []);

    const failTask = useCallback((id: string, error: string) => {
        setTasks(prev => prev.map(t =>
            t.id === id ? {
                ...t,
                status: 'failed',
                result: { error },
                updatedAt: Date.now()
            } : t
        ));
    }, []);

    const removeTask = useCallback((id: string) => {
        setTasks(prev => prev.filter(t => t.id !== id));
    }, []);

    const clearCompleted = useCallback(() => {
        setTasks(prev => prev.filter(t => t.status !== 'completed' && t.status !== 'failed'));
    }, []);

    return {
        tasks,
        addTask,
        updateTask,
        completeTask,
        failTask,
        removeTask,
        clearCompleted
    };
};
