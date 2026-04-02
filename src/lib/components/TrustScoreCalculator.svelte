<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import Spinner from './ui/spinner/spinner.svelte';
	import ProfileCard from './ProfileCard.svelte';
	import TrustScoreDisplay from './TrustScoreDisplay.svelte';
	import type { Relatr } from '$lib/ctxcn/RelatrClient';
	import { X } from 'lucide-svelte';
	import { validateAndDecodePubkey } from '$lib/utils.nostr';
	import { useTrustScore } from '$lib/queries/trust-scores';
	import { encodePluginRouteId } from '$lib/plugins/marketplace';

	let {
		targetPubkey = $bindable(''),
		relatr,
		serverPubkey,
		onCalculate,
		onReset
	}: {
		targetPubkey?: string;
		relatr: Relatr;
		serverPubkey: string;
		onCalculate: (params: { targetPresent: boolean; targetPubkey: string }) => void;
		onReset: () => void;
	} = $props();

	let draftTargetPubkey = $state(targetPubkey);

	// Use query for trust score with automatic caching
	const trustScoreQuery = $derived(useTrustScore(relatr, serverPubkey, targetPubkey));
	const result = $derived(trustScoreQuery.data);
	const isLoading = $derived(trustScoreQuery.isLoading);
	const error = $derived(trustScoreQuery.error ? trustScoreQuery.error.message : null);

	$effect(() => {
		draftTargetPubkey = targetPubkey;
	});

	function calculateTrustScore() {
		const trimmed = draftTargetPubkey.trim();

		if (!validateAndDecodePubkey(trimmed)) {
			// We need to handle this validation error separately since the query doesn't validate
			return;
		}

		onCalculate({
			targetPresent: true,
			targetPubkey: trimmed
		});
	}

	function resetSearch() {
		targetPubkey = '';
		draftTargetPubkey = '';
		onReset();
	}

	function getValidatorLabel(validatorKey: string) {
		return validatorKey.split(':')[1] || validatorKey;
	}

	function getValidatorPluginHref(validatorKey: string) {
		const [authorPubkey, pluginName] = validatorKey.split(':');
		if (!authorPubkey || !pluginName) return null;

		return `/plugins/${encodePluginRouteId(authorPubkey, pluginName)}`;
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
				bind:value={draftTargetPubkey}
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
			disabled={isLoading || !draftTargetPubkey.trim()}
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
						<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
							{#each Object.entries(result.trustScore.components.validators) as [validatorKey, validatorValue] (validatorKey + validatorValue)}
								{@const pluginHref = getValidatorPluginHref(validatorKey)}
								<div class="rounded-lg border border-border/70 bg-card/60 p-4 text-left shadow-sm">
									<div class="flex items-start justify-between gap-3">
										<div class="min-w-0 space-y-1">
											<p class="truncate text-sm font-semibold">
												{getValidatorLabel(validatorKey)}
											</p>
											<p class="truncate text-xs text-muted-foreground">{validatorKey}</p>
										</div>
										<TrustScoreDisplay
											value={validatorValue.score || 0}
											mode="combined"
											size="sm"
										/>
									</div>

									{#if validatorValue.description}
										<p class="mt-3 text-sm text-muted-foreground">{validatorValue.description}</p>
									{/if}

									{#if pluginHref}
										<div class="mt-4">
											<a
												class="inline-flex items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
												href={pluginHref}
											>
												Open plugin page
											</a>
										</div>
									{/if}
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
