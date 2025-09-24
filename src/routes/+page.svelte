<script lang="ts">
	import type { PageServerData } from './$types';
	import { page } from '$app/state';

	let { data }: { data: PageServerData } = $props();
</script>

<section class="mx-auto max-w-xs">
	<h1 class="flex items-center justify-end gap-2 h4">
		<span>Startpage</span>
	</h1>
	<p>authUser: {page.data.authUser?.username}</p>
</section>
