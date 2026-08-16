const axios = require("axios");
const { gmd } = require("../meshtech/gmdCmds");

const REQUEST = { timeout: 20000 };

function decodeHtml(value = "") {
  return String(value)
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function quotedText(mek) {
  const quoted = mek?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  return quoted?.conversation
    || quoted?.extendedTextMessage?.text
    || quoted?.imageMessage?.caption
    || quoted?.videoMessage?.caption
    || "";
}

async function safeReply(reply, message) {
  return reply(`❌ ${message}`);
}

gmd({
  pattern: "animal",
  aliases: ["animals"],
  react: "🐾",
  category: "general",
  description: "Fetch a random cat or dog image.",
}, async (from, Gifted, conText) => {
  const { mek, reply } = conText;
  try {
    const [{ data: cats }, { data: dogs }] = await Promise.all([
      axios.get("https://api.thecatapi.com/v1/images/search", REQUEST),
      axios.get("https://dog.ceo/api/breeds/image/random", REQUEST),
    ]);
    const url = Math.random() < 0.5 ? cats?.[0]?.url : dogs?.message;
    if (!url) return safeReply(reply, "No animal image was returned.");
    return Gifted.sendMessage(from, { image: { url }, caption: "🐾 *Random animal*" }, { quoted: mek });
  } catch (error) {
    console.error("[animal]", error.message);
    return safeReply(reply, "Animal image service is temporarily unavailable.");
  }
});

gmd({
  pattern: "meme",
  aliases: ["memes"],
  react: "😂",
  category: "general",
  description: "Fetch a random meme.",
}, async (from, Gifted, conText) => {
  const { mek, reply } = conText;
  try {
    const { data } = await axios.get("https://meme-api.com/gimme", REQUEST);
    if (!data?.url) return safeReply(reply, "No meme was returned.");
    return Gifted.sendMessage(from, { image: { url: data.url }, caption: `😂 *${data.title || "Random meme"}*` }, { quoted: mek });
  } catch (error) {
    console.error("[meme]", error.message);
    return safeReply(reply, "Meme service is temporarily unavailable.");
  }
});

gmd({
  pattern: "quote",
  aliases: ["inspire"],
  react: "💬",
  category: "general",
  description: "Fetch a random inspirational quote.",
}, async (from, Gifted, conText) => {
  const { mek, reply } = conText;
  try {
    const { data } = await axios.get("https://zenquotes.io/api/random", REQUEST);
    const item = Array.isArray(data) ? data[0] : null;
    if (!item?.q) return safeReply(reply, "No quote was returned.");
    return Gifted.sendMessage(from, { text: `💬 *${item.q}*\n\n— ${item.a || "Unknown"}` }, { quoted: mek });
  } catch (error) {
    console.error("[quote]", error.message);
    return safeReply(reply, "Quote service is temporarily unavailable.");
  }
});

gmd({
  pattern: "trivia",
  aliases: ["quiz"],
  react: "🧠",
  category: "game",
  description: "Get a random trivia question.",
}, async (from, Gifted, conText) => {
  const { mek, reply } = conText;
  try {
    const { data } = await axios.get("https://opentdb.com/api.php?amount=1&type=multiple", REQUEST);
    const item = data?.results?.[0];
    if (!item) return safeReply(reply, "No trivia question was returned.");
    const answers = [item.correct_answer, ...(item.incorrect_answers || [])].sort(() => Math.random() - 0.5);
    const options = answers.map((answer, index) => `${String.fromCharCode(65 + index)}. ${decodeHtml(answer)}`).join("\n");
    return Gifted.sendMessage(from, {
      text: `🧠 *TRIVIA*\n\n${decodeHtml(item.question)}\n\n${options}\n\n✅ Answer: *${decodeHtml(item.correct_answer)}*`,
    }, { quoted: mek });
  } catch (error) {
    console.error("[trivia]", error.message);
    return safeReply(reply, "Trivia service is temporarily unavailable.");
  }
});

gmd({
  pattern: "trt",
  aliases: ["translate"],
  react: "🌐",
  category: "tools",
  description: "Translate replied text to English.",
}, async (from, Gifted, conText) => {
  const { mek, reply } = conText;
  const text = quotedText(mek);
  if (!text) return reply("Reply to a text message with .trt");
  try {
    const { data } = await axios.get("https://api.mymemory.translated.net/get", {
      params: { q: text, langpair: "autodetect|en" },
      ...REQUEST,
    });
    const translated = data?.responseData?.translatedText;
    if (!translated) return safeReply(reply, "No translation was returned.");
    return Gifted.sendMessage(from, { text: `🌐 *Translation:*\n${translated}` }, { quoted: mek });
  } catch (error) {
    console.error("[trt]", error.message);
    return safeReply(reply, "Translation service is temporarily unavailable.");
  }
});

gmd({
  pattern: "truthordare",
  aliases: ["tod"],
  react: "🎲",
  category: "game",
  description: "Get a random truth or dare challenge.",
}, async (from, Gifted, conText) => {
  const { mek, reply } = conText;
  const type = Math.random() < 0.5 ? "truth" : "dare";
  try {
    const { data } = await axios.get(`https://api.truthordarebot.xyz/v1/${type}`, REQUEST);
    const prompt = data?.question || data?.translations?.en || data?.text;
    if (!prompt) return safeReply(reply, "No challenge was returned.");
    return Gifted.sendMessage(from, { text: `🎲 *${type.toUpperCase()}*\n\n${prompt}` }, { quoted: mek });
  } catch (error) {
    console.error("[truthordare]", error.message);
    return safeReply(reply, "Truth or Dare service is temporarily unavailable.");
  }
});

gmd({
  pattern: "riddle",
  aliases: ["riddles"],
  react: "🧩",
  category: "game",
  description: "Get a random riddle.",
}, async (from, Gifted, conText) => {
  const { mek, reply } = conText;
  try {
    const { data } = await axios.get("https://riddles-api.vercel.app/random", REQUEST);
    if (!data?.riddle) return safeReply(reply, "No riddle was returned.");
    return Gifted.sendMessage(from, { text: `🧩 *RIDDLE*\n\n${data.riddle}\n\n✅ Answer: *${data.answer || "Unknown"}*` }, { quoted: mek });
  } catch (error) {
    console.error("[riddle]", error.message);
    return safeReply(reply, "Riddle service is temporarily unavailable.");
  }
});

gmd({
  pattern: "dall",
  aliases: ["imagine2", "aiimage"],
  react: "🎨",
  category: "ai",
  description: "Generate an AI image from a text prompt.",
}, async (from, Gifted, conText) => {
  const { mek, reply, q } = conText;
  const prompt = String(q || "").trim();
  if (!prompt) return reply("Use .dall followed by an image description.");
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=768&nologo=true&seed=${Math.floor(Math.random() * 999999)}`;
  try {
    return Gifted.sendMessage(from, { image: { url }, caption: `🎨 *Generated image*\nPrompt: ${prompt}` }, { quoted: mek });
  } catch (error) {
    console.error("[dall]", error.message);
    return safeReply(reply, "Image generation service is temporarily unavailable.");
  }
});
