<script lang="ts">
	import '../app.css';
	import { ModeWatcher } from 'mode-watcher';
	import Header from '$lib/components/header.svelte';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	let { children } = $props();
</script>

<svelte:head>
	<title>Relatr</title>
	<link rel="icon" href={'/favicon-min.svg'} />
</svelte:head>
<Header />
<ModeWatcher />
<Toaster />
{@render children?.()}
