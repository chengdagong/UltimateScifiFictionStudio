import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '../../components/Header';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWorldModel } from '../../hooks/useWorldModel';

// Mock i18next
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: {
            language: 'en',
            changeLanguage: vi.fn(),
        },
    }),
}));

// Mock hooks
vi.mock('../../hooks/useWorldModel', () => ({
    useWorldModel: vi.fn()
}));

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});

describe('Header', () => {
    const mockOnSync = vi.fn();
    
    beforeEach(() => {
        vi.clearAllMocks();
        
        // Default mock implementations
        (useWorldModel as any).mockReturnValue({
            model: { entities: Array(10).fill({}) }, // Mock 10 entities
            storySegments: Array(5).fill({}), // Mock 5 chapters
            isSyncing: false,
            handleGlobalSync: mockOnSync
        });
    });

   const defaultProps = {
      worldName: 'Test World',
      isAutoSaving: false,
      lastAutoSaveTime: Date.now(),
      user: 'testuser',
      onLogout: vi.fn(),
      // Extra props passed in test but ignored by component
      entitiesCount: 10,
      chaptersCount: 5,
      isSyncing: false,
      onSync: vi.fn()
   };

   const renderHeader = (props = {}) => {
      return render(
         <QueryClientProvider client={queryClient}>
            <Header {...defaultProps} {...props} />
         </QueryClientProvider>
      );
   };

   it('should render world name', () => {
      renderHeader();
      expect(screen.getByText('Test World')).toBeInTheDocument();
   });

   it('should render entities count', () => {
      renderHeader();
      // Expect 10 because we mocked model.entities to have length 10
      expect(screen.getByText(/10.*label_entities/i)).toBeInTheDocument();
   });

   it('should render chapters count', () => {
      renderHeader();
      // Expect 5 because we mocked storySegments to have length 5
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
      renderHeader();
      
      const syncButton = screen.getByRole('button', { name: /action_refresh_status/i });
      fireEvent.click(syncButton);
      
      expect(mockOnSync).toHaveBeenCalledTimes(1);
   });

   it('should disable sync button when syncing', () => {
      (useWorldModel as any).mockReturnValue({
          model: { entities: [] },
          storySegments: [],
          isSyncing: true,
          handleGlobalSync: mockOnSync
      });

      renderHeader();
      
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
      
      // Find user button by text content since there are multiple buttons
      const userButton = screen.getByText('testuser').closest('button');
      fireEvent.click(userButton!);
      
      expect(screen.getByText('已登录')).toBeInTheDocument();
      // Check that we have multiple 'testuser' texts now (one in button, one in menu)
      expect(screen.getAllByText('testuser').length).toBeGreaterThan(1);
   });

   it('should call onLogout when logout button is clicked', () => {
      const onLogout = vi.fn();
      renderHeader({ user: 'testuser', onLogout });
      
      // Open user menu
      const userButton = screen.getByText('testuser').closest('button');
      fireEvent.click(userButton!);
      
      // Click logout
      const logoutButton = screen.getByRole('button', { name: /logout/i });
      fireEvent.click(logoutButton);
      
      expect(onLogout).toHaveBeenCalledTimes(1);
   });

   it('should show spinner icon when syncing', () => {
      (useWorldModel as any).mockReturnValue({
          model: { entities: [] },
          storySegments: [],
          isSyncing: true,
          handleGlobalSync: mockOnSync
      });

      const { container } = renderHeader();
      
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
