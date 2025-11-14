import crypto from "crypto";

const sanitizeUrl = (value, fallback = "") => {
  if (!value) return fallback;
  return value.endsWith("/") ? value.slice(0, -1) : value;
};

const FRONTEND_URL = sanitizeUrl(
  process.env.FRONTEND_URL,
  "http://localhost:3000"
);

const LICHESS_CLIENT_ID = process.env.LICHESS_CLIENT_ID || "cpd";
const LICHESS_OAUTH_URL = "https://lichess.org/oauth";

const generateCodeChallenge = (verifier) => {
  const hash = crypto.createHash("sha256").update(verifier).digest();
  return hash
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
};

export const buildLichessOAuthUrl = async () => {
  const codeVerifier = process.env.LICHESS_OAUTH_KEY;
  if (!codeVerifier) {
    throw new Error("LICHESS_OAUTH_KEY is not configured");
  }

  const codeChallenge = generateCodeChallenge(codeVerifier);
  const params = new URLSearchParams({
    client_id: LICHESS_CLIENT_ID,
    redirect_uri: `${FRONTEND_URL}/login/lichess`,
    state: "cpd_state",
    response_type: "code",
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    scope: "preference:read email:read puzzle:read",
  });

  return `${LICHESS_OAUTH_URL}?${params.toString()}`;
};

export const exchangeLichessCode = async (code) => {
  try {
    const response = await fetch("https://lichess.org/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: LICHESS_CLIENT_ID,
        code,
        redirect_uri: `${FRONTEND_URL}/login/lichess`,
        code_verifier: process.env.LICHESS_OAUTH_KEY,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lichess token error:", errorText);
      return {
        success: false,
        message: "Failed to exchange code for token",
      };
    }

    const tokenData = await response.json();
    return { success: true, access_token: tokenData.access_token };
  } catch (error) {
    console.error("getLichessToken error:", error);
    return { success: false, message: "Token exchange failed" };
  }
};

export const fetchLichessProfile = async (token) => {
  try {
    const response = await fetch("https://lichess.org/api/account", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Lichess profile error: ${response.status} ${errorText}`
      );
    }

    return response.json();
  } catch (error) {
    console.error("fetchLichessProfile error:", error);
    return null;
  }
};
