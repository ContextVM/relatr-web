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
	import UserTaProviders from '$lib/components/UserTaProviders.svelte';
	import { getServerPubkey, setServerPubkey } from '$lib/stores/server-config.svelte';
	import { User, Info } from 'lucide-svelte';
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

					<!-- Trusted Assertions Section -->
					<Card class="py-6">
						<CardHeader>
							<CardTitle>Trusted Assertions (NIP-85)</CardTitle>
							<CardDescription>
								Use trusted services to compute metrics (rank, counts, etc.) and publish signed
								assertions your client can consume.
							</CardDescription>
						</CardHeader>
						<CardContent class="space-y-4">
							<!-- Info Box -->
							<div class="rounded-lg bg-muted/50 p-4">
								<div class="flex gap-3">
									<Info class="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
									<div class="space-y-2 text-sm text-muted-foreground">
										<p>
											<strong>Trusted providers:</strong> Your client will only accept assertions
											from services listed here.
											<span class="text-xs">(published in kind 10040)</span>
										</p>
										<p>
											<strong>Enable provider on this server:</strong> Ask the selected Relatr
											server to publish your assertions to your relays.
											<span class="text-xs">(kind 30382)</span>
										</p>
									</div>
								</div>
							</div>

							<!-- Providers management (primary content) -->
							<UserTaProviders />
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
					<ServerStatusCard
						bind:serverPubkeyInput
						bind:validationError
						{serverHistory}
						onServerChange={handleServerPubkeyChange}
						onHistoryRemove={removeServerFromHistoryHandler}
						onValidate={validateInput}
					/>

					<!-- Authentication Required Card -->
					<Card class="py-6">
						<CardHeader>
							<CardTitle>Trusted Assertions (NIP-85)</CardTitle>
							<CardDescription>
								Use trusted services to compute metrics (rank, counts, etc.) and publish signed
								assertions your client can consume.
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
									You need to log in to manage your trusted assertion providers.
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
