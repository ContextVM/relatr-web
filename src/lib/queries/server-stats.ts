import { createQuery } from '@tanstack/svelte-query';
import { serverKeys } from '$lib/query-keys';
import type { RelatrClient, StatsOutput } from '$lib/ctxcn/RelatrClient';

export function useServerStats(relatrClient: RelatrClient | null, serverPubkey: string) {
	return createQuery<StatsOutput | null>(() => ({
		queryKey: serverKeys.stats(serverPubkey),
		queryFn: async () => {
			if (!relatrClient || !serverPubkey) return null;
			return await relatrClient?.Stats({});
		},
		retry: 1,
		enabled: !!relatrClient && !!serverPubkey
	}));
}
