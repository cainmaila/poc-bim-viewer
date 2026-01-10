/**
 * Path Generation Utilities for BIM Nodes
 *
 * Generates unique paths for Three.js scene nodes using slash-separated format.
 * Handles duplicate node names by appending indices.
 *
 * Example paths:
 * - 'Scene/Building/Floor1'
 * - 'Scene/Building/Floor1[1]' (duplicate)
 */

import type * as THREE from 'three'
import type { EnhancedTreeItem, NodePath, NodeOverrides } from '$lib/types/bimSettings'

/**
 * Build a complete path mapping for all nodes in the scene
 *
 * Traverses the scene tree and generates unique paths for each node.
 * Handles duplicate names by appending indices like [0], [1], etc.
 *
 * @param object - Root Three.js Object3D (typically the scene or model root)
 * @returns Map of UUID -> NodePath
 */
export function buildPathMapping(object: THREE.Object3D): Map<string, NodePath> {
	const pathMap = new Map<string, NodePath>()
	const nameCounters = new Map<string, number>() // Track name counts per parent

	function traverse(node: THREE.Object3D, parentPath: string) {
		const baseName = node.name || node.type

		// Create a unique key for counting duplicates (parentPath::nodeName)
		const counterKey = `${parentPath}::${baseName}`
		const count = nameCounters.get(counterKey) || 0
		nameCounters.set(counterKey, count + 1)

		// Generate path (first occurrence has no index, duplicates get [1], [2], etc.)
		const pathPrefix = parentPath ? `${parentPath}/${baseName}` : baseName
		const finalPath = count > 0 ? `${pathPrefix}[${count}]` : pathPrefix

		// Store mapping
		pathMap.set(node.uuid, finalPath)

		// Recursively process children
		node.children.forEach((child) => {
			traverse(child, finalPath)
		})
	}

	traverse(object, '')
	return pathMap
}

/**
 * Generate enhanced tree data with paths and override information
 *
 * Converts Three.js scene graph into EnhancedTreeItem structure,
 * merging original properties with overrides.
 *
 * @param object - Root Three.js Object3D
 * @param pathMap - UUID to NodePath mapping
 * @param overrides - Node overrides to apply
 * @returns Array of EnhancedTreeItem
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
			hasOverrides: !!override && Object.keys(override).length > 0,
			children: generateEnhancedTreeData(child, pathMap, overrides)
		}

		items.push(item)
	})

	return items
}

/**
 * Get the path for a specific UUID
 *
 * @param uuid - Three.js object UUID
 * @param pathMap - UUID to NodePath mapping
 * @returns NodePath or undefined if not found
 */
export function getPathByUUID(uuid: string, pathMap: Map<string, NodePath>): NodePath | undefined {
	return pathMap.get(uuid)
}
