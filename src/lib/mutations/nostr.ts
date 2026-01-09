import { createMutation } from '@tanstack/svelte-query';
import { nostrKeys } from '$lib/query-keys';
import { queryClient } from '$lib/query-client';
import { relayPool } from '$lib/services/relay-pool';
import { eventStore } from '$lib/services/eventStore';
import { signEvent } from '$lib/utils.nostr';
import { getServerPubkey } from '$lib/stores/server-config.svelte';
import type { NostrEvent, EventTemplate } from 'nostr-tools';
import { relayStore } from '$lib/stores/relay-store.svelte';
import { TA_PROVIDERS_KIND } from '$lib/constants';
import type { PublishResponse } from 'applesauce-relay';
import { relaySet } from 'applesauce-core/helpers';

interface PublishTaProviderInput {
	userPubkey: string;
	userRelays: string[];
	existingEvent: NostrEvent | null;
	providerPubkeysToRemove?: string[];
}

export interface PublishTaProviderOutput {
	success: boolean;
	event: NostrEvent;
	publishedTo: string[];
	relayResults: PublishResponse[];
}

export function usePublishTaProvider() {
	return createMutation<PublishTaProviderOutput, Error, PublishTaProviderInput>(() => ({
		mutationFn: async (input) => {
			const { userPubkey, userRelays, existingEvent, providerPubkeysToRemove } = input;
			const serverPubkey = getServerPubkey();

			if (!userPubkey || !userRelays || userRelays.length === 0) {
				throw new Error('User pubkey and write relays are required');
			}

			// Start with existing tags or empty array
			let tags = existingEvent ? [...existingEvent.tags] : [];

			// Handle removal case (single or batch)
			if (providerPubkeysToRemove && providerPubkeysToRemove.length > 0) {
				const pubkeysToRemove = new Set(providerPubkeysToRemove);
				tags = tags.filter((tag) => !(tag[0].startsWith('30382:') && pubkeysToRemove.has(tag[1])));
			} else {
				// Build the TA provider tag for Relatr
				// Format: ["30382:rank", "<provider-pubkey>", "<relay-url>"]
				// Prefer publishing relay from the user's write relay list.
				const publishRelayUrl = String(userRelays ?? relayStore.selectedRelays[0] ?? '');
				const relatrTag = ['30382:rank', serverPubkey, publishRelayUrl];

				// Check if Relatr is already in the list
				const relatrIndex = tags.findIndex(
					(tag) => tag[0] === '30382:rank' && tag[1] === serverPubkey
				);

				if (relatrIndex >= 0) {
					// Update existing entry
					tags[relatrIndex] = relatrTag;
				} else {
					// Add new entry
					tags.push(relatrTag);
				}
			}

			// Create the event template
			const eventTemplate: EventTemplate = {
				kind: TA_PROVIDERS_KIND,
				created_at: Math.floor(Date.now() / 1000),
				tags,
				content: '' // Public tags only for now
			};

			// Sign the event
			const signedEvent = await signEvent(eventTemplate);
			if (!signedEvent) {
				throw new Error('Failed to sign event');
			}

			// Publish to user's write relays (plus any currently selected relays, de-duped)
			const publishRelays = relaySet([...userRelays, ...relayStore.selectedRelays]);
			const responses = await relayPool.publish(publishRelays, signedEvent);

			// Check if at least one relay accepted the event
			const successfulPublishes = responses.filter((r) => r.ok).map((r) => r.from);

			if (successfulPublishes.length === 0) {
				throw new Error(
					`Failed to publish to any relay: ${responses.map((r) => `${r.from}: ${r.message}`).join(', ')}`
				);
			}

			// Add to event store
			eventStore.add(signedEvent);

			return {
				success: true,
				event: signedEvent,
				publishedTo: successfulPublishes,
				relayResults: responses
			};
		},
		onSuccess: (data, variables) => {
			queryClient.setQueryData(nostrKeys.taProviders(variables.userPubkey), data.event);
		}
	}));
}
