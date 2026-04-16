<script lang="ts">
	import { Card, CardContent } from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import WeightDistribution from '$lib/components/plugins/WeightDistribution.svelte';
	import ProfileCard from './ProfileCard.svelte';
	import { Edit, Users, Link as LinkIcon, Clock, Trash2, Check, X, Copy } from 'lucide-svelte';
	import type { PluginsListOutput } from '$lib/ctxcn/RelatrClient';
	import { usePluginsList } from '$lib/queries/plugins';
	import {
		decodeServerIdentifier,
		getPubkeyDisplay,
		isValidServerIdentifier,
		pubkeyToHexColor
	} from '$lib/utils.nostr';
	import { copyToClipboard } from '$lib/utils';
	import type { ServerHistoryItem } from '$lib/utils';
	import { useServerStats } from '$lib/queries/server-stats';
	import { getRelatrClient, getServerPubkey } from '$lib/stores/server-config.svelte';

	let {
		serverPubkeyInput = $bindable(),
		validationError = $bindable(),
		serverHistory,
		onServerChange,
		onHistoryRemove,
		onValidate
	}: {
		serverPubkeyInput: string;
		validationError: string | null;
		serverHistory: ServerHistoryItem[];
		onServerChange: () => void;
		onHistoryRemove: (pubkey: string, event: Event) => void;
		onValidate: () => void;
	} = $props();

	let relatrClient = $derived(getRelatrClient());
	let serverPubkey = $derived(getServerPubkey());
	let isEditing = $state(false);

	type InstalledPlugin = PluginsListOutput['plugins'][number];

	// Use query for server stats with automatic caching
	const serverStatsQuery = $derived(useServerStats(relatrClient, serverPubkey));
	const pluginsListQuery = $derived(usePluginsList(relatrClient, serverPubkey));
	const stats = $derived(serverStatsQuery.data);
	const loading = $derived(serverStatsQuery.isLoading);
	const error = $derived(serverStatsQuery.error ? serverStatsQuery.error.message : null);
	const installedPlugins = $derived(pluginsListQuery.data?.plugins ?? []);
	const totalInstalledWeight = $derived(
		installedPlugins.reduce((total, plugin) => total + getWeightValue(plugin), 0)
	);

	function getWeightValue(plugin: InstalledPlugin): number {
		return Math.max(plugin.effectiveWeight, 0);
	}

	function hashString(value: string): string {
		let hash = 0;

		for (let index = 0; index < value.length; index += 1) {
			hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
		}

		return hash.toString(16).padStart(8, '0');
	}

	function getPluginColor(
		pluginPubkey: string | undefined,
		pluginName: string | undefined,
		pluginKey: string
	): string {
		const hashInput = `${pluginPubkey || ''}:${pluginName || pluginKey}`;
		return pubkeyToHexColor(hashString(hashInput));
	}

	function formatWeightPercentage(weight: number): string {
		return `${Math.round(Math.max(weight, 0) * 100)}%`;
	}

	function formatNumber(num: number): string {
		if (num >= 1000000) {
			return (num / 1000000).toFixed(1) + 'M';
		}
		if (num >= 1000) {
			return (num / 1000).toFixed(1) + 'K';
		}
		return num.toString();
	}

	function handleEdit() {
		isEditing = true;
	}

	function handleCancel() {
		isEditing = false;
		validationError = null;
	}

	function handleSave() {
		onServerChange();
		isEditing = false;
	}

	function connectToServerFromHistory(pubkey: string) {
		serverPubkeyInput = pubkey;
		onServerChange();
		isEditing = false;
	}
</script>

<Card class="w-full pb-0">
	<CardContent class="p-3">
		{#if !isEditing}
			<!-- Status Mode -->
			<div class="flex items-center justify-between gap-4">
				<!-- Left: Connection Status & Source Profile -->
				<div class="flex items-center gap-3">
					{#if loading}
						<Spinner class="h-4 w-4" />
					{:else if error}
						<div class="h-2 w-2 rounded-full bg-red-500"></div>
					{:else if stats}
						<div class="h-2 w-2 rounded-full bg-green-500"></div>
					{:else}
						<div class="h-2 w-2 rounded-full bg-gray-400"></div>
					{/if}

					<div class="flex flex-col gap-1">
						<div class="text-sm font-medium">
							{#if stats && !loading}
								Connected to server
							{:else if loading}
								Connecting...
							{:else if error}
								Connection failed
							{:else}
								Checking status...
							{/if}
						</div>
						{#if stats && !loading}
							<div class="flex items-center gap-2">
								<span class="text-xs text-muted-foreground">Source:</span>
								<ProfileCard pubkey={stats.sourcePubkey} mode="minimal" />
							</div>
						{/if}
						<div class="flex items-center gap-1">
							<span class="text-xs text-muted-foreground">Server:</span>
							<span class="font-mono text-xs">{getPubkeyDisplay(serverPubkey)}</span>
							<Button
								variant="ghost"
								size="icon"
								class="h-5 w-5 p-0 hover:bg-transparent"
								onclick={() => copyToClipboard(serverPubkey)}
							>
								<Copy class="h-3 w-3" />
							</Button>
						</div>
					</div>
				</div>

				<!-- Right: Stats & Edit Button -->
				<div class="flex items-center gap-4">
					{#if stats}
						<div class="flex flex-col gap-1 text-sm">
							<div class="flex items-center justify-between gap-2">
								<div class="flex items-center gap-1">
									<Users class="h-3 w-3 text-muted-foreground" />
									<span class="text-muted-foreground">Users:</span>
								</div>
								<span class="font-mono font-medium"
									>{formatNumber(stats.socialGraph.stats.users)}</span
								>
							</div>
							<div class="flex items-center justify-between gap-2">
								<div class="flex items-center gap-1">
									<LinkIcon class="h-3 w-3 text-muted-foreground" />
									<span class="text-muted-foreground">Follows:</span>
								</div>
								<span class="font-mono font-medium"
									>{formatNumber(stats.socialGraph.stats.follows)}</span
								>
							</div>
							<div class="flex items-center justify-between gap-2">
								<div class="flex items-center gap-1">
									<LinkIcon class="h-3 w-3 text-muted-foreground" />
									<span class="text-muted-foreground">Version:</span>
								</div>
								<span class="font-mono font-medium">{stats.relatrVersion || 'Not declared'}</span>
							</div>
						</div>
					{/if}
					<Button variant="outline" size="sm" onclick={handleEdit}>
						<Edit class="h-3 w-3" />
						Edit
					</Button>
				</div>
			</div>

			{#if installedPlugins.length > 0}
				<div class="mt-4 border-t">
					<WeightDistribution
						{installedPlugins}
						{totalInstalledWeight}
						{getPluginColor}
						{formatWeightPercentage}
						compact={true}
						title="Plugin weight distribution"
						description="Installed plugin weights for the currently selected server. Expand to inspect how each signal contributes."
					/>
				</div>
			{/if}
		{:else}
			<!-- Edit Mode -->
			<div class="space-y-3">
				<!-- Server Input Section -->
				<div class="space-y-2">
					<Label for="server-pubkey">Server Identifier</Label>
					<Input
						id="server-pubkey"
						bind:value={serverPubkeyInput}
						placeholder="Enter hex, npub, or nprofile, or leave empty for default"
						class="w-full font-mono text-sm"
						oninput={onValidate}
						onkeydown={(e: KeyboardEvent) => {
							if (e.key === 'Enter' && !validationError) {
								handleSave();
							} else if (e.key === 'Escape') {
								handleCancel();
							}
						}}
					/>
					{#if validationError}
						<p class="text-xs text-destructive">{validationError}</p>
					{:else if serverPubkeyInput.trim() && isValidServerIdentifier(serverPubkeyInput.trim())}
						<p class="text-xs text-green-600">✓ Valid server identifier</p>
					{/if}
				</div>

				<!-- Server History Section -->
				{#if serverHistory.length > 0}
					<div class="space-y-2">
						<div class="flex items-center gap-2 text-sm font-medium">
							<Clock class="h-4 w-4" />
							<span>Recent Servers</span>
						</div>
						<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
							{#each serverHistory as server (server.pubkey)}
								<Card
									class="group cursor-pointer px-3 py-2 transition-colors hover:bg-accent hover:text-accent-foreground {server.pubkey ===
									serverPubkey
										? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30'
										: ''}"
									onclick={() => connectToServerFromHistory(server.pubkey)}
								>
									<CardContent class="p-0">
										<div class="flex items-center justify-between">
											<div class="flex flex-col gap-1">
												<div class="inline-flex items-center gap-1">
													<div
														class="h-2 w-2 rounded-full"
														style="background-color: {pubkeyToHexColor(
															decodeServerIdentifier(server.pubkey)?.pubkey ?? server.pubkey
														)}"
													></div>
													<span class="font-mono text-xs">{getPubkeyDisplay(server.pubkey)}</span>
												</div>
												<span class="text-xs text-muted-foreground">
													{new Date(server.lastConnected).toLocaleDateString()}
												</span>
											</div>
											<button
												type="button"
												class="hover:text-destructive-foreground rounded-sm p-1 opacity-0 transition-all group-hover:opacity-100 hover:bg-destructive"
												onclick={(e) => onHistoryRemove(server.pubkey, e)}
											>
												<Trash2 class="h-3 w-3" />
											</button>
										</div>
									</CardContent>
								</Card>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Action Buttons -->
				<div class="flex justify-end gap-2">
					<Button variant="outline" size="sm" onclick={handleCancel}>
						<X class="h-3 w-3" />
						Cancel
					</Button>
					<Button size="sm" onclick={handleSave} disabled={!!validationError}>
						<Check class="h-3 w-3" />
						Connect
					</Button>
				</div>
			</div>
		{/if}
	</CardContent>
</Card>
