import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SaveModal, LoadModal } from '../../components/WorldModals';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import { WorldData } from '../../types';

describe('SaveModal', () => {
   const defaultProps = {
      isOpen: true,
      onClose: vi.fn(),
      commitMessage: '',
      onCommitMessageChange: vi.fn(),
      onSave: vi.fn(),
      isSaving: false
   };

   const renderSaveModal = (props = {}) => {
      return render(
         <I18nextProvider i18n={i18n}>
            <SaveModal {...defaultProps} {...props} />
         </I18nextProvider>
      );
   };

   it('should not render when isOpen is false', () => {
      renderSaveModal({ isOpen: false });
      expect(screen.queryByText(/modal_save_world_title/i)).not.toBeInTheDocument();
   });

   it('should render modal title', () => {
      renderSaveModal();
      expect(screen.getByText(/modal_save_world_title/i)).toBeInTheDocument();
   });

   it('should render commit message input', () => {
      renderSaveModal();
      const input = screen.getByPlaceholderText(/placeholder_commit_message/i);
      expect(input).toBeInTheDocument();
   });

   it('should call onCommitMessageChange when input changes', () => {
      const onCommitMessageChange = vi.fn();
      renderSaveModal({ onCommitMessageChange });
      
      const input = screen.getByPlaceholderText(/placeholder_commit_message/i);
      fireEvent.change(input, { target: { value: 'Test commit' } });
      
      expect(onCommitMessageChange).toHaveBeenCalledWith('Test commit');
   });

   it('should render cancel and save buttons', () => {
      renderSaveModal();
      expect(screen.getByText(/action_cancel/i)).toBeInTheDocument();
      expect(screen.getByText(/action_confirm_save/i)).toBeInTheDocument();
   });

   it('should call onClose when cancel button is clicked', () => {
      const onClose = vi.fn();
      renderSaveModal({ onClose });
      
      const cancelButton = screen.getByText(/action_cancel/i);
      fireEvent.click(cancelButton);
      
      expect(onClose).toHaveBeenCalledTimes(1);
   });

   it('should call onSave when save button is clicked', () => {
      const onSave = vi.fn();
      renderSaveModal({ onSave });
      
      const saveButton = screen.getByText(/action_confirm_save/i);
      fireEvent.click(saveButton);
      
      expect(onSave).toHaveBeenCalledTimes(1);
   });

   it('should disable save button when saving', () => {
      renderSaveModal({ isSaving: true });
      
      const saveButton = screen.getByText(/status_saving/i);
      expect(saveButton).toBeDisabled();
   });

   it('should display commit message value', () => {
      renderSaveModal({ commitMessage: 'My commit message' });
      
      const input = screen.getByDisplayValue('My commit message');
      expect(input).toBeInTheDocument();
   });
});

describe('LoadModal', () => {
   const mockWorlds: WorldData[] = [
      {
         id: '1',
         name: 'World 1',
         frameworkId: 'general',
         createdAt: Date.now() - 1000,
         lastModified: Date.now() - 1000,
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
         name: 'World 2',
         frameworkId: 'scifi',
         createdAt: Date.now(),
         lastModified: Date.now(),
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
      isOpen: true,
      onClose: vi.fn(),
      savedWorlds: mockWorlds,
      isLoading: false,
      onLoadWorld: vi.fn(),
      onDeleteWorld: vi.fn()
   };

   const renderLoadModal = (props = {}) => {
      return render(
         <I18nextProvider i18n={i18n}>
            <LoadModal {...defaultProps} {...props} />
         </I18nextProvider>
      );
   };

   it('should not render when isOpen is false', () => {
      renderLoadModal({ isOpen: false });
      expect(screen.queryByText(/modal_load_world_title/i)).not.toBeInTheDocument();
   });

   it('should render modal title', () => {
      renderLoadModal();
      expect(screen.getByText(/modal_load_world_title/i)).toBeInTheDocument();
   });

   it('should render loading spinner when loading', () => {
      const { container } = renderLoadModal({ isLoading: true });
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
   });

   it('should render empty message when no worlds', () => {
      renderLoadModal({ savedWorlds: [] });
      expect(screen.getByText(/empty_no_saves/i)).toBeInTheDocument();
   });

   it('should render list of worlds', () => {
      renderLoadModal();
      expect(screen.getByText('World 1')).toBeInTheDocument();
      expect(screen.getByText('World 2')).toBeInTheDocument();
   });

   it('should call onLoadWorld when world is clicked', () => {
      const onLoadWorld = vi.fn();
      renderLoadModal({ onLoadWorld });
      
      const world1Button = screen.getByText('World 1');
      fireEvent.click(world1Button);
      
      expect(onLoadWorld).toHaveBeenCalledWith(mockWorlds[0]);
   });

   it('should call onDeleteWorld when delete button is clicked', () => {
      const onDeleteWorld = vi.fn();
      renderLoadModal({ onDeleteWorld });
      
      const deleteButtons = screen.getAllByTitle(/action_delete_save/i);
      fireEvent.click(deleteButtons[0]);
      
      expect(onDeleteWorld).toHaveBeenCalledWith('1');
   });

   it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn();
      renderLoadModal({ onClose });
      
      const closeButton = screen.getByRole('button', { name: '' }); // X button has no name
      fireEvent.click(closeButton);
      
      expect(onClose).toHaveBeenCalledTimes(1);
   });

   it('should display framework name for each world', () => {
      renderLoadModal();
      // Should show framework names from FRAMEWORKS constant
      expect(screen.getByText(/framework_unknown|通用|科幻/i)).toBeInTheDocument();
   });

   it('should sort worlds by lastModified (newest first)', () => {
      renderLoadModal();
      
      const worldNames = screen.getAllByText(/World \d/);
      expect(worldNames[0]).toHaveTextContent('World 2'); // Newer world first
      expect(worldNames[1]).toHaveTextContent('World 1');
   });

   it('should prevent delete button click from triggering load', () => {
      const onLoadWorld = vi.fn();
      const onDeleteWorld = vi.fn();
      renderLoadModal({ onLoadWorld, onDeleteWorld });
      
      const deleteButtons = screen.getAllByTitle(/action_delete_save/i);
      fireEvent.click(deleteButtons[0]);
      
      expect(onLoadWorld).not.toHaveBeenCalled();
      expect(onDeleteWorld).toHaveBeenCalledTimes(1);
   });
});
