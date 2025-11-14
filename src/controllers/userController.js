import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";

const TOKEN_TTL = process.env.JWT_EXPIRES_IN || "7d";

const signUserToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: TOKEN_TTL,
  });

const calculateAuthScore = (userData = {}) => {
  let score = 0;
  const createdAt = userData.createdAt
    ? new Date(userData.createdAt).getTime()
    : Date.now();
  const accountAgeYears = (Date.now() - createdAt) / (1000 * 60 * 60 * 24 * 365);
  score += Math.min(accountAgeYears * 10, 30);

  const totalGames = userData.count?.all || 0;
  score += Math.min(totalGames / 100, 40);

  if (userData.perfs?.puzzle?.rating) {
    score += Math.min((userData.perfs.puzzle.rating / 2000) * 30, 30);
  }

  return Math.round(score);
};

export const handleLichessAuth = async (lichessData = {}) => {
  let isNew = false;
  try {
    if (!lichessData.user?.id) {
      return { success: false, message: "Invalid Lichess data" };
    }

    const username = lichessData.user.id;
    let user = await User.findOne({ lichessUsername: username });
    if (!user) {
      isNew = true;
      user = await User.create({
        username,
        lichessUsername: username,
        oauthProvider: "lichess",
        userAuthencityScore: calculateAuthScore(lichessData.user),
      });
    }

    const token = signUserToken({
      id: user._id,
      username: user.username,
      lichessUsername: user.lichessUsername,
    });

    return { success: true, token, user, isNew };
  } catch (error) {
    return {
      success: false,
      message: error.message || "Authentication failed",
    };
  }
};

export const handleGoogleAuth = async (googleData = {}) => {
  let isNew = false;
  try {
    if (!googleData.email) {
      return { success: false, message: "Invalid Google data" };
    }

    const username = googleData.email.split("@")[0];
    let user = await User.findOne({ googleEmail: googleData.email });
    if (!user) {
      isNew = true;
      user = await User.create({
        username,
        googleEmail: googleData.email,
        oauthProvider: "google",
      });
    }

    const token = signUserToken({
      id: user._id,
      username: user.username,
      email: user.googleEmail,
    });

    return { success: true, token, user, isNew };
  } catch (error) {
    return {
      success: false,
      message: error.message || "Authentication failed",
    };
  }
};

const findUserAccount = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return null;
  }
  return User.findById(userId);
};

export const getCheckoutStatus = async (req, res) => {
  try {
    const userDoc = await findUserAccount(req.user.id);
    if (!userDoc) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.json({
      success: true,
      checkoutDayStreak: userDoc.checkoutStreak,
      didCheckoutToday: userDoc.didCheckOutToday,
    });
  } catch (error) {
    console.error("Checkout status error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch checkout state" });
  }
};

export const postCheckout = async (req, res) => {
  try {
    const userDoc = await findUserAccount(req.user.id);
    if (!userDoc) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (userDoc.didCheckOutToday) {
      return res.json({
        success: false,
        message: "You checked out today already",
      });
    }

    const bonusDay =
      userDoc.checkoutStreak === 6 || userDoc.checkoutStreak === 7;
    userDoc.userPoints += bonusDay ? 5 : 1;
    userDoc.didCheckOutToday = true;
    const nextStreak = userDoc.checkoutStreak + 1;
    userDoc.checkoutStreak = nextStreak === 8 ? 1 : nextStreak;
    await userDoc.save();

    return res.json({
      success: true,
      message: "Successfully checked out today",
      totalCoins: userDoc.userPoints,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to checkout right now" });
  }
};

export const updateUsername = async (req, res) => {
  try {
    const { username = "" } = req.body;
    if (!username) {
      return res
        .status(400)
        .json({ success: false, message: "Username is required" });
    }

    if (!/^[a-zA-Z0-9]{5,}$/.test(username)) {
      return res.status(400).json({
        success: false,
        message:
          "Username must be at least 5 characters long and contain only letters and numbers",
      });
    }

    if (await User.exists({ username })) {
      return res
        .status(409)
        .json({ success: false, message: "Username is already taken" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { username },
      { new: true }
    );

    return res.json({
      success: true,
      message: "Username updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Failed to update username:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const refreshCheckoutState = async (req, res) => {
  try {
    const users = await User.find({});
    await Promise.all(
      users.map(async (user) => {
        if (!user.didCheckOutToday) {
          user.checkoutStreak = 0;
        }
        user.didCheckOutToday = false;
        return user.save();
      })
    );

    return res.json({
      success: true,
      message: "User checkout streaks updated successfully",
      usersProcessed: users.length,
    });
  } catch (error) {
    console.error("Error updating checkout streaks:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update user checkout streaks",
    });
  }
};
