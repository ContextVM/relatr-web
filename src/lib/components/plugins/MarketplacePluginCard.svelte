<script lang="ts">
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import type { MarketplacePlugin } from '$lib/queries/plugins';
	import { getAuthorDetailsHref, getPluginDetailsHref } from '$lib/plugins/marketplace';
	import { getEventDisplay } from '$lib/utils.nostr';
	import ProfileCard from '$lib/components/ProfileCard.svelte';
	import Badge from '../ui/badge/badge.svelte';

	let { plugin, isAdmin, isInstalling, onInstall, formatWeightPercentage } = $props<{
		plugin: MarketplacePlugin;
		isAdmin: boolean;
		isInstalling: boolean;
		onInstall: (plugin: MarketplacePlugin) => void;
		formatWeightPercentage: (weight: number) => string;
	}>();
	let isOpen = $state(false);
	const pluginDetailsHref = $derived(getPluginDetailsHref(plugin));
	const authorDetailsHref = $derived(getAuthorDetailsHref(plugin.authorPubkey));
</script>

<Card class="transition-colors hover:border-border">
	<CardHeader class="space-y-3 pb-3">
		<div class="flex items-start justify-between gap-4">
			<div class="space-y-1">
				<CardTitle class="text-base">{plugin.title || plugin.pluginKey}</CardTitle>
				<CardDescription>{plugin.description || 'No description provided.'}</CardDescription>
			</div>
		</div>
	</CardHeader>
	<CardContent class="space-y-4 pt-0 text-sm">
		<Collapsible.Root bind:open={isOpen} class="space-y-2">
			<div class="flex items-center justify-between">
				<span class="text-xs font-medium text-muted-foreground">Plugin Details</span>
				<div class="flex items-center gap-1">
					<Button href={pluginDetailsHref} variant="ghost" size="sm">Open page</Button>
					<Collapsible.Trigger>
						{#snippet child({ props })}
							<Button {...props} variant="ghost" size="sm" class="h-6 w-6 p-0">
								{#if isOpen}
									<ChevronUp class="size-3" />
								{:else}
									<ChevronDown class="size-3" />
								{/if}
								<span class="sr-only">Toggle details</span>
							</Button>
						{/snippet}
					</Collapsible.Trigger>
				</div>
			</div>

			<div class="grid gap-2 text-xs text-muted-foreground">
				<Badge variant="secondary">{plugin.n || 'Unnamed plugin'}</Badge>
				{#if plugin.updateAvailable}
					<Badge variant="outline">Update available</Badge>
				{:else if plugin.installed}
					<Badge variant="outline">Installed</Badge>
				{/if}
				{#if plugin.defaultWeight != null}
					<p>
						<span class="font-medium text-foreground">Suggested weight:</span>
						{formatWeightPercentage(plugin.defaultWeight)}
					</p>
				{/if}
			</div>

			<Collapsible.Content class="space-y-3 pt-1">
				<div class="grid gap-3 border-t pt-3 text-xs text-muted-foreground">
					<div class="space-y-1">
						<span class="font-medium text-foreground">Author</span>
						<a class="block" href={authorDetailsHref}>
							<ProfileCard pubkey={plugin.authorPubkey} mode="compact" showPubkey={true} />
						</a>
						<a class="inline-flex text-xs underline underline-offset-4" href={authorDetailsHref}
							>View all plugins</a
						>
					</div>
					<p>
						<span class="font-medium text-foreground">Event:</span>
						{getEventDisplay(plugin.eventId)}
					</p>
					<p>
						<span class="font-medium text-foreground">Relatr compatibility:</span>
						{plugin.relatrVersion || 'Not declared'}
					</p>
				</div>
				<p>
					<span class="font-medium text-foreground">Plugin content:</span>
				</p>
				<div class="overflow-x-auto rounded-md bg-secondary p-3">
					<code class="text-xs">
						{plugin.content}
					</code>
				</div>
			</Collapsible.Content>
		</Collapsible.Root>

		{#if isAdmin && plugin.updateAvailable}
			<Button class="w-full" disabled={isInstalling} onclick={() => onInstall(plugin)}>
				Update plugin
			</Button>
		{:else if isAdmin && plugin.installed}
			<Button class="w-full" disabled>Installed</Button>
		{:else if isAdmin}
			<Button class="w-full" disabled={isInstalling} onclick={() => onInstall(plugin)}>
				Install plugin
			</Button>
		{/if}
	</CardContent>
</Card>
