<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
</script>

<div class="flex min-h-screen flex-col bg-background">
	<main class="container mx-auto max-w-4xl flex-1 px-6 py-8">
		<div class="mx-auto w-full max-w-3xl space-y-8">
			<section class="space-y-4 text-center">
				<h1 class="text-4xl font-bold tracking-tight">Learn the Elo plugin model</h1>
				<p class="mx-auto max-w-2xl text-muted-foreground">
					Elo plugins are portable scoring programs published as Nostr events. This docs hub
					explains the core Elo mental model, how Relatr weights plugin scores, how to write and
					validate plugins, and how to publish them from the website or with Relo locally.
				</p>
				<div class="flex flex-wrap justify-center gap-3">
					<Button href="/plugins">Browse marketplace</Button>
					<Button href="/plugins/docs/getting-started" variant="outline">Getting started</Button>
					<Button href="/plugins/docs/capabilities" variant="ghost">Capabilities</Button>
				</div>
			</section>

			<section class="grid gap-4 md:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle class="text-lg">1. Understand the model</CardTitle>
						<CardDescription>
							Start with Relatr's plugin mental model, Elo fundamentals, `plan` rounds, and `do`
							capability calls.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button href="/plugins/docs/getting-started" variant="outline" class="w-full">
							Open getting started
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle class="text-lg">2. See real examples</CardTitle>
						<CardDescription>
							Study practical patterns for note activity, NIP-05 checks, and graph-based trust.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button href="/plugins/docs/examples" variant="outline" class="w-full">
							Open examples
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle class="text-lg">3. Use the exact reference</CardTitle>
						<CardDescription>
							Check capability argument shapes, safe defaults, and the portable event packaging
							rules.
						</CardDescription>
					</CardHeader>
					<CardContent class="space-y-2">
						<Button href="/plugins/docs/capabilities" variant="outline" class="w-full">
							Capability reference
						</Button>
						<Button href="/plugins/docs/publishing" variant="ghost" class="w-full">
							Publishing guide
						</Button>
					</CardContent>
				</Card>
			</section>

			<section class="grid gap-4 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Choose your path</CardTitle>
						<CardDescription>Different users need different levels of detail.</CardDescription>
					</CardHeader>
					<CardContent class="space-y-4 text-sm text-muted-foreground">
						<div>
							<p class="font-medium text-foreground">I want to use plugins</p>
							<p>
								Start in the marketplace, inspect plugin details, then come back here when you want
								to understand compatibility, capabilities, or packaging.
							</p>
						</div>
						<div>
							<p class="font-medium text-foreground">I want to write plugins</p>
							<p>
								Read the getting-started page first, then the examples, then use the capability
								reference and publishing guide while building real plugins.
							</p>
						</div>
						<div>
							<p class="font-medium text-foreground">I want a local authoring workflow</p>
							<p>
								Use the getting-started page together with Relo when you want validation, build, and
								publish commands in local or LLM-assisted workflows.
							</p>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Mental model</CardTitle>
						<CardDescription>The shortest useful summary of how plugins work.</CardDescription>
					</CardHeader>
					<CardContent class="space-y-3 text-sm text-muted-foreground">
						<p>
							A plugin receives `_` inputs such as target pubkey, source pubkey, and current time.
						</p>
						<p>
							It requests external data through `do '&lt;capability&gt;' &lt;json-args&gt;` bindings
							in one or more planning rounds.
						</p>
						<p>
							The final result is a score in the `[0.0, 1.0]` range that Relatr can weight and
							combine with other signals.
						</p>
						<p>
							Plugins are published as kind `765` Nostr events, which makes them portable,
							discoverable, and installable across Relatr instances.
						</p>
					</CardContent>
				</Card>
			</section>
		</div>
	</main>
</div>
