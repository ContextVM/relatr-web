import { validateRelatrPluginProgram } from '@contextvm/relo';

export interface PublisherDiagnostic {
	message: string;
	severity: 'error' | 'warning';
	location?: { line: number; column: number };
}

export interface PublisherValidationResult {
	diagnostics: PublisherDiagnostic[];
	programSummary: {
		rounds: number;
		hasScore: boolean;
	};
}

function parseLocation(message: string): { line: number; column: number } | undefined {
	const match = /line\s+(\d+),\s*column\s+(\d+)/i.exec(message);
	if (!match) return undefined;
	return {
		line: Number(match[1]),
		column: Number(match[2])
	};
}

export function validatePluginSource(source: string): PublisherValidationResult {
	const trimmed = source.trim();

	if (!trimmed) {
		return {
			diagnostics: [{ message: 'Plugin source is required', severity: 'error' }],
			programSummary: { rounds: 0, hasScore: false }
		};
	}

	const result = validateRelatrPluginProgram(trimmed);
	const diagnostics: PublisherDiagnostic[] = result.diagnostics.map((diagnostic) => ({
		message: diagnostic.message,
		severity: diagnostic.severity,
		location: diagnostic.location ?? parseLocation(diagnostic.message)
	}));

	if ((result.program?.rounds?.length ?? 0) === 0) {
		diagnostics.push({
			message: 'The plugin should include at least one planning round',
			severity: 'warning'
		});
	}

	return {
		diagnostics,
		programSummary: {
			rounds: result.program?.rounds?.length ?? 0,
			hasScore: Boolean(result.program?.score)
		}
	};
}

export function validatePluginManifest(input: {
	title: string;
	identifier: string;
	description: string;
	version: string;
	weight: string;
}): PublisherDiagnostic[] {
	const diagnostics: PublisherDiagnostic[] = [];

	if (!input.title.trim()) {
		diagnostics.push({ message: 'Title is required', severity: 'error' });
	}

	if (!/^[a-z0-9_-]+$/i.test(input.identifier.trim())) {
		diagnostics.push({
			message: 'Identifier must contain only letters, numbers, underscores, or hyphens',
			severity: 'error'
		});
	}

	if (!input.version.trim()) {
		diagnostics.push({ message: 'Relatr version is required', severity: 'error' });
	}

	if (input.weight.trim()) {
		const weight = Number(input.weight);
		if (!Number.isFinite(weight) || weight < 0 || weight > 1) {
			diagnostics.push({
				message: 'Default weight must be a number between 0 and 1',
				severity: 'error'
			});
		}
	}

	if (!input.description.trim()) {
		diagnostics.push({
			message: 'Description is recommended so operators can understand the plugin quickly',
			severity: 'warning'
		});
	}

	return diagnostics;
}
