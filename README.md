<h1 align="center"> MESHTECH MD BOT v2.6 </h1>

- Bot is Safe for Heroku so don't ask more questions


<details>
<summary>NOTICE!! (TAP TO READ)</summary>

- For Vps/Panel Deployment You must download the zip from panel sections or from below link else your youtube downloaders wont work on panel.

<a href="https://github.com/mesh057/MESHTECH-V2.6/archive/refs/heads/main.zip"><img src="https://img.shields.io/badge/DOWNLOAD%20ZIP-yellow" alt="Panel Zip File" width="150"></a>
  
</details>

<a><img src='https://i.postimg.cc/vHZz7VWG/bot-logo.png'/></a>

  <p align="center">
<a href="https://github.com/mesh057"><img title="GITHUB" src="https://img.shields.io/badge/GITHUB-Mesh Tech-red.svg?style=for-the-badge&logo=github"></a>
<p/>
<p align="center">
<a href="https://github.com/mesh057?tab=followers"><img title="Followers" src="https://img.shields.io/github/followers/mesh057?label=Followers&style=social"></a>
<a href="https://github.com/mesh057/MESHTECH-V2.6/stargazers/"><img title="STARS" src="https://img.shields.io/github/stars/mesh057/MESHTECH-V2.6?&style=social"></a>
<a href="https://github.com/mesh057/MESHTECH-V2.6/network/members"><img title="Forks" src="https://img.shields.io/github/forks/mesh057/MESHTECH-V2.6?style=social"></a>
<a href="https://github.com/mesh057/MESHTECH-V2.6/watchers"><img title="Watching" src="https://img.shields.io/github/watchers/mesh057/MESHTECH-V2.6?label=Watching&style=social"></a>

<a><img src='https://i.postimg.cc/vHZz7VWG/bot-logo.png'/></a>
  
## 𝟏. 𝐒𝐄𝐓 𝐔𝐏:

**👇FORK REPO(A MUST)**
<details>
<summary>𝗖𝗟𝗜𝗖𝗞 𝗛𝗘𝗥𝗘</summary>
  
- This is essential for you to obtain your own safe forked deployable repo especially heroku users.

<a href="https://github.com/mesh057/MESHTECH-V2.6/fork"><img src="https://img.shields.io/badge/CLICK%20HERE-purple" alt="FORK MESH TECH MD" width="150"></a>
</details>

<a><img src='https://i.postimg.cc/vHZz7VWG/bot-logo.png'/></a>

### 𝟐. 𝐋𝐈𝐍𝐊 𝐖𝐈𝐓𝐇 𝐖𝐇𝐀𝐓𝐒𝐀𝐏𝐏

<details>
<summary><b>🔐 GET YOUR SESSION_ID</b></summary>

<br>

> **Important:** Do not use third-party pairing websites. They are not part of this repository and may generate codes that WhatsApp rejects.

For a self-hosted pairing page, deploy the bot in multi-session mode:

```bash
npm install
npm run start:multi-user
```

Then open your own service URL at `/pairing.html`, enter the full international phone number using digits only, and generate a fresh code. On WhatsApp, use **Linked devices → Link a device → Link with phone number instead**.

For a single-session deployment, generate or import a complete `MeshTech~...` session through your own trusted deployment and set it as `SESSION_ID`. The session must be created by the same MESHTECH service; do not copy codes or session values from unrelated bot websites.

⚠️ A deployed multi-session service requires persistent storage for `MULTI_USER_AUTH_DIR`; otherwise the account must be paired again after every restart.

The menu now groups the complete 300+ command catalog into these branches: **AI**, **ConvErTer**, **CpAnEL**, **DownLoADer**, **GAmE**, **GEnErAL**, **Group**, **LoGo**, **notEs**, **ownEr**, **rELIGIon**, **sEArCH**, **sports**, **tEmPmAIL**, **tooLs**, **upLOADEr**, and **utILity**. Use `.menu` for the full grouped catalog, `.alive` for live status, and `.session` as the owner to generate a private recovery session ID.

</details>


### 𝟑. 𝐃𝐄𝐏𝐋𝐎𝐘𝐌𝐄𝐍𝐓 𝐒𝐄𝐂𝐓𝐈𝐎𝐍:
<details>
<summary>TAP TO OPEN</summary>
<a href="https://signup.heroku.com/login"><img src="https://img.shields.io/badge/HEROKU%20SIGNUP-white" alt="Heroku Signup" width="150"></a>
  
<a href="https://dashboard.heroku.com/new?template=https://github.com/mesh057/MESHTECH-V2.6"><img src="https://img.shields.io/badge/DEPLOY%20NOW-red" alt="Deploy on Heroku" width="150"></a>

- PostgreSQL is **auto-provisioned** via the `heroku-postgresql:essential-0` addon — no manual setup needed.
- All environment variables are pre-filled from `app.json`. Just add your `SESSION_ID`.
</details>

<a><img src='https://i.postimg.cc/vHZz7VWG/bot-logo.png'/></a>

**(B) PTERODACTYL PANEL DEPLOYMENT (Legacy Bot Hosting, Katabump, etc.)**
<details>
<summary>TAP TO OPEN</summary>
<a href="https://github.com/mesh057/MESHTECH-V2.6/archive/refs/heads/main.zip"><img src="https://img.shields.io/badge/DOWNLOAD%20ZIP-yellow" alt="Panel Zip File" width="150"></a>

- **Supported Panels:** Legacy Bot Hosting (`bot-hosting.net`), Katabump, and any standard Pterodactyl Node.js panel.

**Steps to Deploy & Pair on Pterodactyl Panels (Zero External Links):**
1. **Download & Upload:** Download the ZIP file above or extract your forked repository. Upload the files directly to your panel file manager.
2. **Startup Command:** Set your panel startup / run command to:
   ```bash
   bash panel-startup.sh
   ```
3. **Console Pairing:** Click **Start** on your panel console. If no session exists, the bot will prompt you directly in the console:
   ```text
   👉 Enter your WhatsApp phone number (with country code, e.g. 2547XXXXXXXX):
   ```
   Type your number into the console and press Enter. The 8-character pairing code will be generated and printed instantly in your logs!
4. **Link on WhatsApp:** Open WhatsApp on your phone → **Linked devices → Link a device → Link with phone number instead** and type the code. No external websites or links needed!

<a href="https://bot-hosting.net/?aff=1357362933151305758"><img src="https://img.shields.io/badge/LEGACY%20BOT%20HOSTING-gold" alt="Bot Hosting Signup" width="150"></a>
<a href="https://katabump.com"><img src="https://img.shields.io/badge/KATABUMP-purple" alt="Katabump Panel" width="150"></a>
</details>

<a><img src='https://i.postimg.cc/vHZz7VWG/bot-logo.png'/></a>

**(D) CPANEL HOSTING DEPLOYMENT**
<details>
<summary>TAP TO OPEN</summary>

**Steps to Deploy on cPanel (Node.js Selector):**
1. **Repository Setup:** Ensure `.cpanel.yml` is present in your root directory. Configure your Git Version Control in cPanel to deploy to your target directory (e.g., `/home3/tunupublsh/repositories/MESHTECH-V2.6`).
2. **Node.js Selector:** Go to **Setup Node.js App** in your cPanel dashboard. Create a new Node.js application, select Node.js 20+ or 22+, set the application root to your deployment folder, and set the application startup file to `index.js`.
3. **Environment Variables:** Add your environment variables (`SESSION_ID`, `DATABASE_URL`, etc.) in the cPanel Node.js selector interface.
4. **Deploy & Start:** Click **Run JS Script** or **Restart** your Node.js application in cPanel.
</details>
