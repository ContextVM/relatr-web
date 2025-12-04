import { createQuery } from '@tanstack/svelte-query';
import type { Relatr, CalculateTrustScoreOutput } from '$lib/ctxcn/RelatrClient.js';
import { trustScoreKeys } from '$lib/query-keys';

export function useTrustScore(
	relatrClient: () => Relatr | null,
	targetPubkey: () => string,
	weightingScheme?: () => string | undefined
) {
	return createQuery<CalculateTrustScoreOutput | null>(() => ({
		queryKey: trustScoreKeys.detail(targetPubkey(), weightingScheme?.()),
		queryFn: async () => {
			const client = relatrClient();
			const pubkey = targetPubkey();
			if (!client || !pubkey) return null;
			return await client.CalculateTrustScore(pubkey, weightingScheme?.());
		},
		enabled: !!relatrClient() && !!targetPubkey()
	}));
}
