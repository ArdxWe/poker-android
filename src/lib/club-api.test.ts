import assert from 'node:assert/strict'
import test from 'node:test'
import { createClub, openClub, requestClub, restoreClub, saveGame } from './club-api.ts'
import type { Game } from './ledger.ts'

const club = {
  id: 'hash',
  name: 'Friday',
  readHash: 'hash',
  writeHash: 'hash',
  readerId: '',
  writerId: '',
  games: [] as Game[],
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

test('a network failure is offline, and a 500 is offline', async () => {
  await assert.rejects(
    requestClub('https://example.test/api/club', { op: 'restore', token: 'x' }, async () => {
      throw new Error('offline')
    }),
    (error: unknown) => error instanceof Error && error.name === 'ClubOfflineError',
  )
  await assert.rejects(
    requestClub('https://example.test/api/club', {}, async () => jsonResponse({ ok: false, reason: 'failed' }, 500)),
    (error: unknown) => error instanceof Error && error.name === 'ClubOfflineError',
  )
})

test('an unknown password is not a club', async () => {
  const result = await openClub('https://example.test/api/club', 'nope', async () =>
    jsonResponse({ ok: false, reason: 'missing' }),
  )
  assert.deepEqual(result, { ok: false, message: 'No club for that password.' })
})

test('creating a club retries a password collision and stops on a used name', async () => {
  const passwords = ['AAAAAAA1', 'BBBBBBB2']
  const bodies: unknown[] = []
  const created = await createClub({
    url: 'https://example.test/api/club',
    name: ' Friday ',
    nextPassword: () => passwords.shift() ?? 'CCCCCCC3',
    fetchImpl: async (_url, init) => {
      const body = JSON.parse(String(init?.body))
      bodies.push(body)
      if (body.readPassword === 'AAAAAAA1') return jsonResponse({ ok: false, reason: 'read' })
      return jsonResponse({ ok: true, token: 'session', club: { ...club, name: 'Friday' } })
    },
  })
  assert.equal(created.ok, true)
  if (created.ok) assert.equal(created.password, 'BBBBBBB2')
  assert.equal((bodies[0] as { name: string }).name, 'Friday')
  assert.equal((bodies[0] as { writePassword: string }).writePassword, 'AAAAAAA1')

  const used = await createClub({
    url: 'https://example.test/api/club',
    name: 'Friday',
    nextPassword: () => 'DDDDDDD4',
    fetchImpl: async () => jsonResponse({ ok: false, reason: 'name' }),
  })
  assert.deepEqual(used, { ok: false, message: 'That club name is already used.' })
})

test('restore of a dead token is invalid, and a save failure keeps the same sentence', async () => {
  const restored = await restoreClub('https://example.test/api/club', 'gone', async () =>
    jsonResponse({ ok: false, reason: 'missing' }),
  )
  assert.deepEqual(restored, { kind: 'invalid' })
  const game: Game = {
    id: 'g1',
    title: '',
    playedAt: '2026-11-26T00:00:00.000Z',
    oneBuyIn: 200,
    players: [{ name: 'Sam', buyIns: 1, left: 200, net: 0 }],
  }
  const saved = await saveGame('https://example.test/api/club', 'gone', game, async () =>
    jsonResponse({ ok: false, reason: 'missing' }),
  )
  assert.deepEqual(saved, { ok: false, message: 'Could not save. This game is still here.', offline: false })
})
