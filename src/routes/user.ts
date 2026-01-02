import express from 'express';
import {adminAuthenticateToken, authenticateToken} from '@/middlewares/auth';
import {
  cleanupTokens,
  createUser,
  deactivateUser,
  deleteUser,
  getAllUsers,
  getCurrentUser,
  getUserById,
  login,
  logout,
  updateUser,
  validateToken
} from '@/controllers';

const router = express.Router();

router.post('/login', login);
router.post('/register', createUser);

router.get('/me', authenticateToken, getCurrentUser);
router.get('/validate-token', authenticateToken, getCurrentUser);
router.get('/all', adminAuthenticateToken, getAllUsers);
router.get('/:id', authenticateToken, getUserById);
router.put('/:id', authenticateToken, updateUser);
router.delete('/:id', adminAuthenticateToken, deleteUser);

router.post('/logout', authenticateToken, logout);
router.post('/deactivate/:id', adminAuthenticateToken, deactivateUser);
router.post('/validate', authenticateToken, validateToken);
router.post('/cleanup-tokens', adminAuthenticateToken, cleanupTokens);

export default router;
