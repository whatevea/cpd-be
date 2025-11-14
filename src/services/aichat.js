import { OpenRouter } from '@openrouter/sdk';
import UserMessage from "../models/UserMessage.js";

const openRouter = new OpenRouter({
  apiKey: process.env.OPEN_ROUTER_KEY,
});
const systemPrompt = `You are AI Chatbot and can answer chess related question, your knowledge is cut off July 2024.Max words 200 ,only plan text no markdown.`
const contextRequest = `If you dont understand the question it might be because you lack context i.e Old Message, in that case reply exact phrase "CONTEXT NEEDED"`

export const llmreply = async (query) => {

  const completion = await openRouter.chat.send({
    model: process.env.OPEN_ROUTER_MODEL,
    messages: [
      {
        role: 'user',
        content: `Context : ${systemPrompt + contextRequest} Question : ${query}`,
      },
    ],
    stream: false,
  });

  const answer = completion.choices[0].message.content;
  if (answer.includes("CONTEXT NEEDED")) {
    const lastMessages = await getLastMessages();
    const messageHistory = lastMessages.map(msg => `${msg.message}`).join('\n');
    const contextualCompletion = await openRouter.chat.send({
      model: process.env.OPEN_ROUTER_MODEL,
      messages: [
        {
          role: 'user',
          content: `Context : ${systemPrompt}\nPrevious conversation:\n${messageHistory}\nQuestion : ${query}`,
        },
      ],
      stream: false,
    });
    return contextualCompletion.choices[0].message.content;
  }
  return answer;

}

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
    console.error("Error fetching last six messages:", error);
    return [];
  }
};
export default getLastMessages