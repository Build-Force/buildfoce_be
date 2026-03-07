import { Router } from 'express';
import { submitSurvey, getLatestSurvey } from '../controllers/surveyController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

// /api/survey
router.post('/', authMiddleware, submitSurvey);
router.get('/latest', authMiddleware, getLatestSurvey);

export default {
    path: '/api/survey',
    router
};
