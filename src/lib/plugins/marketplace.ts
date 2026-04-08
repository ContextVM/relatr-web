import { browser } from '$app/environment';
import { defaultRelays } from '$lib/services/relay-pool';

export const DISCOVERY_RELAYS_STORAGE_KEY = 'relatr.plugin.discoveryRelays';

export function loadDiscoveryRelays() {
	if (!browser) return [...defaultRelays];
	const raw = localStorage.getItem(DISCOVERY_RELAYS_STORAGE_KEY);
	if (!raw) return [...defaultRelays];

	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [...defaultRelays];
		const cleaned = parsed.filter((relay): relay is string => typeof relay === 'string' && !!relay);
		return cleaned.length > 0 ? cleaned : [...defaultRelays];
	} catch {
		return [...defaultRelays];
	}
}

export function normalizeRelayUrl(value: string): string | null {
	const trimmed = value.trim();
	if (!trimmed) return null;

	try {
		const url = new URL(trimmed);
		if (!['ws:', 'wss:'].includes(url.protocol)) return null;
		return url.href;
	} catch {
		return null;
	}
}

export function parseRelayList(relays: string[]): string[] {
	return Array.from(
		new Set(
			relays.map((relay) => normalizeRelayUrl(relay)).filter((relay): relay is string => !!relay)
		)
	);
}

export function persistDiscoveryRelays(relays: string[]) {
	if (!browser) return;
	localStorage.setItem(DISCOVERY_RELAYS_STORAGE_KEY, JSON.stringify(relays));
}

export function encodePluginRouteId(authorPubkey: string, pluginName: string): string {
	return `${encodeURIComponent(authorPubkey)}/${encodeURIComponent(pluginName)}`;
}

export function encodeAuthorRouteId(authorPubkey: string): string {
	return encodeURIComponent(authorPubkey);
}

export function decodePluginRouteId(value: string): {
	authorPubkey: string;
	pluginName: string;
} | null {
	const [authorPubkey, ...rest] = value.split('/');
	if (!authorPubkey || rest.length === 0) return null;

	try {
		return {
			authorPubkey: decodeURIComponent(authorPubkey),
			pluginName: decodeURIComponent(rest.join('/'))
		};
	} catch {
		return null;
	}
}

export function decodeMarketplaceRouteId(value: string):
	| {
			kind: 'author';
			authorPubkey: string;
	  }
	| {
			kind: 'plugin';
			authorPubkey: string;
			pluginName: string;
	  }
	| null {
	if (!value) return null;

	const parts = value.split('/');

	if (parts.length === 1) {
		try {
			return {
				kind: 'author',
				authorPubkey: decodeURIComponent(parts[0])
			};
		} catch {
			return null;
		}
	}

	const decodedPlugin = decodePluginRouteId(value);
	if (!decodedPlugin) return null;

	return {
		kind: 'plugin',
		...decodedPlugin
	};
}

export function getMarketplacePluginName(plugin: {
	n?: string;
	title?: string;
	pluginKey: string;
}) {
	return plugin.n || plugin.title || plugin.pluginKey;
}

export function getPluginDetailsHref(plugin: {
	authorPubkey: string;
	n?: string;
	title?: string;
	pluginKey: string;
	eventId?: string;
}) {
	const basePath = `/plugins/${encodePluginRouteId(plugin.authorPubkey, getMarketplacePluginName(plugin))}`;

	if (!plugin.eventId) return basePath;

	const params = new URLSearchParams({ version: plugin.eventId });
	return `${basePath}?${params.toString()}`;
}

export function getAuthorDetailsHref(authorPubkey: string) {
	return `/plugins/${encodeAuthorRouteId(authorPubkey)}`;
}
