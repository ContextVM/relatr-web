import { createQuery } from '@tanstack/svelte-query';
import { taProviderKeys } from '$lib/query-keys';
import type { ManageTaOutput, RelatrClient } from '$lib/ctxcn/RelatrClient';

/**
 * Represents the capability state of the TA feature on a server.
 * - 'unknown': Still checking or unable to determine (e.g., no client, no pubkey)
 * - 'supported': Server supports TA feature (ManageTaOutput returned valid data)
 * - 'unavailable': Server is offline, unreachable, or doesn't support TA
 */
export type TaCapabilityState = 'unknown' | 'supported' | 'unavailable';

export function useTaProviderStatus(
	relatrClient: RelatrClient | null,
	serverPubkey: string,
	subscriberPubkey: string | undefined
) {
	return createQuery<ManageTaOutput | null>(() => ({
		queryKey: taProviderKeys.status(serverPubkey, subscriberPubkey),
		queryFn: async () => {
			if (!relatrClient) return null;
			return await relatrClient.ManageTa('get');
		},
		enabled: !!relatrClient && !!serverPubkey && !!subscriberPubkey,
		retryDelay: 200
	}));
}

/**
 * Derives the TA capability state from the query result.
 * This is a pure function that can be used in $derived expressions.
 */
export function getTaCapabilityState(
	query: ReturnType<typeof useTaProviderStatus>
): TaCapabilityState {
	if (query.isLoading) return 'unknown';
	if (query.isError) return 'unavailable';
	if (query.data === null || query.data === undefined) return 'unknown';
	return 'supported';
}
