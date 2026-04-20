<script lang="ts">
	import { onMount } from 'svelte';
	import type { Bitmap2D, GenerateFn, ImageDataOptions } from 'lean-qr';

	let {
		data,
		size = 200
	}: {
		data: string;
		size?: number;
	} = $props();

	let canvas: HTMLCanvasElement;
	let mounted = false;

	type QrCanvasRenderable = Pick<Bitmap2D, 'toCanvas'>;

	function isQrCanvasRenderable(value: unknown): value is QrCanvasRenderable {
		if (typeof value !== 'object' || value === null) {
			return false;
		}

		return 'toCanvas' in value && typeof value.toCanvas === 'function';
	}

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
			const generate = mod.generate as GenerateFn;
			const qr = generate(data);

			if (!isQrCanvasRenderable(qr)) {
				throw new TypeError('lean-qr returned an invalid QR object');
			}

			const options: Readonly<ImageDataOptions> = {
				on: [0, 0, 0, 255], // black
				off: [255, 255, 255, 255], // white background
				padX: 4,
				padY: 4
			};

			qr.toCanvas(canvas, options);

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
