import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * Toast notification interface
 */
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number; // ms, default 3000
}

/**
 * AppState interface for managing application-level UI state
 */
interface AppState {
  // State
  currentWorldId: string | null;
  activeTab: string;
  sidebarCollapsed: boolean;
  toasts: Toast[];

  // Actions
  setCurrentWorldId: (id: string | null) => void;
  setActiveTab: (tab: string) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

/**
 * Store for managing application UI state and context
 */
export const useAppStore = create<AppState>()(
  devtools(
    (set) => ({
      // Initial State
      currentWorldId: null,
      activeTab: 'participants',
      sidebarCollapsed: false,
      toasts: [],

      // Actions
      setCurrentWorldId: (id) => set({ currentWorldId: id }),
      
      setActiveTab: (tab) => set({ activeTab: tab }),
      
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      
      addToast: (toast) => {
        const id = crypto.randomUUID();
        const duration = toast.duration || 3000;
        const newToast = { ...toast, id, duration };
        
        set((state) => ({ toasts: [...state.toasts, newToast] }));

        // Auto remove after duration
        setTimeout(() => {
          set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id)
          }));
        }, duration);
      },
      
      removeToast: (id) => set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      })),
    }),
    { name: 'AppStore' }
  )
);
