import { createMutation } from '@tanstack/svelte-query';
import { nostrKeys } from '$lib/query-keys';
import { queryClient } from '$lib/query-client';
import { relayPool } from '$lib/services/relay-pool';
import { eventStore } from '$lib/services/eventStore';
import { signEvent } from '$lib/utils.nostr';
import { getServerPubkey } from '$lib/stores/server-config.svelte';
import type { NostrEvent, EventTemplate } from 'nostr-tools';
import type { UserRelayList } from '$lib/queries/nostr';
import { relayStore } from '$lib/stores/relay-store.svelte';
import { relaySet } from 'applesauce-core/helpers';

interface PublishTaProviderInput {
	userPubkey: string;
	userRelays: UserRelayList;
	existingEvent: NostrEvent | null;
}

interface PublishTaProviderOutput {
	success: boolean;
	event: NostrEvent;
	publishedTo: string[];
}

export function usePublishTaProvider() {
	return createMutation<PublishTaProviderOutput, Error, PublishTaProviderInput>(() => ({
		mutationFn: async (input) => {
			const { userPubkey, userRelays, existingEvent } = input;
			const serverPubkey = getServerPubkey();

			if (!userPubkey || !userRelays || userRelays.write.length === 0) {
				throw new Error('User pubkey and write relays are required');
			}

			// Build the TA provider tag for Relatr
			// Format: ["30382:rank", "<provider-pubkey>", "<relay-url>"]
			const relatrTag = ['30382:rank', serverPubkey, String(relayStore.selectedRelays[0])]; // Using a common relay as the provider relay

			// Start with existing tags or empty array
			let tags = existingEvent ? [...existingEvent.tags] : [];

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

			// Create the event template
			const eventTemplate: EventTemplate = {
				kind: 10040,
				created_at: Math.floor(Date.now() / 1000),
				tags,
				content: '' // Public tags only for now
			};

			// Sign the event
			const signedEvent = await signEvent(eventTemplate);
			if (!signedEvent) {
				throw new Error('Failed to sign event');
			}

			// Publish to user's write relays
			const responses = await relayPool.publish([...relayStore.selectedRelays], signedEvent);

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
				publishedTo: successfulPublishes
			};
		},
		onSuccess: (data, variables) => {
			queryClient.setQueryData(nostrKeys.taProviders(variables.userPubkey), data.event);
		}
	}));
}
