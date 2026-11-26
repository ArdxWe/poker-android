import assert from 'node:assert/strict'
import test from 'node:test'
import { emptySession, normalizeClubRecord, normalizeSession } from './normalize.ts'

test('a blank session starts at one buy-in of 200', () => {
  assert.deepEqual(normalizeSession(null), emptySession())
  assert.deepEqual(normalizeSession({ oneBuyIn: 0, players: [] }), emptySession())
})

test('an empty stack stays empty and a zero stack is zero', () => {
  const session = normalizeSession({
    oneBuyIn: 200,
    players: [
      { id: 'a', name: 'Alex', buyIns: 1, left: null },
      { id: 'b', name: 'Sam', buyIns: 2, left: 0 },
    ],
  })
  assert.equal(session.players[0]?.left, null)
  assert.equal(session.players[1]?.left, 0)
})

test('a club cache keeps the name and drops a broken game', () => {
  const club = normalizeClubRecord({
    id: 'hash',
    name: ' Friday ',
    readHash: 'hash',
    writeHash: 'hash',
    games: [
      {
        id: 'g1',
        title: ' Night ',
        playedAt: '2026-11-08T12:00:00.000Z',
        oneBuyIn: 200,
        players: [{ name: 'Alex', buyIns: 1, left: 400, net: 200 }],
      },
      { id: 'bad' },
    ],
  })
  assert.equal(club?.name, 'Friday')
  assert.equal(club?.games.length, 1)
  assert.equal(club?.games[0]?.title, 'Night')
  assert.equal(normalizeClubRecord({ name: '', readHash: 'x', writeHash: 'x', games: [] }), null)
})
