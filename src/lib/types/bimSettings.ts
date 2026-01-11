/**
 * BIM Settings Type Definitions
 *
 * Defines types for BIM node property override system.
 * Nodes can have their display properties (name, visibility, etc.) overridden
 * without modifying the actual 3D model.
 */

/**
 * Node path in the scene hierarchy (Slash-separated)
 * Example: 'Scene/Building/Floor1/Room01'
 */
export type NodePath = string

/**
 * Menu display mode for browse mode
 * - "root": This node becomes the root in browse mode (ancestors are hidden)
 * - "disabled": This node and all its children are hidden in browse mode
 * - "hide": Only this node is hidden, but children are shown in browse mode
 */
export type MenuMode = 'root' | 'disabled' | 'hide'

/**
 * Overridable node properties
 */
export interface NodeOverrides {
	/** Override display name */
	displayName?: string

	/** Override visibility */
	visible?: boolean

	/** Menu display mode for browse mode */
	menu?: MenuMode

	// Reserved for future expansion:
	// color?: string
	// opacity?: number
	// locked?: boolean
	// metadata?: Record<string, unknown>
}

/**
 * BIM settings for a model
 * Contains all node property overrides for a specific model
 */
export interface BIMSettings {
	/** Model identifier (filename) */
	modelKey: string

	/** Creation timestamp */
	createdAt: string

	/** Last update timestamp */
	updatedAt: string

	/** Node overrides mapping: NodePath -> NodeOverrides */
	nodeOverrides: Record<NodePath, NodeOverrides>
}

/**
 * Enhanced tree item with path and override information
 * Extends the basic TreeItem with BIM-specific data
 */
export interface EnhancedTreeItem {
	/** UUID from Three.js */
	id: string

	/** Node path (e.g., 'Scene/Building/Floor1') */
	path: NodePath

	/** Original name from the model */
	originalName: string

	/** Display name (potentially overridden) */
	displayName: string

	/** Node type (e.g., 'Group', 'Mesh') */
	type: string

	/** Child nodes */
	children: EnhancedTreeItem[]

	/** Visibility (potentially overridden) */
	visible: boolean

	/** Menu mode for browse mode */
	menu?: MenuMode

	/** Whether this node has any overrides */
	hasOverrides: boolean
}

/**
 * Export format for BIM settings
 * Used when exporting/importing settings as JSON
 */
export interface BIMSettingsExport {
	/** Schema version (e.g., '1.0.0') */
	version: string

	/** Model identifier */
	modelKey: string

	/** Export timestamp */
	exportedAt: string

	/** The actual settings */
	settings: BIMSettings
}
