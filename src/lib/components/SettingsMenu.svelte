<script lang="ts">
	import { settingsStore } from '$lib/stores/settings.svelte'
	import { Button } from '$lib/components/ui/button'
	import * as Popover from '$lib/components/ui/popover'
	import { Switch } from '$lib/components/ui/switch'
	import { Separator } from '$lib/components/ui/separator'

	interface Props {
		onGridToggle?: (visible: boolean) => void
		onBoundingBoxToggle?: (visible: boolean) => void
	}

	let { onGridToggle, onBoundingBoxToggle }: Props = $props()
</script>

<div class="absolute right-4 top-4 z-[100]">
	<Popover.Root>
		<Popover.Trigger>
			<Button
				variant="outline"
				size="icon"
				class="h-10 w-10 rounded-full bg-white/90 shadow-md transition-transform hover:scale-105"
			>
				<span class="text-xl">⚙️</span>
				<span class="sr-only">系統設定</span>
			</Button>
		</Popover.Trigger>
		<Popover.Content class="w-64" align="end">
			<div class="space-y-4">
				<h3 class="text-sm font-semibold">系統設定</h3>
				<Separator />

				<div class="flex items-center justify-between">
					<span class="text-sm text-muted-foreground">顯示網格</span>
					<Switch
						checked={settingsStore.gridVisible}
						onCheckedChange={(checked: boolean) => {
							settingsStore.toggleGrid()
							onGridToggle?.(checked)
						}}
					/>
				</div>

				<div class="flex items-center justify-between">
					<span class="text-sm text-muted-foreground">顯示選取物件的Bounding Box</span>
					<Switch
						checked={settingsStore.boundingBoxVisible}
						onCheckedChange={(checked: boolean) => {
							settingsStore.toggleBoundingBox()
							onBoundingBoxToggle?.(checked)
						}}
					/>
				</div>
			</div>
		</Popover.Content>
	</Popover.Root>
</div>
