<script lang="ts">
	import { addressLoader } from '$lib/services/loaders.svelte';
	import { metadataRelays } from '$lib/services/relay-pool';
	import { eventStore } from '../services/eventStore';
	import { ProfileModel } from 'applesauce-core/models';
	import { validateAndDecodePubkey, encodeNpub, pubkeyToHexColor } from '$lib/utils.nostr';
	import { Metadata } from 'nostr-tools/kinds';

	let {
		pubkey,
		mode = 'default',
		trustScore,
		rank,
		showPubkey = false,
		onClick
	}: {
		pubkey: string;
		mode?: 'minimal' | 'default' | 'detailed' | 'search';
		trustScore?: number;
		rank?: number;
		showPubkey?: boolean;
		onClick?: () => void;
	} = $props();

	// Decode the pubkey to hex format for internal use
	const hexPubkey = validateAndDecodePubkey(pubkey) || pubkey;
	const profile = eventStore.model(ProfileModel, hexPubkey);
	$effect(() => {
		if ($profile) return;
		const sub = addressLoader({
			kind: Metadata,
			pubkey,
			relays: metadataRelays
		}).subscribe();
		return () => sub.unsubscribe();
	});

	function getDisplayName() {
		return $profile?.name || $profile?.display_name || encodeNpub(hexPubkey).slice(0, 12) + '...';
	}

	function getTrustScoreColor(score: number) {
		if (score >= 0.8) return 'text-green-600';
		if (score >= 0.6) return 'text-yellow-600';
		if (score >= 0.4) return 'text-orange-600';
		return 'text-red-600';
	}
</script>

{#snippet pfp(pubkey: string, pfp?: string, size: 'sm' | 'md' | 'lg' = 'md')}
	{#if pfp}
		<img
			src={pfp}
			alt="pfp"
			class="rounded-full object-cover {size === 'sm'
				? 'h-6 w-6'
				: size === 'lg'
					? 'h-12 w-12'
					: 'h-8 w-8'}"
		/>
	{:else}
		<div
			class="rounded-full {size === 'sm' ? 'h-6 w-6' : size === 'lg' ? 'h-12 w-12' : 'h-8 w-8'}"
			style="background-color: {pubkeyToHexColor(pubkey)}"
		></div>
	{/if}
{/snippet}

<!-- Minimal mode - just name and pfp -->
{#if mode === 'minimal'}
	{#if onClick}
		<button
			type="button"
			class="flex cursor-pointer items-center gap-2 border-none bg-transparent p-0 hover:opacity-80"
			onclick={onClick}
			onkeydown={(e) => e.key === 'Enter' && onClick()}
			tabindex="0"
		>
			{@render pfp(hexPubkey, $profile?.picture, 'sm')}
			<span class="truncate text-sm font-medium">{getDisplayName()}</span>
		</button>
	{:else}
		<div class="flex items-center gap-2">
			{@render pfp(hexPubkey, $profile?.picture, 'sm')}
			<span class="truncate text-sm font-medium">{getDisplayName()}</span>
		</div>
	{/if}
	<!-- Search mode - compact with trust score -->
{:else if mode === 'search'}
	{#if onClick}
		<button
			type="button"
			class="-m-2 flex w-full cursor-pointer items-center gap-3 rounded border-none bg-transparent p-2 text-left hover:bg-accent/50"
			onclick={onClick}
			onkeydown={(e) => e.key === 'Enter' && onClick()}
			tabindex="0"
		>
			{@render pfp(hexPubkey, $profile?.picture, 'md')}
			<div class="min-w-0 flex-1">
				<div class="flex items-center gap-2">
					<span class="truncate font-medium">{getDisplayName()}</span>
					{#if trustScore !== undefined}
						<span class="text-sm font-bold {getTrustScoreColor(trustScore)}">
							{trustScore.toFixed(2)}
						</span>
					{/if}
				</div>
				{#if $profile?.nip05}
					<span class="block truncate text-xs text-muted-foreground">
						{$profile?.nip05}
					</span>
				{/if}
				{#if showPubkey}
					<span class="text-xs text-muted-foreground">
						{hexPubkey.slice(0, 8)}...{hexPubkey.slice(-8)}
					</span>
				{/if}
			</div>
			{#if rank}
				<div class="text-xs font-medium text-muted-foreground">
					#{rank}
				</div>
			{/if}
		</button>
	{:else}
		<div class="flex items-center gap-3">
			{@render pfp(hexPubkey, $profile?.picture, 'md')}
			<div class="min-w-0 flex-1">
				<div class="flex items-center gap-2">
					<span class="truncate font-medium">{getDisplayName()}</span>
					{#if trustScore !== undefined}
						<span class="text-sm font-bold {getTrustScoreColor(trustScore)}">
							{trustScore.toFixed(2)}
						</span>
					{/if}
				</div>
				{#if $profile?.nip05}
					<span class="block truncate text-xs text-muted-foreground">
						{$profile?.nip05}
					</span>
				{/if}
				{#if showPubkey}
					<span class="text-xs text-muted-foreground">
						{hexPubkey.slice(0, 8)}...{hexPubkey.slice(-8)}
					</span>
				{/if}
			</div>
			{#if rank}
				<div class="text-xs font-medium text-muted-foreground">
					#{rank}
				</div>
			{/if}
		</div>
	{/if}
	<!-- Detailed mode - full profile information -->
{:else if mode === 'detailed'}
	<div class="space-y-4">
		<div class="flex items-start gap-4">
			{@render pfp(hexPubkey, $profile?.picture, 'lg')}
			<div class="flex-1">
				<h3 class="text-lg font-semibold">{getDisplayName()}</h3>
				{#if $profile?.nip05}
					<p class="text-sm text-muted-foreground">{$profile?.nip05}</p>
				{/if}
				{#if $profile?.about}
					<p class="mt-2 text-sm text-muted-foreground">{$profile?.about}</p>
				{/if}
			</div>
			{#if trustScore !== undefined}
				<div class="text-right">
					<div class="text-2xl font-bold {getTrustScoreColor(trustScore)}">
						{trustScore.toFixed(2)}
					</div>
					<div class="text-xs text-muted-foreground">Trust Score</div>
				</div>
			{/if}
		</div>

		{#if showPubkey}
			<div class="rounded bg-muted p-2 font-mono text-xs text-muted-foreground">
				Pubkey: {hexPubkey}
			</div>
		{/if}

		<!-- All profile metadata in detailed mode -->
		{#if $profile && Object.keys($profile).length > 0}
			<div class="space-y-3">
				<div class="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
					{#if $profile?.name}
						<div>
							<span class="font-medium">Name:</span>
							<span class="ml-2 text-muted-foreground">{$profile?.name}</span>
						</div>
					{/if}
					{#if $profile?.display_name}
						<div>
							<span class="font-medium">Display Name:</span>
							<span class="ml-2 text-muted-foreground">{$profile?.display_name}</span>
						</div>
					{/if}
					{#if $profile?.nip05}
						<div>
							<span class="font-medium">NIP-05:</span>
							<span class="ml-2 text-muted-foreground">{$profile?.nip05}</span>
						</div>
					{/if}
					{#if $profile?.lud16}
						<div>
							<span class="font-medium">Lightning:</span>
							<span class="ml-2 text-muted-foreground">{$profile?.lud16}</span>
						</div>
					{/if}
					{#if $profile?.website}
						<div>
							<span class="font-medium">Website:</span>
							<a
								href={$profile?.website}
								target="_blank"
								rel="noopener noreferrer"
								class="ml-2 text-muted-foreground underline hover:text-primary"
							>
								{$profile?.website}
							</a>
						</div>
					{/if}
				</div>

				<!-- Additional metadata fields -->
				<div class="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
					{#if $profile?.display_name && $profile?.display_name !== $profile?.name}
						<!-- Already handled above -->
					{/if}
					{#if $profile?.lud06}
						<div>
							<span class="font-medium">Lightning (LUD06):</span>
							<span class="ml-2 text-xs break-all text-muted-foreground">{$profile?.lud06}</span>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
	<!-- Default mode - original behavior -->
{:else if onClick}
	<button
		type="button"
		class="flex w-full cursor-pointer items-center gap-2 border-none bg-transparent p-0 hover:opacity-80"
		onclick={onClick}
		onkeydown={(e) => e.key === 'Enter' && onClick()}
		tabindex="0"
	>
		{@render pfp(hexPubkey, $profile?.picture)}
		<div class="flex flex-col">
			<span class="font-semibold">{getDisplayName()}</span>
			{#if $profile?.nip05}
				<span class="text-sm text-gray-400">
					{$profile?.nip05}
				</span>
			{/if}
		</div>
		{#if trustScore !== undefined}
			<div class="ml-auto">
				<span class="text-sm font-bold {getTrustScoreColor(trustScore)}">
					{trustScore.toFixed(2)}
				</span>
			</div>
		{/if}
	</button>
{:else}
	<div class="flex items-center gap-2">
		{@render pfp(hexPubkey, $profile?.picture)}
		<div class="flex flex-col">
			<span class="font-semibold">{getDisplayName()}</span>
			{#if $profile?.nip05}
				<span class="text-sm text-gray-400">
					{$profile?.nip05}
				</span>
			{/if}
		</div>
		{#if trustScore !== undefined}
			<div class="ml-auto">
				<span class="text-sm font-bold {getTrustScoreColor(trustScore)}">
					{trustScore.toFixed(2)}
				</span>
			</div>
		{/if}
	</div>
{/if}
