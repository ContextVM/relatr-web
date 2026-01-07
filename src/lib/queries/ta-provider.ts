import { createQuery } from '@tanstack/svelte-query';
import { taProviderKeys } from '$lib/query-keys';
import type { ManageTaSubscriptionOutput, RelatrClient } from '$lib/ctxcn/RelatrClient';

function isTransientConnectionClosedError(err: unknown): boolean {
	const message = err instanceof Error ? err.message : String(err);
	return message.includes('Connection closed') || message.includes('MCP error -32000');
}

/**
 * Represents the capability state of the TA feature on a server.
 * - 'unknown': Still checking or unable to determine (e.g., no client, no pubkey)
 * - 'supported': Server supports TA feature (ManageTaSubscription returned valid data)
 * - 'unavailable': Server is offline, unreachable, or doesn't support TA
 */
export type TaCapabilityState = 'unknown' | 'supported' | 'unavailable';

export function useTaProviderStatus(
	relatrClient: RelatrClient | null,
	serverPubkey: string,
	subscriberPubkey: string | undefined
) {
	return createQuery<ManageTaSubscriptionOutput | null>(() => ({
		queryKey: taProviderKeys.status(serverPubkey, subscriberPubkey),
		queryFn: async () => {
			if (!relatrClient) return null;
			return await relatrClient.ManageTaSubscription('get');
		},
		enabled: !!relatrClient && !!serverPubkey && !!subscriberPubkey,
		retry: (failureCount, error) => {
			if (isTransientConnectionClosedError(error)) return failureCount < 2;
			return false;
		},
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
