<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { copyToClipboard } from '$lib/utils';
	import { parseInlineMarkdown, parseMarkdown } from '$lib/plugins/docs/markdown';

	let {
		source,
		class: className = ''
	}: {
		source: string;
		class?: string;
	} = $props();

	const blocks = $derived(parseMarkdown(source));

	function isExternalHref(href: string) {
		return /^(https?:)?\/\//.test(href);
	}
</script>

<div class={`space-y-6 ${className}`}>
	<div class="flex justify-end">
		<Button variant="outline" size="sm" onclick={() => copyToClipboard(source)}
			>Copy markdown</Button
		>
	</div>

	{#each blocks as block, index (`${block.type}-${index}`)}
		{#if block.type === 'heading'}
			{#if block.level === 1}
				<section class="space-y-2">
					<h1 class="text-4xl font-bold tracking-tight">{block.text}</h1>
				</section>
			{:else if block.level === 2}
				<section class="space-y-3 pt-2">
					<h2 class="text-2xl font-semibold tracking-tight">{block.text}</h2>
				</section>
			{:else}
				<h3 class="text-lg font-semibold tracking-tight">{block.text}</h3>
			{/if}
		{:else if block.type === 'paragraph'}
			<p class="leading-7 text-muted-foreground">
				{#each parseInlineMarkdown(block.text) as token, tokenIndex (`${index}-${tokenIndex}`)}
					{#if token.type === 'code'}
						<code class="rounded bg-secondary px-1.5 py-0.5 font-mono text-[0.85em]"
							>{token.value}</code
						>
					{:else if token.type === 'link'}
						<a
							href={token.href}
							class="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-primary"
							target={isExternalHref(token.href) ? '_blank' : undefined}
							rel={isExternalHref(token.href) ? 'noreferrer' : undefined}
						>
							{token.label}
						</a>
					{:else if token.type === 'strong'}
						<strong class="font-semibold text-foreground">{token.value}</strong>
					{:else}
						{token.value}
					{/if}
				{/each}
			</p>
		{:else if block.type === 'list'}
			<ul class="list-disc space-y-2 pl-6 text-muted-foreground">
				{#each block.items as item (`${item}`)}
					<li>
						{#each parseInlineMarkdown(item) as token, tokenIndex (`${item}-${tokenIndex}`)}
							{#if token.type === 'code'}
								<code class="rounded bg-secondary px-1.5 py-0.5 font-mono text-[0.85em]"
									>{token.value}</code
								>
							{:else if token.type === 'link'}
								<a
									href={token.href}
									class="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-primary"
									target={isExternalHref(token.href) ? '_blank' : undefined}
									rel={isExternalHref(token.href) ? 'noreferrer' : undefined}
								>
									{token.label}
								</a>
							{:else if token.type === 'strong'}
								<strong class="font-semibold text-foreground">{token.value}</strong>
							{:else}
								{token.value}
							{/if}
						{/each}
					</li>
				{/each}
			</ul>
		{:else if block.type === 'code'}
			<div class="space-y-2">
				<div class="flex justify-end">
					<Button variant="outline" size="sm" onclick={() => copyToClipboard(block.code)}
						>Copy code</Button
					>
				</div>
				<pre class="overflow-x-auto rounded-md bg-secondary p-4 text-xs"><code>{block.code}</code
					></pre>
			</div>
		{:else if block.type === 'table'}
			<div class="overflow-x-auto rounded-lg border">
				<table class="w-full text-left text-sm">
					<thead class="border-b bg-muted/40 text-muted-foreground">
						<tr>
							{#each block.headers as header (`${header}`)}
								<th class="px-3 py-2 font-medium">
									{#each parseInlineMarkdown(header) as token, tokenIndex (`${header}-${tokenIndex}`)}
										{#if token.type === 'code'}
											<code class="rounded bg-secondary px-1.5 py-0.5 font-mono text-[0.85em]"
												>{token.value}</code
											>
										{:else if token.type === 'link'}
											<a
												href={token.href}
												class="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-primary"
												target={isExternalHref(token.href) ? '_blank' : undefined}
												rel={isExternalHref(token.href) ? 'noreferrer' : undefined}
											>
												{token.label}
											</a>
										{:else if token.type === 'strong'}
											<strong class="font-semibold text-foreground">{token.value}</strong>
										{:else}
											{token.value}
										{/if}
									{/each}
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each block.rows as row, rowIndex (`${rowIndex}`)}
							<tr class="border-b align-top last:border-0">
								{#each row as cell, cellIndex (`${rowIndex}-${cellIndex}`)}
									<td class="px-3 py-2 text-muted-foreground">
										{#each parseInlineMarkdown(cell) as token, tokenIndex (`${rowIndex}-${cellIndex}-${tokenIndex}`)}
											{#if token.type === 'code'}
												<code class="rounded bg-secondary px-1.5 py-0.5 font-mono text-[0.85em]"
													>{token.value}</code
												>
											{:else if token.type === 'link'}
												<a
													href={token.href}
													class="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-primary"
													target={isExternalHref(token.href) ? '_blank' : undefined}
													rel={isExternalHref(token.href) ? 'noreferrer' : undefined}
												>
													{token.label}
												</a>
											{:else if token.type === 'strong'}
												<strong class="font-semibold text-foreground">{token.value}</strong>
											{:else}
												{token.value}
											{/if}
										{/each}
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/each}
</div>
