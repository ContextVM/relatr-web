import { clsx, type ClassValue } from 'clsx';
import { toast } from 'svelte-sonner';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };

/**
 * Copy data to clipboard
 */
export async function copyToClipboard(data: BlobPart, mimeType = 'text/plain') {
	try {
		// Always use text/plain for maximum compatibility
		const textData = String(data);

		if (navigator.clipboard.write) {
			await navigator.clipboard.write([
				new ClipboardItem({
					[mimeType]: new Blob([textData], {
						type: mimeType
					}),
					['text/plain']: new Blob([textData], {
						type: 'text/plain'
					})
				})
			]);
		} else {
			await new Promise((resolve) => {
				resolve(navigator.clipboard.writeText(textData));
			});
		}
		toast.success('Copied 👍');
	} catch (e) {
		toast.error(`Error: ${e}`);
		console.log(e);
	}
}

/**
 * Local storage utilities for server history management
 */
const SERVER_HISTORY_KEY = 'relatr-server-history';

export interface ServerHistoryItem {
	pubkey: string;
	lastConnected: number;
	displayName?: string;
}

/**
 * Get server history from local storage
 */
export function getServerHistory(): ServerHistoryItem[] {
	if (typeof window === 'undefined') return [];

	try {
		const stored = localStorage.getItem(SERVER_HISTORY_KEY);
		return stored ? JSON.parse(stored) : [];
	} catch (error) {
		console.error('Error reading server history from localStorage:', error);
		return [];
	}
}

/**
 * Save server history to local storage
 */
export function saveServerHistory(history: ServerHistoryItem[]): void {
	if (typeof window === 'undefined') return;

	try {
		localStorage.setItem(SERVER_HISTORY_KEY, JSON.stringify(history));
	} catch (error) {
		console.error('Error saving server history to localStorage:', error);
	}
}

/**
 * Add a server to history or update its last connected timestamp
 */
export function addServerToHistory(pubkey: string): void {
	if (!pubkey) return;

	const history = getServerHistory();

	// Remove existing entry if present (we'll add it back with updated timestamp)
	const filteredHistory = history.filter((item) => item.pubkey !== pubkey);

	// Add new entry at the beginning (most recent)
	const updatedHistory = [
		{
			pubkey,
			lastConnected: Date.now()
		},
		...filteredHistory
	];

	// Limit to 10 entries
	const limitedHistory = updatedHistory.slice(0, 10);

	saveServerHistory(limitedHistory);
}

/**
 * Remove a server from history
 */
export function removeServerFromHistory(pubkey: string): void {
	const history = getServerHistory();
	const filteredHistory = history.filter((item) => item.pubkey !== pubkey);
	saveServerHistory(filteredHistory);
}

/**
 * Clear all server history
 */
export function clearServerHistory(): void {
	if (typeof window === 'undefined') return;

	try {
		localStorage.removeItem(SERVER_HISTORY_KEY);
	} catch (error) {
		console.error('Error clearing server history from localStorage:', error);
	}
}

export function formatTimestamp(timestamp: number): string {
	return new Date(timestamp * 1000).toLocaleString();
}
