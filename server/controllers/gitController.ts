import { Response } from 'express';
import * as gitService from '../services/gitService.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export const initGit = async (req: AuthRequest, res: Response) => {
    try {
        const username = req.user!;
        const projectId = req.params.id;
        await gitService.initGit(username, projectId);
        res.json({ success: true, message: 'Git repository initialized' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

export const getStatus = async (req: AuthRequest, res: Response) => {
    try {
        const username = req.user!;
        const projectId = req.params.id;
        const changes = await gitService.getGitStatus(username, projectId);
        res.json({ changes });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

export const commit = async (req: AuthRequest, res: Response) => {
    try {
        const username = req.user!;
        const projectId = req.params.id;
        const { message } = req.body;
        await gitService.commitChanges(username, projectId, message);
        res.json({ success: true, message: 'Changes committed' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

export const getLog = async (req: AuthRequest, res: Response) => {
    try {
        const username = req.user!;
        const projectId = req.params.id;
        const logs = await gitService.getGitLog(username, projectId);
        res.json({ logs });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};
