import { handleGoogleAuth, handleLichessAuth } from "./userController.js";
import {
  buildLichessOAuthUrl,
  exchangeLichessCode,
  fetchLichessProfile,
} from "../services/lichessOAuth.js";

// Removed sanitizeUrl function and fallback logic.
const FRONTEND_URL = process.env.FRONTEND_URL;

const GOOGLE_ENDPOINT =
  process.env.GOOGLE_OAUTH_ENDPOINT ||
  "https://accounts.google.com/o/oauth2/v2/auth";

const GOOGLE_SCOPE = [
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

const exchangeGoogleCodeForTokens = async (code) => {
  if (!FRONTEND_URL) {
    throw new Error("FRONTEND_URL environment variable is not set.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${FRONTEND_URL}/login/google`,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to exchange Google code: ${response.status} ${errorText}`
    );
  }

  return response.json();
};

const fetchGoogleProfile = async (accessToken) => {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch Google profile: ${response.status} ${errorText}`
    );
  }

  return response.json();
};

export const redirectGoogleAuth = (req, res) => {
  if (!FRONTEND_URL) {
    console.error("FRONTEND_URL environment variable is not set.");
    return res.status(500).json({ success: false, message: "Server misconfiguration: Frontend URL is missing." });
  }

  const url = new URL(GOOGLE_ENDPOINT);
  url.search = new URLSearchParams({
    redirect_uri: `${FRONTEND_URL}/login/google`,
    client_id: process.env.GOOGLE_CLIENT_ID,
    access_type: "offline",
    response_type: "code",
    prompt: "consent",
    scope: GOOGLE_SCOPE,
  }).toString();
  return res.redirect(url.toString());
};

export const verifyGoogleAuth = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res
        .status(400)
        .json({ success: false, message: "Authorization code is required" });
    }

    // exchangeGoogleCodeForTokens handles the FRONTEND_URL check now.
    const tokens = await exchangeGoogleCodeForTokens(code);
    const profile = await fetchGoogleProfile(tokens.access_token);
    const loginResult = await handleGoogleAuth(profile);

    if (!loginResult.success) {
      return res
        .status(401)
        .json({ success: false, message: loginResult.message });
    }

    return res.json({
      success: true,
      token: loginResult.token,
      user: loginResult.user,
      isNew: loginResult.isNew,
    });
  } catch (error) {
    console.error("Google verify error:", error);
    if (error.message.includes("FRONTEND_URL")) {
      return res.status(500).json({ success: false, message: "Server misconfiguration: Frontend URL is missing." });
    }
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const redirectLichessAuth = async (req, res) => {
  try {
    const url = await buildLichessOAuthUrl();
    return res.redirect(url);
  } catch (error) {
    console.error("Lichess redirect error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to start Lichess login" });
  }
};

export const verifyLichessAuth = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res
        .status(400)
        .json({ success: false, message: "Authorization code is required" });
    }

    const tokenResponse = await exchangeLichessCode(code);
    if (!tokenResponse.success) {
      return res.status(401).json(tokenResponse);
    }

    const profile = await fetchLichessProfile(tokenResponse.access_token);
    if (!profile) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to fetch user information" });
    }

    const loginResult = await handleLichessAuth({ user: profile });
    if (!loginResult.success) {
      return res
        .status(401)
        .json({ success: false, message: loginResult.message });
    }

    return res.json({
      success: true,
      token: loginResult.token,
      user: loginResult.user,
      isNew: loginResult.isNew,
    });
  } catch (error) {
    console.error("Lichess verify error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};