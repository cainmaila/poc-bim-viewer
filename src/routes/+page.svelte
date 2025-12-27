<script lang="ts">
	import BIMViewer from '$lib/components/BIMViewer.svelte'
	import Sidebar from '$lib/components/Sidebar.svelte'
	import SettingsMenu from '$lib/components/SettingsMenu.svelte'
	import LoadingOverlay from '$lib/components/LoadingOverlay.svelte'
	import * as Alert from '$lib/components/ui/alert'
	import { modelStore } from '$lib/stores/modelCache.svelte'
	import { base } from '$app/paths'
	import { onMount } from 'svelte'
	import { getActiveModelKey, getModelFromCache } from '$lib/utils/indexedDBCache'

	const defaultModelUrl = `${base}/building.glb`
	let isDragOver = $state(false)
	let viewerRef = $state<ReturnType<typeof BIMViewer>>()

	onMount(async () => {
		const activeKey = await getActiveModelKey()
		if (activeKey) {
			const cachedData = await getModelFromCache(activeKey)
			if (cachedData) {
				// 從緩存載入模型
				await modelStore.loadModelFromCache(activeKey)
			}
		}
	})

	function handleDragOver(e: DragEvent) {
		e.preventDefault()
		isDragOver = true
	}

	function handleDragLeave() {
		isDragOver = false
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault()
		isDragOver = false

		const files = e.dataTransfer?.files
		if (!files || files.length === 0) return

		const file = files[0]
		if (!file.name.toLowerCase().endsWith('.glb')) {
			modelStore.clearError()
			// 設定臨時錯誤
			modelStore.error = '檔案格式錯誤，請使用 .glb 模型'
			return
		}

		if (file.size > 50 * 1024 * 1024) {
			modelStore.clearError()
			// 設定臨時錯誤
			modelStore.error = '模型過大，建議處理素材(>50MB)'
			return
		}

		await modelStore.loadModelFromFile(file)
	}

	function handleSelect(id: string) {
		viewerRef?.flyTo(id)
	}
</script>

<div
	class="fixed inset-0 overflow-hidden bg-gray-100"
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
	role="region"
	aria-label="BIM Viewer"
>
	<div class="absolute inset-0 z-0">
		<BIMViewer bind:this={viewerRef} autoRotate={false} />
		{#if !modelStore.model && !modelStore.isLoading}
			<div class="pointer-events-none absolute inset-0 z-50 flex items-center justify-center">
				<div
					class="max-w-md rounded-3xl border border-white/30 bg-white/70 p-12 text-center shadow-xl backdrop-blur-lg"
				>
					<span class="mb-6 block text-6xl opacity-80">📦</span>
					<h3 class="mb-3 text-2xl font-semibold text-gray-800">尚未載入模型</h3>
					<p class="m-0 leading-relaxed text-gray-600">請將 .glb 檔案拖曳至此處開始</p>
				</div>
			</div>
		{/if}
	</div>

	<div class="pointer-events-none absolute top-0 bottom-0 left-0 z-10 flex">
		<Sidebar treeData={modelStore.treeData} onSelect={handleSelect} />
	</div>

	<SettingsMenu
		onGridToggle={(visible) => {
			viewerRef?.setGridVisible(visible)
		}}
		onBoundingBoxToggle={(visible) => {
			viewerRef?.setBoundingBoxVisible(visible)
		}}
	/>

	{#if isDragOver}
		<div
			class="border-primary bg-primary/40 pointer-events-none absolute inset-0 z-[9000] flex items-center justify-center border-4 border-dashed backdrop-blur-sm"
		>
			<div class="text-primary rounded-full bg-white px-8 py-4 font-semibold shadow-lg">
				請在此處放開以載入模型
			</div>
		</div>
	{/if}

	{#if modelStore.isLoading}
		<LoadingOverlay
			isLoading={true}
			progress={modelStore.loadProgress}
			fromCache={modelStore.fromCache}
		/>
	{/if}

	{#if modelStore.error}
		<Alert.Root
			variant="destructive"
			class="absolute top-8 left-1/2 z-[10000] flex max-w-md -translate-x-1/2 flex-col items-center gap-4 shadow-xl"
		>
			<div class="text-4xl">⚠️</div>
			<Alert.Description class="text-center text-base leading-relaxed">
				{modelStore.error}
			</Alert.Description>
			<button
				class="text-destructive rounded bg-white px-6 py-2 font-semibold transition-all hover:-translate-y-px hover:bg-gray-100 active:translate-y-0"
				onclick={() => modelStore.loadModel(defaultModelUrl)}
			>
				重試
			</button>
		</Alert.Root>
	{/if}
</div>

<style lang="postcss">
	/* 確保Sidebar捕獲指針事件 */
	:global(aside) {
		pointer-events: auto;
		box-shadow: 4px 0 16px rgba(0, 0, 0, 0.1);
	}
</style>
