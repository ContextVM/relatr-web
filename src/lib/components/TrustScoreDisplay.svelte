<script lang="ts">
	let {
		value,
		mode = 'minimal',
		size = 'md',
		label,
		showLabel = false
	}: {
		value: number;
		mode?: 'minimal' | 'dots' | 'combined';
		size?: 'sm' | 'md' | 'lg';
		label?: string;
		showLabel?: boolean;
	} = $props();

	function getDotColor(score: number) {
		if (score >= 0.8) return 'bg-green-500';
		if (score >= 0.6) return 'bg-yellow-500';
		if (score >= 0.4) return 'bg-orange-500';
		return 'bg-red-500';
	}

	function getTextColor(score: number) {
		if (score >= 0.8) return 'text-green-600';
		if (score >= 0.6) return 'text-yellow-600';
		if (score >= 0.4) return 'text-orange-600';
		return 'text-red-600';
	}

	function getDotSize() {
		switch (size) {
			case 'sm':
				return 'w-2 h-2';
			case 'lg':
				return 'w-4 h-4';
			default:
				return 'w-3 h-3';
		}
	}

	function getTextSize() {
		switch (size) {
			case 'sm':
				return 'text-xs';
			case 'lg':
				return 'text-lg';
			default:
				return 'text-sm';
		}
	}

	function getLabelSize() {
		switch (size) {
			case 'sm':
				return 'text-xs';
			case 'lg':
				return 'text-sm';
			default:
				return 'text-xs';
		}
	}
</script>

<!-- Minimal mode - just the number -->
{#if mode === 'minimal'}
	<div class="flex items-center gap-2">
		<span class="{getTextSize()} font-medium {getTextColor(value)}">
			{value.toFixed(2)}
		</span>
		{#if showLabel && label}
			<span class="{getLabelSize()} text-muted-foreground">{label}</span>
		{/if}
	</div>
	<!-- Dots mode - just the colored dot -->
{:else if mode === 'dots'}
	<div class="flex items-center gap-2">
		<div class="{getDotSize()} {getDotColor(value)} rounded-full"></div>
		{#if showLabel && label}
			<span class="{getLabelSize()} text-muted-foreground">{label}</span>
		{/if}
	</div>
	<!-- Combined mode - both number and dot -->
{:else if mode === 'combined'}
	<div class="flex items-center gap-2">
		<div class="{getDotSize()} {getDotColor(value)} rounded-full"></div>
		<span class="{getTextSize()} font-medium {getTextColor(value)}">
			{value.toFixed(2)}
		</span>
		{#if showLabel && label}
			<span class="{getLabelSize()} text-muted-foreground">{label}</span>
		{/if}
	</div>
{/if}
