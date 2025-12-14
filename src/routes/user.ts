import express from "express";
import { userController } from "@/controllers/user";
import { adminAuthenticateToken, authenticateToken } from "@/middlewares/auth";

const router = express.Router();

// Public routes
router.post("/login", userController.login);
router.post("/register", userController.createUser);

// Protected routes
router.get("/me", authenticateToken, userController.getCurrentUser);
router.get("/validate-token", authenticateToken, userController.getCurrentUser);
router.get("/all", adminAuthenticateToken, userController.getAllUsers);
router.get("/:id", authenticateToken, userController.getUserById);
router.put("/:id", authenticateToken, userController.updateUser);
router.delete("/:id", authenticateToken, userController.deleteUser);

router.post("/logout", authenticateToken, userController.logout);
router.post("/cleanup-tokens", authenticateToken, userController.cleanupTokens);

export default router;
