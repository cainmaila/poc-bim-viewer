<script lang="ts">
	/**
	 * @component BIMSettingsExportButton
	 *
	 * BIM 設定匯出按鈕，將當前模型的屬性設定匯出為 JSON 檔案。
	 *
	 * @example
	 * ```svelte
	 * <BIMSettingsExportButton />
	 * ```
	 */
	import { bimSettingsStore } from '$lib/stores/bimSettings.svelte'
	import { Button } from '$lib/components/ui/button'
	import { Download } from 'lucide-svelte'
	import { notify } from '$lib/utils/notify'

	function handleExport() {
		try {
			const json = bimSettingsStore.exportSettings()
			const blob = new Blob([json], { type: 'application/json' })
			const url = URL.createObjectURL(blob)

			const link = document.createElement('a')
			link.href = url
			link.download = `bim-settings-${Date.now()}.json`
			link.click()

			URL.revokeObjectURL(url)
		} catch (error) {
			console.error('[BIMSettingsExport] Export failed:', error)
			notify.error(error instanceof Error ? error.message : '匯出失敗')
		}
	}
</script>

<Button variant="outline" size="sm" onclick={handleExport}>
	<Download size={16} class="mr-2" />
	匯出設定
</Button>
