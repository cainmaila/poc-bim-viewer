import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

// Type helpers for shadcn-svelte components
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithElementRef<T extends Record<string, any>> = T & {
	ref?: HTMLElement | null
}

export type WithoutChildrenOrChild<T> = Omit<T, 'children' | 'child'>
export type WithoutChild<T> = Omit<T, 'child'>
