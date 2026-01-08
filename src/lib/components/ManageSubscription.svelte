<script lang="ts">
	import { createMutation } from '@tanstack/svelte-query';
	import { queryClient } from '$lib/query-client';
	import { taProviderKeys } from '$lib/query-keys';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { toast } from 'svelte-sonner';
	import { CheckCircle, XCircle, TrendingUp, Settings } from 'lucide-svelte';
	import { formatTimestamp } from '$lib/utils';
	import { useTaProviderStatus, getTaCapabilityState } from '$lib/queries/ta-provider';
	import { useUserRelays } from '$lib/queries/nostr';
	import { activeAccount } from '$lib/services/accountManager.svelte';
	import { getRelatrClient, getServerPubkey } from '$lib/stores/server-config.svelte';

	interface Props {
		onAfterChange?: () => void;
	}

	let { onAfterChange }: Props = $props();

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
				// Notify parent of change
				onAfterChange?.();
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
				// Notify parent of change
				onAfterChange?.();
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
	<div class="flex items-center justify-center gap-3 py-4">
		<Spinner class="h-5 w-5" />
		<p class="text-sm text-muted-foreground">Loading provider status...</p>
	</div>
{:else if taCapability === 'unavailable'}
	<div class="rounded-md border border-amber-600/30 bg-amber-600/10 p-3">
		<p class="text-sm font-medium text-amber-600">
			Server unavailable or does not support Trusted Assertions
		</p>
	</div>
{:else if taCapability === 'supported' && subscriptionQuery.data}
	<div class="space-y-4">
		<!-- Status & Rank Row -->
		<div class="flex items-center justify-between rounded-md border bg-muted/30 p-3">
			<div class="flex items-center gap-3">
				{#if isActive}
					<CheckCircle class="h-4 w-4 text-green-600" />
				{:else}
					<XCircle class="h-4 w-4 text-muted-foreground" />
				{/if}
				<Badge variant={isActive ? 'default' : 'secondary'}>
					{isActive ? 'Active' : 'Inactive'}
				</Badge>
				{#if rank}
					<div class="flex items-center gap-1 text-xs text-muted-foreground">
						<TrendingUp class="h-3 w-3" />
						<span>Rank: <span class="font-medium">{rank.rank}</span></span>
					</div>
				{/if}
			</div>
		</div>

		<!-- Timestamps (compact) -->
		<div class="flex items-center justify-between gap-4 text-xs text-muted-foreground">
			<span>
				Created: {subscriptionQuery.data.createdAt
					? formatTimestamp(subscriptionQuery.data.createdAt)
					: 'Never'}
			</span>
			<span>
				Updated: {subscriptionQuery.data.updatedAt
					? formatTimestamp(subscriptionQuery.data.updatedAt)
					: 'Never'}
			</span>
		</div>

		<!-- Action Buttons -->
		{#if !isActive}
			<div class="space-y-2">
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
				{#if showAdvanced}
					<div class="space-y-2 rounded-md border bg-muted/30 p-3">
						<label for="custom-relays-input" class="text-sm font-medium">
							Custom Relays (Optional)
						</label>
						<p class="text-xs text-muted-foreground">
							Comma-separated list of relay URLs. Leave empty for defaults.
						</p>
						<input
							id="custom-relays-input"
							bind:value={customRelays}
							class="w-full rounded-md border bg-background px-3 py-2 text-sm"
							placeholder="wss://relay1.example.com, wss://relay2.example.com"
						/>
					</div>
				{:else}
					<Button onclick={() => (showAdvanced = true)} variant="ghost" size="sm" class="w-full">
						<Settings class="mr-2 h-4 w-4" />
						Advanced Options
					</Button>
				{/if}
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
{/if}
