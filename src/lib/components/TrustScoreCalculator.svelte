<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import Spinner from './ui/spinner/spinner.svelte';
	import ProfileCard from './ProfileCard.svelte';
	import TrustScoreDisplay from './TrustScoreDisplay.svelte';
	import type { Relatr } from '$lib/ctxcn/RelatrClient.svelte.js';
	import { X, EllipsisVertical } from 'lucide-svelte';
	import { validateAndDecodePubkey } from '$lib/utils.nostr';
	import { useTrustScore } from '$lib/queries/trust-scores';

	let {
		targetPubkey = $bindable(''),
		relatr
	}: {
		targetPubkey?: string;
		relatr: Relatr;
	} = $props();

	// Use query for trust score with automatic caching
	const trustScoreQuery = useTrustScore(
		() => relatr,
		() => targetPubkey
	);
	const result = $derived(trustScoreQuery.data);
	const isLoading = $derived(trustScoreQuery.isLoading);
	const error = $derived(trustScoreQuery.error ? trustScoreQuery.error.message : null);

	function calculateTrustScore() {
		if (!targetPubkey.trim()) return;
		if (!validateAndDecodePubkey(targetPubkey)) {
			// We need to handle this validation error separately since the query doesn't validate
			return;
		}
		// Trigger the query by enabling it - the query key includes targetPubkey so it will refetch automatically
	}

	function resetSearch() {
		targetPubkey = '';
	}
</script>

<div class="flex justify-center gap-2">
	<div class="text-center">
		<h2 class="mb-2 text-3xl font-bold">Trust Score Calculator</h2>
		<p class="text-muted-foreground">
			Calculate trust scores for Nostr pubkeys using social graph analysis
		</p>
	</div>
</div>
<div class="space-y-4">
	{#if !result}
		<Label for="target-pubkey">Target Pubkey</Label>
		<div class="flex gap-2 space-y-2">
			<Input
				id="target-pubkey"
				bind:value={targetPubkey}
				placeholder="npub1... or hex"
				onkeydown={(e: KeyboardEvent) => {
					if (e.key === 'Enter') {
						calculateTrustScore();
					}
				}}
			/>
		</div>

		<Button
			onclick={calculateTrustScore}
			disabled={isLoading || !targetPubkey.trim()}
			variant="default"
			class="w-full"
		>
			{#if isLoading}
				<div class="flex items-center gap-2">
					<Spinner />
					<span>Calculating...</span>
				</div>
			{:else}
				Calculate Trust Score
			{/if}
		</Button>

		{#if error}
			<p class="text-sm text-destructive">{error}</p>
		{/if}
	{:else}
		<div class="mt-6 space-y-6">
			<!-- Target Profile Card -->
			<Card>
				<CardHeader>
					<CardTitle class="flex justify-between text-lg">
						Target Profile
						<Button onclick={resetSearch} variant="ghost" class="text-sm">
							<X />
						</Button>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<ProfileCard
						pubkey={result.trustScore.targetPubkey}
						mode="detailed"
						trustScore={result.trustScore.score}
						showPubkey={true}
					/>
				</CardContent>
			</Card>

			<!-- Overall Trust Score -->
			<Card>
				<CardHeader>
					<CardTitle class="text-lg">Overall Trust Score</CardTitle>
				</CardHeader>
				<CardContent>
					<div class="flex items-center justify-center gap-4">
						<TrustScoreDisplay
							value={result.trustScore.score || 0}
							mode="combined"
							size="lg"
							showLabel={true}
							label="Trust Score"
						/>
					</div>
				</CardContent>
			</Card>
			<!-- Components -->
			<Card>
				<CardHeader>
					<CardTitle class="text-lg">Score Components</CardTitle>
				</CardHeader>
				<CardContent>
					<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
						<div class="text-center">
							<TrustScoreDisplay
								value={result.trustScore.components.distanceWeight || 0}
								mode="combined"
								size="md"
								showLabel={true}
								label="Distance Weight"
							/>
						</div>
						<div class="text-center">
							<TrustScoreDisplay
								value={result.trustScore.components.socialDistance || 0}
								mode="combined"
								size="md"
								showLabel={true}
								label="Social Distance"
							/>
						</div>
						<div class="text-center">
							<TrustScoreDisplay
								value={result.trustScore.components.normalizedDistance || 0}
								mode="combined"
								size="md"
								showLabel={true}
								label="Normalized Distance"
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			<!-- Validators -->
			<Card>
				<CardHeader>
					<CardTitle class="text-lg">Profile Validators</CardTitle>
				</CardHeader>
				<CardContent>
					{#if Object.keys(result.trustScore.components.validators).length > 0}
						<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
							{#each Object.entries(result.trustScore.components.validators) as [validatorKey, validatorValue] (validatorKey + validatorValue)}
								<div class="text-center">
									<TrustScoreDisplay
										value={validatorValue || 0}
										mode="combined"
										size="sm"
										showLabel={true}
										label={validatorKey
											.replace(/([A-Z])/g, ' $1')
											.replace(/^./, (str) => str.toUpperCase())}
									/>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-center text-muted-foreground">No validator data available</p>
					{/if}
				</CardContent>
			</Card>

			<!-- Computation Info -->
			<div class="text-center text-xs text-muted-foreground">
				Computed in {result.computationTimeMs}ms
			</div>
		</div>
	{/if}
</div>
