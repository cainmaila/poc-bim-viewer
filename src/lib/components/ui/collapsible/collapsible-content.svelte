<script lang="ts">
	import { Collapsible as CollapsiblePrimitive } from 'bits-ui'
	import type { Snippet } from 'svelte'

	interface Props extends CollapsiblePrimitive.ContentProps {
		children?: Snippet
	}

	let { children, ref = $bindable(null), ...restProps }: Props = $props()
</script>

<CollapsiblePrimitive.Content bind:ref data-slot="collapsible-content" {...restProps}>
	{@render children?.()}
</CollapsiblePrimitive.Content>
