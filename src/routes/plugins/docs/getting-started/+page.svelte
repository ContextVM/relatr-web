<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import MarkdownDoc from '$lib/components/plugins/MarkdownDoc.svelte';
	import source from '$lib/content/plugins/docs/getting-started.md?raw';
</script>

<div class="flex min-h-screen flex-col bg-background">
	<main class="container mx-auto max-w-4xl flex-1 px-6 py-8">
		<div class="mx-auto w-full max-w-3xl space-y-8">
			<MarkdownDoc {source} />

			<Card>
				<CardHeader>
					<CardTitle>Read next</CardTitle>
				</CardHeader>
				<CardContent class="space-y-3">
					<Button href="/plugins/docs/examples" variant="outline" class="w-full">
						See worked examples
					</Button>
					<Button href="/plugins/docs/capabilities" variant="outline" class="w-full">
						Open capability reference
					</Button>
					<Button href="/plugins/docs/publishing" variant="ghost" class="w-full">
						Learn publishing format
					</Button>
				</CardContent>
			</Card>
		</div>
	</main>
</div>
