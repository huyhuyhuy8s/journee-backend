import express from "express";
import { locationController } from "@/controllers/location";
import { authenticateToken } from "@/middlewares/auth";

const router = express.Router();

router.use(authenticateToken);

router.post("/", locationController.updateLocation);
router.get("/", locationController.getTodayStatus);

export default router;
