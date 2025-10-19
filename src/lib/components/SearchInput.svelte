<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { relatr } from '$lib/ctxcn/RelatrClient.js';
	import type { SearchProfilesOutput } from '$lib/ctxcn/RelatrClient.js';
	import Spinner from './ui/spinner/spinner.svelte';
	import { EllipsisVertical } from 'lucide-svelte';

	let {
		results = $bindable<SearchProfilesOutput | null>(null)
	}: { results?: SearchProfilesOutput | null } = $props();

	let query = $state('');
	let limit = $state(7);
	let sourcePubkey = $state('');
	let weightingScheme = $state<'default' | 'social' | 'validation' | 'strict'>('default');
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let showAdvancedConfig = $state(false);

	async function handleSearch() {
		if (!query.trim()) return;

		isLoading = true;
		error = null;

		try {
			const searchParams: Parameters<typeof relatr.SearchProfiles> = [query, limit];

			if (sourcePubkey.trim()) {
				searchParams.push(sourcePubkey);
				if (weightingScheme !== 'default') {
					searchParams.push(weightingScheme);
				}
			} else if (weightingScheme !== 'default') {
				searchParams.push(undefined, weightingScheme);
			}

			const searchResults = await relatr.SearchProfiles(...searchParams);
			results = searchResults;
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred while searching';
			results = null;
		} finally {
			isLoading = false;
		}
	}

	function toggleAdvancedConfig() {
		showAdvancedConfig = !showAdvancedConfig;
	}
</script>

<div class="w-full max-w-2xl space-y-4">
	<div class="flex justify-center gap-2">
		<div class="text-center">
			<h2 class="mb-2 text-3xl font-bold">Nostr Profile Search</h2>
			<p class="text-muted-foreground">
				Search for Nostr profiles using the Relatr trust scoring system
			</p>
		</div>
	</div>

	<div class="space-y-4">
		<div class="flex gap-2">
			<Input
				id="search-input"
				bind:value={query}
				placeholder="Enter name or pubkey..."
				class="flex-1"
				onkeydown={(e: KeyboardEvent) => {
					if (e.key === 'Enter') {
						handleSearch();
					}
				}}
			/>

			<Button onclick={handleSearch} disabled={isLoading || !query.trim()} variant="default">
				{#if isLoading}
					<div class="flex items-center gap-2">
						<Spinner />
						<span>Searching...</span>
					</div>
				{:else}
					Search
				{/if}
			</Button>
			<Button onclick={toggleAdvancedConfig} variant="ghost" size="sm" class="h-8 w-8 p-0">
				<EllipsisVertical class="h-4 w-4" />
			</Button>
		</div>

		<div class="space-y-2">
			{#if showAdvancedConfig}
				<div class="grid grid-cols-1 gap-4 rounded-md border bg-muted/50 p-4 pt-2 md:grid-cols-2">
					<div class="space-y-2">
						<Label for="limit-input">Results Limit</Label>
						<Input
							id="limit-input"
							type="number"
							bind:value={limit}
							min="1"
							max="100"
							placeholder="10"
						/>
					</div>
					<div class="space-y-2">
						<Label for="weighting-scheme">Weighting Scheme</Label>
						<select
							id="weighting-scheme"
							bind:value={weightingScheme}
							class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
						>
							<option value="default">Default</option>
							<option value="social">Social</option>
							<option value="validation">Validation</option>
							<option value="strict">Strict</option>
						</select>
					</div>
				</div>
			{/if}
		</div>
	</div>

	{#if error}
		<p class="text-sm text-destructive">{error}</p>
	{/if}
</div>
