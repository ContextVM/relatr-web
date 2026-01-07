<script lang="ts">
	import { createMutation } from '@tanstack/svelte-query';
	import { queryClient } from '$lib/query-client';
	import { taProviderKeys } from '$lib/query-keys';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import { toast } from 'svelte-sonner';
	import {
		CheckCircle,
		XCircle,
		TrendingUp,
		Minus,
		Calendar,
		Settings,
		Check,
		ChevronDown
	} from 'lucide-svelte';
	import { formatTimestamp } from '$lib/utils';
	import { useTaProviderStatus, getTaCapabilityState } from '$lib/queries/ta-provider';
	import { useUserRelays } from '$lib/queries/nostr';
	import { activeAccount } from '$lib/services/accountManager.svelte';
	import { getRelatrClient, getServerPubkey } from '$lib/stores/server-config.svelte';
	import type { ManageTaSubscriptionOutput } from '$lib/ctxcn/RelatrClient';

	let relatrClient = $derived(getRelatrClient());
	let serverPubkey = $derived(getServerPubkey());
	let customRelays = $state('');
	let showAdvanced = $state(false);
	let lastError = $state<string | null>(null);
	let lastSuccess = $state<ManageTaSubscriptionOutput | null>(null);

	// Query for subscription status (cached across navigation)
	const subscriptionQuery = $derived(
		useTaProviderStatus(relatrClient, serverPubkey, $activeAccount?.pubkey)
	);

	// Query for user relays to populate custom relays input
	const userRelaysQuery = $derived(useUserRelays($activeAccount?.pubkey));

	// Initialize customRelays with user's write relays when available
	$effect(() => {
		if (userRelaysQuery.data?.write && customRelays === '') {
			customRelays = userRelaysQuery.data.write.join(', ');
		}
	});

	function getStatusKey() {
		return taProviderKeys.status(serverPubkey, subscriptionQuery.data?.subscriberPubkey);
	}

	// Mutations for subscribe/unsubscribe
	const subscribeMutation = createMutation(() => ({
		mutationFn: async () => {
			if (!relatrClient) throw new Error('No client available');
			return await relatrClient.ManageTaSubscription('subscribe', customRelays || undefined);
		},
		onSuccess: (result) => {
			// Optimistically update UI and invalidate in background
			queryClient.setQueryData(getStatusKey(), result);

			if (result.success) {
				lastSuccess = result;
				lastError = null;
				toast.success('Successfully subscribed to Trusted Assertions provider');
				// Reset custom relays after successful subscription
				customRelays = '';
				showAdvanced = false;
			} else {
				lastError = result.message || 'Subscription failed';
				toast.error(lastError);
			}
		},
		onError: (err) => {
			lastError = err instanceof Error ? err.message : 'Failed to subscribe';
			toast.error(lastError);
		}
	}));

	const unsubscribeMutation = createMutation(() => ({
		mutationFn: async () => {
			if (!relatrClient) throw new Error('No client available');
			return await relatrClient.ManageTaSubscription('unsubscribe');
		},
		onSuccess: (result) => {
			// Optimistically update UI and invalidate in background
			queryClient.setQueryData(getStatusKey(), result);

			if (result.success) {
				lastSuccess = result;
				lastError = null;
				toast.success('Successfully unsubscribed from Trusted Assertions provider');
			} else {
				lastError = result.message || 'Unsubscription failed';
				toast.error(lastError);
			}
		},
		onError: (err) => {
			lastError = err instanceof Error ? err.message : 'Failed to unsubscribe';
			toast.error(lastError);
		}
	}));

	let isLoading = $derived(
		subscriptionQuery.isLoading || subscribeMutation.isPending || unsubscribeMutation.isPending
	);
	let isActive = $derived(subscriptionQuery.data?.isActive ?? false);
	let rank = $derived(subscriptionQuery.data?.rank);
	// TA capability state: 'unknown' | 'supported' | 'unavailable'
	let taCapability = $derived(getTaCapabilityState(subscriptionQuery));
</script>

{#if subscriptionQuery.isLoading}
	<div class="flex flex-col items-center justify-center gap-3 py-8">
		<Spinner class="h-8 w-8" />
		<p class="text-sm text-muted-foreground">Loading subscription status...</p>
	</div>
{:else if taCapability === 'unavailable'}
	<div class="rounded-lg border border-amber-600/30 bg-amber-600/10 p-4">
		<p class="text-sm font-medium text-amber-600">
			Server unavailable or does not support Trusted Assertions
		</p>
		<p class="mt-1 text-xs text-muted-foreground">
			The server is offline or doesn't support the Trusted Assertions feature. Subscription
			management is not available.
		</p>
	</div>
{:else if taCapability === 'supported' && subscriptionQuery.data}
	<Collapsible.Root class="w-full">
		<Collapsible.Trigger class="w-full justify-between">
			<Button variant="outline" class="w-full ">
				<span class="flex items-center justify-between gap-2">
					{#if isActive}
						<CheckCircle class="h-4 w-4 text-green-600" />
					{:else}
						<XCircle class="h-4 w-4 text-muted-foreground" />
					{/if}
					<span>Trusted Assertions Subscription</span>
					<Badge variant={isActive ? 'default' : 'secondary'} class="text-xs">
						{isActive ? 'Active' : 'Inactive'}
					</Badge>
				</span>
				<ChevronDown class="h-4 w-4 transition-transform" />
			</Button>
		</Collapsible.Trigger>
		<Collapsible.Content class="mt-4 space-y-6">
			<!-- Success Display -->
			{#if lastSuccess}
				<div class="rounded-lg border border-green-500/50 bg-green-500/10 p-4">
					<div class="flex items-start gap-3">
						<CheckCircle class="mt-0.5 h-5 w-5 text-green-600" />
						<div class="flex-1">
							<p class="text-sm font-medium text-green-600">Operation Successful</p>
							{#if lastSuccess.message}
								<p class="mt-1 text-xs text-muted-foreground">{lastSuccess.message}</p>
							{/if}
							{#if lastSuccess.rank?.relayResults && lastSuccess.rank.relayResults.length > 0}
								<div class="mt-3 space-y-2">
									<div class="flex items-center gap-1 text-xs font-medium text-muted-foreground">
										<span>Relay Results</span>
									</div>
									<div class="space-y-1">
										{#each lastSuccess.rank.relayResults as relayResult (relayResult.from)}
											<div class="flex items-start gap-2 rounded-md bg-background/50 p-2">
												{#if relayResult.ok}
													<Check class="mt-0.5 h-3 w-3 shrink-0 text-green-600" />
												{:else}
													<XCircle class="mt-0.5 h-3 w-3 shrink-0 text-destructive" />
												{/if}
												<div class="min-w-0 flex-1">
													<p class="font-mono text-xs break-all">{relayResult.from}</p>
													{#if relayResult.message}
														<p class="text-xs text-muted-foreground">{relayResult.message}</p>
													{/if}
												</div>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						</div>
						<Button
							variant="ghost"
							size="icon"
							class="h-6 w-6"
							onclick={() => (lastSuccess = null)}
						>
							<Minus class="h-4 w-4" />
						</Button>
					</div>
				</div>
			{/if}

			<!-- Error Display -->
			{#if lastError}
				<div class="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
					<div class="flex items-start gap-3">
						<XCircle class="mt-0.5 h-5 w-5 text-destructive" />
						<div class="flex-1">
							<p class="text-sm font-medium text-destructive">Operation Failed</p>
							<p class="mt-1 text-xs text-muted-foreground">{lastError}</p>
						</div>
						<Button variant="ghost" size="icon" class="h-6 w-6" onclick={() => (lastError = null)}>
							<Minus class="h-4 w-4" />
						</Button>
					</div>
				</div>
			{/if}

			<!-- Status Overview -->
			<div class="flex items-center justify-between rounded-lg border p-4">
				<div class="flex items-center gap-3">
					{#if isActive}
						<CheckCircle class="h-5 w-5 text-green-600" />
					{:else}
						<XCircle class="h-5 w-5 text-muted-foreground" />
					{/if}
					<div>
						<p class="text-sm font-medium">Subscription Status</p>
						<Badge variant={isActive ? 'default' : 'secondary'}>
							{isActive ? 'Active' : 'Inactive'}
						</Badge>
					</div>
				</div>
			</div>

			<!-- Account Information -->
			<div class="grid gap-4 md:grid-cols-2">
				{#if rank}
					<div class="space-y-2">
						<div class="flex items-center gap-2">
							<TrendingUp class="h-4 w-4 text-muted-foreground" />
							<p class="text-sm font-medium">Your Rank</p>
						</div>
						<div class="flex items-center gap-3">
							<span class="text-2xl font-bold">{rank.rank}</span>
						</div>
					</div>
				{/if}
			</div>

			<!-- Timestamps -->
			<div class="grid gap-4 md:grid-cols-2">
				<div class="flex items-center gap-3 rounded-lg border p-3">
					<Calendar class="h-4 w-4 text-muted-foreground" />
					<div class="flex-1">
						<p class="text-xs text-muted-foreground">Created</p>
						<p class="text-xs text-muted-foreground">
							{subscriptionQuery.data.createdAt
								? formatTimestamp(subscriptionQuery.data.createdAt)
								: 'Never'}
						</p>
					</div>
				</div>
				<div class="flex items-center gap-3 rounded-lg border p-3">
					<Calendar class="h-4 w-4 text-muted-foreground" />
					<div class="flex-1">
						<p class="text-xs text-muted-foreground">Last Updated</p>
						<p class="text-xs text-muted-foreground">
							{subscriptionQuery.data.updatedAt
								? formatTimestamp(subscriptionQuery.data.updatedAt)
								: 'Never'}
						</p>
					</div>
				</div>
			</div>

			<!-- Action Buttons -->
			<div class="space-y-4">
				{#if !isActive}
					<div class="space-y-3">
						<Button onclick={() => subscribeMutation.mutate()} disabled={isLoading} class="w-full">
							{#if subscribeMutation.isPending}
								<Spinner class="mr-2 h-4 w-4" />
							{/if}
							Subscribe to Trusted Assertions
						</Button>

						<!-- Advanced Options -->
						<div class="space-y-2">
							<Button
								onclick={() => (showAdvanced = !showAdvanced)}
								variant="ghost"
								size="sm"
								class="w-full"
							>
								<Settings class="mr-2 h-4 w-4" />
								Advanced Options
							</Button>

							{#if showAdvanced}
								<div class="rounded-lg border bg-muted/30 p-4">
									<div class="mb-2">
										<label for="custom-relays-input" class="text-sm font-medium"
											>Custom Relays (Optional)</label
										>
										<p class="text-xs text-muted-foreground">
											Comma-separated list of relay URLs to publish TA events to. Leave empty to use
											default relays.
										</p>
									</div>
									<input
										id="custom-relays-input"
										bind:value={customRelays}
										class="w-full rounded-md border bg-background px-3 py-2 text-sm"
										placeholder="wss://relay1.example.com, wss://relay2.example.com"
									/>
								</div>
							{/if}
						</div>
					</div>
				{:else}
					<Button
						onclick={() => unsubscribeMutation.mutate()}
						variant="outline"
						disabled={isLoading}
						class="w-full"
					>
						{#if unsubscribeMutation.isPending}
							<Spinner class="mr-2 h-4 w-4" />
						{/if}
						Unsubscribe
					</Button>
				{/if}
			</div>
		</Collapsible.Content>
	</Collapsible.Root>
{/if}
