import mongoose from "mongoose";
import UserMessage from "../models/UserMessage.js";
import User from "../models/User.js";
import { llmreply } from "../services/aichat.js";
import { publishMessageToCentrifugo, generateCentrifugoToken } from "../utils/centrifugo.js";

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 60;
const MAX_MESSAGE_LENGTH = 600;
const ALLOWED_MESSAGE_TYPES = new Set(["text", "game"]);
const AI_USER_ID = "67a04645ca79d244162b407e";

const buildMessagePayload = (doc, fallbackUser) => {
  const user =
    doc.user && typeof doc.user === "object"
      ? {
        _id: doc.user._id?.toString(),
        username: doc.user.username,
      }
      : fallbackUser;

  return {
    _id: doc._id?.toString(),
    user,
    message: doc.message,
    messageType: doc.messageType,
    gameDetail: doc.gameDetail || {},
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

const respondWithAi = async (rawMessage) => {
  try {
    const answer = await llmreply(rawMessage);
    if (!answer) {
      return;
    }

    const aiMessage = await UserMessage.create({
      user: AI_USER_ID,
      message: answer,
      messageType: "text",
    });

    const payload = buildMessagePayload(aiMessage, {
      _id: AI_USER_ID,
      username: "AI Assistant",
    });

    await publishMessageToCentrifugo(payload);
  } catch (error) {
    console.error("AI response failed:", error);
  }
};

export const getMessages = async (req, res) => {
  try {
    const { before, limit: limitParam } = req.query;
    const requestedLimit = Number(limitParam);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), MAX_LIMIT)
      : DEFAULT_LIMIT;

    if (before && !mongoose.Types.ObjectId.isValid(before)) {
      return res.status(400).json({ message: "Invalid cursor." });
    }

    const query = {};
    if (before) {
      query._id = { $lt: new mongoose.Types.ObjectId(before) };
    }

    const ifNoneMatch = req.headers["if-none-match"];

    const messages = await UserMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("user", "username")
      .lean()
      .maxTimeMS(5000);

    const latestMessageId = !before ? messages[0]?._id?.toString() : undefined;
    if (!before && ifNoneMatch && latestMessageId === ifNoneMatch) {
      return res.status(304).set({ ETag: latestMessageId }).end();
    }

    const hasMore = messages.length === limit;
    const nextCursor = hasMore
      ? messages[messages.length - 1]?._id?.toString()
      : null;

    const payload = {
      messages,
      meta: {
        hasMore,
        nextCursor,
        limit,
        latestMessageId,
      },
    };

    const headers = {
      "Cache-Control": "no-cache",
      "Content-Type": "application/json",
    };
    if (latestMessageId) {
      headers.ETag = latestMessageId;
    }

    return res.status(200).set(headers).json(payload);
  } catch (error) {
    console.error("Message fetch error:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch messages" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const rawMessage =
      typeof req.body.message === "string" ? req.body.message.trim() : "";

    if (!rawMessage) {
      return res
        .status(400)
        .json({ message: "Message cannot be empty." });
    }

    if (rawMessage.length > MAX_MESSAGE_LENGTH) {
      return res.status(413).json({
        message: `Messages are limited to ${MAX_MESSAGE_LENGTH} characters.`,
      });
    }

    const messageType = ALLOWED_MESSAGE_TYPES.has(req.body.messageType)
      ? req.body.messageType
      : "text";

    const gameDetail =
      messageType === "game" && req.body.gameDetail
        ? req.body.gameDetail
        : undefined;

    const newMessage = await UserMessage.create({
      user: req.user.id,
      message: rawMessage,
      messageType,
      gameDetail,
    });

    const userDetails = await User.findById(req.user.id).select("username");
    const payload = buildMessagePayload(newMessage, {
      _id: req.user.id,
      username: userDetails?.username || req.user.username || "Anonymous Player",
    });

    await publishMessageToCentrifugo(payload);

    const aiQuery = rawMessage.match(/^@ai\s+(.+)/i)?.[1]?.trim();
    if (aiQuery) {
      respondWithAi(aiQuery);
    }

    return res.status(201).json(payload);
  } catch (error) {
    console.error("Failed to send message:", error);
    return res
      .status(500)
      .json({ message: "Unable to send message right now." });
  }
};

export const get_connection_token = async (req, res) => {

  const token = generateCentrifugoToken();
  res.status(200).json({ token });

};

