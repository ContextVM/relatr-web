<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
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
	const urlParams = $derived(page.url.searchParams);
	const hasTargetParam = $derived(urlParams.has('target'));
	const hasQueryParam = $derived(urlParams.has('q'));
	const targetParam = $derived(urlParams.get('target')?.trim() ?? '');
	const queryParam = $derived(urlParams.get('q')?.trim() ?? '');
	const limitParam = $derived(Number.parseInt(urlParams.get('limit') ?? '5', 10));
	const initialLimit = $derived(
		Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 5
	);
	const initialExtendToNostr = $derived(urlParams.get('nostr') === '1');

	function clearSearchParams(searchParams: URLSearchParams) {
		searchParams.delete('q');
		searchParams.delete('limit');
		searchParams.delete('nostr');
	}

	// Keep the input seeded from the shared store (store also handles initial `?s=` and history)
	$effect(() => {
		if (!serverPubkeyInput) serverPubkeyInput = serverPubkey;
	});

	$effect(() => {
		activeTab = hasTargetParam ? 'trust' : 'search';
	});

	$effect(() => {
		selectedPubkey = targetParam;
	});

	$effect(() => {
		if (!hasQueryParam) {
			searchResults = null;
		}
	});

	async function updateUrl(mutator: (params: URLSearchParams) => void) {
		if (!browser) return;

		const nextUrl = new URL(page.url);
		mutator(nextUrl.searchParams);

		if (nextUrl.toString() === page.url.toString()) return;

		await goto(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`, {
			replaceState: true,
			keepFocus: true,
			noScroll: true,
			invalidateAll: false
		});
	}

	function handleProfileClick(pubkey: string) {
		activeTab = 'trust';
		selectedPubkey = pubkey;
		void updateUrl((params) => {
			params.set('target', pubkey);
		});
	}

	function handleSearchSubmit(params: {
		queryPresent: boolean;
		query: string;
		limit: number;
		extendToNostr: boolean;
	}) {
		activeTab = 'search';
		void updateUrl((searchParams) => {
			if (params.queryPresent) {
				searchParams.set('q', params.query);
			} else {
				searchParams.delete('q');
			}

			if (params.limit === 5) {
				searchParams.delete('limit');
			} else {
				searchParams.set('limit', String(params.limit));
			}

			if (params.extendToNostr) {
				searchParams.set('nostr', '1');
			} else {
				searchParams.delete('nostr');
			}

			searchParams.delete('target');
		});
	}

	function handleTrustCalculate(params: { targetPresent: boolean; targetPubkey: string }) {
		activeTab = 'trust';
		selectedPubkey = params.targetPubkey;
		void updateUrl((searchParams) => {
			if (params.targetPresent) {
				searchParams.set('target', params.targetPubkey);
			} else {
				searchParams.delete('target');
			}
		});
	}

	function handleTrustReset() {
		activeTab = 'search';
		void updateUrl((searchParams) => {
			searchParams.delete('target');
		});
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
		void updateUrl((searchParams) => {
			if (trimmed) {
				searchParams.set('s', trimmed);
			} else {
				searchParams.delete('s');
			}
		});

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
							<SearchInput
								bind:results={searchResults}
								relatr={relatrClient}
								{serverPubkey}
								initialQuery={queryParam}
								{initialLimit}
								{initialExtendToNostr}
								onSearch={handleSearchSubmit}
							/>

							{#if searchResults}
								<div class="mt-8">
									<SearchResults results={searchResults} onProfileClick={handleProfileClick} />
								</div>
							{/if}
						</TabsContent>

						<TabsContent value="trust" class="mt-6 space-y-8">
							<TrustScoreCalculator
								bind:targetPubkey={selectedPubkey}
								relatr={relatrClient}
								{serverPubkey}
								onCalculate={handleTrustCalculate}
								onReset={handleTrustReset}
							/>
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</main>
	</div>
{/if}
