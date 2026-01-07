import { createQuery } from '@tanstack/svelte-query';
import { nostrKeys } from '$lib/query-keys';
import { relayPool } from '$lib/services/relay-pool';
import { commonRelays } from '$lib/services/relay-pool';
import { eventStore } from '$lib/services/eventStore';
import type { NostrEvent } from 'nostr-tools';
import { onlyEvents } from 'applesauce-relay/operators';
import { firstValueFrom, timeout, catchError, of, toArray } from 'rxjs';
import { relayStore } from '$lib/stores/relay-store.svelte';
import { RelayList } from 'nostr-tools/kinds';
import { TA_PROVIDERS_KIND } from '$lib/constants';
import { relaySet } from 'applesauce-core/helpers';

const NOSTR_QUERY_TIMEOUT_MS = 3000;

export interface UserRelayList {
	relays: string[];
	read: string[];
	write: string[];
}

export function useUserRelays(pubkey: string | undefined) {
	return createQuery<UserRelayList | null>(() => ({
		queryKey: nostrKeys.userRelays(pubkey || ''),
		queryFn: async () => {
			if (!pubkey) return null;

			try {
				// Use request method for one-time query to multiple relays
				const events = await firstValueFrom(
					relayPool.request(commonRelays, { kinds: [RelayList], authors: [pubkey], limit: 1 }).pipe(
						onlyEvents(),
						toArray(),
						timeout(NOSTR_QUERY_TIMEOUT_MS),
						catchError(() => of([]))
					)
				);

				// Find the latest event by created_at
				const latestEvent = events.reduce(
					(latest, event) => {
						if (!latest || event.created_at > latest.created_at) {
							return event;
						}
						return latest;
					},
					null as NostrEvent | null
				);

				if (latestEvent) {
					// Parse relay tags
					const relays: string[] = [];
					const read: string[] = [];
					const write: string[] = [];

					for (const tag of latestEvent.tags) {
						if (tag[0] === 'r' && tag[1]) {
							const relayUrl = tag[1];
							const marker = tag[2];

							relays.push(relayUrl);

							if (!marker || marker === 'read' || marker === 'write') {
								if (!marker || marker === 'read') {
									read.push(relayUrl);
								}
								if (!marker || marker === 'write') {
									write.push(relayUrl);
								}
							}
						}
					}

					if (relays.length === 0) {
						return null;
					}

					return { relays, read, write };
				} else {
					return null;
				}
			} catch (error) {
				console.error('Error fetching user relay list:', error);
				// Fallback to common relays
				return null;
			}
		},
		enabled: !!pubkey,
		staleTime: 5 * 60 * 1000 // 5 minutes
	}));
}

export function useUserTaProviders(
	pubkey: string | undefined,
	userRelays: UserRelayList | undefined
) {
	return createQuery<NostrEvent | null>(() => ({
		queryKey: nostrKeys.taProviders(pubkey || ''),
		queryFn: async () => {
			if (!pubkey) return null;
			try {
				// Use request method for one-time query to user's relays
				const extraRelays = relaySet([...commonRelays, ...relayStore.selectedRelays]);
				const events = await firstValueFrom(
					relayPool
						.request(relaySet([...(userRelays?.relays ?? []), ...extraRelays]), {
							kinds: [TA_PROVIDERS_KIND],
							authors: [pubkey],
							limit: 1
						})
						.pipe(
							onlyEvents(),
							toArray(),
							timeout(NOSTR_QUERY_TIMEOUT_MS),
							catchError(() => of([]))
						)
				);

				// Find the latest event by created_at
				const latestEvent = events.reduce(
					(latest, event) => {
						if (!latest || event.created_at > latest.created_at) {
							return event;
						}
						return latest;
					},
					null as NostrEvent | null
				);

				if (latestEvent) {
					// Add to event store
					eventStore.add(latestEvent);
				}

				return latestEvent;
			} catch (error) {
				console.error('Error fetching user TA providers:', error);
				return null;
			}
		},
		enabled: !!pubkey,
		staleTime: 5 * 60 * 1000,
		retry: 1
	}));
}
