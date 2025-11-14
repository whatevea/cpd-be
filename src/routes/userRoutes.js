import { Router } from "express";
import {
  getCheckoutStatus,
  postCheckout,
  refreshCheckoutState,
  updateUsername,
} from "../controllers/userController.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.get("/checkout", authenticate, getCheckoutStatus);
router.post("/checkout", authenticate, postCheckout);
router.post("/updateusername", authenticate, updateUsername);
router.get("/refresh", refreshCheckoutState);

export default router;
