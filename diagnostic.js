const axios = require('axios');

const endpoints = [
    { name: 'Siputzx AI (GPT OSS)', url: 'https://api.siputzx.my.id/api/ai/gptoss120b?prompt=hello' },
    { name: 'Siputzx Logo (Ephoto360)', url: 'https://api.siputzx.my.id/api/m/ephoto360?url=https%3A%2F%2Fen.ephoto360.com%2Fglossy-silver-text-effect-online-802.html&text1=hello' },
    { name: 'Siputzx TikTok', url: 'https://api.siputzx.my.id/api/d/tiktok?url=https://vt.tiktok.com/ZS2R8b2yV/' },
    { name: 'BJ-Devs GPT-3.5', url: 'https://gpt-3-5.apis-bj-devs.workers.dev/?prompt=hello' },
    { name: 'BJ-Devs Qwen', url: 'https://qwen-ai.apis-bj-devs.workers.dev/?text=hello' },
    { name: 'BJ-Devs Gemini', url: 'https://gemini-1-5-flash.bjcoderx.workers.dev/?text=hello' },
    { name: 'BJ-Devs DeepSeek', url: 'https://deepseek-ai.apis-bj-devs.workers.dev/?text=hello' },
    { name: 'BJ-Devs Spotify', url: 'https://spotify-down.apis-bj-devs.workers.dev/?url=https://open.spotify.com/track/4cOdK2wGKeRydNYqYp7t7F' },
    { name: 'TikWM TikTok', url: 'https://tikwm.com/api/?url=https://vt.tiktok.com/ZS2R8b2yV/' },
    { name: 'BJ-Devs Google Search', url: 'https://google-search.bjcoderx.workers.dev/?q=cats' },
    { name: 'BJ-Devs Pinterest', url: 'https://pinterest-search.apis-bj-devs.workers.dev/?search=Anime&limit=5' }
];

async function runDiagnostic() {
    console.log('--- MESH-TECH MD DIAGNOSTIC START ---');
    for (const endpoint of endpoints) {
        try {
            const start = Date.now();
            const res = await axios.get(endpoint.url, { timeout: 10000 });
            const duration = Date.now() - start;
            console.log(`[PASS] ${endpoint.name} - ${duration}ms`);
            // console.log(JSON.stringify(res.data).substring(0, 100));
        } catch (err) {
            console.log(`[FAIL] ${endpoint.name} - ${err.message}`);
        }
    }
    console.log('--- MESH-TECH MD DIAGNOSTIC END ---');
}

runDiagnostic();
