import { browser } from '$app/environment';
import { isHexKey } from 'applesauce-core/helpers';
import { DEFAULT_SERVER } from '$lib/constants';
import { RelatrClient } from '$lib/ctxcn/RelatrClient.svelte.js';
import { activeAccount } from '$lib/services/accountManager.svelte.js';
import { addServerToHistory, getServerHistory } from '$lib/utils';

const serverConfig = $state({
	pubkey: DEFAULT_SERVER,
	client: null as RelatrClient | null
});

let signer = $state<unknown | null>(null);

function resolveInitialServerPubkey(): string {
	if (!browser) return DEFAULT_SERVER;

	const fromUrl = new URL(window.location.href).searchParams.get('s')?.trim();
	if (fromUrl && isHexKey(fromUrl)) return fromUrl;

	const [latest] = getServerHistory();
	if (latest?.pubkey && isHexKey(latest.pubkey)) return latest.pubkey;

	return DEFAULT_SERVER;
}

function normalizeServerPubkey(input: string): string | null {
	const trimmed = input.trim();
	if (!trimmed) return DEFAULT_SERVER;
	if (!isHexKey(trimmed)) return null;
	return trimmed;
}

// IMPORTANT: module-level effects must be created inside an effect tree. We use `$effect.root`
if (browser) {
	// Choose the right server *before* we ever connect, to avoid connecting to DEFAULT then switching.
	serverConfig.pubkey = resolveInitialServerPubkey();

	$effect.root(() => {
		const subscription = activeAccount.subscribe((account) => {
			signer = account?.signer ?? null;
		});

		$effect(() => {
			const serverPubkey = serverConfig.pubkey;
			const currentSigner = signer;

			const client = currentSigner
				? new RelatrClient({ serverPubkey, signer: currentSigner as never })
				: new RelatrClient({ serverPubkey });

			serverConfig.client = client;

			return () => {
				client.disconnect().catch((err) => {
					console.warn('Failed to disconnect RelatrClient:', err);
				});
			};
		});

		return () => subscription.unsubscribe();
	});
}

export function getRelatrClient() {
	return serverConfig.client;
}

export function getServerPubkey() {
	return serverConfig.pubkey;
}

export function setServerPubkey(nextServerPubkey: string) {
	const normalized = normalizeServerPubkey(nextServerPubkey);
	if (!normalized) return;

	if (normalized === serverConfig.pubkey) return;

	serverConfig.pubkey = normalized;

	if (browser) addServerToHistory(normalized);
}
