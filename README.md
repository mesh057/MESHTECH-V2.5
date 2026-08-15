<a><img src='https://i.postimg.cc/vHZz7VWG/bot-logo.png'/></a>
<h1 align="center"> MESHTECH MD BOT v2.5 </h1>

- Bot is Safe for Heroku so don't ask more questions


<details>
<summary>NOTICE!! (TAP TO READ)</summary>

- For Vps/Panel Deployment You must download the zip from panel sections or from below link else your youtube downloaders wont work on panel.

<a href="https://github.com/mesh057/MESHTECH-V2.5/archive/refs/heads/main.zip"><img src="https://img.shields.io/badge/DOWNLOAD%20ZIP-yellow" alt="Panel Zip File" width="150"></a>
  
</details>

<a><img src='https://i.postimg.cc/vHZz7VWG/bot-logo.png'/></a>

  <p align="center">
<a href="https://github.com/mesh057"><img title="GITHUB" src="https://img.shields.io/badge/GITHUB-Mesh Tech-red.svg?style=for-the-badge&logo=github"></a>
<p/>
<p align="center">
<a href="https://github.com/mesh057?tab=followers"><img title="Followers" src="https://img.shields.io/github/followers/mesh057?label=Followers&style=social"></a>
<a href="https://github.com/mesh057/MESHTECH-V2.5/stargazers/"><img title="STARS" src="https://img.shields.io/github/stars/mesh057/MESHTECH-V2.5?&style=social"></a>
<a href="https://github.com/mesh057/MESHTECH-V2.5/network/members"><img title="Forks" src="https://img.shields.io/github/forks/mesh057/MESHTECH-V2.5?style=social"></a>
<a href="https://github.com/mesh057/MESHTECH-V2.5/watchers"><img title="Watching" src="https://img.shields.io/github/watchers/mesh057/MESHTECH-V2.5?label=Watching&style=social"></a>

<a><img src='https://i.postimg.cc/vHZz7VWG/bot-logo.png'/></a>
  
## 𝟏. 𝐒𝐄𝐓 𝐔𝐏:

**👇FORK REPO(A MUST)**
<details>
<summary>𝗖𝗟𝗜𝗖𝗞 𝗛𝗘𝗥𝗘</summary>
  
- This is essential for you to obtain your own safe forked deployable repo especially heroku users.

<a href="https://github.com/mesh057/MESHTECH-V2.5/fork"><img src="https://img.shields.io/badge/CLICK%20HERE-purple" alt="FORK MESH TECH MD" width="150"></a>
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

</details>


### 𝟑. 𝐃𝐄𝐏𝐋𝐎𝐘𝐌𝐄𝐍𝐓 𝐒𝐄𝐂𝐓𝐈𝐎𝐍:
<details>
<summary>TAP TO OPEN</summary>
<a href="https://signup.heroku.com/login"><img src="https://img.shields.io/badge/HEROKU%20SIGNUP-white" alt="Heroku Signup" width="150"></a>
  
<a href="https://dashboard.heroku.com/new?template=https://github.com/mesh057/MESHTECH-V2.5"><img src="https://img.shields.io/badge/DEPLOY%20NOW-red" alt="Deploy on Heroku" width="150"></a>

- PostgreSQL is **auto-provisioned** via the `heroku-postgresql:essential-0` addon — no manual setup needed.
- All environment variables are pre-filled from `app.json`. Just add your `SESSION_ID`.
</details>

<a><img src='https://i.postimg.cc/vHZz7VWG/bot-logo.png'/></a>

**(B) BOT HOSTING PANEL🔥(DISCORD) DEPLOYMENT**
<details>
<summary>TAP TO OPEN</summary>
<a href="https://github.com/mesh057/MESHTECH-V2.5/archive/refs/heads/main.zip"><img src="https://img.shields.io/badge/DOWNLOAD%20FILES-yellow" alt="Bot Hosting Files" width="150"></a>

<a href="https://bot-hosting.net/?aff=1357362933151305758"><img src="https://img.shields.io/badge/SIGNUP-gold" alt="Bot Hosting Signup" width="150"></a>

<a href="https://bot-hosting.net/?aff=1357362933151305758"><img src="https://img.shields.io/badge/DEPLOY%20NOW-orange" alt="Bot Hosting Deploy" width="150"></a>

<a href="https://youtu.be/5uefRCSJegU?feature=shared"><img src="https://img.shields.io/badge/WATCH%20TUTORIAL-red" alt="Bot Hosting Tutorial" width="150"></a>
</details>

<a><img src='https://i.postimg.cc/vHZz7VWG/bot-logo.png'/></a>

**(C) RENDER DEPLOYMENT**
<details>
<summary>TAP TO OPEN</summary>
<a href="https://dashboard.render.com/signup"><img src="https://img.shields.io/badge/RENDER%20SIGNUP-green" alt="Render Signup" width="150"></a>

<a href="https://render.com/deploy"><img src="https://img.shields.io/badge/DEPLOY%20NOW-blue" alt="Deploy on Render" width="150"></a>

<a href="https://youtu.be/5uefRCSJegU?feature=shared"><img src="https://img.shields.io/badge/WATCH%20TUTORIAL-red" alt="Render Tutorial" width="150"></a>

**Steps:**
1. Fork this repo, then go to [render.com](https://render.com) and sign in.
2. Click **New → Blueprint** and connect your forked repo.
3. Render reads `render.yaml` and **auto-provisions a free PostgreSQL** database linked to your bot.
4. Fill in `SESSION_ID` when prompted. All other vars have defaults.
5. Click **Apply** — done.

> **Note:** Render's free PostgreSQL lasts 90 days. After that, use a free external DB from [neon.tech](https://neon.tech) and paste the URL as `DATABASE_URL`. If left blank the bot falls back to SQLite automatically.
</details>

<a><img src='https://i.postimg.cc/vHZz7VWG/bot-logo.png'/></a>

**(D) RAILWAY DEPLOYMENT**
<details>
<summary>TAP TO OPEN</summary>
<a href="https://railway.app/login"><img src="https://img.shields.io/badge/RAILWAY%20SIGNUP-black" alt="Railway Signup" width="150"></a>

<a href="https://railway.app/new/template"><img src="https://img.shields.io/badge/DEPLOY%20NOW-purple" alt="Deploy on Railway" width="150"></a>

**Steps:**
1. Fork this repo and go to [railway.app](https://railway.app).
2. Click **New Project → Deploy from GitHub repo** and select your fork.
3. In your project dashboard, click **+ New → Database → PostgreSQL**.
4. Railway auto-links `DATABASE_URL` to your service — no copy-paste needed.
5. Go to your service **Variables** tab and add:
   - `SESSION_ID` → your `MeshTech~` session ID
   - `MODE` → `public`
   - `TIME_ZONE` → e.g. `Africa/Nairobi`
6. Railway detects the `Dockerfile` and `railway.toml` automatically and deploys.
</details>

<a><img src='https://i.postimg.cc/vHZz7VWG/bot-logo.png'/></a>

**(E) KOYEB DEPLOYMENT**
<details>
<summary>TAP TO OPEN</summary>
<a href="https://app.koyeb.com/auth/signup"><img src="https://img.shields.io/badge/KOYEB%20SIGNUP-purple" alt="Koyeb Signup" width="150"></a>

<a href="https://app.koyeb.com/services/deploy/?type=git&repository=github.com%2Fmesh057%2FMESHTECH-V2.5&branch=main&name=MESHTECH-V2.5&builder=dockerfile&env%5BSESSION_ID%5D=your%20sessionid%20here"><img src="https://img.shields.io/badge/DEPLOY%20NOW-black" alt="Deploy on Koyeb" width="150"></a>

**Steps:**
1. Fork this repo and sign in to [koyeb.com](https://koyeb.com).
2. Click **Deploy Now** above (or Create App → GitHub → select your fork).
3. Koyeb has no built-in database — get a **free PostgreSQL** from one of:
   - [neon.tech](https://neon.tech) ← recommended
   - [supabase.com](https://supabase.com)
4. Paste the connection URL as `DATABASE_URL` in your Koyeb service environment variables.
5. Set `SESSION_ID`, `MODE`, `TIME_ZONE` in the same env vars section.
6. Koyeb uses the `Dockerfile` and `koyeb.yaml` config automatically.

> **Tip:** If you skip `DATABASE_URL` the bot will use SQLite on the local disk — data resets on each redeploy. Use a remote DB for persistence.
</details>

<a><img src='https://i.postimg.cc/vHZz7VWG/bot-logo.png'/></a>

**(F) BOT HOSTING PANEL🔥(DISCORD) DEPLOYMENT**
<details>
<summary>TAP TO OPEN</summary>
<a href="https://github.com/mesh057/MESHTECH-V2.5/archive/refs/heads/main.zip"><img src="https://img.shields.io/badge/DOWNLOAD%20FILES-yellow" alt="Bot Hosting Files" width="150"></a>

<a href="https://bot-hosting.net/?aff=1357362933151305758"><img src="https://img.shields.io/badge/SIGNUP-gold" alt="Bot Hosting Signup" width="150"></a>

<a href="https://bot-hosting.net/?aff=1357362933151305758"><img src="https://img.shields.io/badge/DEPLOY%20NOW-orange" alt="Bot Hosting Deploy" width="150"></a>

<a href="https://youtu.be/5uefRCSJegU?feature=shared"><img src="https://img.shields.io/badge/WATCH%20TUTORIAL-red" alt="Bot Hosting Tutorial" width="150"></a>
</details>

<a><img src='https://i.postimg.cc/vHZz7VWG/bot-logo.png'/></a>

**(G) VPS / SELF-HOSTED DEPLOYMENT**
<details>
<summary>TAP TO OPEN</summary>

> Requires a Linux VPS (Ubuntu 20.04+ recommended) with Node.js 20+ and Git installed.

**1. Clone the repo**
```bash
git clone https://github.com/mesh057/MESHTECH-V2.5.git
cd MESHTECH-V2.5
```

**2. Install dependencies**
```bash
npm install
```

**3. Set environment variables**

Create a `.env` file in the project root:
```env
SESSION_ID=MeshTech~your_session_id_here
MODE=public
TIME_ZONE=Africa/Nairobi
AUTO_LIKE_STATUS=true
AUTO_READ_STATUS=true
DATABASE_URL=              # leave blank to use SQLite, or paste a PostgreSQL URL
```

**4. Install FFmpeg** (required for media commands)
```bash
# Ubuntu / Debian
sudo apt update && sudo apt install -y ffmpeg

# CentOS / RHEL
sudo yum install -y ffmpeg
```

**5. Start the bot**
```bash
npm start
```

**6. Keep it running with PM2** (recommended)
```bash
npm install -g pm2
pm2 start index.js --name MESHTECH-V2.5
pm2 save
pm2 startup
```

**7. (Optional) Free PostgreSQL**

If you want a persistent database instead of SQLite, get a free connection URL from [neon.tech](https://neon.tech) or [supabase.com](https://supabase.com) and paste it as `DATABASE_URL` in your `.env`.

**8. Update the bot**
```bash
git pull
npm install
pm2 restart MESHTECH-V2.5
```
</details>

<a><img src='https://i.postimg.cc/vHZz7VWG/bot-logo.png'/></a>

### 𝟒. 𝐔𝐏𝐃𝐀𝐓𝐄𝐒 

<details>
<summary>𝗖𝗟𝗜𝗖𝗞 𝗛𝗘𝗥𝗘</summary>
  
- **[CONTACT SUPPORT](https://clevertech.qzz.io/) For More Info**
- **Join [WHATSAPP CHANNEL](https://whatsapp.com/channel/0029VbDeTrNEKyZ9GlUude2R) for Daily Updates.**
- **Check out my [Github Profile](https://github.com/mesh057) for More Projects.**
</details>

<a><img src='https://i.postimg.cc/vHZz7VWG/bot-logo.png'/></a>

### 𝟓. 𝐑𝐄𝐏𝐎 𝐒𝐓𝐀𝐑 𝐇𝐈𝐒𝐓𝐎𝐑𝐘 

[![MESH TECH MD](https://api.star-history.com/svg?repos=mesh057/MESHTECH-V2.5&type=Timeline)](#)

<a><img src='https://i.postimg.cc/vHZz7VWG/bot-logo.png'/></a>


## TRUE MULTI-SESSION DEPLOYMENT

The original `npm start` command remains available for one private `MeshTech~...` session. For multiple independent WhatsApp accounts in one service, leave `SESSION_ID` empty and set the service start command to `npm run start:multi-user`.

Set `MAX_BOT_INSTANCES=unlimited` and point `MULTI_USER_AUTH_DIR` to a persistent volume such as `/data/meshtech/auth_sessions`. The multi-session service exposes `/dashboard`, `/pairing.html`, `/api/request-pairing`, `/api/pairing-code`, `/api/restore-session`, `/api/status`, and `/api/stop`. Each account is isolated under its own phone-number directory and registered sessions are restored automatically after restart.

On Railway, mount a persistent volume at `/data`, set `MULTI_USER_AUTH_DIR=/data/meshtech/auth_sessions`, leave `SESSION_ID` blank, and override the service start command to `npm run start:multi-user`. Without persistent storage, auth state is lost when the service is replaced and affected accounts must be paired again.
