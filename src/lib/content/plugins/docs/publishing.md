# Publishing portable plugins

Portable Relatr plugins are published as Nostr kind `765` events. The Elo program lives in the event `content`, and the manifest metadata lives in event `tags`.

That packaging decision matters because it makes plugin distribution native to Nostr itself: plugins can be published to relays, discovered by clients, installed by reference, mirrored, and curated without introducing a separate distribution system.

## Publishing flow at a glance

1. Write and validate the plugin source.
2. Attach manifest metadata.
3. Publish the signed kind `765` event.
4. Discover or install the plugin by event id or `nevent`.
5. Enable it on a Relatr server and adjust its weight if needed.

## Event structure

Required top-level pieces:

- `kind`: `765`
- `content`: the complete Elo plugin program text
- `tags`: manifest metadata

Required manifest tags:

- `n`: stable plugin identifier
- `relatr-version`: compatible Relatr semver range

Recommended manifest tags:

- `title`
- `description`
- `weight`

If present, `weight` should be a stringified number in the `0` to `1` range.

## Example event

```json
{
	"kind": 765,
	"content": "plan notes = do 'nostr.query' {...} in ...",
	"tags": [
		["n", "activity_notes"],
		["relatr-version", "^0.1.16"],
		["title", "Activity score (notes)"],
		["description", "Scores higher for more recent notes."],
		["weight", "0.40"]
	]
}
```

## What each manifest field should communicate

### `n`

Use `n` as the stable machine identifier for the plugin.

Good identifiers are:

- lowercase
- short but descriptive
- stable across plugin revisions
- safe to reference from tooling

Examples:

- `activity_notes`
- `nip05_match`
- `graph_distance_root`

### `title`

Use a human-readable title that explains the scoring signal in one glance.

### `description`

Use the description to tell operators what the plugin measures, not how clever the implementation is.

Good descriptions answer:

- what is being measured?
- what data sources are used?
- what does a high score mean?

### `relatr-version`

This tag tells hosts which Relatr versions the plugin expects.

Use a range that reflects the capability surface you actually tested against.

### `weight`

This is an optional suggested default weight. Operators can override it after installation.

Think of it as a starting recommendation, not a guarantee.

## Publishing from the website

Use [publisher](/plugins/publisher) when you want the browser flow.

The publisher helps you:

- edit manifest and source together
- validate both the Elo program and Relatr manifest
- preview the final event payload
- publish directly to selected relays

Suggested flow:

1. Draft the source.
2. Fill in title, identifier, description, version range, and optional weight.
3. Validate until there are no blocking errors.
4. Sign and publish.

## Publishing from the CLI with Relo

Use `@contextvm/relo` when you want a local or scripted workflow.

Examples:

```bash
npx @contextvm/relo build plugin.elo --name activity_notes --relatr-version '^0.1.16'
npx @contextvm/relo check activity_notes.json
npx @contextvm/relo publish activity_notes.json --relay ws://localhost:10547 --sec <hex-or-nsec>
```

This flow is better suited to local files, version control, CI-style validation, or LLM-assisted iteration where you want the plugin lifecycle available in the terminal.

## Compatibility guidance

- Use a semver range in `relatr-version` that matches what you tested.
- If you depend on capabilities or behavior introduced in a newer host version, raise the minimum compatible version.
- Do not advertise compatibility wider than you have actually validated.

## Versioning model

Relatr treats versions as successive published events that share identity traits.

Useful practical model:

- same author pubkey
- same `n` tag
- newer `created_at` means newer revision
- if timestamps tie, compare event ids lexicographically

This means you can evolve a plugin over time without changing its stable identity.

## Install and verify after publishing

After publishing:

1. open [plugins](/plugins)
2. install by event id, note id, or `nevent`
3. confirm the plugin appears in the installed list
4. enable or disable it as needed
5. verify the effective weight on the server

## Pre-publish checklist

- identifier `n` is stable and machine-safe
- title and description explain the scoring behavior clearly
- score output remains in `[0.0, 1.0]`
- capability args are strict JSON
- nullable results have explicit fallbacks
- query filters are bounded and use explicit `limit` where relevant
