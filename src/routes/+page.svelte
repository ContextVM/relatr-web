<script lang="ts">
	import SearchInput from '$lib/components/SearchInput.svelte';
	import SearchResults from '$lib/components/SearchResults.svelte';
	import TrustScoreCalculator from '$lib/components/TrustScoreCalculator.svelte';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';
	import type { SearchProfilesOutput } from '$lib/ctxcn/RelatrClient.js';

	let searchResults = $state<SearchProfilesOutput | null>(null);
	let activeTab = $state<'search' | 'trust'>('search');
	let selectedPubkey = $state('');

	function handleProfileClick(pubkey: string) {
		selectedPubkey = pubkey;
		activeTab = 'trust';
	}
</script>

<div class="flex min-h-screen flex-col bg-background">
	<main class="container mx-auto max-w-4xl flex-1 px-6 py-8">
		<div class="flex flex-col items-center justify-center">
			<div class="w-full max-w-2xl space-y-8">
				<!-- Tab Navigation using shadcn tabs -->
				<Tabs bind:value={activeTab} class="w-full">
					<TabsList class="grid w-full grid-cols-2">
						<TabsTrigger value="search">Profile Search</TabsTrigger>
						<TabsTrigger value="trust">Trust Score Calculator</TabsTrigger>
					</TabsList>

					<!-- Tab Content -->
					<TabsContent value="search" class="mt-6 space-y-8">
						<SearchInput bind:results={searchResults} />

						{#if searchResults}
							<div class="mt-8">
								<SearchResults results={searchResults} onProfileClick={handleProfileClick} />
							</div>
						{/if}
					</TabsContent>

					<TabsContent value="trust" class="mt-6 space-y-8">
						<TrustScoreCalculator targetPubkey={selectedPubkey} />
					</TabsContent>
				</Tabs>
			</div>
		</div>
	</main>
</div>
