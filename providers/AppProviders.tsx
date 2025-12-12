import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ErrorBoundary } from '../components/ErrorBoundary';

interface AppProvidersProps {
   children: React.ReactNode;
}

/**
 * AppProviders - 包裹所有全局 Context 和 Router
 * 集中管理应用的所有 Provider 层级
 */
export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
   return (
      <ErrorBoundary>
         <AuthProvider>
            <BrowserRouter>
               {children}
            </BrowserRouter>
         </AuthProvider>
      </ErrorBoundary>
   );
};
