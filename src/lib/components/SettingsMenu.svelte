<script lang="ts">
	import { settingsStore } from '$lib/stores/settings.svelte'
	import { Button } from '$lib/components/ui/button'
	import * as Popover from '$lib/components/ui/popover'
	import { Switch } from '$lib/components/ui/switch'
	import { Separator } from '$lib/components/ui/separator'
	import { Settings } from 'lucide-svelte'

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
				<Settings size={20} />
				<span class="sr-only">系統設定</span>
			</Button>
		</Popover.Trigger>
		<Popover.Content class="w-72" align="end">
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

				<Separator />
				<h3 class="text-sm font-semibold">後期處理效果</h3>

				<div class="flex items-center justify-between">
					<span class="text-sm text-muted-foreground">Bloom（光暈）</span>
					<Switch
						checked={settingsStore.postProcessing.bloomEnabled}
						onCheckedChange={() => {
							settingsStore.toggleBloom()
							// 自動立即重新整理頁面套用新配置
							setTimeout(() => window.location.reload(), 300)
						}}
					/>
				</div>

				<div class="flex items-center justify-between">
					<span class="text-sm text-muted-foreground">SSAO（環境光遮蔽）</span>
					<Switch
						checked={settingsStore.postProcessing.ssaoEnabled}
						onCheckedChange={() => {
							settingsStore.toggleSSAO()
							// 自動立即重新整理頁面套用新配置
							setTimeout(() => window.location.reload(), 300)
						}}
					/>
				</div>

				<div class="flex items-center justify-between">
					<span class="text-sm text-muted-foreground">Outline（邊緣輪廓）</span>
					<Switch
						checked={settingsStore.postProcessing.outlineEnabled}
						onCheckedChange={() => {
							settingsStore.toggleOutline()
							// 自動立即重新整理頁面套用新配置
							setTimeout(() => window.location.reload(), 300)
						}}
					/>
				</div>

				<div class="flex items-center justify-between">
					<span class="text-sm text-muted-foreground">SMAA（抗鋸齒）</span>
					<Switch
						checked={settingsStore.postProcessing.smaaEnabled}
						onCheckedChange={() => {
							settingsStore.toggleSMAA()
							// 自動立即重新整理頁面套用新配置
							setTimeout(() => window.location.reload(), 300)
						}}
					/>
				</div>
			</div>
		</Popover.Content>
	</Popover.Root>
</div>
