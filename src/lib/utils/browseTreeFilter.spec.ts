import { describe, it, expect } from 'vitest'
import { filterTreeForBrowseMode } from './browseTreeFilter'
import type { EnhancedTreeItem } from '$lib/types/bimSettings'

describe('browseTreeFilter', () => {
	const createNode = (
		id: string,
		name: string,
		menu?: 'root' | 'disabled' | 'hide',
		children: EnhancedTreeItem[] = []
	): EnhancedTreeItem => ({
		id,
		path: `Path/${name}`,
		originalName: name,
		displayName: name,
		type: 'Group',
		visible: true,
		menu,
		hasOverrides: false,
		children
	})

	it('should return all nodes when no menu property is set', () => {
		const tree: EnhancedTreeItem[] = [
			createNode('1', 'A', undefined, [createNode('2', 'B'), createNode('3', 'C')])
		]

		const result = filterTreeForBrowseMode(tree)

		expect(result).toHaveLength(1)
		expect(result[0].displayName).toBe('A')
		expect(result[0].children).toHaveLength(2)
	})

	it('should start from root node when menu="root" is set', () => {
		const tree: EnhancedTreeItem[] = [
			createNode('1', 'A', undefined, [
				createNode('2', 'B', 'root', [createNode('3', 'C'), createNode('4', 'D')])
			])
		]

		const result = filterTreeForBrowseMode(tree)

		expect(result).toHaveLength(1)
		expect(result[0].displayName).toBe('B')
		expect(result[0].children).toHaveLength(2)
	})

	it('should hide node and children when menu="disabled"', () => {
		const tree: EnhancedTreeItem[] = [
			createNode('1', 'A', undefined, [
				createNode('2', 'B', 'disabled', [createNode('3', 'C')]),
				createNode('4', 'D')
			])
		]

		const result = filterTreeForBrowseMode(tree)

		expect(result).toHaveLength(1)
		expect(result[0].displayName).toBe('A')
		expect(result[0].children).toHaveLength(1)
		expect(result[0].children[0].displayName).toBe('D')
	})

	it('should hide node but promote children when menu="hide"', () => {
		const tree: EnhancedTreeItem[] = [
			createNode('1', 'A', undefined, [
				createNode('2', 'B', 'hide', [createNode('3', 'C'), createNode('4', 'D')]),
				createNode('5', 'E')
			])
		]

		const result = filterTreeForBrowseMode(tree)

		expect(result).toHaveLength(1)
		expect(result[0].displayName).toBe('A')
		// B is hidden, so C and D should be promoted to A's children
		expect(result[0].children).toHaveLength(3)
		expect(result[0].children.map((n) => n.displayName)).toEqual(['C', 'D', 'E'])
	})

	it('should handle multiple root nodes', () => {
		const tree: EnhancedTreeItem[] = [
			createNode('1', 'A', undefined, [createNode('2', 'B', 'root'), createNode('3', 'C', 'root')])
		]

		const result = filterTreeForBrowseMode(tree)

		expect(result).toHaveLength(2)
		expect(result[0].displayName).toBe('B')
		expect(result[1].displayName).toBe('C')
	})

	it('should handle complex nested structures', () => {
		const tree: EnhancedTreeItem[] = [
			createNode('1', 'A', undefined, [
				createNode('2', 'B', 'hide', [
					createNode('3', 'C', undefined, [createNode('4', 'D')]),
					createNode('5', 'E', 'disabled', [createNode('6', 'F')])
				])
			])
		]

		const result = filterTreeForBrowseMode(tree)

		expect(result).toHaveLength(1)
		expect(result[0].displayName).toBe('A')
		// B is hidden, C is promoted, E is disabled
		expect(result[0].children).toHaveLength(1)
		expect(result[0].children[0].displayName).toBe('C')
		expect(result[0].children[0].children).toHaveLength(1)
		expect(result[0].children[0].children[0].displayName).toBe('D')
	})
})
