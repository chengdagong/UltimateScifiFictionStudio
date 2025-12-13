import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NewWorldModal } from '../../components/NewWorldModal';

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

describe('NewWorldModal', () => {
   const defaultProps = {
      isOpen: true,
      onClose: vi.fn(),
      onCreateEmpty: vi.fn(),
      onCreateFromPreset: vi.fn(),
      onImport: vi.fn()
   };

   const renderModal = (props = {}) => {
      return render(
         <NewWorldModal {...defaultProps} {...props} />
      );
   };

   it('should not render when isOpen is false', () => {
      renderModal({ isOpen: false });
      expect(screen.queryByText(/modal_new_world_title/i)).not.toBeInTheDocument();
   });

   it('should render modal title', () => {
      renderModal();
      expect(screen.getByText(/modal_new_world_title/i)).toBeInTheDocument();
   });

   it('should render three tabs', () => {
      renderModal();
      expect(screen.getByText(/tab_new_world_empty/i)).toBeInTheDocument();
      expect(screen.getByText(/tab_new_world_presets/i)).toBeInTheDocument();
      expect(screen.getByText(/tab_new_world_import/i)).toBeInTheDocument();
   });

   it('should switch tabs when clicked', () => {
      renderModal();
      
      const presetsTab = screen.getByText(/tab_new_world_presets/i);
      fireEvent.click(presetsTab);
      
      expect(presetsTab).toHaveClass('border-indigo-600', 'text-indigo-600');
   });

   describe('Empty World Tab', () => {
      it('should render empty world form', () => {
         renderModal();
         expect(screen.getByPlaceholderText(/输入世界名称.../i)).toBeInTheDocument();
         expect(screen.getByText(/action_create_now/i)).toBeInTheDocument();
      });

      it('should update world name input', () => {
         renderModal();
         
         const input = screen.getByPlaceholderText(/输入世界名称.../i);
         fireEvent.change(input, { target: { value: 'My New World' } });
         
         expect(input).toHaveValue('My New World');
      });

      it('should disable create button when name is empty', () => {
         renderModal();
         
         const input = screen.getByPlaceholderText(/输入世界名称.../i);
         fireEvent.change(input, { target: { value: '' } });
         
         const createButton = screen.getByText(/action_create_now/i);
         expect(createButton).toBeDisabled();
      });

      it('should call onCreateEmpty with world name', async () => {
         const onCreateEmpty = vi.fn().mockResolvedValue(undefined);
         renderModal({ onCreateEmpty });
         
         const input = screen.getByPlaceholderText(/输入世界名称.../i);
         fireEvent.change(input, { target: { value: 'Test World' } });
         
         const createButton = screen.getByText(/action_create_now/i);
         fireEvent.click(createButton);
         
         await waitFor(() => {
            expect(onCreateEmpty).toHaveBeenCalledWith('Test World');
         });
      });

      it('should display error message when create fails', async () => {
         const onCreateEmpty = vi.fn().mockRejectedValue(new Error('Create failed'));
         renderModal({ onCreateEmpty });
         
         const input = screen.getByPlaceholderText(/输入世界名称.../i);
         fireEvent.change(input, { target: { value: 'Test' } });
         
         const createButton = screen.getByText(/action_create_now/i);
         fireEvent.click(createButton);
         
         await waitFor(() => {
            // Error message is hardcoded in component or comes from error object
            expect(screen.getByText(/Create failed/i)).toBeInTheDocument();
         });
      });
   });

   describe('Presets Tab', () => {
      it('should render presets list', () => {
         renderModal();
         
         const presetsTab = screen.getByText(/tab_new_world_presets/i);
         fireEvent.click(presetsTab);
         
         expect(screen.getByText(/preset_selection_desc/i)).toBeInTheDocument();
      });

      it('should disable preset buttons when name is empty', () => {
         renderModal();
         
         const presetsTab = screen.getByText(/tab_new_world_presets/i);
         fireEvent.click(presetsTab);
         
         const input = screen.getByPlaceholderText(/输入世界名称.../i);
         fireEvent.change(input, { target: { value: '' } });
         
         // All preset buttons should be disabled
         const presetButtons = screen.getAllByRole('button').filter(btn => 
            btn.getAttribute('disabled') !== null && 
            !btn.textContent?.includes('tab_new_world')
         );
         expect(presetButtons.length).toBeGreaterThan(0);
      });
   });

   describe('Import Tab', () => {
      it('should render import form', () => {
         renderModal();
         
         const importTab = screen.getByText(/tab_new_world_import/i);
         fireEvent.click(importTab);
         
         expect(screen.getByPlaceholderText(/placeholder_import_text/i)).toBeInTheDocument();
         expect(screen.getByText(/action_start_analysis/i)).toBeInTheDocument();
      });

      it('should update import text', () => {
         renderModal();
         
         const importTab = screen.getByText(/tab_new_world_import/i);
         fireEvent.click(importTab);
         
         const textarea = screen.getByPlaceholderText(/placeholder_import_text/i);
         fireEvent.change(textarea, { target: { value: 'Some text to import' } });
         
         expect(textarea).toHaveValue('Some text to import');
      });

      it('should call onImport with text and name', async () => {
         const onImport = vi.fn().mockResolvedValue(undefined);
         renderModal({ onImport });
         
         const importTab = screen.getByText(/tab_new_world_import/i);
         fireEvent.click(importTab);
         
         const nameInput = screen.getByPlaceholderText(/输入世界名称.../i);
         fireEvent.change(nameInput, { target: { value: 'Imported World' } });
         
         const textarea = screen.getByPlaceholderText(/placeholder_import_text/i);
         fireEvent.change(textarea, { target: { value: 'Import text' } });
         
         const importButton = screen.getByText(/action_start_analysis/i);
         fireEvent.click(importButton);
         
         await waitFor(() => {
            expect(onImport).toHaveBeenCalledWith('Import text', 'Imported World');
         });
      });

      it('should disable import button when name is empty', () => {
         renderModal();
         
         const importTab = screen.getByText(/tab_new_world_import/i);
         fireEvent.click(importTab);
         
         const nameInput = screen.getByPlaceholderText(/输入世界名称.../i);
         fireEvent.change(nameInput, { target: { value: '' } });
         
         const importButton = screen.getByText(/action_start_analysis/i);
         expect(importButton).toBeDisabled();
      });
   });

   it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn();
      renderModal({ onClose });
      
      const closeButton = screen.getByRole('button', { name: '' }); // X button
      fireEvent.click(closeButton);
      
      expect(onClose).toHaveBeenCalledTimes(1);
   });

   it('should clear error when world name changes', async () => {
      const onCreateEmpty = vi.fn().mockRejectedValue(new Error('Test error'));
      renderModal({ onCreateEmpty });
      
      const input = screen.getByPlaceholderText(/输入世界名称.../i);
      fireEvent.change(input, { target: { value: 'Test' } });
      
      const createButton = screen.getByText(/action_create_now/i);
      fireEvent.click(createButton);
      
      await waitFor(() => {
         expect(screen.getByText(/Test error/i)).toBeInTheDocument();
      });
      
      // Change name should clear error
      fireEvent.change(input, { target: { value: 'Test2' } });
      
      expect(screen.queryByText(/Test error/i)).not.toBeInTheDocument();
   });
});
