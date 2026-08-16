const { gmd } = require("../meshtech");
const axios = require("axios");

const LINKED_GPT_ENDPOINT = "https://gpt-3-5.apis-bj-devs.workers.dev/";
const POLLINATIONS_BASE_URL = process.env.POLLINATIONS_BASE_URL || "https://gen.pollinations.ai/v1";

async function queryPollinations(query) {
  const apiKey = process.env.POLLINATIONS_API_KEY || process.env.POLLINATIONS_KEY;
  if (!apiKey) throw new Error("POLLINATIONS_API_KEY is not configured");
  const { data } = await axios.post(`${POLLINATIONS_BASE_URL}/chat/completions`, {
    model: process.env.POLLINATIONS_MODEL || "openai",
    messages: [{ role: "user", content: query }],
  }, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    timeout: 60000,
  });
  const answer = data?.choices?.[0]?.message?.content;
  if (!answer) throw new Error("Pollinations returned no text response");
  return answer;
}

async function queryLinkedGpt(query) {
  const { data } = await axios.get(LINKED_GPT_ENDPOINT, {
    params: { prompt: query },
    timeout: 30000,
  });
  if (!data?.status || !data?.reply) throw new Error("Linked GPT endpoint returned no reply");
  return data.reply;
}

async function queryAI(endpoint, query, conText) {
  const { reply, GiftedTechApi, GiftedApiKey } = conText;

  if (!query) {
    return reply("Please provide a question or prompt.");
  }

  try {
    const apiUrl = `${GiftedTechApi}/api/ai/${endpoint}?apikey=${GiftedApiKey}&q=${encodeURIComponent(query)}`;
    const res = await axios.get(apiUrl, { timeout: 100000 });

    if (!res.data?.success || !res.data?.result) {
      throw new Error("Primary AI endpoint returned no result");
    }

    return reply(res.data.result);
  } catch (err) {
    console.error(`AI ${endpoint} primary endpoint error:`, err.message);

    try {
      const pollinations = await queryPollinations(query);
      return reply(pollinations);
    } catch (pollinationsError) {
      console.error("Pollinations fallback error:", pollinationsError.message);
    }

    if (endpoint === "gpt") {
      try {
        const fallback = await queryLinkedGpt(query);
        return reply(fallback);
      } catch (fallbackError) {
        console.error("Linked GPT fallback error:", fallbackError.message);
      }
    }
    return reply("Error: " + err.message);
  }
}

gmd(
  {
    pattern: "meshtechai",
    aliases: ["ai"],
    description: "Chat with Mesh Tech AI assistant",
    category: "Ai",
    filename: __filename,
  },
  async (from, Gifted, conText) => {
    await queryAI("ai", conText.q || "say hello to mesh tech", conText);
  },
);

gmd(
  {
    pattern: "chatai",
    description: "General AI chat assistant",
    category: "Ai",
    filename: __filename,
  },
  async (from, Gifted, conText) => {
    await queryAI("chat", conText.q, conText);
  },
);

gmd(
  {
    pattern: "gpt",
    aliases: ["chatgpt"],
    description: "Chat with GPT model",
    category: "Ai",
    filename: __filename,
  },
  async (from, Gifted, conText) => {
    await queryAI("gpt", conText.q, conText);
  },
);

gmd(
  {
    pattern: "gpt4",
    aliases: ["chatgpt4"],
    description: "Chat with GPT-4 model",
    category: "Ai",
    filename: __filename,
  },
  async (from, Gifted, conText) => {
    await queryAI("gpt4", conText.q, conText);
  },
);

gmd(
  {
    pattern: "gpt4o",
    aliases: ["chatgpt4o"],
    description: "Chat with GPT-4o model",
    category: "Ai",
    filename: __filename,
  },
  async (from, Gifted, conText) => {
    await queryAI("gpt4o", conText.q, conText);
  },
);

gmd(
  {
    pattern: "gpt4o-mini",
    aliases: ["chatgpt4o-mini"],
    description: "Chat with GPT-4o Mini (faster)",
    category: "Ai",
    filename: __filename,
  },
  async (from, Gifted, conText) => {
    await queryAI("gpt4o-mini", conText.q, conText);
  },
);

gmd(
  {
    pattern: "openai",
    description: "Chat with OpenAI model",
    category: "Ai",
    filename: __filename,
  },
  async (from, Gifted, conText) => {
    await queryAI("openai", conText.q, conText);
  },
);

gmd(
  {
    pattern: "gemini",
    description: "Chat with Google Gemini",
    category: "Ai",
    filename: __filename,
  },
  async (from, Gifted, conText) => {
    await queryAI("geminiai", conText.q, conText);
  },
);


gmd(
  {
    pattern: "venice",
    aliases: ["veniceai"],
    description: "Chat with Venice AI model",
    category: "Ai",
    filename: __filename,
  },
  async (from, Gifted, conText) => {
    await queryAI("mistral", conText.q, conText);
  },
);

gmd(
  {
    pattern: "letmegpt",
    description: "Simple GPT-style AI chat",
    category: "Ai",
    filename: __filename,
  },
  async (from, Gifted, conText) => {
    await queryAI("letmegpt", conText.q, conText);
  },
);
