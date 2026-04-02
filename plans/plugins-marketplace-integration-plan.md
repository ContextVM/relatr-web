# Relatr website plugin marketplace integration plan

## Goal

Integrate portable Elo plugins into the website with a focused first slice that lets users:

- discover plugins from relay-based catalogs
- inspect plugin metadata before install
- install plugins into the currently selected Relatr instance
- manage installed plugins from a dedicated admin area

This plan is grounded in the server API exposed by [`RelatrClient`](../src/lib/ctxcn/RelatrClient.ts:194), the current page structure in [`src/routes/+page.svelte`](../src/routes/+page.svelte) and [`src/routes/ta/+page.svelte`](../src/routes/ta/+page.svelte), and the plugin model described in [`docs/relatr-plugins-spec-v1.md`](../docs/relatr-plugins-spec-v1.md) and [`docs/user-story-portable-plugins.md`](../docs/user-story-portable-plugins.md).

## Product shape

Create a new top-level website area for plugins with two connected surfaces:

1. **Marketplace**
   - discovery from configurable relays
   - plugin browsing and inspection
   - install initiation

2. **Installed**
   - installed plugin list from the selected server
   - enable or disable controls
   - weight override controls
   - uninstall actions

For the first stage, both surfaces should live in a single route with tabs, following the same pattern already used by [`Tabs`](../src/routes/+page.svelte:80).

The Installed tab should only be shown when [`StatsOutput.isAdmin`](../src/lib/ctxcn/RelatrClient.ts:66) is true, or be visibly disabled when the current user is not an admin. Marketplace browsing should remain available to everyone.

## First vertical slice

The initial implementation should prove the full path:

**Discover → Inspect → Install → Verify in Installed list**

### User flow

1. User opens the new plugins page
2. Website loads default catalog relays
3. User can adjust the relay list used for discovery
4. Website queries those relays for plugin events of kind `765`
5. Marketplace displays normalized plugin cards
6. User inspects a plugin and chooses install
7. Website calls the current Relatr server to install the plugin
8. Website refreshes installed plugin state
9. Installed tab shows the plugin and its runtime state

This delivers the core user story without overcommitting to advanced ranking, curation, or update flows.

## Information architecture

### Route

- [`src/routes/plugins/+page.svelte`](../src/routes/plugins/+page.svelte)

### Top-level sections

#### 1. Context bar

Show both network contexts clearly:

- current selected Relatr server
- current catalog relays for plugin discovery
- current account state if present
- server capabilities from [`StatsOutput`](../src/lib/ctxcn/RelatrClient.ts:66), especially:
  - `isAdmin`
  - `relatrVersion`

This should prevent confusion between the server being administered and the relays being browsed.

#### 2. Marketplace tab

Contains:

- relay catalog controls
- search and filtering
- marketplace cards
- plugin detail view or install dialog

Each card should show at least:

- plugin title
- plugin key from the `n` tag
- author pubkey
- short description
- compatibility range
- suggested weight
- source relay context
- installed badge if already present on the current server

#### 3. Installed tab

Contains the server-owned runtime state from [`PluginsList`](../src/lib/ctxcn/RelatrClient.ts:293):

- title or name
- plugin key
- enabled state
- effective weight
- default weight
- installed event id if available
- author pubkey if available
- created date or version info if available

Each row should expose:

- enable or disable action
- weight override action
- uninstall action

This tab should be gated by [`StatsOutput.isAdmin`](../src/lib/ctxcn/RelatrClient.ts:66):

- if `true`, show the tab normally
- if `false`, either hide it or render it disabled with an explanatory label

The preferred UX for the first stage is to keep the Marketplace tab always accessible and use the Installed tab as the explicit admin surface.

## Architecture

### Separation of responsibilities

#### Client-side discovery

The website should discover plugins directly from relays, not from the Relatr server.

Responsibilities:

- query Nostr relays for kind `765` plugin events
- parse manifest tags such as `n`, `title`, `description`, `weight`, and `relatr-version`
- group versions by author pubkey plus plugin key
- choose a preferred visible version for the marketplace

This keeps discovery aligned with the portable plugin model in [`docs/relatr-plugins-spec-v1.md`](../docs/relatr-plugins-spec-v1.md).

#### Server-side management

The selected Relatr server remains authoritative for installation and runtime state.

Primary integration points:

- [`Stats`](../src/lib/ctxcn/RelatrClient.ts:269)
- [`PluginsList`](../src/lib/ctxcn/RelatrClient.ts:293)
- [`PluginsInstall`](../src/lib/ctxcn/RelatrClient.ts:305)
- [`PluginsConfig`](../src/lib/ctxcn/RelatrClient.ts:319)
- [`PluginsUninstall`](../src/lib/ctxcn/RelatrClient.ts:328)

This boundary is important:

- marketplace browsing is open and relay-based
- install and configuration are server-admin actions

## Optimizing for fewer server calls

Now that [`StatsOutput`](../src/lib/ctxcn/RelatrClient.ts:66) includes `isAdmin` and `relatrVersion`, the UI can avoid separate capability or role checks.

The right optimization model here is the one already used in the codebase through [`createQuery`](../src/lib/queries/server-stats.ts:1), shared key factories in [`src/lib/query-keys.ts`](../src/lib/query-keys.ts), and the shared client policy in [`src/lib/query-client.ts`](../src/lib/query-client.ts:4). Because requests are signed, the gains come from stable query keys, cache reuse, enabled guards, and optimistic mutation handling rather than manual request parallelization.

Recommended strategy:

- add plugin-specific query keys next to [`serverKeys`](../src/lib/query-keys.ts:1), [`searchKeys`](../src/lib/query-keys.ts:12), and [`taProviderKeys`](../src/lib/query-keys.ts:18)
- implement plugin server queries with [`createQuery`](../src/lib/queries/server-stats.ts:5), following the existing [`useServerStats`](../src/lib/queries/server-stats.ts:5) and [`useTaProviderStatus`](../src/lib/queries/ta-provider.ts:13) patterns
- rely on the existing query client defaults in [`queryClient`](../src/lib/query-client.ts:4), especially shared `staleTime`, browser-only enablement, and `retry: false`
- fetch [`Stats`](../src/lib/ctxcn/RelatrClient.ts:269) as the primary bootstrap query for server context
- only enable [`PluginsList`](../src/lib/ctxcn/RelatrClient.ts:293) when the user is an admin, or when the Installed tab is meant to be rendered for admins
- after install, config, or uninstall, use optimistic mutation updates where safe and invalidate only plugin-related queries

Suggested additions to [`src/lib/query-keys.ts`](../src/lib/query-keys.ts):

```ts
export const pluginKeys = {
	all: ['plugins'] as const,
	server: (serverPubkey: string) => [...pluginKeys.all, serverPubkey] as const,
	list: (serverPubkey: string, verbose = true) =>
		[...pluginKeys.server(serverPubkey), 'list', verbose] as const
} as const;
```

Suggested query shape aligned with current usage:

```ts
import { createQuery } from '@tanstack/svelte-query';
import { serverKeys, pluginKeys } from '$lib/query-keys';
import type { PluginsListOutput, RelatrClient, StatsOutput } from '$lib/ctxcn/RelatrClient';

export function useServerStats(relatrClient: RelatrClient | null, serverPubkey: string) {
	return createQuery<StatsOutput | null>(() => ({
		queryKey: serverKeys.stats(serverPubkey),
		queryFn: async () => {
			if (!relatrClient || !serverPubkey) return null;
			return await relatrClient.Stats({});
		},
		enabled: !!relatrClient && !!serverPubkey
	}));
}

export function usePluginsList(
	relatrClient: RelatrClient | null,
	serverPubkey: string,
	isAdmin: boolean
) {
	return createQuery<PluginsListOutput | null>(() => ({
		queryKey: pluginKeys.list(serverPubkey, true),
		queryFn: async () => {
			if (!relatrClient || !serverPubkey) return null;
			return await relatrClient.PluginsList(true);
		},
		enabled: !!relatrClient && !!serverPubkey && isAdmin
	}));
}
```

Use [`Stats`](../src/lib/ctxcn/RelatrClient.ts:269) as the source of truth for:

- whether admin actions should be shown or enabled
- which compatibility badges to compute against the current Relatr version
- general server context shown in the page header

Use [`PluginsList(true)`](../src/lib/ctxcn/RelatrClient.ts:293) as the source of truth for:

- installed plugin inventory
- already-installed marketplace badges
- current enablement and effective weight state

After mutations, prefer optimistic updates and targeted invalidation of the installed-plugins query rather than re-fetching all page data. The plan should follow the same cache-oriented style used elsewhere on the site, not bespoke page bootstrap logic.

Conceptually:

- install mutation updates or invalidates [`pluginKeys.list()`](../src/lib/query-keys.ts)
- config mutation updates or invalidates [`pluginKeys.list()`](../src/lib/query-keys.ts)
- uninstall mutation updates or invalidates [`pluginKeys.list()`](../src/lib/query-keys.ts)
- [`serverKeys.stats()`](../src/lib/query-keys.ts:4) should remain stable unless a later product need ties plugin actions to server-level metadata changes

The same pattern should apply after [`PluginsConfig`](../src/lib/ctxcn/RelatrClient.ts:319) and [`PluginsUninstall`](../src/lib/ctxcn/RelatrClient.ts:328), with optimistic updates where practical.

## Relay catalogs as a product model

Treat relays as catalogs or repositories.

### Initial policy

- ship with a predefined set of discovery relays
- allow users to edit that list in the UI
- persist discovery relays locally on the client
- keep discovery relay state separate from the selected server state in [`server-config.svelte.ts`](../src/lib/stores/server-config.svelte.ts:1)

This keeps the model flexible while still giving users a good default experience.

## Data models

Reuse types from [`RelatrClient`](../src/lib/ctxcn/RelatrClient.ts:194) wherever possible rather than introducing new local server-facing types. In particular, server query return values should use [`StatsOutput`](../src/lib/ctxcn/RelatrClient.ts:66) and [`PluginsListOutput`](../src/lib/ctxcn/RelatrClient.ts:113) directly.

### Marketplace entry

Discovery still needs a client-side normalized shape because relay event data is not the same as server runtime state:

```ts
type MarketplacePlugin = {
	pluginKey: string;
	authorPubkey: string;
	eventId: string;
	nevent?: string;
	title?: string;
	description?: string;
	relatrVersion?: string;
	defaultWeight?: number;
	createdAt: number;
	sourceRelays: string[];
	installed: boolean;
};
```

### Installed plugin entry

Do not define a duplicate installed-plugin type if it is not necessary. Prefer reusing [`PluginsListOutput`](../src/lib/ctxcn/RelatrClient.ts:113) and deriving item types from it in the implementation.

## Compatibility and trust

The marketplace should be informative without pretending to be authoritative.

### UI should communicate

- plugin author pubkey
- source relays
- event id and optionally `nevent`
- declared compatibility range
- whether the current server appears compatible
- whether the current user appears able to administer the selected server

### Authority boundaries

- the website performs best-effort compatibility checks using `relatrVersion`
- the server remains authoritative for install success and admin enforcement
- browsing should remain possible even if the user is not an admin
- non-admin users should not see active management controls in the Installed area

## Suggested implementation pieces

Likely integration points:

- add navigation entry in [`src/lib/components/header.svelte`](../src/lib/components/header.svelte:28)
- add a new route at [`src/routes/plugins/+page.svelte`](../src/routes/plugins/+page.svelte)
- add plugin-focused query and mutation modules alongside existing patterns in [`src/lib/queries`](../src/lib/queries) and [`src/lib/mutations`](../src/lib/mutations)

Suggested component split:

- `PluginCatalogControls`
- `PluginMarketplaceGrid`
- `PluginCard`
- `PluginInstallDialog`
- `InstalledPluginsPanel`
- `InstalledPluginRow`

Suggested query layer additions:

- [`src/lib/queries/plugins.ts`](../src/lib/queries/plugins.ts)
- a new `pluginKeys` entry in [`src/lib/query-keys.ts`](../src/lib/query-keys.ts)

These should mirror the current structure of [`useServerStats`](../src/lib/queries/server-stats.ts:5), [`useTaProviderStatus`](../src/lib/queries/ta-provider.ts:13), and [`useSearchProfiles`](../src/lib/queries/search.ts:5).

## Implementation sequence

1. Add new plugins route and header navigation entry
2. Build page shell with Marketplace and Installed tabs
3. Add shared plugin query keys and Svelte Query helpers consistent with [`src/lib/query-keys.ts`](../src/lib/query-keys.ts) and [`src/lib/query-client.ts`](../src/lib/query-client.ts:4)
4. Add server state queries using [`Stats`](../src/lib/ctxcn/RelatrClient.ts:269) and conditionally [`PluginsList`](../src/lib/ctxcn/RelatrClient.ts:293)
5. Gate the Installed tab from [`StatsOutput.isAdmin`](../src/lib/ctxcn/RelatrClient.ts:66)
6. Implement client-side discovery from configurable relays
7. Normalize plugin events into marketplace entries
8. Implement install flow using [`PluginsInstall`](../src/lib/ctxcn/RelatrClient.ts:305)
9. Refresh installed state through optimistic mutation handling and targeted query invalidation
10. Add enable or disable, weight override, and uninstall controls via [`PluginsConfig`](../src/lib/ctxcn/RelatrClient.ts:319) and [`PluginsUninstall`](../src/lib/ctxcn/RelatrClient.ts:328)
11. Add trust and compatibility messaging

## Non-goals for this first stage

Do not optimize for these yet:

- advanced plugin ranking
- curated featured sections
- plugin reviews or reputation layers
- update channels and auto-upgrade flows
- rich per-plugin configuration schemas
- multi-page deep marketplace IA

## Summary

The recommended first stage is a single focused plugin page that combines:

- client-side relay-based discovery
- server-side installation and runtime management
- admin-aware UX using `Stats.isAdmin`
- compatibility-aware UX using `Stats.relatrVersion`
- an admin-aware tab model driven by `Stats.isAdmin`
- a Svelte Query-based server call pattern centered on cached queries, optimistic mutations, and targeted invalidation

This is a strong first step because it validates the full marketplace vision while keeping responsibilities clear and implementation risk low.
