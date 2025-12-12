import axios from 'axios';
import { WorldData, GitChange, GitLog } from '../types';

// Use relative path to leverage Vite proxy and axios default headers
const API_BASE_URL = '/api';

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
    } catch (error: any) {
        console.error("Error creating project:", error);
        // Extract error message from axios response
        const message = error.response?.data?.error || error.message || '未知错误';
        throw new Error(message);
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
    } catch (error: any) {
        console.error("Error saving project:", error);
        const message = error.response?.data?.error || error.message || '未知错误';
        throw new Error(message);
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

