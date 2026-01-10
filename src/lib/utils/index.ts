export { cn } from './cn.js'
export {
	CinematicLightingManager,
	type CinematicLightingConfig
} from './cinematicLightingManager.js'
export { inferType, validatePropertyValue, type PropertyType } from './typeHelpers.js'

// Re-export type helpers from utils.ts to avoid duplication
export type { WithElementRef, WithoutChildrenOrChild, WithoutChild } from '../utils.js'
