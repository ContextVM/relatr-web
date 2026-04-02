<script lang="ts">
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import type { PluginsListOutput } from '$lib/ctxcn/RelatrClient';
	import { getPluginDetailsHref } from '$lib/plugins/marketplace';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import { ChevronDown } from 'lucide-svelte';

	type InstalledPlugin = PluginsListOutput['plugins'][number];

	function getPluginHref(plugin: InstalledPlugin) {
		if (!plugin.pubkey) return null;
		return getPluginDetailsHref({
			authorPubkey: plugin.pubkey,
			n: plugin.name,
			title: plugin.title ?? undefined,
			pluginKey: plugin.pluginKey
		});
	}

	let {
		installedPlugins,
		totalInstalledWeight,
		getPluginColor,
		formatWeightPercentage,
		compact = false,
		title = 'Weight distribution',
		description = 'Linear overview of installed plugin weight allocation in the current server.'
	} = $props<{
		installedPlugins: InstalledPlugin[];
		totalInstalledWeight: number;
		getPluginColor: (
			pluginPubkey: string | undefined,
			pluginName: string | undefined,
			pluginKey: string
		) => string;
		formatWeightPercentage: (weight: number) => string;
		compact?: boolean;
		title?: string;
		description?: string;
	}>();

	let isOpen = $state(false);
</script>

{#if compact}
	<Collapsible.Root bind:open={isOpen}>
		<div class="p-2">
			<Collapsible.Trigger
				class="block w-full cursor-pointer justify-center rounded-md transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
			>
				<div
					class="flex h-2 overflow-hidden rounded-full bg-muted transition-opacity hover:opacity-90"
				>
					{#each installedPlugins as plugin (plugin.pluginKey)}
						<div
							class="h-full min-w-3 transition-all"
							style={`background-color: ${getPluginColor(plugin.pubkey, plugin.name || plugin.title, plugin.pluginKey)}; width: ${totalInstalledWeight > 0 ? (plugin.effectiveWeight / totalInstalledWeight) * 100 : 0}%`}
							title={`${plugin.title || plugin.name || plugin.pluginKey}: ${formatWeightPercentage(plugin.effectiveWeight)}`}
						></div>
					{/each}
				</div>
				{#if !isOpen}
					<ChevronDown class="h-3 w-full" />
				{:else}
					<ChevronUp class="h-3 w-full" />
				{/if}
			</Collapsible.Trigger>

			<Collapsible.Content class="space-y-3 pt-3">
				<p class="text-xs text-muted-foreground">{description}</p>
				<div class="flex flex-wrap gap-3 text-xs text-muted-foreground">
					{#each installedPlugins as plugin (plugin.pluginKey)}
						{@const pluginHref = getPluginHref(plugin)}
						<div class="flex items-center gap-2">
							<span
								class="size-2.5 rounded-full"
								style={`background-color: ${getPluginColor(plugin.pubkey, plugin.name || plugin.title, plugin.pluginKey)}`}
							></span>
							{#if pluginHref}
								<a
									class="transition-colors hover:text-foreground hover:underline"
									href={pluginHref}
								>
									{plugin.title || plugin.name || plugin.pluginKey} · {formatWeightPercentage(
										plugin.effectiveWeight
									)}
								</a>
							{:else}
								<span>
									{plugin.title || plugin.name || plugin.pluginKey} · {formatWeightPercentage(
										plugin.effectiveWeight
									)}
								</span>
							{/if}
						</div>
					{/each}
				</div>
			</Collapsible.Content>
		</div>
	</Collapsible.Root>
{:else}
	<Card class="p-4">
		<CardHeader>
			<CardTitle>{title}</CardTitle>
			<CardDescription>{description}</CardDescription>
		</CardHeader>
		<CardContent class="space-y-3">
			<div class="flex h-4 overflow-hidden rounded-full bg-muted">
				{#each installedPlugins as plugin (plugin.pluginKey)}
					<div
						class="h-full min-w-6 transition-all"
						style={`background-color: ${getPluginColor(plugin.pubkey, plugin.name || plugin.title, plugin.pluginKey)}; width: ${totalInstalledWeight > 0 ? (plugin.effectiveWeight / totalInstalledWeight) * 100 : 0}%`}
						title={`${plugin.title || plugin.name || plugin.pluginKey}: ${formatWeightPercentage(plugin.effectiveWeight)}`}
					></div>
				{/each}
			</div>
			<div class="flex flex-wrap gap-3 text-xs text-muted-foreground">
				{#each installedPlugins as plugin (plugin.pluginKey)}
					{@const pluginHref = getPluginHref(plugin)}
					<div class="flex items-center gap-2">
						<span
							class="size-2.5 rounded-full"
							style={`background-color: ${getPluginColor(plugin.pubkey, plugin.name || plugin.title, plugin.pluginKey)}`}
						></span>
						{#if pluginHref}
							<a class="transition-colors hover:text-foreground hover:underline" href={pluginHref}>
								{plugin.title || plugin.name || plugin.pluginKey} · {formatWeightPercentage(
									plugin.effectiveWeight
								)}
							</a>
						{:else}
							<span>
								{plugin.title || plugin.name || plugin.pluginKey} · {formatWeightPercentage(
									plugin.effectiveWeight
								)}
							</span>
						{/if}
					</div>
				{/each}
			</div>
		</CardContent>
	</Card>
{/if}
