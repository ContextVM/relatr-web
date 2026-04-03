# Getting started with Elo plugins

An Elo plugin is a small scoring program that returns a value in `[0.0, 1.0]` for a target pubkey. It is pure logic: the host provides external data through capabilities, and your plugin transforms that into a bounded trust signal.

## Inputs available to your plugin

Each run gets a single input object named `_`.

- `_.targetPubkey`: pubkey being scored
- `_.sourcePubkey`: scorer pubkey, or `null`
- `_.now`: Unix time (seconds) fixed for the evaluation run

## Authoring model

Use planning rounds when later requests depend on earlier results.

```elo
plan <bindings> in
then <bindings> in
<score-expression>
```

## Fast local workflow

1. Open `/plugins/publisher`.
2. Start from the default example and click Validate.
3. Connect to a server pubkey in the main UI (you can prefill with `?s=<pubkey>`).
4. Install the plugin from `/plugins` and confirm it appears in plugin list/state.
5. Iterate with small changes and keep one variable change per edit while debugging.

## Smallest useful example

```elo
plan notes = do 'nostr.query' {
  kinds: [1],
  authors: [_.targetPubkey],
  since: _.now - 604800,
  limit: 20
} in
if length(notes | []) > 5 then 0.8 else 0.2
```

This requests recent note events, falls back safely, and maps activity to a normalized score.

## Rules that prevent most failures

- Use `do` only as the full right-hand side of a `plan` or `then` binding.
- Capability args must evaluate to strict JSON.
- Treat every capability result as nullable and use safe fallbacks (`| []`, `| {}`, `| null`).
- Keep relay queries narrow and always use explicit `limit`.
- Guard `_.sourcePubkey` before relationship checks.

## Read next

- `/plugins/docs/capabilities` for exact argument shapes and safe defaults.
- `/plugins/docs/examples` for copy-and-adapt patterns.
- `/plugins/docs/publishing` for manifest and versioning rules.
