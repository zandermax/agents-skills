# Copilot Plan Snapshot Provenance

This directory stores the immutable official Copilot Plan input used by the executable planning composition pipeline.

## Source

- Source path: `/Users/zander/Library/Application Support/Code/User/globalStorage/github.copilot-chat/plan-agent/Plan.agent.md`
- Capture date: 2026-08-28
- Upstream version: unavailable
- SHA-256: `f941698683bf4fbb09c612177d27879fc242c8a55236a9127ee899acc784adfe`
- Bytes: 5250
- Lines: 105

## Update Procedure

1. Replace `vendor/copilot/Plan.agent.md` with a byte-preserving copy from the official local source.
2. Recompute SHA-256 plus byte and line counts and update this file only when values change.
3. Update exact transforms only if required by the new official source.
4. Run `npm run build`.
5. Inspect the resulting diff before formatting.
6. Run `npm run format`.
7. Run `npm run check`.
8. Confirm `vendor/copilot/Plan.agent.md` still matches the pinned checksum when no source update was intended.
