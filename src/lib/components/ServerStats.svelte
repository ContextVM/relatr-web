<script lang="ts">
	import type { RelatrClient, StatsOutput } from '$lib/ctxcn/RelatrClient.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { Server, Database, Users, Link, Copy } from 'lucide-svelte';
	import ProfileCard from './ProfileCard.svelte';
	import { copyToClipboard } from '$lib/utils';
	import { truncatePubkey } from '$lib/utils.nostr';

	let { relatr, serverPubkey } = $props<{
		relatr: RelatrClient;
		serverPubkey: string;
	}>();

	let stats = $state<StatsOutput | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);

	async function fetchStats() {
		if (!relatr) return;

		loading = true;
		error = null;

		try {
			stats = await relatr.Stats({});
		} catch (err) {
			console.error('Failed to fetch server stats:', err);
			error = err instanceof Error ? err.message : 'Failed to fetch server statistics';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (relatr) {
			fetchStats();
		}
	});

	function formatNumber(num: number): string {
		if (num >= 1000000) {
			return (num / 1000000).toFixed(1) + 'M';
		}
		if (num >= 1000) {
			return (num / 1000).toFixed(1) + 'K';
		}
		return num.toString();
	}
</script>

<Card class="w-full max-w-md">
	<CardHeader class="pb-1">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<Server class="h-4 w-4 text-muted-foreground" />
				<CardTitle class="text-base">Server Status</CardTitle>
			</div>
		</div>
		<CardDescription>
			{#if stats}
				Connected to Relatr server
			{:else if loading}
				Connecting to server...
			{:else if error}
				Failed to connect
			{:else}
				Checking server status...
			{/if}
		</CardDescription>

		<Badge variant="outline" class="text-xs" onclick={() => copyToClipboard(serverPubkey)}>
			{truncatePubkey(serverPubkey)}
			<Copy class="h-4 w-4" />
		</Badge>
	</CardHeader>

	<CardContent class="pt-0">
		{#if loading}
			<div class="flex items-center justify-center py-4">
				<Spinner class="h-4 w-4" />
				<span class="ml-2 text-sm text-muted-foreground">Loading stats...</span>
			</div>
		{:else if error}
			<div class="rounded-md bg-destructive/10 p-3">
				<p class="text-sm text-destructive">{error}</p>
			</div>
		{:else if stats}
			<!-- Server Public Key -->
			<div class="mb-3 border-b pb-3">
				<div class="flex items-center gap-1">
					<Link class="h-3 w-3 text-muted-foreground" />
					<span class="text-xs font-medium text-muted-foreground">Source Key</span>
				</div>
				<p class="mt-1 font-mono text-xs break-all text-muted-foreground">
					<ProfileCard pubkey={stats.sourcePubkey} />
				</p>
			</div>
			<div class="grid grid-cols-2 gap-4">
				<!-- Database Stats -->
				<div class="space-y-1">
					<div class="flex items-center gap-1">
						<Database class="h-3 w-3 text-muted-foreground" />
						<span class="text-xs font-medium text-muted-foreground">Database</span>
					</div>
					<div class="text-sm">
						<div class="flex justify-between">
							<span>Metrics:</span>
							<span class="font-mono">{formatNumber(stats.database.metrics.totalEntries)}</span>
						</div>
						<div class="flex justify-between">
							<span>Metadata:</span>
							<span class="font-mono">{formatNumber(stats.database.metadata.totalEntries)}</span>
						</div>
					</div>
				</div>

				<!-- Social Graph Stats -->
				<div class="space-y-1">
					<div class="flex items-center gap-1">
						<Users class="h-3 w-3 text-muted-foreground" />
						<span class="text-xs font-medium text-muted-foreground">Social Graph</span>
					</div>
					<div class="text-sm">
						<div class="flex justify-between">
							<span>Users:</span>
							<span class="font-mono">{formatNumber(stats.socialGraph.stats.users)}</span>
						</div>
						<div class="flex justify-between">
							<span>Follows:</span>
							<span class="font-mono">{formatNumber(stats.socialGraph.stats.follows)}</span>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</CardContent>
</Card>
