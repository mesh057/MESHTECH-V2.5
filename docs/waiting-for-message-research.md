# “Waiting for this message” investigation

## Findings

The issue is not caused by delaying command responses. It is an end-to-end encryption/retry problem.

The bot was pinned to `@whiskeysockets/baileys` `6.7.22`. The current legacy v6 release is `6.7.24`; upgrading to v7 was not chosen because v7 is ESM-only and changes LID/JID handling, which would require a larger migration.

Two code defects were confirmed:

1. The shared socket configuration returned a truthy fabricated message when a retry lookup missed. Baileys documentation says `getMessage` must return the original message, and a missing message should be `undefined`. A fabricated placeholder can consume a retry without restoring the original encrypted content.
2. The SQLite message store delayed writes with `setImmediate`. A retry could therefore run before the original message had been persisted. The store now writes synchronously before other message listeners continue.

The store also now falls back to the message ID if the exact remote JID does not match. This supports alternate JID forms during WhatsApp’s LID/phone-number addressing transitions.

## Changes applied

- Upgraded Baileys from `6.7.22` to `6.7.24`.
- Added `msgRetryCounterCache` to the socket configuration.
- Changed missing `getMessage` results from a fake conversation to `undefined`.
- Made incoming message persistence immediate.
- Added message-ID fallback lookup for alternate JIDs.

## Validation

- JavaScript syntax checks passed.
- Connection regression test passed.
- Command loader passed: 35/35 command files.
- Message-store exact-JID and alternate-JID lookup test passed.

## Evidence

- [1] Baileys troubleshooting explains that `getMessage` must return the original message for retry delivery and that a missing result should be undefined.
- [2] Baileys data-store documentation requires storing full WAMessage objects, wiring `getMessage`, persisting history, and keeping auth state separate from the message store.
- [3] WhatsApp says “Waiting for this message” can result from failed delivery, reinstall/replacement, outdated clients, or linked-device state; it recommends updating WhatsApp and unlinking/relinking the device.
- [4] Railway states that files outside a mounted volume are ephemeral and that a volume must be mounted at the path used by persistent auth and message files.
- [5] Baileys issue #1767 tracks the broader waiting-message bug and reports ongoing LID/iOS and sender-key cases even on v7, so the fix cannot guarantee recovery of messages whose encryption keys were never delivered by WhatsApp.

## References

[1]: https://baileys.wiki/advanced/troubleshooting "Baileys troubleshooting"
[2]: https://baileys.wiki/concepts/data-store "Baileys data store"
[3]: https://faq.whatsapp.com/3398056720476987 "WhatsApp: About Waiting for this message"
[4]: https://docs.railway.com/volumes "Railway volumes"
[5]: https://github.com/WhiskeySockets/Baileys/issues/1767 "Baileys waiting for message issue tracker"
