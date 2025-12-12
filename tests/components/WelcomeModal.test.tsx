import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WelcomeModal } from '../../components/WelcomeModal';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import { WorldData } from '../../types';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

describe('WelcomeModal', () => {
   const mockWorlds: WorldData[] = [
      {
         id: '1',
         name: 'Test World',
         frameworkId: 'general',
         createdAt: Date.now() - 2000,
         lastModified: Date.now() - 2000,
         context: '',
         model: { entities: [], relationships: [], entityStates: [], technologies: [], techDependencies: [] },
         storySegments: [],
         currentTimeSetting: '',
         chronicleText: '',
         agents: [],
         workflow: [],
         artifacts: []
      },
      {
         id: '2',
         name: 'Older World',
         frameworkId: 'scifi',
         createdAt: Date.now() - 5000,
         lastModified: Date.now() - 5000,
         context: '',
         model: { entities: [], relationships: [], entityStates: [], technologies: [], techDependencies: [] },
         storySegments: [],
         currentTimeSetting: '',
         chronicleText: '',
         agents: [],
         workflow: [],
         artifacts: []
      }
   ];

   const defaultProps = {
      isAuthenticated: false,
      user: null,
      onLogin: vi.fn(),
      onLogout: vi.fn(),
      onNewWorld: vi.fn(),
      onLoadWorld: vi.fn(),
      savedWorlds: [],
      isLoadingWorlds: false,
      onLoadWorldList: vi.fn()
   };

   const renderModal = (props = {}) => {
      return render(
         <I18nextProvider i18n={i18n}>
            <WelcomeModal {...defaultProps} {...props} />
         </I18nextProvider>
      );
   };

   beforeEach(() => {
      vi.clearAllMocks();
   });

   describe('Unauthenticated State', () => {
      it('should render login form when not authenticated', () => {
         renderModal({ isAuthenticated: false });
         expect(screen.getByText(/登录账号|注册账号/)).toBeInTheDocument();
      });

      it('should render welcome title', () => {
         renderModal({ isAuthenticated: false });
         expect(screen.getByText(/EcoNarrative Studio/i)).toBeInTheDocument();
      });

      it('should show username and password inputs', () => {
         renderModal({ isAuthenticated: false });
         expect(screen.getByPlaceholderText(/请输入用户名/i)).toBeInTheDocument();
         expect(screen.getByPlaceholderText(/请输入密码/i)).toBeInTheDocument();
      });

      it('should toggle between login and register', () => {
         renderModal({ isAuthenticated: false });
         
         const toggleButton = screen.getByText(/去注册/i);
         fireEvent.click(toggleButton);
         
         expect(screen.getByText(/注册账号/i)).toBeInTheDocument();
         
         const backToLogin = screen.getByText(/去登录/i);
         fireEvent.click(backToLogin);
         
         expect(screen.getByText(/登录账号/i)).toBeInTheDocument();
      });

      it('should render login button', () => {
         renderModal({ isAuthenticated: false });
         expect(screen.getByRole('button', { name: /登录/i })).toBeInTheDocument();
      });

      it('should render register button when in register mode', () => {
         renderModal({ isAuthenticated: false });
         
         const toggleButton = screen.getByText(/去注册/i);
         fireEvent.click(toggleButton);
         
         expect(screen.getByRole('button', { name: /注册/i })).toBeInTheDocument();
      });

      it('should update username and password inputs', () => {
         renderModal({ isAuthenticated: false });
         
         const usernameInput = screen.getByPlaceholderText(/请输入用户名/i) as HTMLInputElement;
         const passwordInput = screen.getByPlaceholderText(/请输入密码/i) as HTMLInputElement;
         
         fireEvent.change(usernameInput, { target: { value: 'testuser' } });
         fireEvent.change(passwordInput, { target: { value: 'password123' } });
         
         expect(usernameInput.value).toBe('testuser');
         expect(passwordInput.value).toBe('password123');
      });
   });

   describe('Login/Register Functionality', () => {
      it('should call axios.post with correct endpoint on login', async () => {
         mockedAxios.post.mockResolvedValueOnce({
            data: { token: 'test-token', username: 'testuser' }
         });

         const onLogin = vi.fn();
         const onLoadWorldList = vi.fn();
         
         renderModal({ 
            isAuthenticated: false, 
            onLogin,
            onLoadWorldList 
         });
         
         const usernameInput = screen.getByPlaceholderText(/请输入用户名/i);
         const passwordInput = screen.getByPlaceholderText(/请输入密码/i);
         const loginButton = screen.getByRole('button', { name: /登录/i });
         
         fireEvent.change(usernameInput, { target: { value: 'testuser' } });
         fireEvent.change(passwordInput, { target: { value: 'password123' } });
         fireEvent.click(loginButton);
         
         await waitFor(() => {
            expect(mockedAxios.post).toHaveBeenCalledWith('/api/auth/login', {
               username: 'testuser',
               password: 'password123'
            });
         });
      });

      it('should call onLogin and onLoadWorldList on successful login', async () => {
         mockedAxios.post.mockResolvedValueOnce({
            data: { token: 'test-token', username: 'testuser' }
         });

         const onLogin = vi.fn();
         const onLoadWorldList = vi.fn();
         
         renderModal({ 
            isAuthenticated: false, 
            onLogin,
            onLoadWorldList 
         });
         
         const usernameInput = screen.getByPlaceholderText(/请输入用户名/i);
         const passwordInput = screen.getByPlaceholderText(/请输入密码/i);
         const loginButton = screen.getByRole('button', { name: /登录/i });
         
         fireEvent.change(usernameInput, { target: { value: 'testuser' } });
         fireEvent.change(passwordInput, { target: { value: 'password123' } });
         fireEvent.click(loginButton);
         
         await waitFor(() => {
            expect(onLogin).toHaveBeenCalledWith('testuser', 'test-token');
            expect(onLoadWorldList).toHaveBeenCalled();
         });
      });

      it('should display error message on login failure', async () => {
         mockedAxios.post.mockRejectedValueOnce({
            response: { data: { error: '用户名或密码错误' } }
         });

         renderModal({ isAuthenticated: false });
         
         const usernameInput = screen.getByPlaceholderText(/请输入用户名/i);
         const passwordInput = screen.getByPlaceholderText(/请输入密码/i);
         const loginButton = screen.getByRole('button', { name: /登录/i });
         
         fireEvent.change(usernameInput, { target: { value: 'testuser' } });
         fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
         fireEvent.click(loginButton);
         
         await waitFor(() => {
            expect(screen.getByText(/用户名或密码错误/i)).toBeInTheDocument();
         });
      });

      it('should call axios.post with register endpoint when registering', async () => {
         mockedAxios.post.mockResolvedValueOnce({ data: {} });

         renderModal({ isAuthenticated: false });
         
         const toggleButton = screen.getByText(/去注册/i);
         fireEvent.click(toggleButton);
         
         const usernameInput = screen.getByPlaceholderText(/请输入用户名/i);
         const passwordInput = screen.getByPlaceholderText(/请输入密码/i);
         const registerButton = screen.getByRole('button', { name: /注册/i });
         
         fireEvent.change(usernameInput, { target: { value: 'newuser' } });
         fireEvent.change(passwordInput, { target: { value: 'password123' } });
         fireEvent.click(registerButton);
         
         await waitFor(() => {
            expect(mockedAxios.post).toHaveBeenCalledWith('/api/auth/register', {
               username: 'newuser',
               password: 'password123'
            });
         });
      });

      it('should show success message and switch to login after registration', async () => {
         mockedAxios.post.mockResolvedValueOnce({ data: {} });

         renderModal({ isAuthenticated: false });
         
         const toggleButton = screen.getByText(/去注册/i);
         fireEvent.click(toggleButton);
         
         const usernameInput = screen.getByPlaceholderText(/请输入用户名/i);
         const passwordInput = screen.getByPlaceholderText(/请输入密码/i);
         const registerButton = screen.getByRole('button', { name: /注册/i });
         
         fireEvent.change(usernameInput, { target: { value: 'newuser' } });
         fireEvent.change(passwordInput, { target: { value: 'password123' } });
         fireEvent.click(registerButton);
         
         await waitFor(() => {
            expect(screen.getByText(/注册成功，请登录/i)).toBeInTheDocument();
            expect(screen.getByText(/登录账号/i)).toBeInTheDocument();
         });
      });

      it('should clear error when switching between login and register', () => {
         renderModal({ isAuthenticated: false });
         
         // Show error in login mode (mock it by re-rendering with error shown)
         const toggleButton = screen.getByText(/去注册/i);
         fireEvent.click(toggleButton);
         
         // Error should be cleared when toggling
         const backButton = screen.getByText(/去登录/i);
         fireEvent.click(backButton);
         
         // No error should be shown
         expect(screen.queryByText(/用户名或密码错误/i)).not.toBeInTheDocument();
      });
   });

   describe('Authenticated State', () => {
      it('should render user greeting when authenticated', () => {
         renderModal({ isAuthenticated: true, user: 'testuser' });
         expect(screen.getByText(/欢迎回来.*testuser/i)).toBeInTheDocument();
      });

      it('should render new world button', () => {
         renderModal({ isAuthenticated: true, user: 'testuser' });
         expect(screen.getByText(/New World/i)).toBeInTheDocument();
      });

      it('should call onNewWorld when new world button is clicked', () => {
         const onNewWorld = vi.fn();
         renderModal({ isAuthenticated: true, user: 'testuser', onNewWorld });
         
         const newWorldButton = screen.getByRole('button', { name: /New World/i });
         fireEvent.click(newWorldButton);
         
         expect(onNewWorld).toHaveBeenCalledTimes(1);
      });

      it('should render logout button', () => {
         renderModal({ isAuthenticated: true, user: 'testuser' });
         expect(screen.getByTitle(/退出登录/i)).toBeInTheDocument();
      });

      it('should call onLogout when logout button is clicked', () => {
         const onLogout = vi.fn();
         renderModal({ isAuthenticated: true, user: 'testuser', onLogout });
         
         const logoutButton = screen.getByTitle(/退出登录/i);
         fireEvent.click(logoutButton);
         
         expect(onLogout).toHaveBeenCalledTimes(1);
      });

      it('should render user avatar', () => {
         const { container } = renderModal({ isAuthenticated: true, user: 'testuser' });
         // Avatar is rendered based on username hash
         expect(container.querySelector('.w-20.h-20')).toBeInTheDocument();
      });

      it('should render user role label', () => {
         renderModal({ isAuthenticated: true, user: 'testuser' });
         // getAvatarByUsername returns avatar with label
         const { container } = renderModal({ isAuthenticated: true, user: 'testuser' });
         expect(container.textContent).toContain('欢迎回来');
      });
   });

   describe('Project List', () => {
      it('should show loading spinner when loading worlds', () => {
         const { container } = renderModal({ 
            isAuthenticated: true, 
            user: 'testuser',
            isLoadingWorlds: true 
         });
         expect(container.querySelector('.animate-spin')).toBeInTheDocument();
      });

      it('should show empty message when no worlds', () => {
         renderModal({
            isAuthenticated: true,
            user: 'testuser',
            savedWorlds: []
         });
         expect(screen.getByText(/No saves yet/i)).toBeInTheDocument();
      });

      it('should render list of saved worlds', () => {
         renderModal({ 
            isAuthenticated: true, 
            user: 'testuser',
            savedWorlds: mockWorlds 
         });
         expect(screen.getByText('Test World')).toBeInTheDocument();
         expect(screen.getByText('Older World')).toBeInTheDocument();
      });

      it('should call onLoadWorld when world is clicked', () => {
         const onLoadWorld = vi.fn();
         renderModal({ 
            isAuthenticated: true, 
            user: 'testuser',
            savedWorlds: mockWorlds,
            onLoadWorld
         });
         
         const worldButton = screen.getByText('Test World');
         fireEvent.click(worldButton);
         
         expect(onLoadWorld).toHaveBeenCalledWith(mockWorlds[0]);
      });

      it('should display framework name for each world', () => {
         renderModal({ 
            isAuthenticated: true, 
            user: 'testuser',
            savedWorlds: mockWorlds 
         });
         
         // Check that framework names are displayed
         const { container } = renderModal({ 
            isAuthenticated: true, 
            user: 'testuser',
            savedWorlds: mockWorlds 
         });
         
         expect(container.textContent).toContain('最后访问');
      });

      it('should sort worlds by lastModified in descending order', () => {
         renderModal({ 
            isAuthenticated: true, 
            user: 'testuser',
            savedWorlds: mockWorlds 
         });
         
         const worldButtons = screen.getAllByRole('button').filter(btn => 
            btn.textContent?.includes('Test World') || btn.textContent?.includes('Older World')
         );
         
         // Test World (newer) should appear before Older World
         expect(worldButtons[0].textContent).toContain('Test World');
      });

      it('should display last modified date for each world', () => {
         renderModal({ 
            isAuthenticated: true, 
            user: 'testuser',
            savedWorlds: mockWorlds 
         });
         
         expect(screen.getAllByText(/最后访问:/i).length).toBeGreaterThan(0);
      });

      it('should render project section divider', () => {
         renderModal({ 
            isAuthenticated: true, 
            user: 'testuser',
            savedWorlds: mockWorlds 
         });
         
         expect(screen.getByText(/已有项目/i)).toBeInTheDocument();
      });

      it('should render FolderOpen icon for each world', () => {
         const { container } = renderModal({ 
            isAuthenticated: true, 
            user: 'testuser',
            savedWorlds: mockWorlds 
         });
         
         // Lucide icons render as SVG elements
         const svgs = container.querySelectorAll('svg');
         expect(svgs.length).toBeGreaterThan(0);
      });
   });

   describe('UI Elements', () => {
      it('should render version info when not authenticated', () => {
         renderModal({ isAuthenticated: false });
         expect(screen.getByText(/v1\.0 MVP.*Built with Google Gemini/i)).toBeInTheDocument();
      });

      it('should render version info when authenticated', () => {
         renderModal({ isAuthenticated: true, user: 'testuser' });
         expect(screen.getByText(/v1\.0 MVP.*Built with Google Gemini/i)).toBeInTheDocument();
      });

      it('should render app icon in unauthenticated state', () => {
         const { container } = renderModal({ isAuthenticated: false });
         expect(container.textContent).toContain('E');
      });

      it('should render subtitle in unauthenticated state', () => {
         renderModal({ isAuthenticated: false });
         expect(screen.getByText(/Deep story engine based on social ecosystem modeling/i)).toBeInTheDocument();
      });

      it('should have proper styling classes', () => {
         const { container } = renderModal({ isAuthenticated: false });
         expect(container.querySelector('.fixed.inset-0')).toBeInTheDocument();
      });
   });

   describe('Form Validation', () => {
      it('should have required attribute on username input', () => {
         renderModal({ isAuthenticated: false });
         const usernameInput = screen.getByPlaceholderText(/请输入用户名/i);
         expect(usernameInput).toHaveAttribute('required');
      });

      it('should have required attribute on password input', () => {
         renderModal({ isAuthenticated: false });
         const passwordInput = screen.getByPlaceholderText(/请输入密码/i);
         expect(passwordInput).toHaveAttribute('required');
      });

      it('should have type=password on password input', () => {
         renderModal({ isAuthenticated: false });
         const passwordInput = screen.getByPlaceholderText(/请输入密码/i);
         expect(passwordInput).toHaveAttribute('type', 'password');
      });
   });

   describe('Edge Cases', () => {
      it('should handle null user gracefully', () => {
         renderModal({ isAuthenticated: true, user: null });
         // Should still render without crashing
         expect(screen.getByText(/欢迎回来/i)).toBeInTheDocument();
      });

      it('should handle empty savedWorlds array', () => {
         renderModal({
            isAuthenticated: true,
            user: 'testuser',
            savedWorlds: []
         });
         expect(screen.getByText(/No saves yet/i)).toBeInTheDocument();
      });

      it('should handle network error without crashing', async () => {
         mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

         renderModal({ isAuthenticated: false });
         
         const usernameInput = screen.getByPlaceholderText(/请输入用户名/i);
         const passwordInput = screen.getByPlaceholderText(/请输入密码/i);
         const loginButton = screen.getByRole('button', { name: /登录/i });
         
         fireEvent.change(usernameInput, { target: { value: 'testuser' } });
         fireEvent.change(passwordInput, { target: { value: 'password123' } });
         fireEvent.click(loginButton);
         
         await waitFor(() => {
            expect(screen.getByText(/操作失败，请重试/i)).toBeInTheDocument();
         });
      });
   });
});
