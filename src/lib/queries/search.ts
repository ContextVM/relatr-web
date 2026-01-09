import { createQuery } from '@tanstack/svelte-query';
import type { Relatr, SearchProfilesOutput } from '$lib/ctxcn/RelatrClient';
import { searchKeys } from '$lib/query-keys';
// TODO: We should use the current relatr server to build the query key so if the server changes, the query will be invalidated
export function useSearchProfiles(
	relatrClient: Relatr | null,
	query: string,
	limit?: number | undefined,
	extendToNostr?: boolean | undefined
) {
	return createQuery<SearchProfilesOutput | null>(() => ({
		queryKey: searchKeys.profiles(query, limit, extendToNostr),
		queryFn: async () => {
			if (!relatrClient || !query) return null;
			return await relatrClient.SearchProfiles(query, limit, extendToNostr);
		},
		enabled: !!relatrClient && !!query
	}));
}
