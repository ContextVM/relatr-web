import { Client } from '@modelcontextprotocol/sdk/client';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import {
	NostrClientTransport,
	type NostrTransportOptions,
	PrivateKeySigner,
	ApplesauceRelayPool
} from '@contextvm/sdk';

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
				[k: string]: number;
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
				[k: string]: number;
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
	 * Whether to extend the search to Nostr to fill remaining results. Defaults to false. If false, Nostr will only be queried when local DB returns zero results.
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

export interface ManageTaSubscriptionInput {
	/**
	 * Action to perform: 'get' to check status, 'subscribe' to activate, 'unsubscribe' to deactivate
	 */
	action: 'get' | 'subscribe' | 'unsubscribe';
	/**
	 * Optional comma-separated list of custom relay URLs to publish TA events to (only used for subscribe action)
	 */
	customRelays?: string;
}

export interface ManageTaSubscriptionOutput {
	success: boolean;
	message?: string;
	subscriberPubkey: string;
	isActive: boolean;
	createdAt: number | null;
	updatedAt: number | null;
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
	ManageTaSubscription: (
		action: string,
		customRelays?: string
	) => Promise<ManageTaSubscriptionOutput>;
};

export class RelatrClient implements Relatr {
	static readonly SERVER_PUBKEY =
		'60a6070044e5788bf8a9d4d4e5aaa98a3853eec38c3ecc483ced19800fb6b7b0';
	static readonly DEFAULT_RELAYS = ['wss://relay.contextvm.org'];
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

		// Use options.signer if provided, otherwise create from resolved private key
		const signer = options.signer || new PrivateKeySigner(resolvedPrivateKey);
		// Use options.relays if provided, otherwise use class DEFAULT_RELAYS
		const relays = options.relays || RelatrClient.DEFAULT_RELAYS;
		// Use options.relayHandler if provided, otherwise create from relays
		const relayHandler = options.relayHandler || new ApplesauceRelayPool(relays);
		const serverPubkey = options.serverPubkey;
		const { privateKey: _, ...rest } = options;

		this.transport = new NostrClientTransport({
			serverPubkey: serverPubkey || RelatrClient.SERVER_PUBKEY,
			signer,
			relayHandler,
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
	 * Get comprehensive statistics about the Relatr service including database stats, social graph stats, and the source public key
	 * @returns {Promise<StatsOutput>} The result of the stats operation
	 */
	async Stats(args: StatsInput): Promise<StatsOutput> {
		return this.call('stats', args);
	}

	/**
	 * Search for Nostr profiles by name/query and return results sorted by trust score. Queries metadata relays and calculates trust scores for each result.
	 * @param {string} query The query parameter
	 * @param {number} limit [optional] Maximum number of results to return (default: 20)
	 * @param {boolean} extendToNostr [optional] Whether to extend the search to Nostr to fill remaining results. Defaults to false. If false, Nostr will only be queried when local DB returns zero results.
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
	 * Manage your Trusted Assertions subscription. Check status, subscribe, or unsubscribe from TA services.
	 * @param {string} action Action to perform: 'get' to check status, 'subscribe' to activate, 'unsubscribe' to deactivate
	 * @param {string} customRelays [optional] Optional comma-separated list of custom relay URLs to publish TA events to (only used for subscribe action)
	 * @returns {Promise<ManageTaSubscriptionOutput>} The result of the manage_ta_subscription operation
	 */
	async ManageTaSubscription(
		action: string,
		customRelays?: string
	): Promise<ManageTaSubscriptionOutput> {
		return this.call('manage_ta_subscription', { action, customRelays });
	}
}
