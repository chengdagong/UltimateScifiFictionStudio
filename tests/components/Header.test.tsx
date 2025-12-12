import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '../../components/Header';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';

describe('Header', () => {
   const defaultProps = {
      worldName: 'Test World',
      entitiesCount: 10,
      chaptersCount: 5,
      isAutoSaving: false,
      lastAutoSaveTime: Date.now(),
      isSyncing: false,
      onSync: vi.fn(),
      user: 'testuser',
      onLogout: vi.fn()
   };

   const renderHeader = (props = {}) => {
      return render(
         <I18nextProvider i18n={i18n}>
            <Header {...defaultProps} {...props} />
         </I18nextProvider>
      );
   };

   it('should render world name', () => {
      renderHeader();
      expect(screen.getByText('Test World')).toBeInTheDocument();
   });

   it('should render entities count', () => {
      renderHeader();
      expect(screen.getByText(/10.*label_entities/i)).toBeInTheDocument();
   });

   it('should render chapters count', () => {
      renderHeader();
      expect(screen.getByText(/5.*label_chapters/i)).toBeInTheDocument();
   });

   it('should show auto-saving indicator when auto-saving', () => {
      renderHeader({ isAutoSaving: true });
      expect(screen.getByText(/status_saving_local/i)).toBeInTheDocument();
   });

   it('should show backup status when not auto-saving', () => {
      renderHeader({ isAutoSaving: false });
      expect(screen.getByText(/status_local_backup/i)).toBeInTheDocument();
   });

   it('should render sync button', () => {
      renderHeader();
      const syncButton = screen.getByRole('button', { name: /action_refresh_status/i });
      expect(syncButton).toBeInTheDocument();
   });

   it('should call onSync when sync button is clicked', () => {
      const onSync = vi.fn();
      renderHeader({ onSync });
      
      const syncButton = screen.getByRole('button', { name: /action_refresh_status/i });
      fireEvent.click(syncButton);
      
      expect(onSync).toHaveBeenCalledTimes(1);
   });

   it('should disable sync button when syncing', () => {
      renderHeader({ isSyncing: true });
      
      const syncButton = screen.getByRole('button', { name: /action_refresh_status/i });
      expect(syncButton).toBeDisabled();
   });

   it('should render user name when logged in', () => {
      renderHeader({ user: 'johndoe' });
      expect(screen.getByText('johndoe')).toBeInTheDocument();
   });

   it('should not render user menu when user is null', () => {
      renderHeader({ user: null });
      expect(screen.queryByText('已登录')).not.toBeInTheDocument();
   });

   it('should show user menu when user avatar is clicked', () => {
      renderHeader({ user: 'testuser' });
      
      const userButton = screen.getByRole('button');
      fireEvent.click(userButton);
      
      expect(screen.getByText('已登录')).toBeInTheDocument();
      expect(screen.getByText('testuser')).toBeInTheDocument();
   });

   it('should call onLogout when logout button is clicked', () => {
      const onLogout = vi.fn();
      renderHeader({ user: 'testuser', onLogout });
      
      // Open user menu
      const userButton = screen.getAllByRole('button')[1]; // Second button is user button
      fireEvent.click(userButton);
      
      // Click logout
      const logoutButton = screen.getByRole('button', { name: /logout/i });
      fireEvent.click(logoutButton);
      
      expect(onLogout).toHaveBeenCalledTimes(1);
   });

   it('should show spinner icon when syncing', () => {
      const { container } = renderHeader({ isSyncing: true });
      
      // Check for spinner animation class
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
   });

   it('should render correctly on desktop (hidden class)', () => {
      const { container } = renderHeader();
      
      const header = container.querySelector('header');
      expect(header).toHaveClass('hidden', 'md:flex');
   });
});
