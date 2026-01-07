<script lang="ts">
	import { activeAccount } from '$lib/services/accountManager.svelte';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import AccountLoginDialog from '$lib/components/AccountLoginDialog.svelte';
	import ManageSubscription from '$lib/components/ManageSubscription.svelte';
	import UserTaProviders from '$lib/components/UserTaProviders.svelte';
	import { getServerPubkey, setServerPubkey } from '$lib/stores/server-config.svelte';
	import { User } from 'lucide-svelte';
	import { isHexKey } from 'applesauce-core/helpers';
	import { getServerHistory, removeServerFromHistory, type ServerHistoryItem } from '$lib/utils';
	import ServerStatusCard from '$lib/components/ServerStatusCard.svelte';

	let serverPubkey = $derived(getServerPubkey());
	let serverPubkeyInput = $state('');
	let validationError = $state<string | null>(null);
	let serverHistory = $state<ServerHistoryItem[]>(getServerHistory());

	// Keep the input seeded from the shared store
	$effect(() => {
		if (!serverPubkeyInput) serverPubkeyInput = serverPubkey;
	});

	function handleServerPubkeyChange() {
		const trimmed = serverPubkeyInput.trim();

		if (trimmed && !isHexKey(trimmed)) {
			validationError = 'Invalid hex public key format';
			return;
		}

		validationError = null;

		// Empty means "default server" (handled by the store)
		setServerPubkey(trimmed);

		// Reflect current history
		serverHistory = getServerHistory();
	}

	function removeServerFromHistoryHandler(pubkey: string, event: Event) {
		event.stopPropagation();
		removeServerFromHistory(pubkey);
		serverHistory = getServerHistory();
	}

	function validateInput() {
		const trimmed = serverPubkeyInput.trim();
		validationError = trimmed && !isHexKey(trimmed) ? 'Invalid hex public key format' : null;
	}
</script>

{#if $activeAccount}
	<div class="flex min-h-screen flex-col bg-background">
		<main class="container mx-auto max-w-4xl flex-1 px-6 py-8">
			<div class="flex flex-col items-center justify-center">
				<div class="w-full max-w-2xl space-y-6">
					<!-- Server Stats Section -->
					<ServerStatusCard
						bind:serverPubkeyInput
						bind:validationError
						{serverHistory}
						onServerChange={handleServerPubkeyChange}
						onHistoryRemove={removeServerFromHistoryHandler}
						onValidate={validateInput}
					/>

					<!-- User TA Providers Section (Always visible) -->
					<Card class="py-6">
						<CardHeader>
							<CardTitle>Your Trusted Assertions Providers</CardTitle>
							<CardDescription>
								Manage your list of Trusted Assertions providers (Nostr event kind 10040).
							</CardDescription>
						</CardHeader>
						<CardContent class="space-y-4">
							<UserTaProviders />
						</CardContent>
					</Card>

					<!-- Main Subscription Card -->
					<Card class="py-6">
						<CardHeader>
							<CardTitle>Trusted Assertions Subscription</CardTitle>
							<CardDescription>
								Manage your subscription to the Trusted Assertions provider service.
							</CardDescription>
						</CardHeader>
						<CardContent class="w-full space-y-4">
							<ManageSubscription />
						</CardContent>
					</Card>
				</div>
			</div>
		</main>
	</div>
{:else}
	<div class="flex min-h-screen flex-col bg-background">
		<main class="container mx-auto max-w-4xl flex-1 px-6 py-8">
			<div class="flex flex-col items-center justify-center">
				<div class="w-full max-w-2xl space-y-6">
					<!-- Server Stats Section (shown even when not logged in) -->

					<Card class="py-6">
						<CardHeader>
							<CardTitle>Trusted Assertions Provider</CardTitle>
							<CardDescription>
								Manage your subscription to the Trusted Assertions provider service.
							</CardDescription>
						</CardHeader>
						<CardContent class="space-y-6">
							<div class="rounded-lg border bg-muted/30 p-6 text-center">
								<div
									class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted"
								>
									<User class="h-6 w-6 text-muted-foreground" />
								</div>
								<h3 class="mb-2 text-lg font-semibold">Authentication Required</h3>
								<p class="mb-6 text-sm text-muted-foreground">
									You need to log in to manage your Trusted Assertions provider subscription.
								</p>
								<AccountLoginDialog />
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</main>
	</div>
{/if}
