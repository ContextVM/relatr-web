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
	import {
		getRelatrClient,
		getServerPubkey,
		setServerPubkey
	} from '$lib/stores/server-config.svelte';
	import { User, Info, ChevronRight } from 'lucide-svelte';
	import { isHexKey } from 'applesauce-core/helpers';
	import { getServerHistory, removeServerFromHistory, type ServerHistoryItem } from '$lib/utils';
	import ServerStatusCard from '$lib/components/ServerStatusCard.svelte';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { getTaCapabilityState, useTaProviderStatus } from '$lib/queries/ta-provider';

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
	let relatrClient = $derived(getRelatrClient());
	let currentUserPubkey = $derived($activeAccount?.pubkey);

	// Query for TA provider status
	const taProviderStatusQuery = $derived(
		useTaProviderStatus(relatrClient, serverPubkey, currentUserPubkey)
	);

	// TA capability state: 'unknown' | 'supported' | 'unavailable'
	let taCapability = $derived(getTaCapabilityState(taProviderStatusQuery));

	function removeServerFromHistoryHandler(pubkey: string, event: Event) {
		event.stopPropagation();
		removeServerFromHistory(pubkey);
		serverHistory = getServerHistory();
	}

	let open = $state(false);

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
							<CardTitle>Trusted Assertions</CardTitle>
							<CardDescription>
								A new emerging standard for Nostr where providers compute metrics (rank, counts,
								etc.) and publish signed assertions. Add providers to your trusted list so your
								client can consume them and provide you with a tailored experience. The new version
								of Relatr now offers trusted assertions features.
								<Collapsible.Root bind:open class="py-2">
									<Collapsible.Trigger class="inline-flex w-full items-center"
										>Discover more
										{#if open}
											<ChevronDown class="h-4 w-4 text-muted-foreground" />
										{:else}
											<ChevronRight class="h-4 w-4 text-muted-foreground" />
										{/if}
									</Collapsible.Trigger>
									<Collapsible.Content class="mt-2">
										The new version of Relatr now offers trusted assertions features, becoming the
										first solution to support the different emerging standards for Web of Trust
										(WoT) computations, a ContextVM interface (request/response, ideal for real-time
										computation and filling gaps), and Trusted Assertions (provider/consumer), ideal
										for Nostr clients to cache ranks and published metrics. This combination offers
										a versatile interface to meet all needs. Relatr is open source, customizable,
										and made with love for the free internet.
									</Collapsible.Content>
								</Collapsible.Root>
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
										{#if serverPubkey && taCapability === 'supported'}
											<p>
												<strong>Enable provider on this server:</strong> This Relatr server support
												Trusted assertions. You can add it to your list and enable the server to
												publish your assertions to your relays.
												<span class="text-xs">(kind 30382)</span>
											</p>
										{/if}
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
							<CardTitle>Trusted Assertions</CardTitle>
							<CardDescription>
								Relatr is one of the first providers to offer trusted assertions—a new emerging
								standard for nostr where providers compute metrics (rank, counts, etc.) and publish
								signed assertions. Add providers to your trusted list so your client can consume
								them and provide you with a tailored experience.
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
