import express from 'express';
import * as gitController from '../controllers/gitController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router({ mergeParams: true });

router.use(authenticateToken);

router.post('/init', gitController.initGit);
router.get('/status', gitController.getStatus);
router.post('/commit', gitController.commit);
router.get('/log', gitController.getLog);

export default router;
