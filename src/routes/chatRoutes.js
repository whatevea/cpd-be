import { Router } from "express";
import {
  getMessages,
  sendMessage,
  get_connection_token
} from "../controllers/chatController.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.get("/getMessages", getMessages);
router.post("/sendMessage", authenticate, sendMessage);
router.get("/get_connection_token", get_connection_token)
export default router;
