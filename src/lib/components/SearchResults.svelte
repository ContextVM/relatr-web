<script lang="ts">
	import { Card } from '$lib/components/ui/card/index.js';
	import type { SearchProfilesOutput } from '$lib/ctxcn/RelatrClient.js';
	import ProfileCard from './ProfileCard.svelte';

	export let results: SearchProfilesOutput | null = null;
	export let onProfileClick: (pubkey: string) => void = () => {};
</script>

{#if results}
	<div class="space-y-4">
		<div class="text-sm text-muted-foreground">
			Found {results.totalFound} results in {results.searchTimeMs}ms
		</div>

		<div class="grid gap-3">
			{#each results.results as result, index (result.pubkey + index)}
				<Card
					class="cursor-pointer p-3 transition-colors hover:bg-accent/50"
					onclick={() => onProfileClick(result.pubkey)}
				>
					<ProfileCard
						pubkey={result.pubkey}
						mode="search"
						trustScore={result.trustScore}
						rank={result.rank}
						showPubkey={true}
					/>
				</Card>
			{/each}
		</div>
	</div>
{/if}
