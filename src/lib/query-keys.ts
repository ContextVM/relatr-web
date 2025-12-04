export const serverKeys = {
	all: ['servers'] as const,
	detail: (pubkey: string) => [...serverKeys.all, pubkey] as const,
	stats: (pubkey: string) => [...serverKeys.detail(pubkey), 'stats'] as const
} as const;

export const trustScoreKeys = {
	all: ['trust-scores'] as const,
	detail: (targetPubkey: string, weightingScheme?: string) =>
		[...trustScoreKeys.all, targetPubkey, weightingScheme || 'default'] as const
} as const;

export const searchKeys = {
	all: ['search'] as const,
	profiles: (query: string, limit?: number, weightingScheme?: string, extendToNostr?: boolean) =>
		[...searchKeys.all, 'profiles', query, limit, weightingScheme, extendToNostr] as const
} as const;
