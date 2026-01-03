<script lang="ts">
	import { Collapsible as CollapsiblePrimitive } from 'bits-ui'
	import type { Snippet } from 'svelte'

	interface Props extends CollapsiblePrimitive.TriggerProps {
		children?: Snippet
	}

	let { children, ref = $bindable(null), ...restProps }: Props = $props()
</script>

<CollapsiblePrimitive.Trigger bind:ref data-slot="collapsible-trigger" {...restProps}>
	{@render children?.()}
</CollapsiblePrimitive.Trigger>
