import { Router } from "express";
import {
  redirectGoogleAuth,
  verifyGoogleAuth,
  redirectLichessAuth,
  verifyLichessAuth,
} from "../controllers/authController.js";

const router = Router();

router.get("/login_google", redirectGoogleAuth);
router.post("/login_google/verify", verifyGoogleAuth);
router.get("/login_lichess", redirectLichessAuth);
router.post("/login_lichess/verify_auth", verifyLichessAuth);

export default router;
