import { createQuery } from '@tanstack/svelte-query';
import type { RelatrClient, ManageTaProviderOutput } from '$lib/ctxcn/RelatrClient.svelte.js';
import { taProviderKeys } from '$lib/query-keys';

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
		enabled: !!relatrClient() && !!serverPubkey() && !!subscriberPubkey()
	}));
}
