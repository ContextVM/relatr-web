<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ChevronDown, ChevronRight, Plus, CheckCircle, XCircle } from 'lucide-svelte';
	import { getPubkeyDisplay } from '$lib/utils.nostr';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import ManageSubscription from '$lib/components/ManageSubscription.svelte';
	import { useTaProviderStatus, getTaCapabilityState } from '$lib/queries/ta-provider';
	import { getRelatrClient, getServerPubkey } from '$lib/stores/server-config.svelte';
	import { activeAccount } from '$lib/services/accountManager.svelte';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';

	interface Props {
		isTrusted: boolean;
		onAddTrusted?: () => void;
		onAfterProviderEnablementChange?: () => void;
		isEditMode?: boolean;
		isSelected?: boolean;
		onSetSelected?: (checked: boolean) => void;
		isAdding?: boolean;
	}

	let {
		isTrusted,
		onAddTrusted,
		onAfterProviderEnablementChange,
		isEditMode = false,
		isSelected = false,
		onSetSelected,
		isAdding = false
	}: Props = $props();

	let relatrClient = $derived(getRelatrClient());
	let serverPubkey = $derived(getServerPubkey());
	let currentUserPubkey = $derived($activeAccount?.pubkey);

	// Query for TA provider status
	const taProviderStatusQuery = $derived(
		useTaProviderStatus(relatrClient, serverPubkey, currentUserPubkey)
	);

	// TA capability state: 'unknown' | 'supported' | 'unavailable'
	let taCapability = $derived(getTaCapabilityState(taProviderStatusQuery));

	// Check if provider is enabled (subscribed)
	let isProviderEnabled = $derived(taProviderStatusQuery.data?.isActive ?? false);

	// Loading state for TA capability check
	let isCheckingCapability = $derived(taProviderStatusQuery.isLoading);

	// Row owns its own open state
	let open = $state(false);

	// Auto-open when provider is enabled but not yet trusted (to guide user)
	$effect(() => {
		if (isProviderEnabled && !isTrusted && !open) {
			open = true;
		}
	});

	function getChecked() {
		return isSelected;
	}

	function setChecked(checked: boolean) {
		onSetSelected?.(checked);
	}
</script>

{#if isCheckingCapability}
	<!-- Loading state while checking TA capability -->
	<div class="flex items-center justify-between rounded-md border bg-muted/30 p-3">
		<div class="flex items-center gap-2">
			<Spinner class="h-4 w-4 text-muted-foreground" />
			<span class="text-sm text-muted-foreground">Checking server capability...</span>
		</div>
	</div>
{:else if taCapability === 'supported' && !isTrusted}
	<!-- Server supports TA but not yet in trusted list - show compact add CTA -->
	<div
		class="flex items-center justify-between rounded-md border border-blue-600/30 bg-blue-600/10 p-3 transition-colors hover:bg-blue-600/20"
	>
		<div class="flex items-center gap-2">
			<Badge variant="outline" class="font-mono text-xs">30382:rank</Badge>
			<span class="font-mono text-sm text-muted-foreground">
				{getPubkeyDisplay(serverPubkey)}
			</span>
			<Badge variant="default" class="text-xs">Current</Badge>
			<Badge variant="outline" class="text-xs text-blue-600">Not Trusted</Badge>
		</div>
		<Button onclick={onAddTrusted} variant="default" size="sm" disabled={isAdding}>
			<Plus class="mr-2 h-4 w-4" />
			{isAdding ? 'Adding...' : 'Add'}
		</Button>
	</div>
{:else if isTrusted}
	<!-- Server is in trusted list - show collapsible row -->
	<Collapsible.Root bind:open class="w-full">
		<Collapsible.Trigger class="w-full">
			<div
				class="flex items-center justify-between rounded-md border bg-muted/30 p-3 transition-colors hover:bg-muted/50"
			>
				<div class="flex items-center gap-2">
					<Badge variant="outline" class="font-mono text-xs">30382:rank</Badge>
					<span class="font-mono text-sm text-muted-foreground">
						{getPubkeyDisplay(serverPubkey)}
					</span>
					{#if isProviderEnabled}
						<Badge variant="default" class="text-xs">
							<CheckCircle class="mr-1 h-3 w-3" />
							Active
						</Badge>
					{:else}
						<Badge variant="secondary" class="text-xs">
							<XCircle class="mr-1 h-3 w-3" />
							Inactive
						</Badge>
					{/if}
				</div>
				{#if isEditMode}
					<!-- Controlled checkbox: parent owns selection state -->
					<Checkbox bind:checked={getChecked, setChecked} onclick={(e) => e.stopPropagation()} />
				{:else if open}
					<ChevronDown class="h-4 w-4 text-muted-foreground" />
				{:else}
					<ChevronRight class="h-4 w-4 text-muted-foreground" />
				{/if}
			</div>
		</Collapsible.Trigger>
		<Collapsible.Content class="mt-2">
			<div class="rounded-lg border bg-muted/30 p-4">
				{#if taCapability === 'unavailable'}
					<div class="rounded-lg border border-amber-600/30 bg-amber-600/10 p-4">
						<p class="text-sm font-medium text-amber-600">
							Server unavailable or does not support Trusted Assertions
						</p>
						<p class="mt-1 text-xs text-muted-foreground">
							The server is offline or doesn't support the Trusted Assertions feature. Provider
							management is not available.
						</p>
					</div>
				{:else}
					<ManageSubscription onAfterChange={onAfterProviderEnablementChange} />
				{/if}
			</div>
		</Collapsible.Content>
	</Collapsible.Root>
{/if}
