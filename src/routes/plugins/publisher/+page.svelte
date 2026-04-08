<script lang="ts">
	import { relaySet } from 'applesauce-core/helpers';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { browser } from '$app/environment';
	import { toast } from 'svelte-sonner';
	import { activeAccount } from '$lib/services/accountManager.svelte';
	import AccountLoginDialog from '$lib/components/AccountLoginDialog.svelte';
	import ProfileCard from '$lib/components/ProfileCard.svelte';
	import { useUserRelays } from '$lib/queries/nostr';
	import { loadDiscoveryRelays, parseRelayList } from '$lib/plugins/marketplace';
	import { createPublisherState } from '$lib/features/elo-publisher/publisher-state.svelte';
	import { ELO_PLUGIN_KIND } from '$lib/constants';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import {
		validatePluginManifest,
		validatePluginSource,
		type PublisherDiagnostic
	} from '$lib/features/elo-publisher/validator';
	import { usePublishEloPlugin } from '$lib/mutations/elo-plugin';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';

	const discoveryRelays = parseRelayList(loadDiscoveryRelays());
	const publisher = createPublisherState();
	const publishMutation = usePublishEloPlugin(discoveryRelays);
	const VALIDATION_DEBOUNCE_MS = 350;

	let currentUserPubkey = $derived($activeAccount?.pubkey);
	const userRelaysQuery = $derived(useUserRelays(currentUserPubkey));

	let diagnostics = $state<PublisherDiagnostic[]>([]);
	let lastValidatedAt = $state<number | null>(null);
	let validationSummary = $state<{ rounds: number; hasScore: boolean } | null>(null);
	let draft = $derived(publisher.getDraft());
	let selectedPublishRelays = $state<string[]>([]);
	let manualRelayInput = $state('');
	let isRelaySectionOpen = $state(false);
	let isPreviewOpen = $state(false);
	let autoValidationToken = 0;

	const errorCount = $derived(diagnostics.filter((item) => item.severity === 'error').length);
	const warningCount = $derived(diagnostics.filter((item) => item.severity === 'warning').length);
	const isValidated = $derived(lastValidatedAt !== null && errorCount === 0);
	const availableWriteRelays = $derived.by(() => {
		const userRelays = userRelaysQuery.data?.write ?? userRelaysQuery.data?.relays ?? [];
		return relaySet([...userRelays, ...discoveryRelays]);
	});
	const effectivePublishRelays = $derived(relaySet(selectedPublishRelays));
	const validationState = $derived.by(() => {
		if (!draft.source.trim()) return 'idle';
		if (lastValidatedAt === null) return 'pending';
		return errorCount === 0 ? 'valid' : 'invalid';
	});
	const canPublishNow = $derived(
		publisher.canPublish() &&
			isValidated &&
			effectivePublishRelays.length > 0 &&
			!publishMutation.isPending
	);
	const eventPreview = $derived.by(() => {
		const tags = [
			['n', draft.identifier],
			['relatr-version', draft.version],
			['title', draft.title],
			['description', draft.description]
		];

		if (draft.weight.trim()) {
			tags.push(['weight', draft.weight]);
		}

		return {
			kind: ELO_PLUGIN_KIND,
			created_at: Math.floor(Date.now() / 1000),
			tags,
			content: draft.source
		};
	});

	function resetValidationState() {
		diagnostics = [];
		validationSummary = null;
		lastValidatedAt = null;
	}

	function validateDraft({ notify = false }: { notify?: boolean } = {}) {
		const manifestDiagnostics = validatePluginManifest(draft);
		const sourceResult = validatePluginSource(draft.source);
		const nextDiagnostics = [...manifestDiagnostics, ...sourceResult.diagnostics];

		diagnostics = nextDiagnostics;
		validationSummary = sourceResult.programSummary;
		lastValidatedAt = Date.now();

		if (!notify) return;

		if (nextDiagnostics.some((item) => item.severity === 'error')) {
			toast.error('Validation found issues that must be fixed before publishing');
			return;
		}

		toast.success('Plugin draft passed validation');
	}

	function runValidation() {
		validateDraft({ notify: true });
	}

	function setSelectedRelays(relays: string[]) {
		selectedPublishRelays = relaySet(relays);
	}

	function toggleRelay(relay: string, checked: boolean) {
		setSelectedRelays(
			checked
				? [...selectedPublishRelays, relay]
				: selectedPublishRelays.filter((item) => item !== relay)
		);
	}

	function addManualRelay() {
		const relay = manualRelayInput.trim();
		if (!relay) return;
		setSelectedRelays([...selectedPublishRelays, relay]);
		isRelaySectionOpen = true;
		manualRelayInput = '';
	}

	function loadExample() {
		publisher.loadExample();
		resetValidationState();
	}

	function resetDraft() {
		publisher.reset();
		resetValidationState();
		setSelectedRelays(availableWriteRelays);
	}

	function publishPlugin() {
		if (!$activeAccount) {
			toast.error('Please log in before publishing');
			return;
		}

		if (!isValidated) {
			toast.error('Validate the draft before publishing');
			return;
		}

		publishMutation.mutate(
			{
				publishRelays: effectivePublishRelays,
				title: draft.title,
				description: draft.description,
				identifier: draft.identifier,
				version: draft.version,
				source: draft.source,
				weight: draft.weight.trim() ? Number(draft.weight) : undefined
			},
			{
				onSuccess: (result) => {
					toast.success(`Plugin published to ${result.publishedTo.length} relay(s)`);
				},
				onError: (error) => {
					toast.error(error instanceof Error ? error.message : 'Failed to publish plugin');
				}
			}
		);
	}

	$effect(() => {
		if (selectedPublishRelays.length > 0) return;
		if (availableWriteRelays.length === 0) return;
		setSelectedRelays(availableWriteRelays);
	});

	$effect(() => {
		if (!browser) return;

		draft.title;
		draft.identifier;
		draft.description;
		draft.version;
		draft.weight;
		draft.source;

		resetValidationState();

		if (!publisher.canValidate()) return;

		autoValidationToken += 1;
		const token = autoValidationToken;
		const timeout = window.setTimeout(() => {
			if (token !== autoValidationToken) return;
			validateDraft();
		}, VALIDATION_DEBOUNCE_MS);

		return () => window.clearTimeout(timeout);
	});
</script>

<div class="flex min-h-screen flex-col bg-background">
	<main class="container mx-auto max-w-5xl flex-1 px-6 py-8">
		<div class="mx-auto w-full max-w-4xl space-y-6">
			<div class="space-y-2">
				<h1 class="text-3xl font-bold tracking-tight">Plugin publisher</h1>
				<p class="max-w-2xl text-sm leading-6 text-muted-foreground">
					Write a portable Elo plugin, validate its manifest and program structure, then publish it
					as a kind {ELO_PLUGIN_KIND} Nostr event.
				</p>
			</div>

			<Card class="border-border/70 py-4">
				<CardHeader>
					<CardTitle>Simple publishing flow</CardTitle>
					<CardDescription>
						Keep the form minimal: describe the plugin, paste the Elo source, validate, then publish
						when you're ready.
					</CardDescription>
				</CardHeader>
				<CardContent class="flex flex-wrap gap-3">
					<Button href="/plugins/docs/getting-started" variant="outline">Authoring guide</Button>
					<Button href="/plugins/docs/capabilities" variant="ghost">Capabilities</Button>
					<Button href="/plugins/docs/publishing" variant="ghost">Publishing format</Button>
				</CardContent>
			</Card>

			<div class="space-y-6">
				<Card class="py-4">
					<CardHeader>
						<CardTitle>Plugin manifest</CardTitle>
						<CardDescription>
							These fields become event tags visible in the marketplace.
						</CardDescription>
					</CardHeader>
					<CardContent class="grid gap-4 md:grid-cols-2">
						<div class="space-y-2 md:col-span-2">
							<Label for="publisher-title">Title</Label>
							<Input
								id="publisher-title"
								value={draft.title}
								oninput={(event) => publisher.setField('title', event.currentTarget.value)}
							/>
						</div>

						<div class="space-y-2">
							<Label for="publisher-identifier">Identifier (`n` tag)</Label>
							<Input
								id="publisher-identifier"
								value={draft.identifier}
								oninput={(event) => publisher.setField('identifier', event.currentTarget.value)}
							/>
						</div>

						<div class="space-y-2">
							<Label for="publisher-version">Relatr version</Label>
							<Input
								id="publisher-version"
								value={draft.version}
								oninput={(event) => publisher.setField('version', event.currentTarget.value)}
							/>
						</div>

						<div class="space-y-2">
							<Label for="publisher-weight">Default weight</Label>
							<Input
								id="publisher-weight"
								value={draft.weight}
								oninput={(event) => publisher.setField('weight', event.currentTarget.value)}
							/>
						</div>

						<div class="space-y-2 md:col-span-2">
							<Label for="publisher-description">Description</Label>
							<textarea
								id="publisher-description"
								class="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs ring-offset-background transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
								value={draft.description}
								oninput={(event) => publisher.setField('description', event.currentTarget.value)}
							></textarea>
						</div>
					</CardContent>
				</Card>

				<Card class="py-4">
					<CardHeader>
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="space-y-1">
								<CardTitle>Plugin source</CardTitle>
								<CardDescription>
									Write the full Elo plugin program. Validation runs automatically after a short
									pause.
								</CardDescription>
							</div>
							<div class="rounded-lg border px-3 py-2 text-xs text-muted-foreground">
								{#if validationState === 'valid'}
									Auto-check: ready
								{:else if validationState === 'invalid'}
									Auto-check: issues found
								{:else if validationState === 'pending'}
									Auto-check: waiting for pause
								{:else}
									Auto-check: add source to start
								{/if}
							</div>
						</div>
					</CardHeader>
					<CardContent class="space-y-4">
						<textarea
							class="min-h-[360px] w-full rounded-md border border-input bg-background px-3 py-3 font-mono text-sm shadow-xs ring-offset-background transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
							value={draft.source}
							oninput={(event) => publisher.setField('source', event.currentTarget.value)}
						></textarea>
					</CardContent>
					<CardFooter class="flex flex-wrap justify-between gap-3">
						<div class="flex flex-wrap gap-2">
							<Button variant="outline" onclick={loadExample}>Load example</Button>
							<Button variant="ghost" onclick={resetDraft}>Reset</Button>
						</div>
						<Button onclick={runValidation} disabled={!publisher.canValidate()}>Validate now</Button
						>
					</CardFooter>
				</Card>

				<Card class="py-4">
					<CardHeader>
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="space-y-1">
								<CardTitle>Validation status</CardTitle>
								<CardDescription>
									A Relatr-aware preflight check for manifest rules, Elo syntax, binding scope,
									score semantics, and supported capability usage.
								</CardDescription>
							</div>
							<div class="rounded-lg border px-3 py-2 text-xs text-muted-foreground">
								{#if lastValidatedAt}
									Updated {new Date(lastValidatedAt).toLocaleTimeString()}
								{:else}
									Awaiting first validation pass
								{/if}
							</div>
						</div>
					</CardHeader>
					<CardContent class="space-y-4 text-sm">
						<div class="grid gap-3 sm:grid-cols-3">
							<div class="rounded-lg border p-3">
								<div class="text-muted-foreground">Errors</div>
								<div class="text-2xl font-semibold">{errorCount}</div>
							</div>
							<div class="rounded-lg border p-3">
								<div class="text-muted-foreground">Warnings</div>
								<div class="text-2xl font-semibold">{warningCount}</div>
							</div>
							<div class="rounded-lg border p-3">
								<div class="text-muted-foreground">Rounds</div>
								<div class="text-2xl font-semibold">{validationSummary?.rounds ?? 0}</div>
							</div>
						</div>

						{#if diagnostics.length === 0}
							<p class="text-muted-foreground">
								No validation issues right now. Changes are checked automatically as you write.
							</p>
						{:else}
							<ul class="space-y-2">
								{#each diagnostics as diagnostic}
									<li class="rounded-lg border p-3">
										<div class="flex items-center justify-between gap-3">
											<span class="font-medium uppercase">{diagnostic.severity}</span>
											{#if diagnostic.location}
												<span class="text-xs text-muted-foreground">
													Line {diagnostic.location.line}, column {diagnostic.location.column}
												</span>
											{/if}
										</div>
										<p class="mt-2 text-muted-foreground">{diagnostic.message}</p>
									</li>
								{/each}
							</ul>
						{/if}
					</CardContent>
				</Card>
			</div>

			<div class="space-y-6">
				<Card class="py-4">
					<CardHeader>
						<CardTitle>Publish to Nostr</CardTitle>
						<CardDescription>
							Choose target relays, confirm validation, and sign the event only when everything is
							ready.
						</CardDescription>
					</CardHeader>
					<CardContent class="space-y-4">
						<Collapsible.Root bind:open={isRelaySectionOpen} class="space-y-3">
							<div class="flex items-center justify-between">
								<div>
									<p class="text-sm font-medium">Relay targets</p>
									<p class="text-xs text-muted-foreground">
										{effectivePublishRelays.length} relay(s) selected for publishing
									</p>
								</div>
								<Collapsible.Trigger
									class="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
								>
									Configure relays
									<ChevronDown
										class={`size-4 transition-transform ${isRelaySectionOpen ? 'rotate-180' : ''}`}
									/>
								</Collapsible.Trigger>
							</div>
							<Collapsible.Content class="space-y-4">
								<div class="space-y-2">
									{#each availableWriteRelays as relay}
										<label class="flex items-start gap-3 rounded-lg border p-3 text-sm">
											<input
												type="checkbox"
												checked={selectedPublishRelays.includes(relay)}
												onchange={(event) => toggleRelay(relay, event.currentTarget.checked)}
											/>
											<span class="min-w-0 break-all text-muted-foreground">{relay}</span>
										</label>
									{/each}
								</div>
								<div class="space-y-2 rounded-lg border p-3">
									<Label for="publisher-manual-relay">Add relay manually</Label>
									<div class="flex flex-col gap-2 sm:flex-row">
										<Input
											id="publisher-manual-relay"
											value={manualRelayInput}
											oninput={(event) => (manualRelayInput = event.currentTarget.value)}
											placeholder="wss://relay.example.com"
										/>
										<Button variant="outline" onclick={addManualRelay}>Add relay</Button>
									</div>
								</div>
							</Collapsible.Content>
						</Collapsible.Root>

						{#if $activeAccount}
							<div class="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
								<p class="mb-3 font-medium text-foreground">Publishing as</p>
								<ProfileCard pubkey={$activeAccount.pubkey} mode="compact" showPubkey={true} />
							</div>
						{:else}
							<div class="rounded-lg border bg-muted/20 p-6 text-center">
								<p class="mb-4 text-sm text-muted-foreground">
									You can draft and validate without logging in. Sign in only when you are ready to
									publish.
								</p>
								<AccountLoginDialog />
							</div>
						{/if}

						<Button onclick={publishPlugin} disabled={!canPublishNow}>
							{publishMutation.isPending ? 'Publishing...' : 'Publish plugin event'}
						</Button>

						{#if !isValidated}
							<p class="text-xs text-muted-foreground">
								Publishing stays disabled until validation passes with zero errors.
							</p>
						{/if}
					</CardContent>
				</Card>

				<Card class="py-4">
					<CardHeader>
						<CardTitle>Event preview</CardTitle>
						<CardDescription>
							Inspect the event template before signing and publishing.
						</CardDescription>
					</CardHeader>
					<CardContent class="space-y-4">
						<Collapsible.Root bind:open={isPreviewOpen} class="space-y-3">
							<div class="flex items-center justify-between">
								<div>
									<p class="text-sm font-medium">Raw event template</p>
									<p class="text-xs text-muted-foreground">
										Preview updates live from the current draft.
									</p>
								</div>
								<Collapsible.Trigger
									class="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
								>
									Toggle preview
									<ChevronDown
										class={`size-4 transition-transform ${isPreviewOpen ? 'rotate-180' : ''}`}
									/>
								</Collapsible.Trigger>
							</div>
							<Collapsible.Content>
								<pre class="overflow-x-auto rounded-lg border bg-muted/30 p-4 text-xs"><code
										>{JSON.stringify(eventPreview, null, 2)}</code
									></pre>
							</Collapsible.Content>
						</Collapsible.Root>
					</CardContent>
				</Card>
			</div>
		</div>
	</main>
</div>
