export { cn } from './cn.js'
export {
	CinematicLightingManager,
	type CinematicLightingConfig
} from './cinematicLightingManager.js'

// Type helpers for shadcn-svelte components
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithElementRef<T extends Record<string, any>> = T & {
	ref?: HTMLElement | null
}

export type WithoutChildrenOrChild<T> = Omit<T, 'children' | 'child'>
export type WithoutChild<T> = Omit<T, 'child'>
