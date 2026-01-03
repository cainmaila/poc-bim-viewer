<script lang="ts">
	import { Toaster } from 'svelte-sonner'
	import { notificationsStore } from '$lib/stores/notifications.svelte'
	import * as Alert from '$lib/components/ui/alert'
	import { XCircle, X } from 'lucide-svelte'

	let { children } = $props()
</script>

<!-- Toast 容器（右上角，自動消失） -->
<Toaster position="top-right" richColors theme="dark" />

<!-- 錯誤橫幅容器（右上角，Toast 下方，手動關閉） -->
<div class="fixed right-4 top-20 z-[10000] flex max-w-md flex-col gap-3">
	{#each notificationsStore.alerts as alert (alert.id)}
		<Alert.Root variant="destructive" class="relative pr-12 shadow-xl">
			<XCircle size={20} />
			<Alert.Description class="leading-relaxed">
				{alert.message}
			</Alert.Description>
			<button
				onclick={() => notificationsStore.dismiss(alert.id)}
				class="absolute right-3 top-3 rounded-full p-1 transition-colors hover:bg-destructive/20"
				aria-label="關閉"
			>
				<X size={16} />
			</button>
		</Alert.Root>
	{/each}
</div>

{@render children?.()}
