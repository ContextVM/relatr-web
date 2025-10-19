import { RelayPool } from 'applesauce-relay';

// Create a single relay pool instance for the entire application
export const relayPool = new RelayPool();

export const defaultRelays = ['wss://relay.nostr.net'];

export const commonRelays = [
	'wss://relay.damus.io',
	'wss://relay.nostr.net',
	'wss://nos.lol',
	'wss://nostr.mom'
];

export const metadataRelays = ['wss://0.kindpag.es/', 'wss://nos.lol', 'wss://relay.damus.io'];

export const devRelay = ['ws://localhost:10547'];
