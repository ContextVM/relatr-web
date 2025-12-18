export const serverKeys = {
	all: ['servers'] as const,
	detail: (pubkey: string) => [...serverKeys.all, pubkey] as const,
	stats: (pubkey: string) => [...serverKeys.detail(pubkey), 'stats'] as const
} as const;

export const trustScoreKeys = {
	all: ['trust-scores'] as const,
	detail: (targetPubkey: string) => [...trustScoreKeys.all, targetPubkey] as const
} as const;

export const searchKeys = {
	all: ['search'] as const,
	profiles: (query: string, limit?: number, extendToNostr?: boolean) =>
		[...searchKeys.all, 'profiles', query, limit, extendToNostr] as const
} as const;

export const taProviderKeys = {
	all: ['ta-provider'] as const,
	status: (serverPubkey: string, subscriberPubkey: string | null) =>
		[...taProviderKeys.all, 'status', serverPubkey, subscriberPubkey] as const
} as const;
