import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StoryAgentView from '../../components/StoryAgentView';
import { StoryAgent, WorkflowStep } from '../../types';

// Mock dependencies
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
    }),
}));

vi.mock('../../components/MilkdownEditor', () => ({
    default: () => <div data-testid="milkdown-editor">Editor</div>
}));

// Mock props
const mockAgents: StoryAgent[] = [
    { id: 'agent1', name: 'Agent 1', role: 'Role 1', systemPrompt: 'Prompt 1', color: 'bg-red-500', icon: 'Bot' }
];
const mockWorkflow: WorkflowStep[] = [];
const mockProps = {
    agents: mockAgents,
    workflow: mockWorkflow,
    model: {} as any,
    framework: {} as any,
    worldContext: '',
    storySegments: [],
    settings: {} as any,
    currentTimeSetting: '',
    onUpdateAgents: vi.fn(),
    onUpdateWorkflow: vi.fn(),
    onAddStorySegment: vi.fn(),
    onUpdateStorySegment: vi.fn(),
    onRemoveStorySegment: vi.fn(),
    storyGuidance: '',
    onUpdateStoryGuidance: vi.fn(),
    workflowStatus: 'idle' as const,
    onUpdateWorkflowStatus: vi.fn(),
    currentStepIndex: 0,
    onUpdateCurrentStepIndex: vi.fn(),
    executionLogs: {},
    onUpdateExecutionLogs: vi.fn(),
    stepOutputs: {},
    onUpdateStepOutputs: vi.fn(),
    generatedDraft: '',
    onUpdateGeneratedDraft: vi.fn(),
    artifacts: [],
    onUpdateArtifacts: vi.fn(),
};

describe('StoryAgentView - Agent List Position', () => {
    beforeEach(() => {
        localStorage.clear();
        // Mock window dimensions
        Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1920 });
        Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 1080 });
    });

    it('should load position from localStorage on mount', () => {
        const savedPos = { x: 500, y: 200 };
        localStorage.setItem('story_agent_window_pos', JSON.stringify(savedPos));

        const { getByTestId } = render(<StoryAgentView {...mockProps} />);
        
        const floatingWindow = getByTestId('agent-floating-window');
        expect(floatingWindow).toBeInTheDocument();
        expect(floatingWindow).toHaveStyle({ left: '500px', top: '200px' });
    });

    it('should use default position if localStorage is empty', () => {
        const { getByTestId } = render(<StoryAgentView {...mockProps} />);
        
        const floatingWindow = getByTestId('agent-floating-window');
        // Default X = 1920 - 400 - 20 = 1500
        // Default Y = 80
        expect(floatingWindow).toHaveStyle({ left: '1500px', top: '80px' });
    });

    it('should save position to localStorage after dragging', () => {
        const { getByTestId } = render(<StoryAgentView {...mockProps} />);
        const floatingWindow = getByTestId('agent-floating-window');
        const header = floatingWindow.querySelector('.cursor-move') as HTMLElement;

        // Initial position check
        expect(floatingWindow).toHaveStyle({ left: '1500px', top: '80px' });

        // Simulate drag
        // 1. Mouse Down at initial position
        fireEvent.mouseDown(header, { clientX: 1500, clientY: 80 });
        
        // 2. Mouse Move to new position (delta: -100, +100)
        // New pos should be 1400, 180
        fireEvent.mouseMove(document, { clientX: 1400, clientY: 180 });
        
        // 3. Mouse Up to end drag
        fireEvent.mouseUp(document);

        // Check new position style
        expect(floatingWindow).toHaveStyle({ left: '1400px', top: '180px' });

        // Check localStorage
        const saved = JSON.parse(localStorage.getItem('story_agent_window_pos') || '{}');
        expect(saved).toEqual({ x: 1400, y: 180 });
    });

    it('should maintain position after remount (simulating view switch)', () => {
        // 1. Render and drag to a new position
        const { unmount, getByTestId } = render(<StoryAgentView {...mockProps} />);
        let floatingWindow = getByTestId('agent-floating-window');
        const header = floatingWindow.querySelector('.cursor-move') as HTMLElement;

        fireEvent.mouseDown(header, { clientX: 1500, clientY: 80 });
        fireEvent.mouseMove(document, { clientX: 1000, clientY: 500 });
        fireEvent.mouseUp(document);

        // Verify saved
        expect(JSON.parse(localStorage.getItem('story_agent_window_pos')!)).toEqual({ x: 1000, y: 500 });

        // 2. Unmount
        unmount();

        // 3. Remount
        const { getByTestId: getByTestId2 } = render(<StoryAgentView {...mockProps} />);
        floatingWindow = getByTestId2('agent-floating-window');

        // 4. Verify position is restored
        expect(floatingWindow).toHaveStyle({ left: '1000px', top: '500px' });
    });

    it('should clamp position if saved position is out of bounds', () => {
        // Saved position completely off-screen (e.g. x=3000)
        const savedPos = { x: 3000, y: 200 };
        localStorage.setItem('story_agent_window_pos', JSON.stringify(savedPos));

        const { getByTestId } = render(<StoryAgentView {...mockProps} />);
        const floatingWindow = getByTestId('agent-floating-window');

        // Should reset to default
        // Default X = 1500, Y = 80
        expect(floatingWindow).toHaveStyle({ left: '1500px', top: '80px' });
    });
});
