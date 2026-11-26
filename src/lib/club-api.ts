import { clubEndpoint } from './constants.ts'
import type { Game } from './ledger.ts'
import { normalizeClubRecord, type ClubRecord } from './normalize.ts'
import { generatePassword } from './passwords.ts'

export class ClubOfflineError extends Error {
  constructor() {
    super('offline')
    this.name = 'ClubOfflineError'
  }
}

export type ClubFailure = 'empty' | 'same' | 'name' | 'read' | 'write' | 'denied' | 'missing' | 'failed'

export type ClubResponse =
  | { ok: true; token: string; club: ClubRecord }
  | { ok: false; reason: ClubFailure | string }

const failures = new Set(['empty', 'same', 'name', 'read', 'write', 'denied', 'missing', 'failed'])

export async function requestClub(
  url: string,
  body: unknown,
  fetchImpl: typeof fetch = fetch,
): Promise<ClubResponse> {
  let response: Response
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new ClubOfflineError()
  }
  if (!response.ok) throw new ClubOfflineError()
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new ClubOfflineError()
  }
  if (!payload || typeof payload !== 'object') throw new ClubOfflineError()
  const record = payload as { ok?: unknown; reason?: unknown; token?: unknown; club?: unknown }
  if (record.ok === true) {
    const club = normalizeClubRecord(record.club)
    if (!club || typeof record.token !== 'string' || !record.token) throw new ClubOfflineError()
    return { ok: true, token: record.token, club }
  }
  if (record.ok === false && typeof record.reason === 'string' && failures.has(record.reason)) {
    return { ok: false, reason: record.reason }
  }
  throw new ClubOfflineError()
}

export async function openClub(
  url: string,
  readPassword: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; token: string; club: ClubRecord } | { ok: false; message: string }> {
  try {
    const result = await requestClub(url, { op: 'open', readPassword }, fetchImpl)
    if (!result.ok) return { ok: false, message: 'No club for that password.' }
    return { ok: true, token: result.token, club: result.club }
  } catch (error) {
    if (error instanceof ClubOfflineError) return { ok: false, message: 'Could not open the club. Try again.' }
    throw error
  }
}

export async function createClub(input: {
  url: string
  name: string
  fetchImpl?: typeof fetch
  nextPassword?: () => string
}): Promise<
  | { ok: true; password: string; token: string; club: ClubRecord }
  | { ok: false; message: string }
> {
  const name = input.name.trim()
  if (!name) return { ok: false, message: 'Add a club name.' }
  const fetchImpl = input.fetchImpl ?? fetch
  const nextPassword = input.nextPassword ?? generatePassword
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const password = nextPassword()
    let result: ClubResponse
    try {
      result = await requestClub(
        input.url,
        { op: 'create', name, readPassword: password, writePassword: password, games: [] },
        fetchImpl,
      )
    } catch (error) {
      if (error instanceof ClubOfflineError) return { ok: false, message: 'Could not create the club. Try again.' }
      throw error
    }
    if (result.ok) return { ok: true, password, token: result.token, club: result.club }
    if (result.reason === 'name') return { ok: false, message: 'That club name is already used.' }
    if (result.reason === 'empty') return { ok: false, message: 'Add a club name.' }
    if (result.reason === 'failed') return { ok: false, message: 'Could not create the club. Try again.' }
  }
  return { ok: false, message: 'Could not create the club. Try again.' }
}

export async function restoreClub(
  url: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ kind: 'ok'; token: string; club: ClubRecord } | { kind: 'invalid' } | { kind: 'offline' }> {
  try {
    const result = await requestClub(url, { op: 'restore', token }, fetchImpl)
    if (!result.ok) return { kind: 'invalid' }
    return { kind: 'ok', token: result.token, club: result.club }
  } catch (error) {
    if (error instanceof ClubOfflineError) return { kind: 'offline' }
    throw error
  }
}

export async function refreshClub(
  url: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; club: ClubRecord } | { ok: false }> {
  try {
    const result = await requestClub(url, { op: 'refresh', token }, fetchImpl)
    if (!result.ok) return { ok: false }
    return { ok: true, club: result.club }
  } catch (error) {
    if (error instanceof ClubOfflineError) return { ok: false }
    throw error
  }
}

export async function saveGame(
  url: string,
  token: string,
  game: Game,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; club: ClubRecord } | { ok: false; message: string; offline: boolean }> {
  try {
    const result = await requestClub(url, { op: 'save', token, writePassword: '', game }, fetchImpl)
    if (!result.ok) return { ok: false, message: 'Could not save. This game is still here.', offline: false }
    return { ok: true, club: result.club }
  } catch (error) {
    if (error instanceof ClubOfflineError) {
      return { ok: false, message: 'Could not save. This game is still here.', offline: true }
    }
    throw error
  }
}

export async function deleteGame(
  url: string,
  token: string,
  gameId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; club: ClubRecord } | { ok: false; message: string; offline: boolean }> {
  try {
    const result = await requestClub(url, { op: 'delete', token, writePassword: '', gameId }, fetchImpl)
    if (!result.ok) return { ok: false, message: 'Could not remove that game.', offline: false }
    return { ok: true, club: result.club }
  } catch (error) {
    if (error instanceof ClubOfflineError) {
      return { ok: false, message: 'Could not remove that game.', offline: true }
    }
    throw error
  }
}

export function endpointFor(origin: string): string {
  return clubEndpoint(origin)
}
