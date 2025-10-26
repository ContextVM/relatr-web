<script lang="ts">
	import SearchInput from '$lib/components/SearchInput.svelte';
	import SearchResults from '$lib/components/SearchResults.svelte';
	import TrustScoreCalculator from '$lib/components/TrustScoreCalculator.svelte';
	import ServerStats from '$lib/components/ServerStats.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { RelatrClient, type SearchProfilesOutput } from '$lib/ctxcn/RelatrClient.js';
	import { isHexKey } from 'applesauce-core/helpers';
	import { Settings } from 'lucide-svelte';
	import { DEFAULT_SERVER } from '$lib/constants';

	let searchResults = $state<SearchProfilesOutput | null>(null);
	let activeTab = $state<'search' | 'trust'>('search');
	let selectedPubkey = $state('');
	let serverPubkeyInput = $state('');
	let serverPubkey = $state('');
	let relatrClient = $state<RelatrClient | null>(null);
	let validationError = $state<string | null>(null);

	function handleProfileClick(pubkey: string) {
		selectedPubkey = pubkey;
		activeTab = 'trust';
	}

	$effect(() => {
		if (!relatrClient && !serverPubkey.trim()) {
			relatrClient = new RelatrClient({ serverPubkey: DEFAULT_SERVER });
		}
	});

	function handleServerPubkeyChange() {
		const trimmedPubkey = serverPubkeyInput.trim();

		if (trimmedPubkey && !isHexKey(trimmedPubkey)) {
			validationError = 'Invalid hex public key format';
			return;
		}

		validationError = null;
		serverPubkey = trimmedPubkey;
		relatrClient = new RelatrClient({ serverPubkey: serverPubkey || undefined });
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
							<Popover.Root>
								<Popover.Trigger
									class={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
										serverPubkey
											? 'bg-orange-100 text-orange-800 hover:bg-orange-200'
											: 'hover:bg-primary/90 hover:text-primary-foreground'
									}`}
								>
									<Settings class="h-4 w-4" />
								</Popover.Trigger>
								<Popover.Content class="w-96 max-w-[90vw]">
									<div class="grid gap-4">
										<div class="space-y-2">
											<h4 class="leading-none font-medium">Server Configuration</h4>
											<p class="text-sm text-muted-foreground">
												Configure which Relatr server to connect to
											</p>
										</div>
										<div class="grid gap-2">
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

										<!-- Server Stats Section -->
										<div class="border-t pt-4">
											<ServerStats
												relatr={relatrClient}
												serverPubkey={serverPubkey || DEFAULT_SERVER}
											/>
										</div>
									</div>
								</Popover.Content>
							</Popover.Root>
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
