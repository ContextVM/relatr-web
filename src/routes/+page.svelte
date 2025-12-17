<script lang="ts">
	import SearchInput from '$lib/components/SearchInput.svelte';
	import SearchResults from '$lib/components/SearchResults.svelte';
	import TrustScoreCalculator from '$lib/components/TrustScoreCalculator.svelte';
	import ServerStatusCard from '$lib/components/ServerStatusCard.svelte';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';
	import { RelatrClient, type SearchProfilesOutput } from '$lib/ctxcn/RelatrClient.svelte.js';
	import { isHexKey } from 'applesauce-core/helpers';
	import { DEFAULT_SERVER } from '$lib/constants';
	import {
		getServerHistory,
		addServerToHistory,
		removeServerFromHistory,
		type ServerHistoryItem
	} from '$lib/utils';
	import { page } from '$app/state';
	import { activeAccount } from '$lib/services/accountManager.svelte';

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

	// React to account changes
	$effect(() => {
		if ($activeAccount) {
			relatrClient = new RelatrClient({ serverPubkey, signer: $activeAccount.signer });
		} else {
			relatrClient = new RelatrClient({ serverPubkey });
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
						{relatrClient}
						serverPubkey={serverPubkey || DEFAULT_SERVER}
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
