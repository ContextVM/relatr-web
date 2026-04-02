<script lang="ts">
	import { page } from '$app/state';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import { useMarketplacePlugins } from '$lib/queries/plugins';
	import {
		decodeMarketplaceRouteId,
		getAuthorDetailsHref,
		getPluginDetailsHref,
		getMarketplacePluginName,
		loadDiscoveryRelays,
		parseRelayList
	} from '$lib/plugins/marketplace';
	import { getEventDisplay, getPubkeyDisplay } from '$lib/utils.nostr';

	function formatWeightPercentage(weight: number) {
		return `${Math.round(Math.max(weight, 0) * 100)}%`;
	}

	const discoveryRelays = parseRelayList(loadDiscoveryRelays());
	const marketplaceQuery = useMarketplacePlugins(discoveryRelays);
	const routePluginId = $derived(page.params.id || '');
	const decodedRoute = $derived(decodeMarketplaceRouteId(routePluginId));
	const authorPlugins = $derived.by(() => {
		if (!decodedRoute) return [];

		return (marketplaceQuery.data ?? []).filter(
			(entry) => entry.authorPubkey === decodedRoute.authorPubkey
		);
	});
	const plugin = $derived.by(() => {
		if (!decodedRoute || decodedRoute.kind !== 'plugin') return null;

		return (marketplaceQuery.data ?? []).find((entry) => {
			return (
				entry.authorPubkey === decodedRoute.authorPubkey &&
				getMarketplacePluginName(entry) === decodedRoute.pluginName
			);
		});
	});
	let isRawEventOpen = $state(false);
</script>

<div class="flex min-h-screen flex-col bg-background">
	<main class="container mx-auto max-w-4xl flex-1 px-6 py-8">
		<div class="flex flex-col items-center justify-center">
			<div class="w-full max-w-2xl space-y-6">
				<div class="flex items-center justify-between gap-3">
					<Button href="/plugins" variant="ghost" class="w-fit">
						<ChevronLeft class="size-4" />
						Back to marketplace
					</Button>
					<Badge variant="outline">{discoveryRelays.length} relays</Badge>
				</div>

				{#if !decodedRoute}
					<Card>
						<CardContent class="py-6 text-sm text-destructive"
							>Invalid plugin identifier.</CardContent
						>
					</Card>
				{:else if marketplaceQuery.isPending}
					<div class="flex items-center justify-center py-12">
						<Spinner class="size-6" />
					</div>
				{:else if marketplaceQuery.isError}
					<Card>
						<CardContent class="py-6 text-sm text-destructive">
							Failed to load plugin details.
						</CardContent>
					</Card>
				{:else if decodedRoute.kind === 'author'}
					<Card class="py-4">
						<CardHeader class="space-y-3">
							<div class="space-y-2">
								<CardTitle class="text-2xl">Author plugins</CardTitle>
								<CardDescription>
									All marketplace plugins published by {getPubkeyDisplay(
										decodedRoute.authorPubkey
									)}.
								</CardDescription>
							</div>
							<div class="flex flex-wrap gap-2">
								<Badge variant="secondary">{authorPlugins.length} plugins</Badge>
								<Badge variant="outline">{decodedRoute.authorPubkey}</Badge>
							</div>
						</CardHeader>
						<CardContent class="space-y-4 text-sm">
							{#if authorPlugins.length === 0}
								<p class="text-muted-foreground">
									No plugins found for this author in the current discovery relays.
								</p>
							{:else}
								<div class="grid gap-3">
									{#each authorPlugins as authorPlugin (authorPlugin.pluginKey)}
										<a
											class="block rounded-lg border border-border/70 px-4 py-3 transition-colors hover:bg-accent/40"
											href={getPluginDetailsHref(authorPlugin)}
										>
											<div class="space-y-3">
												<div class="flex items-start justify-between gap-3">
													<div class="space-y-1">
														<p class="font-medium text-foreground">
															{authorPlugin.title || authorPlugin.n || authorPlugin.pluginKey}
														</p>
														<p class="text-muted-foreground">
															{authorPlugin.description || 'No description provided.'}
														</p>
													</div>
													{#if authorPlugin.defaultWeight != null}
														<Badge variant="outline">
															{formatWeightPercentage(authorPlugin.defaultWeight)}
														</Badge>
													{/if}
												</div>
												<div class="flex flex-wrap gap-2">
													<Badge variant="secondary">{authorPlugin.n || 'Unnamed plugin'}</Badge>
													{#if authorPlugin.relatrVersion}
														<Badge variant="outline">Relatr {authorPlugin.relatrVersion}</Badge>
													{/if}
												</div>
											</div>
										</a>
									{/each}
								</div>
							{/if}
						</CardContent>
					</Card>
				{:else if !plugin}
					<Card>
						<CardContent class="py-6 text-sm text-muted-foreground">
							Plugin not found in the current discovery relays.
						</CardContent>
					</Card>
				{:else}
					<Card class="py-4">
						<CardHeader class="space-y-3">
							<div class="space-y-2">
								<CardTitle class="text-2xl"
									>{plugin.title || plugin.n || plugin.pluginKey}</CardTitle
								>
								<CardDescription>
									{plugin.description || 'No description provided.'}
								</CardDescription>
							</div>
							<div class="flex flex-wrap gap-2 text-xs text-muted-foreground">
								<Badge variant="outline">
									<a href={getAuthorDetailsHref(plugin.authorPubkey)}>Author page</a>
								</Badge>
								<Badge variant="secondary">{plugin.n || 'Unnamed plugin'}</Badge>
								{#if plugin.defaultWeight != null}
									<Badge variant="outline"
										>Weight {formatWeightPercentage(plugin.defaultWeight)}</Badge
									>
								{/if}
								{#if plugin.relatrVersion}
									<Badge variant="outline">Relatr {plugin.relatrVersion}</Badge>
								{/if}
							</div>
						</CardHeader>
						<CardContent class="space-y-6 text-sm">
							<div class="rounded-lg border border-border/70 bg-muted/30 p-4">
								<p class="font-medium text-foreground">Need help reading this plugin?</p>
								<p class="mt-2 text-muted-foreground">
									Use the docs hub to learn the Elo model, check available capabilities, and
									understand how portable plugins are packaged and published.
								</p>
								<div class="mt-3 flex flex-wrap gap-3">
									<a class="underline underline-offset-4" href="/plugins/docs">Docs hub</a>
									<a class="underline underline-offset-4" href="/plugins/docs/getting-started">
										Getting started
									</a>
									<a class="underline underline-offset-4" href="/plugins/docs/capabilities">
										Capability reference
									</a>
								</div>
							</div>

							<div class="grid gap-4 md:grid-cols-2">
								<div class="space-y-1">
									<p class="font-medium text-foreground">Author</p>
									<p class="text-muted-foreground">{getPubkeyDisplay(plugin.authorPubkey)}</p>
								</div>
								<div class="space-y-1">
									<p class="font-medium text-foreground">Event</p>
									<p class="text-muted-foreground">{getEventDisplay(plugin.eventId)}</p>
								</div>
								<div class="space-y-1">
									<p class="font-medium text-foreground">Plugin key</p>
									<p class="break-all text-muted-foreground">{plugin.pluginKey}</p>
								</div>
								<div class="space-y-1">
									<p class="font-medium text-foreground">Nevent</p>
									<p class="break-all text-muted-foreground">{plugin.nevent}</p>
								</div>
							</div>

							<div class="space-y-2">
								<p class="font-medium text-foreground">Plugin content</p>
								<pre class="overflow-x-auto rounded-md bg-secondary p-4 text-xs"><code
										>{plugin.content}</code
									></pre>
							</div>

							<Collapsible.Root bind:open={isRawEventOpen} class="space-y-2">
								<Collapsible.Trigger class="w-full">
									<span>Toggle raw event</span>
								</Collapsible.Trigger>
								<Collapsible.Content>
									<pre class="overflow-x-auto rounded-md bg-secondary p-4 text-xs"><code
											>{JSON.stringify(plugin.rawEvent, null, 2)}</code
										></pre>
								</Collapsible.Content>
							</Collapsible.Root>
						</CardContent>
					</Card>
				{/if}
			</div>
		</div>
	</main>
</div>
