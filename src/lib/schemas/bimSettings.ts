/**
 * Zod Validation Schemas for BIM Settings
 *
 * Provides runtime validation for BIM settings data,
 * especially for import/export operations.
 */

import { z } from 'zod'

/**
 * Schema for MenuMode enum
 */
export const MenuModeSchema = z.enum(['root', 'disabled', 'hide'])

/**
 * Schema for node property overrides
 */
export const NodeOverridesSchema = z
	.object({
		displayName: z.string().optional(),
		visible: z.boolean().optional(),
		properties: z.record(z.string(), z.string()).optional(),
		menu: MenuModeSchema.optional()
	})
	.strict() // Strict mode: reject unknown fields

/**
 * Schema for BIM settings
 */
export const BIMSettingsSchema = z.object({
	modelKey: z.string().min(1, 'Model key cannot be empty'),
	createdAt: z.string(),
	updatedAt: z.string(),
	nodeOverrides: z.record(z.string(), NodeOverridesSchema)
})

/**
 * Schema for BIM settings export/import format
 */
export const BIMSettingsExportSchema = z.object({
	version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be in semver format (e.g., 1.0.0)'),
	modelKey: z.string().min(1, 'Model key cannot be empty'),
	exportedAt: z.string(),
	settings: BIMSettingsSchema
})

/**
 * Validate and parse BIM settings import JSON
 *
 * @param json - The JSON data to validate
 * @returns Validation result with parsed data or error message
 */
export function validateBIMSettingsImport(json: unknown): {
	success: boolean
	data?: z.infer<typeof BIMSettingsExportSchema>
	error?: string
} {
	try {
		const result = BIMSettingsExportSchema.safeParse(json)

		if (result.success) {
			return { success: true, data: result.data }
		} else {
			// Format Zod errors into readable message
			const errorMessages = result.error.issues
				.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
				.join('; ')

			return {
				success: false,
				error: errorMessages
			}
		}
	} catch (error: unknown) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown validation error'
		}
	}
}
