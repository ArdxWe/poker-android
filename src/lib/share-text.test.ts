import assert from 'node:assert/strict'
import test from 'node:test'
import { LIVE_ORIGIN, clubEndpoint, normalizeOrigin } from './constants.ts'
import type { Game } from './ledger.ts'
import { encodeClubShare, encodeGameShare } from './share.ts'
import { readShareFromText } from './share-text.ts'

const sample: Game = {
  id: 'g1',
  title: 'Friday',
  playedAt: '2026-11-08T12:00:00.000Z',
  oneBuyIn: 200,
  players: [
    { name: 'Alex', buyIns: 2, left: 100, net: -300 },
    { name: 'Sam', buyIns: 1, left: 500, net: 300 },
  ],
}

test('a pasted live url opens the same game', () => {
  const token = encodeGameShare(sample)
  const url = `${LIVE_ORIGIN}/#g=${token}`
  const shared = readShareFromText(`see this ${url}`)
  assert.equal(shared?.kind, 'game')
  if (shared?.kind === 'game') assert.deepEqual(shared.game, sample)
})

test('a club token wins when the hash also has a game', () => {
  const games = [sample]
  const club = encodeClubShare(games)
  const game = encodeGameShare(sample)
  const shared = readShareFromText(`#c=${club}&g=${game}`)
  assert.equal(shared?.kind, 'club')
  if (shared?.kind === 'club') assert.deepEqual(shared.games, games)
})

test('a broken or empty link is not a share', () => {
  assert.equal(readShareFromText(''), null)
  assert.equal(readShareFromText('hello'), null)
  assert.equal(readShareFromText(`${LIVE_ORIGIN}/#g=!!!`), null)
  assert.equal(readShareFromText('#c='), null)
})

test('the club endpoint keeps a configurable origin', () => {
  assert.equal(clubEndpoint(''), `${LIVE_ORIGIN}/api/club`)
  assert.equal(clubEndpoint(`${LIVE_ORIGIN}/api/club/`), `${LIVE_ORIGIN}/api/club`)
  assert.equal(clubEndpoint('http://10.0.2.2:5173'), 'http://10.0.2.2:5173/api/club')
  assert.equal(normalizeOrigin('http://10.0.2.2:5173/api/club'), 'http://10.0.2.2:5173')
})
