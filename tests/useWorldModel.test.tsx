import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useWorldModel } from '../hooks/useWorldModel';

// Mock Services
vi.mock('../services/geminiService', () => ({
    generateEntitiesForLayer: vi.fn().mockResolvedValue([
        { id: 'e1', name: 'Mock Entity', description: 'desc', category: 'person' }
    ]),
    generateRelatedTechNode: vi.fn(),
    generateWorldChronicle: vi.fn()
}));

// Mock useApiSettings
vi.mock('../hooks/useApiSettings', () => ({
    useApiSettings: () => ({
        apiSettings: {
            provider: 'google',
            apiKey: 'test-key',
            baseUrl: '',
            model: 'gemini-pro'
        },
        checkApiKey: () => true
    })
}));

// Mock useTaskStore
const mockAddTask = vi.fn().mockReturnValue('task-123');
const mockUpdateTask = vi.fn();

vi.mock('../stores/taskStore', () => ({
    useTaskStore: () => ({
        addTask: mockAddTask,
        updateTask: mockUpdateTask
    })
}));

describe('useWorldModel Task Integration', () => {
    it('should create a task when generating a layer', async () => {
        // 2. Init Hook
        const { result } = renderHook(() => useWorldModel());

        // 3. Trigger Action
        const layerId = result.current.currentFramework.layers[0].id;
        await act(async () => {
            await result.current.handleGenerateLayer(layerId);
        });

        // 4. Assertions
        // Verify addTask was called
        expect(mockAddTask).toHaveBeenCalledWith(expect.objectContaining({
            type: 'generation',
            name: expect.stringContaining('生成层级'),
            metadata: expect.objectContaining({ layerId })
        }));

        // Verify task status update (running)
        expect(mockUpdateTask).toHaveBeenCalledWith(
            'task-123',
            expect.objectContaining({ status: 'running' })
        );

        // Verify task completion
        expect(mockUpdateTask).toHaveBeenCalledWith(
            'task-123',
            expect.objectContaining({ status: 'completed' })
        );
    });
});
