<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent } from '$lib/components/ui/card/index.js';
	import type { PluginsListOutput } from '$lib/ctxcn/RelatrClient';

	type InstalledPlugin = PluginsListOutput['plugins'][number];

	let {
		plugin,
		weightDraft = $bindable(),
		isConfiguring,
		isUninstalling,
		onSaveWeight,
		onResetWeight,
		onToggleEnabled,
		onUninstall,
		formatWeightPercentage
	} = $props<{
		plugin: InstalledPlugin;
		weightDraft: string;
		isConfiguring: boolean;
		isUninstalling: boolean;
		onSaveWeight: (plugin: InstalledPlugin) => void;
		onResetWeight: (plugin: InstalledPlugin) => void;
		onToggleEnabled: (plugin: InstalledPlugin) => void;
		onUninstall: (plugin: InstalledPlugin) => void;
		formatWeightPercentage: (weight: number) => string;
	}>();
</script>

<Card class="border-border/70">
	<CardContent class="flex flex-col gap-5 p-4 sm:p-6">
		<div class="space-y-3">
			<div class="flex flex-wrap items-start justify-between gap-3">
				<p class="font-medium">
					{plugin.title || plugin.name || plugin.pluginKey}
				</p>
				<div class="flex flex-wrap gap-2 text-xs text-muted-foreground">
					<span
						class={`rounded-full px-2 py-1 ${plugin.enabled ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}
					>
						{plugin.enabled ? 'Enabled' : 'Disabled'}
					</span>
					{#if plugin.versionInfo}
						<span class="rounded-full bg-muted px-2 py-1">Version {plugin.versionInfo}</span>
					{/if}
				</div>
			</div>
			<p class="text-sm text-muted-foreground">
				{plugin.description || plugin.pluginKey}
			</p>
			<div class="flex flex-wrap gap-2 text-xs text-muted-foreground">
				{#if plugin.defaultWeight != null}
					<span>Default: {formatWeightPercentage(plugin.defaultWeight)}</span>
				{/if}
				{#if plugin.createdAt != null}
					<span>Published: {new Date(plugin.createdAt * 1000).toLocaleString()}</span>
				{/if}
				{#if plugin.installedEventId}
					<span class="break-all">Event: {plugin.installedEventId}</span>
				{/if}
			</div>
		</div>
		<div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
			<div class="space-y-2">
				<Label for={`weight-${plugin.pluginKey}`}>Weight override</Label>
				<div class="flex flex-wrap gap-2">
					<Input
						id={`weight-${plugin.pluginKey}`}
						type="number"
						min="0"
						step="1"
						bind:value={weightDraft}
						class="max-w-32"
					/>
					<Button variant="outline" disabled={isConfiguring} onclick={() => onSaveWeight(plugin)}>
						Save weight
					</Button>
					{#if plugin.defaultWeight != null}
						<Button
							variant="outline"
							disabled={isConfiguring}
							onclick={() => onResetWeight(plugin)}
						>
							Reset
						</Button>
					{/if}
				</div>
			</div>
			<div class="flex flex-wrap gap-2">
				<Button variant="outline" disabled={isConfiguring} onclick={() => onToggleEnabled(plugin)}>
					{plugin.enabled ? 'Disable' : 'Enable'}
				</Button>
				<Button variant="destructive" disabled={isUninstalling} onclick={() => onUninstall(plugin)}>
					Uninstall
				</Button>
			</div>
		</div>
	</CardContent>
</Card>
