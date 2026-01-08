<script lang="ts">
	import { createMutation } from '@tanstack/svelte-query';
	import { queryClient } from '$lib/query-client';
	import { taProviderKeys } from '$lib/query-keys';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { toast } from 'svelte-sonner';
	import { CheckCircle, XCircle, TrendingUp, Calendar, Settings } from 'lucide-svelte';
	import { formatTimestamp } from '$lib/utils';
	import { useTaProviderStatus, getTaCapabilityState } from '$lib/queries/ta-provider';
	import { useUserRelays } from '$lib/queries/nostr';
	import { activeAccount } from '$lib/services/accountManager.svelte';
	import { getRelatrClient, getServerPubkey } from '$lib/stores/server-config.svelte';

	let relatrClient = $derived(getRelatrClient());
	let serverPubkey = $derived(getServerPubkey());
	let customRelays = $state('');
	let showAdvanced = $state(false);

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
			queryClient.invalidateQueries({
				queryKey: taProviderKeys.status(serverPubkey, $activeAccount?.pubkey)
			});

			if (result.success) {
				toast.success('Provider enabled successfully');
				// Reset custom relays after successful enable
				customRelays = '';
				showAdvanced = false;
			} else {
				toast.error(result.message || 'Failed to enable provider');
			}
		},
		onError: (err) => {
			toast.error(err instanceof Error ? err.message : 'Failed to enable provider');
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
			queryClient.invalidateQueries({
				queryKey: taProviderKeys.status(serverPubkey, $activeAccount?.pubkey)
			});

			if (result.success) {
				toast.success('Provider disabled successfully');
			} else {
				toast.error(result.message || 'Failed to disable provider');
			}
		},
		onError: (err) => {
			toast.error(err instanceof Error ? err.message : 'Failed to disable provider');
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
		<p class="text-sm text-muted-foreground">Loading provider status...</p>
	</div>
{:else if taCapability === 'unavailable'}
	<div class="rounded-lg border border-amber-600/30 bg-amber-600/10 p-4">
		<p class="text-sm font-medium text-amber-600">
			Server unavailable or does not support Trusted Assertions
		</p>
		<p class="mt-1 text-xs text-muted-foreground">
			The server is offline or doesn't support the Trusted Assertions feature. Provider management
			is not available.
		</p>
	</div>
{:else if taCapability === 'supported' && subscriptionQuery.data}
	<div class="space-y-6">
		<!-- Status Overview -->
		<div class="flex items-center justify-between rounded-lg border p-4">
			<div class="flex items-center gap-3">
				{#if isActive}
					<CheckCircle class="h-5 w-5 text-green-600" />
				{:else}
					<XCircle class="h-5 w-5 text-muted-foreground" />
				{/if}
				<div>
					<p class="text-sm font-medium">Provider status on this server</p>
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
					<Button
						onclick={() => subscribeMutation.mutate()}
						disabled={isLoading}
						class="w-full"
						data-enable-button
					>
						{#if subscribeMutation.isPending}
							<Spinner class="mr-2 h-4 w-4" />
						{/if}
						Enable Provider
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
					Disable Provider
				</Button>
			{/if}
		</div>
	</div>
{/if}
