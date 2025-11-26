import jwt from 'jsonwebtoken';
import axios from 'axios';
const CENTRIFUGO_HMAC_SECRET = process.env.CENTRIFUGO_HMAC_SECRET
const CENTRIFUGO_HOST = process.env.CENTRIFUGO_HOST;
const CENTRIFUGO_API_KEY = process.env.CENTRIFUGO_API_KEY;
const CENTRIFUGO_CHAT_NAMESPACE = process.env.CENTRIFUGO_CHAT_NAMESPACE;


export const generateCentrifugoToken = () => {
    const channelName = process.env.CENTRIFUGO_CHAT_NAMESPACE;
    if (!CENTRIFUGO_HMAC_SECRET) {
        throw new Error("CENTRIFUGO_HMAC_SECRET is not defined in environment variables.");
    }

    const payload = {
        channels: [channelName]
    };
    return jwt.sign(payload, CENTRIFUGO_HMAC_SECRET, { algorithm: 'HS256' });
};

export const publishMessageToCentrifugo = async (data) => {
    if (!CENTRIFUGO_HOST || !CENTRIFUGO_API_KEY || !CENTRIFUGO_CHAT_NAMESPACE) {
        console.error("Centrifugo environment variables not set. Cannot publish message.");
        return;
    }
    try {
        await axios.post(
            `${CENTRIFUGO_HOST}/api`,
            {
                method: "publish",
                params: {
                    channel: process.env.CENTRIFUGO_CHAT_NAMESPACE,
                    data: data,
                },
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `apikey ${CENTRIFUGO_API_KEY}`,
                },
            }
        );
    } catch (error) {
        console.error("Error publishing message to Centrifugo:", error);
    }
};