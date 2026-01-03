<script lang="ts">
	import '../app.css'
	import favicon from '$lib/assets/favicon.svg'
	import { version } from '$app/environment'
	import NotificationProvider from '$lib/components/NotificationProvider.svelte'
	import { Tooltip } from 'bits-ui'

	let { children } = $props()

	console.log(
		`%c 🏢 DTA SvelteKit %c ${version} `,
		'background: #00529b; color: #ffffff; padding: 4px 8px; border-radius: 8px 0 0 8px; font-weight: bold; font-size: 12px;',
		'background: #f7f7f7; color: #00529b; padding: 4px 8px; border-radius: 0 8px 8px 0; font-size: 12px;'
	)
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<Tooltip.Provider>
	<NotificationProvider>
		{@render children()}
	</NotificationProvider>
</Tooltip.Provider>
