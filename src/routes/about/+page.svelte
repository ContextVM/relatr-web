<script lang="ts">
</script>

<div class="flex min-h-screen flex-col bg-background">
	<main class="container mx-auto max-w-4xl flex-1 px-6 py-8">
		<div class="flex flex-col items-center justify-center">
			<div class="w-full max-w-2xl space-y-8">
				<!-- Logo at the top -->
				<div class="mb-8 flex justify-center">
					<img src="/relatr-logo.svg" alt="Relatr Logo" class="h-42 w-auto" />
				</div>

				<!-- About content -->
				<div class="space-y-6">
					<div class="text-center">
						<h1 class="mb-4 text-4xl font-bold">Relatr</h1>
						<p class="mx-auto max-w-2xl text-lg text-muted-foreground">
							A decentralized web of trust metric service for Nostr that computes personalized trust
							scores by combining social graph distances with profile validation metrics.
						</p>
					</div>

					<div class="space-y-6">
						<section>
							<h2 class="mb-3 text-2xl font-semibold">Overview</h2>
							<p class="text-muted-foreground">
								Relatr measures relative trust between Nostr public keys by analyzing social graph
								proximity and validating profile characteristics. It uses a weighted scoring system
								to produce a comprehensive trust metric that can be personalized from any source
								pubkey's perspective.
							</p>
						</section>

						<section>
							<h2 class="mb-3 text-2xl font-semibold">Features</h2>
							<ul class="space-y-2 text-muted-foreground">
								<li>
									<strong>Social Graph Analysis:</strong> Calculates trust distances using nostr-social-graph
								</li>
								<li>
									<strong>Profile Validation:</strong> Validates NIP-05, Lightning addresses, and event
									publications
								</li>
								<li><strong>Reciprocity Checking:</strong> Verifies mutual follow relationships</li>
								<li>
									<strong>Configurable Scoring:</strong> Flexible weighting schemes for different trust
									factors
								</li>
								<li>
									<strong>Persistent Caching:</strong> SQLite-based caching for performance optimization
								</li>
								<li>
									<strong>MCP Server Interface:</strong> Model Context Protocol API for integration
								</li>
							</ul>
						</section>

						<section>
							<h3 class="mb-3 text-xl font-semibold">Trust Score Calculation</h3>
							<p class="mb-4 text-muted-foreground">
								The trust score is computed using a weighted formula:
							</p>
							<div class="mb-4 rounded-lg bg-muted p-4 text-center font-mono">
								Trust Score = Σ(wi × vi) / Σ(wi)
							</div>
							<p class="mb-4 text-sm text-muted-foreground">Where:</p>
							<ul class="mb-4 space-y-1 text-sm text-muted-foreground">
								<li><code>wi</code> = weight for metric i</li>
								<li><code>vi</code> = normalized value for metric i (0.0-1.0)</li>
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
							<h3 class="mb-3 text-xl font-semibold">Validation System Architecture</h3>
							<p class="mb-4 text-muted-foreground">
								Relatr uses a validation system with complete separation of concerns between
								validation logic and weight management:
							</p>
							<div class="space-y-3 rounded-lg bg-muted p-4">
								<h4 class="font-semibold">Core Principles:</h4>
								<ul class="space-y-2 text-muted-foreground">
									<li>
										<strong>Pure Validation Plugins:</strong> Contain only validation logic, no weights
									</li>
									<li>
										<strong>Dynamic Weight Profiles:</strong> Separate weight management from plugins
									</li>
									<li>
										<strong>Flexible Configuration:</strong> Switch between weight schemes without recreating
										plugins
									</li>
									<li>
										<strong>Automatic Normalization:</strong> Handles weight sums that exceed 1.0 gracefully
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
