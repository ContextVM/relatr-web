import { createQuery } from '@tanstack/svelte-query';
import type { RelatrClient, StatsOutput } from '$lib/ctxcn/RelatrClient.js';
import { serverKeys } from '$lib/query-keys';

export function useServerStats(
	relatrClient: () => RelatrClient | null,
	serverPubkey: () => string
) {
	return createQuery<StatsOutput | null>(() => ({
		queryKey: serverKeys.stats(serverPubkey()),
		queryFn: async () => {
			const client = relatrClient();
			if (!client) return null;
			return await client.Stats({});
		},
		enabled: !!relatrClient()
	}));
}
