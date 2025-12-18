import { createQuery } from '@tanstack/svelte-query';
import type { RelatrClient, ManageTaProviderOutput } from '$lib/ctxcn/RelatrClient.svelte.js';
import { taProviderKeys } from '$lib/query-keys';

function isTransientConnectionClosedError(err: unknown): boolean {
	const message = err instanceof Error ? err.message : String(err);
	return message.includes('Connection closed') || message.includes('MCP error -32000');
}

export function useTaProviderStatus(
	relatrClient: () => RelatrClient | null,
	serverPubkey: () => string,
	subscriberPubkey: () => string | null
) {
	return createQuery<ManageTaProviderOutput | null>(() => ({
		queryKey: taProviderKeys.status(serverPubkey(), subscriberPubkey()),
		queryFn: async () => {
			const client = relatrClient();
			if (!client) return null;
			return await client.ManageTaProvider('get');
		},
		enabled: !!relatrClient() && !!serverPubkey() && !!subscriberPubkey(),
		retry: (failureCount, error) => {
			if (isTransientConnectionClosedError(error)) return failureCount < 2;
			return false;
		},
		retryDelay: 200
	}));
}
