import express from "express";
import { postController } from "@/controllers/post";
import { authenticateToken } from "@/middlewares/auth";

const router = express.Router();

router.use(authenticateToken);

router.get("/", postController.getAllPosts);
router.get("/:id", postController.getPostById);

router.post("/", postController.createPost);
router.put("/:id", postController.updatePost);
router.patch("/:id", postController.updatePost);
router.delete("/:id", postController.deletePost);

router.post("/:id/react", postController.reactPost);
router.patch("/:id/react", postController.updateReaction);
router.delete("/:id/react", postController.removeReaction);

router.post("/:id/comment", postController.addComment);
router.patch("/:id/comment/:commentId", postController.updateComment);
router.delete("/:id/comment/:commentId", postController.deleteComment);

export default router;
