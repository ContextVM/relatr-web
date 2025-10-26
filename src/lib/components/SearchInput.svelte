<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { Relatr, SearchProfilesOutput } from '$lib/ctxcn/RelatrClient.js';
	import Spinner from './ui/spinner/spinner.svelte';
	import { EllipsisVertical } from 'lucide-svelte';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	let {
		results = $bindable<SearchProfilesOutput | null>(null),
		relatr
	}: {
		results?: SearchProfilesOutput | null;
		relatr: Relatr;
	} = $props();

	let query = $state('');
	let limit = $state(5);
	let extendToNostr = $state(false);
	let sourcePubkey = $state('');
	let weightingScheme = $state<'default' | 'social' | 'validation' | 'strict'>('default');
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let showAdvancedConfig = $state(false);
	$effect(() => {
		console.log($state.snapshot(extendToNostr));
	});
	async function handleSearch() {
		if (!query.trim()) return;

		isLoading = true;
		error = null;

		try {
			const searchParams: Parameters<typeof relatr.SearchProfiles> = [
				query,
				limit,
				weightingScheme,
				extendToNostr
			];

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

						<Select.Root type="single" bind:value={weightingScheme}>
							<Select.Trigger class="w-full" placeholder="Select weighting scheme">
								{weightingScheme}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="default">Default</Select.Item>
								<Select.Item value="social">Social</Select.Item>
								<Select.Item value="validation">Validation</Select.Item>
								<Select.Item value="strict">Strict</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
					<div class="space-y-2">
						<Label for="extend-to-nostr">Extend to Nostr</Label>
						<div class="flex items-center space-x-2">
							<Checkbox id="extend-to-nostr" bind:checked={extendToNostr} />
							<Label for="extend-to-nostr" class="cursor-pointer"
								>Extend search to Nostr network</Label
							>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>

	{#if error}
		<p class="text-sm text-destructive">{error}</p>
	{/if}
</div>
