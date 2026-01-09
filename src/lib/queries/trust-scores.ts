import { createQuery } from '@tanstack/svelte-query';
import type { Relatr, CalculateTrustScoreOutput } from '$lib/ctxcn/RelatrClient';
import { trustScoreKeys } from '$lib/query-keys';

export function useTrustScore(relatrClient: Relatr | null, targetPubkey: string) {
	return createQuery<CalculateTrustScoreOutput | null>(() => ({
		queryKey: trustScoreKeys.detail(targetPubkey),
		queryFn: async () => {
			if (!relatrClient || !targetPubkey) return null;
			return await relatrClient.CalculateTrustScore(targetPubkey);
		},
		enabled: !!relatrClient && !!targetPubkey
	}));
}
