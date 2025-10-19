import {
	createAddressLoader,
	createEventLoader,
	createTimelineLoader
} from 'applesauce-loaders/loaders';
import { relayStore } from '$lib/stores/relay-store.svelte';
import { relayPool } from './relay-pool';
import { eventStore } from './eventStore';
import type { Filter } from 'nostr-tools';

// Create address loader
export const addressLoader = createAddressLoader(relayPool, { eventStore });

// Create an event loader
export const eventLoader = createEventLoader(relayPool, {
	eventStore
});

// Function to create a deliveries loader for a specific user
export const createTimelineLoaderByFilter = (filter: Filter) => {
	console.log(filter);
	const loader = createTimelineLoader(relayPool, relayStore.selectedRelays, filter, {
		eventStore
	});

	return loader();
};
