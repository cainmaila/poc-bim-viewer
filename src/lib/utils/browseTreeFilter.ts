/**
 * Browse Tree Filter Utility
 *
 * Filters and transforms the enhanced tree data for browse mode based on menu properties.
 *
 * Menu property rules:
 * - menu: "root" - This node becomes the new root (ancestors are hidden)
 * - menu: "disabled" - This node and all its children are hidden
 * - menu: "hide" - Only this node is hidden, but children are promoted to parent level
 */

import type { EnhancedTreeItem } from '$lib/types/bimSettings'

/**
 * Find nodes marked as "root" in the tree
 * @param items - The tree items to search
 * @returns Array of nodes marked as root
 */
function findRootNodes(items: EnhancedTreeItem[]): EnhancedTreeItem[] {
	const rootNodes: EnhancedTreeItem[] = []

	function traverse(items: EnhancedTreeItem[]) {
		for (const item of items) {
			if (item.menu === 'root') {
				rootNodes.push(item)
			}
			if (item.children.length > 0) {
				traverse(item.children)
			}
		}
	}

	traverse(items)
	return rootNodes
}

/**
 * Filter a single node and its children according to browse mode rules
 * @param item - The tree item to filter
 * @returns Filtered tree item or null if node should be excluded
 */
function filterNode(item: EnhancedTreeItem): EnhancedTreeItem | null {
	// If node is marked as "disabled", exclude it and all children
	if (item.menu === 'disabled') {
		return null
	}

	// Recursively filter children first
	const filteredChildren: EnhancedTreeItem[] = []
	for (const child of item.children) {
		const filtered = filterNode(child)
		if (filtered) {
			filteredChildren.push(filtered)
		}
	}

	// If node is marked as "hide", return its children directly (promote them)
	if (item.menu === 'hide') {
		// Return null here, but children have already been added to parent
		// This is handled by the caller
		return null
	}

	// Return the node with filtered children
	return {
		...item,
		children: filteredChildren
	}
}

/**
 * Special handling for nodes marked as "hide" - their children get promoted
 * @param items - The tree items to process
 * @returns Processed tree items with hidden nodes removed and their children promoted
 */
function processHiddenNodes(items: EnhancedTreeItem[]): EnhancedTreeItem[] {
	const result: EnhancedTreeItem[] = []

	for (const item of items) {
		// If node is disabled, skip it entirely
		if (item.menu === 'disabled') {
			continue
		}

		// If node is hidden, promote its children to current level
		if (item.menu === 'hide') {
			// Recursively process children and add them to result
			const processedChildren = processHiddenNodes(item.children)
			result.push(...processedChildren)
		} else {
			// Normal node - recursively process its children
			const processedChildren = processHiddenNodes(item.children)
			result.push({
				...item,
				children: processedChildren
			})
		}
	}

	return result
}

/**
 * Filter tree data for browse mode
 *
 * Applies the following rules:
 * 1. If any node has menu="root", start the tree from those nodes (may have multiple roots)
 * 2. Hide nodes with menu="disabled" and all their children
 * 3. Hide nodes with menu="hide" but promote their children to parent level
 *
 * @param items - The full enhanced tree data
 * @returns Filtered tree data for browse mode
 */
export function filterTreeForBrowseMode(items: EnhancedTreeItem[]): EnhancedTreeItem[] {
	// Step 1: Check if there are any nodes marked as "root"
	const rootNodes = findRootNodes(items)

	// If root nodes exist, use them as the starting point
	const startingItems = rootNodes.length > 0 ? rootNodes : items

	// Step 2: Process all nodes to handle "hide" and "disabled"
	const filtered = processHiddenNodes(startingItems)

	return filtered
}
