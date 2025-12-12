import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppProviders } from './providers/AppProviders';
import { MainLayout } from './layouts/MainLayout';

/**
 * App - 应用入口组件
 * 职责：组合 Providers 和 Layout，不包含业务逻辑
 */
const App: React.FC = () => {
   return (
      <AppProviders>
         <Routes>
            <Route path="/*" element={<MainLayout />} />
         </Routes>
      </AppProviders>
   );
};

export default App;
