import axios from 'axios';
import { WorldData } from '../types';

// The backend runs on port 5001 (as configured in server.js)
const API_BASE_URL = 'http://localhost:5001/api';

export const saveWorld = async (worldData: WorldData): Promise<string> => {
    try {
        // If it's a new world without ID, generate one
        if (!worldData.id) {
            worldData.id = crypto.randomUUID();
        }

        const response = await axios.post<{ id: string, success: true }>(`${API_BASE_URL}/worlds`, worldData);
        if (response.data.success) {
            return response.data.id || worldData.id;
        } else {
            throw new Error('Server returned unsuccessful status');
        }
    } catch (error) {
        console.error("Error saving world locally:", error);
        throw error;
    }
};

export const getWorlds = async (): Promise<WorldData[]> => {
    try {
        const response = await axios.get<WorldData[]>(`${API_BASE_URL}/worlds`);
        return response.data;
    } catch (error) {
        console.error("Error fetching worlds locally:", error);
        // Return empty array if backend is down or empty, so app doesn't crash
        return [];
    }
};

export const getWorldById = async (id: string): Promise<WorldData | null> => {
    // Current implementation of GET /api/worlds returns all.
    // We can implement client-side filter or add specific endpoint.
    // For now, let's fetch all and find. 
    // Optimization Todo: Implement GET /api/worlds/:id in backend if list is large.
    try {
        const worlds = await getWorlds();
        return worlds.find(w => w.id === id) || null;
    } catch (error) {
        console.error("Error fetching world by ID:", error);
        return null;
    }
};

export const deleteWorld = async (id: string): Promise<void> => {
    try {
        await axios.delete(`${API_BASE_URL}/worlds/${id}`);
    } catch (error) {
        console.error("Error deleting world locally:", error);
        throw error;
    }
};
