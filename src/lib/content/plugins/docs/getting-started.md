# Getting started with Elo plugins

This page is the shortest complete path from zero context to writing your first Relatr plugin.

The key idea is simple: a plugin is a small Elo program that returns a score in `[0.0, 1.0]` for a target pubkey. Relatr then combines many plugin scores with weights to produce a transparent trust algorithm.

## What problem plugins solve in Relatr

Relatr is not one fixed trust algorithm. It is a host that runs many small scoring programs.

Each plugin answers one narrow question such as:

- is this pubkey active on Nostr?
- does this profile have a valid NIP-05?
- is the target close to the graph root?
- is there mutual following between source and target?

Relatr takes those individual signals, applies weights, and exposes the composed result as a trust model that operators can inspect and tune.

That means plugin authors do not need to build a whole ranking system. They write one bounded signal well.

## What Elo is, and why Relatr uses it

[Elo](https://elo-lang.org/) is a portable, safe, functional expression language for working with data.

Relatr uses Elo because it gives plugin authors a language that is:

- portable enough to embed in a Nostr event
- safe because it does not execute arbitrary host code
- expressive enough for data transformation and scoring logic
- simple enough to read as `do this, then that`

Relatr extends the normal Elo model with a plugin execution flow centered on `plan`, `then`, and `do`.

## Practical Elo reference for plugin authors

You do not need to learn all of Elo before writing Relatr plugins, but you should be comfortable with the small subset used most often in plugin programs.

### Values and literals

These are the main literal forms you will use:

- numbers: `1`, `0.75`, `86400`
- strings: `'alice@example.com'`
- booleans: `true`, `false`
- null: `null`
- arrays: `[1, 2, 3]`
- objects: `{nip05: 'alice@example.com', limit: 1}`

These are especially important because `do` arguments must evaluate to strict JSON-shaped values.

### Reading the input object

Use `_` as the current plugin input.

Examples:

- `_.targetPubkey`
- `_.sourcePubkey`
- `_.now`

Inside plugins, `_` is the main way to access evaluation context.

### Variables with `let`

Use `let` when you want to name intermediate values inside a normal expression.

```elo
let
  events = notes | [],
  n = length(events)
in
if n > 5 then 0.8 else 0.2
```

Use `let` for pure value transformation. Use `plan` and `then` when a step includes `do` capability calls.

### Fallbacks with `|`

The `|` operator is one of the most useful tools in plugin authoring.

```elo
notes | []
fetch(profile, .nip05) | null
fetch(stats, .totalFollows) | 0
```

Read it as “or fallback to this value.”

Use it whenever capability results, fetched fields, or parsed data may be missing.

### Conditionals with `if`

Use `if ... then ... else ...` to map data into a score.

```elo
if n >= 30 then 1.0
else if n >= 12 then 0.75
else if n >= 2 then 0.3
else 0.0
```

Most plugins are fundamentally conditional scoring rules like this.

### Accessing object fields with `fetch`

Use `fetch(value, .field)` to read a field safely from an object-like value.

```elo
fetch(profile, .nip05) | null
fetch(nip05_res, .pubkey) | null
```

This is common when reading Nostr event content or capability result objects.

### Parsing JSON strings with `Data`

Some Nostr event fields, especially metadata event `content`, arrive as JSON strings.

```elo
profile = Data(fetch(ev, .content) | '{}')
```

Use `Data(...)` when you need to turn a JSON string into an Elo object you can inspect.

### Common built-in helpers you will use often

- `length(list)` to count items
- `first(list)` to take the first item
- `lower(text)` to normalize string comparison
- `fetch(obj, .field)` to read fields safely
- `Data(text)` to parse JSON content

### When to use `let` vs. `plan`

Use this rule of thumb:

- use `let` for pure computation on values you already have
- use `plan` or `then` when you need a `do` capability call

For example, this is valid:

```elo
plan notes = do 'nostr.query' {kinds: [1], authors: [_.targetPubkey], limit: 20} in
let
  events = notes | [],
  n = length(events)
in
if n > 5 then 0.8 else 0.2
```

And this is not the right model because `do` should not be nested inside a normal expression:

```elo
let notes = do 'nostr.query' {kinds: [1]} in 0.0
```

### Minimal Elo reading guide

When reading a plugin, scan it in this order:

1. what data comes from `_`?
2. what capabilities are called with `do`?
3. where are fallbacks handled with `|`?
4. how does the final `if` logic map inputs to a score?

If you can answer those four questions, you can usually understand the whole plugin.

If you want a fuller upstream language guide beyond this Relatr-focused introduction, see [Elo Learn](https://elo-lang.org/learn/).

## The core mental model: collect, then score

The easiest way to understand a plugin is:

1. read the current evaluation input from `_`
2. request external data with `do '<capability>' <json-args>`
3. optionally use `then` for later steps that depend on earlier results
4. compute a final numeric score

In other words: first collect, then score.

## Inputs available to your plugin

Each run gets a single input object named `_`.

- `_.targetPubkey`: the pubkey being scored
- `_.sourcePubkey`: the scorer pubkey, or `null` when no source context exists
- `_.now`: Unix time in seconds, fixed for the whole evaluation run

Because `_.now` is fixed per run, multiple plugins can reason about the same moment in time.

## Authoring model

Use one round when everything can be planned immediately, and additional rounds when later work depends on earlier results.

```elo
plan <bindings> in
then <bindings> in
<score-expression>
```

- `plan` starts the first round
- `then` starts another round
- each binding in a round is evaluated left-to-right
- a `do` call asks the host to execute a named capability
- the final expression should resolve to a score in `[0.0, 1.0]`

## What `do` means

`do` is how a plugin requests host-provided capabilities.

Examples of built-in Relatr capabilities include:

- `nostr.query`
- `http.nip05_resolve`
- `graph.are_mutual`
- `graph.distance_between`

Important constraint: a plugin cannot invent powers for itself. It can only ask for capabilities that the Relatr host provides. If the host does not expose a capability, the plugin cannot use it successfully.

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

What this does:

- asks the host for recent kind `1` note events from the target
- safely falls back to `[]` if the query fails or returns `null`
- maps the activity level to a bounded score

## A multi-step example

Use multiple rounds when a later capability call depends on data fetched earlier.

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

This reads naturally:

- first fetch metadata
- then extract `nip05`
- then resolve it
- then score the match

## Rules that prevent most failures

- Use `do` only as the full right-hand side of a `plan` or `then` binding.
- Capability args must evaluate to strict JSON.
- Treat every capability result as nullable and use safe fallbacks like `| []`, `| {}`, and `| null`.
- Keep relay queries narrow and always use explicit `limit`.
- Guard `_.sourcePubkey` before relationship checks.
- Keep each plugin focused on one signal instead of one whole trust model.

## Writing in the website publisher

[Publisher](/plugins/publisher) is the browser authoring flow for Relatr plugins.

Use it when you want to:

- draft source and manifest fields together
- validate the Elo program and Relatr-specific manifest
- preview the final kind `765` event shape
- publish directly to relays from the website

Recommended browser workflow:

1. Open [Publisher](/plugins/publisher).
2. Fill in the manifest: title, identifier, description, version range, and optional weight.
3. Paste or write the Elo source.
4. Click validate and fix all errors.
5. Publish the plugin as a kind `765` Nostr event.
6. Open [plugins](/plugins) to discover or install it on a Relatr server.

## Writing locally with Relo

`@contextvm/relo` is the local authoring layer for Relatr-flavored Elo plugins.

It exists for authoring-time workflows, not runtime execution. In practice, that means it helps you:

- validate plugin source against the Relatr capability catalog
- build canonical plugin artifacts
- publish from the CLI
- integrate local plugin work into editor or LLM-assisted workflows

Core CLI commands:

- `relo check` validates source or an artifact
- `relo build` turns source into a canonical plugin artifact
- `relo publish` signs if needed, validates, and publishes to relays

Example local workflow:

```bash
npx @contextvm/relo check plugin.elo
npx @contextvm/relo build plugin.elo --name activity_notes --relatr-version '^0.1.16'
npx @contextvm/relo publish plugin.json --relay wss://relay.example --sec <hex-or-nsec>
```

This is especially useful when iterating with local files, version control, terminal tooling, or LLM-assisted authoring.

## Website publisher vs. Relo CLI

Both flows use the same authoring contract, but they serve different environments.

| Tool              | Best for                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------ |
| website publisher | quick browser editing, validation, preview, and publishing                                 |
| Relo CLI          | local files, repeatable builds, editor integration, and scripted or LLM-assisted workflows |

## What gets published

A portable Relatr plugin is published as a Nostr kind `765` event:

- event `content`: the Elo program
- event `tags`: plugin manifest metadata such as identifier, title, description, version compatibility, and optional weight

That packaging model is what makes plugins portable, shareable, and discoverable through Nostr relays.

## Read next

- [Capabilities](/plugins/docs/capabilities) for exact capability shapes and safe defaults
- [Examples](/plugins/docs/examples) for copy-and-adapt patterns
- [Publishing](/plugins/docs/publishing) for event packaging, manifest, and publishing rules
