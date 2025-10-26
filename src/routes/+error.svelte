<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	let isClient = $state(false);

	onMount(() => {
		isClient = true;
	});

	$effect(() => {
		if (page.error) {
			console.error('Page error:', page.error);
		}
	});
</script>

<div class="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-8">
	<div class="text-center">
		{#if page.status === 404}
			<h1 class="mb-4 text-4xl font-bold text-foreground">404</h1>
			<p class="mb-6 text-lg text-muted-foreground">The page you're looking for doesn't exist.</p>
		{:else}
			<h1 class="mb-4 text-4xl font-bold text-foreground">
				{page.status || 'Error'}
			</h1>
			<p class="mb-6 text-lg text-muted-foreground">
				{page.error?.message || 'An unexpected error occurred'}
			</p>
		{/if}

		{#if isClient}
			<div class="space-y-4">
				<a
					href="/"
					class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
				>
					Go Home
				</a>
				<button
					onclick={() => window.history.back()}
					class="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
				>
					Go Back
				</button>
			</div>
		{/if}
	</div>
</div>
