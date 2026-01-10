/**
 * Type helper utilities for property values
 */

export type PropertyType = 'string' | 'number' | 'boolean'

/**
 * 根據值推斷類型
 * @param value - 要推斷的值
 * @returns 推斷出的類型
 */
export function inferType(value: string): PropertyType {
	if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
		return 'boolean'
	}
	if (!isNaN(Number(value)) && value.trim() !== '') {
		return 'number'
	}
	return 'string'
}

/**
 * 驗證值是否符合指定類型
 * @param value - 要驗證的值
 * @param type - 期望的類型
 * @returns 是否符合類型
 */
export function validatePropertyValue(value: string, type: PropertyType): boolean {
	switch (type) {
		case 'boolean':
			return value === 'true' || value === 'false'
		case 'number':
			return !isNaN(Number(value)) && value.trim() !== ''
		case 'string':
			return true
		default:
			return false
	}
}
