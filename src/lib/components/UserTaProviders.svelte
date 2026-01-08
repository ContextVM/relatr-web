<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { toast } from 'svelte-sonner';
	import { List, Edit2, Check, Trash2, RefreshCw, Plus } from 'lucide-svelte';
	import { getPubkeyDisplay } from '$lib/utils.nostr';
	import { useUserRelays, useUserTaProviders } from '$lib/queries/nostr';
	import { usePublishTaProvider } from '$lib/mutations/nostr';
	import { activeAccount } from '$lib/services/accountManager.svelte';
	import { getServerPubkey, getRelatrClient } from '$lib/stores/server-config.svelte';
	import { commonRelays } from '$lib/services/relay-pool';
	import { relaySet } from 'applesauce-core/helpers';
	import { relayStore } from '$lib/stores/relay-store.svelte';
	import { queryClient } from '$lib/query-client';
	import { useTaProviderStatus, getTaCapabilityState } from '$lib/queries/ta-provider';

	let serverPubkey = $derived(getServerPubkey());
	let relatrClient = $derived(getRelatrClient());
	let currentUserPubkey = $derived($activeAccount?.pubkey);
	const userRelaysQuery = $derived(useUserRelays(currentUserPubkey));

	const userTaProvidersQuery = $derived(
		useUserTaProviders(currentUserPubkey, userRelaysQuery.data ?? undefined)
	);

	const publishTaProviderMutation = usePublishTaProvider();

	let isEditMode = $state(false);
	// Selection state (array is easiest to make reactive in Svelte)
	let selectedProviders = $state<string[]>([]);

	// Get all TA provider tags
	let taProviderTags = $derived(
		(userTaProvidersQuery.data?.tags ?? []).filter((tag) => tag[0].startsWith('30382:'))
	);

	// Check if any providers are selected
	let hasSelectedProviders = $derived(selectedProviders.length > 0);

	// Check if current server supports TA capability
	const taProviderStatusQuery = $derived(
		useTaProviderStatus(relatrClient, serverPubkey, currentUserPubkey)
	);
	let taCapability = $derived(getTaCapabilityState(taProviderStatusQuery));
	let serverSupportsTa = $derived(taCapability === 'supported');

	// Callback prop (Svelte 5 preferred over createEventDispatcher)
	let { openProviderEnablement }: { openProviderEnablement?: () => void } = $props();

	function removeSelectedProviders() {
		if (!currentUserPubkey || selectedProviders.length === 0) return;
		const extraRelays = relaySet([...commonRelays, ...relayStore.selectedRelays]);

		publishTaProviderMutation.mutate(
			{
				userPubkey: currentUserPubkey,
				userRelays: relaySet([...(userRelaysQuery.data?.relays ?? []), ...extraRelays]),
				existingEvent: userTaProvidersQuery.data || null,
				providerPubkeysToRemove: selectedProviders
			},
			{
				onSuccess: (result) => {
					// Invalidate queries to refresh UI
					queryClient.invalidateQueries({ queryKey: ['userTaProviders', currentUserPubkey] });
					queryClient.invalidateQueries({ queryKey: ['taProviderStatus'] });

					toast.success(
						`Successfully removed ${selectedProviders.length} provider(s) (published to ${result.publishedTo.length} relay(s))`
					);
					selectedProviders = [];
					isEditMode = false;
				},
				onError: (error) => {
					toast.error(error instanceof Error ? error.message : 'Failed to remove providers');
				}
			}
		);
	}

	function toggleProviderSelection(providerPubkey: string) {
		selectedProviders = selectedProviders.includes(providerPubkey)
			? selectedProviders.filter((p) => p !== providerPubkey)
			: [...selectedProviders, providerPubkey];
	}

	function refreshProviders() {
		userRelaysQuery.refetch();
		userTaProvidersQuery.refetch();
	}

	let isLoading = $derived(
		publishTaProviderMutation.isPending ||
			userRelaysQuery.isLoading ||
			userTaProvidersQuery.isLoading
	);
</script>

<div class="space-y-4">
	{#if userRelaysQuery.isLoading || userTaProvidersQuery.isLoading}
		<div class="flex flex-col items-center justify-center gap-3 py-6">
			<Spinner class="h-6 w-6" />
			<p class="text-sm text-muted-foreground">Loading your providers...</p>
		</div>
	{:else if userTaProvidersQuery.isError}
		<div class="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
			<div class="flex items-start gap-3">
				<div class="flex-1">
					<p class="text-sm font-medium text-destructive">Failed to load providers</p>
					<p class="mt-1 text-xs text-muted-foreground">
						{userTaProvidersQuery.error instanceof Error
							? userTaProvidersQuery.error.message
							: 'An unknown error occurred'}
					</p>
				</div>
			</div>
		</div>
	{:else}
		<div class="space-y-4">
			<div class="rounded-lg border p-4">
				<div class="mb-3 flex items-center justify-between">
					<div class="flex items-center gap-2">
						<List class="h-4 w-4 text-muted-foreground" />
						<p class="text-sm font-medium">Your Trusted Providers</p>
						{#if taProviderTags.length > 0}
							<Badge variant="secondary" class="text-xs">{taProviderTags.length}</Badge>
						{/if}
					</div>
					<div class="flex items-center gap-2">
						<Button
							onclick={refreshProviders}
							variant="ghost"
							size="icon"
							class="h-7 w-7"
							disabled={isLoading}
							title="Refresh providers"
						>
							<RefreshCw class="h-3 w-3" />
						</Button>
						{#if taProviderTags.length > 0}
							<Button
								onclick={() => {
									isEditMode = !isEditMode;
									if (!isEditMode) selectedProviders = [];
								}}
								variant="ghost"
								size="sm"
								class="h-7 px-2 text-xs"
							>
								{#if isEditMode}
									<Check class="mr-1 h-3 w-3" />
									Done
								{:else}
									<Edit2 class="mr-1 h-3 w-3" />
									Edit
								{/if}
							</Button>
						{/if}
					</div>
				</div>
				{#if taProviderTags.length > 0}
					<div class="space-y-2">
						{#each taProviderTags as tag (tag[1])}
							<div class="flex items-center justify-between rounded-md bg-muted/30 p-3">
								<div class="flex items-center gap-2">
									{#if isEditMode}
										<Checkbox
											checked={selectedProviders.includes(tag[1])}
											onclick={() => toggleProviderSelection(tag[1])}
											disabled={publishTaProviderMutation.isPending}
										/>
									{/if}
									<Badge variant="outline" class="font-mono text-xs">
										{tag[0]}
									</Badge>
									<span class="font-mono text-sm text-muted-foreground">
										{getPubkeyDisplay(tag[1])}
									</span>
								</div>
								<div class="flex items-center gap-2">
									{#if tag[1] === serverPubkey}
										<Badge variant="default" class="text-xs">Current</Badge>
									{/if}
								</div>
							</div>
						{/each}
					</div>
					{#if isEditMode && hasSelectedProviders}
						<div class="mt-3 flex gap-2">
							<Button
								onclick={removeSelectedProviders}
								variant="destructive"
								size="sm"
								class="flex-1"
								disabled={publishTaProviderMutation.isPending}
							>
								{#if publishTaProviderMutation.isPending}
									<Spinner class="mr-2 h-4 w-4" />
								{:else}
									<Trash2 class="mr-2 h-4 w-4" />
								{/if}
								Remove Selected ({selectedProviders.length})
							</Button>
							<Button
								onclick={() => (selectedProviders = [])}
								variant="outline"
								size="sm"
								disabled={publishTaProviderMutation.isPending}
							>
								Clear Selection
							</Button>
						</div>
					{/if}
				{:else}
					<div class="space-y-4 rounded-md border border-dashed p-6 text-center">
						<div class="space-y-2">
							<p class="text-sm font-medium">No trusted providers yet</p>
							<p class="text-sm text-muted-foreground">
								Your client will ignore Trusted Assertion data until you add at least one provider.
							</p>
						</div>
						{#if serverSupportsTa}
							<Button onclick={() => openProviderEnablement?.()} variant="default" size="sm">
								<Plus class="mr-2 h-4 w-4" />
								Enable this Relatr server as provider
							</Button>
						{:else}
							<p class="text-xs text-muted-foreground">
								This server doesn't support Trusted Assertions. Try a different server or add a
								provider manually.
							</p>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
