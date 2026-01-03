<script lang="ts">
	import { Collapsible as CollapsiblePrimitive } from 'bits-ui'
	import type { Snippet } from 'svelte'

	interface Props extends CollapsiblePrimitive.RootProps {
		children?: Snippet
	}

	let { children, ref = $bindable(null), open = $bindable(false), ...restProps }: Props = $props()
</script>

<CollapsiblePrimitive.Root bind:ref bind:open data-slot="collapsible" {...restProps}>
	{@render children?.()}
</CollapsiblePrimitive.Root>
