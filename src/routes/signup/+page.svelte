<script lang="ts">
	import { createMutation } from '@tanstack/svelte-query';
	import { queryClient } from '$lib/query-client';
	import { taProviderKeys } from '$lib/query-keys';
	import { useTaProviderStatus } from '$lib/queries/ta-provider';
	import { useUserRelays, useUserTaProviders } from '$lib/queries/nostr';
	import { usePublishTaProvider } from '$lib/mutations/nostr';
	import { activeAccount } from '$lib/services/accountManager.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { toast } from 'svelte-sonner';
	import AccountLoginDialog from '$lib/components/AccountLoginDialog.svelte';
	import { getRelatrClient, getServerPubkey } from '$lib/stores/server-config.svelte';
	import {
		CheckCircle,
		XCircle,
		TrendingUp,
		TrendingDown,
		Minus,
		Calendar,
		RefreshCw,
		User,
		Plus,
		Server,
		List
	} from 'lucide-svelte';
	import { getPubkeyDisplay } from '$lib/utils.nostr';
	import { formatTimestamp } from '$lib/utils';

	// Shared module state (reactive via Svelte runes)
	let relatrClient = $derived(getRelatrClient());
	let serverPubkey = $derived(getServerPubkey());

	// Query for subscription status (cached across navigation)
	const subscriptionQuery = useTaProviderStatus(
		() => relatrClient,
		() => serverPubkey,
		() => $activeAccount?.pubkey ?? null
	);

	// Queries for user relays and TA providers
	const userRelaysQuery = useUserRelays(() => $activeAccount?.pubkey ?? null);
	const userTaProvidersQuery = useUserTaProviders(
		() => $activeAccount?.pubkey ?? null,
		() => userRelaysQuery.data ?? null
	);

	// Mutation for publishing TA provider
	const publishTaProviderMutation = usePublishTaProvider();

	function getStatusKey() {
		return taProviderKeys.status(serverPubkey, $activeAccount?.pubkey ?? null);
	}

	// Mutations for subscribe/unsubscribe
	const subscribeMutation = createMutation(() => ({
		mutationFn: async () => {
			if (!relatrClient) throw new Error('No client available');
			return await relatrClient.ManageTaProvider('subscribe');
		},
		onSuccess: (result) => {
			// Optimistically update UI and invalidate in background
			queryClient.setQueryData(getStatusKey(), result);

			if (result.success) {
				toast.success('Successfully subscribed to Trusted Assertions provider');
			} else {
				toast.error(result.message || 'Subscription failed');
			}
		},
		onError: (err) => {
			toast.error(err instanceof Error ? err.message : 'Failed to subscribe');
		}
	}));

	const unsubscribeMutation = createMutation(() => ({
		mutationFn: async () => {
			if (!relatrClient) throw new Error('No client available');
			return await relatrClient.ManageTaProvider('unsubscribe');
		},
		onSuccess: (result) => {
			// Optimistically update UI and invalidate in background
			queryClient.setQueryData(getStatusKey(), result);

			if (result.success) {
				toast.success('Successfully unsubscribed from Trusted Assertions provider');
			} else {
				toast.error(result.message || 'Unsubscription failed');
			}
		},
		onError: (err) => {
			toast.error(err instanceof Error ? err.message : 'Failed to unsubscribe');
		}
	}));

	// Derived loading state
	let isLoading = $derived(
		subscriptionQuery.isLoading ||
			subscriptionQuery.isRefetching ||
			subscribeMutation.isPending ||
			unsubscribeMutation.isPending ||
			userRelaysQuery.isLoading ||
			userTaProvidersQuery.isLoading ||
			publishTaProviderMutation.isPending
	);

	// Derived state for TA provider management
	let isRelatrInTaProviders = $derived(
		(userTaProvidersQuery.data?.tags ?? []).some(
			(tag) => tag[0] === '30382:rank' && tag[1] === serverPubkey
		)
	);

	function refreshStatus() {
		subscriptionQuery.refetch();
	}

	function addRelatrToTaProviders() {
		if (!$activeAccount?.pubkey || !userRelaysQuery.data) return;

		publishTaProviderMutation.mutate(
			{
				userPubkey: $activeAccount.pubkey,
				userRelays: userRelaysQuery.data,
				existingEvent: userTaProvidersQuery.data || null
			},
			{
				onSuccess: (result) => {
					toast.success(
						`Successfully added Relatr to your Trusted Assertions providers (published to ${result.publishedTo.length} relay(s))`
					);
				},
				onError: (error) => {
					toast.error(error instanceof Error ? error.message : 'Failed to add Relatr to providers');
				}
			}
		);
	}
</script>

{#if $activeAccount}
	<div class="flex min-h-screen flex-col bg-background">
		<main class="container mx-auto max-w-4xl flex-1 px-6 py-8">
			<div class="flex flex-col items-center justify-center">
				<div class="w-full max-w-2xl">
					<Card class="py-6">
						<CardHeader>
							<CardTitle>Trusted Assertions Provider</CardTitle>
							<CardDescription>
								Manage your subscription to the Trusted Assertions provider service.
							</CardDescription>
						</CardHeader>
						<CardContent class="space-y-4">
							{#if subscriptionQuery.isLoading}
								<div class="flex flex-col items-center justify-center gap-3 py-8">
									<Spinner class="h-8 w-8" />
									<p class="text-sm text-muted-foreground">Loading subscription status...</p>
								</div>
							{:else if subscriptionQuery.isError}
								<div class="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
									<div class="flex items-start gap-3">
										<XCircle class="mt-0.5 h-5 w-5 text-destructive" />
										<div class="flex-1">
											<p class="text-sm font-medium text-destructive">
												Failed to load subscription status
											</p>
											<p class="mt-1 text-xs text-muted-foreground">
												{subscriptionQuery.error instanceof Error
													? subscriptionQuery.error.message
													: 'An unknown error occurred'}
											</p>
										</div>
									</div>
									<div class="mt-4 flex gap-2">
										<Button onclick={refreshStatus} variant="outline" size="sm">
											<RefreshCw class="mr-1 h-3 w-3" />
											Try Again
										</Button>
									</div>
								</div>
							{:else if subscriptionQuery.data}
								<div class="space-y-6">
									<!-- Status Overview -->
									<div class="flex items-center justify-between rounded-lg border p-4">
										<div class="flex items-center gap-3">
											{#if subscriptionQuery.data.isActive}
												<CheckCircle class="h-5 w-5 text-green-600" />
											{:else}
												<XCircle class="h-5 w-5 text-muted-foreground" />
											{/if}
											<div>
												<p class="text-sm font-medium">Subscription Status</p>
												<Badge variant={subscriptionQuery.data.isActive ? 'default' : 'secondary'}>
													{subscriptionQuery.data.isActive ? 'Active' : 'Inactive'}
												</Badge>
											</div>
										</div>
										{#if subscriptionQuery.data.message}
											<p class="text-sm text-muted-foreground">{subscriptionQuery.data.message}</p>
										{/if}
									</div>

									<!-- Account Information -->
									<div class="grid gap-4 md:grid-cols-2">
										<div class="space-y-2">
											<div class="flex items-center gap-2">
												<User class="h-4 w-4 text-muted-foreground" />
												<p class="text-sm font-medium">Your Public Key</p>
											</div>
											<div class="flex items-center gap-2">
												<span class="font-mono text-sm text-muted-foreground">
													{getPubkeyDisplay(subscriptionQuery.data.subscriberPubkey)}
												</span>
												<Badge variant="outline" class="font-mono text-xs">
													{subscriptionQuery.data.subscriberPubkey.slice(0, 8)}...
												</Badge>
											</div>
										</div>

										{#if subscriptionQuery.data.rank}
											<div class="space-y-2">
												<div class="flex items-center gap-2">
													<TrendingUp class="h-4 w-4 text-muted-foreground" />
													<p class="text-sm font-medium">Your Rank</p>
													{#if subscriptionQuery.data.rank.published}
														<Badge variant="default" class="text-xs">Published</Badge>
													{/if}
												</div>
												<div class="flex items-center gap-3">
													<span class="text-2xl font-bold">
														#{subscriptionQuery.data.rank.rank}
													</span>
													{#if subscriptionQuery.data.rank.previousRank !== null}
														<div class="flex items-center gap-1">
															{#if subscriptionQuery.data.rank.rank < subscriptionQuery.data.rank.previousRank}
																<TrendingUp class="h-4 w-4 text-green-600" />
																<span class="text-sm text-green-600">
																	↑ {subscriptionQuery.data.rank.previousRank -
																		subscriptionQuery.data.rank.rank}
																</span>
															{:else if subscriptionQuery.data.rank.rank > subscriptionQuery.data.rank.previousRank}
																<TrendingDown class="h-4 w-4 text-red-600" />
																<span class="text-sm text-red-600">
																	↓ {subscriptionQuery.data.rank.rank -
																		subscriptionQuery.data.rank.previousRank}
																</span>
															{:else}
																<Minus class="h-4 w-4 text-muted-foreground" />
																<span class="text-sm text-muted-foreground">No change</span>
															{/if}
															<span class="text-xs text-muted-foreground">
																(was #{subscriptionQuery.data.rank.previousRank})
															</span>
														</div>
													{/if}
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
													{subscriptionQuery.data.createdAt
														? formatTimestamp(subscriptionQuery.data.createdAt)
														: 'Never'}
												</p>
											</div>
										</div>
									</div>

									<!-- Action Buttons -->
									<div class="flex flex-col gap-3 sm:flex-row">
										{#if !subscriptionQuery.data.isActive}
											<Button
												onclick={() => subscribeMutation.mutate()}
												disabled={isLoading}
												class="flex-1"
											>
												{#if subscribeMutation.isPending}
													<Spinner class="mr-2 h-4 w-4" />
												{/if}
												Subscribe to Trusted Assertions
											</Button>
										{:else}
											<Button
												onclick={() => unsubscribeMutation.mutate()}
												variant="outline"
												disabled={isLoading}
												class="flex-1"
											>
												{#if unsubscribeMutation.isPending}
													<Spinner class="mr-2 h-4 w-4" />
												{/if}
												Unsubscribe
											</Button>
										{/if}
										<Button
											onclick={refreshStatus}
											variant="ghost"
											disabled={isLoading}
											class="sm:w-auto"
										>
											<RefreshCw class="mr-2 h-4 w-4" />
											Refresh
										</Button>
									</div>

									<!-- TA Providers Section (only shown when subscribed) -->
									{#if subscriptionQuery.data.isActive}
										<div class="mt-8 border-t pt-6">
											<div class="mb-4 flex items-center gap-2">
												<Server class="h-5 w-5 text-muted-foreground" />
												<h3 class="text-lg font-semibold">Trusted Assertions Providers</h3>
											</div>

											{#if userRelaysQuery.isLoading || userTaProvidersQuery.isLoading}
												<div class="flex flex-col items-center justify-center gap-3 py-6">
													<Spinner class="h-6 w-6" />
													<p class="text-sm text-muted-foreground">Loading your TA providers...</p>
												</div>
											{:else if userTaProvidersQuery.isError}
												<div class="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
													<div class="flex items-start gap-3">
														<XCircle class="mt-0.5 h-5 w-5 text-destructive" />
														<div class="flex-1">
															<p class="text-sm font-medium text-destructive">
																Failed to load TA providers
															</p>
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
													<div class="rounded-lg border p-4">
														<div class="mb-3 flex items-center gap-2">
															<List class="h-4 w-4 text-muted-foreground" />
															<p class="text-sm font-medium">Current Providers</p>
														</div>
														<div class="space-y-2">
															{#each userTaProvidersQuery.data.tags.filter( (tag) => tag[0].startsWith('30382:') ) as tag}
																<div
																	class="flex items-center justify-between rounded-md bg-muted/30 p-3"
																>
																	<div class="flex items-center gap-2">
																		<Badge variant="outline" class="font-mono text-xs">
																			{tag[0]}
																		</Badge>
																		<span class="font-mono text-sm text-muted-foreground">
																			{getPubkeyDisplay(tag[1])}
																		</span>
																	</div>
																	{#if tag[1] === serverPubkey}
																		<Badge variant="default" class="text-xs">Current</Badge>
																	{/if}
																</div>
															{/each}
														</div>
													</div>

													{#if !isRelatrInTaProviders}
														<div class="flex flex-col gap-3">
															<p class="text-sm text-muted-foreground">
																Add this Relatr server to your Trusted Assertions providers list.
															</p>
															<Button
																onclick={addRelatrToTaProviders}
																disabled={isLoading}
																variant="outline"
																class="w-full"
															>
																{#if publishTaProviderMutation.isPending}
																	<Spinner class="mr-2 h-4 w-4" />
																{:else}
																	<Plus class="mr-2 h-4 w-4" />
																{/if}
																Add Relatr to Providers
															</Button>
														</div>
													{:else}
														<div class="rounded-lg border border-green-600/30 bg-green-600/10 p-4">
															<div class="flex items-center gap-3">
																<CheckCircle class="h-5 w-5 text-green-600" />
																<div>
																	<p class="text-sm font-medium text-green-600">
																		Relatr is in your providers list
																	</p>
																	<p class="text-xs text-muted-foreground">
																		This server is already configured as a Trusted Assertions
																		provider.
																	</p>
																</div>
															</div>
														</div>
													{/if}
												</div>
											{:else}
												<div class="space-y-4">
													<div class="rounded-lg border border-dashed p-4 text-center">
														<p class="text-sm text-muted-foreground">
															No Trusted Assertions providers configured yet.
														</p>
													</div>
													<Button
														onclick={addRelatrToTaProviders}
														disabled={isLoading}
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
												</div>
											{/if}
										</div>
									{/if}
								</div>
							{/if}
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
