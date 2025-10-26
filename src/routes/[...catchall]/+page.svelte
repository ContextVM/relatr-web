<script lang="ts">
	import { error } from '@sveltejs/kit';

	// This route catches all unmatched paths and throws a 404 error
	// The error will be handled by the +error.svelte page
	error(404, 'Page not found');
</script>
