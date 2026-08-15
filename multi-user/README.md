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
| `/api/restore-session` | POST | Restores one account into its isolated auth directory. |
| `/api/status` | GET | Lists active isolated sessions. |
| `/api/stop` | POST | Stops a session after validating its access token. |

Pairing-code sessions return a temporary access token. The client must use that token when polling `/api/pairing-code` or stopping the session. QR mode returns the real WhatsApp QR payload captured from the child connection.

## Railway persistence

Create a persistent volume and mount it at `/data`. Set `MULTI_USER_AUTH_DIR=/data/meshtech/auth_sessions`, leave `SESSION_ID` empty, and use `npm run start:multi-user` as the service start command. Without a persistent volume, the accounts' auth databases are lost when the container is replaced and pairing must be repeated.

## Session-ID guidance

For the multi-session runtime, use a `MeshTech~...` session ID only when importing or moving an account through the protected dashboard. After WhatsApp authentication succeeds, the bot's credentials are already stored in that account's private auth directory; generating or sending another session ID is not required for normal operation and does not prevent hosting inactivity.

For reliable long-term sessions on Railway, use the persistent volume configuration above. A host restart or free-plan sleep may interrupt a connection temporarily, but it should restore from the stored auth state when the service wakes. Never place session IDs in group chats, menus, logs, or automatic connection-success messages.
