# MESH-TECH MD Working Endpoints (August 2026)

## AI & Chat
- **Primary:** `https://gpt-3-5.apis-bj-devs.workers.dev/?prompt={query}`
- **Fallback 1:** `https://api.siputzx.my.id/api/ai/duckai?q={query}` (Check SSL/Timeout)
- **Fallback 2:** `https://api.siputzx.my.id/api/ai/gptoss120b?prompt={query}`

## Search
- **Google Search:** `https://bing-search.apis-bj-devs.workers.dev/?search={query}&limit=5` (Use Bing as primary for reliability)
- **Pinterest Search:** `https://pinterest-search.apis-bj-devs.workers.dev/?search={query}&limit=5`
- **YouTube Search:** `https://api.siputzx.my.id/api/s/yts/?q={query}` (Check health)

## Downloaders
- **TikTok:** `https://www.tikwm.com/api/?url={url}` (Highly stable)
- **Facebook:** `https://api.siputzx.my.id/api/d/facebook?url={url}`
- **Instagram:** `https://api.siputzx.my.id/api/d/igram?url={url}`

## Tools & Info
- **Nation Info:** `https://nation-info.apis-bj-devs.workers.dev/?name={country}`
- **IP Info:** `https://ip-info.bjcoderx.workers.dev/?ip={ip}` (Verify DNS)

## Pending Verification (Logo Makers)
- `https://api.siputzx.my.id/api/m/ephoto360` (Currently failing)
- Need to find a stable `ephoto360` or `textpro` wrapper.
