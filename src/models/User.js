import mongoose from "mongoose";

const preferencesSchema = new mongoose.Schema(
  {
    theme: { type: String, default: "light" },
    sound: { type: String, default: "on" },
    language: { type: String, default: "en" },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    oauthProvider: {
      type: String,
      required: true,
      enum: ["google", "lichess"],
    },
    preferences: {
      type: preferencesSchema,
      default: () => ({}),
    },
    lichessUsername: {
      type: String,
    },
    googleEmail: {
      type: String,
    },
    userAuthencityScore: {
      type: Number,
      default: 0,
    },
    userPoints: {
      type: Number,
      default: 0,
    },
    checkoutStreak: {
      type: Number,
      default: 0,
    },
    didCheckOutToday: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
