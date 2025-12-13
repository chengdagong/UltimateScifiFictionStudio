import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { AiTask } from '../types/taskTypes';

/**
 * TaskState interface for managing AI task state
 */
interface TaskState {
  // State
  tasks: AiTask[];
  isProcessing: boolean;
  currentTask: AiTask | null;

  // Actions
  addTask: (task: Omit<AiTask, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'progress'>) => string;
  updateTask: (id: string, updates: Partial<AiTask>) => void;
  removeTask: (id: string) => void;
  setTasks: (tasks: AiTask[]) => void;
  clearCompletedTasks: () => void;
  setCurrentTask: (task: AiTask | null) => void;
  setProcessing: (isProcessing: boolean) => void;
}

/**
 * Store for managing AI background tasks
 */
export const useTaskStore = create<TaskState>()(
  devtools(
    (set) => ({
      // Initial State
      tasks: [],
      isProcessing: false,
      currentTask: null,

      // Actions
      addTask: (taskData) => {
        const id = crypto.randomUUID();
        const now = Date.now();
        const newTask: AiTask = {
          ...taskData,
          id,
          status: 'pending',
          progress: 0,
          createdAt: now,
          updatedAt: now,
        };
        
        set((state) => ({ tasks: [newTask, ...state.tasks] }));
        return id;
      },

      updateTask: (id, updates) => set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
        )
      })),

      removeTask: (id) => set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id)
      })),

      setTasks: (tasks) => set({ tasks }),

      clearCompletedTasks: () => set((state) => ({
        tasks: state.tasks.filter((t) => t.status !== 'completed' && t.status !== 'failed')
      })),

      setCurrentTask: (task) => set({ currentTask: task }),

      setProcessing: (isProcessing) => set({ isProcessing }),
    }),
    { name: 'TaskStore' }
  )
);
