<script lang="ts">
	import SearchInput from '$lib/components/SearchInput.svelte';
	import SearchResults from '$lib/components/SearchResults.svelte';
	import TrustScoreCalculator from '$lib/components/TrustScoreCalculator.svelte';
	import ServerStats from '$lib/components/ServerStats.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { Card, CardContent } from '$lib/components/ui/card/index.js';
	import { RelatrClient, type SearchProfilesOutput } from '$lib/ctxcn/RelatrClient.js';
	import { isHexKey } from 'applesauce-core/helpers';
	import { Server, Trash2, Clock } from 'lucide-svelte';
	import { DEFAULT_SERVER } from '$lib/constants';
	import {
		getServerHistory,
		addServerToHistory,
		removeServerFromHistory,
		type ServerHistoryItem
	} from '$lib/utils';
	import { getPubkeyDisplay, pubkeyToHexColor } from '$lib/utils.nostr';
	import { page } from '$app/state';

	let searchResults = $state<SearchProfilesOutput | null>(null);
	let activeTab = $state<'search' | 'trust'>('search');
	let selectedPubkey = $state('');
	let serverPubkeyInput = $state('');
	let serverPubkey = $state('');
	let relatrClient = $state<RelatrClient | null>(null);
	let validationError = $state<string | null>(null);
	let serverHistory = $state<ServerHistoryItem[]>(getServerHistory());

	function handleProfileClick(pubkey: string) {
		selectedPubkey = pubkey;
		activeTab = 'trust';
	}

	// Reactive query parameter for server configuration
	let queryServerPubkey = $state(page.url.searchParams.get('s'));

	$effect(() => {
		// Initialize client if not already done
		if (!relatrClient) {
			let initialServerPubkey = DEFAULT_SERVER;

			// Use query parameter if valid, otherwise use default
			if (queryServerPubkey && isHexKey(queryServerPubkey)) {
				initialServerPubkey = queryServerPubkey;
				serverPubkeyInput = queryServerPubkey;
				serverPubkey = queryServerPubkey;
			}

			relatrClient = new RelatrClient({ serverPubkey: initialServerPubkey });
			addServerToHistory(initialServerPubkey);
			serverHistory = getServerHistory();
		}
	});

	// React to changes in query parameter
	$effect(() => {
		if (queryServerPubkey && isHexKey(queryServerPubkey) && relatrClient) {
			// Only switch if the query param is different from current server
			if (queryServerPubkey !== serverPubkey) {
				switchToServer(queryServerPubkey);
			}
		}
	});

	/**
	 * Switch to a new server and update history appropriately
	 */
	function switchToServer(newServerPubkey: string) {
		// Update UI state
		serverPubkeyInput = newServerPubkey;
		serverPubkey = newServerPubkey;
		relatrClient = new RelatrClient({ serverPubkey: newServerPubkey });

		addServerToHistory(newServerPubkey);

		// Refresh history display
		serverHistory = getServerHistory();
	}

	function handleServerPubkeyChange() {
		const trimmedPubkey = serverPubkeyInput.trim();

		if (trimmedPubkey && !isHexKey(trimmedPubkey)) {
			validationError = 'Invalid hex public key format';
			return;
		}

		validationError = null;

		// Use the new server or default if empty
		const newServer = trimmedPubkey || DEFAULT_SERVER;
		switchToServer(newServer);
	}

	function connectToServerFromHistory(pubkey: string) {
		switchToServer(pubkey);
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

{#if relatrClient}
	<div class="flex min-h-screen flex-col bg-background">
		<main class="container mx-auto max-w-4xl flex-1 px-6 py-8">
			<div class="flex flex-col items-center justify-center">
				<div class="w-full max-w-2xl space-y-8">
					<!-- Tab Navigation using shadcn tabs -->
					<Tabs bind:value={activeTab} class="w-full">
						<TabsList class="flex w-full justify-between gap-4">
							<div class="grid w-full grid-cols-2">
								<TabsTrigger value="search">Profile Search</TabsTrigger>
								<TabsTrigger value="trust">Trust Score</TabsTrigger>
							</div>
							<Sheet.Root>
								<Sheet.Trigger
									class={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
										serverPubkey
											? 'bg-orange-100 text-orange-800 hover:bg-orange-200'
											: 'hover:bg-primary/90 hover:text-primary-foreground'
									}`}
								>
									<Server class="h-4 w-4" />
								</Sheet.Trigger>
								<Sheet.Content class="flex flex-col p-0">
									<ScrollArea class="h-full">
										<div class="p-4">
											<Sheet.Header>
												<Sheet.Title>Server Configuration</Sheet.Title>
												<Sheet.Description>
													Configure which Relatr server to connect to
												</Sheet.Description>
											</Sheet.Header>

											<div class="mt-4 grid gap-6">
												<!-- Server Input Section -->
												<div class="space-y-4">
													<div class="space-y-2">
														<Label for="server-pubkey">Server Public Key (Optional)</Label>
														<Input
															id="server-pubkey"
															bind:value={serverPubkeyInput}
															placeholder="Enter 64-character hex public key or leave empty for default"
															class="w-full font-mono text-sm"
															oninput={validateInput}
															onkeydown={(e: KeyboardEvent) => {
																if (e.key === 'Enter') {
																	handleServerPubkeyChange();
																}
															}}
														/>
														{#if validationError}
															<p class="text-xs text-destructive">{validationError}</p>
														{:else if serverPubkeyInput.trim() && isHexKey(serverPubkeyInput.trim())}
															<p class="text-xs text-green-600">✓ Valid hex public key</p>
														{/if}
													</div>
													<Button
														onclick={handleServerPubkeyChange}
														variant="outline"
														class="w-full"
														disabled={!!validationError}
													>
														Set Server
													</Button>
												</div>

												<!-- Server History Section -->
												{#if serverHistory.length > 0}
													<div class="space-y-4">
														<div class="flex items-center gap-2 text-sm font-medium">
															<Clock class="h-4 w-4" />
															<span>Recent Servers</span>
														</div>
														<div class="space-y-2">
															{#each serverHistory as server}
																<Card
																	class="group cursor-pointer px-0 py-2 transition-colors hover:bg-accent hover:text-accent-foreground {server.pubkey ===
																	(serverPubkey || DEFAULT_SERVER)
																		? 'border-orange-200'
																		: ''}"
																	onclick={() => connectToServerFromHistory(server.pubkey)}
																>
																	<CardContent class="">
																		<div class="flex items-center justify-between">
																			<div class="flex flex-col">
																				<div class=" inline-flex items-center gap-1">
																					<div
																						class="h-2 w-2 rounded-full"
																						style="background-color: {pubkeyToHexColor(
																							server.pubkey
																						)}"
																					></div>
																					<span class="font-mono text-xs"
																						>{getPubkeyDisplay(server.pubkey)}</span
																					>
																				</div>
																				<span class="text-xs text-muted-foreground">
																					{new Date(server.lastConnected).toLocaleDateString()}
																				</span>
																			</div>
																			<button
																				type="button"
																				class="hover:text-destructive-foreground rounded-sm p-1 opacity-0 transition-all group-hover:opacity-100 hover:bg-destructive"
																				onclick={(e) =>
																					removeServerFromHistoryHandler(server.pubkey, e)}
																			>
																				<Trash2 class="h-3 w-3" />
																			</button>
																		</div>
																	</CardContent>
																</Card>
															{/each}
														</div>
													</div>
												{/if}
											</div>

											<!-- Server Stats Section at the bottom -->
											<div class="mt-auto border-t pt-6">
												<ServerStats
													relatr={relatrClient}
													serverPubkey={serverPubkey || DEFAULT_SERVER}
												/>
											</div>
										</div>
									</ScrollArea>
								</Sheet.Content>
							</Sheet.Root>
						</TabsList>

						<!-- Tab Content -->
						<TabsContent value="search" class="mt-6 space-y-8">
							<SearchInput bind:results={searchResults} relatr={relatrClient} />

							{#if searchResults}
								<div class="mt-8">
									<SearchResults results={searchResults} onProfileClick={handleProfileClick} />
								</div>
							{/if}
						</TabsContent>

						<TabsContent value="trust" class="mt-6 space-y-8">
							<TrustScoreCalculator targetPubkey={selectedPubkey} relatr={relatrClient} />
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</main>
	</div>
{/if}
