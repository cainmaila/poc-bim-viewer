/**
 * BIM 節點路徑產生工具
 *
 * 使用斜線分隔格式為 Three.js 場景節點產生唯一路徑。
 * 若節點名稱重複，會附加索引以區分。
 *
 * 範例路徑：
 * - 'Scene/Building/Floor1'
 * - 'Scene/Building/Floor1[1]'（重複）
 */

import type * as THREE from 'three'
import type { EnhancedTreeItem, NodePath, NodeOverrides } from '$lib/types/bimSettings'
import { TimeSlicer } from '$lib/utils/TimeSlicer'

/**
 * 建立場景中所有節點的完整路徑對應 (Async Version)
 *
 * 遍歷場景樹，為每個節點產生唯一路徑。
 * 若名稱重複，會附加索引如 [0]、[1] 等。
 * 使用 TimeSlicer 避免阻塞主線程。
 *
 * @param object - Three.js 根 Object3D（通常為 scene 或模型根節點）
 * @returns UUID -> NodePath 的 Map
 */
export async function buildPathMapping(object: THREE.Object3D): Promise<Map<string, NodePath>> {
	const pathMap = new Map<string, NodePath>()
	const nameCounters = new Map<string, number>() // 追蹤每個父層下的名稱計數
	const slicer = new TimeSlicer(12) // 初始化 TimeSlicer

	async function traverse(node: THREE.Object3D, parentPath: string) {
		const baseName = node.name || node.type

		// 建立用於重複計數的唯一鍵（parentPath::nodeName）
		const counterKey = `${parentPath}::${baseName}`
		const count = nameCounters.get(counterKey) || 0
		nameCounters.set(counterKey, count + 1)

		// 產生路徑（首次出現不加索引，重複則加 [1]、[2] 等）
		const pathPrefix = parentPath ? `${parentPath}/${baseName}` : baseName
		const finalPath = count > 0 ? `${pathPrefix}[${count}]` : pathPrefix

		// 儲存對應關係
		pathMap.set(node.uuid, finalPath)

		// 定期檢查時間預算
		await slicer.check()

		// 遞迴處理子節點
		for (const child of node.children) {
			await traverse(child, finalPath)
		}
	}

	await traverse(object, '')
	return pathMap
}

/**
 * 產生包含路徑與覆寫資訊的強化樹狀資料
 *
 * 將 Three.js 場景圖轉換為 `EnhancedTreeItem` 結構，
 * 並將原始屬性與覆寫設定合併。
 *
 * @param object - 根 Three.js Object3D
 * @param pathMap - UUID -> NodePath 的對應
 * @param overrides - 要套用的節點覆寫設定
 * @returns `EnhancedTreeItem` 陣列
 */
export function generateEnhancedTreeData(
	object: THREE.Object3D,
	pathMap: Map<string, NodePath>,
	overrides: Record<NodePath, NodeOverrides> = {}
): EnhancedTreeItem[] {
	const items: EnhancedTreeItem[] = []

	object.children.forEach((child) => {
		const path = pathMap.get(child.uuid) || child.uuid
		const override = overrides[path]
		const originalName = child.name || child.type

		const item: EnhancedTreeItem = {
			id: child.uuid,
			path,
			originalName,
			displayName: override?.displayName ?? originalName,
			type: child.type,
			visible: override?.visible ?? child.visible,
			properties: override?.properties ?? {},
			menu: override?.menu,
			hasOverrides: !!override && Object.keys(override).length > 0,
			children: generateEnhancedTreeData(child, pathMap, overrides)
		}

		items.push(item)
	})

	return items
}

/**
 * 取得特定 UUID 的路徑
 *
 * @param uuid - Three.js 物件的 UUID
 * @param pathMap - UUID -> NodePath 的對應
 * @returns 找到則回傳 NodePath，找不到回傳 undefined
 */
export function getPathByUUID(uuid: string, pathMap: Map<string, NodePath>): NodePath | undefined {
	return pathMap.get(uuid)
}
