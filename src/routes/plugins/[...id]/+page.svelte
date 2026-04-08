<script lang="ts">
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import ProfileCard from '$lib/components/ProfileCard.svelte';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import {
		getInstallInputFromPlugin,
		isPluginUpdateAvailable,
		type MarketplacePlugin,
		useMarketplacePlugins,
		useMarketplacePluginVersions,
		usePluginsList
	} from '$lib/queries/plugins';
	import { getRelatrClient, getServerPubkey } from '$lib/stores/server-config.svelte';
	import { useServerStats } from '$lib/queries/server-stats';
	import { activeAccount } from '$lib/services/accountManager.svelte';
	import { useInstallPlugin, useUninstallPlugins } from '$lib/mutations/plugins';
	import {
		decodeMarketplaceRouteId,
		getAuthorDetailsHref,
		getPluginDetailsHref,
		getMarketplacePluginName,
		loadDiscoveryRelays,
		parseRelayList
	} from '$lib/plugins/marketplace';
	import { getEventDisplay } from '$lib/utils.nostr';

	function formatWeightPercentage(weight: number) {
		return `${Math.round(Math.max(weight, 0) * 100)}%`;
	}

	function formatDate(timestamp: number) {
		return new Date(timestamp * 1000).toLocaleString();
	}

	function getVersionState(version: MarketplacePlugin) {
		if (version.eventId === plugin?.eventId) return 'current';
		if (installedPlugin?.installedEventId === version.eventId) return 'installed';
		if (isPluginUpdateAvailable(version, installedPlugin)) return 'update';
		return 'available';
	}

	const discoveryRelays = parseRelayList(loadDiscoveryRelays());
	const marketplaceQuery = useMarketplacePlugins(discoveryRelays);
	const marketplaceVersionsQuery = useMarketplacePluginVersions(discoveryRelays);
	const relatrClient = $derived(getRelatrClient());
	const serverPubkey = $derived(getServerPubkey());
	const currentUserPubkey = $derived($activeAccount?.pubkey);
	const statsQuery = $derived(useServerStats(relatrClient, serverPubkey, currentUserPubkey));
	const isAdmin = $derived(Boolean(statsQuery.data?.isAdmin));
	const pluginsListQuery = $derived(usePluginsList(relatrClient, serverPubkey));
	const installPluginMutation = useInstallPlugin();
	const uninstallPluginsMutation = useUninstallPlugins();
	const routePluginId = $derived(page.params.id || '');
	const selectedVersionEventId = $derived(page.url.searchParams.get('version')?.trim() || '');
	const decodedRoute = $derived(decodeMarketplaceRouteId(routePluginId));
	const authorPlugins = $derived.by(() => {
		if (!decodedRoute) return [];

		return (marketplaceQuery.data ?? []).filter(
			(entry) => entry.authorPubkey === decodedRoute.authorPubkey
		);
	});
	const plugin = $derived.by(() => {
		if (!decodedRoute || decodedRoute.kind !== 'plugin') return null;

		const matchingVersions = (marketplaceVersionsQuery.data ?? []).filter((entry) => {
			return (
				entry.authorPubkey === decodedRoute.authorPubkey &&
				getMarketplacePluginName(entry) === decodedRoute.pluginName
			);
		});

		if (selectedVersionEventId) {
			const versionMatch = matchingVersions.find(
				(entry) => entry.eventId === selectedVersionEventId
			);
			if (versionMatch) return versionMatch;
		}

		return (marketplaceQuery.data ?? []).find((entry) => {
			return (
				entry.authorPubkey === decodedRoute.authorPubkey &&
				getMarketplacePluginName(entry) === decodedRoute.pluginName
			);
		});
	});
	const installedPlugin = $derived.by(() => {
		if (!plugin) return null;

		return (
			(pluginsListQuery.data?.plugins ?? []).find(
				(entry) => entry.pluginKey === plugin.pluginKey
			) ?? null
		);
	});
	const updateAvailable = $derived.by(() => {
		if (!plugin) return false;

		return isPluginUpdateAvailable(plugin, installedPlugin);
	});
	const pluginVersions = $derived.by(() => {
		if (!plugin) return [];

		return (marketplaceVersionsQuery.data ?? []).filter((entry) => {
			return entry.authorPubkey === plugin.authorPubkey && entry.n === plugin.n;
		});
	});
	let isRawEventOpen = $state(false);

	async function installOrUpdatePlugin(targetPlugin: MarketplacePlugin) {
		if (!relatrClient || !serverPubkey || !isAdmin) {
			toast.error('Admin access is required to manage plugins on this server');
			return;
		}

		try {
			const result = await installPluginMutation.mutateAsync({
				relatrClient,
				serverPubkey,
				installInput: getInstallInputFromPlugin(targetPlugin),
				enable: true
			});
			const isUpdate = isPluginUpdateAvailable(targetPlugin, installedPlugin);
			toast.success(`${isUpdate ? 'Updated' : 'Installed'} plugin ${result.pluginKey}`);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to install plugin');
		}
	}

	async function uninstallInstalledPlugin() {
		if (!relatrClient || !serverPubkey || !installedPlugin) return;

		try {
			await uninstallPluginsMutation.mutateAsync({
				relatrClient,
				serverPubkey,
				pluginKeys: [installedPlugin.pluginKey]
			});
			toast.success(`Uninstalled ${installedPlugin.pluginKey}`);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to uninstall plugin');
		}
	}
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
					<Card>
						<CardHeader class="space-y-3">
							<div class="space-y-2">
								<CardTitle class="text-2xl">Author plugins</CardTitle>
								<CardDescription>All marketplace plugins published by this author.</CardDescription>
							</div>
							<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<div class="min-w-0 rounded-lg border border-border/70 px-4 py-3">
									<ProfileCard
										pubkey={decodedRoute.authorPubkey}
										mode="compact"
										showPubkey={true}
									/>
								</div>
								<div class="flex flex-wrap gap-2">
									<Badge variant="secondary">{authorPlugins.length} plugins</Badge>
								</div>
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
											class="block rounded-lg border border-border/70 p-4 transition-colors hover:bg-accent/40"
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
												<div class="flex flex-wrap gap-2 pt-1">
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
					<Card class="border-border/70 shadow-sm">
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
								{#if updateAvailable}
									<Badge variant="outline">Update available</Badge>
								{:else if installedPlugin}
									<Badge variant="outline">Installed</Badge>
								{/if}
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
							{#if isAdmin}
								<div
									class="flex flex-wrap items-center gap-3 rounded-lg border border-border/70 bg-muted/20 p-4"
								>
									<div class="min-w-0 flex-1 space-y-1">
										<p class="font-medium text-foreground">Server actions</p>
										<p class="text-muted-foreground">
											Install this version, update the existing installation, or remove the plugin
											from the current server.
										</p>
									</div>
									{#if updateAvailable}
										<Button
											disabled={installPluginMutation.isPending}
											onclick={() => installOrUpdatePlugin(plugin)}
										>
											Update plugin
										</Button>
									{:else if installedPlugin}
										<Button disabled>Installed</Button>
									{:else}
										<Button
											disabled={installPluginMutation.isPending}
											onclick={() => installOrUpdatePlugin(plugin)}
										>
											Install plugin
										</Button>
									{/if}

									{#if installedPlugin}
										<Button
											variant="destructive"
											disabled={uninstallPluginsMutation.isPending}
											onclick={uninstallInstalledPlugin}
										>
											Uninstall plugin
										</Button>
									{/if}
								</div>
							{/if}

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

							<div class="grid gap-4 rounded-lg border border-border/70 p-4 md:grid-cols-2">
								<div class="space-y-1">
									<p class="font-medium text-foreground">Author</p>
									<div class="rounded-lg border border-border/70 px-4 py-3">
										<ProfileCard pubkey={plugin.authorPubkey} mode="compact" showPubkey={true} />
									</div>
								</div>
								<div class="space-y-1">
									<p class="font-medium text-foreground">Event</p>
									<p class="text-muted-foreground">{getEventDisplay(plugin.eventId)}</p>
								</div>
								<div class="space-y-1">
									<p class="font-medium text-foreground">Published</p>
									<p class="text-muted-foreground">{formatDate(plugin.createdAt)}</p>
								</div>
								<div class="space-y-1">
									<p class="font-medium text-foreground">Plugin key</p>
									<p class="break-all text-muted-foreground">{plugin.pluginKey}</p>
								</div>
								<div class="space-y-1">
									<p class="font-medium text-foreground">Nevent</p>
									<p class="break-all text-muted-foreground">{plugin.nevent}</p>
								</div>
								{#if installedPlugin}
									<div class="space-y-1 md:col-span-2">
										<p class="font-medium text-foreground">Installed version</p>
										<p class="break-all text-muted-foreground">
											{installedPlugin.installedEventId || 'Unknown event id'}
										</p>
										{#if installedPlugin.createdAt != null}
											<p class="text-muted-foreground">
												Installed build published {formatDate(installedPlugin.createdAt)}
											</p>
										{/if}
									</div>
								{/if}
							</div>

							<div class="space-y-3 rounded-lg border border-border/70 p-4">
								<div class="space-y-1">
									<p class="font-medium text-foreground">Versions</p>
									<p class="text-muted-foreground">
										Inspect all discovered versions for this plugin name.
									</p>
								</div>
								<div class="space-y-3">
									{#each pluginVersions as version (version.eventId)}
										<div class="rounded-lg border border-border/70 bg-card p-4 shadow-sm">
											<div class="flex flex-wrap items-start justify-between gap-3">
												<div class="space-y-1">
													<p class="font-medium text-foreground">
														{version.title || version.n || version.pluginKey}
													</p>
													<p class="text-muted-foreground">{getEventDisplay(version.eventId)}</p>
													<p class="text-muted-foreground">
														Published {formatDate(version.createdAt)}
													</p>
												</div>
												<div class="flex flex-wrap gap-2">
													{#if getVersionState(version) === 'current'}
														<Badge variant="outline">Current page</Badge>
													{/if}
													{#if getVersionState(version) === 'installed'}
														<Badge variant="outline">Installed</Badge>
													{/if}
													{#if getVersionState(version) === 'update'}
														<Badge variant="secondary">Newer than installed</Badge>
													{/if}
													{#if version.relatrVersion}
														<Badge variant="secondary">Relatr {version.relatrVersion}</Badge>
													{/if}
												</div>
											</div>
											{#if version.description}
												<p class="mt-3 text-sm text-muted-foreground">{version.description}</p>
											{/if}
											<div class="mt-3 flex flex-wrap items-center gap-3 text-xs">
												<a
													class="underline underline-offset-4"
													href={getPluginDetailsHref(version)}
												>
													Open version page
												</a>
												{#if isAdmin && version.eventId !== installedPlugin?.installedEventId}
													<Button
														variant="outline"
														disabled={installPluginMutation.isPending}
														onclick={() => installOrUpdatePlugin(version)}
													>
														{installedPlugin ? 'Install this version' : 'Install'}
													</Button>
												{/if}
											</div>
										</div>
									{/each}
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
