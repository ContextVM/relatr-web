import { browser } from '$app/environment';
import { isHexKey } from 'applesauce-core/helpers';
import { DEFAULT_SERVER } from '$lib/constants';
import { RelatrClient } from '$lib/ctxcn/RelatrClient.svelte.js';
import { activeAccount } from '$lib/services/accountManager.svelte.js';
import { addServerToHistory, getServerHistory } from '$lib/utils';

// Shared reactive state for server configuration
const serverConfig = $state({
	pubkey: DEFAULT_SERVER,
	client: null as RelatrClient | null
});

function resolveInitialServerPubkey(): string {
	// 1) URL param `?s=` (shareable links)
	const fromUrl = new URL(window.location.href).searchParams.get('s');
	if (fromUrl && isHexKey(fromUrl)) return fromUrl;

	// 2) Most recently used server from history
	const history = getServerHistory();
	if (history.length && history[0]?.pubkey && isHexKey(history[0].pubkey)) return history[0].pubkey;

	// 3) Default
	return DEFAULT_SERVER;
}

// IMPORTANT: module-level effects must be created inside an effect tree. We use `$effect.root`
if (browser) {
	// Choose the right server *before* we ever connect, to avoid connecting to DEFAULT then switching.
	serverConfig.pubkey = resolveInitialServerPubkey();

	$effect.root(() => {
		$effect(() => {
			const serverPubkey = serverConfig.pubkey;
			const signer = activeAccount.value?.signer;

			const client = signer
				? new RelatrClient({ serverPubkey, signer })
				: new RelatrClient({ serverPubkey });

			serverConfig.client = client;

			// Cleanup runs before the effect re-runs and when the root is destroyed,
			// ensuring only one live client.
			return () => {
				client.disconnect().catch((err) => {
					console.warn('Failed to disconnect RelatrClient:', err);
				});
			};
		});
	});
}

/**
 * Get the current RelatrClient instance
 */
export function getRelatrClient() {
	return serverConfig.client;
}

/**
 * Get the current server pubkey
 */
export function getServerPubkey() {
	return serverConfig.pubkey;
}

/**
 * Set the current server pubkey.
 *
 * The client will be rebuilt automatically by the `$effect` above, which also
 * disconnects the previous client to ensure there is only one live connection.
 *
 * - Updates shared server pubkey
 * - Updates localStorage server history (client-side only)
 */
export function setServerPubkey(newServerPubkey: string) {
	serverConfig.pubkey = newServerPubkey || DEFAULT_SERVER;

	if (browser) {
		addServerToHistory(serverConfig.pubkey);
	}
}

/**
 * Switch to a new server and update the shared state
 * @deprecated Use `setServerPubkey` instead
 */
export function switchToServer(newServerPubkey: string) {
	setServerPubkey(newServerPubkey);
}
