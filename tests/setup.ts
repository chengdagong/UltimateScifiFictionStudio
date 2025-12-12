import { vi } from 'vitest';

Object.defineProperty(global, 'crypto', {
    value: {
        randomUUID: () => 'test-uuid-' + Math.random().toString(36).substring(2),
    },
});

window.alert = vi.fn(); // Mock alert because useWorldModel uses it
