<script lang="ts">
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Github } from 'lucide-svelte';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
</script>

<div class="flex min-h-screen flex-col bg-background">
	<main class="container mx-auto max-w-4xl flex-1 px-6 py-8">
		<div class="flex flex-col items-center justify-center">
			<div class="w-full max-w-2xl space-y-8">
				<!-- Logo at the top -->
				<div class="mb-8 flex justify-center">
					<img src="/relatr-logo-min.svg" alt="Relatr Logo" class="h-42 w-auto dark:hidden" />
					<img
						src="/relatr-logo-white-min.svg"
						alt="Relatr Logo"
						class="hidden h-42 w-auto dark:block"
					/>
				</div>

				<!-- About content -->
				<div class="space-y-6">
					<div class="text-center">
						<h1 class="mb-4 text-4xl font-bold">Relatr</h1>
						<p class="mx-auto max-w-2xl text-lg text-muted-foreground">About</p>
					</div>
					<div class="flex flex-wrap justify-center gap-2">
						<Badge>Open Source (MIT)</Badge>
						<Badge>Self-Hostable</Badge>
						<Badge>Easy to Deploy</Badge>
					</div>

					<div class="flex justify-center">
						<a href="https://github.com/contextvm/relatr" target="_blank" class="mt-4">
							<Github />
						</a>
					</div>

					<!-- Tabs Section -->
					<Tabs.Root value="what-why-how" class="w-full">
						<Tabs.List class="grid w-full grid-cols-3">
							<Tabs.Trigger value="what-why-how">What, Why & How</Tabs.Trigger>
							<Tabs.Trigger value="run">Run</Tabs.Trigger>
							<Tabs.Trigger value="integrate">Integrate</Tabs.Trigger>
						</Tabs.List>

						<!-- What, Why & How Tab -->
						<Tabs.Content value="what-why-how" class="space-y-6 pt-6">
							<section class="flex flex-wrap justify-center gap-2">
								<h2 class="mb-4 text-2xl font-semibold">What is Relatr?</h2>
								<p class="mb-4 text-muted-foreground">
									Relatr is a decentralized trust metric service for the Nostr ecosystem that
									computes personalized trust scores from the unique perspective of a public key. It
									combines source public key social connections with customizable validation
									criteria to create meaningful trust assessments.
								</p>
								<p class="text-muted-foreground">
									Trust is not an absolute quantity but a deeply personal and contextual phenomenon.
									Where centralized systems impose universal standards, Relatr embraces the
									relative, dynamic nature of trust, empowering you to define what trust means in
									your context.
								</p>
								<Button
									href="https://nostr.at/naddr1qvzqqqr4gupzq6ehsrhjjuh885mshp9ru50842dwxjl5z2fcmnaan30k8v3pg9kgqq2hjjt5vd45x6msd428ztt0wazn2st8t968zyx8g23"
									target="_blank">Read our article</Button
								>
							</section>

							<section class="flex flex-wrap justify-center gap-2">
								<h2 class="mb-4 text-2xl font-semibold">Why Decentralized Trust Matters</h2>
								<div class="space-y-4">
									<div class="rounded-lg bg-muted p-4">
										<h4 class="mb-2 font-semibold">Personal Sovereignty</h4>
										<p class="text-sm text-muted-foreground">
											You control your trust criteria. No platform dictates what makes someone
											trustworthy to you. Your relationships, your values, your context - these
											shape your unique trust framework.
										</p>
									</div>
									<div class="rounded-lg bg-muted p-4">
										<h4 class="mb-2 font-semibold">Transparent Algorithms</h4>
										<p class="text-sm text-muted-foreground">
											Relatr's open-source computation means you can audit and understand exactly
											how trust scores are calculated. No black boxes, no hidden agendas - just
											transparent mathematics you can verify.
										</p>
									</div>
									<div class="rounded-lg bg-muted p-4">
										<h4 class="mb-2 font-semibold">No Vendor Lock-in</h4>
										<p class="text-sm text-muted-foreground">
											Run your own instance or choose from multiple providers. Your trust data and
											criteria belong to you, not to any single platform or service provider.
										</p>
									</div>
									<div class="rounded-lg bg-muted p-4">
										<h4 class="mb-2 font-semibold">Censorship Resistance</h4>
										<p class="text-sm text-muted-foreground">
											By distributing trust computation across many instances, Relatr creates a
											resilient ecosystem resistant to censorship and single points of failure.
										</p>
									</div>
								</div>
							</section>

							<section class="flex flex-wrap justify-center gap-2">
								<h2 class="mb-4 text-2xl font-semibold">How Relatr Computes Trust</h2>
								<p class="mb-4 text-muted-foreground">
									Relatr uses a simple yet powerful weighted formula to combine multiple trust
									signals into a single, meaningful score:
								</p>
								<div class="mb-6 rounded-lg bg-muted p-4 text-center font-mono">
									Trust Score = Σ(w<sub>i</sub> × v<sub>i</sub>) / Σ(w<sub>i</sub>)
								</div>
								<p class="mb-4 text-muted-foreground">
									Here, wᵢ represents the weight you assign to a metric, and vᵢ is its normalized
									value, allowing for deep personalization.
								</p>
								<div class="space-y-4">
									<div class="rounded-lg bg-muted p-4">
										<h4 class="mb-2 font-semibold">1. Social Graph Proximity</h4>
										<p class="text-sm text-muted-foreground">
											Relatr measures social distance between your public key and target keys using
											nostr-social-graph library. Direct relationships carry the most weight, while
											trust decays exponentially across network hops - capturing the essence of "I
											trust you, so I can extend a degree of trust to those you trust."
										</p>
									</div>
									<div class="rounded-lg bg-muted p-4">
										<h4 class="mb-2 font-semibold">2. Objective Profile Validations</h4>
										<p class="text-sm text-muted-foreground">
											Beyond social ties, Relatr incorporates objective, verifiable data including
											NIP-05 domain validation, Lightning Network addresses, relay lists, and mutual
											relationships. The framework is extensible, allowing new validation plugins to
											be added over time.
										</p>
									</div>
									<div class="rounded-lg bg-muted p-4">
										<h4 class="mb-2 font-semibold">3. Customizable Weights</h4>
										<p class="text-sm text-muted-foreground">
											You control the importance of each metric. Want social proximity to matter
											more than domain verification? Adjust the weights to match your personal trust
											priorities. The default weights provide a balanced starting point that you can
											fine-tune.
										</p>
									</div>
								</div>
							</section>
						</Tabs.Content>

						<!-- Run Tab -->
						<Tabs.Content value="run" class="space-y-6 pt-6">
							<section>
								<h2 class="mb-4 text-2xl font-semibold">Run Your Own Relatr Instance</h2>
								<p class="mb-4 text-muted-foreground">
									Relatr's architecture embodies its principles. It is not a centralized service but
									a protocol that anyone can run. This is made possible by <strong>ContextVM</strong
									>, a decentralized protocol that enables services to communicate over the Nostr
									network.
								</p>
								<p class="mb-4 text-muted-foreground">
									Running Relatr as a ContextVM service makes it incredibly accessible. Anyone can
									deploy their own trust engine from source or a Docker container in environments
									like Umbrel or Start9, often with a one-click install. This turns any
									internet-connected device into a personal trust server without complex networking
									or hosting costs.
								</p>
							</section>

							<section class="flex flex-col gap-2">
								<h3 class="mb-3 text-xl font-semibold">Quick Start</h3>
								<div class="space-y-4 rounded-lg bg-muted p-4">
									<h4 class="font-semibold">Using Docker (Recommended)</h4>
									<div class="rounded bg-background p-3 font-mono text-sm">
										docker run -d -e SERVER_SECRET_KEY=your_server_privkey_here -v
										$(pwd)/data:/usr/src/app/data ghcr.io/contextvm/relatr:latest
									</div>
									<p class="text-sm text-muted-foreground">
										Relatr is designed to be lightweight and should run on almost any device. The
										easiest way to get started is with the official Docker image.
									</p>
									<strong>Note:</strong> Create the data dir with your user if you want to persist the
									database.
								</div>

								<div class="space-y-4 rounded-lg bg-muted p-4">
									<h4 class="font-semibold">From Source</h4>
									<div class="space-y-2">
										<div class="rounded bg-background p-3 font-mono text-sm">
											git clone https://github.com/contextvm/relatr
										</div>
										<div class="rounded bg-background p-3 font-mono text-sm">
											cd relatr && bun install
										</div>
										<div class="rounded bg-background p-3 font-mono text-sm">bun run mcp</div>
									</div>
								</div>
							</section>

							<section>
								<h3 class="mb-3 text-xl font-semibold">Configuration</h3>
								<div class="space-y-3 rounded-lg bg-muted p-4">
									<h4 class="font-semibold">Required Settings:</h4>
									<ul class="space-y-2 text-muted-foreground">
										<li>
											<strong>Server Secret Key:</strong> For ContextVM server identification
										</li>
									</ul>
									<p class="mt-2 text-sm text-muted-foreground">
										Each Relatr instance is identified by the public key of its ContextVM server.
										You can configure your own source pubkey or use the default.
									</p>
								</div>
							</section>

							<div class="flex justify-center">
								<a href="https://github.com/contextvm/relatr">
									<Button>View Full Documentation</Button>
								</a>
							</div>
						</Tabs.Content>

						<!-- Integrate Tab -->
						<Tabs.Content value="integrate" class="space-y-6 pt-6">
							<section>
								<h2 class="mb-4 text-2xl font-semibold">Seamless Integration</h2>
								<p class="mb-4 text-muted-foreground">
									The benefits of ContextVM extend to developers. Integrating Relatr into clients is
									remarkably simple, thanks to a tool called <strong>CtxCn</strong>. It's a
									command-line utility that generates a fully-typed Relatr client directly into an
									application's codebase.
								</p>
							</section>

							<section>
								<h3 class="mb-3 text-xl font-semibold">Quick Integration</h3>
								<div class="space-y-4 rounded-lg bg-muted p-4">
									<h4 class="font-semibold">Single Command Integration</h4>
									<div class="rounded bg-background p-3 font-mono text-sm">
										npx @contextvm/ctxcn add "relatr-server-pubkey"
									</div>
									<p class="text-sm text-muted-foreground">
										This single command generates a fully-typed Relatr client in your project, ready
										to use with your preferred Relatr instance.
									</p>
								</div>
							</section>

							<section>
								<h3 class="mb-3 text-xl font-semibold">Features for Developers</h3>
								<ul class="space-y-2 text-muted-foreground">
									<li>
										<strong>Fully Typed Client:</strong> Auto-generated TypeScript definitions
									</li>
									<li>
										<strong>Source Code Ownership:</strong> No opaque dependencies
									</li>
									<li>
										<strong>Easy Maintenance:</strong> Simple updates with CtxCn
									</li>
									<li>
										<strong>Multiple Instance Support:</strong> Users can choose their trust provider
									</li>
									<li>
										<strong>No Vendor Lock-in:</strong> Always free to switch Relatr instances
									</li>
								</ul>
							</section>
						</Tabs.Content>
					</Tabs.Root>
				</div>
			</div>
		</div>
	</main>
</div>
