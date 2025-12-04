<script lang="ts">
	import '../app.css';
	import { ModeWatcher } from 'mode-watcher';
	import Header from '$lib/components/header.svelte';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import { queryClient } from '$lib/query-client';
	let { children } = $props();
</script>

<svelte:head>
	<title>Relatr</title>
	<link rel="icon" href="/favicon-min.svg" />
</svelte:head>
<QueryClientProvider client={queryClient}>
	<Header />
	<ModeWatcher />
	<Toaster />
	{@render children?.()}
</QueryClientProvider>
