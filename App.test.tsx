import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { describe, it, expect, vi } from 'vitest';
import { GitHubProvider } from './components/GitHubContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// Mock i18next
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => {
            const translations: any = {
                'app_name': 'EcoNarrative',
                'app_subtitle': 'Studio'
            };
            return translations[key] || key;
        },
        i18n: {
            language: 'zh',
            changeLanguage: vi.fn(),
        },
    }),
}));

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});

// Mock Custom Hooks
vi.mock('./hooks/useApiSettings', () => ({
    useApiSettings: () => ({
        apiSettings: { minimalUI: false },
        showSettingsModal: false,
        setShowSettingsModal: vi.fn(),
        toggleMinimalUI: vi.fn(),
        checkApiKey: vi.fn(),
        setApiSettings: vi.fn(),
    }),
}));

vi.mock('./hooks/useWorldModel', () => ({
    useWorldModel: () => ({
        model: { entities: [], technologies: [], entityStates: [], relationships: [] },
        currentFramework: { layers: [] },
        storySegments: [],
        worldContext: '',
        currentTimeSetting: {},
        handleGlobalSync: vi.fn(),
        isSyncing: false,
    }),
}));

vi.mock('./hooks/useStoryEngine', () => ({
    useStoryEngine: () => ({
        agents: [],
        workflow: [],
        storyGuidance: '',
        workflowStatus: 'idle',
        executionLogs: [],
    }),
}));

vi.mock('./hooks/usePersistence', () => ({
    usePersistence: () => ({
        worldName: 'Test World',
        setWorldName: vi.fn(),
        isGeneratingWorld: false,
        isSaving: false,
        isAutoSaving: false,
        savedWorlds: [],
        handleSaveWorld: vi.fn(),
        handleLoadWorld: vi.fn(),
        handleSyncWorld: vi.fn(),
        setShowNewWorldModal: vi.fn(),
        setShowSaveModal: vi.fn(),
        setShowLoadModal: vi.fn(),
    }),
}));

describe('App', () => {
    it('renders application title', async () => {
        render(
            <QueryClientProvider client={queryClient}>
                <GitHubProvider>
                    <App />
                </GitHubProvider>
            </QueryClientProvider>
        );

        // Debug DOM if failure persists
        // screen.debug();

        // Check for 'E' logo which is always present
        expect(screen.getAllByText('E')[0]).toBeInTheDocument();

        // Check for EcoNarrative text (might be multiple or hidden)
        // Using getAllByText to avoid "found multiple" error if both mobile/desktop exist
        const titles = screen.getAllByText('EcoNarrative');
        expect(titles.length).toBeGreaterThan(0);
    });
});
