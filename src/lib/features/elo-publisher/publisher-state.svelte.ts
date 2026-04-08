import { browser } from '$app/environment';
import {
	defaultPluginDescription,
	defaultPluginIdentifier,
	defaultPluginSource,
	defaultPluginTitle,
	defaultPluginVersion,
	defaultPluginWeight
} from './examples';

const STORAGE_KEY = 'relatr-elo-publisher-draft';

export interface PublisherDraft {
	title: string;
	identifier: string;
	description: string;
	version: string;
	weight: string;
	source: string;
}

const defaultDraft: PublisherDraft = {
	title: defaultPluginTitle,
	identifier: defaultPluginIdentifier,
	description: defaultPluginDescription,
	version: defaultPluginVersion,
	weight: defaultPluginWeight,
	source: defaultPluginSource
};

function loadDraft(): PublisherDraft {
	if (!browser) return { ...defaultDraft };

	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { ...defaultDraft };
		return { ...defaultDraft, ...(JSON.parse(raw) as Partial<PublisherDraft>) };
	} catch {
		return { ...defaultDraft };
	}
}

export function createPublisherState() {
	let draft = $state<PublisherDraft>(loadDraft());

	$effect(() => {
		if (!browser) return;
		localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
	});

	const canValidate = $derived(draft.source.trim().length > 0);
	const canPublish = $derived(
		draft.title.trim().length > 0 &&
			draft.identifier.trim().length > 0 &&
			draft.version.trim().length > 0 &&
			draft.source.trim().length > 0
	);

	return {
		getDraft() {
			return draft;
		},
		setField<Key extends keyof PublisherDraft>(key: Key, value: PublisherDraft[Key]) {
			draft = {
				...draft,
				[key]: value
			};
		},
		reset() {
			draft = { ...defaultDraft };
		},
		loadExample() {
			draft = { ...defaultDraft };
		},
		canValidate() {
			return canValidate;
		},
		canPublish() {
			return canPublish;
		}
	};
}
