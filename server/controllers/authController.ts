import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import * as authService from '../services/authService.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key_change_me';

export const register = async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Missing fields' });
        }

        await authService.registerUser(username, password);
        res.status(201).json({ success: true, username });
    } catch (e: any) {
        if (e.message === 'User exists') {
            res.status(409).json({ error: 'User exists' });
        } else {
            res.status(500).json({ error: e.message });
        }
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;
        const user = await authService.loginUser(username, password);

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        res.status(200).json({ token, username: user.username });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

export const verify = async (req: AuthRequest, res: Response) => {
    // Middleware has already verified the token and attached user to req
    if (req.user) {
        res.status(200).json({ username: req.user });
    } else {
        // Should not happen if middleware is used
        res.status(401).json({ error: 'Invalid token' });
    }
};
