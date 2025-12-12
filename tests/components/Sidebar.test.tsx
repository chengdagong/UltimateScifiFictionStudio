import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '../../components/Sidebar';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';

describe('Sidebar', () => {
   const defaultProps = {
      activeTab: 'participants' as const,
      setActiveTab: vi.fn(),
      isMobileMenuOpen: false,
      setIsMobileMenuOpen: vi.fn(),
      isMinimalUI: false,
      toggleMinimalUI: vi.fn(),
      onNewWorld: vi.fn(),
      onSaveWorld: vi.fn(),
      onLoadWorld: vi.fn(),
      onSync: vi.fn(),
      isSyncing: false,
      onSettings: vi.fn(),
      onToggleLanguage: vi.fn(),
      runningTasksCount: 0,
      completedTasksCount: 0
   };

   const renderSidebar = (props = {}) => {
      return render(
         <I18nextProvider i18n={i18n}>
            <Sidebar {...defaultProps} {...props} />
         </I18nextProvider>
      );
   };

   it('should render sidebar with app name', () => {
      renderSidebar();
      expect(screen.getByText(/app_name/i)).toBeInTheDocument();
   });

   it('should render new world button', () => {
      renderSidebar();
      const newWorldButton = screen.getByRole('button', { name: /new_world/i });
      expect(newWorldButton).toBeInTheDocument();
   });

   it('should call onNewWorld when new world button is clicked', () => {
      const onNewWorld = vi.fn();
      renderSidebar({ onNewWorld });
      
      const newWorldButton = screen.getByRole('button', { name: /new_world/i });
      fireEvent.click(newWorldButton);
      
      expect(onNewWorld).toHaveBeenCalledTimes(1);
   });

   it('should render all navigation tabs', () => {
      renderSidebar();
      
      expect(screen.getByText(/nav_tasks/i)).toBeInTheDocument();
      expect(screen.getByText(/nav_brainstorm/i)).toBeInTheDocument();
      expect(screen.getByText(/nav_participants/i)).toBeInTheDocument();
      expect(screen.getByText(/nav_characters/i)).toBeInTheDocument();
      expect(screen.getByText(/nav_timeline/i)).toBeInTheDocument();
      expect(screen.getByText(/nav_techtree/i)).toBeInTheDocument();
      expect(screen.getByText(/nav_chronicle/i)).toBeInTheDocument();
      expect(screen.getByText(/nav_story_engine/i)).toBeInTheDocument();
   });

   it('should highlight active tab', () => {
      renderSidebar({ activeTab: 'tasks' });
      
      const tasksButton = screen.getByRole('button', { name: /nav_tasks/i });
      expect(tasksButton).toHaveClass('bg-indigo-600/10', 'text-indigo-400');
   });

   it('should call setActiveTab when tab is clicked', () => {
      const setActiveTab = vi.fn();
      renderSidebar({ setActiveTab });
      
      const tasksButton = screen.getByRole('button', { name: /nav_tasks/i });
      fireEvent.click(tasksButton);
      
      expect(setActiveTab).toHaveBeenCalledWith('tasks');
   });

   it('should show running tasks badge when tasks are running', () => {
      renderSidebar({ runningTasksCount: 2 });
      
      expect(screen.getByText(/status_running/i)).toBeInTheDocument();
   });

   it('should show completed tasks count', () => {
      renderSidebar({ completedTasksCount: 5 });
      
      expect(screen.getByText('5')).toBeInTheDocument();
   });

   it('should render data section with save/load/sync buttons', () => {
      renderSidebar();
      
      expect(screen.getByText(/action_save_world/i)).toBeInTheDocument();
      expect(screen.getByText(/action_load_world/i)).toBeInTheDocument();
      expect(screen.getByText(/action_sync/i)).toBeInTheDocument();
   });

   it('should call onSaveWorld when save button is clicked', () => {
      const onSaveWorld = vi.fn();
      renderSidebar({ onSaveWorld });
      
      const saveButton = screen.getByRole('button', { name: /action_save_world/i });
      fireEvent.click(saveButton);
      
      expect(onSaveWorld).toHaveBeenCalledTimes(1);
   });

   it('should call onLoadWorld when load button is clicked', () => {
      const onLoadWorld = vi.fn();
      renderSidebar({ onLoadWorld });
      
      const loadButton = screen.getByRole('button', { name: /action_load_world/i });
      fireEvent.click(loadButton);
      
      expect(onLoadWorld).toHaveBeenCalledTimes(1);
   });

   it('should call onSync when sync button is clicked', () => {
      const onSync = vi.fn();
      renderSidebar({ onSync });
      
      const syncButton = screen.getByRole('button', { name: /action_sync/i });
      fireEvent.click(syncButton);
      
      expect(onSync).toHaveBeenCalledTimes(1);
   });

   it('should disable sync button when syncing', () => {
      renderSidebar({ isSyncing: true });
      
      const syncButton = screen.getByRole('button', { name: /action_sync/i });
      expect(syncButton).toBeDisabled();
   });

   it('should render settings and language toggle buttons', () => {
      renderSidebar();
      
      expect(screen.getByRole('button', { name: /action_settings/i })).toBeInTheDocument();
   });

   it('should call onSettings when settings button is clicked', () => {
      const onSettings = vi.fn();
      renderSidebar({ onSettings });
      
      const settingsButton = screen.getByRole('button', { name: /action_settings/i });
      fireEvent.click(settingsButton);
      
      expect(onSettings).toHaveBeenCalledTimes(1);
   });

   it('should call toggleMinimalUI when collapse button is clicked', () => {
      const toggleMinimalUI = vi.fn();
      renderSidebar({ toggleMinimalUI });
      
      const collapseButton = screen.getByRole('button', { name: /action_collapse_sidebar/i });
      fireEvent.click(collapseButton);
      
      expect(toggleMinimalUI).toHaveBeenCalledTimes(1);
   });

   it('should render minimal UI when isMinimalUI is true', () => {
      renderSidebar({ isMinimalUI: true });
      
      // In minimal UI, text labels are hidden, only icons shown
      // Check that the sidebar has minimal width class
      const sidebar = screen.getByRole('navigation');
      expect(sidebar).toHaveClass('w-20');
   });

   it('should close mobile menu when tab is clicked', () => {
      const setIsMobileMenuOpen = vi.fn();
      renderSidebar({ isMobileMenuOpen: true, setIsMobileMenuOpen });
      
      const tasksButton = screen.getByRole('button', { name: /nav_tasks/i });
      fireEvent.click(tasksButton);
      
      expect(setIsMobileMenuOpen).toHaveBeenCalledWith(false);
   });
});
