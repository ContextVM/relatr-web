import { createQuery } from '@tanstack/svelte-query';
import type { Relatr, SearchProfilesOutput } from '$lib/ctxcn/RelatrClient';
import { searchKeys } from '$lib/query-keys';

export function useSearchProfiles(
	relatrClient: Relatr | null,
	serverPubkey: string,
	query: string,
	limit?: number | undefined,
	extendToNostr?: boolean | undefined
) {
	return createQuery<SearchProfilesOutput | null>(() => ({
		queryKey: searchKeys.profiles(serverPubkey, query, limit, extendToNostr),
		queryFn: async () => {
			if (!relatrClient || !query) return null;
			return await relatrClient.SearchProfiles(query, limit, extendToNostr);
		},
		enabled: !!relatrClient && !!query
	}));
}
