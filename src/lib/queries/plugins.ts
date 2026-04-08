import { createQuery } from '@tanstack/svelte-query';
import type { NostrEvent } from 'nostr-tools';
import { firstValueFrom, timeout, catchError, of, toArray } from 'rxjs';
import { onlyEvents } from 'applesauce-relay/operators';
import { decode } from 'nostr-tools/nip19';
import { pluginKeys } from '$lib/query-keys';
import { relayPool } from '$lib/services/relay-pool';
import type { PluginsListOutput, Relatr } from '$lib/ctxcn/RelatrClient';
import { encodeNevent } from '$lib/utils.nostr';
import { isHex } from 'applesauce-core/helpers';

const PLUGIN_EVENT_KIND = 765;

export type InstalledPlugin = PluginsListOutput['plugins'][number];

export type MarketplacePlugin = {
	pluginKey: string;
	authorPubkey: string;
	eventId: string;
	nevent: string;
	title?: string;
	n?: string;
	description?: string;
	relatrVersion?: string;
	defaultWeight?: number;
	createdAt: number;
	installed: boolean;
	updateAvailable?: boolean;
	installedPlugin?: InstalledPlugin;
	content: string;
	rawEvent: NostrEvent;
};

function getFirstTagValue(event: NostrEvent, tagName: string): string | undefined {
	return event.tags.find((tag) => tag[0] === tagName)?.[1];
}

function parseNumber(value: string | undefined): number | undefined {
	if (!value) return undefined;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizePluginEvent(event: NostrEvent, relay: string): MarketplacePlugin | null {
	const pluginKey = getFirstTagValue(event, 'n');
	if (!pluginKey) return null;
	return {
		pluginKey: `${event.pubkey}:${pluginKey}`,
		authorPubkey: event.pubkey,
		eventId: event.id,
		n: getFirstTagValue(event, 'n'),
		nevent: encodeNevent(event.id, [relay], PLUGIN_EVENT_KIND),
		title: getFirstTagValue(event, 'title'),
		description: getFirstTagValue(event, 'description'),
		relatrVersion: getFirstTagValue(event, 'relatr-version'),
		defaultWeight: parseNumber(getFirstTagValue(event, 'weight')),
		createdAt: event.created_at,
		installed: false,
		content: event.content,
		rawEvent: event
	};
}

function mergeMarketplacePlugins(events: MarketplacePlugin[]): MarketplacePlugin[] {
	const merged = new Map<string, MarketplacePlugin>();

	for (const plugin of events) {
		const key = plugin.pluginKey;
		const existing = merged.get(key);

		if (!existing) {
			merged.set(key, plugin);
			continue;
		}

		const preferred = plugin.createdAt > existing.createdAt ? plugin : existing;

		merged.set(key, {
			...preferred
		});
	}

	return Array.from(merged.values()).sort((a, b) => b.createdAt - a.createdAt);
}

function dedupeMarketplacePluginVersions(events: MarketplacePlugin[]): MarketplacePlugin[] {
	const merged = new Map<string, MarketplacePlugin>();

	for (const plugin of events) {
		const existing = merged.get(plugin.eventId);

		if (!existing) {
			merged.set(plugin.eventId, plugin);
			continue;
		}

		const preferred = plugin.nevent.length >= existing.nevent.length ? plugin : existing;
		merged.set(plugin.eventId, preferred);
	}

	return Array.from(merged.values()).sort((a, b) => b.createdAt - a.createdAt);
}

async function requestRelayPlugins(relays: string[]): Promise<MarketplacePlugin[]> {
	if (relays.length === 0) return [];

	const responses: MarketplacePlugin[][] = [];

	for (const relay of relays) {
		const events = await firstValueFrom(
			relayPool.request([relay], { kinds: [PLUGIN_EVENT_KIND], limit: 200 }).pipe(
				onlyEvents(),
				toArray(),
				catchError(() => of([]))
			)
		);

		responses.push(
			events
				.map((event) => normalizePluginEvent(event, relay))
				.filter((plugin): plugin is MarketplacePlugin => plugin !== null)
		);
	}

	return mergeMarketplacePlugins(responses.flat());
}

async function requestRelayPluginVersions(relays: string[]): Promise<MarketplacePlugin[]> {
	if (relays.length === 0) return [];

	const responses: MarketplacePlugin[][] = [];

	for (const relay of relays) {
		const events = await firstValueFrom(
			relayPool.request([relay], { kinds: [PLUGIN_EVENT_KIND], limit: 200 }).pipe(
				onlyEvents(),
				toArray(),
				catchError(() => of([]))
			)
		);

		responses.push(
			events
				.map((event) => normalizePluginEvent(event, relay))
				.filter((plugin): plugin is MarketplacePlugin => plugin !== null)
		);
	}

	return dedupeMarketplacePluginVersions(responses.flat());
}

function getReferenceRelays(identifier: string, fallbackRelays: string[]): string[] {
	try {
		const decoded = decode(identifier);
		if (decoded.type === 'nevent') {
			const relays = decoded.data.relays ?? [];
			return Array.from(new Set([...relays, ...fallbackRelays]));
		}
	} catch {
		// noop
	}

	return fallbackRelays;
}

async function requestMarketplacePluginByReference(
	identifier: string,
	fallbackRelays: string[]
): Promise<MarketplacePlugin | null> {
	const trimmed = identifier.trim();
	if (!trimmed) return null;

	let eventId: string;

	try {
		const decoded = decode(trimmed);
		if (decoded.type === 'note') {
			eventId = decoded.data;
		} else if (decoded.type === 'nevent') {
			eventId = decoded.data.id;
		} else {
			return null;
		}
	} catch {
		if (!isHex(trimmed)) return null;
		eventId = trimmed;
	}

	const relays = getReferenceRelays(trimmed, fallbackRelays);
	if (relays.length === 0) return null;

	for (const relay of relays) {
		const events = await firstValueFrom(
			relayPool.request([relay], { ids: [eventId], limit: 1 }).pipe(
				onlyEvents(),
				timeout({ first: 5000 }),
				toArray(),
				catchError(() => of([]))
			)
		);

		const plugin = events
			.map((event) => normalizePluginEvent(event, relay))
			.find((value): value is MarketplacePlugin => value !== null);

		if (plugin) return plugin;
	}

	return null;
}

export function usePluginsList(relatrClient: Relatr | null, serverPubkey: string) {
	return createQuery<PluginsListOutput | null>(() => ({
		queryKey: pluginKeys.list(serverPubkey, true),
		queryFn: async () => {
			if (!relatrClient || !serverPubkey) return null;
			return await relatrClient.PluginsList(true);
		},
		enabled: !!relatrClient && !!serverPubkey,
		retry: 1
	}));
}

export function useMarketplacePlugins(relays: string[]) {
	return createQuery<MarketplacePlugin[]>(() => ({
		queryKey: pluginKeys.marketplace(relays),
		queryFn: async () => {
			return await requestRelayPlugins(relays);
		},
		enabled: relays.length > 0,
		retry: 1
	}));
}

export function useMarketplacePluginVersions(relays: string[]) {
	return createQuery<MarketplacePlugin[]>(() => ({
		queryKey: [...pluginKeys.marketplace(relays), 'versions'],
		queryFn: async () => {
			return await requestRelayPluginVersions(relays);
		},
		enabled: relays.length > 0,
		retry: 1
	}));
}

export function useMarketplacePluginByReference(identifier: string, relays: string[]) {
	return createQuery<MarketplacePlugin | null>(() => ({
		queryKey: [...pluginKeys.marketplace(relays), 'reference', identifier.trim()],
		queryFn: async () => {
			return await requestMarketplacePluginByReference(identifier, relays);
		},
		enabled: identifier.trim().length > 0 && relays.length > 0,
		retry: 1
	}));
}

export function getInstallInputFromPlugin(plugin: MarketplacePlugin): {
	eventId?: string;
	nevent?: string;
	relays?: string[];
} {
	try {
		decode(plugin.nevent);
		return { nevent: plugin.nevent };
	} catch {
		return { eventId: plugin.eventId };
	}
}

export function isPluginUpdateAvailable(
	marketplacePlugin: Pick<MarketplacePlugin, 'eventId' | 'createdAt'>,
	installedPlugin: Pick<InstalledPlugin, 'installedEventId' | 'createdAt'> | null | undefined
): boolean {
	if (!installedPlugin?.installedEventId || installedPlugin.createdAt == null) return false;

	return (
		installedPlugin.installedEventId !== marketplacePlugin.eventId &&
		marketplacePlugin.createdAt > installedPlugin.createdAt
	);
}
