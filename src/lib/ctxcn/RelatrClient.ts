import { Client } from '@modelcontextprotocol/sdk/client';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { NostrClientTransport, type NostrTransportOptions, PrivateKeySigner } from '@contextvm/sdk';
import { defaultRelays } from '$lib/services/relay-pool';

export interface CalculateTrustScoreInput {
	targetPubkey: string;
}

export interface CalculateTrustScoreOutput {
	trustScore: {
		sourcePubkey: string;
		targetPubkey: string;
		score: number;
		components: {
			distanceWeight: number;
			validators: {
				[k: string]: {
					score: number;
					description?: string;
				};
			};
			socialDistance: number;
			normalizedDistance: number;
		};
		computedAt: number;
	};
	computationTimeMs: number;
}

export interface CalculateTrustScoresInput {
	/**
	 * @minItems 1
	 */
	targetPubkeys: [string, ...string[]];
}

export interface CalculateTrustScoresOutput {
	trustScores: {
		sourcePubkey: string;
		targetPubkey: string;
		score: number;
		components: {
			distanceWeight: number;
			validators: {
				[k: string]: {
					score: number;
					description?: string;
				};
			};
			socialDistance: number;
			normalizedDistance: number;
		};
		computedAt: number;
	}[];
	computationTimeMs: number;
}

export type StatsInput = Record<string, unknown>;

export interface StatsOutput {
	timestamp: number;
	sourcePubkey: string;
	relatrVersion: string;
	isAdmin: boolean;
	database: {
		metrics: {
			totalEntries: number;
		};
		metadata: {
			totalEntries: number;
		};
	};
	socialGraph: {
		stats: {
			users: number;
			follows: number;
		};
		rootPubkey: string;
	};
}

export interface SearchProfilesInput {
	query: string;
	/**
	 * Maximum number of results to return (default: 20)
	 */
	limit?: number;
	/**
	 * Whether to extend search to Nostr to fill remaining results. Defaults to false. If false, Nostr will only be queried when local DB returns zero results.
	 */
	extendToNostr?: boolean;
}

export interface SearchProfilesOutput {
	results: {
		pubkey: string;
		trustScore: number;
		rank: number;
		exactMatch?: boolean;
	}[];
	totalFound: number;
	searchTimeMs: number;
}

export interface PluginsListInput {
	verbose?: boolean;
}

export interface PluginsListOutput {
	plugins: {
		pluginKey: string;
		name: string;
		enabled: boolean;
		effectiveWeight: number;
		pubkey?: string;
		title?: string | null;
		description?: string | null;
		versionInfo?: string;
		defaultWeight?: number | null;
		installedEventId?: string;
		createdAt?: number;
	}[];
}

export interface PluginsInstallInput {
	eventId?: string;
	nevent?: string;
	relays?: string[];
	enable?: boolean;
}

export interface PluginsInstallOutput {
	pluginKey: string;
	enabled: boolean;
}

export interface PluginsConfigInput {
	/**
	 * @minItems 1
	 */
	changes: [
		{
			pluginKey: string;
			enabled?: boolean;
			weightOverride?: number;
		},
		...{
			pluginKey: string;
			enabled?: boolean;
			weightOverride?: number;
		}[]
	];
}

export interface PluginsConfigOutput {
	updated: number;
}

export interface PluginsUninstallInput {
	/**
	 * @minItems 1
	 */
	pluginKeys: [string, ...string[]];
}

export interface PluginsUninstallOutput {
	removed: number;
}

export interface ManageTaInput {
	/**
	 * Action to perform: 'get' to check status, 'enable' to activate, 'disable' to deactivate
	 */
	action: 'get' | 'enable' | 'disable';
	/**
	 * Optional comma-separated list of custom relay URLs to publish TA events to (only used for enable action)
	 */
	customRelays?: string;
}

export interface ManageTaOutput {
	success: boolean;
	message?: string;
	pubkey: string;
	isActive: boolean;
	createdAt: number | null;
	computedAt: number | null;
	rank?: {
		published: boolean;
		rank: number;
		previousRank: number | null;
		relayResults?: {
			ok: boolean;
			message?: string;
			from: string;
		}[];
	};
}

export type Relatr = {
	CalculateTrustScore: (targetPubkey: string) => Promise<CalculateTrustScoreOutput>;
	CalculateTrustScores: (targetPubkeys: string[]) => Promise<CalculateTrustScoresOutput>;
	Stats: (args: StatsInput) => Promise<StatsOutput>;
	SearchProfiles: (
		query: string,
		limit?: number,
		extendToNostr?: boolean
	) => Promise<SearchProfilesOutput>;
	PluginsList: (verbose?: boolean) => Promise<PluginsListOutput>;
	PluginsInstall: (
		eventId?: string,
		nevent?: string,
		relays?: string[],
		enable?: boolean
	) => Promise<PluginsInstallOutput>;
	PluginsConfig: (changes: object[]) => Promise<PluginsConfigOutput>;
	PluginsUninstall: (pluginKeys: string[]) => Promise<PluginsUninstallOutput>;
	ManageTa: (action: string, customRelays?: string) => Promise<ManageTaOutput>;
};

export class RelatrClient implements Relatr {
	static readonly SERVER_PUBKEY =
		'60a6070044e5788bf8a9d4d4e5aaa98a3853eec38c3ecc483ced19800fb6b7b0';
	static readonly DEFAULT_RELAYS = defaultRelays;
	private client: Client;
	private transport: Transport;

	constructor(
		options: Partial<NostrTransportOptions> & { privateKey?: string; relays?: string[] } = {}
	) {
		this.client = new Client({
			name: 'RelatrClient',
			version: '1.0.0'
		});

		// Private key precedence: constructor options > config file
		const resolvedPrivateKey = options.privateKey || '';

		const signer = options.signer || new PrivateKeySigner(resolvedPrivateKey);
		const serverPubkey = options.serverPubkey;
		const {
			privateKey: _,
			relays,
			relayHandler: providedRelayHandler,
			fallbackOperationalRelayUrls,
			...rest
		} = options;
		const resolvedFallbackOperationalRelayUrls =
			fallbackOperationalRelayUrls || relays || RelatrClient.DEFAULT_RELAYS;

		this.transport = new NostrClientTransport({
			serverPubkey: serverPubkey || RelatrClient.SERVER_PUBKEY,
			signer,
			...(providedRelayHandler ? { relayHandler: providedRelayHandler } : {}),
			fallbackOperationalRelayUrls: resolvedFallbackOperationalRelayUrls,
			isStateless: true,
			...rest
		});

		// Auto-connect in constructor
		this.client.connect(this.transport).catch((error) => {
			console.error(`Failed to connect to server: ${error}`);
		});
	}

	async disconnect(): Promise<void> {
		await this.transport.close();
	}

	private async call<T = unknown>(name: string, args: Record<string, unknown>): Promise<T> {
		const result = await this.client.callTool({
			name,
			arguments: { ...args }
		});
		return result.structuredContent as T;
	}

	/**
	 * Compute trust score for a Nostr pubkey using social graph analysis and profile validation. Only target pubkey is required - all other parameters are optional.
	 * @param {string} targetPubkey The target pubkey parameter
	 * @returns {Promise<CalculateTrustScoreOutput>} The result of the calculate_trust_score operation
	 */
	async CalculateTrustScore(targetPubkey: string): Promise<CalculateTrustScoreOutput> {
		return this.call('calculate_trust_score', { targetPubkey });
	}

	/**
	 * Compute trust scores for a list of Nostr pubkeys in one batch using social graph analysis and profile validation.
	 * @param {string[]} targetPubkeys The target pubkeys parameter
	 * @returns {Promise<CalculateTrustScoresOutput>} The result of the calculate_trust_scores operation
	 */
	async CalculateTrustScores(targetPubkeys: string[]): Promise<CalculateTrustScoresOutput> {
		return this.call('calculate_trust_scores', { targetPubkeys });
	}

	/**
	 * Get comprehensive statistics about Relatr service including database stats, social graph stats, and source public key
	 * @returns {Promise<StatsOutput>} The result of the stats operation
	 */
	async Stats(args: StatsInput): Promise<StatsOutput> {
		return this.call('stats', args);
	}

	/**
	 * Search for Nostr profiles by name/query and return results sorted by trust score. Queries metadata relays and calculates trust scores for each result.
	 * @param {string} query The query parameter
	 * @param {number} limit [optional] Maximum number of results to return (default: 20)
	 * @param {boolean} extendToNostr [optional] Whether to extend search to Nostr to fill remaining results. Defaults to false. If false, Nostr will only be queried when local DB returns zero results.
	 * @returns {Promise<SearchProfilesOutput>} The result of the search_profiles operation
	 */
	async SearchProfiles(
		query: string,
		limit?: number,
		extendToNostr?: boolean
	): Promise<SearchProfilesOutput> {
		return this.call('search_profiles', { query, limit, extendToNostr });
	}

	/**
	 * List plugin runtime state with concise or verbose metadata
	 * @param {boolean} verbose [optional] The verbose parameter
	 * @returns {Promise<PluginsListOutput>} The result of the plugins_list operation
	 */
	async PluginsList(verbose?: boolean): Promise<PluginsListOutput> {
		return this.call('plugins_list', { verbose });
	}

	/**
	 * Install a plugin from event id or nevent (admin-only)
	 * @param {string} eventId [optional] The event id parameter
	 * @param {string} nevent [optional] The nevent parameter
	 * @param {string[]} relays [optional] The relays parameter
	 * @param {boolean} enable [optional] The enable parameter
	 * @returns {Promise<PluginsInstallOutput>} The result of the plugins_install operation
	 */
	async PluginsInstall(
		eventId?: string,
		nevent?: string,
		relays?: string[],
		enable?: boolean
	): Promise<PluginsInstallOutput> {
		return this.call('plugins_install', { eventId, nevent, relays, enable });
	}

	/**
	 * Batch configure plugin enablement/weights atomically (admin-only)
	 * @param {object[]} changes The changes parameter
	 * @returns {Promise<PluginsConfigOutput>} The result of the plugins_config operation
	 */
	async PluginsConfig(changes: object[]): Promise<PluginsConfigOutput> {
		return this.call('plugins_config', { changes });
	}

	/**
	 * Batch uninstall plugins by pluginKey (admin-only)
	 * @param {string[]} pluginKeys The plugin keys parameter
	 * @returns {Promise<PluginsUninstallOutput>} The result of the plugins_uninstall operation
	 */
	async PluginsUninstall(pluginKeys: string[]): Promise<PluginsUninstallOutput> {
		return this.call('plugins_uninstall', { pluginKeys });
	}

	/**
	 * Manage your Trusted Assertions. Check status, enable, or disable TA entries.
	 * @param {string} action Action to perform: 'get' to check status, 'enable' to activate, 'disable' to deactivate
	 * @param {string} customRelays [optional] Optional comma-separated list of custom relay URLs to publish TA events to (only used for enable action)
	 * @returns {Promise<ManageTaOutput>} The result of the manage_ta operation
	 */
	async ManageTa(action: string, customRelays?: string): Promise<ManageTaOutput> {
		return this.call('manage_ta', { action, customRelays });
	}
}
