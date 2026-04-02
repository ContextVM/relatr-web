# Plugin examples

Use these patterns as starting points. They show how portable Elo plugins can combine relay data, graph capabilities, and host-provided resolution helpers.

## Recent note activity

Use `nostr.query` to score a target based on recent note output.

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

## NIP-05 validation

Combine metadata lookup with `http.nip05_resolve` in two rounds.

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
