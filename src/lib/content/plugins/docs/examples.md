# Plugin examples

Use these examples as patterns, not as canonical truth. The point is to show how plugin authors can combine Elo expressions, host capabilities, and safe fallback handling to produce one clear scoring signal at a time.

## Before you copy one

- Keep result handling nullable with `| []`, `| {}`, or `| null`.
- Keep relay queries bounded with explicit `limit`.
- Guard `_.sourcePubkey` when relationship logic needs a scorer.
- Prefer one focused signal per plugin.
- Change one variable at a time while debugging.

## Recent note activity

Use [`nostr.query`](./capabilities) to score a target based on recent note output.

```elo
plan
  notes = do 'nostr.query' {
    kinds: [1],
    authors: [_.targetPubkey],
    since: _.now - 604800,
    limit: 50
  }
in
let
  events = notes | [],
  n = length(events)
in
if n >= 30 then 1.0
else if n >= 12 then 0.75
else if n >= 2 then 0.3
else 0.0
```

Why this pattern is useful:

- it uses one bounded relay query
- it treats missing results safely
- it maps an observable behavior into a normalized score

## NIP-05 validation

Combine metadata lookup with [`http.nip05_resolve`](./capabilities) in two rounds.

```elo
plan
  meta = do 'nostr.query' {kinds: [0], authors: [_.targetPubkey], limit: 1}
in then
  ev = first(meta | []),
  profile = Data(fetch(ev, .content) | '{}'),
  nip05 = fetch(profile, .nip05) | null,
  nip05_res = do 'http.nip05_resolve' {nip05: nip05}
in
if nip05 == null then 0.0
else if lower(fetch(nip05_res, .pubkey) | '') == lower(_.targetPubkey) then 1.0
else 0.0
```

Why this pattern is useful:

- it shows why `then` exists
- it demonstrates capability chaining
- it keeps all nullable boundaries explicit

## Reciprocity plus activity

Combine graph and relay signals in one plugin.

```elo
plan
  mutual = do 'graph.are_mutual' {a: _.sourcePubkey, b: _.targetPubkey},
  notes = do 'nostr.query' {kinds: [1], authors: [_.targetPubkey], limit: 20}
in
let
  activity = if length(notes | []) > 10 then 0.8 else if length(notes | []) > 0 then 0.4 else 0.0
in
if _.sourcePubkey != null and mutual == true then 1.0 else activity
```

Why this pattern is useful:

- it combines graph context with live relay data
- it preserves a useful fallback when source context is missing
- it shows how one plugin can blend signals while still staying readable

## Distance-based graph trust

Use graph distance as a simple trust heuristic.

```elo
plan
  d = do 'graph.distance_from_root' {pubkey: _.targetPubkey}
in
if d <= 1 then 1.0
else if d <= 2 then 0.7
else if d <= 4 then 0.3
else 0.0
```

Why this pattern is useful:

- it avoids relay access entirely
- it is easy for operators to understand
- it demonstrates a plugin based on structural trust rather than activity

## Simple existence guard

Sometimes a binary signal is enough.

```elo
plan
  exists = do 'graph.pubkey_exists' {pubkey: _.targetPubkey}
in
if exists == true then 1.0 else 0.0
```

Why this pattern is useful:

- it is minimal and easy to test
- it demonstrates the standard object-shaped graph capability call pattern
- it is a good first plugin when learning the model

## How to adapt these examples safely

- change the thresholds before changing the overall structure
- prefer adding one new capability at a time
- keep fallback handling in place even if your happy-path data looks reliable
- if a later step depends on an earlier result, split it into another `then` round
