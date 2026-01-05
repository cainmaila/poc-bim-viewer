<script lang="ts">
	import { settingsStore } from '$lib/stores/settings.svelte'
	import { viewerControlStore } from '$lib/stores/viewerControl.svelte'
	import { modelStore } from '$lib/stores/modelCache.svelte'
	import { Button } from '$lib/components/ui/button'
	import * as Popover from '$lib/components/ui/popover'
	import * as AlertDialog from '$lib/components/ui/alert-dialog'
	import { Switch } from '$lib/components/ui/switch'
	import { Separator } from '$lib/components/ui/separator'
	import BIMSettingsExportButton from './BIMSettingsExportButton.svelte'
	import BIMSettingsImportButton from './BIMSettingsImportButton.svelte'
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
		ArrowRight,
		Info
	} from 'lucide-svelte'

	interface Props {
		needsReload?: boolean
	}

	let { needsReload = $bindable(false) }: Props = $props()

	// 需要重新整理才生效的設定項目變更追蹤
	let showReloadDialog = $state(false)
	let pendingSettingChange: (() => void) | null = $state(null)
	let hasShownReloadDialog = $state(false) // 追蹤是否已顯示過對話框

	/**
	 * 處理需要重新整理的設定變更
	 * 對話框只會在第一次切換時跳出，之後直接保存設定
	 * 確認 → 立即重新整理
	 * 取消 → 保存設定，顯示覆蓋層提示
	 */
	function handleSettingRequiringReload(toggleFn: () => void) {
		if (hasShownReloadDialog) {
			// 已經顯示過對話框，直接執行設定變更
			toggleFn()
			needsReload = true
		} else {
			// 第一次，顯示對話框
			pendingSettingChange = toggleFn
			showReloadDialog = true
		}
	}

	function handleReloadConfirm() {
		hasShownReloadDialog = true
		if (pendingSettingChange) {
			pendingSettingChange()
			pendingSettingChange = null
		}
		// 強制刷新設定到 localStorage，然後重新整理
		settingsStore.flushSettings()
		setTimeout(() => window.location.reload(), 300)
	}

	function handleReloadCancel() {
		hasShownReloadDialog = true
		// 仍然執行設定變更並保存，只是不重新整理
		if (pendingSettingChange) {
			pendingSettingChange()
			pendingSettingChange = null
		}
		// 強制刷新設定到 localStorage
		settingsStore.flushSettings()
		// 設置需要重新整理狀態
		needsReload = true
	}

	// 初始化時同步設定狀態到 viewer（只執行一次）
	$effect(() => {
		viewerControlStore.syncInitialState()
		// 使用 queueMicrotask 確保 viewer 的回調已註冊
		queueMicrotask(() => {
			viewerControlStore.setGridVisible(settingsStore.gridVisible)
			viewerControlStore.setBoundingBoxVisible(settingsStore.boundingBoxVisible)
		})
	})
</script>

<div class="absolute right-4 top-4 z-[100] flex gap-2">
	<!-- 操作說明按鈕 -->
	<Popover.Root>
		<Popover.Trigger>
			<Button
				variant="outline"
				size="icon"
				class="h-10 w-10 rounded-full border-white/20 bg-black/60 text-white/90 shadow-lg backdrop-blur-sm transition-all hover:scale-105 hover:bg-black/80 hover:text-white"
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
									<span class="font-medium">移動滑鼠</span>
									<span class="ml-2 text-muted-foreground">旋轉視角（滑鼠鎖定）</span>
								</div>
							</div>
							<div class="flex items-start gap-3">
								<Move size={16} class="mt-0.5 text-primary" />
								<div>
									<span class="font-medium">滾輪滾動</span>
									<span class="ml-2 text-muted-foreground">沿視線前進/後退</span>
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
									<span class="ml-2 text-muted-foreground">沿視線前進</span>
								</div>
							</div>
							<div class="flex items-start gap-3">
								<ArrowDown size={16} class="mt-0.5 text-primary" />
								<div>
									<span class="font-medium">S 鍵</span>
									<span class="ml-2 text-muted-foreground">沿視線後退</span>
								</div>
							</div>
							<div class="flex items-start gap-3">
								<ArrowLeft size={16} class="mt-0.5 text-primary" />
								<div>
									<span class="font-medium">A 鍵</span>
									<span class="ml-2 text-muted-foreground">向左平移</span>
								</div>
							</div>
							<div class="flex items-start gap-3">
								<ArrowRight size={16} class="mt-0.5 text-primary" />
								<div>
									<span class="font-medium">D 鍵</span>
									<span class="ml-2 text-muted-foreground">向右平移</span>
								</div>
							</div>
							<div class="flex items-start gap-3">
								<Keyboard size={16} class="mt-0.5 text-primary" />
								<div>
									<span class="font-medium">ESC 鍵</span>
									<span class="ml-2 text-muted-foreground">退出 FPS 模式</span>
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
				class="h-10 w-10 rounded-full border-white/20 bg-black/60 text-white/90 shadow-lg backdrop-blur-sm transition-all hover:scale-105 hover:bg-black/80 hover:text-white"
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
						onCheckedChange={() => {
							settingsStore.toggleGrid()
							viewerControlStore.setGridVisible(settingsStore.gridVisible)
						}}
					/>
				</div>

				<div class="flex items-center justify-between">
					<span class="text-sm text-muted-foreground">顯示選取物件的Bounding Box</span>
					<Switch
						checked={settingsStore.boundingBoxVisible}
						onCheckedChange={() => {
							settingsStore.toggleBoundingBox()
							viewerControlStore.setBoundingBoxVisible(settingsStore.boundingBoxVisible)
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
						onCheckedChange={() =>
							handleSettingRequiringReload(() => settingsStore.toggleRayBasedZoom())}
					/>
				</div>

				<div class="flex items-center justify-between">
					<div class="flex flex-col gap-0.5">
						<span class="text-sm text-muted-foreground">FPS 模式</span>
						<span class="text-xs text-muted-foreground/70">第一人稱視角漫遊（滑鼠鎖定）</span>
					</div>
					<Switch
						checked={settingsStore.fpsMode}
						onCheckedChange={() => {
							settingsStore.toggleFPSMode()
							// 不需要重新載入 - 即時切換
						}}
					/>
				</div>

				<div class="flex items-center justify-between">
					<div class="flex flex-col gap-0.5">
						<span class="text-sm text-muted-foreground">電影級燈光</span>
						<span class="text-xs text-muted-foreground/70">使用電影級燈光或預設燈光</span>
					</div>
					<Switch
						checked={settingsStore.cinematicLighting}
						onCheckedChange={() =>
							handleSettingRequiringReload(() => settingsStore.toggleCinematicLighting())}
					/>
				</div>

				<Separator />
				<h3 class="text-sm font-semibold">後期處理效果</h3>

				<div class="flex items-center justify-between">
					<span class="text-sm text-muted-foreground">Bloom（光暈）</span>
					<Switch
						checked={settingsStore.postProcessing.bloomEnabled}
						onCheckedChange={() => handleSettingRequiringReload(() => settingsStore.toggleBloom())}
					/>
				</div>

				<div class="flex items-center justify-between">
					<span class="text-sm text-muted-foreground">SSAO（環境光遮蔽）</span>
					<Switch
						checked={settingsStore.postProcessing.ssaoEnabled}
						onCheckedChange={() => handleSettingRequiringReload(() => settingsStore.toggleSSAO())}
					/>
				</div>

				<div class="flex items-center justify-between">
					<span class="text-sm text-muted-foreground">Outline（邊緣輪廓）</span>
					<Switch
						checked={settingsStore.postProcessing.outlineEnabled}
						onCheckedChange={() =>
							handleSettingRequiringReload(() => settingsStore.toggleOutline())}
					/>
				</div>

				<div class="flex items-center justify-between">
					<span class="text-sm text-muted-foreground">SMAA（抗鋸齒）</span>
					<Switch
						checked={settingsStore.postProcessing.smaaEnabled}
						onCheckedChange={() => handleSettingRequiringReload(() => settingsStore.toggleSMAA())}
					/>
				</div>

				<Separator />
				<h3 class="text-sm font-semibold">模型管理</h3>

				<div class="flex gap-2">
					<BIMSettingsExportButton />
					<BIMSettingsImportButton />
				</div>

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

<!-- 重新整理確認對話框 -->
<AlertDialog.Root bind:open={showReloadDialog}>
	<AlertDialog.Content class="mx-4 w-full max-w-md">
		<AlertDialog.Header class="mb-4 flex items-center gap-3">
			<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/20">
				<Info size={20} class="text-blue-400" />
			</div>
			<AlertDialog.Title>需要重新整理頁面</AlertDialog.Title>
		</AlertDialog.Header>
		<AlertDialog.Description class="pl-[52px]">
			此設定變更需要重新整理頁面才能生效。確定要立即重新整理嗎？
		</AlertDialog.Description>
		<AlertDialog.Footer class="flex gap-3">
			<AlertDialog.Cancel
				class="flex-1"
				onclick={() => {
					showReloadDialog = false
					handleReloadCancel()
				}}
			>
				稍後再說
			</AlertDialog.Cancel>
			<AlertDialog.Action
				class="flex-1 bg-blue-500 hover:bg-blue-600"
				onclick={() => {
					showReloadDialog = false
					handleReloadConfirm()
				}}
			>
				立即重新整理
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
