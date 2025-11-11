<script lang="ts">
	import { addressLoader } from '$lib/services/loaders.svelte';
	import { metadataRelays } from '$lib/services/relay-pool';
	import { eventStore } from '../services/eventStore';
	import { ProfileModel } from 'applesauce-core/models';
	import {
		validateAndDecodePubkey,
		encodeNpub,
		pubkeyToHexColor,
		truncatePubkey
	} from '$lib/utils.nostr';
	import { Metadata } from 'nostr-tools/kinds';
	import Badge from './ui/badge/badge.svelte';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { npubEncode } from 'applesauce-core/helpers';
	import { Copy, ExternalLink } from 'lucide-svelte';
	import { copyToClipboard } from '$lib/utils';
	import Button from './ui/button/button.svelte';
	let {
		pubkey,
		mode = 'default',
		trustScore,
		rank,
		showPubkey = false,
		exactMatch = false,
		onClick
	}: {
		pubkey: string;
		mode?: 'minimal' | 'default' | 'detailed' | 'search';
		trustScore?: number;
		rank?: number;
		showPubkey?: boolean;
		exactMatch?: boolean;
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

{#snippet exactMatchSnippet()}
	<Tooltip.Provider delayDuration={250}>
		<Tooltip.Root>
			<Tooltip.Trigger>
				<Badge class="ml-2">Exact Match</Badge>
			</Tooltip.Trigger>
			<Tooltip.Content>
				<p>Exact matches boost the trust score of the target profile during search.</p>
			</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>
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
			<span class="max-w-[120px] truncate text-sm font-medium">{getDisplayName()}</span>
		</button>
	{:else}
		<div class="flex items-center gap-2">
			{@render pfp(hexPubkey, $profile?.picture, 'sm')}
			<span class="max-w-[120px] truncate text-sm font-medium">{getDisplayName()}</span>
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
					<span class="max-w-[140px] truncate font-medium sm:max-w-[200px]">{getDisplayName()}</span
					>
					{#if trustScore !== undefined}
						<span class="text-sm font-bold {getTrustScoreColor(trustScore)}">
							{trustScore.toFixed(2)}
						</span>
					{/if}
				</div>
				{#if $profile?.nip05}
					<span class="block max-w-[160px] truncate text-xs text-muted-foreground sm:max-w-[220px]">
						{$profile?.nip05}
					</span>
				{/if}
				{#if showPubkey}
					<span class="max-w-[120px] truncate text-xs text-muted-foreground">
						{truncatePubkey(hexPubkey)}
					</span>
				{/if}
			</div>
			{#if exactMatch}
				{@render exactMatchSnippet()}
			{/if}
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
					<span class="max-w-[140px] truncate font-medium sm:max-w-[200px]">{getDisplayName()}</span
					>
					{#if trustScore !== undefined}
						<span class="text-sm font-bold {getTrustScoreColor(trustScore)}">
							{trustScore.toFixed(2)}
						</span>
					{/if}
				</div>
				{#if $profile?.nip05}
					<span class="block max-w-[160px] truncate text-xs text-muted-foreground sm:max-w-[220px]">
						{$profile?.nip05}
					</span>
				{/if}
				{#if showPubkey}
					<span class="max-w-[120px] truncate text-xs text-muted-foreground">
						{truncatePubkey(hexPubkey)}
					</span>
				{/if}
			</div>
			{#if exactMatch}
				{@render exactMatchSnippet()}
			{/if}
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
		<div class="flex flex-col gap-4 sm:flex-row sm:items-start">
			{@render pfp(hexPubkey, $profile?.picture, 'lg')}
			<div class="flex-1">
				<h3 class="text-lg font-semibold wrap-break-word">{getDisplayName()}</h3>
				{#if $profile?.nip05}
					<p class="text-sm break-all text-muted-foreground">{$profile?.nip05}</p>
				{/if}
				{#if $profile?.about}
					<p class="mt-2 text-sm wrap-break-word text-muted-foreground">{$profile?.about}</p>
				{/if}
			</div>
			{#if trustScore !== undefined}
				<div class="text-center sm:text-right">
					<div class="text-2xl font-bold {getTrustScoreColor(trustScore)}">
						{trustScore.toFixed(2)}
					</div>
					<div class="text-xs text-muted-foreground">Trust Score</div>
				</div>
			{/if}
		</div>

		{#if showPubkey}
			<div class="flex flex-col gap-1">
				<Badge
					variant="secondary"
					class="max-w-full truncate text-xs"
					onclick={() => copyToClipboard(npubEncode(hexPubkey))}
				>
					Npub: {truncatePubkey(npubEncode(hexPubkey))}
					<Copy class="h-4 w-4 shrink-0" />
				</Badge>
				<Badge
					variant="secondary"
					class="max-w-full truncate text-xs"
					onclick={() => copyToClipboard(hexPubkey)}
				>
					Pubkey: {truncatePubkey(hexPubkey)}
					<Copy class="h-4 w-4 shrink-0" />
				</Badge>
			</div>
			<div class="flex flex-col gap-2 sm:flex-row">
				<Button
					href={`https://nostr.at/${npubEncode(hexPubkey)}`}
					target="_blank"
					variant="ghost"
					class="w-full text-xs sm:w-auto"
				>
					Open in external client
					<ExternalLink class="h-4 w-4" />
				</Button>
				<Button
					href={`nostr:${npubEncode(hexPubkey)}`}
					variant="ghost"
					class="w-full text-xs sm:w-auto"
				>
					Open in native client
					<ExternalLink class="h-4 w-4" />
				</Button>
			</div>
		{/if}

		<!-- All profile metadata in detailed mode -->
		{#if $profile && Object.keys($profile).length > 0}
			<div class="space-y-3">
				<div class="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
					{#if $profile?.name}
						<div>
							<span class="font-medium">Name:</span>
							<span class="ml-2 wrap-break-word text-muted-foreground">{$profile?.name}</span>
						</div>
					{/if}
					{#if $profile?.display_name}
						<div>
							<span class="font-medium">Display Name:</span>
							<span class="ml-2 wrap-break-word text-muted-foreground"
								>{$profile?.display_name}</span
							>
						</div>
					{/if}
					{#if $profile?.nip05}
						<div>
							<span class="font-medium">NIP-05:</span>
							<span class="ml-2 break-all text-muted-foreground">{$profile?.nip05}</span>
						</div>
					{/if}
					{#if $profile?.lud16}
						<div>
							<span class="font-medium">Lightning:</span>
							<span class="ml-2 break-all text-muted-foreground">{$profile?.lud16}</span>
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
								<span class="break-all">{$profile?.website}</span>
							</a>
						</div>
					{/if}
				</div>

				<!-- Additional metadata fields -->
				<div class="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
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
			<span class="max-w-[150px] truncate font-semibold">{getDisplayName()}</span>
			{#if $profile?.nip05}
				<span class="max-w-[150px] truncate text-sm text-gray-400">
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
			<span class="max-w-[150px] truncate font-semibold">{getDisplayName()}</span>
			{#if $profile?.nip05}
				<span class="max-w-[150px] truncate text-sm text-gray-400">
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
