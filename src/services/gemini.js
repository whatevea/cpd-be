import UserMessage from "../models/UserMessage.js";
const systemPrompt = `You are AI Chatbot and can answer chess related question.Max words 200 ,only plan text no markdown.`;
const contextRequest = `If you dont understand the question it might be because you lack context i.e Old Message, in that case reply exact phrase "CONTEXT NEEDED"`;
const callGemini = async (prompt) => {
    const API_KEY = process.env.GEMINI_API_KEY;
    const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                tools: [{ "googleSearch": {} }]
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Gemini API request failed:", response.status, errorBody);
            throw new Error(`Gemini API request failed with status ${response.status}`);
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return ""; // Return empty string on error
    }
};

export const llmreply = async (query) => {
    const initialPrompt = `Context : ${systemPrompt + contextRequest} Question : ${query}`;
    const answer = await callGemini(initialPrompt);

    if (answer.includes("CONTEXT NEEDED")) {
        const lastMessages = await getLastMessages();
        const messageHistory = lastMessages.map(msg => `${msg.message}`).join('\n');
        const contextualPrompt = `Context : ${systemPrompt}\nPrevious conversation:\n${messageHistory}\nQuestion : ${query}`;
        return await callGemini(contextualPrompt);
    }

    return answer;
};

const getLastMessages = async () => {
    try {
        const messages = await UserMessage.find()
            .sort({ createdAt: -1 })
            .select("message")
            .limit(3)
            .skip(1)
            .lean()
            .maxTimeMS(5000);
        return messages.reverse();
    } catch (error) {
        console.error("Error fetching last messages:", error);
        return [];
    }
};

export default getLastMessages;
