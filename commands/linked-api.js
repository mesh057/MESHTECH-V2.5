const axios = require("axios");
const { gmd } = require("../meshtech");

const REQUEST = { timeout: 30000 };

function safeText(value, fallback = "Unknown") {
  return String(value || fallback).replace(/[\u0000-\u001f]/g, "").trim();
}

gmd({
  pattern: "bing",
  aliases: ["bingsearch"],
  react: "🔎",
  category: "search",
  description: "Search Bing using the linked MeshTech endpoint.",
}, async (from, Gifted, conText) => {
  const { q, mek, reply } = conText;
  if (!q?.trim()) return reply("Use .bing followed by a search query.");
  try {
    const { data } = await axios.get("https://bing-search.apis-bj-devs.workers.dev/", {
      params: { search: q.trim(), limit: 5 },
      ...REQUEST,
    });
    const groups = data?.status ? data.result?.groups || [] : [];
    const images = groups.flatMap((group) => group.images || []).slice(0, 10);
    if (!images.length) return reply("No Bing results were returned.");
    const text = `🔎 *BING RESULTS FOR:* ${q.trim()}\n\n${images.map((url, index) => `${index + 1}. ${url.replace(/&amp;/g, "&")}`).join("\n")}`;
    return Gifted.sendMessage(from, { text }, { quoted: mek });
  } catch (error) {
    console.error("[bing linked endpoint]", error.message);
    return reply("Bing search is temporarily unavailable.");
  }
});

gmd({
  pattern: "pinterest",
  aliases: ["pinterestsearch", "pins"],
  react: "📌",
  category: "search",
  description: "Search Pinterest images using the linked MeshTech endpoint.",
}, async (from, Gifted, conText) => {
  const { q, mek, reply } = conText;
  if (!q?.trim()) return reply("Use .pinterest followed by a search query.");
  try {
    const { data } = await axios.get("https://pinterest-search.apis-bj-devs.workers.dev/", {
      params: { search: q.trim(), limit: 5 },
      ...REQUEST,
    });
    const pins = data?.status ? data.result?.pins || [] : [];
    const usable = pins.filter((pin) => pin?.media?.images?.orig).slice(0, 5);
    if (!usable.length) return reply("No Pinterest images were returned.");
    for (const pin of usable) {
      await Gifted.sendMessage(from, {
        image: { url: pin.media.images.orig },
        caption: `📌 *${safeText(pin.title, "Pinterest result")}*\n${pin.pin_url || ""}`,
      }, { quoted: mek });
    }
  } catch (error) {
    console.error("[pinterest linked endpoint]", error.message);
    return reply("Pinterest search is temporarily unavailable.");
  }
});

gmd({
  pattern: "nation",
  aliases: ["countryinfo", "nationinfo"],
  react: "🌍",
  category: "utility",
  description: "Show country time and weather information.",
}, async (from, Gifted, conText) => {
  const { q, mek, reply } = conText;
  if (!q?.trim()) return reply("Use .nation followed by a country name.");
  try {
    const { data } = await axios.get("https://nation-info.apis-bj-devs.workers.dev/", {
      params: { name: q.trim() },
      ...REQUEST,
    });
    if (!data?.country) return reply("No nation information was returned.");
    const time = data.time_details || {};
    const weather = data.weather_details || {};
    const text = `🌍 *${safeText(data.country)}*\n\n🏙️ City: ${safeText(data.city)}\n🕒 Timezone: ${safeText(data.timezone)}\n📅 Local time: ${safeText(time.times12 || time.readable_date_time)}\n🌦️ Weather: ${safeText(weather.weather)}\n🌡️ Temperature: ${safeText(weather.temperature)}\n💧 Humidity: ${safeText(weather.humidity)}\n💨 Wind: ${safeText(weather.wind_speed)}`;
    return Gifted.sendMessage(from, { text }, { quoted: mek });
  } catch (error) {
    console.error("[nation linked endpoint]", error.message);
    return reply("Nation information is temporarily unavailable.");
  }
});
