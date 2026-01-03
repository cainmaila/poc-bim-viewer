<script lang="ts">
	import { Tooltip as TooltipPrimitive } from 'bits-ui'
	import { cn } from '$lib/utils.js'

	let {
		ref = $bindable(null),
		class: className,
		sideOffset = 4,
		...restProps
	}: TooltipPrimitive.ContentProps = $props()
</script>

<TooltipPrimitive.Content
	bind:ref
	{sideOffset}
	class={cn(
		'data-[state=delayed-open]:data-[side=top]:animate-slide-in-from-bottom-2 data-[state=delayed-open]:data-[side=bottom]:animate-slide-in-from-top-2 data-[state=delayed-open]:data-[side=left]:animate-slide-in-from-right-2 data-[state=delayed-open]:data-[side=right]:animate-slide-in-from-left-2 data-[state=instant-open]:data-[side=top]:animate-slide-in-from-bottom-2 data-[state=instant-open]:data-[side=bottom]:animate-slide-in-from-top-2 data-[state=instant-open]:data-[side=left]:animate-slide-in-from-right-2 data-[state=instant-open]:data-[side=right]:animate-slide-in-from-left-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md',
		className
	)}
	{...restProps}
/>
