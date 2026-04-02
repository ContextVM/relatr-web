# relatr-web

`relatr-web` is the SvelteKit frontend for browsing Relatr servers, exploring trust scores, and managing portable Elo plugins.

## What you can do

- connect to a Relatr server by pubkey
- browse and install plugin events from discovery relays
- manage installed plugin enablement and weight overrides (admin flow)
- publish new plugin events from the built-in publisher page
- read in-app plugin docs for authoring and publishing guidance

## Prerequisites

- Bun 1.x
- network access to Nostr relays

## Quick start

```bash
bun install
bun run dev
```

By default, the app runs at `http://127.0.0.1:5173` (or the next available port).

You can preselect a server pubkey via query param `s`:

```text
http://127.0.0.1:5173/?s=871a4f49cd124158e30f6111bd9e160e9aafe0f6086b7399554a0669cb16aa68
```

## Connectivity check (CLI)

Run this from `relatr-web/` to verify client connectivity to a server pubkey:

```bash
bun -e "import { RelatrClient } from './src/lib/ctxcn/RelatrClient.ts'; const server='871a4f49cd124158e30f6111bd9e160e9aafe0f6086b7399554a0669cb16aa68'; const client = new RelatrClient({ serverPubkey: server }); await new Promise((r)=>setTimeout(r, 1800)); const stats = await client.Stats({}); console.log(JSON.stringify({ ok: true, serverPubkey: server, sourcePubkey: stats.sourcePubkey, relatrVersion: stats.relatrVersion }, null, 2)); await client.disconnect();"
```

If `ok: true` prints with a valid `sourcePubkey`, transport and tool calls are working.

## Scripts

```bash
bun run dev
bun run build
bun run preview
bun run check
bun run lint
bun run format
```

## Plugin docs and routes

- Docs hub: `/plugins/docs`
- Getting started: `/plugins/docs/getting-started`
- Capability reference: `/plugins/docs/capabilities`
- Examples: `/plugins/docs/examples`
- Publishing: `/plugins/docs/publishing`
- Plugin publisher: `/plugins/publisher`

The markdown source for in-app docs lives under `src/lib/content/plugins/docs/`.

## Authoring notes

- The in-app docs are intentionally short and practical.
- Longer background docs live in `docs/`.
- Keep plugin examples aligned with the capability shapes documented in `src/lib/content/plugins/docs/capabilities.md`.
- When updating publishing guidance, keep `relatr-version` examples in sync with the current host release.

## Troubleshooting

- If server stats do not load, verify relay connectivity first.
- If marketplace results are empty, add or swap discovery relays.
- If plugin install/config actions fail, verify you are connected with an admin-capable signer.
