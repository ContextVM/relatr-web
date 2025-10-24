<script lang="ts">
</script>

<div class="flex min-h-screen flex-col bg-background">
	<main class="container mx-auto max-w-4xl flex-1 px-6 py-8">
		<div class="flex flex-col items-center justify-center">
			<div class="w-full max-w-2xl space-y-8">
				<!-- Logo at the top -->
				<div class="mb-8 flex justify-center">
					<img src="/relatr-logo2.svg" alt="Relatr Logo" class="h-42 w-auto dark:hidden" />
					<img
						src="/relatr-logo2-white.svg"
						alt="Relatr Logo"
						class="hidden h-42 w-auto dark:block"
					/>
				</div>

				<!-- About content -->
				<div class="space-y-6">
					<div class="text-center">
						<h1 class="mb-4 text-4xl font-bold">Relatr</h1>
						<p class="mx-auto max-w-2xl text-lg text-muted-foreground">
							A decentralized trust metric service for Nostr that computes personalized trust scores
							from any source pubkey's perspective using social graph distances and customizable
							validations.
						</p>
					</div>

					<div class="space-y-6">
						<section>
							<h2 class="mb-3 text-2xl font-semibold">How Relatr Works</h2>
							<p class="text-muted-foreground">
								Relatr computes trust from a specific source pubkey's perspective. You provide a
								source pubkey, Relatr finds related profiles, measures social graph distances,
								computes validations, and combines them into a comprehensive trust score using
								simple floating-point operations.
							</p>
							<p class="mt-3 text-muted-foreground">
								Everyone can run their own Relatr instance and be the source pubkey. Validations are
								customizable per instance, allowing different trust models to coexist in the
								decentralized ecosystem.
							</p>
						</section>

						<section>
							<h2 class="mb-3 text-2xl font-semibold">Why Trust Should Be Relative</h2>
							<div class="space-y-3">
								<div class="rounded-lg bg-muted p-4">
									<h4 class="mb-2 font-semibold">Diverse Contexts</h4>
									<p class="text-sm text-muted-foreground">
										Different users have varying criteria for trust. What matters to one user may be
										irrelevant to another.
									</p>
								</div>
								<div class="rounded-lg bg-muted p-4">
									<h4 class="mb-2 font-semibold">Social Graph Proximity</h4>
									<p class="text-sm text-muted-foreground">
										Trust correlates strongly with social proximity - connections closer in your
										social graph are generally more trustworthy to you.
									</p>
								</div>
								<div class="rounded-lg bg-muted p-4">
									<h4 class="mb-2 font-semibold">Personal Validation</h4>
									<p class="text-sm text-muted-foreground">
										Objective validations (like NIP-05 IDs) provide anchors, but their significance
										depends on your personal trust framework.
									</p>
								</div>
								<div class="rounded-lg bg-muted p-4">
									<h4 class="mb-2 font-semibold">Reciprocal Relationships</h4>
									<p class="text-sm text-muted-foreground">
										Mutual relationships are important trust signals, but their meaning varies based
										on your network and interaction history.
									</p>
								</div>
							</div>
						</section>

						<section>
							<h2 class="mb-3 text-2xl font-semibold">Features</h2>
							<ul class="space-y-2 text-muted-foreground">
								<li>
									<strong>Source-Based Trust:</strong> All trust scores are computed from a specific
									source pubkey's perspective
								</li>
								<li>
									<strong>Social Graph Distances:</strong> Measures proximity using nostr-social-graph
								</li>
								<li>
									<strong>Customizable Validations:</strong> Validations can be configured per instance
								</li>
								<li>
									<strong>Simple Computation:</strong> Uses basic floating-point operations for transparency
								</li>
								<li>
									<strong>Self-Hostable:</strong> Everyone can run their own Relatr instance
								</li>
								<li>
									<strong>API Integration:</strong> CVM server interface for external applications
								</li>
							</ul>
						</section>

						<section>
							<h3 class="mb-3 text-xl font-semibold">Trust Calculation</h3>
							<p class="mb-4 text-muted-foreground">
								Trust scores are computed from source A to target B using a weighted formula:
							</p>
							<div class="mb-4 rounded-lg bg-muted p-4 text-center font-mono">
								Trust Score<sub>A→B</sub> = Σ(w<sub>i</sub> × v<sub>i</sub><sup>(A,B)</sup>) / Σ(w<sub
									>i</sub
								>)
							</div>
							<p class="mb-4 text-sm text-muted-foreground">Where:</p>
							<ul class="mb-4 space-y-1 text-sm text-muted-foreground">
								<li><code>A</code> = source pubkey (your perspective)</li>
								<li><code>B</code> = target pubkey</li>
								<li>
									<code>v<sub>i</sub><sup>(A,B)</sup></code> = metric value from A's viewpoint
								</li>
								<li><code>w<sub>i</sub></code> = customizable weights for your trust priorities</li>
							</ul>
						</section>

						<section>
							<h3 class="mb-3 text-xl font-semibold">Metrics</h3>
							<div class="overflow-x-auto">
								<table class="w-full border-collapse">
									<thead>
										<tr class="border-b">
											<th class="px-3 py-2 text-left font-medium">Metric</th>
											<th class="px-3 py-2 text-left font-medium">Type</th>
											<th class="px-3 py-2 text-left font-medium">Weight</th>
											<th class="px-3 py-2 text-left font-medium">Description</th>
										</tr>
									</thead>
									<tbody>
										<tr class="border-b">
											<td class="px-3 py-2">Distance</td>
											<td class="px-3 py-2">Float (0-1)</td>
											<td class="px-3 py-2">0.5</td>
											<td class="px-3 py-2">Social graph proximity with decay</td>
										</tr>
										<tr class="border-b">
											<td class="px-3 py-2">NIP-05</td>
											<td class="px-3 py-2">Binary (0/1)</td>
											<td class="px-3 py-2">0.15</td>
											<td class="px-3 py-2">Valid NIP-05 identifier</td>
										</tr>
										<tr class="border-b">
											<td class="px-3 py-2">Lightning</td>
											<td class="px-3 py-2">Binary (0/1)</td>
											<td class="px-3 py-2">0.1</td>
											<td class="px-3 py-2">Lightning Network address</td>
										</tr>
										<tr class="border-b">
											<td class="px-3 py-2">Event 10002</td>
											<td class="px-3 py-2">Binary (0/1)</td>
											<td class="px-3 py-2">0.1</td>
											<td class="px-3 py-2">Published relay list</td>
										</tr>
										<tr class="border-b">
											<td class="px-3 py-2">Reciprocity</td>
											<td class="px-3 py-2">Binary (0/1)</td>
											<td class="px-3 py-2">0.15</td>
											<td class="px-3 py-2">Mutual follow relationship</td>
										</tr>
										<tr class="border-b">
											<td class="px-3 py-2">Exact Match</td>
											<td class="px-3 py-2">Binary (0/1)</td>
											<td class="px-3 py-2">0.05</td>
											<td class="px-3 py-2">Exact name/NIP-05 match</td>
										</tr>
										<tr class="border-b">
											<td class="px-3 py-2">Root NIP-05</td>
											<td class="px-3 py-2">Binary (0/1)</td>
											<td class="px-3 py-2">0.05</td>
											<td class="px-3 py-2">Root domain NIP-05 identifier</td>
										</tr>
									</tbody>
								</table>
							</div>
						</section>

						<section>
							<h3 class="mb-3 text-xl font-semibold">Customizable Architecture</h3>
							<p class="mb-4 text-muted-foreground">
								Relatr's validation system separates validation logic from weight management:
							</p>
							<div class="space-y-3 rounded-lg bg-muted p-4">
								<h4 class="font-semibold">Key Design:</h4>
								<ul class="space-y-2 text-muted-foreground">
									<li>
										<strong>Pure Validation Plugins:</strong> Validation logic without weights
									</li>
									<li>
										<strong>Dynamic Weight Profiles:</strong> Separate weight management
									</li>
									<li>
										<strong>Instance Customization:</strong> Each Relatr instance can have different
										validations
									</li>
									<li>
										<strong>Simple Operations:</strong> Basic floating-point math for transparency
									</li>
								</ul>
							</div>
						</section>
					</div>
				</div>
			</div>
		</div>
	</main>
</div>
