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
	import {
		getServerPubkey,
		setServerPubkey,
		getRelatrClient
	} from '$lib/stores/server-config.svelte';
	import { User, Info, AlertCircle, CheckCircle, Plus, ArrowRight } from 'lucide-svelte';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { isHexKey } from 'applesauce-core/helpers';
	import { getServerHistory, removeServerFromHistory, type ServerHistoryItem } from '$lib/utils';
	import ServerStatusCard from '$lib/components/ServerStatusCard.svelte';
	import { useTaProviderStatus, getTaCapabilityState } from '$lib/queries/ta-provider';
	import { useUserTaProviders, useUserRelays } from '$lib/queries/nostr';
	import { usePublishTaProvider } from '$lib/mutations/nostr';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { commonRelays } from '$lib/services/relay-pool';
	import { relaySet } from 'applesauce-core/helpers';
	import { relayStore } from '$lib/stores/relay-store.svelte';
	import { toast } from 'svelte-sonner';
	import Button from '$lib/components/ui/button/button.svelte';
	import { queryClient } from '$lib/query-client';
	import { taProviderKeys } from '$lib/query-keys';

	let serverPubkey = $derived(getServerPubkey());
	let relatrClient = $derived(getRelatrClient());
	let serverPubkeyInput = $state('');
	let validationError = $state<string | null>(null);
	let serverHistory = $state<ServerHistoryItem[]>(getServerHistory());
	let activeTab = $state<'providers' | 'subscribe'>('providers');

	// Check if current server supports TA feature
	const taProviderStatusQuery = $derived(
		useTaProviderStatus(relatrClient, serverPubkey, $activeAccount?.pubkey)
	);

	// TA capability state: 'unknown' | 'supported' | 'unavailable'
	let taCapability = $derived(getTaCapabilityState(taProviderStatusQuery));

	// Query for user's TA providers
	const userTaProvidersQuery = $derived(useUserTaProviders($activeAccount?.pubkey, undefined));

	// Query for user relays
	const userRelaysQuery = $derived(useUserRelays($activeAccount?.pubkey));

	// Check if current server is in user's TA providers list (any 30382:* tag with matching pubkey)
	let relatrInTaProviders = $derived(
		(userTaProvidersQuery.data?.tags ?? []).some(
			(tag) => tag[0].startsWith('30382:') && tag[1] === serverPubkey
		)
	);

	// Check if user is subscribed to current server
	let isSubscribed = $derived(taProviderStatusQuery.data?.isActive ?? false);

	// Mutation for adding current server to TA providers
	const publishTaProviderMutation = usePublishTaProvider();

	function addCurrentServerToProviders() {
		if (!$activeAccount?.pubkey || !serverPubkey) return;
		const extraRelays = relaySet([...commonRelays, ...relayStore.selectedRelays]);

		publishTaProviderMutation.mutate(
			{
				userPubkey: $activeAccount.pubkey,
				userRelays: relaySet([...(userRelaysQuery.data?.relays ?? []), ...extraRelays]),
				existingEvent: userTaProvidersQuery.data || null
			},
			{
				onSuccess: (result) => {
					// Invalidate queries to refresh UI
					queryClient.invalidateQueries({
						queryKey: taProviderKeys.status(serverPubkey, $activeAccount?.pubkey)
					});
					queryClient.invalidateQueries({ queryKey: ['userTaProviders', $activeAccount?.pubkey] });

					toast.success(
						`Successfully added server to providers (published to ${result.publishedTo.length} relay(s))`
					);
				},
				onError: (error) => {
					toast.error(error instanceof Error ? error.message : 'Failed to add server to providers');
				}
			}
		);
	}

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
											<strong>Providers list:</strong> Your client will only accept assertions from
											services listed here.
											<span class="text-xs">(published in kind 10040)</span>
										</p>
										<p>
											<strong>Subscription:</strong> Ask the selected Relatr server to publish your
											assertions to your relays.
											<span class="text-xs">(kind 30382)</span>
										</p>
									</div>
								</div>
							</div>

							<!-- Tabs -->
							<Tabs.Root bind:value={activeTab} class="w-full">
								<Tabs.List class="grid w-full grid-cols-2">
									<Tabs.Trigger value="providers">
										Providers
										<Badge variant="secondary" class="ml-2 text-xs">
											{userTaProvidersQuery.data?.tags.filter((t) => t[0].startsWith('30382:'))
												.length || 0}
										</Badge>
									</Tabs.Trigger>
									{#if taCapability === 'supported'}
										<Tabs.Trigger value="subscribe">
											Subscription
											{#if isSubscribed}
												<Badge variant="default" class="ml-2 text-xs">Active</Badge>
											{/if}
										</Tabs.Trigger>
									{/if}
								</Tabs.List>

								<!-- Providers Tab -->
								<Tabs.Content value="providers" class="space-y-4 pt-6">
									<!-- Callout: Guide based on subscription status -->
									{#if taCapability === 'supported' && !relatrInTaProviders}
										{#if !isSubscribed}
											<div class="rounded-lg border border-blue-600/30 bg-blue-600/10 p-4">
												<div class="flex gap-3">
													<AlertCircle class="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
													<div class="flex-1 space-y-2">
														<p class="text-sm font-medium text-blue-600">
															Step 1: Subscribe, Step 2: Add to providers
														</p>
														<p class="text-xs text-muted-foreground">
															This Relatr server can publish assertions. Subscribe first, then add
															the server to your providers list so your client can consume them.
														</p>
														<Button
															onclick={() => (activeTab = 'subscribe')}
															variant="default"
															size="sm"
															class="mt-2"
														>
															<ArrowRight class="mr-2 h-4 w-4" />
															Go to Subscription
														</Button>
													</div>
												</div>
											</div>
										{:else}
											<div class="rounded-lg border border-green-600/30 bg-green-600/10 p-4">
												<div class="flex gap-3">
													<CheckCircle class="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
													<div class="flex-1 space-y-2">
														<p class="text-sm font-medium text-green-600">
															Add this server to your providers
														</p>
														<p class="text-xs text-muted-foreground">
															You're subscribed to this server. Add it to your providers list so
															your client can consume its assertions.
														</p>
														<Button
															onclick={addCurrentServerToProviders}
															variant="default"
															size="sm"
															class="mt-2"
															disabled={publishTaProviderMutation.isPending}
														>
															{#if publishTaProviderMutation.isPending}
																<Spinner class="mr-2 h-4 w-4" />
															{:else}
																<Plus class="mr-2 h-4 w-4" />
															{/if}
															Add to Providers
														</Button>
													</div>
												</div>
											</div>
										{/if}
									{/if}

									<!-- UserTaProviders component -->
									<UserTaProviders />
								</Tabs.Content>

								<!-- Subscribe Tab (only when supported) -->
								{#if taCapability === 'supported'}
									<Tabs.Content value="subscribe" class="space-y-4 pt-6">
										<!-- Callout: Reminder if subscribed but not in providers -->
										{#if isSubscribed && !relatrInTaProviders}
											<div class="rounded-lg border border-amber-600/30 bg-amber-600/10 p-4">
												<div class="flex gap-3">
													<AlertCircle class="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
													<div class="flex-1 space-y-2">
														<p class="text-sm font-medium text-amber-600">
															Complete setup: Add server to providers
														</p>
														<p class="text-xs text-muted-foreground">
															You're subscribed to this server, but your client won't accept its
															assertions until you add it to your providers list.
														</p>
														<Button
															onclick={() => (activeTab = 'providers')}
															variant="outline"
															size="sm"
															class="mt-2"
														>
															<ArrowRight class="mr-2 h-4 w-4" />
															Go to Providers
														</Button>
													</div>
												</div>
											</div>
										{/if}

										<!-- ManageSubscription component -->
										<ManageSubscription />
									</Tabs.Content>
								{/if}
							</Tabs.Root>
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
									You need to log in to manage your trusted assertion providers and subscriptions.
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
