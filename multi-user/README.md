# MESHTECH MD BOT v2.5 multi-session mode

The default `npm start` command remains the original single-session process and continues to accept one private `MeshTech~...` `SESSION_ID`. For a true multi-session deployment, leave `SESSION_ID` empty and start the service with `npm run start:multi-user`.

The multi-session service keeps every WhatsApp account in an isolated directory under `MULTI_USER_AUTH_DIR/<phone-number>/`. Each directory contains its own Baileys SQLite auth state, bot database, and message store. On restart, only sessions whose stored credentials are registered are restored automatically.

## Required deployment variables

```dotenv
SESSION_ID=
MAX_BOT_INSTANCES=unlimited
MULTI_USER_AUTH_DIR=/data/meshtech/auth_sessions
MULTI_USER_PORT=5000
MODE=public
TIME_ZONE=Africa/Nairobi
```

`MAX_BOT_INSTANCES` accepts `unlimited`, `infinite`, `infinity`, `0`, or `-1` for unlimited capacity. A positive integer may be used as an intentional safety guardrail. Unlimited capacity is software-level only; the host's CPU, memory, disk, network, and WhatsApp stability remain practical limits.

## HTTP routes

The existing `/` and `/health` routes remain available. The multi-session service additionally exposes the following routes for the dashboard and pairing page:

| Route | Method | Purpose |
| --- | --- | --- |
| `/dashboard` | GET | Opens the cloud session dashboard. |
| `/pairing.html` | GET | Opens the pairing page. |
| `/api/request-pairing` | POST | Starts a new isolated pairing session. |
| `/api/pairing-code` | GET | Polls pairing-code, QR, status, and error state. |
| `/api/session-id` | GET | Generates a protected `MeshTech~...` session ID after authentication. |
| `/api/restore-session` | POST | Restores one account into its isolated auth directory. |
| `/api/status` | GET | Lists active isolated sessions. |
| `/api/stop` | POST | Stops a session after validating its access token. |

Pairing-code sessions return a temporary access token. The client must use that token when polling `/api/pairing-code`, generating `/api/session-id`, or stopping the session. The pairing page’s **GENERATE SESSION ID** button copies the protected session ID only after the WhatsApp account is connected. QR mode returns the real WhatsApp QR payload captured from the child connection.

## Railway persistence

Create a persistent volume and mount it at `/data`. Set `MULTI_USER_AUTH_DIR=/data/meshtech/auth_sessions`, leave `SESSION_ID` empty, and use `npm run start:multi-user` as the service start command. Without a persistent volume, the accounts' auth databases are lost when the container is replaced and pairing must be repeated.

## Session-ID guidance

For the multi-session runtime, pair the account at `/pairing.html`, wait until it connects, and use **GENERATE SESSION ID** only when you need to move the account to another deployment. The value is compressed from the account’s local persistent auth database and is never sent to a third-party pairing website. Treat it like a password: keep it in a private hosting secret and never put it in chats, screenshots, menus, or logs. Normal operation uses the persistent auth directory directly, so session-ID generation is not needed on every restart.

For reliable long-term sessions on Railway, use the persistent volume configuration above. A host restart or free-plan sleep may interrupt a connection temporarily, but it should restore from the stored auth state when the service wakes. Never place session IDs in group chats, menus, logs, or automatic connection-success messages.

## Keeping the bot online during updates

Use a hosting service that supports automatic deployment from the `main` GitHub branch and enable its automatic-deploy setting. Each pushed update should create a new service revision. The service now handles `SIGTERM`, stops child sessions cleanly, and restores registered WhatsApp sessions from `MULTI_USER_AUTH_DIR` after the new revision starts.

Keep `/data/meshtech/auth_sessions` on a persistent volume and keep `SESSION_ID` empty for multi-session mode. Enable automatic deploys from the GitHub `main` branch. During a GitHub update, the service receives a graceful shutdown signal, stops child sessions cleanly, and the new revision restores registered accounts from the persistent volume. Without persistent storage, an update may succeed but WhatsApp authentication state will be lost and every account will need to pair again.

The `/health` endpoint is intended for the host health check. A healthy response means the HTTP service is alive; WhatsApp session status is available through `/api/status`.

## User group invitations

The bot does not silently add people to a group. The owner can save an invite link with `.setautoinvite https://chat.whatsapp.com/INVITE_CODE`. A user can then request the link with `.join` and decide whether to join. The bot must remain an administrator of the group for the invite link to remain useful.
