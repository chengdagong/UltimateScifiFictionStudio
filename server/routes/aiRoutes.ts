import express from 'express';
import * as aiController from '../controllers/aiController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/generate-entities', aiController.generateEntities);
router.post('/import-world', aiController.importWorld);
router.post('/generate-world', aiController.generateWorld);
router.post('/execute-agent', aiController.executeAgent);
router.post('/execute-review', aiController.executeReview);
router.post('/generate-chronicle', aiController.generateChronicle);
router.post('/generate-tech', aiController.generateTech);
router.post('/generate-character', aiController.generateCharacter);
router.post('/extract-entities', aiController.extractEntities);

export default router;
