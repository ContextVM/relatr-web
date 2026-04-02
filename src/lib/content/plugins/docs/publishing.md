# Publishing portable plugins

Portable plugins are published as Nostr kind `765` events. The event content is the Elo program, and the event tags carry the manifest metadata that operators see in the marketplace.

## Authoring workflow

1. Draft and validate in `/plugins/publisher`.
2. Confirm manifest fields and `relatr-version` compatibility.
3. Publish the signed kind `765` event.
4. Install by event id (or `nevent`) from `/plugins`.
5. Verify enablement/weight in plugin runtime state.

## Required fields

- `kind`: `765`
- `content`: plugin program text
- `tags`: manifest metadata
- required tags: `n`, `relatr-version`

## Recommended tags

- `title`
- `description`
- `weight`

`weight` should be a number between `0` and `1`.

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

## Compatibility guidance

- Use a semver range in `relatr-version` that reflects what you tested.
- Prefer the current publisher default (`^0.1.16`) unless you have validated against a newer host range.
- If you rely on new capabilities, bump the minimum compatible version.

## Versioning model

- same author pubkey
- same `n` tag
- newer `created_at` means newer version
- if timestamps tie, compare event ids lexicographically

## Pre-publish checklist

- identifier `n` is stable and machine-safe
- title/description explain behavior in one glance
- score output remains in `[0.0, 1.0]`
- capability args are strict JSON
- nullable results have explicit fallbacks
