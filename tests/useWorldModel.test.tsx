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

const mockApiSettings = {
    provider: 'google' as const,
    apiKey: 'test-key',
    baseUrl: '',
    model: 'gemini-pro'
};

const mockCheckApiKey = () => true;

describe('useWorldModel Task Integration', () => {
    it('should create a task when generating a layer', async () => {
        // 1. Mock Task Manager
        const mockTaskManager = {
            addTask: vi.fn().mockReturnValue('task-123'),
            updateTask: vi.fn(),
            completeTask: vi.fn(),
            failTask: vi.fn()
        };

        // 2. Init Hook
        const { result } = renderHook(() =>
            useWorldModel(mockApiSettings, mockCheckApiKey, mockTaskManager)
        );

        // 3. Trigger Action
        const layerId = result.current.currentFramework.layers[0].id;
        await act(async () => {
            await result.current.handleGenerateLayer(layerId);
        });

        // 4. Assertions
        // Verify addTask was called
        expect(mockTaskManager.addTask).toHaveBeenCalledWith(
            'generation',
            expect.stringContaining('生成层级'),
            expect.any(String),
            undefined,
            expect.objectContaining({ layerId })
        );

        // Verify task status update (running)
        expect(mockTaskManager.updateTask).toHaveBeenCalledWith(
            'task-123',
            expect.objectContaining({ status: 'running' })
        );

        // Verify task completion
        expect(mockTaskManager.completeTask).toHaveBeenCalledWith(
            'task-123',
            expect.any(Object)
        );
    });
});
