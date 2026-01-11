<script lang="ts">
	/**
	 * @component LoadingOverlay
	 *
	 * 模型載入進度覆蓋層。
	 *
	 * 功能：
	 * - 顯示載入進度百分比
	 * - 顯示進度條動畫
	 * - 區分從緩存讀取或網路載入
	 *
	 * @example
	 * ```svelte
	 * <LoadingOverlay isLoading={true} progress={50} fromCache={false} />
	 * ```
	 */
	import { Progress } from '$lib/components/ui/progress'

	interface Props {
		isLoading: boolean
		progress: number
		fromCache?: boolean
	}

	let { isLoading, progress, fromCache = false }: Props = $props()
</script>

{#if isLoading}
	<div class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
		<div
			class="flex min-w-[300px] flex-col items-center gap-6 rounded-xl bg-white/10 p-8 shadow-2xl backdrop-blur-md"
		>
			<div
				class="h-16 w-16 animate-spin rounded-full border-4 border-white/20 border-t-white"
			></div>
			<Progress value={progress} class="w-full" />
			<div class="font-mono text-4xl font-bold tabular-nums text-white">{progress}%</div>
			<div class="text-center text-base text-white/80">
				{fromCache ? '從緩存讀取中...' : '載入模型中...'}
			</div>
		</div>
	</div>
{/if}
