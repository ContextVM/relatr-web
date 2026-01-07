<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { toast } from 'svelte-sonner';
	import {
		Plus,
		List,
		Edit2,
		Check,
		Trash2,
		CheckCircle,
		XCircle,
		Minus,
		RefreshCw
	} from 'lucide-svelte';
	import { getPubkeyDisplay } from '$lib/utils.nostr';
	import { useUserRelays, useUserTaProviders } from '$lib/queries/nostr';
	import { usePublishTaProvider, type PublishTaProviderOutput } from '$lib/mutations/nostr';
	import { useTaProviderStatus } from '$lib/queries/ta-provider';
	import { activeAccount } from '$lib/services/accountManager.svelte';
	import { getServerPubkey, getRelatrClient } from '$lib/stores/server-config.svelte';
	import { commonRelays } from '$lib/services/relay-pool';
	import { relaySet } from 'applesauce-core/helpers';
	import { relayStore } from '$lib/stores/relay-store.svelte';

	let serverPubkey = $derived(getServerPubkey());
	let currentUserPubkey = $derived($activeAccount?.pubkey);
	let relatrClient = $derived(getRelatrClient());
	const userRelaysQuery = $derived(useUserRelays(currentUserPubkey));

	const userTaProvidersQuery = $derived(
		useUserTaProviders(currentUserPubkey, userRelaysQuery.data ?? undefined)
	);

	// Check if current server supports TA feature
	const taProviderStatusQuery = $derived(
		useTaProviderStatus(relatrClient, serverPubkey, currentUserPubkey)
	);

	const publishTaProviderMutation = usePublishTaProvider();

	let isEditMode = $state(false);
	// Selection state (array is easiest to make reactive in Svelte)
	let selectedProviders = $state<string[]>([]);
	let lastSuccess = $state<PublishTaProviderOutput | null>(null);
	let lastError = $state<string | null>(null);

	let RelatrInTaProviders = $derived(
		(userTaProvidersQuery.data?.tags ?? []).some(
			(tag) => tag[0] === '30382:rank' && tag[1] === serverPubkey
		)
	);

	// Determine if TA is supported: true = supported, false = not supported, null = unknown/loading
	let isTaSupported = $derived(
		taProviderStatusQuery.data !== null && taProviderStatusQuery.data !== undefined
	);
	// Get all TA provider tags
	let taProviderTags = $derived(
		(userTaProvidersQuery.data?.tags ?? []).filter((tag) => tag[0].startsWith('30382:'))
	);

	// Check if any providers are selected
	let hasSelectedProviders = $derived(selectedProviders.length > 0);

	function addRelatrToTaProviders() {
		if (!currentUserPubkey) return;

		const relaysToPublish = userRelaysQuery.data || {
			relays: commonRelays,
			read: commonRelays,
			write: commonRelays
		};

		publishTaProviderMutation.mutate(
			{
				userPubkey: currentUserPubkey,
				userRelays: relaysToPublish.write,
				existingEvent: userTaProvidersQuery.data || null
			},
			{
				onSuccess: (result) => {
					lastSuccess = result;
					lastError = null;
					toast.success(
						`Successfully added Relatr to your Trusted Assertions providers (published to ${result.publishedTo.length} relay(s))`
					);
				},
				onError: (error) => {
					lastError = error instanceof Error ? error.message : 'Failed to add Relatr to providers';
					toast.error(lastError);
				}
			}
		);
	}

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
					lastSuccess = result;
					lastError = null;
					toast.success(
						`Successfully removed ${selectedProviders.length} provider(s) (published to ${result.publishedTo.length} relay(s))`
					);
					selectedProviders = [];
					isEditMode = false;
				},
				onError: (error) => {
					lastError = error instanceof Error ? error.message : 'Failed to remove providers';
					toast.error(lastError);
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
		taProviderStatusQuery.refetch();
	}

	let isLoading = $derived(
		publishTaProviderMutation.isPending ||
			userRelaysQuery.isLoading ||
			userTaProvidersQuery.isLoading ||
			taProviderStatusQuery.isLoading
	);
</script>

<div class="space-y-4">
	{#if userRelaysQuery.isLoading || userTaProvidersQuery.isLoading || taProviderStatusQuery.isLoading}
		<div class="flex flex-col items-center justify-center gap-3 py-6">
			<Spinner class="h-6 w-6" />
			<p class="text-sm text-muted-foreground">Loading your TA providers...</p>
		</div>
	{:else if userTaProvidersQuery.isError}
		<div class="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
			<div class="flex items-start gap-3">
				<div class="flex-1">
					<p class="text-sm font-medium text-destructive">Failed to load TA providers</p>
					<p class="mt-1 text-xs text-muted-foreground">
						{userTaProvidersQuery.error instanceof Error
							? userTaProvidersQuery.error.message
							: 'An unknown error occurred'}
					</p>
				</div>
			</div>
		</div>
	{:else if userTaProvidersQuery.data}
		<div class="space-y-4">
			<!-- Success Display -->
			{#if lastSuccess}
				<div class="rounded-lg border border-green-500/50 bg-green-500/10 p-4">
					<div class="flex items-start gap-3">
						<CheckCircle class="mt-0.5 h-5 w-5 text-green-600" />
						<div class="flex-1">
							<p class="text-sm font-medium text-green-600">Operation Successful</p>
							<p class="mt-1 text-xs text-muted-foreground">
								Successfully published to {lastSuccess.publishedTo.length} relay(s)
							</p>
							{#if lastSuccess.relayResults && lastSuccess.relayResults.length > 0}
								<div class="mt-3 space-y-2">
									<div class="flex items-center gap-1 text-xs font-medium text-muted-foreground">
										<span>Relay Results</span>
									</div>
									<div class="space-y-1">
										{#each lastSuccess.relayResults as relayResult (relayResult.from)}
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

			<div class="rounded-lg border p-4">
				<div class="mb-3 flex items-center justify-between">
					<div class="flex items-center gap-2">
						<List class="h-4 w-4 text-muted-foreground" />
						<p class="text-sm font-medium">Current Providers</p>
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
											checked={false}
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
					<div class="rounded-md border border-dashed p-4 text-center">
						<p class="text-sm text-muted-foreground">
							No Trusted Assertions providers configured yet.
						</p>
					</div>
				{/if}
			</div>

			{#if !RelatrInTaProviders}
				<div class="flex flex-col gap-3">
					<p class="text-sm text-muted-foreground">
						Add this Relatr server to your Trusted Assertions providers list.
					</p>
					{#if isTaSupported === false}
						<div class="rounded-lg border border-amber-600/30 bg-amber-600/10 p-4">
							<p class="text-sm font-medium text-amber-600">
								This server does not support Trusted Assertions
							</p>
							<p class="mt-1 text-xs text-muted-foreground">
								You cannot add this server as a TA provider because it does not support the feature.
							</p>
						</div>
					{:else}
						<Button
							onclick={addRelatrToTaProviders}
							disabled={isLoading || publishTaProviderMutation.isPending || !isTaSupported}
							variant="outline"
							class="w-full"
						>
							{#if publishTaProviderMutation.isPending || isLoading}
								<Spinner class="mr-2 h-4 w-4" />
							{:else}
								<Plus class="mr-2 h-4 w-4" />
							{/if}
							Add current Relatr service to Providers
						</Button>
					{/if}
				</div>
			{:else}
				<div class="rounded-lg border border-green-600/30 bg-green-600/10 p-4">
					<div class="flex items-center gap-3">
						<div>
							<p class="text-sm font-medium text-green-600">Relatr is in your providers list</p>
							<p class="text-xs text-muted-foreground">
								This server is already configured as a Trusted Assertions provider.
							</p>
						</div>
					</div>
				</div>
			{/if}
		</div>
	{:else}
		<div class="space-y-4">
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

			<div class="rounded-lg border border-dashed p-4 text-center">
				<p class="text-sm text-muted-foreground">No Trusted Assertions providers configured yet.</p>
			</div>
			{#if isTaSupported === false}
				<div class="rounded-lg border border-amber-600/30 bg-amber-600/10 p-4">
					<p class="text-sm font-medium text-amber-600">
						This server does not support Trusted Assertions
					</p>
					<p class="mt-1 text-xs text-muted-foreground">
						You cannot add this server as a TA provider because it does not support the feature.
					</p>
				</div>
			{:else}
				<Button
					onclick={addRelatrToTaProviders}
					disabled={isLoading || publishTaProviderMutation.isPending || !isTaSupported}
					variant="outline"
					class="w-full"
				>
					{#if publishTaProviderMutation.isPending}
						<Spinner class="mr-2 h-4 w-4" />
					{:else}
						<Plus class="mr-2 h-4 w-4" />
					{/if}
					Add Relatr as First Provider
				</Button>
			{/if}
		</div>
	{/if}
</div>
