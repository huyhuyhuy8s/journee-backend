import express from 'express';
import {authenticateToken} from '@/middlewares/auth';
import {updateLocation} from '@/controllers';

const router = express.Router();

router.use(authenticateToken);

router.post('/', updateLocation);

export default router;
