import mongoose from "mongoose";

const userMessageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    messageType: {
      type: String,
      default: "text",
      enum: ["text", "game"],
    },
    gameDetail: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

userMessageSchema.index({ createdAt: -1 });

const UserMessage =
  mongoose.models.UserMessage ||
  mongoose.model("UserMessage", userMessageSchema);

export default UserMessage;
