import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppProviders } from '../../providers/AppProviders';

describe('AppProviders', () => {
   it('should render children', () => {
      render(
         <AppProviders>
            <div>Test Child</div>
         </AppProviders>
      );
      
      expect(screen.getByText('Test Child')).toBeInTheDocument();
   });

   it('should not throw errors when rendering', () => {
      expect(() => {
         render(
            <AppProviders>
               <div>Safe content</div>
            </AppProviders>
         );
      }).not.toThrow();
   });

   it('should render multiple children', () => {
      render(
         <AppProviders>
            <div>Child 1</div>
            <div>Child 2</div>
            <div>Child 3</div>
         </AppProviders>
      );

      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
      expect(screen.getByText('Child 3')).toBeInTheDocument();
   });

   it('should successfully wrap providers (ErrorBoundary, AuthProvider, BrowserRouter)', () => {
      const TestComponent = () => {
         return <div>All Providers Active</div>;
      };

      const { container } = render(
         <AppProviders>
            <TestComponent />
         </AppProviders>
      );

      expect(screen.getByText('All Providers Active')).toBeInTheDocument();
      expect(container.firstChild).toBeTruthy();
   });
});
