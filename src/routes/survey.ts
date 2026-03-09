import { RequestHandler, Router } from 'express';
import { submitSurvey, getLatestSurvey } from '../controllers/surveyController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

// /api/survey
router.post('/', authMiddleware as RequestHandler, submitSurvey);
router.get('/latest', authMiddleware as RequestHandler, getLatestSurvey);

export default {
    path: '/api/survey',
    router
};
