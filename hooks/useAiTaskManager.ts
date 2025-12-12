import { useState, useCallback, useEffect } from 'react';
import { AiTask, AiTaskStatus, AiTaskType, AiTaskResult } from '../types/taskTypes';

export const useAiTaskManager = (worldId?: string) => {
    const [tasks, setTasks] = useState<AiTask[]>([]);

    // Init loading specific to world
    useEffect(() => {
        if (!worldId) {
            setTasks([]); // Start fresh for unsaved worlds
            return;
        }
        try {
            const saved = localStorage.getItem(`ecoNarrative_tasks_${worldId}`);
            if (saved) {
                setTasks(JSON.parse(saved));
            } else {
                setTasks([]);
            }
        } catch (e) {
            console.error("Failed to load tasks", e);
            setTasks([]);
        }
    }, [worldId]);

    useEffect(() => {
        if (!worldId) return; // Don't persist unsaved world tasks
        try {
            localStorage.setItem(`ecoNarrative_tasks_${worldId}`, JSON.stringify(tasks));
        } catch (e) {
            console.error("Failed to save tasks", e);
        }
    }, [tasks, worldId]);

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

    const resetTasks = useCallback(() => {
        setTasks([]);
        if (worldId) {
            try {
                localStorage.removeItem(`ecoNarrative_tasks_${worldId}`);
            } catch (e) { console.error(e); }
        }
    }, [worldId]);

    return {
        tasks,
        addTask,
        updateTask,
        completeTask,
        failTask,
        removeTask,
        clearCompleted,
        resetTasks
    };
};
