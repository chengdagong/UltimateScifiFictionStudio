import { Response } from 'express';
import * as aiService from '../services/aiService.js';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { ApiSettings } from '../types/index.js';

const getSettings = (req: AuthRequest): ApiSettings => {
    return req.body.settings;
};

export const generateEntities = async (req: AuthRequest, res: Response) => {
    try {
        const settings = getSettings(req);
        const result = await aiService.generateEntitiesForLayer(settings, req.body.params);
        res.json({ result });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

export const importWorld = async (req: AuthRequest, res: Response) => {
    try {
        const settings = getSettings(req);
        const result = await aiService.importWorldFromText(settings, req.body.params);
        res.json({ result });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

export const generateWorld = async (req: AuthRequest, res: Response) => {
    try {
        const settings = getSettings(req);
        const result = await aiService.generateWorldFromScenario(settings, req.body.params);
        res.json({ result });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

export const executeAgent = async (req: AuthRequest, res: Response) => {
    try {
        const settings = getSettings(req);
        const result = await aiService.executeAgentTask(settings, req.body.params);
        res.json({ result });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

export const executeReview = async (req: AuthRequest, res: Response) => {
    try {
        const settings = getSettings(req);
        const result = await aiService.executeReviewTask(settings, req.body.params);
        res.json({ result });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

export const generateChronicle = async (req: AuthRequest, res: Response) => {
    try {
        const settings = getSettings(req);
        const result = await aiService.generateWorldChronicle(settings, req.body.params);
        res.json({ result });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

export const generateTech = async (req: AuthRequest, res: Response) => {
    try {
        const settings = getSettings(req);
        const result = await aiService.generateRelatedTechNode(settings, req.body.params);
        res.json({ result });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

export const generateCharacter = async (req: AuthRequest, res: Response) => {
    try {
        const settings = getSettings(req);
        const result = await aiService.generateCharacterProfile(settings, req.body.params);
        res.json({ result });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

export const extractEntities = async (req: AuthRequest, res: Response) => {
    try {
        const settings = getSettings(req);
        const result = await aiService.extractEntitiesFromSnippet(settings, req.body.params);
        res.json({ result });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};
