<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { isHexKey } from 'applesauce-core/helpers';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import type { PluginsListOutput } from '$lib/ctxcn/RelatrClient';
	import {
		getRelatrClient,
		getServerPubkey,
		setServerPubkey
	} from '$lib/stores/server-config.svelte';
	import { getServerHistory, removeServerFromHistory, type ServerHistoryItem } from '$lib/utils';
	import ServerStatusCard from '$lib/components/ServerStatusCard.svelte';
	import { useServerStats } from '$lib/queries/server-stats';
	import {
		useMarketplacePlugins,
		useMarketplacePluginByReference,
		usePluginsList,
		type MarketplacePlugin
	} from '$lib/queries/plugins';
	import { ELO_PLUGIN_KIND } from '$lib/constants';
	import {
		loadDiscoveryRelays,
		normalizeRelayUrl,
		parseRelayList,
		persistDiscoveryRelays
	} from '$lib/plugins/marketplace';
	import {
		useConfigurePlugins,
		useInstallPlugin,
		useUninstallPlugins
	} from '$lib/mutations/plugins';
	import { activeAccount } from '$lib/services/accountManager.svelte';
	import { NostrEventTypeGuard, validateAndDecodeEventId } from '$lib/utils.nostr';

	// Modular components
	import PluginMarketplaceHeader from '$lib/components/plugins/PluginMarketplaceHeader.svelte';
	import DiscoveryRelayManager from '$lib/components/plugins/DiscoveryRelayManager.svelte';
	import AdminPluginInstallCard from '$lib/components/plugins/AdminPluginInstallCard.svelte';
	import MarketplacePluginCard from '$lib/components/plugins/MarketplacePluginCard.svelte';
	import InstalledPluginCard from '$lib/components/plugins/InstalledPluginCard.svelte';

	type ActiveTab = 'marketplace' | 'admin';
	type InstalledPlugin = PluginsListOutput['plugins'][number];

	function formatWeightPercentage(weight: number): string {
		return `${Math.round(Math.max(weight, 0) * 100)}%`;
	}

	let activeTab = $state<ActiveTab>('marketplace');
	let serverPubkey = $derived(getServerPubkey());
	let serverPubkeyInput = $state('');
	let validationError = $state<string | null>(null);
	let serverHistory = $state<ServerHistoryItem[]>(getServerHistory());
	let relatrClient = $derived(getRelatrClient());
	let currentUserPubkey = $derived($activeAccount?.pubkey);
	let discoveryRelayInput = $state('');
	let relayInputError = $state<string | null>(null);
	let discoveryRelayList = $state(parseRelayList(loadDiscoveryRelays()));
	let searchQuery = $state('');
	let weightDrafts = $state<Record<string, string>>({});
	let pluginReferenceInput = $state('');
	let pluginReferenceError = $state<string | null>(null);
	let isPluginsIntroOpen = $state(false);

	$effect(() => {
		if (!serverPubkeyInput) serverPubkeyInput = serverPubkey;
	});

	const statsQuery = $derived(useServerStats(relatrClient, serverPubkey, currentUserPubkey));
	const isAdmin = $derived(Boolean(statsQuery.data?.isAdmin));
	const pluginsListQuery = $derived(usePluginsList(relatrClient, serverPubkey));

	const discoveryRelays = $derived.by(() => discoveryRelayList);
	const installedPlugins = $derived(pluginsListQuery.data?.plugins ?? []);
	$effect(() => {
		persistDiscoveryRelays(discoveryRelays);
	});

	const marketplaceQuery = $derived(useMarketplacePlugins(discoveryRelays));
	const pluginReferenceQuery = $derived(
		useMarketplacePluginByReference(pluginReferenceInput.trim(), discoveryRelays)
	);

	const filteredMarketplacePlugins = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();
		const plugins = marketplaceQuery.data ?? [];
		const installedSet = new Set(
			(pluginsListQuery.data?.plugins ?? []).map((p: InstalledPlugin) => p.pluginKey)
		);
		const mapped = plugins.map((plugin) => ({
			...plugin,
			installed: isAdmin ? installedSet.has(plugin.pluginKey) : false
		}));

		if (!query) return mapped;

		return mapped.filter((plugin: MarketplacePlugin) => {
			return [plugin.pluginKey, plugin.title, plugin.description, plugin.authorPubkey]
				.filter(Boolean)
				.some((value) => value?.toLowerCase().includes(query));
		});
	});

	const installPluginMutation = useInstallPlugin();
	const configurePluginsMutation = useConfigurePlugins();
	const uninstallPluginsMutation = useUninstallPlugins();

	$effect(() => {
		const nextDrafts = Object.fromEntries(
			installedPlugins.map((plugin) => [
				plugin.pluginKey,
				String(Math.round(plugin.effectiveWeight * 100))
			])
		);
		weightDrafts = nextDrafts;
	});

	function handleServerPubkeyChange() {
		const trimmed = serverPubkeyInput.trim();

		if (trimmed && !isHexKey(trimmed)) {
			validationError = 'Invalid hex public key format';
			return;
		}

		validationError = null;
		setServerPubkey(trimmed);
		serverHistory = getServerHistory();
	}

	function removeServerFromHistoryHandler(pubkey: string, event: Event) {
		event.stopPropagation();
		removeServerFromHistory(pubkey);
		serverHistory = getServerHistory();
	}

	function validateInput() {
		const trimmed = serverPubkeyInput.trim();
		validationError = trimmed && !isHexKey(trimmed) ? 'Invalid hex public key format' : null;
	}

	function addDiscoveryRelay() {
		const normalizedRelay = normalizeRelayUrl(discoveryRelayInput);
		if (!normalizedRelay) {
			relayInputError = 'Enter a valid ws:// or wss:// relay URL';
			return;
		}

		if (discoveryRelayList.includes(normalizedRelay)) {
			relayInputError = 'Relay already added';
			discoveryRelayInput = '';
			return;
		}

		discoveryRelayList = [...discoveryRelayList, normalizedRelay];
		discoveryRelayInput = '';
		relayInputError = null;
	}

	function removeDiscoveryRelay(relay: string) {
		discoveryRelayList = discoveryRelayList.filter((item) => item !== relay);
		relayInputError = null;
	}

	async function saveWeight(plugin: InstalledPlugin) {
		if (!relatrClient || !serverPubkey) return;

		const rawDraft = weightDrafts[plugin.pluginKey];
		const rawValue = typeof rawDraft === 'string' ? rawDraft.trim() : String(rawDraft ?? '').trim();
		const parsedPercent = Number(rawValue);

		if (!rawValue || !Number.isInteger(parsedPercent) || parsedPercent < 0) {
			toast.error('Weight must be a non-negative integer percentage');
			return;
		}

		const nextWeight = parsedPercent / 100;

		try {
			await configurePluginsMutation.mutateAsync({
				relatrClient,
				serverPubkey,
				changes: [{ pluginKey: plugin.pluginKey, weightOverride: nextWeight }]
			});
			toast.success(`Updated weight for ${plugin.pluginKey}`);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to update weight');
		}
	}

	async function installPlugin(plugin: MarketplacePlugin) {
		if (!relatrClient || !serverPubkey || !isAdmin) {
			toast.error('Admin access is required to install plugins on this server');
			return;
		}

		try {
			const result = await installPluginMutation.mutateAsync({
				relatrClient,
				serverPubkey,
				plugin,
				enable: true
			});
			toast.success(`Installed plugin ${result.pluginKey}`);
			activeTab = 'admin';
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to install plugin');
		}
	}

	function validatePluginReferenceInput() {
		const trimmed = pluginReferenceInput.trim();

		if (!trimmed) {
			pluginReferenceError = null;
			return;
		}

		pluginReferenceError = NostrEventTypeGuard.isValidEventIdentifier(trimmed)
			? null
			: 'Enter a valid event id, note, or nevent identifier';
	}

	async function installPluginReference() {
		if (!relatrClient || !serverPubkey || !isAdmin) {
			toast.error('Admin access is required to install plugins on this server');
			return;
		}

		const trimmed = pluginReferenceInput.trim();
		if (!trimmed) {
			pluginReferenceError = 'Enter an event id, note, or nevent identifier';
			return;
		}

		const eventId = validateAndDecodeEventId(trimmed);
		if (!eventId) {
			pluginReferenceError = 'Enter a valid event id, note, or nevent identifier';
			return;
		}

		pluginReferenceError = null;

		try {
			const result = await installPluginMutation.mutateAsync({
				relatrClient,
				serverPubkey,
				installInput: NostrEventTypeGuard.isNevent(trimmed) ? { nevent: trimmed } : { eventId },
				enable: true
			});
			toast.success(`Installed plugin ${result.pluginKey}`);
			pluginReferenceInput = '';
			pluginReferenceError = null;
			activeTab = 'admin';
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to install plugin');
		}
	}

	async function toggleInstalledPlugin(plugin: InstalledPlugin) {
		if (!relatrClient || !serverPubkey) return;

		try {
			await configurePluginsMutation.mutateAsync({
				relatrClient,
				serverPubkey,
				changes: [{ pluginKey: plugin.pluginKey, enabled: !plugin.enabled }]
			});
			toast.success(`${plugin.pluginKey} ${plugin.enabled ? 'disabled' : 'enabled'}`);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to update plugin');
		}
	}

	async function resetWeight(plugin: InstalledPlugin) {
		if (!relatrClient || !serverPubkey || plugin.defaultWeight == null) return;

		try {
			await configurePluginsMutation.mutateAsync({
				relatrClient,
				serverPubkey,
				changes: [{ pluginKey: plugin.pluginKey, weightOverride: plugin.defaultWeight }]
			});
			weightDrafts = {
				...weightDrafts,
				[plugin.pluginKey]: String(Math.round(plugin.defaultWeight * 100))
			};
			toast.success(`Reset weight for ${plugin.pluginKey}`);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to reset weight');
		}
	}

	async function uninstallPlugin(plugin: InstalledPlugin) {
		if (!relatrClient || !serverPubkey) return;

		try {
			await uninstallPluginsMutation.mutateAsync({
				relatrClient,
				serverPubkey,
				pluginKeys: [plugin.pluginKey]
			});
			toast.success(`Uninstalled ${plugin.pluginKey}`);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to uninstall plugin');
		}
	}
</script>

{#if relatrClient}
	<div class="flex min-h-screen flex-col bg-background">
		<main class="container mx-auto max-w-4xl flex-1 px-6 py-8">
			<div class="flex flex-col items-center justify-center">
				<div class="w-full max-w-2xl space-y-6">
					<ServerStatusCard
						bind:serverPubkeyInput
						bind:validationError
						{serverHistory}
						onServerChange={handleServerPubkeyChange}
						onHistoryRemove={removeServerFromHistoryHandler}
						onValidate={validateInput}
					/>

					<PluginMarketplaceHeader />

					<Card class="py-4">
						<CardHeader class="space-y-4">
							<div class="space-y-3">
								<CardTitle class="text-2xl">Understand plugins before you install them</CardTitle>
								<CardDescription class="text-sm leading-6">
									Portable Elo plugins are reusable scoring programs published as Nostr events.
									Browse plugins here, then open the docs when you want the writing model,
									capability reference, and publishing format.
								</CardDescription>
							</div>

							<div class="flex flex-wrap gap-3">
								<Button href="/plugins/docs">Learn how plugins work</Button>
								<Button href="/plugins/publisher" variant="outline">Open publisher</Button>
								<Button href="/plugins/docs/getting-started" variant="outline">
									Write a plugin
								</Button>
								<Button href="/plugins/docs/capabilities" variant="ghost">
									Capability reference
								</Button>
							</div>

							<Collapsible.Root bind:open={isPluginsIntroOpen} class="space-y-2">
								<Collapsible.Trigger
									class="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
								>
									More context about plugins
									{#if isPluginsIntroOpen}
										<ChevronDown class="h-4 w-4" />
									{:else}
										<ChevronRight class="h-4 w-4" />
									{/if}
								</Collapsible.Trigger>

								<Collapsible.Content>
									<div class="grid gap-4 pt-2 md:grid-cols-2">
										<div class="rounded-lg border border-border/70 p-4">
											<h3 class="font-semibold">For operators</h3>
											<p class="mt-2 text-sm text-muted-foreground">
												Inspect plugin metadata, compare default weights, install plugins on your
												server, and tune how much each signal contributes to the final trust score.
											</p>
										</div>
										<div class="rounded-lg border border-border/70 p-4">
											<h3 class="font-semibold">For authors</h3>
											<p class="mt-2 text-sm text-muted-foreground">
												Learn the Elo plugin model, the available host capabilities, and how to
												package portable plugins as kind <code>{ELO_PLUGIN_KIND}</code> events for others
												to discover and install.
											</p>
										</div>
										<div class="rounded-lg border border-border/70 p-4">
											<h3 class="font-semibold">How it fits into Relatr</h3>
											<p class="mt-2 text-sm text-muted-foreground">
												Plugins define individual scoring signals. Relatr combines those signals
												with weights so each server can expose a trust model that is transparent,
												portable, and adjustable.
											</p>
										</div>
										<div class="rounded-lg border border-border/70 p-4">
											<h3 class="font-semibold">Discovery relays</h3>
											<p class="mt-2 text-sm text-muted-foreground">
												The marketplace uses your selected discovery relays to find published plugin
												events. Changing relays changes what you can browse and install.
											</p>
										</div>
									</div>
								</Collapsible.Content>
							</Collapsible.Root>
						</CardHeader>
					</Card>

					<Tabs bind:value={activeTab} class="w-full">
						<TabsList class={isAdmin ? 'grid w-full grid-cols-2' : 'grid w-full grid-cols-1'}>
							<TabsTrigger value="marketplace">Marketplace</TabsTrigger>
							{#if isAdmin}
								<TabsTrigger value="admin">Admin</TabsTrigger>
							{/if}
						</TabsList>

						<TabsContent value="marketplace" class="mt-6 space-y-6">
							<DiscoveryRelayManager
								{discoveryRelays}
								bind:discoveryRelayInput
								{relayInputError}
								bind:searchQuery
								onAddRelay={addDiscoveryRelay}
								onRemoveRelay={removeDiscoveryRelay}
							/>

							{#if marketplaceQuery.isPending}
								<div class="flex items-center justify-center py-12">
									<Spinner class="size-6" />
								</div>
							{:else if marketplaceQuery.isError}
								<Card>
									<CardContent class="py-6 text-sm text-destructive">
										Failed to load marketplace plugins.
									</CardContent>
								</Card>
							{:else if filteredMarketplacePlugins.length === 0}
								<Card>
									<CardContent class="py-6 text-sm text-muted-foreground">
										No plugins found for the current relay set.
									</CardContent>
								</Card>
							{:else}
								<div class="grid gap-4 md:grid-cols-2">
									{#each filteredMarketplacePlugins as plugin (plugin.pluginKey)}
										<MarketplacePluginCard
											{plugin}
											{isAdmin}
											isInstalling={installPluginMutation.isPending}
											onInstall={installPlugin}
											{formatWeightPercentage}
										/>
									{/each}
								</div>
							{/if}
						</TabsContent>

						{#if isAdmin}
							<TabsContent value="admin" class="mt-6 space-y-6">
								<AdminPluginInstallCard
									bind:pluginReferenceInput
									{pluginReferenceError}
									pluginReference={pluginReferenceQuery.data}
									isLoadingPlugin={pluginReferenceQuery.isPending}
									isInstalling={installPluginMutation.isPending}
									onValidateReference={validatePluginReferenceInput}
									onInstallReference={installPluginReference}
									{formatWeightPercentage}
								/>

								<div class="space-y-2">
									<div class="flex flex-wrap items-center gap-2">
										<h3 class="text-base font-semibold">Installed plugins</h3>
									</div>
									<p class="text-sm text-muted-foreground">
										Enable, disable, weight, and uninstall plugins currently active on this server.
									</p>
								</div>

								{#if pluginsListQuery.isPending}
									<div class="flex items-center justify-center py-12">
										<Spinner class="size-6" />
									</div>
								{:else if pluginsListQuery.data?.plugins?.length}
									<div class="space-y-4">
										{#each pluginsListQuery.data.plugins as plugin (plugin.pluginKey)}
											<InstalledPluginCard
												{plugin}
												bind:weightDraft={weightDrafts[plugin.pluginKey]}
												isConfiguring={configurePluginsMutation.isPending}
												isUninstalling={uninstallPluginsMutation.isPending}
												onSaveWeight={saveWeight}
												onResetWeight={resetWeight}
												onToggleEnabled={toggleInstalledPlugin}
												onUninstall={uninstallPlugin}
												{formatWeightPercentage}
											/>
										{/each}
									</div>
								{:else}
									<Card>
										<CardContent class="py-6 text-sm text-muted-foreground">
											No plugins are currently installed on this server.
										</CardContent>
									</Card>
								{/if}
							</TabsContent>
						{/if}
					</Tabs>
				</div>
			</div>
		</main>
	</div>
{/if}
