import { Router } from 'express';
import { SearchController } from '../controllers/searchController';
import { authenticate } from '../middleware/auth';

const router = Router();
const searchController = new SearchController();

router.get('/', authenticate, searchController.search);
router.get('/tags', authenticate, searchController.getTags);

export default router;