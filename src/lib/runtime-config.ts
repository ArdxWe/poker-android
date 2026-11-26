import Constants from 'expo-constants'

import { normalizeOrigin } from './constants.ts'

export function originFromConfig(): string {
  const extra = Constants.expoConfig?.extra as { apiBaseUrl?: unknown } | undefined
  const value = typeof extra?.apiBaseUrl === 'string' ? extra.apiBaseUrl : ''
  return normalizeOrigin(value)
}
