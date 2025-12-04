import { createQuery } from '@tanstack/svelte-query';
import type { Relatr, SearchProfilesOutput } from '$lib/ctxcn/RelatrClient.js';
import { searchKeys } from '$lib/query-keys';

export function useSearchProfiles(
	relatrClient: () => Relatr | null,
	query: () => string,
	limit?: () => number | undefined,
	weightingScheme?: () => string | undefined,
	extendToNostr?: () => boolean | undefined
) {
	return createQuery<SearchProfilesOutput | null>(() => ({
		queryKey: searchKeys.profiles(query(), limit?.(), weightingScheme?.(), extendToNostr?.()),
		queryFn: async () => {
			const client = relatrClient();
			const searchQuery = query();
			if (!client || !searchQuery) return null;
			return await client.SearchProfiles(
				searchQuery,
				limit?.(),
				weightingScheme?.(),
				extendToNostr?.()
			);
		},
		enabled: !!relatrClient() && !!query()
	}));
}
