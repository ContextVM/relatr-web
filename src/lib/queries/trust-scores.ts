import { createQuery } from '@tanstack/svelte-query';
import type { Relatr, CalculateTrustScoreOutput } from '$lib/ctxcn/RelatrClient.svelte.js';
import { trustScoreKeys } from '$lib/query-keys';

export function useTrustScore(relatrClient: () => Relatr | null, targetPubkey: () => string) {
	return createQuery<CalculateTrustScoreOutput | null>(() => ({
		queryKey: trustScoreKeys.detail(targetPubkey()),
		queryFn: async () => {
			const client = relatrClient();
			const pubkey = targetPubkey();
			if (!client || !pubkey) return null;
			return await client.CalculateTrustScore(pubkey);
		},
		enabled: !!relatrClient() && !!targetPubkey()
	}));
}
