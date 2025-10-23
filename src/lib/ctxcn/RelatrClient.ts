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
	/**
	 * Optional source pubkey (uses default if not provided)
	 */
	sourcePubkey?: string;
	/**
	 * Weighting scheme: 'default' (balanced), 'conservative' (higher profile validation), 'progressive' (higher social distance), 'balanced'
	 */
	weightingScheme?: 'default' | 'social' | 'validation' | 'strict';
}

export interface CalculateTrustScoreOutput {
	trustScore: {
		sourcePubkey: string;
		targetPubkey: string;
		score: number;
		components: {
			distanceWeight: number;
			validators: {
				nip05Valid: number;
				lightningAddress: number;
				eventKind10002: number;
				reciprocity: number;
				isRootNip05: number;
			};
			socialDistance: number;
			normalizedDistance: number;
		};
		computedAt: number;
	};
	computationTimeMs: number;
}

export type HealthCheckInput = Record<string, unknown>;

export interface HealthCheckOutput {
	status: 'healthy' | 'unhealthy';
	database: boolean;
	socialGraph: boolean;
	timestamp: number;
}

export interface SearchProfilesInput {
	query: string;
	/**
	 * Maximum number of results to return (default: 20)
	 */
	limit?: number;
	/**
	 * Optional source pubkey for trust score calculation (uses default if not provided)
	 */
	sourcePubkey?: string;
	/**
	 * Weighting scheme: 'default' (balanced), 'social' (higher social distance), 'validation' (higher profile validation), 'strict' (highest requirements)
	 */
	weightingScheme?: 'default' | 'social' | 'validation' | 'strict';
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
	}[];
	totalFound: number;
	searchTimeMs: number;
}

export type Relatr = {
	CalculateTrustScore: (
		targetPubkey: string,
		sourcePubkey?: string,
		weightingScheme?: string
	) => Promise<CalculateTrustScoreOutput>;
	HealthCheck: (args: HealthCheckInput) => Promise<HealthCheckOutput>;
	SearchProfiles: (
		query: string,
		limit?: number,
		sourcePubkey?: string,
		weightingScheme?: string,
		extendToNostr?: boolean
	) => Promise<SearchProfilesOutput>;
};

export class RelatrClient implements Relatr {
	static readonly SERVER_PUBKEY =
		'60a6070044e5788bf8a9d4d4e5aaa98a3853eec38c3ecc483ced19800fb6b7b0';
	private client: Client;
	private transport: Transport;

	constructor(
		options: Partial<NostrTransportOptions> & { privateKey?: string; relays?: string[] } = {}
	) {
		this.client = new Client({
			name: 'RelatrClient',
			version: '1.0.0'
		});

		const {
			privateKey,
			relays = ['ws://localhost:10547'],
			signer = new PrivateKeySigner(privateKey || ''),
			relayHandler = new ApplesauceRelayPool(relays),
			...rest
		} = options;

		this.transport = new NostrClientTransport({
			serverPubkey: RelatrClient.SERVER_PUBKEY,
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
	 * @param {string} sourcePubkey [optional] Optional source pubkey (uses default if not provided)
	 * @param {string} weightingScheme [optional] Weighting scheme: 'default' (balanced), 'conservative' (higher profile validation), 'progressive' (higher social distance), 'balanced'
	 * @returns {Promise<CalculateTrustScoreOutput>} The result of the calculate_trust_score operation
	 */
	async CalculateTrustScore(
		targetPubkey: string,
		sourcePubkey?: string,
		weightingScheme?: string
	): Promise<CalculateTrustScoreOutput> {
		return this.call('calculate_trust_score', { targetPubkey, sourcePubkey, weightingScheme });
	}

	/**
	 * Check the health status of the Relatr service
	 * @returns {Promise<HealthCheckOutput>} The result of the health_check operation
	 */
	async HealthCheck(args: HealthCheckInput): Promise<HealthCheckOutput> {
		return this.call('health_check', args);
	}

	/**
	 * Search for Nostr profiles by name/query and return results sorted by trust score. Queries metadata relays and calculates trust scores for each result.
	 * @param {string} query The query parameter
	 * @param {number} limit [optional] Maximum number of results to return (default: 20)
	 * @param {string} sourcePubkey [optional] Optional source pubkey for trust score calculation (uses default if not provided)
	 * @param {string} weightingScheme [optional] Weighting scheme: 'default' (balanced), 'social' (higher social distance), 'validation' (higher profile validation), 'strict' (highest requirements)
	 * @param {boolean} extendToNostr [optional] Whether to extend the search to Nostr to fill remaining results. Defaults to false. If false, Nostr will only be queried when local DB returns zero results.
	 * @returns {Promise<SearchProfilesOutput>} The result of the search_profiles operation
	 */
	async SearchProfiles(
		query: string,
		limit?: number,
		sourcePubkey?: string,
		weightingScheme?: string,
		extendToNostr?: boolean
	): Promise<SearchProfilesOutput> {
		return this.call('search_profiles', {
			query,
			limit,
			sourcePubkey,
			weightingScheme,
			extendToNostr
		});
	}
}

/**
 * Default singleton instance of RelatrClient.
 * This instance uses the default configuration and can be used directly
 * without creating a new instance.
 *
 * @example
 * import { relatr } from './RelatrClient';
 * const result = await relatr.SomeMethod();
 */
export const relatr = new RelatrClient();
