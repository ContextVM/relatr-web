import { createMutation } from '@tanstack/svelte-query';
import type { PublishResponse } from 'applesauce-relay';
import { relaySet } from 'applesauce-core/helpers';
import type { EventTemplate, NostrEvent } from 'nostr-tools';
import { queryClient } from '$lib/query-client';
import { pluginKeys } from '$lib/query-keys';
import { ELO_PLUGIN_KIND } from '$lib/constants';
import { relayPool } from '$lib/services/relay-pool';
import { eventStore } from '$lib/services/eventStore';
import { signEvent } from '$lib/utils.nostr';

export interface PublishEloPluginInput {
	publishRelays: string[];
	title: string;
	description: string;
	identifier: string;
	version: string;
	source: string;
	weight?: number;
}

export interface PublishEloPluginOutput {
	success: boolean;
	event: NostrEvent;
	publishedTo: string[];
	relayResults: PublishResponse[];
}

export function usePublishEloPlugin(discoveryRelays: string[]) {
	return createMutation<PublishEloPluginOutput, Error, PublishEloPluginInput>(() => ({
		mutationFn: async (input) => {
			if (input.publishRelays.length === 0) {
				throw new Error('At least one relay is required to publish a plugin');
			}

			const tags = [
				['n', input.identifier],
				['relatr-version', input.version],
				['title', input.title],
				['description', input.description]
			];

			if (typeof input.weight === 'number' && Number.isFinite(input.weight)) {
				tags.push(['weight', String(input.weight)]);
			}

			const eventTemplate: EventTemplate = {
				kind: ELO_PLUGIN_KIND,
				created_at: Math.floor(Date.now() / 1000),
				tags,
				content: input.source
			};

			const signedEvent = await signEvent(eventTemplate);
			if (!signedEvent) {
				throw new Error('Failed to sign plugin event');
			}

			const publishRelays = relaySet(input.publishRelays);
			const responses = await relayPool.publish(publishRelays, signedEvent);
			const publishedTo = responses
				.filter((response) => response.ok)
				.map((response) => response.from);

			if (publishedTo.length === 0) {
				throw new Error(
					`Failed to publish to any relay: ${responses.map((response) => `${response.from}: ${response.message}`).join(', ')}`
				);
			}

			eventStore.add(signedEvent);

			return {
				success: true,
				event: signedEvent,
				publishedTo,
				relayResults: responses
			};
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: pluginKeys.marketplace(discoveryRelays)
			});
		}
	}));
}
