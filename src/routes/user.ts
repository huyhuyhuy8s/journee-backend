import express from "express";
import {userController} from "@/controllers/user";
import {adminAuthenticateToken, authenticateToken} from "@/middlewares/auth";

const router = express.Router();
const {
  login,
  createUser,
  getCurrentUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  logout,
  cleanupTokens,
  deactivateUser,
  validateToken
} = userController;

// Public routes
router.post("/login", login);
router.post("/register", createUser);

// Protected routes
router.get("/me", authenticateToken, getCurrentUser);
router.get("/validate-token", authenticateToken, getCurrentUser);
router.get("/all", adminAuthenticateToken, getAllUsers);
router.get("/:id", authenticateToken, getUserById);
router.put("/:id", authenticateToken, updateUser);
router.delete("/:id", authenticateToken, deleteUser);

router.post("/logout", authenticateToken, logout);
router.post("/deactivate/:id", authenticateToken, deactivateUser);
router.post('/validate', authenticateToken, validateToken)
router.post("/cleanup-tokens", authenticateToken, cleanupTokens);

export default router;
