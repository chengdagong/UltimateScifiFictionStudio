import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiSettings } from '../types';

const STORAGE_KEY = 'ecoNarrative_apiSettings';

const DEFAULT_SETTINGS: ApiSettings = {
    provider: 'google',
    apiKey: process.env.API_KEY || '',
    baseUrl: '',
    model: 'gemini-2.5-flash',
    minimalUI: false
};

// Helper for local storage
const getLocalSettings = (): ApiSettings => {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
            } catch (e) {
                console.error("Failed to parse settings from local storage", e);
            }
        }
    }
    return DEFAULT_SETTINGS;
};

export const useApiSettings = () => {
    const queryClient = useQueryClient();
    const [showSettingsModal, setShowSettingsModal] = useState(false);

    // Query for server settings with Local Storage as Initial Data
    const { data: apiSettings } = useQuery({
        queryKey: ['apiSettings'],
        queryFn: async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            try {
                const res = await fetch('/api/config', { signal: controller.signal });
                if (!res.ok) throw new Error("Backend not available");
                const serverData = await res.json();

                // Merge and save to local
                if (serverData && Object.keys(serverData).length > 0) {
                    const merged = { ...getLocalSettings(), ...serverData };
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
                    return merged;
                }
            } catch (err) {
                // Convert error to string for logging to avoid object issues
                const errorMessage = err instanceof Error ? err.message : String(err);
                console.info("Running in standalone mode (no backend config found):", errorMessage);
            } finally {
                clearTimeout(timeoutId);
            }
            // If fetch fails or has no data, return local settings (which acts as the source of truth in standalone)
            return getLocalSettings();
        },
        initialData: getLocalSettings,
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });

    // Mutation for updating settings with Optimistic Updates
    const saveMutation = useMutation({
        mutationFn: async (newSettings: ApiSettings) => {
            await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSettings)
            });
        },
        onMutate: async (newSettings) => {
            // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
            await queryClient.cancelQueries({ queryKey: ['apiSettings'] });

            // Snapshot the previous value
            const previousSettings = queryClient.getQueryData<ApiSettings>(['apiSettings']);

            // Optimistically update to the new value
            queryClient.setQueryData(['apiSettings'], newSettings);

            // Sync to Local Storage immediately
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));

            // Return a context object with the snapshotted value
            return { previousSettings };
        },
        onError: (err, newSettings, context) => {
            // If the mutation fails, use the context returned from onMutate to roll back
            if (context?.previousSettings) {
                queryClient.setQueryData(['apiSettings'], context.previousSettings);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(context.previousSettings));
            }
        },
        onSettled: () => {
            // Always refetch after error or success to ensure server sync (optional, can be skipped to avoid overwriting if server is laggy)
            // queryClient.invalidateQueries({ queryKey: ['apiSettings'] });
        }
    });

    const updateSettings = (newSettings: ApiSettings) => {
        saveMutation.mutate(newSettings);
    };

    const toggleMinimalUI = () => {
        if (apiSettings) {
            updateSettings({ ...apiSettings, minimalUI: !apiSettings.minimalUI });
        }
    };

    const checkApiKey = () => {
        if (!apiSettings?.apiKey) {
            setShowSettingsModal(true);
            return false;
        }
        return true;
    };

    return {
        apiSettings: apiSettings || DEFAULT_SETTINGS,
        setApiSettings: updateSettings,
        showSettingsModal,
        setShowSettingsModal,
        toggleMinimalUI,
        checkApiKey
    };
};
