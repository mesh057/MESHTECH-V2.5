const { gmd } = require("../meshtech");
const axios = require("axios");

const FALLBACKS = [
  { url: "https://gpt-3-5.apis-bj-devs.workers.dev/", param: "prompt", type: "bj" },
  { url: "https://api.siputzx.my.id/api/ai/gptoss120b", param: "prompt", type: "siputzx" },
  { url: "https://api.siputzx.my.id/api/ai/duckai", param: "message", type: "siputzx" }
];

function isUsefulResult(value) {
  if (typeof value !== "string") return false;
  const text = value.trim().toLowerCase();
  return Boolean(text) && !["{}", "[]", "null", "undefined", "none", "n/a"].includes(text)
    && !/^(?:4\d{2}|5\d{2})(?:\s|$)/.test(text)
    && !/error|service unavailable|not found|bad gateway/.test(text);
}

function configuredProviders() {
  const providers = [];
  for (let index = 1; index <= 10; index += 1) {
    const apiKey = process.env[`AI_PROVIDER_${index}_API_KEY`];
    const baseURL = process.env[`AI_PROVIDER_${index}_BASE_URL`];
    const model = process.env[`AI_PROVIDER_${index}_MODEL`];
    if (apiKey && baseURL && model) providers.push({ apiKey, baseURL, model });
  }
  if (!providers.length && process.env.OPENAI_API_KEY) {
    providers.push({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    });
  }
  return providers;
}

async function queryFallback(query) {
  for (const fallback of FALLBACKS) {
    try {
      const { data } = await axios.get(fallback.url, {
        params: { [fallback.param]: query },
        timeout: 10000,
      });
      
      let result = null;
      if (fallback.type === "bj") {
        result = data?.reply || (typeof data === "string" ? data : null);
      } else {
        result = data?.data?.response || data?.data?.message || data?.result;
      }
      
      if (isUsefulResult(result)) return result.trim();
    } catch (e) {
      console.error(`Fallback ${fallback.url} failed:`, e.message);
    }
  }

  throw new Error("All AI fallbacks failed");
}

async function queryAI(endpoint, query, conText) {
  const { reply, MeshTechApi } = conText;

  if (!query) {
    return reply("Please provide a question or prompt.");
  }

  // Mapping old endpoints to siputzx endpoints
  let siputzxEndpoint = "gptoss120b";
  let paramName = "prompt";
  
  if (endpoint.includes("gemini")) siputzxEndpoint = "gemini";
  if (endpoint.includes("deepseek") || endpoint === "mistral") siputzxEndpoint = "deepseekr1";
  if (endpoint.includes("meta")) siputzxEndpoint = "metaai";
  if (endpoint.includes("duckai")) {
      siputzxEndpoint = "duckai";
      paramName = "message";
  }

  try {
    const apiUrl = `${MeshTechApi}/api/ai/${siputzxEndpoint}?${paramName}=${encodeURIComponent(query)}`;
    const res = await axios.get(apiUrl, { timeout: 20000 });

    const result = res.data?.data?.response || res.data?.data?.message || res.data?.result;

    if (!res.data || !res.data.status || !isUsefulResult(result)) {
      throw new Error("Primary AI endpoint returned no result");
    }

    return reply(result);
  } catch (err) {
    console.error(`AI ${endpoint} primary endpoint error:`, err.message);
    
    try {
      for (const provider of configuredProviders()) {
        try {
          const baseURL = provider.baseURL.replace(/\/+$/, "");
          const { data } = await axios.post(`${baseURL}/chat/completions`, {
            model: provider.model,
            messages: [{ role: "user", content: query }],
            temperature: 0.7,
          }, {
            headers: { Authorization: `Bearer ${provider.apiKey}`, "Content-Type": "application/json" },
            timeout: 15000,
          });
          const providerResult = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text;
          if (isUsefulResult(providerResult)) return reply(providerResult.trim());
        } catch (providerError) {
          console.error("Configured AI provider failed:", providerError.message);
        }
      }
      const fallback = await queryFallback(query);
      return reply(fallback);
    } catch (fallbackError) {
      console.error("AI fallback error:", fallbackError.message);
      return reply("Error: " + err.message + "\n\nFallback failed: " + fallbackError.message);
    }
  }
}

gmd(
  {
    pattern: "meshtechai",
    aliases: ["ai"],
    description: "Chat with Mesh Tech AI assistant",
    category: "Ai",
    premium: true,
    filename: __filename,
  },
  async (from, MeshTech, conText) => {
    await queryAI("ai", conText.q || "say hello to mesh tech", conText);
  },
);

gmd(
  {
    pattern: "chatai",
    description: "General AI chat assistant",
    category: "Ai",
    premium: true,
    filename: __filename,
  },
  async (from, MeshTech, conText) => {
    await queryAI("chat", conText.q, conText);
  },
);

gmd(
  {
    pattern: "gpt",
    aliases: ["chatgpt"],
    description: "Chat with GPT model",
    category: "Ai",
    premium: true,
    filename: __filename,
  },
  async (from, MeshTech, conText) => {
    await queryAI("gpt", conText.q, conText);
  },
);

gmd(
  {
    pattern: "gpt4",
    aliases: ["chatgpt4"],
    description: "Chat with GPT-4 model",
    category: "Ai",
    premium: true,
    filename: __filename,
  },
  async (from, MeshTech, conText) => {
    await queryAI("gpt4", conText.q, conText);
  },
);

gmd(
  {
    pattern: "gpt4o",
    aliases: ["chatgpt4o"],
    description: "Chat with GPT-4o model",
    category: "Ai",
    premium: true,
    filename: __filename,
  },
  async (from, MeshTech, conText) => {
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
  async (from, MeshTech, conText) => {
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
  async (from, MeshTech, conText) => {
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
  async (from, MeshTech, conText) => {
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
  async (from, MeshTech, conText) => {
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
  async (from, MeshTech, conText) => {
    await queryAI("letmegpt", conText.q, conText);
  },
);
