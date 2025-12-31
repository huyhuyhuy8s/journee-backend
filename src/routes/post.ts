import express from 'express';
import {authenticateToken} from '@/middlewares/auth';
import {
  addComment,
  createPost,
  deleteComment,
  deletePost,
  getAllPosts,
  getPostById,
  reactPost,
  removeReaction,
  updateComment,
  updatePost,
  updateReaction
} from '@/controllers';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getAllPosts);
router.get('/:id', getPostById);

router.post('/', createPost);
router.patch('/:id', updatePost);
router.delete('/:id', deletePost);

router.post('/:id/react', reactPost);
router.patch('/:id/react', updateReaction);
router.delete('/:id/react', removeReaction);

router.post('/:id/comment', addComment);
router.patch('/:id/comment/:commentId', updateComment);
router.delete('/:id/comment/:commentId', deleteComment);

export default router;
