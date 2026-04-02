<script lang="ts">
	import { goto } from '$app/navigation';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent } from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { getPluginDetailsHref, getMarketplacePluginName } from '$lib/plugins/marketplace';
	import type { MarketplacePlugin } from '$lib/queries/plugins';

	let {
		pluginReferenceInput = $bindable(),
		pluginReferenceError,
		pluginReference,
		isLoadingPlugin,
		isInstalling,
		onValidateReference,
		onInstallReference,
		formatWeightPercentage
	} = $props<{
		pluginReferenceInput: string;
		pluginReferenceError: string | null;
		pluginReference: MarketplacePlugin | null | undefined;
		isLoadingPlugin: boolean;
		isInstalling: boolean;
		onValidateReference: () => void;
		onInstallReference: () => void;
		formatWeightPercentage: (weight: number) => string;
	}>();

	async function openPluginPage(plugin: MarketplacePlugin) {
		await goto(getPluginDetailsHref(plugin));
	}
</script>

<Card>
	<CardContent class="space-y-4 py-6">
		<div class="space-y-1">
			<div class="flex flex-wrap items-center gap-2">
				<h3 class="text-base font-semibold">Install plugin from event</h3>
				<Badge variant="secondary">Admin only</Badge>
			</div>
			<p class="text-sm text-muted-foreground">
				Load a plugin from an event id, note, or nevent, then install it directly on the current
				server.
			</p>
		</div>

		<div class="space-y-2">
			<Label for="plugin-reference-input">Event reference</Label>
			<div class="flex flex-col gap-2 md:flex-row">
				<Input
					id="plugin-reference-input"
					bind:value={pluginReferenceInput}
					placeholder="Hex event id, note, or nevent"
					oninput={onValidateReference}
				/>
				<Button
					variant="outline"
					disabled={Boolean(pluginReferenceError) || !pluginReferenceInput.trim() || isInstalling}
					onclick={onInstallReference}
				>
					Install
				</Button>
			</div>
			{#if pluginReferenceError}
				<p class="text-sm text-destructive">{pluginReferenceError}</p>
			{/if}
		</div>

		{#if pluginReferenceInput.trim() && !pluginReferenceError}
			{#if isLoadingPlugin}
				<div class="flex items-center gap-2 text-sm text-muted-foreground">
					<Spinner class="size-4" />
					<span>Loading plugin metadata…</span>
				</div>
			{:else if pluginReference}
				<div class="rounded-lg border border-border/70 p-4">
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div class="space-y-2">
							<p class="font-medium">{getMarketplacePluginName(pluginReference)}</p>
							<div class="flex flex-wrap gap-2">
								<Badge variant="outline">{pluginReference.authorPubkey}</Badge>
								{#if pluginReference.defaultWeight != null}
									<Badge variant="secondary">
										Default {formatWeightPercentage(pluginReference.defaultWeight)}
									</Badge>
								{/if}
							</div>
						</div>
						<div class="flex flex-wrap gap-2">
							<Button variant="outline" onclick={() => openPluginPage(pluginReference)}>
								Open page
							</Button>
							<Button disabled={isInstalling} onclick={onInstallReference}>Install now</Button>
						</div>
					</div>
					{#if pluginReference.description}
						<p class="mt-3 text-sm text-muted-foreground">{pluginReference.description}</p>
					{/if}
				</div>
			{:else}
				<p class="text-sm text-muted-foreground">
					Plugin metadata could not be loaded from the configured discovery relays, but the event
					can still be installed directly.
				</p>
			{/if}
		{/if}
	</CardContent>
</Card>
