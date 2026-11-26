import assert from 'node:assert/strict'
import test from 'node:test'
import { canRecord, sessionAfterSave } from './flow.ts'
import type { Session } from './ledger.ts'

const session: Session = {
  oneBuyIn: 200,
  players: [
    { id: '1', name: 'Alex', buyIns: 3, left: null },
    { id: '2', name: '  ', buyIns: 1, left: 200 },
    { id: '3', name: 'Sam', buyIns: 2, left: 100 },
  ],
}

test('a game can be saved when one named stack is filled', () => {
  assert.equal(canRecord(session), true)
  assert.equal(canRecord({ oneBuyIn: 200, players: [{ id: '1', name: 'Alex', buyIns: 1, left: null }] }), false)
})

test('after a save, named players stay at one buy-in and a full stack', () => {
  assert.deepEqual(sessionAfterSave(session).players, [
    { id: '1', name: 'Alex', buyIns: 1, left: 200 },
    { id: '3', name: 'Sam', buyIns: 1, left: 200 },
  ])
})
