<script lang="ts">
	import MarkdownDoc from '$lib/components/plugins/MarkdownDoc.svelte';
	import source from '$lib/content/plugins/docs/capabilities.md?raw';
</script>

<div class="flex min-h-screen flex-col bg-background">
	<main class="container mx-auto max-w-5xl flex-1 px-6 py-8">
		<div class="mx-auto w-full max-w-4xl space-y-8">
			<MarkdownDoc {source} />
		</div>
	</main>
</div>
