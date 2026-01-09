<script lang="ts">
	import { onMount } from 'svelte';

	let {
		data,
		size = 200
	}: {
		data: string;
		size?: number;
	} = $props();

	let canvas: HTMLCanvasElement;
	let mounted = false;

	onMount(() => {
		mounted = true;
		return () => {
			mounted = false;
		};
	});

	async function renderQr() {
		// Avoid running during SSR/hydration edge-cases
		if (!mounted) return;
		if (!canvas) return;
		if (!data) return;

		try {
			// Dynamic import avoids bundler/SSR quirks that can show up only in production deployments.
			const mod = await import('lean-qr');
			const generate = mod.generate as (input: string) => unknown;
			const qr: any = generate(data);

			if (!qr || typeof qr.toCanvas !== 'function') {
				throw new TypeError('lean-qr returned an invalid QR object');
			}

			qr.toCanvas(canvas, {
				on: [0, 0, 0, 255], // black
				off: [255, 255, 255, 255], // white background
				padX: 4,
				padY: 4
			});

			// Set the canvas display size using CSS
			canvas.style.width = `${size}px`;
			canvas.style.height = `${size}px`;
		} catch (error) {
			console.error('Failed to generate QR code:', error);
		}
	}

	// Re-render when props/canvas become available or change.
	$effect(() => {
		void renderQr();
	});
</script>

<div class="inline-block rounded-lg bg-white p-2 shadow-sm">
	<canvas bind:this={canvas} class="block" style="image-rendering: pixelated;"></canvas>
</div>
