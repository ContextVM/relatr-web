# Publishing portable plugins

Portable plugins are published as Nostr kind `765` events. The event content is the Elo program, and the event tags carry the manifest metadata that operators see in the marketplace.

## Required fields

- `kind`: `765`
- `content`: plugin program text
- `tags`: manifest metadata
- required tags: `n`, `relatr-version`

## Recommended tags

- `title`
- `description`
- `weight`

## Example event

```json
{
	"kind": 765,
	"content": "plan notes = do 'nostr.query' {...} in ...",
	"tags": [
		["n", "activity_notes"],
		["relatr-version", "^0.1.16"],
		["title", "Activity score (notes)"],
		["description", "Scores higher for more recent notes."]
	]
}
```

## Versioning model

- same author pubkey
- same `n` tag
- newer `created_at` means newer version
- if timestamps tie, compare event ids lexicographically
