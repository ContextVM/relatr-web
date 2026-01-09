<script lang="ts">
	import SearchInput from '$lib/components/SearchInput.svelte';
	import SearchResults from '$lib/components/SearchResults.svelte';
	import TrustScoreCalculator from '$lib/components/TrustScoreCalculator.svelte';
	import ServerStatusCard from '$lib/components/ServerStatusCard.svelte';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';
	import { type SearchProfilesOutput } from '$lib/ctxcn/RelatrClient';
	import { isHexKey } from 'applesauce-core/helpers';
	import { getServerHistory, removeServerFromHistory, type ServerHistoryItem } from '$lib/utils';
	import {
		getRelatrClient,
		getServerPubkey,
		setServerPubkey
	} from '$lib/stores/server-config.svelte';

	let searchResults = $state<SearchProfilesOutput | null>(null);
	let activeTab = $state<'search' | 'trust'>('search');
	let selectedPubkey = $state('');
	let serverPubkeyInput = $state('');
	let relatrClient = $derived(getRelatrClient());
	let serverPubkey = $derived(getServerPubkey());
	let validationError = $state<string | null>(null);
	let serverHistory = $state<ServerHistoryItem[]>(getServerHistory());

	// Keep the input seeded from the shared store (store also handles initial `?s=` and history)
	$effect(() => {
		if (!serverPubkeyInput) serverPubkeyInput = serverPubkey;
	});

	function handleProfileClick(pubkey: string) {
		selectedPubkey = pubkey;
		activeTab = 'trust';
	}

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

{#if relatrClient}
	<div class="flex min-h-screen flex-col bg-background">
		<main class="container mx-auto max-w-4xl flex-1 px-6 py-8">
			<div class="flex flex-col items-center justify-center">
				<div class="w-full max-w-2xl space-y-6">
					<!-- Server Status Card -->
					<ServerStatusCard
						bind:serverPubkeyInput
						bind:validationError
						{serverHistory}
						onServerChange={handleServerPubkeyChange}
						onHistoryRemove={removeServerFromHistoryHandler}
						onValidate={validateInput}
					/>

					<!-- Tab Navigation using shadcn tabs -->
					<Tabs bind:value={activeTab} class="w-full">
						<TabsList class="grid w-full grid-cols-2">
							<TabsTrigger value="search">Profile Search</TabsTrigger>
							<TabsTrigger value="trust">Trust Score</TabsTrigger>
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
							<TrustScoreCalculator bind:targetPubkey={selectedPubkey} relatr={relatrClient} />
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</main>
	</div>
{/if}
