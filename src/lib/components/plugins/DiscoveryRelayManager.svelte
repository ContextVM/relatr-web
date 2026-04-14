<script lang="ts">
	import Plus from '@lucide/svelte/icons/plus';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';

	let {
		discoveryRelays,
		discoveryRelayInput = $bindable(),
		relayInputError,
		searchQuery = $bindable(),
		onAddRelay,
		onRemoveRelay
	} = $props<{
		discoveryRelays: string[];
		discoveryRelayInput: string;
		relayInputError: string | null;
		searchQuery: string;
		onAddRelay: () => void;
		onRemoveRelay: (relay: string) => void;
	}>();

	let isRelaysOpen = $state(false);
</script>

<Card class="py-3">
	<CardHeader>
		<div class="flex items-center justify-between">
			<div class="space-y-1">
				<CardTitle>Discovery relays</CardTitle>
				<CardDescription>Manage the relay catalog used for marketplace discovery.</CardDescription>
			</div>
		</div>
	</CardHeader>
	<CardContent class="space-y-4">
		<Collapsible.Root bind:open={isRelaysOpen} class="space-y-2">
			<div class="flex items-center justify-between">
				<p class="text-sm font-medium">Active relays ({discoveryRelays.length})</p>
				<Collapsible.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="ghost" size="sm" class="w-9 p-0">
							{#if isRelaysOpen}
								<ChevronUp class="size-4" />
							{:else}
								<ChevronDown class="size-4" />
							{/if}
							<span class="sr-only">Toggle relays</span>
						</Button>
					{/snippet}
				</Collapsible.Trigger>
			</div>

			<div class="flex flex-wrap gap-2">
				{#each discoveryRelays.slice(0, 3) as relay (relay)}
					<Badge variant="secondary" class="max-w-[200px] truncate">{relay}</Badge>
				{/each}
				{#if discoveryRelays.length > 3}
					<Badge variant="outline">+{discoveryRelays.length - 3} more</Badge>
				{/if}
			</div>

			<Collapsible.Content class="space-y-4 pt-2">
				<div class="space-y-2">
					<Label for="plugin-relay-input">Add discovery relay</Label>
					<div class="flex gap-2">
						<Input
							id="plugin-relay-input"
							bind:value={discoveryRelayInput}
							placeholder="wss://relay.example.com"
							class="flex-1"
							onkeydown={(event) => event.key === 'Enter' && onAddRelay()}
						/>
						<Button size="icon" onclick={onAddRelay} aria-label="Add relay">
							<Plus class="size-4" />
						</Button>
					</div>
					{#if relayInputError}
						<p class="text-sm text-destructive">{relayInputError}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<div class="grid gap-2">
						{#if discoveryRelays.length === 0}
							<p class="text-sm text-muted-foreground">No discovery relays configured.</p>
						{:else}
							{#each discoveryRelays as relay (relay)}
								<div
									class="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm"
								>
									<span class="min-w-0 flex-1 break-all text-muted-foreground">{relay}</span>
									<Button variant="outline" size="sm" onclick={() => onRemoveRelay(relay)}>
										Remove
									</Button>
								</div>
							{/each}
						{/if}
					</div>
				</div>
			</Collapsible.Content>
		</Collapsible.Root>

		<div class="space-y-2 border-t pt-2">
			<Label for="plugin-search">Search</Label>
			<Input id="plugin-search" bind:value={searchQuery} placeholder="Search plugins" />
		</div>
	</CardContent>
</Card>

<style>
	:global(.truncate) {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
