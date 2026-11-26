import type { Game } from './ledger.ts'
import { decodeClubShare, decodeGameShare, readClubTokenFromLocation, readShareTokenFromLocation } from './share.ts'

export type SharedSnapshot = { kind: 'game'; game: Game } | { kind: 'club'; games: Game[] }

export function hashFromText(text: string): string | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  const hashAt = trimmed.indexOf('#')
  if (hashAt >= 0) {
    const hash = trimmed.slice(hashAt)
    return hash.length > 1 ? hash : null
  }
  if (trimmed.startsWith('g=') || trimmed.startsWith('c=') || /(?:^|[?&\s])[cg]=/.test(trimmed)) {
    return `#${trimmed.replace(/^[?#]/, '')}`
  }
  return null
}

// A hash that carries both c and g resolves to the club only. A token that
// does not decode is not a share, even when the other key is also present.
export function readShareFromText(text: string): SharedSnapshot | null {
  const hash = hashFromText(text)
  if (!hash) return null
  const location = { hash }
  const clubToken = readClubTokenFromLocation(location)
  if (clubToken) {
    const games = decodeClubShare(clubToken)
    return games ? { kind: 'club', games } : null
  }
  const gameToken = readShareTokenFromLocation(location)
  if (!gameToken) return null
  const game = decodeGameShare(gameToken)
  return game ? { kind: 'game', game } : null
}
