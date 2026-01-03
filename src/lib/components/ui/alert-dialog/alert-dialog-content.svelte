<script lang="ts">
	import { AlertDialog as AlertDialogPrimitive } from 'bits-ui'
	import AlertDialogPortal from './alert-dialog-portal.svelte'
	import AlertDialogOverlay from './alert-dialog-overlay.svelte'
	import { cn, type WithoutChildrenOrChild } from '$lib/utils.js'
	import type { ComponentProps } from 'svelte'

	let {
		ref = $bindable(null),
		class: className,
		portalProps,
		overlayProps,
		...restProps
	}: AlertDialogPrimitive.ContentProps & {
		portalProps?: WithoutChildrenOrChild<ComponentProps<typeof AlertDialogPortal>>
		overlayProps?: WithoutChildrenOrChild<ComponentProps<typeof AlertDialogOverlay>>
	} = $props()
</script>

<AlertDialogPortal {...portalProps}>
	<AlertDialogOverlay {...overlayProps} />
	<AlertDialogPrimitive.Content
		bind:ref
		data-slot="alert-dialog-content"
		class={cn(
			'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-top-[48%] fixed left-[50%] top-[50%] z-[9999] w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-xl border border-border/50 bg-card p-6 shadow-2xl',
			className
		)}
		{...restProps}
	/>
</AlertDialogPortal>
