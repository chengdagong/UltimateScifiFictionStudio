import axios from 'axios';
import { WorldData, GitChange, GitLog } from '../types';

// The backend runs on port 5001 (as configured in server.js)
const API_BASE_URL = 'http://localhost:5001/api';

// ===== Project API Functions =====

/**
 * Get all projects for the authenticated user
 */
export const getProjects = async (): Promise<WorldData[]> => {
    try {
        const response = await axios.get<WorldData[]>(`${API_BASE_URL}/projects`);
        return response.data;
    } catch (error) {
        console.error("Error fetching projects:", error);
        // Return empty array if backend is down or empty, so app doesn't crash
        return [];
    }
};

/**
 * Create a new project
 */
export const createProject = async (worldData: WorldData): Promise<string> => {
    try {
        const response = await axios.post<{ project: { id: string } }>(`${API_BASE_URL}/projects`, worldData);
        return response.data.project.id;
    } catch (error) {
        console.error("Error creating project:", error);
        throw error;
    }
};

/**
 * Get a specific project by ID
 */
export const getProject = async (id: string): Promise<WorldData | null> => {
    try {
        const response = await axios.get<WorldData>(`${API_BASE_URL}/projects/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching project by ID:", error);
        return null;
    }
};

/**
 * Save/update an existing project
 */
export const saveProject = async (worldData: WorldData): Promise<string> => {
    try {
        if (!worldData.id) {
            throw new Error('Project ID is required for saving');
        }

        await axios.put<{ success: boolean }>(`${API_BASE_URL}/projects/${worldData.id}`, worldData);
        return worldData.id;
    } catch (error) {
        console.error("Error saving project:", error);
        throw error;
    }
};

/**
 * Delete a project
 */
export const deleteProject = async (id: string): Promise<void> => {
    try {
        await axios.delete(`${API_BASE_URL}/projects/${id}`);
    } catch (error) {
        console.error("Error deleting project:", error);
        throw error;
    }
};

// ===== Project-Level Git Operations =====

/**
 * Initialize Git repository for a project
 */
export const initProjectGit = async (projectId: string): Promise<void> => {
    try {
        await axios.post(`${API_BASE_URL}/projects/${projectId}/git/init`);
    } catch (error) {
        console.error("Error initializing project Git:", error);
        throw error;
    }
};

/**
 * Get Git status for a project
 */
export const getProjectGitStatus = async (projectId: string): Promise<GitChange[]> => {
    try {
        const response = await axios.get<{ changes: GitChange[] }>(`${API_BASE_URL}/projects/${projectId}/git/status`);
        return response.data.changes || [];
    } catch (error) {
        console.error("Error getting project Git status:", error);
        return [];
    }
};

/**
 * Commit changes in a project
 */
export const commitProject = async (projectId: string, message: string): Promise<void> => {
    try {
        await axios.post(`${API_BASE_URL}/projects/${projectId}/git/commit`, { message });
    } catch (error) {
        console.error("Error committing project:", error);
        throw error;
    }
};

/**
 * Get Git log for a project
 */
export const getProjectGitLog = async (projectId: string): Promise<GitLog[]> => {
    try {
        const response = await axios.get<{ logs: GitLog[] }>(`${API_BASE_URL}/projects/${projectId}/git/log`);
        return response.data.logs || [];
    } catch (error) {
        console.error("Error getting project Git log:", error);
        return [];
    }
};

// ===== Legacy API Functions (Backward Compatibility) =====

/**
 * @deprecated Use saveProject instead
 */
export const saveWorld = async (worldData: WorldData): Promise<string> => {
    try {
        // If it's a new world without ID, create it
        if (!worldData.id) {
            // Generate a temporary ID for the creation
            worldData.id = crypto.randomUUID();
            return await createProject(worldData);
        }

        // Otherwise, update existing project
        return await saveProject(worldData);
    } catch (error) {
        console.error("Error saving world (legacy):", error);
        throw error;
    }
};

/**
 * @deprecated Use getProjects instead
 */
export const getWorlds = async (): Promise<WorldData[]> => {
    return await getProjects();
};

/**
 * @deprecated Use getProject instead
 */
export const getWorldById = async (id: string): Promise<WorldData | null> => {
    return await getProject(id);
};

/**
 * @deprecated Use deleteProject instead
 */
export const deleteWorld = async (id: string): Promise<void> => {
    return await deleteProject(id);
};
