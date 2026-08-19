const axios = require("axios");

const TEST_ENDPOINTS = [
  { name: "BJ-Devs GPT-3.5", url: "https://gpt-3-5.apis-bj-devs.workers.dev/?prompt=hello", type: "ai" },
  { name: "BJ-Devs Bing Search", url: "https://bing-search.apis-bj-devs.workers.dev/?search=hello&limit=2", type: "search" },
  { name: "Siputzx DuckAI", url: "https://api.siputzx.my.id/api/ai/duckai?message=hello", type: "ai" },
  { name: "Siputzx Ephoto360", url: "https://api.siputzx.my.id/api/m/ephoto360?url=https://en.ephoto360.com/glossy-silver-text-effect-online-802.html&text1=MeshTech", type: "logo" },
  { name: "TikWM TikTok", url: "https://www.tikwm.com/api/?url=https://vt.tiktok.com/ZS2R8vX5F/", type: "dl" },
  { name: "BJ-Devs Qwen", url: "https://qwen-ai.apis-bj-devs.workers.dev/?text=hello", type: "ai" }
];

async function runDiagnostics() {
  console.log("🚀 Starting MESH-TECH MD API Diagnostics...\n");
  
  for (const ep of TEST_ENDPOINTS) {
    try {
      const start = Date.now();
      const res = await axios.get(ep.url, { timeout: 30000 });
      const duration = Date.now() - start;
      
      let success = false;
      if (ep.type === "ai") {
          success = res.data?.status || res.data?.reply || (typeof res.data === "string" && res.data.length > 0);
      } else if (ep.type === "search") {
          success = Array.isArray(res.data) || res.data?.status === "success" || res.data?.status === true;
      } else if (ep.type === "logo") {
          success = res.headers['content-type']?.includes('image');
      } else {
          success = res.data?.status || res.data?.code === 0 || res.data?.success;
      }

      if (success) {
        console.log(`✅ ${ep.name.padEnd(20)} | Status: OK | Time: ${duration}ms`);
      } else {
        console.log(`❌ ${ep.name.padEnd(20)} | Status: FAIL (Invalid Response)`);
        console.log("   Response:", JSON.stringify(res.data).substring(0, 100));
      }
    } catch (e) {
      console.log(`❌ ${ep.name.padEnd(20)} | Status: ERROR (${e.message})`);
    }
  }
  
  console.log("\n🏁 Diagnostics Complete.");
}

runDiagnostics();
