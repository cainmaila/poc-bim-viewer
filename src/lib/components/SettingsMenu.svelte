<script lang="ts">
	import { settingsStore } from '$lib/stores/settings.svelte'
	import { modelStore } from '$lib/stores/modelCache.svelte'
	import { Button } from '$lib/components/ui/button'
	import * as Popover from '$lib/components/ui/popover'
	import { Switch } from '$lib/components/ui/switch'
	import { Separator } from '$lib/components/ui/separator'
	import {
		Settings,
		Trash2,
		CircleHelp,
		Mouse,
		Keyboard,
		RotateCw,
		ZoomIn,
		Move,
		ArrowUp,
		ArrowDown,
		ArrowLeft,
		ArrowRight
	} from 'lucide-svelte'

	interface Props {
		onGridToggle?: (visible: boolean) => void
		onBoundingBoxToggle?: (visible: boolean) => void
	}

	let { onGridToggle, onBoundingBoxToggle }: Props = $props()
</script>

<div class="absolute right-4 top-4 z-[100] flex gap-2">
	<!-- 操作說明按鈕 -->
	<Popover.Root>
		<Popover.Trigger>
			<Button
				variant="outline"
				size="icon"
				class="h-10 w-10 rounded-full bg-white/90 shadow-md transition-transform hover:scale-105"
			>
				<CircleHelp size={20} />
				<span class="sr-only">操作說明</span>
			</Button>
		</Popover.Trigger>
		<Popover.Content class="w-96" align="end">
			<div class="space-y-4">
				<!-- 標題 -->
				<div class="flex items-center gap-2">
					<CircleHelp size={18} class="text-primary" />
					<h3 class="text-sm font-semibold">操作說明</h3>
				</div>
				<Separator />

				<!-- 滑鼠操作 -->
				<div class="space-y-3">
					<h4 class="flex items-center gap-2 text-sm font-medium">
						<Mouse size={16} class="text-muted-foreground" />
						滑鼠操作
					</h4>
					<div class="space-y-2 text-sm">
						{#if settingsStore.fpsMode}
							<!-- FPS 模式 -->
							<div class="flex items-start gap-3">
								<RotateCw size={16} class="mt-0.5 text-primary" />
								<div>
									<span class="font-medium">右鍵拖曳</span>
									<span class="ml-2 text-muted-foreground">FPS 視角旋轉</span>
								</div>
							</div>
							<div class="flex items-start gap-3">
								<ZoomIn size={16} class="mt-0.5 text-primary" />
								<div>
									<span class="font-medium">滾輪滾動</span>
									<span class="ml-2 text-muted-foreground">縮放視圖</span>
								</div>
							</div>
							<div class="flex items-start gap-3">
								<Move size={16} class="mt-0.5 text-primary" />
								<div>
									<span class="font-medium">右鍵 + Shift 拖曳</span>
									<span class="ml-2 text-muted-foreground">平移視角</span>
								</div>
							</div>
						{:else}
							<!-- OrbitControls 模式 -->
							<div class="flex items-start gap-3">
								<RotateCw size={16} class="mt-0.5 text-primary" />
								<div>
									<span class="font-medium">左鍵拖曳</span>
									<span class="ml-2 text-muted-foreground">旋轉視角</span>
								</div>
							</div>
							<div class="flex items-start gap-3">
								<ZoomIn size={16} class="mt-0.5 text-primary" />
								<div>
									<span class="font-medium">滾輪滾動</span>
									<span class="ml-2 text-muted-foreground">縮放視圖</span>
								</div>
							</div>
							<div class="flex items-start gap-3">
								<Move size={16} class="mt-0.5 text-primary" />
								<div>
									<span class="font-medium">右鍵拖曳</span>
									<span class="ml-2 text-muted-foreground">平移視角</span>
								</div>
							</div>
						{/if}
					</div>
				</div>

				<Separator />

				<!-- 鍵盤操作 -->
				<div class="space-y-3">
					<h4 class="flex items-center gap-2 text-sm font-medium">
						<Keyboard size={16} class="text-muted-foreground" />
						鍵盤操作
					</h4>
					<div class="space-y-2 text-sm">
						{#if settingsStore.fpsMode}
							<!-- FPS 模式 -->
							<div class="flex items-start gap-3">
								<ArrowUp size={16} class="mt-0.5 text-primary" />
								<div>
									<span class="font-medium">W 鍵</span>
									<span class="ml-2 text-muted-foreground">朝視角方向前進</span>
								</div>
							</div>
							<div class="flex items-start gap-3">
								<ArrowDown size={16} class="mt-0.5 text-primary" />
								<div>
									<span class="font-medium">S 鍵</span>
									<span class="ml-2 text-muted-foreground">朝視角方向後退</span>
								</div>
							</div>
							<div class="flex items-start gap-3">
								<ArrowLeft size={16} class="mt-0.5 text-primary" />
								<div>
									<span class="font-medium">A 鍵</span>
									<span class="ml-2 text-muted-foreground">朝視角左側移動</span>
								</div>
							</div>
							<div class="flex items-start gap-3">
								<ArrowRight size={16} class="mt-0.5 text-primary" />
								<div>
									<span class="font-medium">D 鍵</span>
									<span class="ml-2 text-muted-foreground">朝視角右側移動</span>
								</div>
							</div>
						{:else}
							<!-- OrbitControls 模式 -->
							<div class="flex items-start gap-3">
								<ArrowUp size={16} class="mt-0.5 text-primary" />
								<div>
									<span class="font-medium">W 鍵</span>
									<span class="ml-2 text-muted-foreground">向前移動（水平面）</span>
								</div>
							</div>
							<div class="flex items-start gap-3">
								<ArrowDown size={16} class="mt-0.5 text-primary" />
								<div>
									<span class="font-medium">S 鍵</span>
									<span class="ml-2 text-muted-foreground">向後移動（水平面）</span>
								</div>
							</div>
							<div class="flex items-start gap-3">
								<ArrowLeft size={16} class="mt-0.5 text-primary" />
								<div>
									<span class="font-medium">A 鍵</span>
									<span class="ml-2 text-muted-foreground">向左移動（水平面）</span>
								</div>
							</div>
							<div class="flex items-start gap-3">
								<ArrowRight size={16} class="mt-0.5 text-primary" />
								<div>
									<span class="font-medium">D 鍵</span>
									<span class="ml-2 text-muted-foreground">向右移動（水平面）</span>
								</div>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</Popover.Content>
	</Popover.Root>

	<!-- 設定按鈕 -->
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

				<div class="flex items-center justify-between">
					<div class="flex flex-col gap-0.5">
						<span class="text-sm text-muted-foreground">Ray-based 滾輪縮放</span>
						<span class="text-xs text-muted-foreground/70">沿滑鼠射線方向縮放</span>
					</div>
					<Switch
						checked={settingsStore.rayBasedZoom}
						onCheckedChange={() => {
							settingsStore.toggleRayBasedZoom()
							// 自動立即重新整理頁面套用新配置
							setTimeout(() => window.location.reload(), 300)
						}}
					/>
				</div>

				<div class="flex items-center justify-between">
					<div class="flex flex-col gap-0.5">
						<span class="text-sm text-muted-foreground">FPS 滑鼠控制</span>
						<span class="text-xs text-muted-foreground/70">右鍵拖曳旋轉視角（遊戲操作）</span>
					</div>
					<Switch
						checked={settingsStore.fpsMode}
						onCheckedChange={() => {
							settingsStore.toggleFPSMode()
							// 不需要重新載入 - 即時切換
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

				<Separator />
				<h3 class="text-sm font-semibold">模型管理</h3>

				<Button
					variant="destructive"
					class="w-full"
					onclick={async () => {
						await modelStore.unloadModel()
					}}
				>
					<Trash2 size={16} class="mr-2" />
					卸載模型
				</Button>
			</div>
		</Popover.Content>
	</Popover.Root>
</div>
