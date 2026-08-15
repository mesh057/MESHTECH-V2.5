const recipients = new Map();

function rememberRecipient(jid) {
  if (!jid || typeof jid !== "string") return;
  if (jid === "status@broadcast" || jid.endsWith("@broadcast")) return;
  if (!jid.endsWith("@g.us") && !jid.endsWith("@s.whatsapp.net")) return;
  recipients.set(jid, Date.now());
}

function getRecipients() {
  return [...recipients.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([jid]) => jid);
}

module.exports = { rememberRecipient, getRecipients };
