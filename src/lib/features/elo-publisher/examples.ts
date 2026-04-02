export const defaultPluginSource = `plan notes = do 'nostr.query' {
  kinds: [1],
  authors: [_.targetPubkey],
  since: _.now - 604800,
  limit: 20
} in
if length(notes | []) > 5 then 0.8 else 0.2`;

export const defaultPluginDescription =
	'Scores profiles higher when they have recent note activity in the last 7 days.';

export const defaultPluginTitle = 'Recent note activity';
export const defaultPluginIdentifier = 'recent_note_activity';
export const defaultPluginVersion = '^0.1.16';
export const defaultPluginWeight = '0.4';
