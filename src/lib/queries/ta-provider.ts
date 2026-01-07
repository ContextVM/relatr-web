import { createQuery } from '@tanstack/svelte-query';
import { taProviderKeys } from '$lib/query-keys';
import type { ManageTaSubscriptionOutput, RelatrClient } from '$lib/ctxcn/RelatrClient';

function isTransientConnectionClosedError(err: unknown): boolean {
	const message = err instanceof Error ? err.message : String(err);
	return message.includes('Connection closed') || message.includes('MCP error -32000');
}

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
