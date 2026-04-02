export const serverKeys = {
	all: ['servers'] as const,
	detail: (pubkey: string) => [...serverKeys.all, pubkey] as const,
	stats: (pubkey: string) => [...serverKeys.detail(pubkey), 'stats'] as const
} as const;

export const trustScoreKeys = {
	all: ['trust-scores'] as const,
	detail: (serverPubkey: string, targetPubkey: string) =>
		[...trustScoreKeys.all, serverPubkey, targetPubkey] as const
} as const;

export const searchKeys = {
	all: ['search'] as const,
	profiles: (serverPubkey: string, query: string, limit?: number, extendToNostr?: boolean) =>
		[...searchKeys.all, 'profiles', serverPubkey, query, limit, extendToNostr] as const
} as const;

export const taProviderKeys = {
	all: ['ta-provider'] as const,
	status: (serverPubkey: string, subscriberPubkey: string | undefined) =>
		[...taProviderKeys.all, 'status', serverPubkey, subscriberPubkey] as const
} as const;

export const pluginKeys = {
	all: ['plugins'] as const,
	server: (serverPubkey: string) => [...pluginKeys.all, serverPubkey] as const,
	list: (serverPubkey: string, verbose = true) =>
		[...pluginKeys.server(serverPubkey), 'list', verbose] as const,
	marketplace: (relays: string[]) => [...pluginKeys.all, 'marketplace', ...relays] as const
} as const;

export const nostrKeys = {
	all: ['nostr'] as const,
	userRelays: (pubkey: string) => [...nostrKeys.all, 'user-relays', pubkey] as const,
	taProviders: (pubkey: string) => [...nostrKeys.all, 'ta-providers', pubkey] as const
} as const;
