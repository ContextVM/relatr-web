# Getting started with Elo plugins

An Elo plugin is a small program that scores a target pubkey in the `[0.0, 1.0]` range. It is pure scoring logic: the host provides data through capabilities, and the plugin combines those inputs into a bounded trust signal.

## Inputs available to your plugin

The plugin receives a single input object named `_`.

- `_.targetPubkey`: the pubkey being scored
- `_.sourcePubkey`: the scorer pubkey, or `null`
- `_.now`: current Unix time for the evaluation run

## Authoring model

Use planning rounds when your next request depends on an earlier result.

```elo
plan <bindings> in
then <bindings> in
<score-expression>
```

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

This plugin asks the host for recent note events from the target pubkey, falls back to an empty list if the query fails, and turns that into a normalized score.

## Rules to remember

- Use `do` only as the full right-hand side of a `plan` or `then` binding.
- Capability args must evaluate to strict JSON.
- Treat every capability result as nullable and use safe fallbacks.
- Keep relay queries narrow and always prefer explicit limits.
