import { browser } from '$app/environment';
import { DEFAULT_SERVER } from '$lib/constants';
import { activeAccount } from '$lib/services/accountManager.svelte.js';
import { addServerToHistory, getServerHistory } from '$lib/utils';
import { RelatrClient } from '$lib/ctxcn/RelatrClient';
import { isValidServerIdentifier } from '$lib/utils.nostr';
import type { IAccount } from 'applesauce-accounts';

const serverConfig = $state({
	pubkey: DEFAULT_SERVER,
	client: null as RelatrClient | null
});

let signer = $state<IAccount['signer'] | undefined>(undefined);

function resolveInitialServerPubkey(): string {
	if (!browser) return DEFAULT_SERVER;

	const fromUrl = new URL(window.location.href).searchParams.get('s')?.trim();
	if (fromUrl && isValidServerIdentifier(fromUrl)) return fromUrl;

	const [latest] = getServerHistory();
	if (latest?.pubkey && isValidServerIdentifier(latest.pubkey)) return latest.pubkey;

	return DEFAULT_SERVER;
}

function normalizeServerPubkey(input: string): string | null {
	const trimmed = input.trim();
	if (!trimmed) return DEFAULT_SERVER;
	if (!isValidServerIdentifier(trimmed)) return null;
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
			const currentSigner = signer;

			const client = currentSigner
				? new RelatrClient({ serverPubkey: serverConfig.pubkey, signer: currentSigner })
				: new RelatrClient({ serverPubkey: serverConfig.pubkey });

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
