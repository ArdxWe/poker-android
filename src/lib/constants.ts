export const LIVE_ORIGIN = 'https://ardxwe-table.netlify.app'

export function normalizeOrigin(input: string | null | undefined): string {
  let trimmed = (input ?? '').trim()
  if (!trimmed) return LIVE_ORIGIN
  trimmed = trimmed.replace(/\/+$/, '')
  if (trimmed.endsWith('/api/club')) trimmed = trimmed.slice(0, -'/api/club'.length).replace(/\/+$/, '')
  return trimmed || LIVE_ORIGIN
}

export function clubEndpoint(origin: string): string {
  return `${normalizeOrigin(origin)}/api/club`
}
