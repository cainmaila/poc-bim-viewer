<script lang="ts">
	import { Tooltip as TooltipPrimitive } from 'bits-ui'
	import type { Snippet } from 'svelte'

	interface Props extends TooltipPrimitive.RootProps {
		children?: Snippet
	}

	let { children, open = $bindable(false), delayDuration = 700, ...restProps }: Props = $props()
</script>

<TooltipPrimitive.Root bind:open {delayDuration} {...restProps}>
	{@render children?.()}
</TooltipPrimitive.Root>
