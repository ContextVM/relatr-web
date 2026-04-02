export type MarkdownBlock =
	| { type: 'heading'; level: number; text: string }
	| { type: 'paragraph'; text: string }
	| { type: 'list'; items: string[] }
	| { type: 'code'; language: string; code: string }
	| { type: 'table'; headers: string[]; rows: string[][] };

export type InlineMarkdownToken =
	| { type: 'text'; value: string }
	| { type: 'code'; value: string }
	| { type: 'strong'; value: string };

export function parseMarkdown(source: string): MarkdownBlock[] {
	const lines = source.replace(/\r\n/g, '\n').split('\n');
	const blocks: MarkdownBlock[] = [];
	let index = 0;

	while (index < lines.length) {
		const line = lines[index];
		const trimmed = line.trim();

		if (!trimmed) {
			index += 1;
			continue;
		}

		const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
		if (headingMatch) {
			blocks.push({
				type: 'heading',
				level: headingMatch[1].length,
				text: headingMatch[2].trim()
			});
			index += 1;
			continue;
		}

		const fenceMatch = trimmed.match(/^```([\w-]*)\s*$/);
		if (fenceMatch) {
			const language = fenceMatch[1] || 'text';
			const codeLines: string[] = [];
			index += 1;

			while (index < lines.length && !lines[index].trim().startsWith('```')) {
				codeLines.push(lines[index]);
				index += 1;
			}

			if (index < lines.length) {
				index += 1;
			}

			blocks.push({
				type: 'code',
				language,
				code: codeLines.join('\n')
			});
			continue;
		}

		if (trimmed.startsWith('|')) {
			const tableLines: string[] = [];
			while (index < lines.length && lines[index].trim().startsWith('|')) {
				tableLines.push(lines[index].trim());
				index += 1;
			}

			if (tableLines.length >= 2) {
				const headers = splitTableRow(tableLines[0]);
				const rows = tableLines.slice(2).map(splitTableRow);
				blocks.push({ type: 'table', headers, rows });
				continue;
			}
		}

		if (/^-\s+/.test(trimmed)) {
			const items: string[] = [];
			while (index < lines.length && /^-\s+/.test(lines[index].trim())) {
				items.push(lines[index].trim().replace(/^-\s+/, ''));
				index += 1;
			}
			blocks.push({ type: 'list', items });
			continue;
		}

		const paragraphLines: string[] = [];
		while (index < lines.length) {
			const next = lines[index].trim();
			if (
				!next ||
				/^(#{1,6})\s+/.test(next) ||
				/^```/.test(next) ||
				next.startsWith('|') ||
				/^-\s+/.test(next)
			) {
				break;
			}
			paragraphLines.push(next);
			index += 1;
		}

		blocks.push({ type: 'paragraph', text: paragraphLines.join(' ') });
	}

	return blocks;
}

function splitTableRow(row: string): string[] {
	return row
		.slice(1, row.endsWith('|') ? -1 : row.length)
		.split('|')
		.map((cell) => cell.trim());
}

export function parseInlineMarkdown(text: string): InlineMarkdownToken[] {
	const tokens: InlineMarkdownToken[] = [];
	const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
	let lastIndex = 0;

	for (const match of text.matchAll(pattern)) {
		const matchIndex = match.index ?? 0;
		if (matchIndex > lastIndex) {
			tokens.push({ type: 'text', value: text.slice(lastIndex, matchIndex) });
		}

		const value = match[0];
		if (value.startsWith('**') && value.endsWith('**')) {
			tokens.push({ type: 'strong', value: value.slice(2, -2) });
		} else if (value.startsWith('`') && value.endsWith('`')) {
			tokens.push({ type: 'code', value: value.slice(1, -1) });
		}

		lastIndex = matchIndex + value.length;
	}

	if (lastIndex < text.length) {
		tokens.push({ type: 'text', value: text.slice(lastIndex) });
	}

	return tokens;
}
