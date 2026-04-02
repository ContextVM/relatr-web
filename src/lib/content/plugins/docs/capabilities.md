# Capability reference

This page is the scannable reference for what Elo plugins can call today. The most important detail is that current graph capabilities use mixed argument conventions, so plugin authors should follow each capability's expected shape exactly.

## Most important gotcha

Graph capabilities are not yet fully normalized:

- some expect arrays (`graph.pubkey_exists`, `graph.is_following`)
- others expect named objects (`graph.are_mutual`, `graph.distance_between`)

Use the exact call shape shown below for each capability.

## Capability summary

| Capability                    | Args                           | Returns                    | Safe default        |
| ----------------------------- | ------------------------------ | -------------------------- | ------------------- |
| `nostr.query`                 | object filter                  | list of events             | `[]`                |
| `http.nip05_resolve`          | `{nip05: string}`              | `{pubkey: string \| null}` | `{pubkey: null}`    |
| `graph.stats`                 | `{}`                           | stats object               | zeroed stats object |
| `graph.all_pubkeys`           | `{}`                           | `string[]`                 | `[]`                |
| `graph.pubkey_exists`         | `[pubkey]`                     | `boolean`                  | `false`             |
| `graph.is_following`          | `[follower, followed]`         | `boolean`                  | `false`             |
| `graph.are_mutual`            | `{a, b}`                       | `boolean`                  | `false`             |
| `graph.distance_from_root`    | `{pubkey}`                     | `number`                   | `1000`              |
| `graph.distance_between`      | `{sourcePubkey, targetPubkey}` | `number`                   | `1000`              |
| `graph.users_within_distance` | `{distance}`                   | `string[]`                 | `[]`                |

## Quick invocation patterns

```elo
plan exists = do 'graph.pubkey_exists' [_.targetPubkey] in
exists == true
```

```elo
plan mutual = do 'graph.are_mutual' {a: _.sourcePubkey, b: _.targetPubkey} in
_.sourcePubkey != null and mutual == true
```

```elo
plan d = do 'graph.distance_between' {sourcePubkey: _.sourcePubkey, targetPubkey: _.targetPubkey} in
if _.sourcePubkey != null and d <= 2 then 1.0 else 0.0
```

## Safe result handling patterns

- list results: `events | []`
- object results: `obj | {}`
- optional fields: `fetch(obj, .field) | null`
- booleans: compare explicitly (`value == true`)
- distances: treat `1000` as effectively unreachable

## `nostr.query`

Query relays using a Nostr filter and return matching events.

- Args: object filter
- Returns: list of events
- Safe default: `[]`

## `http.nip05_resolve`

Resolve a NIP-05 identifier to a pubkey.

- Args: `{nip05: string}`
- Returns: `{pubkey: string | null}`
- Safe default: `{pubkey: null}`

## `graph.stats`

Return aggregate statistics for the loaded social graph.

- Args: `{}`
- Returns: stats object
- Safe default: zeroed stats object

## `graph.all_pubkeys`

Return all unique pubkeys in the loaded graph.

- Args: `{}`
- Returns: `string[]`
- Safe default: `[]`

## `graph.pubkey_exists`

Check whether a pubkey exists in the graph.

- Args: `[pubkey]`
- Returns: `boolean`
- Safe default: `false`

## `graph.is_following`

Check whether one pubkey directly follows another.

- Args: `[follower, followed]`
- Returns: `boolean`
- Safe default: `false`

## `graph.are_mutual`

Check whether two pubkeys follow each other.

- Args: `{a, b}`
- Returns: `boolean`
- Safe default: `false`

## `graph.distance_from_root`

Get hop distance from the graph root to a target pubkey.

- Args: `{pubkey}`
- Returns: `number`
- Safe default: `1000`

## `graph.distance_between`

Get hop distance between two arbitrary pubkeys.

- Args: `{sourcePubkey, targetPubkey}`
- Returns: `number`
- Safe default: `1000`

## `graph.users_within_distance`

Return all users reachable from the graph root within a distance.

- Args: `{distance}`
- Returns: `string[]`
- Safe default: `[]`
