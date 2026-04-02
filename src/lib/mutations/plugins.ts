import { createMutation } from '@tanstack/svelte-query';
import type { QueryKey } from '@tanstack/svelte-query';
import { queryClient } from '$lib/query-client';
import { pluginKeys } from '$lib/query-keys';
import type {
	PluginsInstallInput,
	PluginsConfigInput,
	PluginsConfigOutput,
	PluginsInstallOutput,
	PluginsListOutput,
	PluginsUninstallOutput,
	RelatrClient
} from '$lib/ctxcn/RelatrClient';
import type { MarketplacePlugin } from '$lib/queries/plugins';
import { getInstallInputFromPlugin } from '$lib/queries/plugins';

type InstallPluginInput = {
	relatrClient: RelatrClient;
	serverPubkey: string;
	plugin?: MarketplacePlugin;
	installInput?: PluginsInstallInput;
	enable?: boolean;
};

type ConfigurePluginInput = {
	relatrClient: RelatrClient;
	serverPubkey: string;
	changes: PluginsConfigInput['changes'];
};

type UninstallPluginInput = {
	relatrClient: RelatrClient;
	serverPubkey: string;
	pluginKeys: string[];
};

type PluginMutationContext = {
	previous: PluginsListOutput | null | undefined;
	queryKey: QueryKey;
};

export function useInstallPlugin() {
	return createMutation<PluginsInstallOutput, Error, InstallPluginInput>(() => ({
		mutationFn: async ({ relatrClient, plugin, installInput, enable }) => {
			const resolvedInstallInput =
				installInput ?? (plugin ? getInstallInputFromPlugin(plugin) : null);
			if (!resolvedInstallInput) {
				throw new Error('Missing plugin installation input');
			}

			return await relatrClient.PluginsInstall(
				resolvedInstallInput.eventId,
				resolvedInstallInput.nevent,
				resolvedInstallInput.relays,
				enable
			);
		},
		onSuccess: async (_data, variables) => {
			await queryClient.invalidateQueries({
				queryKey: pluginKeys.list(variables.serverPubkey, true)
			});
		}
	}));
}

export function useConfigurePlugins() {
	return createMutation<PluginsConfigOutput, Error, ConfigurePluginInput, PluginMutationContext>(
		() => ({
			mutationFn: async ({ relatrClient, changes }) => {
				return await relatrClient.PluginsConfig(changes);
			},
			onMutate: async ({ serverPubkey, changes }) => {
				const queryKey = pluginKeys.list(serverPubkey, true);
				const previous = queryClient.getQueryData<PluginsListOutput | null>(queryKey);

				if (previous) {
					queryClient.setQueryData<PluginsListOutput | null>(queryKey, {
						plugins: previous.plugins.map((plugin) => {
							const change = changes.find((item) => item.pluginKey === plugin.pluginKey);
							if (!change) return plugin;

							const nextEffectiveWeight =
								typeof change.weightOverride === 'number'
									? change.weightOverride
									: plugin.effectiveWeight;

							return {
								...plugin,
								enabled: change.enabled ?? plugin.enabled,
								effectiveWeight: nextEffectiveWeight
							};
						})
					});
				}

				return { previous, queryKey };
			},
			onError: (_error, _variables, context) => {
				if (context?.previous) {
					queryClient.setQueryData(context.queryKey, context.previous);
				}
			},
			onSettled: async (_data, _error, variables) => {
				await queryClient.invalidateQueries({
					queryKey: pluginKeys.list(variables.serverPubkey, true)
				});
			}
		})
	);
}

export function useUninstallPlugins() {
	return createMutation<PluginsUninstallOutput, Error, UninstallPluginInput, PluginMutationContext>(
		() => ({
			mutationFn: async ({ relatrClient, pluginKeys: keys }) => {
				return await relatrClient.PluginsUninstall(keys);
			},
			onMutate: async ({ serverPubkey, pluginKeys: keys }) => {
				const queryKey = pluginKeys.list(serverPubkey, true);
				const previous = queryClient.getQueryData<PluginsListOutput | null>(queryKey);

				if (previous) {
					const removed = new Set(keys);
					queryClient.setQueryData<PluginsListOutput | null>(queryKey, {
						plugins: previous.plugins.filter((plugin) => !removed.has(plugin.pluginKey))
					});
				}

				return { previous, queryKey };
			},
			onError: (_error, _variables, context) => {
				if (context?.previous) {
					queryClient.setQueryData(context.queryKey, context.previous);
				}
			},
			onSettled: async (_data, _error, variables) => {
				await queryClient.invalidateQueries({
					queryKey: pluginKeys.list(variables.serverPubkey, true)
				});
			}
		})
	);
}
