<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import Spinner from './ui/spinner/spinner.svelte';
	import ProfileCard from './ProfileCard.svelte';
	import TrustScoreDisplay from './TrustScoreDisplay.svelte';
	import type { Relatr, CalculateTrustScoreOutput } from '$lib/ctxcn/RelatrClient.js';
	import { X, EllipsisVertical } from 'lucide-svelte';
	import { validateAndDecodePubkey } from '$lib/utils.nostr';

	let {
		targetPubkey = $bindable(''),
		relatr
	}: {
		targetPubkey?: string;
		sourcePubkey?: string;
		relatr: Relatr;
	} = $props();
	let weightingScheme = $state<'default' | 'social' | 'validation' | 'strict'>('default');
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let result = $state<CalculateTrustScoreOutput | null>(null);
	let showAdvancedConfig = $state(false);

	async function calculateTrustScore() {
		if (!targetPubkey.trim()) return;
		if (!validateAndDecodePubkey(targetPubkey)) {
			error = 'Invalid target pubkey';
			return;
		}
		isLoading = true;
		error = null;
		result = null;

		try {
			const params: Parameters<typeof relatr.CalculateTrustScore> = [targetPubkey];

			if (weightingScheme !== 'default') {
				params.push(undefined, weightingScheme);
			}

			const trustScoreResult = await relatr.CalculateTrustScore(...params);
			result = trustScoreResult;
		} catch (err) {
			error =
				err instanceof Error ? err.message : 'An error occurred while calculating trust score';
		} finally {
			isLoading = false;
		}
	}

	// Auto-calculate when targetPubkey prop changes
	$effect(() => {
		if (targetPubkey.trim()) {
			calculateTrustScore();
		}
	});

	function resetSearch() {
		targetPubkey = '';
		weightingScheme = 'default';
		isLoading = false;
		error = null;
		result = null;
		showAdvancedConfig = false;
	}

	function toggleAdvancedConfig() {
		showAdvancedConfig = !showAdvancedConfig;
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
			<Button onclick={toggleAdvancedConfig} variant="ghost" size="sm" class="h-8 w-8 p-0">
				<EllipsisVertical class="h-4 w-4" />
			</Button>
		</div>

		<div class="space-y-2">
			{#if showAdvancedConfig}
				<div class="grid grid-cols-1 gap-4 rounded-md border bg-muted/50 p-4 pt-2 md:grid-cols-2">
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
				Computed in {result.computationTimeMs}ms at {new Date(
					result.trustScore.computedAt * 1000
				).toLocaleString()}
			</div>
		</div>
	{/if}
</div>
