import express from 'express';
import * as projectController from '../controllers/projectController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import gitRoutes from './gitRoutes.js';

const router = express.Router();

router.use(authenticateToken); // Protect all project routes

// Mount Git routes
router.use('/:id/git', gitRoutes);

router.get('/', projectController.listProjects);
router.post('/', projectController.createProject);
router.get('/:id', projectController.getProject);
router.put('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);

export default router;
