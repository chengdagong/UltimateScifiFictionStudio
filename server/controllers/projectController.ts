import { Response } from 'express';
import * as projectService from '../services/projectService.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export const listProjects = async (req: AuthRequest, res: Response) => {
    try {
        const username = req.user!;
        const projects = await projectService.listProjects(username);
        res.json(projects);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

export const createProject = async (req: AuthRequest, res: Response) => {
    try {
        const username = req.user!;
        const projectData = req.body;
        if (!projectData.name) {
            return res.status(400).json({ error: 'Project name is required' });
        }

        const project = await projectService.createProject(username, projectData);
        res.status(201).json({ success: true, project });
    } catch (e: any) {
        if (e.message === 'Project already exists') {
            res.status(409).json({ error: 'Project already exists' });
        } else {
            res.status(500).json({ error: e.message });
        }
    }
};

export const getProject = async (req: AuthRequest, res: Response) => {
    try {
        const username = req.user!;
        const projectId = req.params.id;
        const project = await projectService.getProject(username, projectId);
        res.json(project);
    } catch (e: any) {
        if (e.message === 'Project not found') {
            res.status(404).json({ error: 'Project not found' });
        } else {
            res.status(500).json({ error: e.message });
        }
    }
};

export const updateProject = async (req: AuthRequest, res: Response) => {
    try {
        const username = req.user!;
        const projectId = req.params.id;
        const worldData = req.body;
        await projectService.updateProject(username, projectId, worldData);
        res.json({ success: true });
    } catch (e: any) {
        if (e.message === 'Project not found') {
            res.status(404).json({ error: 'Project not found' });
        } else {
            res.status(500).json({ error: e.message });
        }
    }
};

export const deleteProject = async (req: AuthRequest, res: Response) => {
    try {
        const username = req.user!;
        const projectId = req.params.id;
        await projectService.deleteProject(username, projectId);
        res.json({ success: true });
    } catch (e: any) {
        if (e.message === 'Project not found') {
            res.status(404).json({ error: 'Project not found' });
        } else {
            res.status(500).json({ error: e.message });
        }
    }
};
