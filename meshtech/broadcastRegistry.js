const recipients = new Map();
const activeUsers = new Map();

function rememberRecipient(jid) {
  if (!jid || typeof jid !== "string") return;
  if (jid === "status@broadcast" || jid.endsWith("@broadcast")) return;
  if (!jid.endsWith("@g.us") && !jid.endsWith("@s.whatsapp.net")) return;
  recipients.set(jid, Date.now());
}

function rememberActivity(jid) {
  if (!jid || typeof jid !== "string" || !jid.endsWith("@s.whatsapp.net")) return;
  activeUsers.set(jid, Date.now());
}

function getActiveUserCount(windowMs = 15 * 60 * 1000) {
  const cutoff = Date.now() - windowMs;
  for (const [jid, lastSeen] of activeUsers) {
    if (lastSeen < cutoff) activeUsers.delete(jid);
  }
  return activeUsers.size;
}

function getRecipients() {
  return [...recipients.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([jid]) => jid);
}

module.exports = { rememberRecipient, rememberActivity, getActiveUserCount, getRecipients };
